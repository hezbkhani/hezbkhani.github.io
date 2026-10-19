# ترجمه‌های دیگرِ هر متن کتاب (همه جز مترجم اول کتاب، که در خود فایل می‌ماند) را از فایل خود متن بیرون می‌برد
# تا خواننده فقط ترجمه‌ای را دانلود کند که برگزیده است (مثلاً نامه ۵۳ نهج‌البلاغه: ۱۰۰ به ۲۶ کیلوبایت فشرده).
# books/<کتاب>/<بخش>/<شماره>.json  ->  books/<کتاب>/tr/<مترجم>/<بخش>/<شماره>.json = { n: تعداد بندها، t: ترجمه هر بند یا null }
# و در index.json کتاب "trFiles": true گذاشته می‌شود (books.js از آن می‌فهمد ترجمه را جدا بگیرد).
# پس از هر بار ساختن کتاب (build_nahj.py، build_sahifa.py، build_more.py) دوباره اجرا شود؛ اجرای دوباره بی‌اثر است.
# استفاده: python3 tools/books/split_translations.py nahj sahifa huquq
import json, os, sys, glob

def dump(o, f):
    os.makedirs(os.path.dirname(f), exist_ok=True)
    with open(f, 'w', encoding='utf-8') as h: json.dump(o, h, ensure_ascii=False, separators=(',', ':'))

for key in sys.argv[1:]:
    root = f'books/{key}'
    ixf = f'{root}/index.json'
    ix = json.load(open(ixf, encoding='utf-8'))
    moved = 0
    first = (ix.get('translations') or [{}])[0].get('id')
    for part in ix['parts']:
        for f in sorted(glob.glob(f'{root}/{part["id"]}/*.json')):
            d = json.load(open(f, encoding='utf-8'))
            secs = d.get('sections', [])
            ids = sorted({k for s in secs for k in (s.get('tr') or {}) if k != first})
            if not ids: continue
            name = os.path.basename(f)
            for tid in ids:
                dump({'n': len(secs), 't': [(s.get('tr') or {}).get(tid) for s in secs]}, f'{root}/tr/{tid}/{part["id"]}/{name}')
            for s in secs:
                t = {k: v for k, v in (s.get('tr') or {}).items() if k == first}
                if t: s['tr'] = t
                else: s.pop('tr', None)
            dump(d, f); moved += 1
    if moved and not ix.get('trFiles'):
        ix['trFiles'] = True
        with open(ixf, 'w', encoding='utf-8') as h: json.dump(ix, h, ensure_ascii=False, indent=1)
    print(key, 'files split:', moved)
