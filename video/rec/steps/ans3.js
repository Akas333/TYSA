// Answers the pending teaching question. For a reading check, first types READ into the reading
// field and reveals the options. Then option OPT, confidence CONF, typed reasoning THOUGHT, submit,
// and wait for TYSA's response.
const hasBtn = async (label) => page.evaluate((l) => [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === l), label);
if (await hasBtn("Show answer options")) {
	if (await hasBtn("Type instead")) { await ui.click("Type instead", "button"); await sleep(500); }
	await ui.click("What stands out from the reading?", "textarea"); await sleep(300);
	await ui.type(READ, 38); await sleep(700);
	await ui.click("Show answer options", "button"); await sleep(2500);
}
const opts = await page.$$("button[role=radio]");
const box = await opts[OPT].boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 }); await sleep(150);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(900);
if (await page.$("input[type=range]")) { await slider(CONF); await sleep(600); }
if (await hasBtn("Type instead")) { await ui.click("Type instead", "button"); await sleep(500); }
await ui.click("Why this answer?", "textarea"); await sleep(300);
await ui.type(THOUGHT, 38); await sleep(700);
await ui.click("Submit answer", "button");
const n0 = await page.evaluate(() => document.body.innerText.length);
const t0 = Date.now();
while (Date.now() - t0 < WAIT) {
	await sleep(4000);
	const s = await page.evaluate(() => ({
		len: document.body.innerText.length,
		next: document.querySelectorAll("button[role=radio]").length > 0 || [...document.querySelectorAll("button")].some((b) => ["Show answer options", "Continue"].includes(b.innerText.trim())),
	}));
	if (Date.now() - t0 > 20000 && s.next && s.len > n0 + 300) break;
}
await sleep(3000);
const t = await page.evaluate(() => document.body.innerText);
const a = t.lastIndexOf(THOUGHT.slice(0, 20));
return t.slice(a, a + 1800).replace(/\n{2,}/g, "\n").replace(/\n(.{1,3})\n/g, " $1 ").replace(/\n(.{1,3})\n/g, " $1 ").slice(0, 1600);
