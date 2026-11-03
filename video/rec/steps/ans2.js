// Answers the current question: option OPT, confidence CONF (-1 = leave), typed reasoning THOUGHT;
// then waits until the next question (or the plan) is ready, up to WAIT ms.
const opts = await page.$$("button[role=radio]");
const before = opts.length ? await page.evaluate((e) => e.innerText, opts[0]) : "";
const box = await opts[OPT].boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 }); await sleep(150);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(900);
if (CONF >= 0 && (await page.$("input[type=range]"))) { await slider(CONF); await sleep(600); }
if (await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Type instead"))) { await ui.click("Type instead", "button"); await sleep(500); }
await ui.click("Why this answer?", "textarea"); await sleep(300);
await ui.type(THOUGHT, 38); await sleep(700);
await ui.click("Submit answer", "button");
const t0 = Date.now();
while (Date.now() - t0 < WAIT) {
	await sleep(3000);
	const state = await page.evaluate((before) => {
		const r = [...document.querySelectorAll("button[role=radio]")];
		const fresh = r.length && r[0].innerText !== before;
		const plan = /Confirm plan|Ready to start\?/.test(document.body.innerText);
		return fresh || plan;
	}, before);
	if (state && Date.now() - t0 > 6000) break;
}
await sleep(2500);
const t = await ui.text();
const qi = Math.max(t.lastIndexOf("Probe\n"), t.lastIndexOf("Question\n"), t.lastIndexOf("Prediction\n"), t.lastIndexOf("Check\n"));
const optsNow = await page.evaluate(() => [...document.querySelectorAll("button[role=radio]")].map((b, i) => i + ": " + b.innerText.replace(/\s+/g, " ").slice(0, 140)).join("\n"));
return t.slice(qi, qi + 700).replace(/\n+/g, " ") + "\n" + optsNow + "\nPLAN? " + /Confirm plan|Ready to start\?/.test(t);
