import re, sys, json, glob, numpy as np, torch, torchaudio.functional as F
from transformers import Wav2Vec2Processor
REPO, EMIS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
juzs = [int(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else range(1, 31)
tok = Wav2Vec2Processor.from_pretrained('jonatasgrosman/wav2vec2-large-xlsr-53-arabic').tokenizer
V = tok.get_vocab(); BLANK = tok.pad_token_id; SEP = V['|']
LET = set(k for k in V if len(k) == 1 and 'ء' <= k <= 'ي')
idx = json.load(open(f'{REPO}/quran/index.json'))
ay = []  # (s, n, text)
for f in sorted(glob.glob(f'{REPO}/quran/p/*.json')):
    for seg in json.load(open(f))['segments']:
        for k, (a, _) in enumerate(seg['ayahs']): ay.append((seg['s'], seg['from'] + k, a))
assert len(ay) == 6236, len(ay)
MAP = {'ٱ': 'ا', 'ی': 'ي', 'ک': 'ك'}
def norm(t):
    words = []
    for w in t.split():
        w = ''.join(MAP.get(c, c) for c in w)
        w = ''.join(c for c in w if c in LET)
        if w: words.append(w)
    return words
IV = {v: k for k, v in V.items()}
def greedy(x):
    i = x.argmax(-1).tolist()
    return ''.join(IV[c] for k, c in enumerate(i) if (k == 0 or c != i[k - 1]) and c != BLANK and (IV[c] in LET or IV[c] == '|')).replace('|', ' ')
DUA = norm('بسم الله الرحمن الرحيم اللهم ارحمني بالقرآن واجعله لي إماما ونورا وهدى ورحمة اللهم ذكرني منه ما نسيت وعلمني منه ما جهلت وارزقني تلاوته آناء الليل وأطراف النهار واجعله لي حجة يا رب العالمين اللهم انفعني وارفعني بالقرآن العظيم واهدني بالآيات والذكر الحكيم وتقبل مني إنك أنت السميع العليم واغفر لي إنك أنت الغفور الكريم سلام على المرسلين والحمد لله رب العالمين')
SADAQ = norm('صدق الله العلي العظيم')
ISTI = norm('أعوذ بالله من الشيطان الرجيم'); BISM = norm('بسم الله الرحمن الرحيم')
def ids(words):
    out = []
    for w in words: out += [V[c] for c in w] + [SEP]
    return out
res = {}
for j in juzs:
    e = torch.from_numpy(np.load(f'{EMIS}/joz{j:02d}.npy').astype(np.float32))
    T = e.shape[0]
    g0, g1 = idx['juz'][j - 1], idx['juz'][j] if j < 30 else 6236
    head, tail = greedy(e[:750]), greedy(e[-500:])
    # همه فایل‌های جزء با استعاذه و بسم‌الله شروع می‌شوند.
    pre = ISTI + (BISM if ay[g0][1] != 1 else [])
    targets = ids(pre); spans = []
    for g in range(g0, g1):
        s, n, t = ay[g]; a = len(targets)
        if n == 1 and s not in (1, 9): targets += ids(BISM)
        targets += ids(norm(t)); spans.append((s, n, a, len(targets)))
    end_extra = 'صدق' in tail or 'العظيم' in tail[-30:]
    if end_extra: targets += ids(SADAQ)
    if j == 30: targets += ids(SADAQ + DUA)  # پایان قرآن: صدق‌الله و دعای ختم
    rate = T / len(targets)
    f0, k, CH = 0, 0, 5000
    while k < len(spans):
        # تکه‌ای از متن (حدود CH حرف) و کمی بیشتر از صوتِ متناسب با آن
        a0 = 0 if k == 0 else spans[k][2]
        m = k
        while m < len(spans) and spans[m][3] - a0 < CH: m += 1
        m = max(m, k + 1)
        last = m >= len(spans)
        f1 = T if last else min(T, f0 + int((spans[m - 1][3] - a0) * rate * 1.35))
        if f1 >= T - 200: f1 = T; m = len(spans); last = True
        tg = torch.tensor(targets[a0:len(targets) if last else spans[m - 1][3]], dtype=torch.int32)[None]
        ali, sc = F.forced_align(e[None, f0:f1], tg, blank=BLANK)
        ts = F.merge_tokens(ali[0], sc[0].exp(), blank=BLANK)
        keep = m if last else k + max(1, int((m - k) * 0.65))
        for q in range(k, keep):
            s, n, a, b = spans[q]
            st, en = ts[a - a0].start + f0, ts[b - 2 - a0].end + f0
            conf = float(np.mean([ts[x].score for x in range(a - a0, b - a0)]))
            res[(s, n)] = [st * 0.02, en * 0.02, conf, j]
        if not last: f0 = res[(spans[keep - 1][0], spans[keep - 1][1])][1] / 0.02 + 1; f0 = int(f0)
        k = keep
    print(j, T, len(targets), len(pre), end_extra, round(np.mean([res[(x[0], x[1])][2] for x in spans]), 3), flush=True)
json.dump({f'{s}:{n}': v for (s, n), v in res.items()}, open(OUT, 'w'))
