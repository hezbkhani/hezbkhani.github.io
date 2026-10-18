# ساخت quran/intro/<سوره>.json (یک فایل برای هر سوره، تا با زدن «معرفی سوره» فقط همان چند کیلوبایت گرفته شود): معرفی کوتاه، فضیلت، مکی/مدنی، تعداد آیات و ترتیب نزول ۱۱۴ سوره.
# اجرا: python3 -I tools/intro/build_intro.py <پوشه_کش> [quran-data.js]
# منابع: محتوا و فضیلت از دانشنامه ویکی‌شیعه (fa.wikishia.net، از راه نسخه بایگانی web.archive.org)؛
# اگر صفحه ویکی‌شیعه در دسترس نبود، ویکی‌پدیای فارسی (fa.wikipedia.org، API). تعداد آیات و ترتیب نزول از
# Tanzil.net (tanzil.net/res/text/metadata/quran-data.js)؛ مکی/مدنی از جعبه اطلاعات ویکی‌شیعه، وگرنه Tanzil.
# صفحه‌های دریافت‌شده در پوشه کش می‌مانند و اجرای دوباره دیگر چیزی دانلود نمی‌کند.
import json, os, re, subprocess, sys, time, urllib.parse
from bs4 import BeautifulSoup

CACHE = sys.argv[1]
os.makedirs(CACHE, exist_ok=True)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'quran', 'intro')
UA = 'hezbkhani-intro-builder/1.0 (static Quran site; contact via github.com/hezbkhani)'

# نام صفحه در ویکی‌شیعه (و نام‌های جایگزین)؛ به ترتیب سوره‌ها.
NAMES = [
    'حمد|فاتحه', 'بقره', 'آل عمران|آل‌عمران', 'نساء', 'مائده', 'انعام', 'اعراف', 'انفال', 'توبه|برائت', 'یونس',
    'هود', 'یوسف', 'رعد', 'ابراهیم', 'حجر', 'نحل', 'اسراء|اسرا', 'کهف', 'مریم', 'طه',
    'انبیاء|انبیا', 'حج', 'مؤمنون|مومنون', 'نور', 'فرقان', 'شعراء|شعرا', 'نمل', 'قصص', 'عنکبوت', 'روم',
    'لقمان', 'سجده', 'احزاب', 'سبأ|سبا', 'فاطر', 'یس|یاسین', 'صافات', 'ص|صاد', 'زمر', 'غافر|مؤمن',
    'فصلت', 'شوری|شورا', 'زخرف', 'دخان', 'جاثیه', 'احقاف', 'محمد', 'فتح', 'حجرات', 'ق|قاف',
    'ذاریات', 'طور', 'نجم', 'قمر', 'الرحمن|رحمن', 'واقعه', 'حدید', 'مجادله', 'حشر', 'ممتحنه',
    'صف', 'جمعه', 'منافقون', 'تغابن', 'طلاق', 'تحریم', 'ملک|تبارک', 'قلم', 'حاقه', 'معارج',
    'نوح', 'جن', 'مزمل', 'مدثر', 'قیامت|قیامه', 'انسان|دهر|هل اتی', 'مرسلات', 'نبأ|نبا', 'نازعات', 'عبس',
    'تکویر', 'انفطار', 'مطففین', 'انشقاق', 'بروج', 'طارق', 'اعلی', 'غاشیه', 'فجر', 'بلد',
    'شمس', 'لیل', 'ضحی', 'انشراح|شرح', 'تین', 'علق', 'قدر', 'بینه|بیّنه', 'زلزله|زلزال', 'عادیات',
    'قارعه', 'تکاثر', 'عصر|والعصر', 'همزه', 'فیل', 'قریش', 'ماعون', 'کوثر', 'کافرون', 'نصر',
    'مسد|تبت', 'توحید|اخلاص', 'فلق', 'ناس',
]
assert len(NAMES) == 114

def curl(url, path, tries=6):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    for i in range(tries):
        r = subprocess.run(['curl', '-sS', '-L', '--max-time', '90', '-A', UA, '-o', path + '.part',
                            '-w', '%{http_code}', url], capture_output=True, text=True)
        code = r.stdout.strip()
        time.sleep(1)
        if r.returncode == 0 and code == '200':
            os.replace(path + '.part', path)
            return path
        if code == '404':
            break
        time.sleep(2 ** i)
    if os.path.exists(path + '.part'):
        os.remove(path + '.part')
    return None

# --- Tanzil ---
qd = sys.argv[2] if len(sys.argv) > 2 else curl('https://tanzil.net/res/text/metadata/quran-data.js',
                                                 os.path.join(CACHE, 'quran-data.js'))
