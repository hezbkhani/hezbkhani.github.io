# Builds books/sahifa from: AL-Hasani app data (Arabic + Persian, Urdu), Chittick (al-islam.org via shiavault) Arabic + English.
import json, re, sys, glob, os
sys.path.insert(0, os.path.dirname(__file__))
from chittick import parse
S, OUT = sys.argv[1], sys.argv[2]
A = S + '/alhasani/app-data'
fa_book = json.load(open(A + '/fa/book_texts/sahifa-sajjadiyya.json'))['chapters']
ur_book = json.load(open(A + '/ur/book_texts/sahifa-sajjadiyya.json'))['chapters']
segs = lambda t: [x.strip() for x in t.split('\n\n') if x.strip()]
num_re = re.compile(r'^\(\s*\d+\s*\)\s*')
def tidy_fa(t):
    t = num_re.sub('', t.strip())
    t = re.sub(r'([،.؛:!؟])(?=\S)', r'\1 ', t)  # space after punctuation
    t = re.sub(r'(\S)\(', r'\1 (', t); t = re.sub(r'\)(?=[^\s.،؛:!؟)])', ') ', t)
    t = t.replace('ى', 'ی').replace('ي', 'ی').replace('ك', 'ک').replace('ۀ', 'هٔ')
    return re.sub(r'\s+', ' ', t).strip()
tidy = lambda t: re.sub(r'\s+', ' ', t.replace('*', '')).strip()
def tidy_ar(t):
    # حروف فارسی (ی، ک) در فونت عثمان طه نیستند؛ ی آخر کلمه بی‌کسره ى است و بقیه ي.
    t = t.replace('ک', 'ك').replace('ﷲ', 'الله')
    t = re.sub(r'ی(?![\u064B-\u0652\u0670]*[\u0620-\u064A\u066E-\u06D3])', lambda m: 'ى', t)
    t = re.sub(r'(?<=\u0650)ى|ى(?=[\u0650])', 'ي', t)
    t = t.replace('ی', 'ي')
    return re.sub(r'\s+([،,.؛:])', r'\1', re.sub(r'\s+', ' ', t)).strip()

chit = {}
for f in glob.glob(S + '/shiavault_chittick/*.md'):
    m = re.match(r'(\d+)-(\d+)-', os.path.basename(f))
    if m and 5 <= int(m.group(1)) <= 58: chit[int(m.group(2))] = parse(f)

def fa_title(t):
    return re.sub(r'^\s*(دعا\s*ی?|دعای)\s*\d+\s*', '', t).strip()
ur_duas = {}
for c in ur_book:
    m = re.match(r'دعاء\s*(\d+)', c['title']['ur'])
    if c['section'] == 'supplications' and m: ur_duas.setdefault(int(m.group(1)), c)

items, stats = [], []
os.makedirs(OUT + '/dua', exist_ok=True)
for c in fa_book:
    if c['section'] != 'supplications': continue
    n = int(re.search(r'(\d+)', c['title']['fa']).group(1))
    ar0, fa0 = segs(c['content']['ar']), [tidy_fa(x) for x in segs(c['content']['fa'])]
    ch = chit.get(n)
    secs = []
    if ch and ch['ar'] and max(ch['ar']) == len(fa0) and len(ch['ar']) == len(fa0):
        base = 'chittick'
        if ch['head_ar']:
            h = {'ar': tidy_ar(ch['head_ar'])}
            if ch['head_en']: h['tr'] = {'chittick': tidy(ch['head_en'])}
            secs.append(h)
        for k in range(1, len(fa0) + 1):
            s = {'ar': tidy_ar(ch['ar'][k]), 'fa': fa0[k - 1]}
            if ch['en'].get(k): s['tr'] = {'chittick': tidy(ch['en'][k])}
            secs.append(s)
    else:
        base = 'alhasani'
        # Arabic segments beyond the Persian ones are rubrics or were split differently; join extras to the last aligned one.
        if len(ar0) > len(fa0): ar0 = ar0[:len(fa0) - 1] + [' '.join(ar0[len(fa0) - 1:])]
        for a, f in zip(ar0, fa0): secs.append({'ar': tidy_ar(a), 'fa': f})
        # Chittick's English keeps the same paragraph numbers as the Persian.
        if ch and len(ar0) == len(fa0) and ch['en'] and max(ch['en']) == len(fa0):
            for k, x in enumerate(secs, 1):
                if ch['en'].get(k): x['tr'] = {'chittick': tidy(ch['en'][k])}
    # Urdu: first segment is the heading, then one per standard paragraph.
    u = ur_duas.get(n); ur_ok = False
    if u:
        us = segs(u['content']['ur'])
        body = [x for x in secs if 'fa' in x]
        if len(us) - 1 == len(body):
            ur_ok = True
            for x, t in zip(body, us[1:]): x.setdefault('tr', {})['ur'] = tidy(t)
            if base == 'chittick' and ch['head_ar']: secs[0].setdefault('tr', {})['ur'] = tidy(us[0])
    title = fa_title(c['title']['fa'])
    json.dump({'title': title, 'sections': secs}, open(f'{OUT}/dua/{n:03d}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    items.append([n, title]); stats.append((n, base, len(secs), sum('chittick' in s.get('tr', {}) for s in secs), ur_ok))
items.sort()
print(len(items)); [print(s) for s in stats if s[1] != 'chittick' or not s[4]]
json.dump(items, open(OUT + '/_items.json', 'w'), ensure_ascii=False)
# Fifteen whispered prayers and the weekday supplications: Arabic + Persian from AL-Hasani only.
extra = {}
for part, sec in (('munajat', 'whispered_prayers'), ('week', 'weekday_duas')):
    os.makedirs(f'{OUT}/{part}', exist_ok=True); lst = []
    for c in [c for c in fa_book if c['section'] == sec]:
        n = len(lst) + 1
        ar0, fa0 = segs(c['content']['ar']), [tidy_fa(x) for x in segs(c['content']['fa'])]
        if len(ar0) > len(fa0): ar0 = ar0[:len(fa0) - 1] + [' '.join(ar0[len(fa0) - 1:])]
        secs = [{'ar': tidy_ar(a), 'fa': f} for a, f in zip(ar0, fa0)]
        # «بسم الله» اول متن جدا نمی‌آید چون خواننده خودش می‌نویسد.
        bism = False
        if secs and re.sub(r'[\u064B-\u065F\u0670]', '', secs[0]['ar']).strip().startswith('بسم') and len(secs[0]['ar']) < 60:
            secs = secs[1:]
        title = tidy_fa(re.sub(r'^\s*\d+\.\s*', '', c['title']['fa']))
        json.dump({'title': title, 'sections': secs}, open(f'{OUT}/{part}/{n:03d}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        lst.append([n, title])
    extra[part] = lst
json.dump({'dua': items, **extra}, open(OUT + '/_items.json', 'w'), ensure_ascii=False)
print({k: len(v) for k, v in extra.items()}, extra)
