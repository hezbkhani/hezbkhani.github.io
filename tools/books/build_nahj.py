# Builds books/nahj from:
#  - WWGTX/NahjulBalaghah nahj.db: Arabic (Subhi Salih numbering: 241 sermons, 79 letters, 480 sayings), Dashti Persian, Sayed Ali Reza English.
#  - fa.balaghah.net pages (scraped to balaghah_fa_by_translator.json): Shahidi, Feyz al-Islam, Ansarian, Jafari, each paragraph with its own Arabic.
# The Arabic of WWGTX is the base. Each balaghah paragraph is placed under the base paragraph where its Arabic starts
# (matched on Arabic without vowels, so items numbered differently in Feyz/Ansarian still land in the right place).
# Dashti and English have no paragraph-level Arabic, so their paragraphs are spread over the base by text length.
# usage: python3 -I build_nahj.py <nahj.db> <balaghah_fa_by_translator.json> <out dir>
import json, re, sys, os, sqlite3, bisect
DB, BAL, OUT = sys.argv[1:4]
CATS = [('sermon', 'khutbah'), ('letter', 'letter'), ('saying', 'hikmat')]
BAL_TR = ['shahidi', 'feyz', 'ansarian', 'jafari']

HARAKAT = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')
def key(t):
    t = HARAKAT.sub('', t)
    t = re.sub('[أإآٱ]', 'ا', t); t = re.sub('[ىیي]', 'ي', t); t = t.replace('ک', 'ك').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return re.sub(r'[^ء-ي]', '', t)

def tidy_ar(t):
    t = t.replace('\xa0', ' ').replace('ک', 'ك').replace('ی', 'ي')
    # الف مقصوره: ي آخر کلمه که پیش از آن فتحه است (عَلَي، إِلَي) ى است.
    t = re.sub('(?<=\u064E)\u064A(?![\u064B-\u0652\u0620-\u064A])', '\u0649', t)
    t = re.sub(r'\s*\(\s*عليه السلام\s*\)\s*', ' (عليه السلام) ', t)
    t = re.sub(r'\s+([،,.؛:])', r'\1', t); t = re.sub(r'([،؛:.])(?=[^\s\d.)»])', r'\1 ', t)
    return re.sub(r'\s+', ' ', t).strip()

def tidy_fa(t):
    t = t.replace('\xa0', ' ').replace('ي', 'ی').replace('ك', 'ک').replace('ى', 'ی').replace('ۀ', 'هٔ')
    t = re.sub(r'\s+([ً-ْ])', r'\1', t)  # stray vowel signs after a space
    t = re.sub(r'([،؛:.!؟])(?=[^\s\d.)»؟!])', r'\1 ', t)
    t = re.sub(r'\s+([،؛:.!؟)])', r'\1', t)
    return re.sub(r'\s+', ' ', t).strip()

db = sqlite3.connect(DB)
# WWGTX dropped the zero-width non-joiners from Dashti's text (نمیآید، اندیشهای). Words that carry one in other
# Persian texts here (Dashti in the geraked app, Ansarian) are restored when the joined spelling is not a word of its own.
ZW = sys.argv[4] if len(sys.argv) > 4 else None
zw_words, plain = {}, set()
def scan(t):
    for w in re.findall(r'[\u0600-\u06FF\u200c]+', t):
        w = w.strip('\u200c')
        if '\u200c' in w: zw_words.setdefault(w.replace('\u200c', ''), {}).setdefault(w, 0); zw_words[w.replace('\u200c', '')][w] += 1
        else: plain.add(w)
if ZW:
    for (t,) in sqlite3.connect(ZW).execute('select cnt from nahj'): scan(t.replace('ي', 'ی').replace('ك', 'ک'))

bal = json.load(open(BAL))
for c in bal['ansarian'].values():
    for r in c.values():
        for p in r['paragraphs']: scan(tidy_fa(p.get('fa', '')))
