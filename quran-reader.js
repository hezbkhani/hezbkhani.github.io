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
  // زبان ترجمه: فارسی پیش‌فرض است؛ بقیه از Tanzil.net در quran/t/<شناسه Tanzil>/NNN.json (ساخت با tools/translations/make.py).
  // [کد زبان، نام، جهت متن، [[شناسه، مترجم], ...]]؛ اولین مترجم هر زبان پیش‌فرض آن است.
  const LANGS = [
    ['fa', 'فارسی', 'rtl', TRANSLATIONS],
    ['en', 'انگلیسی · English', 'ltr', [['en.sahih', 'Sahih International'], ['en.qarai', 'Ali Quli Qarai'], ['en.pickthall', 'Pickthall'], ['en.yusufali', 'Yusuf Ali'], ['en.shakir', 'Shakir']]],
    ['de', 'آلمانی · Deutsch', 'ltr', [['de.bubenheim', 'Bubenheim & Elyas'], ['de.aburida', 'Abu Rida'], ['de.khoury', 'Adel Theodor Khoury']]],
    ['fr', 'فرانسوی · Français', 'ltr', [['fr.hamidullah', 'Muhammad Hamidullah']]],
    ['es', 'اسپانیایی · Español', 'ltr', [['es.cortes', 'Julio Cortés'], ['es.bornez', 'Raúl González Bórnez'], ['es.garcia', 'Muhammad Isa García']]],
    ['it', 'ایتالیایی · Italiano', 'ltr', [['it.piccardo', 'Hamza Roberto Piccardo']]],
    ['ru', 'روسی · Русский', 'ltr', [['ru.kuliev', 'Эльмир Кулиев'], ['ru.osmanov', 'Магомед-Нури Османов'], ['ru.krachkovsky', 'Игнатий Крачковский']]],
    ['tr', 'ترکی استانبولی · Türkçe', 'ltr', [['tr.diyanet', 'Diyanet İşleri'], ['tr.golpinarli', 'Abdulbaki Gölpınarlı'], ['tr.yazir', 'Elmalılı Hamdi Yazır']]],
    ['ur', 'اردو', 'rtl', [['ur.jalandhry', 'جالندہری'], ['ur.najafi', 'محمد حسین نجفی'], ['ur.jawadi', 'ذیشان حیدر جوادی']]],
    ['id', 'اندونزیایی · Indonesia', 'ltr', [['id.indonesian', 'Kementerian Agama RI']]],
    ['zh', 'چینی · 中文', 'ltr', [['zh.jian', '马坚 (Ma Jian)']]],
    ['hi', 'هندی · हिन्दी', 'ltr', [['hi.hindi', 'फ़ारूक़ ख़ान और नदवी']]],
    ['bn', 'بنگالی · বাংলা', 'ltr', [['bn.bengali', 'মুহিউদ্দীন খান']]]
  ];
  // تفسیر هر آیه: متن تفسیر نمونه (آیت‌الله مکارم شیرازی) با ذکر منبع در quran/tafsir/<سوره>.json است و داخل همین قرآن‌خوان باز می‌شود.
  // اگر فایل سوره‌ای نبود یا بارگذاری نشد، همان آیه در سایت رسمی quran.makarem.ir باز می‌شود.
  const TAFSIR_SRC = 'تفسیر نمونه، آیت‌الله ناصر مکارم شیرازی و جمعی از نویسندگان، از سایت quran.makarem.ir';
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
  // تحدیر معتز آقایی: هر فایل یک جزء کامل است (audio/aghaei/، رونوشت archive.org/details/Tahdir_Aqaee روی خود سایت
  // چون archive.org در ایران فیلتر است) و زمان شروع و پایان هر آیه
  // در quran/aghaei.json است (به همان شکل razavi.json)، پس هر آیه از وسط فایل جزء خودش پخش می‌شود.
  // ابتدای آیه اول هر سوره بسم‌الله همان قاری را هم در بر دارد.
  RECITERS.push(['aghaei', 'معتز آقایی (تحدیر)', '', '', '', j => [`audio/aghaei/joz${pad2(j)}.mp3`]]);
  const JUZ_START = [0,148,259,385,516,640,750,899,1041,1200,1327,1478,1648,1802,2029,2214,2483,2673,2875,3214,3385,3563,3732,4089,4264,4510,4705,5104,5241,5672];
  const VOICES = [
    ['hedayatfar', 'فولادوند، صدای هدایت‌فر', 'translations/Fooladvand_Hedayatfar_40Kbps'],
    ['kabiri', 'مکارم، صدای کبیری', 'translations/Makarem_Kabiri_16Kbps']
  ];
  // ترجمه مسعود ریاعی با صدای بهروز رضوی، از قرآن مهر (موسسه پیامبر مهر و رحمت)؛ ناشر استفاده «عیناً و بدون تغییر و با ذکر منبع» را آزاد گذاشته است.
  // هر فایل صوتی یک سوره کامل است (quranmehr.ir/files/subtitle/<شماره>-<نام>.mp3، نام‌ها از QuranData.Sura سایت قرآن مهر)
  // و زمان شروع و پایان هر آیه در quran/razavi.json است، پس هر آیه جدا از وسط همان فایل پخش می‌شود.
  const RAZAVI_NAMES = 'Fatiha,Baqarah,AalImran,Nisa,Maidah,Anam,Araf,Anfal,Tawbah,Yunus,Hud,Yusuf,Rad,Ibrahim,Hijr,Nahl,Isra,Kahf,Maryam,Taha,Anbiya,Hajj,Muminun,Nur,Furqan,Shuara,Naml,Qasas,Ankabut,Rum,Luqman,Sajdah,Ahzab,Saba,Fatir,YaaSin,Saffat,Saad,Zumar,Ghafir,Fussilat,Shura,Zukhruf,Dukhan,Jathiyah,Ahqaf,Muhammad,Fath,Hujurat,Qaf,Dhariyat,Tur,Najm,Qamar,Rahman,Waqiah,Hadid,Mujadilah,Hashr,Mumtahinah,Saff,Jumuah,Munafiqun,Taghabun,Talaq,Tahrim,Mulk,Qalam,Haqqah,Maarij,Nuh,Jinn,Muzammil,Mudathir,Qiyamah,Insan,Mursalat,Naba,Naziat,Abasa,Takwir,Infitar,Mutaffifin,Inshiqaq,Buruj,Tariq,Alaa,Ghashiyah,Fajr,Balad,Shams,Layl,Dhuha,Sharh,Tin,Alaq,Qadr,Baiyinah,Zalzalah,Adiyat,Qariah,Takathur,Asr,Humazah,Fil,Quraysh,Maaun,Kauthar,Kafirun,Nasr,Masad,Ikhlas,Falaq,Nas'.split(',');
  VOICES.push(['razavi', 'ریاعی، صدای بهروز رضوی', '', s => `https://quranmehr.ir/files/subtitle/${s}-${RAZAVI_NAMES[s - 1]}.mp3`]);
  // زمان‌بندی آیه‌ها در فایل‌های بلند (سوره یا جزء کامل): برای هر سوره فهرست [ثانیه شروع، ثانیه پایان] هر آیه.
  const times = {}, timing = {};
  const loadTimes = f => timing[f] || (timing[f] = fetch(`quran/${f}.json`).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(t => (times[f] = t)).catch(e => { timing[f] = null; throw e; }));
  const SURAH_AYAHS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
  const SURAH_START = SURAH_AYAHS.reduce((a, n, i) => (a.push(i ? a[i - 1] + SURAH_AYAHS[i - 1] : 0), a), []);
  const pad3 = n => String(n).padStart(3, '0'), pad2 = n => String(n).padStart(2, '0');
  const fa = '۰۱۲۳۴۵۶۷۸۹', arD = '٠١٢٣٤٥٦٧٨٩';
  const toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const toAr = x => String(x).replace(/\d/g, d => arD[d]);
  const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
  const AO = window.audioOpt;
  const KEY = 'quranReader';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }
  };
  const prefs = Object.assign({ size: 27, trans: true, night: false, tr: 'makarem', lang: 'fa', trx: {}, tafsir: true, reciter: 'abdulbasit', voice: 'hedayatfar', mode: 'ar' }, store.get());
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
.qr-fa[dir=ltr] i{margin:0 4px 0 0}
.qr-tf{display:inline-block;margin-right:6px;padding:0 8px;border:1px solid var(--line);color:var(--accent);font-size:.8em;line-height:1.9;text-decoration:none;white-space:nowrap}
.qr-tf:hover{background:var(--line)}
.qr.notf .qr-tf{display:none}
.qr-tfs{position:fixed;inset:0;z-index:3;display:none;align-items:flex-end;justify-content:center;background:#0006}
.qr-tfs.show{display:flex}
.qr-tfs-box{display:flex;flex-direction:column;width:100%;max-width:760px;max-height:86vh;background:var(--card);color:var(--text);border-top:3px solid var(--gold);box-shadow:0 -8px 30px #0004}
.qr-tfs-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line)}
.qr-tfs-head b{flex:1;min-width:0;font-size:15.5px;color:var(--accent)}
.qr-tfs-head small{display:block;font-weight:400;font-size:12.5px;color:var(--muted)}
.qr-tfs-head button{flex:none;width:40px;height:40px;padding:0;border:0;background:transparent;color:var(--text);font-size:20px}
.qr-tfs-body{overflow-y:auto;overscroll-behavior:contain;padding:6px 16px calc(14px + env(safe-area-inset-bottom));font-size:max(15px,calc(var(--qs)*.6));line-height:2.05;text-align:justify;color:var(--tr)}
.qr-tfs-body p{margin:10px 0}
.qr-tfs-body h4{margin:16px 0 4px;font-size:1em;color:var(--accent)}
.qr-tfs-src{margin:14px 0 0;padding-top:10px;border-top:1px solid var(--line);font-size:12.5px;line-height:1.8;color:var(--muted);text-align:center}
.qr-tfs-src a{color:var(--accent)}
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
<button type="button" data-a="menu" aria-label="تنظیمات" title="تنظیمات" aria-expanded="false">⚙</button>
<div class="qr-progress" id="qrProgress"></div></div>
<div class="qr-menu" id="qrMenu">
<div class="qr-row"><span>اندازه متن</span><span class="ctl"><button type="button" data-a="smaller" aria-label="کوچک‌تر">−</button><button type="button" data-a="bigger" aria-label="بزرگ‌تر">+</button></span></div>
<div class="qr-row"><span>ترجمه</span><span class="ctl"><button type="button" class="qr-chip" data-a="trans-on">نمایش</button><button type="button" class="qr-chip" data-a="trans-off">فقط عربی</button></span></div>
<div class="qr-row"><span>دکمه تفسیر</span><span class="ctl"><button type="button" class="qr-chip" data-a="tf-on">نمایش</button><button type="button" class="qr-chip" data-a="tf-off">پنهان</button></span></div>
<div class="qr-row"><span>رنگ صفحه</span><span class="ctl"><button type="button" class="qr-chip" data-a="day">روز</button><button type="button" class="qr-chip" data-a="night">شب</button></span></div>
<div class="qr-row qr-x"><span>زبان ترجمه</span><select id="qrLang" aria-label="زبان ترجمه">${LANGS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
<div class="qr-row qr-x"><span>مترجم</span><select id="qrTr" aria-label="مترجم"></select></div>
<div class="qr-row qr-x qr-sec">صوت</div>
<div class="qr-row qr-x"><span>پخش</span><span class="ctl"><button type="button" class="qr-chip" data-a="mode-ar">تلاوت</button><button type="button" class="qr-chip" data-a="mode-both">تلاوت + ترجمه</button><button type="button" class="qr-chip" data-a="mode-fa">ترجمه</button></span></div>
<div class="qr-row qr-x"><span>قاری</span><select id="qrReciter" aria-label="قاری">${RECITERS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
<div class="qr-row qr-x"><span>ترجمه گویا</span><select id="qrVoice" aria-label="ترجمه گویا">${VOICES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
<div class="qr-row qr-x"><span>سرعت پخش</span><select id="qrRate" data-au-rate aria-label="سرعت پخش">${AO.RATES.map(r => `<option value="${r}">${AO.num(r)}</option>`).join('')}</select></div>
<div class="qr-row qr-x"><span>دکمه دانلود صوت</span><span class="ctl"><button type="button" class="qr-chip" data-a="dl-on">نمایش</button><button type="button" class="qr-chip" data-a="dl-off">پنهان</button></span></div>
<button type="button" class="qr-apply" data-a="apply">اعمال تنظیمات</button>
</div>
<div class="qr-body" id="qrBody"></div>
<div class="qr-tfs" id="qrTfs" data-a="tfclose"><div class="qr-tfs-box" role="dialog" aria-modal="true" aria-labelledby="qrTfsTitle"><div class="qr-tfs-head"><b id="qrTfsTitle"></b><button type="button" data-a="tfclose" aria-label="بستن تفسیر">✕</button></div><div class="qr-tfs-body" id="qrTfsBody"></div></div></div>
<div class="qr-player" id="qrPlayer"><button type="button" class="qr-play" data-a="play" aria-label="پخش">▶</button>
<div class="qr-now" id="qrNow"><b>پخش صوت</b>از اولین آیه، یا روی شماره یک آیه بزنید</div>
<button type="button" data-a="next" aria-label="آیه بعد">⏭</button><button type="button" data-a="prev" aria-label="آیه قبل">⏮</button><button type="button" data-a="dl" aria-label="دانلود صوت این آیه" hidden>⬇</button></div>`;
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
    fillTr(); $('qrLang').value = lang()[0]; $('qrReciter').value = prefs.reciter; $('qrVoice').value = prefs.voice;
    applyAudioOpt();
  }
  // سرعت پخش و دکمه دانلود تنظیم مشترک همه صوت‌های سایت است (audioOpt در app.js).
  function applyAudioOpt() {
    const o = AO.get();
    $('qrRate').value = o.rate;
    el.querySelector('[data-a="dl-on"]').classList.toggle('on', o.dl);
    el.querySelector('[data-a="dl-off"]').classList.toggle('on', !o.dl);
    el.querySelector('[data-a="dl"]').hidden = !o.dl;
  }
  document.addEventListener('audioopt', applyAudioOpt);

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  let items = [];
  const lang = () => (extras() && LANGS.find(l => l[0] === prefs.lang)) || LANGS[0];
  const activeTr = () => {
    const [k, , , list] = lang(), want = k === 'fa' ? prefs.tr : (prefs.trx || {})[k];
    return extras() && list.some(t => t[0] === want) ? want : list[0][0];
  };
  const trName = () => (lang()[3].find(t => t[0] === activeTr()) || lang()[3][0])[1];
  function fillTr() {
    const sel = $('qrTr');
    sel.innerHTML = lang()[3].map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
    sel.value = activeTr();
  }

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
        return `<div class="qr-ayah" id="qa-${seg.s}-${n}"><p class="qr-ar">${esc(a)}&nbsp;<span class="qr-num" data-a="ayah">${toAr(n)}</span> </p><p class="qr-fa"><i>(${toFa(n)})</i><span>${esc(t)}</span><a class="qr-tf" data-a="tafsir" data-s="${seg.s}" data-n="${n}" href="${tafsirUrl(seg.s, n)}" target="_blank" rel="noopener" title="تفسیر نمونه این آیه">تفسیر</a></p></div>`;
      }).join('');
      return `<div class="qr-sura"><h3>سُورَةُ ${esc(seg.ar.replace(/^ال/, 'ٱل'))}</h3><small>سوره ${esc(seg.fa)} · ${range}</small></div>${bism}<div class="qr-seg">${ayahs}</div>`;
    }).join('');
    $('qrSub').textContent = current.range ? `${current.sub ? current.sub + ' · ' : ''}${toFa(count)} آیه` : `${typeof hizbLabel === 'function' && hizbLabel(current.index) ? `حزب ${toFa(current.index + 1)} · ` : ''}${toFa(count)} آیه`;
    const end = current.range ? `<p>${esc(current.endText || 'پایان. قبول باشد.')}</p>${current.onEnd ? `<button type="button" data-a="rangeEnd">${esc(current.endButton || 'خواندم')}</button>` : ''}${current.note ? `<p class="qr-note">${esc(current.note)}</p>` : ''}`
      : '<p>پایان سهم امروز. قبول باشد.</p><button type="button" data-a="report">قرائت کردم؛ ثبت گزارش</button>';
    const nv = current.nav, navHtml = !nv ? '' : `<div class="qr-pnav">${nv.prev ? `<button type="button" data-a="pprev">→ ${esc(nv.prev)}</button>` : '<span></span>'}${nv.menu ? `<button type="button" class="qr-pmenu" data-a="pmenu">${esc(nv.menu)}</button>` : ''}${nv.next ? `<button type="button" data-a="pnext">${esc(nv.next)} ←</button>` : '<span></span>'}</div>`;
    body.innerHTML = navHtml + html + `<div class="qr-end">${end}${navHtml}
<p class="qr-src">متن عربی: مصحف مجمع ملک فهد (روایت حفص) · ترجمه: <span id="qrTrSrc">آیت‌الله مکارم شیرازی</span> (Tanzil.net) · تفسیر: quran.makarem.ir<span class="qr-xi"> · صوت: everyayah.com، quran.com و alquran.cloud · ترجمه ریاعی و صدای بهروز رضوی: quranmehr.ir (موسسه پیامبر مهر و رحمت) · تحدیر معتز آقایی: archive.org</span></p></div>`;
    items = [...body.querySelectorAll('.qr-ayah')].map(e => { const [, s, n] = e.id.split('-').map(Number); return { s, n, e }; });
    try { hooks.render?.(items); } catch (e) { console.error(e); }
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
    const [lk, , dir] = lang();
    fas.forEach((p, i) => {
      p.textContent = list[i];
      const box = p.parentNode;
      box.dir = dir; box.lang = lk;
      box.querySelector('i').textContent = `(${dir === 'rtl' ? toFa(items[i].n) : items[i].n})`;
    });
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
    closeTafsir();
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
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !el.classList.contains('show')) return;
    e.preventDefault();
    if ($('qrTfs').classList.contains('show')) closeTafsir(); else close();
  });

  // ---------- تفسیر ----------
  // quran/tafsir/<سوره>.json: {segments: [{from, to, title?, text}]}؛ سوره‌های بزرگ چند بخش‌اند: {parts: [{from, to, file}]}.
  // متن هر بخش: پاراگراف‌ها با یک خط خالی جدا شده‌اند و خطی که با «## » شروع شود عنوان است.
  const tafsirCache = {};
  const getJson = u => tafsirCache[u] || (tafsirCache[u] = fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(err => { delete tafsirCache[u]; throw err; }));
  async function tafsirFor(s, n) {
    let d = await getJson(`quran/tafsir/${s}.json`);
    if (d.parts) {
      const part = d.parts.find(p => n >= p.from && n <= p.to);
      if (!part) return null;
      d = await getJson(`quran/tafsir/${part.file}`);
    }
    return (d.segments || []).find(g => n >= g.from && n <= g.to) || null;
  }
  const tafsirHtml = text => String(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => p.startsWith('## ') ? `<h4>${esc(p.slice(3))}</h4>` : `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  let tafsirReq = 0;
  async function openTafsir(s, n) {
    const req = ++tafsirReq, box = $('qrTfsBody'), link = tafsirUrl(s, n);
    $('qrTfsTitle').innerHTML = `تفسیر نمونه<small>سوره ${esc(FA_NAME[s] || toFa(s))} · آیه ${toFa(n)}</small>`;
    box.innerHTML = '<div class="qr-state">در حال بارگذاری تفسیر…</div>';
    $('qrTfs').classList.add('show');
    $('qrTfs').querySelector('button').focus();
    let seg = null;
    try { seg = await tafsirFor(s, n); } catch {}
    if (req !== tafsirReq) return;
    if (!seg || !String(seg.text || '').trim()) { box.innerHTML = `<div class="qr-state">متن تفسیر این آیه اینجا بارگذاری نشد.<br><a href="${link}" target="_blank" rel="noopener">مشاهده در سایت تفسیر ↖</a></div>`; return; }
    const range = seg.from === seg.to ? `آیه ${toFa(seg.from)}` : `آیه‌های ${toFa(seg.from)} تا ${toFa(seg.to)}`;
    $('qrTfsTitle').innerHTML = `${esc(seg.title || 'تفسیر نمونه')}<small>سوره ${esc(FA_NAME[s] || toFa(s))} · ${range}</small>`;
    // عنوان بخش در سربرگ آمده؛ اگر متن با همان عنوان شروع شود، تکرارش نمی‌کنیم.
    const text = seg.title && seg.text.startsWith(`## ${seg.title}\n`) ? seg.text.slice(seg.title.length + 4) : seg.text;
    box.innerHTML = tafsirHtml(text) + `<p class="qr-tfs-src">منبع: ${esc(TAFSIR_SRC)}<br><a href="${link}" target="_blank" rel="noopener">مشاهده در سایت تفسیر ↖</a></p>`;
    box.scrollTop = 0;
  }
  function closeTafsir() { tafsirReq++; $('qrTfs').classList.remove('show'); }

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
    if (a === 'tafsir') { e.preventDefault(); return openTafsir(+b.dataset.s, +b.dataset.n); }
    if (a === 'tfclose') { if (b.id !== 'qrTfs' || e.target === b) closeTafsir(); return; }
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
    if (a === 'dl-on' || a === 'dl-off') return AO.set({ dl: a === 'dl-on' });
    if (a === 'dl') {
      // صوتی که الان پخش می‌شود؛ وگرنه تلاوت (یا ترجمه گویای) آیه انتخاب‌شده یا اولین آیه
      const cur = audio.getAttribute('src');
      const t = !cur && items[Math.max(pos, 0)] && tracksFor(items[Math.max(pos, 0)]).pop();
      return AO.download(cur ? cur.split('#')[0] : t && t[0]);
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
  AO.track(audio);
  let pos = -1, step = 0, playing = false, queue = [], qi = 0, srcIdx = 0, wait = 0;
  // سرورهایی که در این بازدید جواب ندادند به آخر صف می‌روند تا آیه‌های بعدی معطل‌شان نشوند.
  const failed = {};
  const host = u => { try { return new URL(u).host; } catch { return ''; } };
  const byHealth = u => u.map((x, i) => [x, i]).sort((a, b) => ((failed[host(a[0])] || 0) - (failed[host(b[0])] || 0)) || a[1] - b[1]).map(x => x[0]);
  const LOAD_TIMEOUT = 12000;

  $('qrLang').addEventListener('change', e => { prefs.lang = e.target.value; save(); fillTr(); loadTranslation(); });
  $('qrTr').addEventListener('change', e => {
    const k = lang()[0];
    if (k === 'fa') prefs.tr = e.target.value; else prefs.trx = Object.assign({}, prefs.trx, { [k]: e.target.value });
    save(); loadTranslation();
  });
  ['qrReciter', 'qrVoice'].forEach(id => $(id).addEventListener('change', e => {
    prefs[{ qrReciter: 'reciter', qrVoice: 'voice' }[id]] = e.target.value; save();
    if (playing) playAt(pos);
  }));

  function arUrls(s, n) {
    const r = reciter(), f = pad3(s) + pad3(n);
    if (r[5]) {
      const g = SURAH_START[s - 1] + n - 1;
      let j = 30; while (JUZ_START[j - 1] > g) j--;
      return Object.assign(r[5](j), { seg: times[r[0]][s - 1][n - 1] });
    }
    const u = [`https://everyayah.com/data/${r[2]}/${f}.mp3`];
    if (r[4]) u.push(`https://verses.quran.com/${r[4]}/mp3/${f}.mp3`);
    if (r[3]) u.push(`https://cdn.islamic.network/quran/audio/128/${r[3]}/${SURAH_START[s - 1] + n}.mp3`);
    u.push(`https://mirrors.quranicaudio.com/everyayah/${r[2]}/${f}.mp3`);
    return u;
  }
  const reciter = () => RECITERS.find(x => x[0] === prefs.reciter) || RECITERS[0];
  const voice = () => VOICES.find(x => x[0] === prefs.voice) || VOICES[0];
  // برای صدای رضوی و قاری‌های فایل جزئی، زمان‌بندی پیش از پخش (در playAt) بارگذاری شده و هر شیء صوت بازه [شروع، پایان] آیه را در seg دارد.
  function faUrls(s, n) {
    const v = voice(), f = pad3(s) + pad3(n);
    if (v[3]) return Object.assign([v[3](s)], { seg: times.razavi[s - 1][n - 1] });
    return [`https://everyayah.com/data/${v[2]}/${f}.mp3`, `https://mirrors.quranicaudio.com/everyayah/${v[2]}/${f}.mp3`];
  }
  // صف پخش یک آیه: بسم‌الله برای آیه اول سوره (جز حمد و توبه)، تلاوت، سپس ترجمه گویا.
  function tracksFor(it) {
    const t = [];
    if (prefs.mode !== 'fa') {
      if (it.n === 1 && it.s !== 1 && it.s !== 9 && !reciter()[5]) t.push(arUrls(1, 1));
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
    const who = prefs.mode === 'fa' ? voice()[1] : reciter()[1];
    setNow(`سوره ${FA_NAME[it.s] || ''} · آیه ${toFa(it.n)}`, sub || who);
  }
  const FA_NAME = {};

  function playAt(i) {
    if (i < 0 || !items[i]) return;
    const need = [prefs.mode !== 'ar' && voice()[3] && 'razavi', prefs.mode !== 'fa' && reciter()[5] && reciter()[0]].filter(f => f && !times[f]);
    if (need.length) {
      pos = i; playing = true; highlight(); label('در حال بارگیری صوت…'); setPlayBtn();
      const want = current;
      return Promise.all(need.map(loadTimes)).then(() => { if (playing && want === current && pos === i) playAt(i); })
        .catch(() => { playing = false; setPlayBtn(); setNow('پخش این آیه ممکن نشد', 'اتصال اینترنت را بررسی کنید یا صدای دیگری انتخاب کنید'); });
    }
    pos = i; queue = tracksFor(items[i]); qi = 0; srcIdx = 0; playing = true;
    highlight(); label(); setPlayBtn(); playTrack(); reportView(true);
  }
  function playTrack() {
    if (!queue[qi]) return advance();
    if (srcIdx === 0) queue[qi] = Object.assign(byHealth(queue[qi]), { seg: queue[qi].seg });
    const urls = queue[qi], seg = urls.seg, cur = audio.getAttribute('src')?.split('#')[0];
    if (seg && srcIdx === 0 && urls.includes(cur)) srcIdx = urls.indexOf(cur);
    // آیه‌ای از وسط فایل یک سوره: اگر همان فایل باز است فقط جابه‌جا می‌شود، وگرنه از همان ثانیه بارگذاری می‌شود.
    if (seg && cur === urls[srcIdx] && audio.readyState > 0) {
      // آیه بعدیِ پیوسته در همان فایل: بدون جابه‌جایی و مکث ادامه می‌دهد (تحدیر میان آیه‌ها مکث ندارد).
      if (!audio.paused && Math.abs(audio.currentTime - seg[0]) < 0.5) { label(); return; }
      audio.currentTime = seg[0];
    } else audio.src = seg ? `${urls[srcIdx]}#t=${seg[0]}` : urls[srcIdx];
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
    // افزونه‌ها (qr-plus.js: تکرار آیه، مکث، زمان‌سنج خواب) اگر true برگردانند، ادامه پخش با خودشان است.
    if (hooks.next && hooks.next(pos)) return;
    if (pos + 1 < items.length) playAt(pos + 1);
    // قرآن آزاد: در پایان صفحه، صفحه بعد باز می‌شود و پخش ادامه پیدا می‌کند.
    else if (current?.nav?.next && current.nav.onNext && current.nav.autoNext !== false) current.nav.onNext({ autoplay: true });
    else { stopAudio(); setNow('پایان سهم امروز', 'قبول باشد'); }
  }
  function trackEnded() { qi++; srcIdx = 0; if (qi < queue.length) playTrack(); else advance(); }
  audio.addEventListener('ended', trackEnded);
  // پایان آیه‌ای که از وسط فایل سوره پخش می‌شود.
  audio.addEventListener('timeupdate', () => {
    const seg = queue[qi]?.seg;
    if (!playing || !seg || audio.currentTime < seg[1]) return;
    if (!continues(seg)) audio.pause();
    trackEnded();
  });
  // آیا قطعه بعدی از همان فایل و درست از همین‌جا شروع می‌شود؟
  function continues(seg) {
    if (!queue[qi + 1] && hooks.hold?.(pos)) return false;
    const it = items[pos + 1], next = queue[qi + 1] || (it && pos + 1 < items.length ? tracksFor(it)[0] : null);
    return !!(next && next.seg && next.includes(audio.getAttribute('src')?.split('#')[0]) && Math.abs(next.seg[0] - seg[1]) < 0.5);
  }
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
    index: getIndex,
    // برای افزونه‌ها (qr-plus.js): hooks.render(items) پس از ساختن آیه‌ها، hooks.next(pos) در پایان هر آیه، hooks.hold(pos) یعنی پخش پیوسته فایل بلند به آیه بعد نرود.
    hooks: {}, el, audio, items: () => items, task: () => current, state: () => ({ pos, playing }),
    playAt, pause: pauseAudio, setNow, label, openTafsir, extras, flow: () => !prefs.trans,
    name: s => FA_NAME[s], ayahs: s => SURAH_AYAHS[s - 1], g: (s, n) => SURAH_START[s - 1] + n - 1, trName, lang: () => lang()
  };
  const hooks = window.quranReader.hooks;

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
