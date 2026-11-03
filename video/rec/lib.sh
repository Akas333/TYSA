mk(){ echo "$(python3 -c 'import time;print(int(time.time()*1000))') $1" >> markers.txt; }
ans(){ python3 -I -c "
import sys,json
s=open('steps/answer.js').read().replace('OPT',sys.argv[1]).replace('CONF',sys.argv[2]).replace('THOUGHT',json.dumps(sys.argv[3])).replace('WAIT',sys.argv[4])
open('steps/run.js','w').write(s)" "$@"; mk "answer-$1"; node drive.mjs steps/run.js; }
q(){ node drive.mjs 'const t = await ui.text(); const i = Math.max(t.lastIndexOf("Probe\n"), t.lastIndexOf("Question\n"), t.lastIndexOf("Prediction\n"), t.lastIndexOf("Check")); const opts = await page.evaluate(() => [...document.querySelectorAll("button[role=radio]")].map((b, i) => i + ": " + b.innerText.replace(/\s+/g, " ").slice(0, 120)).join("\n")); return t.slice(i, i + 500).replace(/\n{1,}/g, " ").slice(0, 500) + "\n" + opts'; }
