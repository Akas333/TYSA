await slider(80); await sleep(600);
await ui.click("Why this answer?", "textarea"); await sleep(300);
await ui.type("both are 3 off, a loss cares about distance not direction", 38); await sleep(700);
await ui.click("Submit answer", "button"); await sleep(60000);
return (await ui.text()).slice(-2400) + "\n---\n" + (await ui.dump(70));
