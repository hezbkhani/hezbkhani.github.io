// ساخت quran/search.json برای جستجوی متن آیه‌ها در قرآن آزاد (quran-free.js): یک فایل به‌جای ۱۲۰ فایل quran/p.
// اجرا (از ریشه مخزن): node tools/search/build.js — اگر quran/p یا تابع norm در quran-free.js عوض شد، دوباره اجرا شود.
// قالب: {v, ayahs: [[متن عربی یکسان‌شده با norm، ترجمه مکارم], ...]} به ترتیب سراسری آیه‌ها (۰ تا ۶۲۳۵).
// متن عربی همان‌جا با norm (بی‌اعراب) یکسان می‌شود، چون جستجو فقط همان را لازم دارد و فایل نصف می‌شود؛ ترجمه بی‌تغییر است.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
// همان تابع norm قرآن آزاد، از خود quran-free.js، تا جستجو با فایل ساخته‌شده دقیقاً مثل قبل بماند.
const src = fs.readFileSync(path.join(root, 'quran-free.js'), 'utf8');
const m = src.match(/const fa = '([^']+)'/), body = src.match(/const norm = (s => [\s\S]*?\.toLowerCase\(\));/);
if (!m || !body) throw Error('norm not found in quran-free.js');
const norm = new Function('fa', `return ${body[1]};`)(m[1]);
const ix = JSON.parse(fs.readFileSync(path.join(root, 'quran/index.json'), 'utf8'));
const ayahs = [];
ix.portion.forEach((_, i) => {
  const d = JSON.parse(fs.readFileSync(path.join(root, `quran/p/${String(i + 1).padStart(3, '0')}.json`), 'utf8'));
  d.segments.forEach(seg => seg.ayahs.forEach(([ar, tr], j) => {
    const g = ix.surah[seg.s - 1] + seg.from + j - 1;
    if (g !== ayahs.length) throw Error(`order ${g}`);
    ayahs.push([norm(ar), tr]);
  }));
});
if (ayahs.length !== ix.total) throw Error('count');
fs.writeFileSync(path.join(root, 'quran/search.json'), JSON.stringify({ v: 1, ayahs }));
console.error(ayahs.length, 'ayahs');
