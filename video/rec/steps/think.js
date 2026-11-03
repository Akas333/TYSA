await ui.click("Work through it here", "textarea"); await sleep(400);
await ui.type(TEXT, 34); await sleep(800);
await ui.click("Submit thinking", "button");
await sleep(15000);
const t0 = Date.now();
while (Date.now() - t0 < 240000 && !(await page.evaluate(() => [...document.querySelectorAll("textarea")].some((t) => /Work through|Ask anything/.test(t.placeholder) && !t.disabled)))) await sleep(3000);
await sleep(3000);
return (await ui.text()).slice(-1300);
