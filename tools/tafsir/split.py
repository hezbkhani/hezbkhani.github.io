# تقسیم فایل‌های تفسیر (quran/tafsir و quran/tafsir-noor) به تکه‌های کوچک و معرفی سوره‌ها (quran/intro.json) به یک فایل برای هر سوره،
# تا با زدن دکمه «تفسیر» یا «معرفی سوره» روی اینترنت کند فقط چند ده کیلوبایت گرفته شود، نه کل یک سوره (تا ۸۰۰ کیلوبایت).
# اجرا (از ریشه مخزن): python3 -I tools/tafsir/split.py — هر بار که اجرا شود از روی همان فایل‌های موجود دوباره تکه می‌کند.
# متن‌ها دست نمی‌خورند؛ فقط جای تقسیم فایل‌ها عوض می‌شود (به‌جز جابه‌جایی عنوان‌های آیه ۱ و ۲ بقره، پایین‌تر).
# قالب همان قبلی است: سوره کوچک یک فایل <سوره>.json با {sura, segments}، سوره بزرگ فهرست {sura, parts: [{from, to, file}]} و تکه‌های <سوره>-<شماره>.json.
import glob, json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'quran')
MAX = 50_000  # بیشینه اندازه هر تکه (بایت، پیش از gzip)؛ بخشی که خودش بزرگ‌تر است تنها در یک تکه می‌ماند
dump = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))

# تفسیر نمونه، بقره ۱ و ۲: هفت عنوان این بخش در داده سایت به ترتیب وارونه در انتهای متن (پس از پانوشت‌ها) آمده بود.
# هر عنوان پیش از بندی می‌آید که با همان موضوع شروع می‌شود (ترتیب کتاب: «تحقیق درباره حروف مقطعه» ... «۴ ـ چرا هدایت ...»).
MOVE = {('tafsir', 2, 1): [
    ('## تحقیق درباره حروف مقطعه قرآن', 'در آغاز سوره «بقره» که دومین سوره'),
    ('## عصر طلائى ادبیات عرب', 'جالب توجه این که: عصر جاهلیت یک عصر طلائى'),
    ('## شاهد گویا', 'گواه زنده این تفسیر براى حروف مقطعه'),
    ('## 1 ـ چرا اشاره به دور؟', 'مى‌دانیم کلمه «ذلِک» در لغت عرب اسم اشاره بعید است'),
    ('## 2 ـ معنى «کتاب»', '«کتاب» به معنى مکتوب و نوشته شده است'),
    ('## 3 ـ هدایت چیست؟', 'کلمه «هدایت» در قرآن در موارد فراوانى استعمال شده'),
    ('## 4 ـ چرا هدایت قرآن ویژه پرهیزکاران است؟', 'مسلماً قرآن براى هدایت همه جهانیان نازل شده'),
]}

def fix(name, s, g):
    moves = MOVE.get((name, s, g['from']))
    if not moves:
        return
    ps = g['text'].split('\n\n')
    heads = [h for h, _ in moves]
    if ps[-len(heads):] != heads[::-1]:
        return  # پیش‌تر درست شده
    ps = ps[:-len(heads)]
    for h, start in moves:
        at = [i for i, p in enumerate(ps) if p.startswith(start)]
        assert len(at) == 1, (s, h)
        ps.insert(at[0], h)
    old = sorted(g['text'].split('\n\n'))
    g['text'] = '\n\n'.join(ps)
    assert sorted(ps) == old
    g['title'] = heads[0][3:]

def segments(d, s):
    j = json.load(open(os.path.join(d, f'{s}.json'), encoding='utf-8'))
    if 'segments' in j:
        return j['segments'], []
    files = [p['file'] for p in j['parts']]
    return [g for f in files for g in json.load(open(os.path.join(d, f), encoding='utf-8'))['segments']], files

def split(name):
    d = os.path.join(ROOT, name)
    if not os.path.isdir(d):
        return
    sur = sorted(int(os.path.basename(f)[:-5]) for f in glob.glob(os.path.join(d, '*.json')) if os.path.basename(f)[:-5].isdigit())
    count, biggest = 0, 0
    for s in sur:
        segs, old = segments(d, s)
        for g in segs:
            fix(name, s, g)
        for f in old:
            os.remove(os.path.join(d, f))
        whole = dump({'sura': s, 'segments': segs})
        if len(whole.encode()) <= MAX:
            open(os.path.join(d, f'{s}.json'), 'w', encoding='utf-8').write(whole)
            count += 1; biggest = max(biggest, len(whole.encode()))
            continue
        parts, cur, size = [], [], 0
        for g in segs:
            n = len(dump(g).encode())
            if cur and size + n > MAX:
                parts.append(cur); cur, size = [], 0
            cur.append(g); size += n
        parts.append(cur)
        idx = []
        for i, p in enumerate(parts, 1):
            f = f'{s}-{i}.json'
            body = dump({'sura': s, 'segments': p})
            open(os.path.join(d, f), 'w', encoding='utf-8').write(body)
            count += 1; biggest = max(biggest, len(body.encode()))
            idx.append({'from': p[0]['from'], 'to': p[-1]['to'], 'file': f})
        open(os.path.join(d, f'{s}.json'), 'w', encoding='utf-8').write(dump({'sura': s, 'parts': idx}))
    print(name, len(sur), 'surahs,', count, 'files, biggest', biggest, 'bytes', file=sys.stderr)

def intro():
    # quran/intro.json (خروجی tools/intro/build_intro.py) ← quran/intro/<سوره>.json: {src, place, ayat, order, about, virtue}
    src = os.path.join(ROOT, 'intro.json')
    if not os.path.exists(src):
        return
    j = json.load(open(src, encoding='utf-8'))
    os.makedirs(os.path.join(ROOT, 'intro'), exist_ok=True)
    for i, it in enumerate(j['surahs'], 1):
        open(os.path.join(ROOT, 'intro', f'{i}.json'), 'w', encoding='utf-8').write(dump(dict(src=j['src'], **it)))
    os.remove(src)
    print('intro', len(j['surahs']), 'files', file=sys.stderr)

split('tafsir')
split('tafsir-noor')
intro()
