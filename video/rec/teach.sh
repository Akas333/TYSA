# tq LABEL : reads (and continues to) the pending question. ta OPT CONF "THOUGHT" "READ" LABEL : answers it.
mkm(){ echo "$(python3 -c 'import time;print(int(time.time()*1000))') $1" >> markers-demo.txt; }
tq(){ mkm "$1"; node drive.mjs steps/q.js; }
ta(){ mkm "$5"; python3 -I -c "
import sys,json
s=open('steps/ans3.js').read().replace('OPT',sys.argv[1]).replace('CONF',sys.argv[2]).replace('THOUGHT',json.dumps(sys.argv[3])).replace('READ',json.dumps(sys.argv[4])).replace('WAIT','300000')
open('steps/run3.js','w').write(s)" "$1" "$2" "$3" "$4"; node drive.mjs steps/run3.js; }