src = open(qd, encoding='utf-8').read()
src = src[src.index('QuranData.Sura'):]
src = src[:src.index('];')]
TANZIL = []
for m in re.finditer(r"\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'[^']*',\s*\"[^\"]*\",\s*'[^']*',\s*'(\w+)'\]", src):
    TANZIL.append((int(m.group(2)), int(m.group(3)), 'مکی' if m.group(5) == 'Meccan' else 'مدنی'))
assert len(TANZIL) == 114, len(TANZIL)

# --- استخراج متن ---
DROP = ['sup', 'style', 'script', 'table', 'figure', 'math', 'noscript']
DROP_CLS = re.compile(r'mw-editsection|reference|noprint|toc|thumb|navbox|metadata|ambox|hatnote|'
                      r'infobox|mw-empty-elt|IPA|error|mbox|dablink|rellink|haudio')

def clean(t):
    t = t.replace('\u200f', '').replace('\u200e', '').replace('\xa0', ' ').replace('\u064a', 'ی').replace('\u0643', 'ک')
    t = re.sub(r'\[\s*(?:ویرایش|یادداشت|[\d۰-۹]+|[a-zA-Z]|[آ-ی]|یادداشت\s*[\d۰-۹]+|نیازمند منبع|پانویس)\s*\]', '', t)
    t = re.sub(r'\[\s*\]', '', t)
    t = re.sub(r'\[\s*[\u0600-\u06FF\u200c ]+\s*:\s*[\d۰-۹٠-٩\-–]+\s*\]', '', t)  # [ لقمان:14]
    t = re.sub(r'https?://\S+', '', t)
    t = re.sub(r'[ \t\r\n]+', ' ', t)
    t = re.sub(r' ([،؛.:!؟)»])', r'\1', t)
    t = re.sub(r'([(«]) ', r'\1', t)
    return t.strip()

def blocks(html):
    """[(h2 عنوان یا None, متن پاراگراف)] به ترتیب صفحه؛ هر دو پوسته ۲۰۲۳ و ۲۰۲۴."""
    soup = BeautifulSoup(html, 'lxml')
    roots = soup.select('.mw-parser-output')
    root = max(roots, key=lambda r: len(r.get_text())) if roots else soup
    for tag in root.find_all(DROP):
        tag.decompose()
    for tag in root.find_all(class_=DROP_CLS):
        tag.decompose()
    for tag in root.find_all(id=re.compile('^toc$')):
        tag.decompose()
    out, head = [], None
    for el in root.find_all(['h2', 'h3', 'p', 'ul', 'ol', 'blockquote', 'dl']):
        if el.find_parent(['p', 'ul', 'ol', 'blockquote', 'dl', 'li']):
            continue
        if el.name == 'h2':
            head = clean(el.get_text(' '))
            continue
        if el.name == 'h3':
            continue
        if el.name in ('ul', 'ol', 'dl'):
            items = [clean(li.get_text(' ')) for li in el.find_all(['li', 'dd'], recursive=False)]
            items = [i for i in items if i]
            if not items:
                continue
            text = '\n'.join('• ' + i for i in items)
        else:
            text = clean(el.get_text(' '))
        if text:
            out.append((head, text))
    return out

def place_from_infobox(html):
    m = re.search(r'مکی/مدنی</a>\s*</th>\s*<td[^>]*>\s*([^<]+?)\s*</td>', html) or \
        re.search(r'(?:محل نزول|مکی/مدنی|مکان نزول)\s*</th>\s*<td[^>]*>\s*(?:<a[^>]*>)?\s*([^<]+?)\s*<', html)
    if m:
        v = m.group(1)
        if 'مکی' in v and 'مدنی' not in v:
            return 'مکی'
        if 'مدنی' in v and 'مکی' not in v:
            return 'مدنی'
    return None

def limit(paras, max_chars=1200, max_paras=3):
    """حداکثر ۳ پاراگراف / ~۱۲۰۰ نویسه، بریده در پایان جمله. فهرست فقط پس از پاراگرافِ «...:» می‌آید."""
    res, total = [], 0
    for p in paras:
        if len(res) >= max_paras or total >= max_chars:
            break
        room = max_chars - total
        if p.startswith('• '):
            if not res or not (res[-1].endswith(':') or len(res[-1]) < 150):
                continue
            items, n = [], 0
            for it in p.split('\n'):
                if items and n + len(it) > room:
                    break
                items.append(it)
                n += len(it) + 1
            if len(items) < 2 and len(p.split('\n')) > 1:
                break
            p = '\n'.join(items)
        elif len(p) > room:
            cut = -1
            for m in re.finditer(r'[.!؟?](?=\s|$)', p[:room]):
                cut = m.end()
            if cut < 80:
                if res:
                    break
                m = re.search(r'[.!؟?](?=\s|$)', p)
                cut = m.end() if m else len(p)
            p = p[:cut].strip()
        res.append(p)
        total += len(p)
    while res and (res[-1].endswith(':') or len(res[-1]) < 80):  # «از جمله:» بی فهرستِ پس از آن
        res.pop()
    return '\n\n'.join(res)

