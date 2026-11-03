// Captures the knowledge-graph view full screen at 1920×1080 as
// timed screenshots into graph-frames/, while the mouse drifts across nodes.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
fs.mkdirSync("graph-frames", { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME, headless: "shell", args: ["--force-color-profile=srgb", "--hide-scrollbars"], defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 } });
const page = await browser.newPage();
await page.goto("http://localhost:5188/", { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 5000));
const t0 = Date.now();
let moving = (async () => {
	for (const [x, y] of [[900, 500], [1250, 350], [1500, 520], [1100, 700], [1350, 600]]) await page.mouse.move(x, y, { steps: 40 }), await new Promise((r) => setTimeout(r, 900));
})();
while (Date.now() - t0 < 9000) fs.writeFileSync(`graph-frames/${Date.now()}.jpg`, await page.screenshot({ type: "jpeg", quality: 92 }));
await moving;
await browser.close();
console.log(fs.readdirSync("graph-frames").length, "frames");
