// Renders the scenes in scenes.html to 1080p MP4s in out/, frame by frame.
//
//   CHROME=/path/to/chrome FFMPEG=/path/to/ffmpeg node video/render.mjs [scene-id-prefix…]
//
// Each frame is drawn by the page's renderAt(t) and captured at SCALE× (default 2, so 4K),
// then downscaled to 1920×1080 by ffmpeg for clean edges. FPS defaults to 60.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");

const here = path.dirname(fileURLToPath(import.meta.url));
const { CHROME, FFMPEG } = process.env;
const FPS = Number(process.env.FPS || 60);
const SCALE = Number(process.env.SCALE || 2);
const only = process.argv.slice(2);
if (!CHROME || !FFMPEG) throw new Error("Set CHROME and FFMPEG to the browser and ffmpeg binaries.");

// Fonts don't load from file:// pages, so serve this folder over localhost.
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
	const file = path.join(here, decodeURIComponent(new URL(req.url, "http://x").pathname));
	if (!file.startsWith(here) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
		res.writeHead(404);
		res.end();
		return;
	}
	res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
	fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: "shell",
	args: ["--force-color-profile=srgb", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: SCALE });
await page.goto(`http://127.0.0.1:${server.address().port}/scenes.html?render=1`, { waitUntil: "load" });
await page.waitForFunction("window.scenesReady === true");

const scenes = await page.evaluate(() => SCENES.map((s) => s.id));
fs.mkdirSync(path.join(here, "out"), { recursive: true });

for (const id of scenes) {
	if (only.length && !only.some((prefix) => id.startsWith(prefix))) continue;
	const dur = await page.evaluate((sceneId) => window.mountScene(sceneId), id);
	const out = path.join(here, "out", `${id}.mp4`);
	const ff = spawn(
		FFMPEG,
		[
			"-y", "-loglevel", "error",
			"-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
			"-vf", "scale=1920:1080:flags=lanczos:out_color_matrix=bt709,format=yuv420p",
			"-c:v", "libx264", "-preset", "slow", "-crf", "14", "-r", String(FPS),
			"-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
			"-movflags", "+faststart", out,
		],
		{ stdio: ["pipe", "inherit", "inherit"] },
	);
	const done = new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
	const frames = Math.round(dur * FPS);
	for (let f = 0; f < frames; f++) {
		await page.evaluate((t) => window.renderAt(t), f / FPS);
		const png = await page.screenshot({ type: "png", optimizeForSpeed: true });
		if (!ff.stdin.write(png)) await new Promise((resolve) => ff.stdin.once("drain", resolve));
	}
	ff.stdin.end();
	await done;
	console.log(`wrote ${path.relative(process.cwd(), out)} (${frames} frames)`);
}

await browser.close();
server.close();
