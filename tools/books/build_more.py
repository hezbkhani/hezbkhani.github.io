# ساخت سه کتاب دسته «بیشتر»: منتهی‌الآمال، گزیده غررالحکم و رساله حقوق، در books/<کتاب>/ به همان قالب صحیفه (books.js).
# اجرا: python3 tools/books/build_more.py <muntaha_al_amal.json> <ghurar_gozide.json> <risalat_al_huquq.json>
# منبع‌ها:
# - منتهی‌الآمال (شیخ عباس قمی)، تصحیح صادق حسن‌زاده، نسخه Word در archive.org/details/Montahi2؛ سرفصل‌های Word به
#   باب (هر معصوم یک بخش)، فصل (هر فصل یک متن) و زیرعنوان برگردانده شده و پاورقی‌ها کنار گذاشته شده‌اند. متن نثر فارسی است:
#   هر بند {p} و هر زیرعنوان {h}.
# - گزیده غررالحکم (متن عربی و ترجمه فارسی)، از hadithlib.com (پایگاه کتابخانه احادیث شیعه، دارالحدیث)؛ هر حرف یک متن.
# - رساله حقوق امام سجاد (ع)، روایت تحف‌العقول (۵۰ حق)، متن عربی و ترجمه فارسی از دانشنامه ویکی‌شیعه.
import json, os, re, sys

MAX = 160_000  # بیشینه اندازه هر متن (بایت)
# نام کوتاه پنجاه حق، به ترتیب رساله (برای فهرست)
HUQUQ = 'خدا|خودت|زبان|گوش|چشم|پاها|دست|شکم|دامن|نماز|روزه|صدقه|قربانی|زمامدار|استاد|مالک|زیردستان در حکومت|شاگرد|همسر|زیردست مملوک|مادر|پدر|فرزند|برادر|آزادکننده|آزادشده|نیکوکار|مؤذن|پیشنماز|همنشین|همسایه|رفیق|شریک|مال|طلبکار|معاشر|مدعی تو|کسی که بر او ادعا داری|مشورت‌خواه|مشاور|نصیحت‌خواه|نصیحت‌گر|بزرگ‌تر|کوچک‌تر|سائل|کسی که از او چیزی خواسته شود|کسی که تو را شاد کرده|کسی که به تو بدی کرده|هم‌کیشان|اهل ذمه'.split('|')
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'books')
fa = lambda n: str(n).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
# «الا» جداشده از واژه در نسخه Word (الا مر ← الامر)؛ فقط واژه‌هایی که بی‌تردید یک کلمه‌اند.
ALA = 'مر|مام|زهار|سلام|ن|ول|ولى|ولی|خر|خرة|خره|صغر|عرج|ماره|نوار|بصار|سود|عمال|نبياء|نبیاء|ولين|ولین|ئمه|ئمة|مين|مین|حكام|حکام|صحاب|شراف|نصار|كبر|کبر|عظم|خبار|سماء|حزاب|رض|ثير|ثیر|خلاق|مان|ميرى|میری|علی|على|سرار|حمر|بيض|بیض|سد|مة|مه'

def fa_text(t):
    t = t.replace('‍', '').replace('ي', 'ی').replace('ى', 'ی').replace('ك', 'ک')
    t = re.sub(r'ال ا(?=\S)', 'الا', t)
    t = re.sub(r'(?<!\S)(\S*)الا (' + ALA + r')(?=[\s،.:؛)»]|$)', r'\1الا\2', t)
    t = re.sub(r'\s*\([\d۰-۹]{1,4}\)', '', t)  # شماره پاورقی‌ها (خود پاورقی‌ها آورده نشده)
    t = t.replace('لؤ ی', 'لؤی').replace('م الک', 'مالک')
    t = re.sub(r'ـ{2,}', 'ـ', t)
    t = re.sub(r'(?<=\S)ـ+(?=\S)', '', t)  # کشیده درون واژه
    return re.sub(r'[ \t]+', ' ', t).strip()

def write(path, doc):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))

NAMES = ['حضرت محمد (ص)', 'حضرت فاطمه زهرا (س)', 'امام علی (ع)', 'امام حسن مجتبی (ع)', 'امام حسین (ع)', 'امام سجاد (ع)', 'امام محمد باقر (ع)',
         'امام جعفر صادق (ع)', 'امام موسی کاظم (ع)', 'امام رضا (ع)', 'امام محمد تقی (ع)', 'امام علی نقی (ع)', 'امام حسن عسکری (ع)', 'امام مهدی (عج)']

