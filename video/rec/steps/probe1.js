await ui.click("The model's parameters, moved", "button"); await sleep(900);
await slider(72); await sleep(600);
await ui.click("Why this answer?", "textarea"); await sleep(300);
await ui.type("the weights change, the loss just measures how wrong we are", 38); await sleep(700);
await ui.click("Submit answer", "button"); await sleep(55000);
return (await ui.text()).slice(-2600) + "\n---\n" + (await ui.dump(70));
