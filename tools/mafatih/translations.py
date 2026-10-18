# ساخت ترجمه انگلیسی و اردوی متن‌های پرخواننده مفاتیح‌الجنان برای خواننده چله (chelleh/tr/<مترجم>/books/mafatih/<NNN>.json).
# اجرا از ریشه مخزن: python3 -I tools/mafatih/translations.py <پوشه دانلود> [--write]
# بدون --write فقط پوشش هم‌ترازی گزارش می‌شود؛ با --write فایل‌ها نوشته و کلیدها به chelleh/tr/index.json افزوده می‌شوند.
# منابع: انگلیسی از Duas.org (مستقیم، یا متن همان سایت که در داده‌های برنامه AL-Hasani با مفاتیح هم‌تراز شده)،
# اردو از داده‌های برنامه AL-Hasani (github.com/ShahAli2000/AL-Hasani-app، ترجمه اردوی مفاتیح و صحیفه).
# هم‌ترازی: عربی هر بند منبع با عربی بندهای مفاتیح (بی‌اعراب، یکسان‌سازی حروف) کلمه‌به‌کلمه مقایسه می‌شود
# و ترجمه هر بند منبع به بندی از مفاتیح می‌رود که بیشتر عربی‌اش در آن افتاده است. فقط متنی با پوشش ۹۰٪ یا بیشتر نوشته می‌شود.
import ast, difflib, html, json, os, re, sys, urllib.request

DL = sys.argv[1] if len(sys.argv) > 1 else "."
WRITE = '--write' in sys.argv
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
HASANI = 'https://raw.githubusercontent.com/ShahAli2000/AL-Hasani-app/main/app-data/'
DUAS = 'https://www.duas.org/'
MUNAJAT = ['01-taibeen', '02-shakeen', '03-khaifeen', '04-rajeen', '05-raghibeen', '06-shakireen', '07-mutieen', '08-murideen',
           '09-muhibbeen', '10-mutawassileen', '11-muftaqireen', '12-arifeen', '13-dhakireen', '14-mutasimeen', '15-zahideen']

# متن‌های مفاتیح؛ برای هر زبان، منبع با بیشترین هم‌پوشانی عربی خودکار انتخاب می‌شود.
TARGETS = ['336', '118', '123', '171', '343', '049', '050', '041', '047', '295', '238', '280', '299', '652', '064', '056', '668',
           '010', '011', '012', '013', '014', '015', '016', '106'] + [f'{k:03d}' for k in range(69, 84)]
TRANSLATORS = {'en': 'en-duas', 'ur': 'ur-hasani'}
UR_ENTRY = {'id': 'ur-hasani', 'lang': 'ur', 'name': 'مفاتیح الجنان اردو', 'src': 'داده‌های برنامه AL-Hasani', 'texts': []}
MIN_COVER = 0.9


def get(url, name):
    path = os.path.join(DL, name)
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with open(path, 'wb') as f:
            f.write(urllib.request.urlopen(req).read())
    return open(path, encoding='utf-8').read()


def clean(s):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))
    return re.sub(r'\s+', ' ', s).strip()


# --- منابع: هر منبع فهرست (عربی، ترجمه) است ---
def hasani(lang):
    out = {}
    files = ['major', 'weekday', 'ziyarat', 'munajat'] if lang == 'en' else ['major', 'weekday', 'ziyarat', 'munajat', 'aamal', 'sahifa']
    for f in files:
        rel = f'duas/{f}.json' if lang == 'en' else f'ur/duas/{f}.json'
        for it in json.loads(get(HASANI + rel, 'hasani/' + rel)):
            segs = it['segments']
            segs = ast.literal_eval(segs) if isinstance(segs, str) else segs
            # بندها؛ عنوان‌هایی که عربی دارند هم (صحیفه همه را عنوان گذاشته)
            pairs = [(x.get('arabic') or '', clean((x.get('translation') or {}).get(lang)), False) if x.get('type') == 'content'
                     else ((x.get('text') or {}).get('ar') or '', clean((x.get('text') or {}).get(lang)), True) for x in segs]
            out[f'hasani:{it["id"]}'] = [p for p in pairs if p[0]]
            TITLES[f'hasani:{it["id"]}'] = clean(it['name'])
    return out


