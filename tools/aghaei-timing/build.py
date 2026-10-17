import sys, json, subprocess
SA=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]
d = json.load(open(sys.argv[1])); audio = sys.argv[2]
dur = {}
out = [[None] * n for n in SA]
order = sorted(d.items(), key=lambda kv: (kv[1][3], kv[1][0]))
for i, (k, (st, en, c, j)) in enumerate(order):
    s, n = map(int, k.split(':'))
    if j not in dur: dur[j] = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'{audio}/joz{j:02d}.mp3'],capture_output=True,text=True).stdout)
    prev = order[i - 1][1] if i and order[i - 1][1][3] == j else None
    nxt = order[i + 1][1] if i + 1 < len(order) and order[i + 1][1][3] == j else None
    a = max(prev[1], st - 0.25) if prev else max(0, st - 0.3)
    b = max(en, nxt[0] - 0.25) if nxt else min(dur[j] - 0.05, en + 0.4)
    out[s - 1][n - 1] = [round(a, 2), round(b, 2)]
missing = sum(x is None for r in out for x in r)
print('missing', missing)
json.dump(out, open(sys.argv[3], 'w'), separators=(',', ':'))
