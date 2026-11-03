// Opens the app full screen in a 1920×1080 browser (no zoom: a CSS zoom crops the layout), records every painted frame (CDP screencast) to frames/<ms>.jpg, and
// leaves the browser open for drive.mjs to control over port 9333.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, process.argv[2] || "frames");
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
	executablePath: process.env.CHROME,
	headless: "shell",
	args: ["--remote-debugging-port=9333", "--force-color-profile=srgb", "--hide-scrollbars", "--window-size=1920,1080", ...(process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(" ") : [])],
	defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.goto(process.env.APP_URL || "http://localhost:5188/", { waitUntil: "networkidle2" });
const cdp = await page.createCDPSession();
let n = 0;
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
	fs.writeFileSync(path.join(out, `${Math.round(metadata.timestamp * 1000)}.jpg`), Buffer.from(data, "base64"));
	if (++n % 600 === 0) console.log("frames", n);
	await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
console.log("recording", out);
