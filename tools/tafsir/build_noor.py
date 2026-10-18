# ساخت quran/tafsir-noor/ از پایگاه داده تفسیر نور (محسن قرائتی) در مخزن github.com/app-furqan/quran-app-data (CC BY-ND 4.0).
# اجرا: python3 tools/tafsir/build_noor.py <tafsir-noor.db>
# پایگاه داده: data/tafsir-noor.tar.xz همان مخزن. متن (ستون content_fa) بی‌تغییر می‌ماند؛ فقط نشانه‌های Markdown به قالب قرآن‌خوان
# (عنوان‌ها با «## » و پاراگراف‌ها با خط خالی) برگردانده می‌شود. قالب خروجی همان quran/tafsir/ است و سوره‌های بزرگ چند فایل‌اند.
import json, os, re, sqlite3, sys

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'quran', 'tafsir-noor')
MAX = 350_000  # بیشینه اندازه هر فایل (بایت)، تا تفسیر روی اینترنت کند هم زود باز شود
os.makedirs(OUT, exist_ok=True)
c = sqlite3.connect(sys.argv[1])
rows = c.execute('select m.surah_number, m.ayah_number, m.content_id, ct.content_fa from ayah_mapping m join content ct using(content_id) order by m.surah_number, m.ayah_number').fetchall()
fa = lambda n: str(n).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))

def clean(t):
    out = []
    for line in (t or '').replace('\r', '').split('\n'):
        line = re.sub(r'^\|\s*', '', line.strip())
        if not line:
            continue
        m = re.match(r'^#+\s*(.+)$', line)
        out.append('## ' + m.group(1).replace('ي', 'ی').replace('ك', 'ک') if m else line)
    return '\n\n'.join(out)

by = {}
for s, a, cid, t in rows:
    segs = by.setdefault(s, [])
    if segs and segs[-1]['_cid'] == cid:
        segs[-1]['to'] = a
        continue
    segs.append({'from': a, 'to': a, 'text': clean(t), '_cid': cid})

total = 0
for s, segs in by.items():
    for g in segs:
        g.pop('_cid')
        g['title'] = f'آیه {fa(g["from"])}' if g['from'] == g['to'] else f'آیه‌های {fa(g["from"])} تا {fa(g["to"])}'
    dump = lambda d: json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    whole = dump({'sura': s, 'segments': segs})
    if len(whole.encode()) <= MAX:
        open(os.path.join(OUT, f'{s}.json'), 'w', encoding='utf-8').write(whole)
        total += len(whole.encode())
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
        open(os.path.join(OUT, f), 'w', encoding='utf-8').write(body)
        total += len(body.encode())
        idx.append({'from': p[0]['from'], 'to': p[-1]['to'], 'file': f})
    open(os.path.join(OUT, f'{s}.json'), 'w', encoding='utf-8').write(dump({'sura': s, 'parts': idx}))
print(len(by), 'surahs,', round(total / 1e6, 1), 'MB')
