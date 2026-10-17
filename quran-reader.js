// خواندن متن قرآنِ سهم روزانه (عربی + ترجمه فارسی).
// برای اینکه دوباره فقط در نمای مدیر (آدرس با ‎#admin‎) نمایش داده شود، PREVIEW_ONLY را true کنید.
// متن عربی: مصحف مجمع ملک فهد (روایت حفص، رسم عثمان طه) با فونت KFGQPC Uthmanic Hafs.
// ترجمه: آیت‌الله ناصر مکارم شیرازی، از Tanzil.net. داده‌ها در پوشه quran/p هستند (یک فایل برای هر سهم).
(function () {
  const PREVIEW_ONLY = false;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  // پخش صوت (قاری و ترجمه گویا) و انتخاب ترجمه؛ برای اینکه دوباره فقط در ‎#admin‎ باشد، EXTRAS_PREVIEW_ONLY را true کنید.
  const EXTRAS_PREVIEW_ONLY = false;
  const extras = () => !EXTRAS_PREVIEW_ONLY || location.hash === '#admin';
  // ترجمه‌های فارسی Tanzil.net؛ متن مکارم داخل quran/p است و بقیه در quran/t/<id>/NNN.json.
  const TRANSLATIONS = [
    ['makarem', 'مکارم شیرازی'], ['ansarian', 'انصاریان'], ['fooladvand', 'فولادوند'], ['ghomshei', 'الهی قمشه‌ای'],
    ['gharaati', 'قرائتی'], ['khorramshahi', 'خرمشاهی'], ['ayati', 'آیتی'], ['bahrampour', 'بهرام‌پور'],
    ['mojtabavi', 'مجتبوی'], ['safavi', 'صفوی'], ['sadeqi', 'صادقی تهرانی'], ['khorramdel', 'خرمدل'], ['moezzi', 'معزی'], ['riaei', 'ریاعی']
  ];
  // تفسیر هر آیه: متن تفسیر نمونه مجوز انتشار آزاد ندارد، پس دکمه «تفسیر» همان آیه را در سایت رسمی quran.makarem.ir باز می‌کند.
  const tafsirUrl = (s, n) => `https://quran.makarem.ir/fa/interpretation?sura=${s}&verse=${n}`;
  // فایل صوتی هر آیه از چند سرور: everyayah.com، verses.quran.com، cdn.islamic.network (alquran.cloud)
  // و آینه quranicaudio. اگر یکی جواب نداد یا کند بود سراغ بعدی می‌رود.
  // نسخه‌های ۶۴ کیلوبیتی تا جای ممکن، تا با اینترنت کند هم زود شروع شود.
  // [کلید، نام، پوشه everyayah، نسخه alquran.cloud، مسیر verses.quran.com]
  const RECITERS = [
    ['abdulbasit', 'عبدالباسط (ترتیل)', 'Abdul_Basit_Murattal_64kbps', 'ar.abdulsamad', 'AbdulBaset/Murattal'],
    ['abdulbasit_mj', 'عبدالباسط (تحقیق)', 'Abdul_Basit_Mujawwad_128kbps', '', 'AbdulBaset/Mujawwad'],
    ['minshawi', 'منشاوی (ترتیل)', 'Minshawy_Murattal_128kbps', 'ar.minshawi', 'Minshawi/Murattal'],
    ['minshawi_mj', 'منشاوی (تحقیق)', 'Minshawy_Mujawwad_64kbps', 'ar.minshawimujawwad', 'Minshawi/Mujawwad'],
    ['husary', 'محمود خلیل الحصری', 'Husary_64kbps', 'ar.husary'],
    ['parhizgar', 'شهریار پرهیزگار', 'Parhizgar_48kbps', ''],
    ['mansoori', 'کریم منصوری', 'Karim_Mansoori_40kbps', ''],
    ['alafasy', 'مشاری العفاسی', 'Alafasy_64kbps', 'ar.alafasy', 'Alafasy'],
    ['sudais', 'عبدالرحمن السدیس', 'Abdurrahmaan_As-Sudais_64kbps', 'ar.abdurrahmaansudais', 'Sudais'],
    ['muaiqly', 'ماهر المعیقلی', 'Maher_AlMuaiqly_64kbps', 'ar.mahermuaiqly'],
    ['ghamadi', 'سعد الغامدی', 'Ghamadi_40kbps', '']
  ];
  const VOICES = [
    ['hedayatfar', 'فولادوند، صدای هدایت‌فر', 'translations/Fooladvand_Hedayatfar_40Kbps'],
    ['kabiri', 'مکارم، صدای کبیری', 'translations/Makarem_Kabiri_16Kbps']
  ];
  // ترجمه مسعود ریاعی با صدای بهروز رضوی، از قرآن مهر (موسسه پیامبر مهر و رحمت)؛ ناشر استفاده «عیناً و بدون تغییر و با ذکر منبع» را آزاد گذاشته است.
  // هر فایل صوتی یک سوره کامل است (quranmehr.ir/files/subtitle/<شماره>-<نام>.mp3، نام‌ها از QuranData.Sura سایت قرآن مهر)
  // و زمان شروع و پایان هر آیه در quran/razavi.json است، پس هر آیه جدا از وسط همان فایل پخش می‌شود.
  const RAZAVI_NAMES = 'Fatiha,Baqarah,AalImran,Nisa,Maidah,Anam,Araf,Anfal,Tawbah,Yunus,Hud,Yusuf,Rad,Ibrahim,Hijr,Nahl,Isra,Kahf,Maryam,Taha,Anbiya,Hajj,Muminun,Nur,Furqan,Shuara,Naml,Qasas,Ankabut,Rum,Luqman,Sajdah,Ahzab,Saba,Fatir,YaaSin,Saffat,Saad,Zumar,Ghafir,Fussilat,Shura,Zukhruf,Dukhan,Jathiyah,Ahqaf,Muhammad,Fath,Hujurat,Qaf,Dhariyat,Tur,Najm,Qamar,Rahman,Waqiah,Hadid,Mujadilah,Hashr,Mumtahinah,Saff,Jumuah,Munafiqun,Taghabun,Talaq,Tahrim,Mulk,Qalam,Haqqah,Maarij,Nuh,Jinn,Muzammil,Mudathir,Qiyamah,Insan,Mursalat,Naba,Naziat,Abasa,Takwir,Infitar,Mutaffifin,Inshiqaq,Buruj,Tariq,Alaa,Ghashiyah,Fajr,Balad,Shams,Layl,Dhuha,Sharh,Tin,Alaq,Qadr,Baiyinah,Zalzalah,Adiyat,Qariah,Takathur,Asr,Humazah,Fil,Quraysh,Maaun,Kauthar,Kafirun,Nasr,Masad,Ikhlas,Falaq,Nas'.split(',');
  VOICES.push(['razavi', 'ریاعی، صدای بهروز رضوی', '', s => `https://quranmehr.ir/files/subtitle/${s}-${RAZAVI_NAMES[s - 1]}.mp3`]);
  let razaviTimes = null;
  const loadRazavi = () => razaviTimes || (razaviTimes = fetch('quran/razavi.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { razaviTimes = null; throw e; }));
  const SURAH_AYAHS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  const SURAH_START = SURAH_AYAHS.reduce((a, n, i) => (a.push(i ? a[i - 1] + SURAH_AYAHS[i - 1] : 0), a), []);
  const pad3 = n => String(n).padStart(3, '0');
  const fa = '۰۱۲۳۴۵۶۷۸۹', arD = '٠١٢٣٤٥٦٧٨٩';
  const toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const toAr = x => String(x).replace(/\d/g, d => arD[d]);
  const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
  const KEY = 'quranReader';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }
  };
  const prefs = Object.assign({ size: 27, trans: true, night: false, tr: 'makarem', tafsir: true, reciter: 'abdulbasit', voice: 'hedayatfar', mode: 'ar' }, store.get());
  const save = () => store.set(prefs);

  const css = `
@font-face{font-family:QuranHafs;src:url('quran/uthmanic-hafs.woff2') format('woff2');font-display:block}
.qr-open{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:12px;height:52px;background:var(--deep);border:1px solid var(--gold);font-size:17px}
.qr-open svg{width:22px;height:22px;flex:none}
body.qr-lock{overflow:hidden}
.qr{--bg:#fbf6ea;--card:#fffdf7;--text:#1f1a14;--tr:#4b4036;--muted:#7a6d60;--line:#e6d9bd;--accent:#0b6b50;--gold:#c79a45;
  position:fixed;inset:0;z-index:50;background:var(--bg);color:var(--text);text-shadow:none;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:none}
.qr.night{--bg:#14110d;--card:#1c1813;--text:#efe6d6;--tr:#c9bba7;--muted:#9b8e7c;--line:#3a3127;--accent:#5fc3a0;--gold:#b98f45}
.qr.show{display:block}
.qr-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;padding:8px 10px;padding-top:max(8px,env(safe-area-inset-top));background:var(--accent);color:#fff;box-shadow:0 2px 10px #0003}
.qr.night .qr-bar{background:#0f2a22}
.qr-bar button{flex:none;height:42px;min-width:42px;padding:0 10px;background:transparent;border:0;color:#fff;font-size:22px;line-height:1}
.qr-bar button:hover{background:#ffffff1f}
.qr-title{flex:1;min-width:0;text-align:center;line-height:1.35}
.qr-title b{display:block;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qr-title small{font-size:12.5px;opacity:.85}
.qr-progress{position:absolute;bottom:0;right:0;height:3px;width:0;background:var(--gold);transition:width .1s}
.qr-menu{position:sticky;top:58px;z-index:2;margin:0 auto;max-width:760px;display:none;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);box-shadow:0 8px 20px #0002}
.qr-menu.show{display:grid;gap:12px}
.qr-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:15.5px}
.qr-row .ctl{display:flex;gap:6px}
.qr-row .ctl button,.qr-chip{height:40px;min-width:44px;padding:0 12px;background:transparent;color:var(--text);border:1px solid var(--line);font-size:15px;font-weight:600}
.qr-row .ctl .qr-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.qr-body{max-width:760px;margin:0 auto;padding:6px 14px calc(40px + env(safe-area-inset-bottom))}
.qr-sura{margin:22px 0 6px;padding:12px 10px 8px;text-align:center;border:1px solid var(--gold);outline:3px double var(--gold);outline-offset:3px;background:var(--card)}
.qr-sura h3{margin:0;font:normal 30px/1.6 QuranHafs,serif;color:var(--accent)}
.qr-sura small{display:block;font-size:13px;color:var(--muted)}
.qr-bism{margin:16px 0 4px;text-align:center;font:normal calc(var(--qs)*1.05)/2 QuranHafs,serif}
.qr-ayah{padding:14px 2px;border-bottom:1px solid var(--line)}
.qr-ayah:last-child{border-bottom:0}
.qr-ar{margin:0;font:normal var(--qs)/2.15 QuranHafs,serif;text-align:right;word-spacing:1px}
.qr-num{color:var(--accent);white-space:nowrap}
.qr-fa{margin:8px 0 0;font-size:max(15px,calc(var(--qs)*.6));line-height:2;color:var(--tr);text-align:justify}
.qr-fa i{font-style:normal;color:var(--muted);font-size:.85em;margin-left:4px}
.qr-tf{display:inline-block;margin-right:6px;padding:0 8px;border:1px solid var(--line);color:var(--accent);font-size:.8em;line-height:1.9;text-decoration:none;white-space:nowrap}
.qr-tf:hover{background:var(--line)}
.qr.notf .qr-tf{display:none}
.qr.flow .qr-fa{display:none}
.qr.flow .qr-seg{padding:10px 2px;font:normal var(--qs)/2.2 QuranHafs,serif;text-align:justify}
.qr.flow .qr-ayah{display:inline;padding:0;border:0}
.qr.flow .qr-ar{display:inline}
.qr-end{margin:26px 0 10px;padding:18px 16px;text-align:center;background:var(--card);border:1px solid var(--line)}
.qr-end p{margin:0 0 12px;font-size:16px}
.qr-end button{width:100%;max-width:340px;height:50px;background:var(--accent);border:0;color:#fff}
.qr-src{margin:18px 0 0;font-size:12.5px;line-height:1.8;color:var(--muted);text-align:center}
.qr-state{padding:60px 16px;text-align:center;color:var(--muted)}
.qr.night .qr-end button,.qr.night .qr-row .ctl .qr-chip.on{color:#10201a}
.qr-bar .qr-set{font:600 15px Vazirmatn,sans-serif;padding:0 12px;border:1px solid #ffffff66}
.qr-apply{height:46px;margin-top:4px;background:var(--accent);color:#fff;border:0;font:600 16px Vazirmatn,sans-serif}
.qr.night .qr-apply{color:#10201a}
.qr-x{display:none}
.qr.x .qr-x{display:flex}
.qr-xi{display:none}
.qr.x .qr-xi{display:inline}
.qr-row select{flex:1;min-width:0;max-width:62%;height:40px;padding:0 8px;font:inherit;font-size:15px;color:var(--text);background:var(--bg);border:1px solid var(--line)}
.qr-sec{font-size:13px;font-weight:700;color:var(--accent);border-top:1px solid var(--line);padding-top:10px}
.qr-ayah.playing{background:rgba(199,154,69,.16);box-shadow:inset -3px 0 0 var(--gold)}
.qr.flow .qr-ayah.playing .qr-ar{background:rgba(199,154,69,.22)}
.qr-num{cursor:pointer}
.qr-player{position:sticky;bottom:0;z-index:2;display:none;align-items:center;gap:6px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:var(--card);border-top:1px solid var(--line);box-shadow:0 -4px 16px #0002}
.qr.x .qr-player{display:flex}
.qr-player button{flex:none;width:44px;height:44px;padding:0;border:0;background:transparent;color:var(--accent);font-size:20px}
.qr-player .qr-play{width:52px;height:52px;border-radius:50%;background:var(--accent);color:#fff;font-size:22px}
.qr.night .qr-player .qr-play{color:#10201a}
.qr-player .qr-now{flex:1;min-width:0;font-size:13.5px;line-height:1.5;color:var(--muted)}
.qr-player .qr-now b{display:block;font-size:14.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qr-state button{margin-top:12px;height:44px;background:var(--accent);color:#fff;border:0}
.qr-pnav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 4px}
.qr-pnav button{flex:1 1 0;max-width:180px;height:44px;padding:0 10px;background:var(--card);color:var(--accent);border:1px solid var(--line);font:600 15px Vazirmatn,sans-serif}
.qr-pnav button:hover{background:var(--line)}
.qr-pnav .qr-pmenu{flex:0 1 auto}
.qr-pnav span{flex:1 1 0;max-width:180px}
.qr-end .qr-pnav{margin:4px 0 12px}
.qr-end .qr-pnav button{width:auto;height:46px;background:var(--accent);color:#fff;border:0}
.qr-end .qr-pnav .qr-pmenu{background:transparent;color:var(--accent);border:1px solid var(--line)}
.qr.night .qr-end .qr-pnav button:not(.qr-pmenu){color:#10201a}
.qr-note{margin:0 0 12px!important;font-size:14px!important;line-height:1.9;color:var(--muted)}
.qr-ayah.focus{animation:qrfocus 2.4s ease}
@keyframes qrfocus{0%,40%{background:rgba(199,154,69,.28)}}
@media(min-width:700px){.qr-body{padding-left:24px;padding-right:24px}}
`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const el = document.createElement('div');
  el.className = 'qr';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'متن قرآن سهم امروز');
  el.innerHTML = `
<div class="qr-bar"><button type="button" data-a="close" aria-label="بستن">✕</button>
<div class="qr-title"><b id="qrTitle"></b><small id="qrSub"></small></div>
<button type="button" class="qr-set" data-a="menu" aria-expanded="false">تنظیمات</button>
<div class="qr-progress" id="qrProgress"></div></div>
<div class="qr-menu" id="qrMenu">
<div class="qr-row"><span>اندازه متن</span><span class="ctl"><button type="button" data-a="smaller" aria-label="کوچک‌تر">−</button><button type="button" data-a="bigger" aria-label="بزرگ‌تر">+</button></span></div>
<div class="qr-row"><span>ترجمه فارسی</span><span class="ctl"><button type="button" class="qr-chip" data-a="trans-on">نمایش</button><button type="button" class="qr-chip" data-a="trans-off">فقط عربی</button></span></div>
<div class="qr-row"><span>دکمه تفسیر</span><span class="ctl"><button type="button" class="qr-chip" data-a="tf-on">نمایش</button><button type="button" class="qr-chip" data-a="tf-off">پنهان</button></span></div>
<div class="qr-row"><span>رنگ صفحه</span><span class="ctl"><button type="button" class="qr-chip" data-a="day">روز</button><button type="button" class="qr-chip" data-a="night">شب</button></span></div>
<div class="qr-row qr-x"><span>مترجم</span><select id="qrTr" aria-label="ترجمه">${TRANSLATIONS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
<div class="qr-row qr-x qr-sec">صوت</div>
<div class="qr-row qr-x"><span>پخش</span><span class="ctl"><button type="button" class="qr-chip" data-a="mode-ar">تلاوت</button><button type="button" class="qr-chip" data-a="mode-both">تلاوت + ترجمه</button><button type="button" class="qr-chip" data-a="mode-fa">ترجمه</button></span></div>
<div class="qr-row qr-x"><span>قاری</span><select id="qrReciter" aria-label="قاری">${RECITERS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
<div class="qr-row qr-x"><span>ترجمه گویا</span><select id="qrVoice" aria-label="ترجمه گویا">${VOICES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
<button type="button" class="qr-apply" data-a="apply">اعمال تنظیمات</button>
</div>
<div class="qr-body" id="qrBody"></div>
<div class="qr-player" id="qrPlayer"><button type="button" class="qr-play" data-a="play" aria-label="پخش">▶</button>
<div class="qr-now" id="qrNow"><b>پخش صوت</b>از اولین آیه، یا روی شماره یک آیه بزنید</div>
<button type="button" data-a="next" aria-label="آیه بعد">⏭</button><button type="button" data-a="prev" aria-label="آیه قبل">⏮</button></div>`;
  document.body.appendChild(el);
  const $ = id => el.querySelector('#' + id);
  const menu = $('qrMenu'), body = $('qrBody');

  let current = null, pushed = false;

  function applyPrefs() {
    el.style.setProperty('--qs', prefs.size + 'px');
    el.classList.toggle('flow', !prefs.trans);
    el.classList.toggle('night', prefs.night);
    el.classList.toggle('notf', !prefs.tafsir);
    el.querySelector('[data-a="tf-on"]').classList.toggle('on', prefs.tafsir);
    el.querySelector('[data-a="tf-off"]').classList.toggle('on', !prefs.tafsir);
    el.querySelector('[data-a="trans-on"]').classList.toggle('on', prefs.trans);
    el.querySelector('[data-a="trans-off"]').classList.toggle('on', !prefs.trans);
    el.querySelector('[data-a="day"]').classList.toggle('on', !prefs.night);
    el.querySelector('[data-a="night"]').classList.toggle('on', prefs.night);
    for (const m of ['ar', 'both', 'fa']) el.querySelector(`[data-a="mode-${m}"]`).classList.toggle('on', prefs.mode === m);
    $('qrTr').value = prefs.tr; $('qrReciter').value = prefs.reciter; $('qrVoice').value = prefs.voice;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  let items = [];
  const trName = () => (TRANSLATIONS.find(t => t[0] === activeTr()) || TRANSLATIONS[0])[1];
  const activeTr = () => extras() && TRANSLATIONS.some(t => t[0] === prefs.tr) ? prefs.tr : 'makarem';

  function render(data) {
    let count = 0;
    data.segments.forEach(seg => { FA_NAME[seg.s] = seg.fa; });
    const html = data.segments.map(seg => {
      const to = seg.from + seg.ayahs.length - 1;
      count += seg.ayahs.length;
      const range = seg.from === 1 && to === seg.n ? `کامل · ${toFa(seg.n)} آیه` : `آیه ${toFa(seg.from)} تا ${toFa(to)}`;
      const bism = seg.from === 1 && seg.s !== 1 && seg.s !== 9 ? `<div class="qr-bism">${BISMILLAH}</div>` : '';
      const ayahs = seg.ayahs.map(([a, t], i) => {
        const n = seg.from + i;
        return `<div class="qr-ayah" id="qa-${seg.s}-${n}"><p class="qr-ar">${esc(a)}&nbsp;<span class="qr-num" data-a="ayah">${toAr(n)}</span> </p><p class="qr-fa"><i>(${toFa(n)})</i><span>${esc(t)}</span><a class="qr-tf" href="${tafsirUrl(seg.s, n)}" target="_blank" rel="noopener" title="تفسیر نمونه این آیه در سایت آیت‌الله مکارم شیرازی">تفسیر ↖</a></p></div>`;
      }).join('');
      return `<div class="qr-sura"><h3>سُورَةُ ${esc(seg.ar.replace(/^ال/, 'ٱل'))}</h3><small>سوره ${esc(seg.fa)} · ${range}</small></div>${bism}<div class="qr-seg">${ayahs}</div>`;
    }).join('');
    $('qrSub').textContent = current.range ? `${current.sub ? current.sub + ' · ' : ''}${toFa(count)} آیه` : `${typeof hizbLabel === 'function' && hizbLabel(current.index) ? `حزب ${toFa(current.index + 1)} · ` : ''}${toFa(count)} آیه`;
    const end = current.range ? `<p>${esc(current.endText || 'پایان. قبول باشد.')}</p>${current.onEnd ? `<button type="button" data-a="rangeEnd">${esc(current.endButton || 'خواندم')}</button>` : ''}${current.note ? `<p class="qr-note">${esc(current.note)}</p>` : ''}`
      : '<p>پایان سهم امروز. قبول باشد.</p><button type="button" data-a="report">قرائت کردم؛ ثبت گزارش</button>';
    const nv = current.nav, navHtml = !nv ? '' : `<div class="qr-pnav">${nv.prev ? `<button type="button" data-a="pprev">→ ${esc(nv.prev)}</button>` : '<span></span>'}${nv.menu ? `<button type="button" class="qr-pmenu" data-a="pmenu">${esc(nv.menu)}</button>` : ''}${nv.next ? `<button type="button" data-a="pnext">${esc(nv.next)} ←</button>` : '<span></span>'}</div>`;
    body.innerHTML = navHtml + html + `<div class="qr-end">${end}${navHtml}
<p class="qr-src">متن عربی: مصحف مجمع ملک فهد (روایت حفص) · ترجمه: <span id="qrTrSrc">آیت‌الله مکارم شیرازی</span> (Tanzil.net) · تفسیر: quran.makarem.ir<span class="qr-xi"> · صوت: everyayah.com، quran.com و alquran.cloud · ترجمه ریاعی و صدای بهروز رضوی: quranmehr.ir (موسسه پیامبر مهر و رحمت)</span></p></div>`;
    items = [...body.querySelectorAll('.qr-ayah')].map(e => { const [, s, n] = e.id.split('-').map(Number); return { s, n, e }; });
    el.scrollTop = 0;
    const f = current.focus != null && items.find(it => gIndex(it) === current.focus);
    if (f) { el.scrollTop += f.e.getBoundingClientRect().top - el.querySelector('.qr-bar').offsetHeight - 8; f.e.classList.add('focus'); }
    onScroll();
    reportView();
    loadTranslation();
    if (current.autoplay) playAt(0);
  }
  // اندیس سراسری آیه (۰ تا ۶۲۳۵)
  const gIndex = it => SURAH_START[it.s - 1] + it.n - 1;
  // آیه‌ای که الان بالای صفحه است (یا در حال پخش است) به onView گزارش می‌شود؛ برای ذخیره جای خواندن در قرآن آزاد.
  let viewTimer = 0;
  function reportView(now) {
    if (!current || !current.onView || !items.length) return;
    clearTimeout(viewTimer);
    const run = () => {
      let it = playing && items[pos];
      if (!it) { const top = el.querySelector('.qr-bar').offsetHeight; it = items.find(x => x.e.getBoundingClientRect().bottom > top + 30) || items[items.length - 1]; }
      try { current.onView(gIndex(it)); } catch {}
    };
    if (now) run(); else viewTimer = setTimeout(() => { if (el.classList.contains('show')) run(); }, 500);
  }

  async function loadTranslation() {
    const t = activeTr(), want = current;
    const fas = items.map(it => it.e.querySelector('.qr-fa > span'));
    let list;
    if (t === 'makarem') list = items.map(it => it.makarem ?? (it.makarem = it.e.querySelector('.qr-fa > span').textContent));
    else {
      try {
        if (current.range) list = (await Promise.all(current.parts.map(async pt => {
          const r = await fetch(`quran/t/${t}/${pad3(pt.index + 1)}.json`); if (!r.ok) throw Error(r.status);
          return (await r.json()).slice(pt.off, pt.off + pt.take);
        }))).flat();
        else {
        const r = await fetch(`quran/t/${t}/${pad3(current.index + 1)}.json`);
        if (!r.ok) throw Error(r.status);
        list = await r.json();
        }
        items.forEach(it => { if (it.makarem == null) it.makarem = it.e.querySelector('.qr-fa > span').textContent; });
      } catch { return; }
    }
    if (want !== current || list.length !== items.length) return;
    fas.forEach((p, i) => { p.textContent = list[i]; });
    const src = $('qrTrSrc'); if (src) src.textContent = trName();
  }

  // بازه‌ای دلخواه از آیه‌ها (برای جزء، صفحه یا یک سوره)، با اندیس سراسری آیه‌ها (۰ تا ۶۲۳۵) از quran/index.json.
  let qIndex = null;
  const getIndex = async () => qIndex || (qIndex = await fetch('quran/index.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }));
  async function loadRange() {
    const ix = await getIndex(), { from, to } = current.range, P = ix.portion;
    const parts = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = i + 1 < P.length ? P[i + 1] : ix.total;
      if (a < to && b > from) parts.push({ index: i, off: Math.max(0, from - a), take: Math.min(b, to) - Math.max(a, from) });
    }
    const files = await Promise.all(parts.map(pt => fetch(`quran/p/${pad3(pt.index + 1)}.json`).then(r => { if (!r.ok) throw Error(r.status); return r.json(); })));
    const segs = [];
    files.forEach((d, k) => {
      const flat = d.segments.flatMap(seg => seg.ayahs.map((ay, j) => ({ seg, n: seg.from + j, ay })));
      flat.slice(parts[k].off, parts[k].off + parts[k].take).forEach(x => {
        let last = segs[segs.length - 1];
        if (!last || last.s !== x.seg.s) segs.push(last = { s: x.seg.s, fa: x.seg.fa, ar: x.seg.ar, n: x.seg.n, from: x.n, ayahs: [] });
        last.ayahs.push(x.ay);
      });
    });
    current.parts = parts;
    render({ segments: segs });
  }

  async function load() {
    body.innerHTML = '<div class="qr-state">در حال بارگذاری متن…</div>';
    if (current.range) {
      try { await loadRange(); } catch { body.innerHTML = '<div class="qr-state">بارگذاری متن انجام نشد.<br><button type="button" data-a="retry">تلاش دوباره</button></div>'; }
      return;
    }
    try {
      const r = await fetch(`quran/p/${String(current.index + 1).padStart(3, '0')}.json`);
      if (!r.ok) throw Error(r.status);
      render(await r.json());
    } catch {
      body.innerHTML = '<div class="qr-state">بارگذاری متن انجام نشد.<br><button type="button" data-a="retry">تلاش دوباره</button></div>';
    }
  }

  function open(task) {
    current = task;
    $('qrTitle').textContent = toFa(task.title);
    $('qrSub').textContent = '';
    el.classList.toggle('x', extras());
    stopAudio();
    applyPrefs();
    menu.classList.remove('show');
    el.classList.add('show');
    document.body.classList.add('qr-lock');
    if (!pushed) { history.pushState({ qr: 1 }, ''); pushed = true; }
    load();
    el.querySelector('[data-a="close"]').focus();
  }

  let afterClose = null;
  function close(fromHistory, then) {
    if (el.classList.contains('show')) reportView(true);
    stopAudio();
    el.classList.remove('show');
    document.body.classList.remove('qr-lock');
    if (pushed && !fromHistory) { pushed = false; afterClose = then || null; history.back(); return; }
    pushed = false;
    if (then) then();
  }

  window.addEventListener('popstate', () => {
    if (el.classList.contains('show') && !history.state?.qr) close(true);
    const f = afterClose; afterClose = null;
    if (f) setTimeout(f, 50);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('show')) { e.preventDefault(); close(); } });

  function onScroll() {
    const max = el.scrollHeight - el.clientHeight;
    $('qrProgress').style.width = (max > 0 ? Math.min(100, el.scrollTop / max * 100) : 100) + '%';
  }
  el.addEventListener('scroll', () => { onScroll(); reportView(); }, { passive: true });

  function keepPlace(fn) {
    // پس از تغییر اندازه یا حالت نمایش، همان آیه‌ای که بالای صفحه بود دوباره بالا بماند.
    const top = el.querySelector('.qr-bar').offsetHeight;
    const anchor = [...el.querySelectorAll('.qr-ayah')].find(a => a.getBoundingClientRect().bottom > top + 4);
    fn();
    if (anchor) el.scrollTop += anchor.getBoundingClientRect().top - top - 8;
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'close') return close();
    if (a === 'menu') { const s = menu.classList.toggle('show'); b.setAttribute('aria-expanded', s); return; }
    if (a === 'retry') return load();
    if (a === 'rangeEnd') { const f = current.onEnd; return close(false, f); }
    if (a === 'pprev') return current.nav.onPrev();
    if (a === 'pnext') return current.nav.onNext();
    if (a === 'pmenu') return close(false, current.nav.onMenu);
    if (a === 'apply') {
      // تغییرات همان لحظه اعمال می‌شوند؛ این دکمه منو را می‌بندد و اگر صوت در حال پخش است، آیه فعلی را با تنظیمات جدید از نو پخش می‌کند.
      menu.classList.remove('show');
      el.querySelector('[data-a="menu"]').setAttribute('aria-expanded', false);
      if (playing) playAt(pos);
      return;
    }
    if (a === 'play') return playing ? pauseAudio() : resumeOrStart();
    if (a === 'next') return playAt(Math.min(items.length - 1, pos + 1));
    if (a === 'prev') return playAt(Math.max(0, pos - 1));
    if (a === 'ayah') return playAt(items.findIndex(it => it.e === b.closest('.qr-ayah')));
    if (a === 'report') {
      const id = current.id;
      return close(false, () => {
        if (!window.reportId || typeof window.verifyReportIdentity !== 'function') return;
        reportId.value = toFa(id);
        verifyReportIdentity();
        reportId.closest('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    keepPlace(() => {
      if (a === 'smaller') prefs.size = Math.max(20, prefs.size - 2);
      if (a === 'bigger') prefs.size = Math.min(44, prefs.size + 2);
      if (a === 'trans-on') prefs.trans = true;
      if (a === 'trans-off') prefs.trans = false;
      if (a === 'day') prefs.night = false;
      if (a === 'night') prefs.night = true;
      if (a === 'tf-on') prefs.tafsir = true;
      if (a === 'tf-off') prefs.tafsir = false;
      if (a.startsWith('mode-')) prefs.mode = a.slice(5);
      applyPrefs();
    });
    save();
  });

  // ---------- پخش صوت ----------
  const audio = new Audio(), nextAudio = new Audio();
  audio.preload = 'auto'; nextAudio.preload = 'auto';
  let pos = -1, step = 0, playing = false, queue = [], qi = 0, srcIdx = 0, wait = 0;
  // سرورهایی که در این بازدید جواب ندادند به آخر صف می‌روند تا آیه‌های بعدی معطل‌شان نشوند.
  const failed = {};
  const host = u => { try { return new URL(u).host; } catch { return ''; } };
  const byHealth = u => u.map((x, i) => [x, i]).sort((a, b) => ((failed[host(a[0])] || 0) - (failed[host(b[0])] || 0)) || a[1] - b[1]).map(x => x[0]);
  const LOAD_TIMEOUT = 12000;

  ['qrTr', 'qrReciter', 'qrVoice'].forEach(id => $(id).addEventListener('change', e => {
    const key = { qrTr: 'tr', qrReciter: 'reciter', qrVoice: 'voice' }[id];
    prefs[key] = e.target.value; save();
    if (key === 'tr') loadTranslation(); else if (playing) playAt(pos);
  }));

  function arUrls(s, n) {
    const r = RECITERS.find(x => x[0] === prefs.reciter) || RECITERS[0], f = pad3(s) + pad3(n);
    const u = [`https://everyayah.com/data/${r[2]}/${f}.mp3`];
    if (r[4]) u.push(`https://verses.quran.com/${r[4]}/mp3/${f}.mp3`);
    if (r[3]) u.push(`https://cdn.islamic.network/quran/audio/128/${r[3]}/${SURAH_START[s - 1] + n}.mp3`);
    u.push(`https://mirrors.quranicaudio.com/everyayah/${r[2]}/${f}.mp3`);
    return u;
  }
  const voice = () => VOICES.find(x => x[0] === prefs.voice) || VOICES[0];
  // برای صدای رضوی، razaviTimes پیش از پخش (در playAt) بارگذاری شده و هر شیء صوت بازه [شروع، پایان] آیه را در seg دارد.
  function faUrls(s, n) {
    const v = voice(), f = pad3(s) + pad3(n);
    if (v[3]) return Object.assign([v[3](s)], { seg: razaviTimes[s - 1][n - 1] });
    return [`https://everyayah.com/data/${v[2]}/${f}.mp3`, `https://mirrors.quranicaudio.com/everyayah/${v[2]}/${f}.mp3`];
  }
  // صف پخش یک آیه: بسم‌الله برای آیه اول سوره (جز حمد و توبه)، تلاوت، سپس ترجمه گویا.
  function tracksFor(it) {
    const t = [];
    if (prefs.mode !== 'fa') {
      if (it.n === 1 && it.s !== 1 && it.s !== 9) t.push(arUrls(1, 1));
      t.push(arUrls(it.s, it.n));
    }
    if (prefs.mode !== 'ar') t.push(faUrls(it.s, it.n));
    return t;
  }

  function setNow(title, sub) { $('qrNow').innerHTML = `<b>${esc(title)}</b>${esc(sub)}`; }
  function setPlayBtn() { const b = el.querySelector('[data-a="play"]'); b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? 'توقف' : 'پخش'); }
  function highlight() {
    items.forEach((it, i) => it.e.classList.toggle('playing', i === pos));
    const it = items[pos]; if (!it) return;
    const r = it.e.getBoundingClientRect(), top = el.querySelector('.qr-bar').offsetHeight, bottom = el.clientHeight - $('qrPlayer').offsetHeight;
    if (r.top < top || r.bottom > bottom) it.e.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function label(sub) {
    const it = items[pos];
    if (!it) return;
    const who = prefs.mode === 'fa' ? voice()[1] : (RECITERS.find(x => x[0] === prefs.reciter) || RECITERS[0])[1];
    setNow(`سوره ${FA_NAME[it.s] || ''} · آیه ${toFa(it.n)}`, sub || who);
  }
  const FA_NAME = {};

  function playAt(i) {
    if (i < 0 || !items[i]) return;
    if (prefs.mode !== 'ar' && voice()[3] && !Array.isArray(razaviTimes)) {
      pos = i; playing = true; highlight(); label('در حال بارگیری صوت…'); setPlayBtn();
      const want = current;
      return loadRazavi().then(t => { razaviTimes = t; if (playing && want === current && pos === i) playAt(i); })
        .catch(() => { playing = false; setPlayBtn(); setNow('پخش این آیه ممکن نشد', 'اتصال اینترنت را بررسی کنید یا صدای دیگری انتخاب کنید'); });
    }
    pos = i; queue = tracksFor(items[i]); qi = 0; srcIdx = 0; playing = true;
    highlight(); label(); setPlayBtn(); playTrack(); reportView(true);
  }
  function playTrack() {
    if (!queue[qi]) return advance();
    if (srcIdx === 0) queue[qi] = Object.assign(byHealth(queue[qi]), { seg: queue[qi].seg });
    const urls = queue[qi], seg = urls.seg;
    // آیه‌ای از وسط فایل یک سوره: اگر همان فایل باز است فقط جابه‌جا می‌شود، وگرنه از همان ثانیه بارگذاری می‌شود.
    if (seg && audio.getAttribute('src')?.split('#')[0] === urls[srcIdx] && audio.readyState > 0) audio.currentTime = seg[0];
    else audio.src = seg ? `${urls[srcIdx]}#t=${seg[0]}` : urls[srcIdx];
    label('در حال بارگیری صوت…');
    // سروری که جواب نمی‌دهد (نه خطا، فقط معطلی) هم بعد از چند ثانیه کنار گذاشته می‌شود.
    clearTimeout(wait);
    wait = setTimeout(() => { if (playing && audio.currentTime === 0) fail(); }, LOAD_TIMEOUT);
    audio.play().catch(err => {
      if (err && err.name === 'NotAllowedError') { clearTimeout(wait); playing = false; setPlayBtn(); label('برای پخش، دکمه ▶ را بزنید'); }
    });
  }
  // فایل آیه بعد فقط وقتی آیه فعلی شروع شد گرفته می‌شود تا با اینترنت کند پهنای باند آیه فعلی را نگیرد.
  function preloadNext() {
    const it = items[pos + 1], t = it && tracksFor(it)[0];
    // فایل سوره کامل بزرگ است و جداگانه از پیش گرفته نمی‌شود.
    if (!t || t.seg) return;
    const u = byHealth(t)[0];
    if (u && nextAudio.src !== u) nextAudio.src = u;
  }
  function fail() {
    clearTimeout(wait);
    const h = host(audio.src); failed[h] = (failed[h] || 0) + 1;
    audio.removeAttribute('src');
    srcIdx++;
    if (queue[qi] && srcIdx < queue[qi].length) return playTrack();
    playing = false; setPlayBtn();
    setNow('پخش این آیه ممکن نشد', 'اتصال اینترنت را بررسی کنید یا قاری دیگری انتخاب کنید');
  }
  function advance() {
    if (pos + 1 < items.length) playAt(pos + 1);
    // قرآن آزاد: در پایان صفحه، صفحه بعد باز می‌شود و پخش ادامه پیدا می‌کند.
    else if (current?.nav?.next && current.nav.onNext && current.nav.autoNext !== false) current.nav.onNext({ autoplay: true });
    else { stopAudio(); setNow('پایان سهم امروز', 'قبول باشد'); }
  }
  function trackEnded() { qi++; srcIdx = 0; if (qi < queue.length) playTrack(); else advance(); }
  audio.addEventListener('ended', trackEnded);
  // پایان آیه‌ای که از وسط فایل سوره پخش می‌شود.
  audio.addEventListener('timeupdate', () => { const seg = queue[qi]?.seg; if (playing && seg && audio.currentTime >= seg[1]) { audio.pause(); trackEnded(); } });
  // بعضی مرورگرها #t= را نادیده می‌گیرند؛ پس از رسیدن مشخصات فایل، به ابتدای آیه برده می‌شود.
  audio.addEventListener('loadedmetadata', () => { const seg = queue[qi]?.seg; if (seg && Math.abs(audio.currentTime - seg[0]) > 1) audio.currentTime = seg[0]; });
  audio.addEventListener('error', () => { if (playing && audio.getAttribute('src')) fail(); });
  audio.addEventListener('playing', () => { clearTimeout(wait); failed[host(audio.src)] = 0; label(); preloadNext(); });
  audio.addEventListener('waiting', () => { if (playing) label('در حال بارگیری صوت…'); });
  function pauseAudio() { clearTimeout(wait); audio.pause(); playing = false; setPlayBtn(); }
  function resumeOrStart() {
    if (pos >= 0 && audio.getAttribute('src') && !audio.ended && audio.currentTime > 0) { playing = true; setPlayBtn(); audio.play().catch(() => {}); }
    else {
      // از آیه‌ای که الان روی صفحه است شروع کن.
      const top = el.querySelector('.qr-bar').offsetHeight;
      const i = items.findIndex(it => it.e.getBoundingClientRect().bottom > top + 40);
      playAt(pos >= 0 ? pos : Math.max(0, i));
    }
  }
  function stopAudio() {
    clearTimeout(wait);
    audio.pause(); audio.removeAttribute('src'); audio.load();
    playing = false; pos = -1; queue = [];
    items.forEach(it => it.e.classList.remove('playing'));
    if ($('qrPlayer')) { setPlayBtn(); setNow('پخش صوت', 'از اولین آیه، یا روی شماره یک آیه بزنید'); }
  }

  // برای بخش‌های دیگر سایت (چله‌ها): باز کردن بازه‌ای از آیه‌ها با همین صفحه، ترجمه‌ها و پخش صوت.
  // opts: { title, sub, from, to (اندیس سراسری، to خودش نیست), endText, endButton, onEnd }
  // و برای قرآن آزاد (quran-free.js): focus (اندیس آیه‌ای که صفحه رویش باز شود)، onView(اندیس آیه بالای صفحه)،
  // nav: { prev, next, menu (نام دکمه‌ها)، onPrev, onNext({autoplay}), onMenu (پس از بستن قرآن‌خوان)، autoNext: false یعنی پایان صوت به صفحه بعد نرود }، autoplay، note (راهنمای کوتاه پایین صفحه)
  window.quranReader = {
    openRange(o) { open({ title: o.title, sub: o.sub || '', range: { from: o.from, to: o.to }, endText: o.endText, endButton: o.endButton, onEnd: o.onEnd, note: o.note, focus: o.focus, onView: o.onView, nav: o.nav, autoplay: o.autoplay }); },
    index: getIndex
  };

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/></svg>';
  document.addEventListener('task:shown', e => {
    if (!enabled()) return;
    const t = e.detail, box = document.getElementById('result');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qr-open';
    b.innerHTML = `${ICON}<span>خواندن متن قرآن این سهم</span>`;
    b.onclick = () => open(t);
    box.appendChild(b);
  });
})();
