// Answers the current question: option OPT, confidence CONF, reasoning THOUGHT; waits WAIT ms.
const opts = await page.$$("button[role=radio]");
const box = await opts[OPT].boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 }); await sleep(150);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(900);
if (await page.$("input[type=range]")) { await slider(CONF); await sleep(600); }
await ui.click("Why this answer?", "textarea"); await sleep(300);
await ui.type(THOUGHT, 38); await sleep(700);
await ui.click("Submit answer", "button");
const t0 = Date.now();
while (Date.now() - t0 < WAIT) {
	await sleep(3000);
	const busy = await page.evaluate(() => document.body.innerText.includes("Thinking") && !document.querySelector("button[role=radio]"));
	if (!busy && Date.now() - t0 > 12000) break;
}
await sleep(2000);
return (await ui.text()).slice(-1800) + "\n---\n" + (await ui.dump(70));