def duas_json(slug):
    d = json.loads(get(f'{DUAS}data_v2/{slug}.json', f'duasorg/{slug}.json'))
    return [(x.get('arabic') or '', clean(x.get('translation')), False) for du in d.get('duas', []) for x in du.get('segments', []) if x.get('arabic')]


def duas_html(page):
    h = get(f'{DUAS}mobile/{page}.html', f'duasorg/{page}.html')
    m = re.search(r'<ptitle>(.*?)</ptitle>.*?<t4>(.*?)</t4>', h, re.S)
    if m:  # مثلاً «Munajat Shakeen (Complainers)»
        sub = re.sub(r'^(of the|of)\s+', '', clean(m.group(2)).split('-')[-1].strip(' |'))
        TITLES['duas:' + page.replace('sahifa-sajjadiya-', '')] = f'{clean(m.group(1))} ({sub})'
    out = []
    for chunk in h.split('<div class="Ara">')[1:]:
        ar = chunk.split('<div class="Trl">')[0].split('<div class="Tra">')[0]
        tr = chunk.split('<div class="Tra">', 1)[1] if '<div class="Tra">' in chunk else ''
        tr = re.split(r'</t1>|<br>|<hr', tr)[0]
        if clean(ar):
            out.append((clean(ar), clean(tr), False))
    return out


TITLES = {}


def sources(lang):
    src = hasani(lang)
    if lang == 'en':
        src['duas:dua-arafah-imam-husain'] = duas_json('dua-arafah-imam-husain')
        src['duas:munajat-shabaniyah'] = duas_json('munajat-shabaniyah')
        for slug in ('ramadan-dua-iftitah', 'ramadan-iftaar-dua', 'ramadan-every-night-dua'):
            src['duas:' + slug] = duas_json(slug)
        src['duas:ziyarat-arbaeen'] = duas_html('ziyarat-arbaeen')
        for m in MUNAJAT:
            src[f'duas:munajat{m}'] = duas_html(f'sahifa-sajjadiya-munajat{m}')
    return src


# --- یکسان‌سازی عربی ---
DIAC = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ‌‍‎‏ٕٔ]')
MAP = str.maketrans({'ٱ': 'ا', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ﭐ': 'ا', 'ى': 'ي', 'ی': 'ي', 'ئ': 'ي', 'ک': 'ك', 'ة': 'ه', 'ۀ': 'ه',
                     'ؤ': 'و', 'ء': '', 'ﷲ': ' الله '})


def words(s):
    s = DIAC.sub('', s.replace('ﷲ', ' الله ')).translate(MAP)
    s = re.sub(r'[^ء-ي]+', ' ', s)
    w, out = s.split(), []
    for x in w:  # «و»ی جدا (مثل «وَ صَلَّى») به کلمه بعد چسبانده می‌شود.
        if out and out[-1] == 'و':
            out[-1] += x
        else:
            out.append(x)
    return out


BISM = ['بسم', 'الله', 'الرحمن', 'الرحيم']


def tokens(texts):
    """کلمه‌ها و شماره بند هر کلمه."""
    toks, owner = [], []
    for i, t in enumerate(texts):
        w = words(t)
        toks += w
        owner += [i] * len(w)
    return toks, owner


def shingles(w):
    return {' '.join(w[i:i + 3]) for i in range(len(w) - 2)}


