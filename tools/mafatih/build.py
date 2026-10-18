# ساخت books/mafatih/ از پایگاه داده مفاتیح‌الجنان (متن عربی و ترجمه استاد حسین انصاریان).
# اجرا: python3 tools/mafatih/build.py <mafatihdbv14.db>
# منبع پایگاه داده: github.com/kazemcodes/mafatih_db (type 3/mafatihdbv14.db)؛ همان متن erfan.ir با ترجمه انصاریان.
import json, os, re, sqlite3, sys

DB = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'books', 'mafatih')
os.makedirs(OUT, exist_ok=True)
c = sqlite3.connect(DB)

CHAPTERS = {
    1: 'سوره‌ها',
    2: 'باب اول: تعقیبات، دعاها و مناجات‌ها',
    3: 'باب دوم: اعمال ماه‌های سال',
    4: 'باب سوم: زیارات',
    5: 'ملحقات مفاتیح‌الجنان',
    6: 'باقیات الصالحات',
}
ORDER = [2, 3, 4, 5, 6, 1]
SURAH = {'فاتحه': 1, 'عنکبوت': 29, 'روم': 30, 'دخان': 44, 'یس': 36, 'الرحمن': 55, 'واقعه': 56, 'جمعه': 62, 'کهف': 18, 'ملک': 67,
         'انسان': 76, 'نبأ': 78, 'اعلی': 87, 'شمس': 91, 'قدر': 97, 'زلزله': 99, 'عادیات': 100, 'تکاثر': 102, 'کافرون': 109,
         'نصر': 110, 'اخلاص': 112, 'فلق': 113, 'ناس': 114}
# متن‌هایی که سایت از قبل دارد (پوشه chelleh، با صوت)؛ همان باز می‌شود و تکراری ساخته نمی‌شود.
REF = {'دعای کمیل': 'kumayl', 'دعای سمات': 'samat', 'دعای مشلول': 'mashlool', 'دعای توسل': 'tavassul',
       'دعای عهد': 'ahd', 'متن زیارت عاشورای معروفه': 'ashura', 'حدیث شریف کساء': 'kisa'}

# صوت از shiavoice.com (همان منبع صوت‌های دیگر سایت)؛ کلید: _id مورد در پایگاه داده.
AUDIO = json.load(open(os.path.join(os.path.dirname(__file__), 'audio.json'), encoding='utf-8'))

def clean_ar(s):
    s = (s or '').replace('‏', '').replace('‎', '')
    return re.sub(r'\s+', ' ', s).strip()

# در متن منبع نشانه RLM گاهی جای نیم‌فاصله است (می‌کنم، خطاها) و گاهی فقط جای فاصله؛
# نیم‌فاصله فقط پس از «می/نمی» یا پیش از پسوندهای رایج گذاشته می‌شود.
SUFFIX = re.compile('(?:ها|های|هایی|هایم|هایت|هایش|ام|ات|اش|اند|ایم|اید|تر|ترین)(?![\u0600-\u06FF])')
MI = re.compile('(?:^|[^\u0600-\u06FF])ن?م[یى]$')

def _rlm(m):
    if MI.search(m.string[:m.start()]) or SUFFIX.match(m.string, m.end()):
        return '\u200c'
    return ' '

def clean_fa(s):
    s = re.sub('\\s*[\u200f\u200e]+\\s*', _rlm, s or '')
    s = s.replace('ى', 'ی').replace('ي', 'ی').replace('ك', 'ک')
    s = re.sub(r'‌{2,}', '‌', s)
    s = re.sub(r'\s*‌\s*', '‌', s)
    s = re.sub(r'[ \t]+', ' ', s)
    return re.sub(r'\s*\n\s*', '\n', s).strip()

def title_of(s):
    return re.sub(r'\s+', ' ', re.sub(r'[\u064B-\u0652\u0670]', '', clean_fa(s))).strip('"').strip()

rows = c.execute('select _id, M_name, M_cat_id, M_type, M_prio from M_items order by M_cat_id, M_prio, M_type desc, _id').fetchall()
lines = {}
for mid, text, tr, typ in c.execute('select L_M_id, L_text, L_Translate, L_type from Lines order by L_M_id, L_prio, _id'):
    lines.setdefault(mid, []).append((text, tr, typ))

chapters = {k: {'title': v, 'parts': []} for k, v in CHAPTERS.items()}
count = 0
for mid, name, cat, typ, prio in rows:
    ch = chapters[cat]
    t = title_of(name)
    if typ == 2:
        ch['parts'].append({'title': t, 'items': []})
        continue
    if not ch['parts']:
        ch['parts'].append({'title': '', 'items': []})
    part = ch['parts'][-1]
    if cat == 1:
        n = SURAH[t.replace('سوره ', '').strip()]
        part['items'].append({'title': t, 'surah': n})
        continue
    if t in REF:
        part['items'].append({'title': t, 'ref': REF[t]})
        continue
    key = f'{mid:03d}'
    secs = []
    for text, tr, ltyp in lines.get(mid, []):
        if ltyp == 2:
            note = clean_fa(text)
            if note:
                secs.append({'note': note})
        else:
            ar = clean_ar(text)
            if not ar:
                continue
            s = {'ar': ar}
            f = clean_fa(tr) if tr and tr != '0' else ''
            if f:
                s['fa'] = f
            secs.append(s)
    if not secs:
        continue
    where = ' · '.join(x for x in [CHAPTERS[cat], part['title']] if x)
    doc = {'key': 'books/mafatih/' + key, 'title': t,
           'about': f'مفاتیح‌الجنان، {where}. ترجمه: استاد حسین انصاریان.',
           'sections': secs}
    if str(mid) in AUDIO:
        doc['audio'] = AUDIO[str(mid)]
    with open(os.path.join(OUT, key + '.json'), 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    item = {'key': key, 'title': t}
    if str(mid) in AUDIO:
        item['audio'] = 1
    part['items'].append(item)
    count += 1

index = {
    'key': 'mafatih', 'title': 'مفاتیح‌الجنان',
    'about': 'کلیات مفاتیح‌الجنان، تألیف محدث بزرگوار حاج شیخ عباس قمی (ره)، با متن عربی و ترجمه فارسی استاد حسین انصاریان.',
    'src': 'متن و ترجمه: erfan.ir (استاد حسین انصاریان)، از پایگاه داده github.com/kazemcodes/mafatih_db. صوت‌ها: shiavoice.com',
    'translations': [{'id': 'ansarian', 'name': 'حسین انصاریان', 'lang': 'fa'}],
    'chapters': [dict(chapters[k], parts=[p for p in chapters[k]['parts'] if p['items']]) for k in ORDER],
}
with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
print(count, 'texts')
