// کارت «امروز» صفحه اول، درست زیر نام سایت: تاریخ شمسی و قمری، مناسبت امروز، اعمال سفارش‌شده امروز و اوقات شرعی.
// دو امکان جدا (features.js): prayer (اوقات شرعی و زمان مانده تا اذان بعدی) و today (مناسبت و اعمال)؛ هر کدام جدا روشن یا خاموش می‌شود
// و اگر هیچ‌کدام چیزی برای نشان دادن نداشته باشد، کارتی هم نیست.
// اوقات شرعی روی خود گوشی و بدون اینترنت حساب می‌شود، به روش مؤسسه ژئوفیزیک دانشگاه تهران (همان fajrTehran در app.js):
// صبح ۱۷٫۷ درجه، مغرب ۴٫۵ درجه زیر افق، طلوع و غروب ۰٫۸۳۳ درجه، نیمه‌شب شرعی میان غروب و اذان صبح فردا.
// شهر انتخابی روی همین گوشی در localStorage (کلید prayerLoc) می‌ماند: { id } برای شهرهای فهرست، یا { id:'gps', lat, lng, tz }.
(function () {
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 864e5, MIN = 6e4, R = Math.PI / 180;
  const shown = id => !!window.features?.shown(id);

  // ---------- شهرها ----------
  const IR = 'Asia/Tehran';
  const CITIES = [
    ['tehran', 'تهران', 35.6892, 51.3890], ['mashhad', 'مشهد', 36.2970, 59.6062], ['isfahan', 'اصفهان', 32.6546, 51.6680],
    ['shiraz', 'شیراز', 29.5918, 52.5837], ['tabriz', 'تبریز', 38.0800, 46.2919], ['qom', 'قم', 34.6399, 50.8759],
    ['karaj', 'کرج', 35.8400, 50.9391], ['ahvaz', 'اهواز', 31.3183, 48.6706], ['kermanshah', 'کرمانشاه', 34.3142, 47.0650],
    ['rasht', 'رشت', 37.2808, 49.5832], ['urmia', 'ارومیه', 37.5527, 45.0761], ['yazd', 'یزد', 31.8974, 54.3569],
    ['kerman', 'کرمان', 30.2839, 57.0834], ['hamedan', 'همدان', 34.7983, 48.5146], ['arak', 'اراک', 34.0954, 49.7013],
    ['zahedan', 'زاهدان', 29.4963, 60.8629], ['bandarabbas', 'بندرعباس', 27.1832, 56.2666], ['sari', 'ساری', 36.5633, 53.0601],
    ['qazvin', 'قزوین', 36.2797, 50.0049], ['zanjan', 'زنجان', 36.6736, 48.4787], ['sanandaj', 'سنندج', 35.3219, 46.9862],
    ['khorramabad', 'خرم‌آباد', 33.4878, 48.3558], ['gorgan', 'گرگان', 36.8456, 54.4393], ['bushehr', 'بوشهر', 28.9234, 50.8203],
    ['ardabil', 'اردبیل', 38.2498, 48.2933], ['birjand', 'بیرجند', 32.8649, 59.2262], ['semnan', 'سمنان', 35.5729, 53.3971],
    ['ilam', 'ایلام', 33.6374, 46.4227], ['yasuj', 'یاسوج', 30.6682, 51.5880], ['shahrekord', 'شهرکرد', 32.3256, 50.8644],
    ['bojnurd', 'بجنورد', 37.4747, 57.3290], ['kashan', 'کاشان', 33.9850, 51.4100]
  ].map(([id, name, lat, lng]) => ({ id, name, lat, lng, tz: IR }));
  const ABROAD = [
    ['najaf', 'نجف', 32.0000, 44.3350, 'Asia/Baghdad'], ['karbala', 'کربلا', 32.6160, 44.0249, 'Asia/Baghdad'],
    ['dubai', 'دبی', 25.2048, 55.2708, 'Asia/Dubai'], ['istanbul', 'استانبول', 41.0082, 28.9784, 'Europe/Istanbul'],
    ['london', 'لندن', 51.5074, -0.1278, 'Europe/London'], ['hamburg', 'هامبورگ', 53.5511, 9.9937, 'Europe/Berlin'],
    ['toronto', 'تورنتو', 43.6532, -79.3832, 'America/Toronto'], ['vancouver', 'ونکوور', 49.2827, -123.1207, 'America/Vancouver'],
    ['losangeles', 'لس‌آنجلس', 34.0522, -118.2437, 'America/Los_Angeles'], ['sydney', 'سیدنی', -33.8688, 151.2093, 'Australia/Sydney']
  ].map(([id, name, lat, lng, tz]) => ({ id, name, lat, lng, tz }));
  const ALL = [...CITIES, ...ABROAD];
  const LKEY = 'prayerLoc';
  const near = (lat, lng) => { let best = null, bd = 60; for (const c of ALL) { const d = Math.hypot(lat - c.lat, (lng - c.lng) * Math.cos(lat * R)) * 111; if (d < bd) { bd = d; best = c; } } return best; };
  function loc() {
    let s = null; try { s = JSON.parse(localStorage.getItem(LKEY)); } catch {}
    if (s?.id === 'gps' && isFinite(s.lat) && isFinite(s.lng) && Math.abs(s.lat) <= 90) {
      let tz = IR; try { new Intl.DateTimeFormat('en', { timeZone: s.tz }); tz = s.tz || IR; } catch {}
      const n = near(s.lat, s.lng);
      return { id: 'gps', name: n ? `موقعیت من (نزدیک ${n.name})` : 'موقعیت من', short: n ? n.name : 'موقعیت من', lat: +s.lat, lng: +s.lng, tz };
    }
    return ALL.find(c => c.id === s?.id) || CITIES[0];
  }
  const saveLoc = v => { try { localStorage.setItem(LKEY, JSON.stringify(v)); } catch {} document.dispatchEvent(new Event('prayer:loc')); };

  // ---------- محاسبه اوقات (همان فرمول خورشیدی fajrTehran) ----------
  // زمان (به ساعت جهانی، از نیمه‌شب UTC همان روز) که خورشید ang درجه زیر افق است؛ dir منفی پیش از ظهر، مثبت پس از ظهر.
  function sunTime(day, lat, lng, ang, dir) {
    let h = 12 - lng / 15;
    for (let i = 0; i < 4; i++) {
      const D = day / DAY + 2440587.5 + h / 24 - 2451545, fix = (a, b) => (a % b + b) % b;
      const g = (357.529 + 0.98560028 * D) * R, q = fix(280.459 + 0.98564736 * D, 360);
      const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R, e = (23.439 - 3.6e-7 * D) * R;
      const ra = fix(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / R / 15, 24), dec = Math.asin(Math.sin(e) * Math.sin(L));
      let noon = 12 - (q / 15 - ra); noon = noon - 24 * Math.round((noon - 12) / 24); noon -= lng / 15;
      if (!dir) { h = noon; continue; }
      const c = (-Math.sin(ang * R) - Math.sin(dec) * Math.sin(lat * R)) / (Math.cos(dec) * Math.cos(lat * R));
      if (c < -1 || c > 1) return NaN; // عرض‌های بالا در تابستان: این زاویه پیش نمی‌آید
      h = noon + dir * Math.acos(c) / R / 15;
    }
    return day + h * 36e5;
  }
  // تاریخ محلی (سال، ماه، روز) در منطقه زمانی شهر
  const ymd = (t, tz) => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t)); return p; };
  const isoMs = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  function times(iso, L) {
    const day = isoMs(iso), one = d => {
      const rise = sunTime(d, L.lat, L.lng, 0.833, -1), set = sunTime(d, L.lat, L.lng, 0.833, 1);
      let fajr = sunTime(d, L.lat, L.lng, 17.7, -1), mag = sunTime(d, L.lat, L.lng, 4.5, 1);
      // عرض‌های بالا: اگر زاویه پیش نیاید یا شب خیلی کوتاه باشد، سهمی از شب به نسبت زاویه (روش angle-based)
      const night = DAY - (set - rise);
      if (!(rise - fajr <= 17.7 / 60 * night)) fajr = rise - 17.7 / 60 * night;
      if (!(mag - set <= 4.5 / 60 * night)) mag = set + 4.5 / 60 * night;
      return { fajr, rise, dhuhr: sunTime(d, L.lat, L.lng, 0, 0), set, mag };
    };
    const t = one(day), next = one(day + DAY), prev = one(day - DAY);
    t.mid = t.set + (next.fajr - t.set) / 2;
    t.prevMid = prev.set + (t.fajr - prev.set) / 2;
    t.nextFajr = next.fajr;
    return t;
  }
  const round = t => Math.round(t / MIN) * MIN;
  const hm = (t, tz) => new Intl.DateTimeFormat('fa-IR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(round(t)));
  const dur = ms => { const m = Math.max(1, Math.ceil(ms / MIN)), h = Math.floor(m / 60), r = m % 60; return h ? `${toFa(h)} ساعت${r ? ` و ${toFa(r)} دقیقه` : ''}` : `${toFa(r)} دقیقه`; };
  window.prayerTimes = (iso, L) => times(iso, L || CITIES[0]); // برای آزمایش و استفاده‌های بعدی (مثلاً اعلان اذان)

  // ---------- پیش‌نمایش مدیر: ‎?date=2027-02-20‎ (یا ‎?date=2027-02-20T17:30‎ به وقت شهر) فقط با ‎#admin‎ امروز را جابه‌جا می‌کند ----------
  // برای آزمودن حالت رمضان و مناسبت‌ها؛ برای بازدیدکننده عادی (بدون ‎#admin‎) هیچ اثری ندارد.
  const T0 = Date.now();
  function clock(tz) {
    const real = Date.now(); if (location.hash !== '#admin') return real;
    let m = null; try { m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(new URLSearchParams(location.search).get('date') || ''); } catch {}
    if (!m || !(+m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31)) return real;
    if (m[4] == null) return real + isoMs(`${m[1]}-${m[2]}-${m[3]}`) - isoMs(ymd(real, tz));
    // ساعت داده‌شده به وقت همان شهر؛ از لحظه باز شدن صفحه جلو می‌رود
    const g = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]), p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(g));
    const v = t => +p.find(x => x.type === t).value, local = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'));
    return g - (local - g) + (real - T0);
  }
  const faked = () => location.hash === '#admin' && /[?&]date=\d{4}-/.test(location.search);

  // ---------- تاریخ قمری (با همان جابه‌جایی مدیر در ibadat.js) ----------
  const off = () => { const h = window.siteSettings?.notify?.hijri; return Number.isInteger(h) && Math.abs(h) <= 2 ? h : 0; };
  let HP = null;
  try { HP = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric' }); if (!/islamic/.test(HP.resolvedOptions().calendar)) HP = null; } catch { HP = null; }
  const hijri = iso => { if (!HP) return null; const p = HP.formatToParts(new Date(isoMs(iso) + off() * DAY + 432e5)), g = t => +p.find(x => x.type === t).value; return { m: g('month'), d: g('day') }; };
  const addDays = (iso, n) => new Date(isoMs(iso) + n * DAY).toISOString().slice(0, 10);
  const hijriLabel = iso => window.ibadat?.hijriLabel?.(iso) || '';
  function shamsi(iso) {
    const d = new Date(isoMs(iso) + 432e5), w = new Intl.DateTimeFormat('fa-IR', { timeZone: 'UTC', weekday: 'long' }).format(d);
    const p = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(d), g = t => p.find(x => x.type === t)?.value || '';
    return `${w}، ${g('day')} ${g('month')} ${g('year')}`;
  }

  // ---------- مناسبت‌ها ----------
  // [ماه قمری، روز، عنوان، تعطیل رسمی]. روز 'end' یعنی روز آخر ماه (۲۹ یا ۳۰).
  // مطابق تقویم رسمی ایران (مرکز تقویم مؤسسه ژئوفیزیک دانشگاه تهران) و مفاتیح‌الجنان؛ ولادت‌ها و شهادت‌هایی که در تقویم رسمی نیامده
  // از قول مشهور (همان که در مفاتیح و تقویم‌های مذهبی ایران آمده).
  const OCC = [
    [1, 1, 'آغاز ماه محرم و سال نو قمری'], [1, 2, 'ورود کاروان امام حسین (ع) به کربلا'],
    [1, 9, 'تاسوعای حسینی', 1], [1, 10, 'عاشورای حسینی', 1], [1, 25, 'شهادت امام زین‌العابدین (ع)'],
    [2, 7, 'ولادت امام موسی کاظم (ع)'], [2, 20, 'اربعین حسینی', 1], [2, 28, 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)', 1],
    [2, 'end', 'شهادت امام رضا (ع)', 1],
    [3, 1, 'هجرت پیامبر اکرم (ص) از مکه به مدینه'], [3, 8, 'شهادت امام حسن عسکری (ع)', 1], [3, 9, 'آغاز امامت حضرت ولی‌عصر (عج)'],
    [3, 12, 'ولادت پیامبر اکرم (ص) به روایت اهل سنت؛ آغاز هفته وحدت'], [3, 17, 'ولادت پیامبر اکرم (ص) و امام جعفر صادق (ع)', 1],
    [4, 8, 'ولادت امام حسن عسکری (ع)'], [4, 10, 'وفات حضرت معصومه (س)'],
    [5, 5, 'ولادت حضرت زینب (س)؛ روز پرستار'], [5, 13, 'شهادت حضرت فاطمه زهرا (س) به روایت ۷۵ روز'],
    [6, 3, 'شهادت حضرت فاطمه زهرا (س)', 1], [6, 13, 'وفات حضرت ام‌البنین (س)'], [6, 20, 'ولادت حضرت فاطمه زهرا (س)؛ روز زن و مادر'],
    [7, 1, 'ولادت امام محمد باقر (ع)'], [7, 3, 'شهادت امام علی النقی الهادی (ع)'], [7, 10, 'ولادت امام محمد تقی الجواد (ع)'],
    [7, 13, 'ولادت امام علی (ع)؛ روز پدر', 1], [7, 15, 'وفات حضرت زینب (س)'], [7, 25, 'شهادت امام موسی کاظم (ع)'], [7, 27, 'عید مبعث', 1],
    [8, 3, 'ولادت امام حسین (ع)'], [8, 4, 'ولادت حضرت ابوالفضل العباس (ع)'], [8, 5, 'ولادت امام زین‌العابدین (ع)'],
    [8, 11, 'ولادت حضرت علی‌اکبر (ع)؛ روز جوان'], [8, 15, 'نیمه شعبان، ولادت حضرت ولی‌عصر (عج)', 1],
    [9, 1, 'آغاز ماه مبارک رمضان'], [9, 10, 'وفات حضرت خدیجه (س)'], [9, 15, 'ولادت امام حسن مجتبی (ع)'],
    [9, 19, 'ضربت خوردن امام علی (ع)'], [9, 21, 'شهادت امام علی (ع)', 1],
    [10, 1, 'عید سعید فطر', 1], [10, 25, 'شهادت امام جعفر صادق (ع)', 1],
    [11, 1, 'ولادت حضرت معصومه (س)؛ آغاز دهه کرامت'], [11, 11, 'ولادت امام رضا (ع)'], [11, 25, 'دحو الارض'],
    [11, 'end', 'شهادت امام محمد تقی الجواد (ع)'],
    [12, 1, 'سالروز ازدواج امام علی (ع) و حضرت فاطمه (س)'], [12, 7, 'شهادت امام محمد باقر (ع)'], [12, 9, 'روز عرفه'],
    [12, 10, 'عید سعید قربان', 1], [12, 15, 'ولادت امام علی النقی الهادی (ع)'], [12, 18, 'عید سعید غدیر خم', 1],
    [12, 24, 'روز مباهله'], [12, 25, 'نزول سوره هل أتی']
  ];
  // شب‌ها (شبِ پیش از این روز قمری): غروبِ روز قبل تا اذان صبح همین روز
  const NIGHTS = [[8, 15, 'شب نیمه شعبان'], [9, 19, 'شب قدر (شب نوزدهم)'], [9, 21, 'شب قدر (شب بیست‌ویکم)'], [9, 23, 'شب قدر (شب بیست‌وسوم)'],
    [10, 1, 'شب عید فطر'], [12, 10, 'شب عید قربان']];
  const SHAMSI = { '01-01': 'آغاز سال نو و نوروز' };
  const isEnd = iso => { const a = hijri(iso), b = hijri(addDays(iso, 1)); return a && b && b.m !== a.m; };
  const wd = iso => new Date(isoMs(iso)).getUTCDay(); // ۰ یکشنبه … ۴ پنجشنبه، ۵ جمعه
  function occasions(iso) {
    const h = hijri(iso), out = [];
    if (h) {
      for (const [m, d, t, hol] of OCC) if (m === h.m && (d === h.d || (d === 'end' && isEnd(iso)))) out.push({ t, hol });
      if (h.m === 9 && wd(iso) === 5 && hijri(addDays(iso, 7))?.m !== 9) out.push({ t: 'روز جهانی قدس' });
      if (h.m === 1 && h.d <= 8) out.push({ t: `دهه اول محرم (${toFa(h.d)} محرم)`, soft: 1 });
    }
    const sh = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', month: '2-digit', day: '2-digit' }).formatToParts(new Date(isoMs(iso) + 432e5));
    const k = `${sh.find(x => x.type === 'month').value}-${sh.find(x => x.type === 'day').value}`;
    if (SHAMSI[k]) out.push({ t: SHAMSI[k] });
    return out;
  }
  // شبِ پیش رو (iso روزی است که این شب پیش از آن است)
  function nightOf(iso) {
    const h = hijri(iso), out = [];
    if (h) for (const [m, d, t] of NIGHTS) if (m === h.m && d === h.d) out.push(t);
    if (h && h.m === 7 && h.d <= 7 && wd(iso) === 5) out.push('لیلة الرغائب (شب اولین جمعه ماه رجب)');
    return out;
  }

  // ---------- مفاتیح‌الجنان ----------
  // ندبه، جوشن کبیر، عرفه و اربعین از بخش مفاتیح (mafatih.js، books/mafatih/<شماره>.json) باز می‌شوند، اگر آن بخش روشن باشد.
  const mf = () => !!window.mafatih?.openKey && shown('mafatih');

  // ---------- اعمال امروز ----------
  // هر سطر: { ic, t (عنوان)، s (زمان)، go: 'ib:نوع' برای برگه‌های ibadat.js یا 'rd:کلید' برای خواننده متن }
  function acts(iso, T, now) {
    const out = [], d = wd(iso), h = hijri(iso) || { m: 0, d: 0 };
    const beforeFajr = now < T.fajr, afterMag = now >= T.mag, day = !beforeFajr && !afterMag;
    // «امشب»: پیش از اذان صبح، شبِ امروز است؛ بعد از آن شبِ فردا.
    const eve = beforeFajr ? iso : addDays(iso, 1), ed = wd(eve), tonight = 'امشب';
    const add = (go, ic, t, s) => { if (go && !out.some(x => x.go === go)) out.push({ go, ic, t, s }); };
    const he = hijri(eve) || { m: 0, d: 0 };
    // مناسبت‌ها
    if (h.m === 1 && h.d <= 10 && !beforeFajr) add('rd:ashura', '🏴', 'زیارت عاشورا', h.d === 10 ? 'روز عاشورا' : 'دهه اول محرم');
    if (he.m === 9 && [19, 21, 23].includes(he.d)) { if (mf()) add('mf:049', '🌙', 'دعای جوشن کبیر', `${tonight}، شب قدر`); }
    if (he.m === 8 && he.d === 15) add('ib:doa_kumayl', '📿', 'دعای کمیل', `${tonight}، شب نیمه شعبان`);
    if (h.m === 12 && h.d === 9 && !beforeFajr) { if (mf()) add('mf:171', '🤲', 'دعای عرفه امام حسین (ع)', 'عصر روز عرفه'); }
    if (h.m === 2 && h.d === 20 && !beforeFajr) { if (mf()) add('mf:299', '🏴', 'زیارت اربعین', 'روز اربعین'); }
    const eid = (h.m === 10 && h.d === 1) || (h.m === 12 && (h.d === 10 || h.d === 18));
    // هفتگی
    if ((d === 5 || eid) && day && now < T.dhuhr + 2 * 36e5) { if (mf()) add('mf:336', '🌅', 'دعای ندبه', eid ? 'صبح روز عید' : 'صبح جمعه'); }
    if (d === 3 && day) add('ib:javad_wed', '🤲', 'نماز حاجت امام جواد (ع)', 'امروز، بعد از نماز عصر');
    if (ed === 5 && (d === 4 || beforeFajr)) {
      const k = window.ibadat?.khatm?.(), thu = beforeFajr ? addDays(iso, -1) : iso, i = k ? k.indexOf(thu) : -1;
      if (i >= 0) add('ib:ommolbanin', '📖', `ختم یاسین حضرت ام‌البنین (س)`, `${tonight}، شب ${['اول', 'دوم', 'سوم', 'چهارم'][i]} ختم`);
      add('ib:doa_kumayl', '📿', 'دعای کمیل', `${tonight}، شب جمعه`);
    }
    if (ed === 3 && (d === 2 || beforeFajr)) add('ib:doa_tavassul', '📿', 'دعای توسل', `${tonight}، شب چهارشنبه`);
    if (d === 5 && day) add('ib:doa_samat', '📿', 'دعای سمات', 'عصر جمعه، پیش از غروب');
    return out.slice(0, 4);
  }

  // ---------- ظاهر ----------
  const css = `
#dlCard{--dl-h:var(--deep);--dl-m:var(--muted);--dl-soft:var(--mint);--dl-line:var(--line);display:block;margin:6px 0 16px;padding:8px 12px;background:var(--cream);color:var(--ink);text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);line-height:1.7;font-size:16px;text-align:right}
html[data-bg] #dlCard{--dl-h:var(--t-head);--dl-m:var(--t-ink2);--dl-soft:color-mix(in srgb,var(--t-frame) 13%,var(--t-paper));--dl-line:var(--t-line);background:var(--t-paper);color:var(--t-ink);padding:12px 34px;margin:30px 24px}
#dlCard[hidden]{display:none}
#dlCard .dl-date{margin:0;text-align:center;font-size:14.5px;font-weight:600;color:var(--dl-h)}
#dlCard .dl-date small{display:block;font-size:13.5px;font-weight:500;color:var(--dl-m)}
#dlCard .dl-occ{margin:4px 0 0;padding:0;list-style:none;text-align:center}
#dlCard .dl-occ li{font-weight:600;color:var(--dl-h);font-size:16px}
#dlCard .dl-occ li.soft{font-weight:500;color:var(--dl-m);font-size:14.5px}
#dlCard .dl-occ .hol{display:inline-block;margin-inline-start:6px;padding:0 7px;border-radius:var(--pill);font-size:12px;font-weight:600;line-height:1.7;color:#9b2636;border:1px solid #d9a3a3;vertical-align:middle}
html[data-bg=dark] #dlCard .dl-occ .hol{color:#f0a7a7;border-color:#8a4a4a}
#dlCard button{font:inherit;text-shadow:none;filter:none}
#dlCard .dl-next{display:flex;align-items:center;gap:8px;width:100%;height:auto;min-height:52px;margin:6px 0 0;padding:4px 10px;background:var(--dl-soft);color:inherit;border:1px solid var(--dl-line);border-radius:var(--r);white-space:normal;text-align:right;font-weight:500;line-height:1.6;cursor:pointer}
#dlCard .dl-next:hover,#dlCard .dl-act:hover{background:color-mix(in srgb,var(--dl-soft) 70%,var(--gold) 30%)}
#dlCard .dl-next:focus-visible,#dlCard .dl-act:focus-visible{outline:2px solid var(--dl-h);outline-offset:2px}
#dlCard .dl-ic{flex:none;font-size:20px;line-height:1}
#dlCard .dl-cd{flex:1;min-width:0}
#dlCard .dl-cd b{color:var(--dl-h)}
#dlCard .dl-cd small{display:block;font-size:13.5px;color:var(--dl-m)}
#dlCard .dl-chev{display:inline-block;margin-inline-start:6px;font-size:12px;transition:transform .2s}
#dlCard .dl-next[aria-expanded=true] .dl-chev{transform:rotate(180deg)}
#dlCard .dl-more{margin:8px 0 2px}
#dlCard .dl-more[hidden]{display:none}
#dlCard .dl-times{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:0;padding:0;list-style:none}
#dlCard .dl-times li{padding:4px 2px;border-radius:var(--r);text-align:center;line-height:1.5}
#dlCard .dl-times li span{display:block;font-size:13px;white-space:nowrap}
#dlCard .dl-times li b{display:block;font-size:17px;font-weight:600}
#dlCard .dl-times li.past{color:var(--dl-m);opacity:.7}
#dlCard .dl-times li.next{background:var(--dl-soft);box-shadow:inset 0 0 0 1px var(--gold);font-weight:600;color:var(--dl-h)}
#dlCard .dl-city{display:flex;gap:8px;margin-top:8px}
#dlCard .dl-city select{flex:1;width:auto;min-width:0;height:44px;padding:0 8px;font-size:15px}
#dlCard .dl-city .dl-gps{flex:none;height:44px;padding:0 12px;background:#fff;color:var(--dl-h);border:1px solid var(--gold);font-size:14.5px;font-weight:600}
html[data-bg=dark] #dlCard .dl-city .dl-gps,html[data-bg=dark] #dlCard .dl-city select{background:#2a2420;color:var(--t-ink)}
#dlCard .dl-note{margin:6px 0 0;font-size:13px;color:var(--dl-m);text-align:center}
#dlCard .dl-note:empty{display:none}
#dlCard .dl-acts{margin:6px 0 0;display:grid;gap:4px}
#dlCard .dl-act{display:flex;align-items:center;gap:10px;width:100%;height:auto;min-height:46px;padding:2px 10px;background:transparent;color:inherit;border:1px solid var(--dl-line);border-radius:var(--r);white-space:normal;text-align:right;font-weight:500;line-height:1.5;cursor:pointer}
#dlCard .dl-act span:nth-child(2){flex:1;min-width:0}
#dlCard .dl-act b{color:var(--dl-h);font-weight:600}
#dlCard .dl-act small{display:block;font-size:13px;color:var(--dl-m)}
#dlCard .dl-act .dl-go{flex:none;color:var(--dl-m);font-size:18px}
.site-foot.dl-hide{display:none}
@media(max-width:600px){html[data-bg] #dlCard{margin:26px 18px;padding:10px 20px}#dlCard .dl-next{padding:4px 8px}#dlCard .dl-city{flex-wrap:wrap}#dlCard .dl-city select{flex-basis:100%}#dlCard .dl-city .dl-gps{flex:1}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  const NAMES = { fajr: 'اذان صبح', rise: 'طلوع آفتاب', dhuhr: 'اذان ظهر', set: 'غروب آفتاب', mag: 'اذان مغرب', mid: 'نیمه‌شب شرعی' };
  let card = null, open = false, note = '', timer = 0, lastKey = '';

  function place() {
    if (card?.isConnected) return card;
    const intro = document.getElementById('introPanel'); if (!intro) return null;
    card = document.createElement('section'); card.id = 'dlCard'; card.setAttribute('aria-label', 'امروز');
    const head = intro.querySelector('.intro-head'); // ظاهر با زمینه (home.js): کادر جدا زیر کادر نام سایت
    if (head) { card.className = 'bgx-frame bgx-in'; head.after(card); setTimeout(() => card.classList.add('bgx-done'), 1300); }
    else (intro.querySelector(':scope > .tagline') || intro.querySelector(':scope > h2'))?.after(card);
    card.addEventListener('click', onClick);
    card.addEventListener('change', e => { if (e.target.matches('.dl-city select')) { const v = e.target.value; if (v !== 'gps') { saveLoc({ id: v }); note = ''; render(); } } });
    return card;
  }

  function render() {
    const P = shown('prayer'), D = shown('today'), foot = document.querySelector('.site-foot');
    if (!P && !D) { clearInterval(timer); timer = 0; if (card) card.remove(); foot?.classList.remove('dl-hide'); return; }
    const L = loc(), now = clock(L.tz), iso = ymd(now, L.tz);
    let T = times(iso, L);
    const occ = D ? occasions(iso) : [], nights = D ? nightOf(now < T.fajr ? iso : addDays(iso, 1)) : [];
    const list = D ? acts(iso, T, now) : [];
    // بلوک‌های دیگر (مثلاً حالت رمضان در ramadan.js) زیر تاریخ و مناسبت‌ها
    const ctx = { L, iso, T, now };
    const extra = hooks.block.map(f => { try { return f(ctx) || ''; } catch (e) { console.error(e); return ''; } }).join('');
    const hasToday = occ.length || nights.length || list.length || extra;
    if (!P && !hasToday) { if (card) card.remove(); foot?.classList.remove('dl-hide'); clearInterval(timer); timer = 0; return; }
    if (!place()) return;
    card.hidden = false;
    foot?.classList.add('dl-hide'); // تاریخ پایین صفحه همین‌جا آمده است
    let html = `<p class="dl-date">${faked() ? '🧪 ' : ''}${esc(shamsi(iso))}${hijriLabel(iso) ? `<small>${esc(hijriLabel(iso))}${L.tz !== IR ? `، به وقت ${esc(L.short || L.name)}` : ''}</small>` : ''}</p>`;
    if (occ.length || nights.length) html += `<ul class="dl-occ">${occ.map(o => `<li${o.soft ? ' class="soft"' : ''}>${esc(o.t)}${o.hol ? '<span class="hol">تعطیل</span>' : ''}</li>`).join('')}${nights.map(t => `<li>امشب: ${esc(t)}</li>`).join('')}</ul>`;
    html += extra;
    if (P) html += prayerHtml(L, iso, T, now);
    if (list.length) html += `<div class="dl-acts">${list.map(a => `<button type="button" class="dl-act" data-go="${esc(a.go)}"><span class="dl-ic" aria-hidden="true">${a.ic}</span><span><b>${esc(a.t)}</b><small>${esc(a.s)}</small></span><span class="dl-go" aria-hidden="true">‹</span></button>`).join('')}</div>`;
    // جلوگیری از ساختن دوباره وقتی چیزی عوض نشده (فوکوس و انتخاب فهرست شهر از دست نرود)
    if (html !== lastKey) { const f = document.activeElement, sel = f && card.contains(f) && f.matches('select'); if (!sel) { card.innerHTML = html; lastKey = html; } }
    if (!timer) timer = setInterval(() => { if (!document.hidden) render(); }, 20000);
  }

  function prayerHtml(L, iso, T, now) {
    const ev = ['fajr', 'rise', 'dhuhr', 'set', 'mag', 'mid'].map(k => ({ k, t: round(T[k]) }));
    // اذان بعدی برای شمارش معکوس (صبح، ظهر، مغرب؛ و طلوع آفتاب که پایان وقت نماز صبح است)
    const targets = [['fajr', round(T.fajr)], ['rise', round(T.rise)], ['dhuhr', round(T.dhuhr)], ['mag', round(T.mag)], ['fajr', round(T.nextFajr)]];
    const nx = targets.find(([, t]) => t > now) || targets[4];
    const just = [['fajr', round(T.fajr)], ['dhuhr', round(T.dhuhr)], ['mag', round(T.mag)]].find(([, t]) => now >= t && now - t < 10 * MIN);
    const label = k => k === 'rise' ? 'طلوع آفتاب' : NAMES[k];
    const main = just ? `<b>هم‌اکنون وقت ${label(just[0])} است</b>` : `<b>${dur(nx[1] - now)}</b> تا ${label(nx[0])}`;
    const sub = `${label(nx[0])}${nx[1] === targets[4][1] && nx[0] === 'fajr' && targets[0][1] <= now ? ' فردا' : ''} ${hm(nx[1], L.tz)} (${esc(L.short || L.name)})`;
    // ردیف پررنگ جدول همان اذانی است که شمارش معکوس برای آن است (اذان صبح فردا در جدول امروز نیست).
    const nextRow = nx === targets[4] ? '' : nx[0];
    const opts = c => `<option value="${c.id}"${c.id === L.id ? ' selected' : ''}>${esc(c.name)}</option>`;
    return `<button type="button" class="dl-next" aria-expanded="${open}" aria-controls="dlMore"><span class="dl-ic" aria-hidden="true">🕌</span><span class="dl-cd">${main}<small>${sub}<span class="dl-chev" aria-hidden="true">▾</span></small></span></button>
<div class="dl-more" id="dlMore"${open ? '' : ' hidden'}><ul class="dl-times">${ev.map(e => `<li class="${e.k === nextRow ? 'next' : e.t <= now ? 'past' : ''}"><span>${NAMES[e.k]}</span><b>${hm(e.t, L.tz)}</b></li>`).join('')}</ul>
<div class="dl-city"><select aria-label="شهر">${L.id === 'gps' ? `<option value="gps" selected>${esc(L.name)}</option>` : ''}<optgroup label="ایران">${CITIES.map(opts).join('')}</optgroup><optgroup label="خارج از ایران">${ABROAD.map(opts).join('')}</optgroup></select>${navigator.geolocation ? '<button type="button" class="dl-gps">📍 موقعیت من</button>' : ''}</div>
${hooks.more.map(f => { try { return f({ L, iso, T, now }) || ''; } catch (e) { console.error(e); return ''; } }).join('')}<p class="dl-note" aria-live="polite">${esc(note)}</p></div>`;
  }

  function onClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('dl-next')) {
      open = !open; b.setAttribute('aria-expanded', open);
      card.querySelector('.dl-more').hidden = !open; lastKey = '';
      return;
    }
    if (b.classList.contains('dl-gps')) {
      note = 'در حال پیدا کردن موقعیت…'; lastKey = ''; render();
      navigator.geolocation.getCurrentPosition(p => {
        let tz = IR; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || IR; } catch {}
        saveLoc({ id: 'gps', lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), tz });
        note = ''; lastKey = ''; render();
      }, err => {
        note = err.code === 1 ? 'اجازه دسترسی به موقعیت داده نشد؛ می‌توانید شهر را از فهرست انتخاب کنید.' : 'موقعیت پیدا نشد؛ لطفاً شهر را از فهرست انتخاب کنید.';
        lastKey = ''; render();
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 6 * 36e5 });
      return;
    }
    const go = b.dataset.go; if (!go) return;
    const [kind, key] = go.split(':');
    if (kind === 'ib') window.ibadat?.open?.(key);
    else if (kind === 'rd') window.chlRead?.(key);
    else if (kind === 'mf') window.mafatih?.openKey(key);
  }

  // برای فایل‌های دیگر: شهر انتخابی، اوقات، تاریخ قمری (با جابه‌جایی مدیر) و جای افزودن بلوک به کارت.
  // block(ctx): زیر تاریخ؛ more(ctx): در بخش باز‌شونده اوقات شرعی، زیر انتخاب شهر. هر کدام HTML برمی‌گرداند (یا '').
  const hooks = { block: [], more: [] };
  window.daily = {
    loc, times, hijri, addDays, hm, dur, round, clock, ymd, toFa, esc,
    block: f => { hooks.block.push(f); refresh(); }, more: f => { hooks.more.push(f); refresh(); }, refresh: () => refresh()
  };
  function refresh() { lastKey = ''; render(); }
  ['features:changed', 'settings:changed'].forEach(ev => document.addEventListener(ev, () => { lastKey = ''; render(); }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  render();
})();
