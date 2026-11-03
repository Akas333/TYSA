// Clicks option N (0-based) of the current question, moving the mouse there first.
const opts = (await page.$$("button[role=radio]"));
const box = await opts[OPT].boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 }); await sleep(150);
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(900);
