# اذان و اقامه به روش شیعه برای بخش «بیشتر» منو (more.js): متن عربی، ترجمه فارسی، ترجمه‌های زبان‌های دیگر و صوت مؤذن‌های مختلف.
# خروجی: chelleh/azan.json (به قالب متن‌های chelleh، در همان خواننده باز می‌شود) و chelleh/tr/<زبان>-nooran/azan.json، و ثبت آن‌ها در chelleh/tr/index.json.
# اجرا از ریشه مخزن: python3 tools/azan/build.py
import json, os

# هر جمله: کلید، متن عربی، ترجمه به هر زبان
P = {
 'akbar': ('اللَّهُ أَكْبَرُ', {
  'fa': 'خدا بزرگ‌تر از آن است که وصف شود.', 'en': 'Allah is the Greatest.', 'fr': 'Allah est le plus Grand.',
  'de': 'Allah ist größer.', 'es': 'Allah es el más Grande.', 'tr': 'Allah en büyüktür.', 'ur': 'اللہ سب سے بڑا ہے۔',
  'hi': 'अल्लाह सबसे महान है।', 'id': 'Allah Maha Besar.', 'ru': 'Аллах превелик.'}),
 'tawhid': ('أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ', {
  'fa': 'گواهی می‌دهم که معبودی جز خدا نیست.', 'en': 'I bear witness that there is no god but Allah.',
  'fr': "J'atteste qu'il n'y a de divinité qu'Allah.", 'de': 'Ich bezeuge, dass es keinen Gott gibt außer Allah.',
  'es': 'Atestiguo que no hay divinidad sino Allah.', 'tr': "Şehadet ederim ki Allah'tan başka ilah yoktur.",
  'ur': 'میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں۔', 'hi': 'मैं गवाही देता हूँ कि अल्लाह के सिवा कोई पूज्य नहीं।',
  'id': 'Aku bersaksi bahwa tiada tuhan selain Allah.', 'ru': 'Свидетельствую, что нет божества, кроме Аллаха.'}),
 'nubuwwa': ('أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ', {
  'fa': 'گواهی می‌دهم که محمد فرستاده خداست.', 'en': 'I bear witness that Muhammad is the Messenger of Allah.',
  'fr': "J'atteste que Muhammad est le Messager d'Allah.", 'de': 'Ich bezeuge, dass Muhammad der Gesandte Allahs ist.',
  'es': 'Atestiguo que Muhammad es el Mensajero de Allah.', 'tr': "Şehadet ederim ki Muhammed Allah'ın Resulüdür.",
  'ur': 'میں گواہی دیتا ہوں کہ محمد اللہ کے رسول ہیں۔', 'hi': 'मैं गवाही देता हूँ कि मुहम्मद अल्लाह के रसूल हैं।',
  'id': 'Aku bersaksi bahwa Muhammad adalah utusan Allah.', 'ru': 'Свидетельствую, что Мухаммад — посланник Аллаха.'}),
 'wilaya': ('أَشْهَدُ أَنَّ عَلِيًّا وَلِيُّ اللَّهِ', {
  'fa': 'گواهی می‌دهم که علی ولیّ خداست.', 'en': 'I bear witness that Ali is the Wali (guardian) of Allah.',
  'fr': "J'atteste qu'Ali est le Walî (le guide) d'Allah.", 'de': 'Ich bezeuge, dass Ali der Wali (Statthalter) Allahs ist.',
  'es': 'Atestiguo que Ali es el Wali (protector) de Allah.', 'tr': "Şehadet ederim ki Ali Allah'ın velisidir.",
  'ur': 'میں گواہی دیتا ہوں کہ علی اللہ کے ولی ہیں۔', 'hi': 'मैं गवाही देता हूँ कि अली अल्लाह के वली हैं।',
  'id': 'Aku bersaksi bahwa Ali adalah wali Allah.', 'ru': 'Свидетельствую, что Али — вали (покровитель) Аллаха.'}),
 'salat': ('حَيَّ عَلَى الصَّلَاةِ', {
  'fa': 'بشتابید به سوی نماز.', 'en': 'Hasten to prayer.', 'fr': 'Venez à la prière.', 'de': 'Eilt zum Gebet.',
  'es': 'Venid a la oración.', 'tr': 'Haydi namaza.', 'ur': 'نماز کی طرف آؤ۔', 'hi': 'नमाज़ की ओर आओ।',
  'id': 'Marilah menunaikan salat.', 'ru': 'Спешите на молитву.'}),
 'falah': ('حَيَّ عَلَى الْفَلَاحِ', {
  'fa': 'بشتابید به سوی رستگاری.', 'en': 'Hasten to success.', 'fr': 'Venez à la réussite.', 'de': 'Eilt zum Erfolg.',
  'es': 'Venid a la salvación.', 'tr': 'Haydi kurtuluşa.', 'ur': 'فلاح کی طرف آؤ۔', 'hi': 'सफलता की ओर आओ।',
  'id': 'Marilah menuju kemenangan.', 'ru': 'Спешите к спасению.'}),
 'khayr': ('حَيَّ عَلَى خَيْرِ الْعَمَلِ', {
  'fa': 'بشتابید به سوی بهترین کار.', 'en': 'Hasten to the best of deeds.', 'fr': 'Venez à la meilleure des œuvres.',
  'de': 'Eilt zur besten Tat.', 'es': 'Venid a la mejor de las obras.', 'tr': 'Haydi amellerin en hayırlısına.',
  'ur': 'بہترین عمل کی طرف آؤ۔', 'hi': 'सबसे अच्छे कर्म की ओर आओ।', 'id': 'Marilah menuju sebaik-baik amal.',
  'ru': 'Спешите к наилучшему из деяний.'}),
 'qamat': ('قَدْ قَامَتِ الصَّلَاةُ', {
  'fa': 'به‌راستی نماز برپا شد.', 'en': 'The prayer has begun.', 'fr': 'La prière est établie.',
  'de': 'Das Gebet hat begonnen.', 'es': 'La oración ha comenzado.', 'tr': 'Namaz başlamıştır.',
  'ur': 'نماز قائم ہو گئی۔', 'hi': 'नमाज़ क़ायम हो गई।', 'id': 'Sungguh salat telah didirikan.', 'ru': 'Молитва уже начинается.'}),
 'tahlil': ('لَا إِلَٰهَ إِلَّا اللَّهُ', {
  'fa': 'معبودی جز خدا نیست.', 'en': 'There is no god but Allah.', 'fr': "Il n'y a de divinité qu'Allah.",
  'de': 'Es gibt keinen Gott außer Allah.', 'es': 'No hay divinidad sino Allah.', 'tr': "Allah'tan başka ilah yoktur.",
  'ur': 'اللہ کے سوا کوئی معبود نہیں۔', 'hi': 'अल्लाह के सिवा कोई पूज्य नहीं।', 'id': 'Tiada tuhan selain Allah.',
  'ru': 'Нет божества, кроме Аллаха.'}),
}
TIMES = {1: 'یک بار', 2: 'دو بار', 4: 'چهار بار'}
WILAYA = 'دو بار. شهادت به ولایت امیرالمؤمنین (ع) جزء اذان و اقامه نیست، ولی گفتن آن به قصد تبرّک نیکوست و شعار شیعه است.'
AZAN = [('akbar', 4), ('tawhid', 2), ('nubuwwa', 2), ('wilaya', 2), ('salat', 2), ('falah', 2), ('khayr', 2), ('akbar', 2), ('tahlil', 2)]
IQAMA = [('akbar', 2), ('tawhid', 2), ('nubuwwa', 2), ('wilaya', 2), ('salat', 2), ('falah', 2), ('khayr', 2), ('qamat', 2), ('akbar', 2), ('tahlil', 1)]