def align(sections, pairs):
    """ترجمه هر بند مفاتیح، و آمار هم‌ترازی."""
    T, towner = tokens([s.get('ar', '') for s in sections])
    S, sowner = tokens([p[0] for p in pairs])
    sm = difflib.SequenceMatcher(None, S, T, autojunk=False)
    blocks = [b for b in sm.get_matching_blocks() if b.size]
    pos = [None] * len(S)   # جای هر کلمه منبع در مفاتیح
    exact = [False] * len(S)
    tmatch = [False] * len(T)
    for b in blocks:
        for k in range(b.size):
            pos[b.a + k] = b.b + k
            exact[b.a + k] = True
            tmatch[b.b + k] = True
    # فاصله‌های بین بلوک‌ها: خطی جای‌گذاری؛ اگر طرف مفاتیح خالی باشد، آن کلمه‌ها بیرون می‌مانند.
    edges = [(b.a, b.b, b.size) for b in blocks] + [(len(S), len(T), 0)]
    pa = pb = 0
    for i, (a0, b0, size) in enumerate(edges):
        ga, gb = a0 - pa, b0 - pb
        lo, hi, cap = pa, a0, int(gb * 1.5) + 3
        if i == 0:   # پیش از اولین بلوک یا پس از آخرین: فقط کلمه‌های نزدیک بلوک
            lo = max(pa, a0 - cap)
        elif i == len(edges) - 1:
            hi = min(a0, pa + cap)
        elif ga > 4 * gb + 12:   # منبع اینجا چیزی دارد که در مفاتیح نیست
            hi = lo
        if gb > 0:
            for j in range(lo, hi):
                pos[j] = pb + int((j - lo + 0.5) * gb / (hi - lo))
        pa, pb = a0 + size, b0 + size
    # هر بند منبع به بندی می‌رود که بیشتر کلمه‌هایش آنجاست.
    out = [[] for _ in sections]
    seg_votes = {}
    for j, p in enumerate(pos):
        if p is not None:
            seg_votes.setdefault(sowner[j], {}).setdefault(towner[p], [0, 0])
            v = seg_votes[sowner[j]][towner[p]]
            v[0] += 1
            v[1] += exact[j]
    dropped = 0
    for si, (ar, tr, head) in enumerate(pairs):
        v = seg_votes.get(si)
        nw = len(words(ar))
        if not v or not tr:
            dropped += 1
            continue
        sec, (cnt, ex) = max(v.items(), key=lambda kv: kv[1][0])
        if cnt * 2 < nw or (head and ex * 2 < nw):  # بیشتر بند جایی در مفاتیح ندارد؛ عنوان باید واقعاً یکی باشد
            dropped += 1
            continue
        out[sec].append(tr)
    t = [' '.join(x) if s.get('ar') else '' for x, s in zip(out, sections)]
    # سهم کلمه‌های عربی هر بند مفاتیح که عیناً در منبع پیدا شد
    tot, hit = [0] * len(sections), [0] * len(sections)
    for k, o in enumerate(towner):
        tot[o] += 1
        hit[o] += tmatch[k]
    return t, [h / n if n else 0 for h, n in zip(hit, tot)], tot, dropped