def muntaha(src):
    out = os.path.join(ROOT, 'muntaha')
    data = json.load(open(src, encoding='utf-8'))
    parts = []
    for bi, bab in enumerate(data, 1):
        title = fa_text(bab['bab'])
        m = re.match(r'باب\s*\S+?\s*[:：]?\s*(?:در\s*)?(.*)', title)
        pid = f'b{bi:02d}'
        items, cur, n = [], None, 0
        def flush():
            nonlocal cur
            if cur and any(s.get('p') for s in cur['sections']):
                items.append(cur)
            cur = None
        for s in bab['sections']:
            t = fa_text(s['title'])
            if t.startswith('پاورق'):
                flush(); break  # پاورقی‌ها، آخر هر باب
            paras = [fa_text(p) for p in s['paras'] if fa_text(p)]
            if s['level'] <= 2 or cur is None:
                flush()
                cur = {'title': t.strip('()') or title, 'sections': []}
            elif t:
                cur['sections'].append({'h': t})
            cur['sections'] += [{'p': p} for p in paras]
        flush()
        # فصل‌های بلند (مثل وقایع کربلا) در مرز زیرعنوان‌ها به چند متن تقسیم می‌شوند تا هر فایل زود باز شود.
        split = []
        for it in items:
            if len(json.dumps(it, ensure_ascii=False).encode()) <= MAX:
                split.append(it); continue
            chunks, cur, size = [], [], 0
            for x in it['sections']:
                n = len(json.dumps(x, ensure_ascii=False).encode())
                if cur and (size + n > MAX * 0.7 and 'h' in x or size + n > MAX):
                    chunks.append(cur); cur, size = [], 0
                cur.append(x); size += n
            chunks.append(cur)
            for k, c in enumerate(chunks, 1):
                split.append({'title': it['title'] + (f' ({fa(k)})' if len(chunks) > 1 else ''), 'sections': c})
        items = split
        for i, it in enumerate(items, 1):
            write(os.path.join(out, pid, f'{i:03d}.json'), {'title': it['title'], 'bism': False, 'sections': it['sections']})
        short = re.sub(r'^باب\s*\S+\s*[:：]?\s*', '', title)
        parts.append({'id': pid, 'title': f'باب {fa(bi)}: {NAMES[bi - 1]}', 'one': 'بخش', 'items': [[i, it['title']] for i, it in enumerate(items, 1)]})
    write(os.path.join(out, 'index.json'), {
        'key': 'muntaha', 'title': 'منتهی‌الآمال',
        'about': 'تاریخ زندگانی پیامبر اکرم (ص)، حضرت فاطمه (س) و دوازده امام (ع)، نوشته محدث قمی (ره)، نویسنده مفاتیح‌الجنان؛ هر باب یکی از چهارده معصوم.',
        'src': 'منتهی‌الآمال، شیخ عباس قمی، تصحیح صادق حسن‌زاده (انتشارات مؤمنین)، از نسخه دیجیتال archive.org/details/Montahi2. پاورقی‌ها آورده نشده است.',
        'translations': [], 'parts': parts})
    return sum(len(p['items']) for p in parts)

def ghurar(src):
    out = os.path.join(ROOT, 'ghurar')
    data = [c for c in json.load(open(src, encoding='utf-8')) if c['items']]
    items = []
    for i, c in enumerate(data, 1):
        secs = []
        for h in c['items']:
            ar = re.sub(r'\s*؛\s*\d+\s*$', '', h['arabic']).strip()
            secs.append({'ar': ar, 'tr': {'dh': fa_text(h['persian']).replace(' .', '.').replace(' ،', '،')}, 'note': f'غررالحکم، ح {fa(h["ref_no"])}' if h.get('ref_no') else None})
        for s in secs:
            if not s['note']: s.pop('note')
        title = fa_text(c['chapter'])
        write(os.path.join(out, 'h', f'{i:03d}.json'), {'title': title, 'bism': False, 'about': 'سخنان امیرالمؤمنین علی (ع)', 'sections': secs})
        items.append([i, f'{title} ({fa(len(secs))} حدیث)'])
    write(os.path.join(out, 'index.json'), {
        'key': 'ghurar', 'title': 'غررالحکم (گزیده)',
        'about': 'گزیده‌ای از ۶۰۰ سخن کوتاه امیرالمؤمنین علی (ع) از کتاب غررالحکم و دررالکلم آمدی، به ترتیب حروف، با ترجمه فارسی.',
        'src': 'گزیده غررالحکم، متن و ترجمه از پایگاه کتابخانه احادیث شیعه (hadithlib.com، دارالحدیث). شماره هر حدیث، شماره آن در غررالحکم است.',
        'translations': [{'id': 'dh', 'name': 'دارالحدیث', 'lang': 'fa'}],
        'parts': [{'id': 'h', 'title': 'حروف', 'one': 'بخش', 'items': items}]})
    return sum(len(c['items']) for c in data)

def huquq(src):
    out = os.path.join(ROOT, 'huquq')
    d = json.load(open(src, encoding='utf-8'))
    items = [{'title': 'آغاز رساله', 'sections': [{'ar': d['intro']['arabic'], 'tr': {'ws': fa_text(d['intro']['persian'])}}]}]
    for r in d['rights']:
        items.append({'title': f'حق {HUQUQ[r["n"] - 1]}', 'sections': [{'ar': r['arabic'], 'tr': {'ws': fa_text(r['persian'])}}]})
    for i, it in enumerate(items, 1):
        write(os.path.join(out, 'h', f'{i:03d}.json'), {'title': it['title'], 'bism': i == 1, 'sections': it['sections']})
    write(os.path.join(out, 'index.json'), {
        'key': 'huquq', 'title': 'رساله حقوق',
        'about': 'رساله حقوق امام سجاد (ع): پنجاه حق خدا، اعضای بدن، عبادت‌ها و مردم بر انسان، به روایت تحف‌العقول.',
        'src': 'متن عربی و ترجمه فارسی: دانشنامه ویکی‌شیعه (fa.wikishia.net، مقاله «رسالة الحقوق»)، روایت تحف‌العقول.',
        'translations': [{'id': 'ws', 'name': 'ویکی‌شیعه', 'lang': 'fa'}],
        'parts': [{'id': 'h', 'title': 'حقوق', 'one': '', 'plain': True, 'items': [[i, it['title']] for i, it in enumerate(items, 1)]}]})
    return len(items)

print('muntaha', muntaha(sys.argv[1]), 'texts; ghurar', ghurar(sys.argv[2]), 'hadith; huquq', huquq(sys.argv[3]), 'texts')
