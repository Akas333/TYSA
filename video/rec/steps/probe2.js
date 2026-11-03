await slider(30); await sleep(600);
await ui.click("Why this answer?", "textarea"); await sleep(300);
await ui.type("I think you just average the errors? not sure if they get squared first", 38); await sleep(700);
await ui.click("Submit answer", "button"); await sleep(55000);
return (await ui.text()).slice(-2400) + "\n---\n" + (await ui.dump(70));
