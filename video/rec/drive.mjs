// Runs one step against the recording browser: node drive.mjs '<js using page, ui>'.
// ui.dump() lists visible interactive elements; ui.click(text) clicks the element whose text matches.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9333", defaultViewport: null });
const page = (await browser.pages()).find((p) => p.url().includes("localhost:5188"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ui = {
	async dump(max = 80) {
		return page.evaluate((max) => {
			const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
			return [...document.querySelectorAll("button,a,input,textarea,[role=button],[role=radio],[role=slider],[contenteditable=true]")].filter(vis).slice(0, max).map((e) => {
				const r = e.getBoundingClientRect();
				return `${e.tagName.toLowerCase()}${e.getAttribute("role") ? "[" + e.getAttribute("role") + "]" : ""} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.innerText || e.value || e.getAttribute("aria-label") || e.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 70)}"`;
			}).join("\n");
		}, max);
	},
	async text() { return page.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText); },
	async find(text, sel = "button,a,[role=button],[role=radio],label,div,span") {
		return page.evaluateHandle((text, sel) => {
			const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
			const all = [...document.querySelectorAll(sel)].filter((e) => vis(e) && (e.innerText || e.getAttribute("aria-label") || e.placeholder || "").trim().includes(text));
			all.sort((a, b) => (a.innerText || "").length - (b.innerText || "").length);
			return all[0] ?? null;
		}, text, sel);
	},
	// Moves the mouse there smoothly (so it reads as a person), then clicks.
	async click(text, sel) {
		const h = await ui.find(text, sel);
		const box = await h.asElement()?.boundingBox();
		if (!box) throw new Error(`not found: ${text}`);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
		await sleep(150);
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	},
	async type(text, delay = 45) { await page.keyboard.type(text, { delay }); },
	async waitText(text, ms = 180000) {
		const t0 = Date.now();
		while (Date.now() - t0 < ms) {
			if (await page.evaluate((t) => document.body.innerText.includes(t), text)) return;
			await sleep(2000);
		}
		throw new Error(`timed out waiting for: ${text}`);
	},
};
// Drags the confidence slider from where it is to value v (0–100), like a hand would.
async function slider(v) {
	const s = await (await page.$("input[type=range]")).boundingBox();
	const cur = Number(await page.$eval("input[type=range]", (e) => e.value));
	const x = (n) => s.x + (s.width * n) / 100;
	await page.mouse.move(x(cur), s.y + s.height / 2, { steps: 12 });
	await page.mouse.down();
	await page.mouse.move(x(v), s.y + s.height / 2, { steps: 22 });
	await page.mouse.up();
}
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
try {
	const src = process.argv[2].endsWith(".js") ? fs.readFileSync(process.argv[2], "utf8") : process.argv[2];
	const r = await new AsyncFunction("page", "ui", "sleep", "slider", src)(page, ui, sleep, slider);
	if (r !== undefined) console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1));
} finally {
	browser.disconnect();
}