def good(p):
    # پاراگراف‌های بی‌ارزش: آیه‌نگاری خالی، عنوان «تغییرمسیر»، شعر/نقل‌قول خیلی کوتاه
    return len(p) > 40 and not p.startswith('تغییرمسیر') and 'این مقاله' not in p[:40]

def section(bl, pred):
    return [t for h, t in bl if h and pred(h) and good(t)]

def is_content(h):
    return h.startswith('محتوا') or h.startswith('محتویات') or h in ('مضامین', 'مضمون', 'محتوای سوره') or \
        h.startswith('محتوای') or h.startswith('مضامین')

def is_virtue(h):
    return h.startswith('فضیلت') or h.startswith('فضائل') or h.startswith('فضایل') or h.startswith('ثواب') or \
        h.startswith('خواص')

def extract(html):
    bl = blocks(html)
    intro = [t for h, t in bl if h is None and good(t)]
    content = section(bl, is_content)
    about = limit(content)
    if len(about) < 250:  # محتوای خیلی کوتاه یا نبودِ بخش «محتوا»: از پاراگراف‌های آغازین/«معرفی» کمک می‌گیرد
        about = limit(intro + content) or limit(section(bl, lambda h: h.startswith('معرفی')))
    return about, limit(section(bl, is_virtue))

def wikishia(i):
    for name in NAMES[i].split('|'):
        title = 'سوره_' + name.replace(' ', '_')
        path = os.path.join(CACHE, 'ws_%03d_%s.html' % (i + 1, name.replace(' ', '_')))
        url = 'https://web.archive.org/web/2024id_/https://fa.wikishia.net/view/' + urllib.parse.quote(title)
        if curl(url, path):
            html = open(path, encoding='utf-8', errors='replace').read()
            if 'mw-parser-output' in html:
                return html
    return None

def wikipedia(i):
    for name in NAMES[i].split('|'):
        path = os.path.join(CACHE, 'wp_%03d_%s.json' % (i + 1, name.replace(' ', '_')))
        url = ('https://fa.wikipedia.org/w/api.php?action=parse&prop=text&format=json&redirects=1&page=' +
               urllib.parse.quote('سوره_' + name.replace(' ', '_')))
        if curl(url, path):
            try:
                return json.load(open(path, encoding='utf-8'))['parse']['text']['*']
            except (KeyError, ValueError):
                continue
    return None

surahs, used, log = [], {'ws': 0, 'wp': 0}, []
for i in range(114):
    ayat, order, place = TANZIL[i]
    about = virtue = ''
    html = wikishia(i)
    if html:
        about, virtue = extract(html)
        place = place_from_infobox(html) or place
    if html and about:
        used['ws'] += 1
    else:
        wp = wikipedia(i)
        if wp:
            a2, v2 = extract(wp)
            about = about or a2
            virtue = virtue or v2
        used['wp'] += 1
        log.append('%d: Wikipedia' % (i + 1))
    assert about, 'surah %d has no about' % (i + 1)
    e = {'place': place, 'ayat': ayat, 'order': order, 'about': about}
    if virtue:
        e['virtue'] = virtue
    surahs.append(e)
    print(i + 1, NAMES[i], place, len(about), len(virtue), file=sys.stderr)

credit = 'محتوا و فضیلت: دانشنامه ویکی‌شیعه (fa.wikishia.net)؛ ترتیب نزول و تعداد آیات: Tanzil.net'
if used['wp']:
    credit = ('محتوا و فضیلت: دانشنامه ویکی‌شیعه (fa.wikishia.net) و برای برخی سوره‌ها ویکی‌پدیای فارسی'
              '؛ ترتیب نزول و تعداد آیات: Tanzil.net')
os.makedirs(OUT, exist_ok=True)
for i, e in enumerate(surahs, 1):
    with open(os.path.join(OUT, f'{i}.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(src=credit, **e), f, ensure_ascii=False, separators=(',', ':'))
print('wikishia=%(ws)d fallback=%(wp)d' % used, *log, sep='\n', file=sys.stderr)
