# ans2 OPT CONF "THOUGHT" WAITMS LABEL : answers the current question while recording, logging a marker
ans2(){ echo "$(python3 -c 'import time;print(int(time.time()*1000))') $5" >> markers-demo.txt
python3 -I -c "
import sys,json
s=open('steps/ans2.js').read().replace('OPT',sys.argv[1]).replace('CONF',sys.argv[2]).replace('THOUGHT',json.dumps(sys.argv[3])).replace('WAIT',sys.argv[4])
open('steps/run2.js','w').write(s)" "$1" "$2" "$3" "$4"; node drive.mjs steps/run2.js; }