def main():
    idx = json.load(open(os.path.join(ROOT, 'books/mafatih/index.json'), encoding='utf-8'))
    titles = {it['key']: it['title'] for c in idx['chapters'] for p in c['parts'] for it in p['items'] if 'key' in it}
    report, shipped = [], {'en': [], 'ur': []}
    for lang in ('en', 'ur'):
        src = sources(lang)
        bisms = [p[1] for v in src.values() for p in v if p[1] and words(p[0]) == BISM]
        bism = max(set(bisms), key=bisms.count)
        sh = {k: shingles(words(' '.join(p[0] for p in v))) for k, v in src.items()}
        for key in TARGETS:
            text = json.load(open(os.path.join(ROOT, f'books/mafatih/{key}.json'), encoding='utf-8'))
            secs = text['sections']
            tsh = shingles(words(' '.join(s.get('ar', '') for s in secs)))
            best = [x for x in sorted(((len(tsh & v) / max(1, len(tsh)), k) for k, v in sh.items()), reverse=True)[:6] if x[0] > 0.1]
            if not best or best[0][0] < 0.5:
                report.append(f'{lang} {key} {titles.get(key)}: منبعی پیدا نشد ({best[0] if best else ""})')
                continue
            # منبع اصلی همه بندها را می‌دهد؛ منبع‌های بعدی فقط بندهای خالی‌مانده‌ای را که عربی‌شان واقعاً در آنها هست.
            t, used, srcof = [''] * len(secs), [], {}
            cands, n = [best[0]], 0
            while n < len(cands) and n < 12:
                score, sk = cands[n]
                tt, hit, tot, dropped = align(secs, src[sk])
                fill = [i for i, x in enumerate(tt) if x and not t[i] and hit[i] >= (0.3 if n == 0 else 0.75)]
                for i in fill:
                    t[i], srcof[i] = tt[i], sk
                if n == 0:
                    weak, wtot = [i for i, x in enumerate(tt) if x and hit[i] < 0.3], tot
                    # منبع‌های بعدی: آنهایی که با عربی بندهای خالی‌مانده بیشترین هم‌پوشانی را دارند
                    for i, sec in enumerate(secs):
                        rest = shingles(words(sec.get('ar', '')))
                        if t[i] or not rest:
                            continue
                        top = sorted(((len(rest & v) / len(rest), k) for k, v in sh.items() if k != sk), reverse=True)[:2]
                        cands += [x for x in top if x[0] > 0.3 and x[1] not in [c[1] for c in cands]]
                if fill:
                    used.append(f'{sk} ({score:.2f}, {len(fill)} بند، {dropped}/{len(src[sk])} بند منبع بی‌جا)')
                n += 1
            # «بسم الله» و عنوان مناجات‌ها (مثل «المناجاة الاولى: …») اگر خالی ماند: رایج‌ترین ترجمه بسمله در منبع‌های همان زبان، و نام همان مناجات در منبع اصلی.
            for i, sec in enumerate(secs):
                w = words(sec.get('ar', ''))
                if not t[i] and w == BISM:
                    t[i] = bism
                elif not t[i] and w[:1] in (['المناجاه'], ['المناجات']) and len(w) <= 6 and TITLES.get(best[0][1]):
                    t[i] = TITLES[best[0][1]]
            ar_secs = [i for i, s in enumerate(secs) if s.get('ar') and wtot[i]]
            cover = sum(1 for i in ar_secs if t[i]) / max(1, len(ar_secs))
            ok = cover >= MIN_COVER
            report.append(f'{lang} {key} {titles.get(key)}: cover {cover:.0%} ({sum(1 for i in ar_secs if t[i])}/{len(ar_secs)}) '
                          f'weak {weak} {"OK" if ok else "SKIP"} <- ' + '; '.join(used))
            if os.environ.get('DEBUG') in (key, f'{lang}{key}'):
                for i, (sec, x) in enumerate(zip(secs, t)):
                    if sec.get('ar'):
                        print(f'  [{i}]{"W" if i in weak else ""} {srcof.get(i, "")} {sec["ar"][:90]}\n      -> {x[:160]}')
            if ok and WRITE:
                path = os.path.join(ROOT, f'chelleh/tr/{TRANSLATORS[lang]}/books/mafatih/{key}.json')
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write('{"n":%d,"t":[\n%s\n]}\n' % (len(secs), ',\n'.join(json.dumps(x, ensure_ascii=False) for x in t)))
            if ok:
                shipped[lang].append(f'books/mafatih/{key}')
    print('\n'.join(report))
    if WRITE:
        path = os.path.join(ROOT, 'chelleh/tr/index.json')
        lst = json.load(open(path, encoding='utf-8'))
        if not any(x['id'] == UR_ENTRY['id'] for x in lst):
            lst.insert([k for k, x in enumerate(lst) if x['id'] == 'ur-duas'][0] + 1, dict(UR_ENTRY))
        for lang, keys in shipped.items():
            e = next(x for x in lst if x['id'] == TRANSLATORS[lang])
            e['texts'] = [k for k in e['texts'] if not k.startswith('books/mafatih/')] + keys
        with open(path, 'w', encoding='utf-8') as f:
            f.write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in lst) + '\n]\n')


if __name__ == "__main__":
    main()