# صوت: اذان مؤذن‌های مختلف از shiavoice.com (همان منبع صوت دعاهای دیگر سایت؛ بخش «الأذان»)
AUDIO = [
 ('مؤذن‌زاده اردبیلی', 'c2dx4'), ('مؤذن‌زاده (اجرای دیگر)', 'j7q3b'), ('حسین صبحدل', 'qz547'), ('حاج کاظم‌زاده', 'z99a7'),
 ('حاج آقایی', 'm3nra'), ('حاج میردامات', '7rmtc'), ('حسن رضائیان', '7zqg3'), ('روحانی‌نژاد', 'q4xmh'), ('کریم منصوری', 'vO39O'),
 ('علی فانی', 'Rg5G7'), ('نزار القطری', 'EhBAk'), ('اباذر الحلواجی', '0wonG'), ('جلیل الکربلائی', 'UKMYP'),
]

def sections(lang=None):
    out = []
    for head, lines in (('اذان', AZAN), ('اقامه', IQAMA)):
        out.append({'h': head} if lang is None else '')
        for k, n in lines:
            ar, tr = P[k]
            out.append({'note': WILAYA if k == 'wilaya' else TIMES[n], 'ar': ar, 'fa': tr['fa']} if lang is None else tr[lang])
    return out

text = {
    'key': 'azan', 'title': 'اذان و اقامه', 'bism': False, 'end': False,
    'about': 'اذان و اقامه به روش شیعه، با صوت مؤذن‌های مختلف. مؤذن را از فهرست «صوت» پایین صفحه انتخاب کنید و زبان ترجمه را از دکمه ⚙ بالای صفحه. صوت‌ها از shiavoice.com.',
    'sections': sections(),
    'audio': [{'name': n, 'url': f'https://shiavoice.com/stream-{u}'} for n, u in AUDIO],
}
with open('chelleh/azan.json', 'w', encoding='utf-8') as f:
    json.dump(text, f, ensure_ascii=False, indent=1); f.write('\n')

LANGS = ['en', 'fr', 'de', 'es', 'tr', 'ur', 'hi', 'id', 'ru']
for l in LANGS:
    os.makedirs(f'chelleh/tr/{l}-nooran', exist_ok=True)
    t = sections(l)
    with open(f'chelleh/tr/{l}-nooran/azan.json', 'w', encoding='utf-8') as f:
        f.write(json.dumps({'n': len(t), 't': t}, ensure_ascii=False) + '\n')

# فهرست مترجم‌ها: یک ردیف «ترجمه سایت نوران» برای هر زبان؛ ردیف‌های دیگر دست نمی‌خورند.
idx_path = 'chelleh/tr/index.json'
idx = [x for x in json.load(open(idx_path, encoding='utf-8')) if not x['id'].endswith('-nooran')]
idx += [{'id': f'{l}-nooran', 'lang': l, 'name': 'ترجمه سایت نوران', 'src': '', 'texts': ['azan']} for l in LANGS]
with open(idx_path, 'w', encoding='utf-8') as f:
    f.write('[\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in idx) + '\n]\n')
