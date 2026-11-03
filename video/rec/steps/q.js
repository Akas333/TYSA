// Reads the pending step: clicks Continue on a finished concept, otherwise returns the latest
// question (prediction or check), whether it is a reading check, and its options if shown.
const dump = await ui.dump(120);
if (/"Continue"/.test(dump)) {
	await ui.click("Continue", "button");
	const t0 = Date.now();
	while (Date.now() - t0 < 240000) {
		await sleep(4000);
		if (await page.evaluate(() => document.querySelectorAll("button[role=radio]").length > 0 || [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Show answer options"))) break;
	}
	await sleep(3000);
}
const t = await page.evaluate(() => document.body.innerText);
const a = Math.max(t.lastIndexOf("Prediction\n"), t.lastIndexOf("Check ·"), t.lastIndexOf("Check\n"));
const body = t.slice(Math.max(0, a - 1600), a + 900).replace(/\n{2,}/g, "\n").replace(/\n(.{1,3})\n/g, " $1 ").replace(/\n(.{1,3})\n/g, " $1 ");
const opts = await page.evaluate(() => [...document.querySelectorAll("button[role=radio]")].map((b, i) => i + ": " + b.innerText.replace(/\s+/g, " ").slice(0, 140)).join("\n"));
const reading = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Show answer options"));
const done = (t.match(/(\d+) \/ 11 done/) || [])[1];
return body.slice(-2200) + "\nREADING=" + reading + " DONE=" + done + "\n" + opts;
