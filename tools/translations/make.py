# ساخت quran/t/<شناسه Tanzil>/001.json تا 120.json برای ترجمه‌های غیرفارسی از Tanzil.net (مثلاً quran/t/en.sahih).
# اجرا از ریشه مخزن: python3 tools/translations/make.py
# هر فایل فهرست ترجمه آیه‌های همان سهم است (مرز سهم‌ها از quran/index.json)، به همان شکل ترجمه‌های فارسی.
# فهرست باید با LANGS در quran-reader.js یکی باشد.
import json, os, re, sys, urllib.request

IDS = sys.argv[1:] or '''en.sahih en.qarai en.pickthall en.yusufali en.shakir de.bubenheim de.aburida de.khoury
fr.hamidullah es.cortes es.bornez es.garcia it.piccardo ru.kuliev ru.osmanov ru.krachkovsky tr.diyanet tr.golpinarli
tr.yazir ur.jalandhry ur.najafi ur.jawadi id.indonesian zh.jian hi.hindi bn.bengali'''.split()

ix = json.load(open('quran/index.json'))
bounds = ix['portion'] + [ix['total']]
for tid in IDS:
    raw = urllib.request.urlopen(f'https://tanzil.net/trans/{tid}?type=txt-2').read().decode('utf-8')
    # فقط \n جداکننده سطر است (splitlines روی نویسه‌هایی مثل U+2028 داخل متن هم می‌شکند).
    ayahs = [re.sub(r'\s*<br\s*/?>\s*', ' ', m.group(1)).strip() for m in re.finditer(r'^\d+\|\d+\|(.*)$', raw, re.M)]
    assert len(ayahs) == ix['total'], (tid, len(ayahs))
    os.makedirs(f'quran/t/{tid}', exist_ok=True)
    for i in range(len(bounds) - 1):
        with open(f'quran/t/{tid}/{i + 1:03d}.json', 'w', encoding='utf-8') as f:
            json.dump(ayahs[bounds[i]:bounds[i + 1]], f, ensure_ascii=False, separators=(',', ':'))
    print(tid, 'ok')