ZWMAP = {k: max(v, key=v.get) for k, v in zw_words.items() if k not in plain}
def fix_zw(t): return re.sub(r'[\u0600-\u06FF]+', lambda m: ZWMAP.get(m.group(0), m.group(0)), t)
os.makedirs(OUT, exist_ok=True)
index_parts, report = [], {}
for cat, part in CATS:
    rows = db.execute('select number,title,subtitle_ar,preamble_ar,body_ar,body_fa,body_en from entries where category=? order by number', (cat,)).fetchall()
    # base: one list of sections per item; keys for matching
    items, flat_keys, flat_pos = [], [], []  # flat: concatenated base keys of the whole category
    text, starts = '', []                      # starts[i] = (offset in text, item idx, section idx)
    for num, title, sub, pre, bar, bfa, ben in rows:
        secs = []
        head = ' '.join(x for x in [(pre or '').strip(), (sub or '').strip()] if x)
        if head: secs.append({'ar': tidy_ar(head), 'head': True})
        for x in json.loads(bar):
            if x['t'] == 'p' and x['v'].strip(): secs.append({'ar': tidy_ar(x['v'])})
            elif x['t'] == 'heading' and x['v'].strip() and len(secs) > (1 if head else 0): secs.append({'note': tidy_ar(x['v'])})
        it = {'n': num, 'title': (title or '').strip(), 'secs': secs, 'fa': json.loads(bfa), 'en': json.loads(ben)}
        for si, s in enumerate(secs):
            if 'ar' in s and not s.get('head'):
                starts.append((len(text), len(items), si)); text += key(s['ar'])
        it['range'] = (starts[0][0] if starts else len(text))
        items.append(it)
    offs = [s[0] for s in starts]
    def where(pos):
        i = max(0, bisect.bisect_right(offs, pos) - 1); return starts[i][1], starts[i][2]

    # balaghah translators: anchor each paragraph's Arabic in the base text.
    for tr in BAL_TR:
        src = bal[tr].get(cat, {}); ptr = 0; found = miss = 0
        for kn in sorted(src, key=int):
            rec = src[kn]; first = True; first_pos = None
            for p in rec['paragraphs']:
                ar, fa = p.get('ar', ''), tidy_fa(p.get('fa', ''))
                if not fa: continue
                k = key(ar); pos = -1
                for off, ln in ((0, 24), (8, 18), (20, 14), (40, 12)):
                    probe = k[off:off + ln]
                    if len(probe) < 8: continue
                    # nearest occurrence at or after the pointer (allow a little backtrack), else anywhere
                    q = text.find(probe, max(0, ptr - 400))
                    if q < 0 or q - ptr > 60000: q = text.find(probe)
                    if q >= 0: pos = max(0, q - off); break
                if pos < 0: pos = ptr; miss += 1
                else: found += 1
                # the section where most of this paragraph's Arabic lies
                ii, si = where(pos + len(k) // 2 if pos != ptr or found else pos)
                s = items[ii]['secs'][si]
                s.setdefault('tr', {})
                s['tr'][tr] = (s['tr'][tr] + ' ' + fa) if tr in s['tr'] else fa
                if first:
                    first = False
                    intro = tidy_fa(rec.get('intro') or '')
                    hd = items[ii]['secs'][0]
                    if intro and hd.get('head') and tr not in hd.get('tr', {}): hd.setdefault('tr', {})[tr] = intro
                ptr = pos + len(k)
        report[(cat, tr)] = (found, miss)

    # Dashti (fa) and English: spread paragraphs by length over the base sections.
    for lang, fld in (('dashti', 'fa'), ('en', 'en')):
        for it in items:
            body = [s for s in it['secs'] if 'ar' in s and not s.get('head')]
            paras = [fix_zw(tidy_fa(x['v'])) if lang == 'dashti' else re.sub(r'\s+', ' ', x['v']).strip() for x in it[fld] if x['t'] == 'p' and x['v'].strip()]
            # Dashti's numbered subheadings sometimes come as paragraphs ("۳ راههای خدا شناسی")
            paras = [p for p in paras if not (lang == 'dashti' and re.match(r'^[۰-۹0-9]+[-\s]', p) and len(p) < 70 and not re.search(r'[.،]', p))]
            if not body or not paras: continue
            # a whole letter in one or two paragraphs: spread it by sentences instead
            if len(paras) * 2 < len(body):
                paras = [x for p in paras for x in re.split(r'(?<=[.!?؟])\s+', p) if x]
            tot_a = sum(len(key(s['ar'])) for s in body); tot_t = sum(len(p) for p in paras)
            bounds, acc = [], 0
            for s in body: bounds.append(acc / tot_a); acc += len(key(s['ar']))
            acc = 0
            for p in paras:
                mid = (acc + len(p) * 0.35) / tot_t; acc += len(p)
                j = max(0, bisect.bisect_right(bounds, mid) - 1)
                t = body[j].setdefault('tr', {}); t[lang] = (t[lang] + ' ' + p) if lang in t else p

    lst = []
    os.makedirs(f'{OUT}/{part}', exist_ok=True)
    for it in items:
        secs = []
        for s in it['secs']:
            if 'note' in s: secs.append({'note': s['note']}); continue
            o = {'ar': s['ar']}
            t = s.get('tr', {})
            if 'dashti' in t: o['fa'] = t.pop('dashti')
            if t: o['tr'] = {k: t[k] for k in ['shahidi', 'feyz', 'ansarian', 'jafari', 'en'] if k in t}
            secs.append(o)
        title = it['title']
        if not title:  # sayings: start of Dashti's translation
            f = next((s.get('fa') for s in secs if s.get('fa')), '')
            f = re.sub(r'^و?\s*(درود خدا بر او|امام علیه السلام|امام)?\s*(فرمود|فرمودند)\s*:\s*', '', f)
            m = re.match(r'^.{0,45}?فرمود(?:ند)?\s*:\s*', f)
            if m and m.group(0).startswith(('و ', 'درود', 'امام')): f = f[m.end():]
            title = f if len(f) <= 70 else f[:70].rsplit(' ', 1)[0] + '…'
        json.dump({'title': title, 'bism': False, 'sections': secs}, open(f'{OUT}/{part}/{it["n"]:03d}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        lst.append([it['n'], title])
    index_parts.append((cat, part, lst))
json.dump(index_parts, open(OUT + '/_items.json', 'w'), ensure_ascii=False)
for k, v in report.items(): print(k, v)
