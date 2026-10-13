// تم قرآنی مناسبتی: لوگو، آیه بالای صفحه، و رنگ‌ها که خودکار بر اساس تقویم قمری عوض می‌شوند
// (رمضان، محرم و صفر، فاطمیه، اعیاد). مدیر در «تنظیمات» می‌تواند تم را ببیند، ثابت کند، یا تاریخ قمری را یک‌دو روز جابه‌جا کند.
// فعلاً فقط در پیش‌نمایش مدیر (آدرس با ‎#admin‎)؛ برای نمایش به همه، PREVIEW_ONLY را false کنید.
(function () {
  const PREVIEW_ONLY = true;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  const TZ = 'Asia/Tehran';

  // ---------- تم‌ها ----------
  const THEMES = {
    default: { name: 'عادی (سبز و طلایی)', emerald: '#007f5f', deep: '#005c45', gold: '#d7aa5b', overlay: 'linear-gradient(#1d120b99,#1d120b99)', filter: 'none', panel: 'rgba(24,15,9,.66)', meta: '#006b50' },
    ramadan: { name: 'ماه رمضان (آبی شب و طلایی)', emerald: '#1f4f8a', deep: '#163a68', gold: '#e8c06a', overlay: 'linear-gradient(#0a1838b3,#081026cc)', filter: 'saturate(.7)', panel: 'rgba(8,18,42,.68)', meta: '#163a68' },
    muharram: { name: 'محرم و صفر (سوگواری، مشکی و قرمز)', emerald: '#7c1d24', deep: '#4f1015', gold: '#b99a66', overlay: 'linear-gradient(#1a0204c4,#000000d8)', filter: 'grayscale(1) brightness(.7)', panel: 'rgba(32,6,9,.72)', meta: '#1a0a0b', mourning: true },
    fatimiyya: { name: 'فاطمیه (سوگواری، مشکی و بنفش)', emerald: '#5b3f6b', deep: '#3a2746', gold: '#c4a77c', overlay: 'linear-gradient(#160a1cc4,#0a050dd8)', filter: 'grayscale(.9) brightness(.7)', panel: 'rgba(26,13,32,.7)', meta: '#1a1020', mourning: true },
    eid: { name: 'اعیاد (فیروزه‌ای و طلایی روشن)', emerald: '#0b8a72', deep: '#086b5a', gold: '#f0c75e', overlay: 'linear-gradient(#063f3870,#0b2a2299)', filter: 'saturate(1.2) brightness(1.12)', panel: 'rgba(5,34,30,.62)', meta: '#086b5a' }
  };

  // آیه‌های بالای صفحه
  const VERSES = {
    default: ['إِنَّ هٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ', 'اسراء ۹'],
    ramadan: ['شَهْرُ رَمَضَانَ الَّذِي أُنْزِلَ فِيهِ الْقُرْآنُ', 'بقره ۱۸۵'],
    qadr: ['إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', 'قدر ۱'],
    muharram: ['وَلَا تَحْسَبَنَّ الَّذِينَ قُتِلُوا فِي سَبِيلِ اللَّهِ أَمْوَاتًا بَلْ أَحْيَاءٌ', 'آل عمران ۱۶۹'],
    fatimiyya: ['إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', 'کوثر ۱'],
    eid: ['قُلْ بِفَضْلِ اللَّهِ وَبِرَحْمَتِهِ فَبِذٰلِكَ فَلْيَفْرَحُوا', 'یونس ۵۸'],
    ghadir: ['الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي', 'مائده ۳'],
    mabath: ['اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ', 'علق ۱'],
    nabi: ['وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِلْعَالَمِينَ', 'انبیاء ۱۰۷'],
    mahdi: ['بَقِيَّتُ اللَّهِ خَيْرٌ لَكُمْ إِنْ كُنْتُمْ مُؤْمِنِينَ', 'هود ۸۶']
  };

  // مناسبت‌ها به تاریخ قمری: [ماه، روز شروع، ماه، روز پایان، تم، عنوان، آیه]. اولین ردیفِ منطبق انتخاب می‌شود، پس ردیف‌های خاص‌تر بالاترند.
  // روز ۳۰ یعنی «آخر ماه» (اگر ماه ۲۹ روزه باشد، روز ۲۹).
  const OCCASIONS = [
    [1, 9, 1, 10, 'muharram', 'تاسوعا و عاشورای حسینی'],
    [2, 20, 2, 20, 'muharram', 'اربعین حسینی'],
    [2, 28, 2, 28, 'muharram', 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)'],
    [2, 30, 2, 30, 'muharram', 'شهادت امام رضا (ع)'],
    [1, 1, 2, 30, 'muharram', 'ایام سوگواری محرم و صفر'],
    [5, 13, 5, 15, 'fatimiyya', 'شهادت حضرت فاطمه زهرا (س) (فاطمیه اول)'],
    [6, 1, 6, 3, 'fatimiyya', 'شهادت حضرت فاطمه زهرا (س) (فاطمیه دوم)'],
    [5, 13, 6, 3, 'fatimiyya', 'ایام فاطمیه'],
    [6, 20, 6, 20, 'eid', 'میلاد حضرت فاطمه زهرا (س)', 'fatimiyya'],
    [7, 13, 7, 13, 'eid', 'میلاد امیرالمؤمنین علی (ع)'],
    [7, 27, 7, 27, 'eid', 'عید مبعث', 'mabath'],
    [8, 3, 8, 5, 'eid', 'اعیاد شعبانیه'],
    [8, 15, 8, 15, 'eid', 'میلاد حضرت مهدی (عج)', 'mahdi'],
    [9, 21, 9, 21, 'ramadan', 'شهادت امیرالمؤمنین علی (ع) · شب قدر', 'qadr'],
    [9, 19, 9, 23, 'ramadan', 'لیالی قدر', 'qadr'],
    [9, 1, 9, 30, 'ramadan', 'ماه مبارک رمضان'],
    [10, 1, 10, 2, 'eid', 'عید سعید فطر'],
    [11, 1, 11, 11, 'eid', 'دهه کرامت'],
    [12, 10, 12, 10, 'eid', 'عید سعید قربان'],
    [12, 18, 12, 18, 'eid', 'عید سعید غدیر خم', 'ghadir'],
    [12, 11, 12, 17, 'eid', 'دهه امامت و ولایت', 'ghadir'],
    [3, 17, 3, 17, 'eid', 'میلاد پیامبر اکرم (ص) و امام جعفر صادق (ع)', 'nabi'],
    [3, 12, 3, 16, 'eid', 'هفته وحدت', 'nabi']
  ];

  // ---------- تاریخ قمری ----------
  const DAY = 86400000;
  const hijriFmt = (() => {
    for (const ca of ['islamic-umalqura', 'islamic-civil', 'islamic']) {
      try { const f = new Intl.DateTimeFormat('en-u-ca-' + ca + '-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }); if (f.resolvedOptions().calendar === ca) return f; } catch {}
    }
    return null;
  })();
  // روز امروز به وقت تهران، ساعت ۱۲ ظهر UTC (برای اینکه مرز روز جابه‌جا نشود)
  function tehranNoon(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, +x.value]));
    return Date.UTC(p.year, p.month - 1, p.day, 12);
  }
  function hijri(ms) {
    if (!hijriFmt) return null;
    const p = Object.fromEntries(hijriFmt.formatToParts(new Date(ms)).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]));
    return { y: p.year, m: p.month, d: p.day };
  }
  const offset = () => { const o = +(window.siteSettings?.theme?.offset || 0); return Number.isFinite(o) ? Math.max(-3, Math.min(3, o)) : 0; };
  function occasionOn(ms) {
    const h = hijri(ms); if (!h) return null;
    const lastDay = hijri(ms + DAY).m !== h.m, key = h.m * 100 + h.d;
    const at = (m, d) => m * 100 + (d === 30 && m === h.m && lastDay ? h.d : d);
    for (const [m1, d1, m2, d2, theme, label, verse] of OCCASIONS) {
      if (key >= at(m1, d1) && key <= at(m2, d2)) return { theme, label, verse: verse || theme, hijri: h };
    }
    return { theme: 'default', label: '', verse: 'default', hijri: h };
  }
  const today = () => tehranNoon() + offset() * DAY;

  // ---------- ظاهر ----------
  const star = (cx, cy, R) => { const r = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8); let s = ''; for (let k = 0; k < 16; k++) { const a = (k * 22.5 - 90) * Math.PI / 180, rr = k % 2 ? r : R; s += `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)} `; } return s; };
  const svgUrl = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  // نقش هندسی ستاره هشت‌پر (همان نشان «حزب» در قرآن) برای پس‌زمینه، و تزیین بالای هر بخش
  const pattern = gold => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><g fill="none" stroke="${gold}" stroke-width="1" opacity=".16"><polygon points="${star(60, 60, 34)}"/><polygon points="${star(60, 60, 20)}"/>${[[0, 0], [120, 0], [0, 120], [120, 120]].map(([x, y]) => `<polygon points="${star(x, y, 20)}"/>`).join('')}</g></svg>`);
  const ornament = gold => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="24"><g fill="${gold}"><rect x="0" y="11" width="78" height="2"/><rect x="122" y="11" width="78" height="2"/><circle cx="83" cy="12" r="2.5"/><circle cx="117" cy="12" r="2.5"/><polygon points="${star(100, 12, 11)}"/></g></svg>`);

  const css = `
html[data-theme] body{background:none;background-color:#120b07}
html[data-theme] body::before{content:"";position:fixed;inset:0;z-index:-2;background:url('background.jpg') center/cover;filter:var(--th-filter)}
html[data-theme] body::after{content:"";position:fixed;inset:0;z-index:-1;background:var(--th-overlay),var(--th-pattern);background-size:auto,120px 120px}
html[data-theme] body .panel{position:relative;background:var(--th-panel);border:1px solid color-mix(in srgb,var(--gold) 40%,transparent);border-top:2px solid var(--gold)}
html[data-theme] .panel::before{content:"";position:absolute;top:-13px;left:50%;width:200px;height:24px;margin-left:-100px;background:var(--th-ornament) center/contain no-repeat;pointer-events:none}
.th-logo{display:block;width:104px;height:104px;margin:0 auto 4px;filter:drop-shadow(0 4px 14px #0009)}
html[data-theme] header{padding-top:6vh}
.th-verse{margin:10px auto 0;max-width:560px;font:normal 26px/2 SiteFont,Tahoma,serif;color:#fff3d6}
.th-verse small{display:block;font:500 13px/1.6 Vazirmatn,Tahoma,sans-serif;opacity:.85}
.th-occ{display:inline-block;margin-top:10px;padding:2px 18px;font-weight:600;font-size:16px;color:#fff;background:var(--deep);border:1px solid var(--gold);box-shadow:0 4px 14px #0006}
html[data-mourning] .th-occ{background:#000}
.th-sash{position:fixed;top:0;left:0;width:110px;height:110px;z-index:20;pointer-events:none;background:linear-gradient(135deg,transparent 0 34%,#000 34% 52%,transparent 52%)}
html[data-mourning] h1{color:#f3ece4}
@media(max-width:600px){.th-logo{width:84px;height:84px}.th-verse{font-size:22px}.th-sash{width:80px;height:80px}}
.th-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin:8px 0}
.th-swatches button{height:auto;min-height:48px;padding:6px;white-space:normal;line-height:1.5;font-size:14px;color:#fff;border:2px solid var(--gold)}
.th-swatches button.on{outline:3px solid #000;outline-offset:1px}
.adm-card .hint,body.v2 .adm-card .hint{color:var(--muted)}
.th-upcoming{margin:6px 0 0;padding:0;list-style:none;font-size:15px}
.th-upcoming li{padding:4px 0;border-bottom:1px solid #f0e8d6}
.th-icons{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px}
.th-icons img{border-radius:18%;box-shadow:0 2px 8px #0003}`;

  let previewId = null; // پیش‌نمایش موقت مدیر (ذخیره نمی‌شود)

  function current() {
    const o = occasionOn(today()), mode = window.siteSettings?.theme?.mode || 'auto';
    const id = previewId || (mode !== 'auto' && THEMES[mode] ? mode : o?.theme || 'default');
    // اگر تم با دست انتخاب شده، عنوان مناسبت فقط وقتی نشان داده می‌شود که به همان تم بخورد.
    const match = o && o.theme === id;
    return { id, label: match ? o.label : '', verse: match ? o.verse : id, occasion: o };
  }

  function clear() {
    const r = document.documentElement;
    delete r.dataset.theme; delete r.dataset.mourning;
    ['--emerald', '--deep', '--gold', '--th-overlay', '--th-filter', '--th-panel', '--th-pattern', '--th-ornament'].forEach(v => r.style.removeProperty(v));
    document.querySelectorAll('.th-logo,.th-verse,.th-occ,.th-sash').forEach(e => e.remove());
    const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = '#006b50';
  }

  function apply() {
    if (!enabled()) { clear(); return; }
    const c = current(), t = THEMES[c.id], r = document.documentElement;
    r.dataset.theme = c.id;
    if (t.mourning) r.dataset.mourning = ''; else delete r.dataset.mourning;
    const set = { '--emerald': t.emerald, '--deep': t.deep, '--gold': t.gold, '--th-overlay': t.overlay, '--th-filter': t.filter, '--th-panel': t.panel, '--th-pattern': pattern(t.gold), '--th-ornament': ornament(t.gold) };
    Object.entries(set).forEach(([k, v]) => r.style.setProperty(k, v));
    const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = t.meta;

    const head = document.querySelector('main > header'); if (!head) return;
    if (!head.querySelector('.th-logo')) head.insertAdjacentHTML('afterbegin', '<img class="th-logo" src="logo/logo.svg" alt="" width="104" height="104">');
    let verse = head.querySelector('.th-verse');
    if (!verse) { verse = document.createElement('p'); verse.className = 'th-verse'; head.appendChild(verse); }
    const [ar, ref] = VERSES[c.verse] || VERSES[c.id] || VERSES.default;
    verse.innerHTML = `﴿ ${ar} ﴾<small>${ref}</small>`;
    let occ = head.querySelector('.th-occ');
    if (c.label) { if (!occ) { occ = document.createElement('div'); occ.className = 'th-occ'; head.appendChild(occ); } occ.textContent = c.label; }
    else if (occ) occ.remove();
    const sash = document.querySelector('.th-sash');
    if (t.mourning && !sash) document.body.insertAdjacentHTML('afterbegin', '<div class="th-sash" aria-hidden="true"></div>');
    else if (!t.mourning && sash) sash.remove();
  }

  // ---------- کارت تنظیمات مدیر ----------
  const faDate = ms => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms));
  const faHijri = ms => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-' + (hijriFmt?.resolvedOptions().calendar || 'islamic'), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms)); } catch { return ''; } };
  function upcoming(n = 6) {
    const out = [], base = today(); let prev = occasionOn(base);
    for (let i = 1; i < 400 && out.length < n; i++) {
      const o = occasionOn(base + i * DAY);
      if (o && o.label && (!prev || o.label !== prev.label)) out.push({ ms: tehranNoon() + i * DAY, o });
      prev = o;
    }
    return out;
  }
  function buildCard() {
    const pane = document.getElementById('pane-settings');
    if (!pane || document.getElementById('thCard')) return;
    const card = document.createElement('div'); card.className = 'adm-card'; card.id = 'thCard';
    card.innerHTML = `<h3>تم و لوگو</h3>
<p class="hint">رنگ‌ها، آیه بالای صفحه و نوار مناسبت، خودکار بر اساس تقویم قمری عوض می‌شوند. با زدن هر رنگ، فقط روی همین گوشی پیش‌نمایش می‌بینید.</p>
<div id="thToday"></div>
<div class="th-swatches" id="thSwatches">${Object.entries(THEMES).map(([k, t]) => `<button type="button" data-th="${k}" style="background:linear-gradient(135deg,${t.deep},${t.emerald})">${t.name}</button>`).join('')}</div>
<label class="adm-opt"><input type="radio" name="thMode" value="auto"> <span>خودکار بر اساس مناسبت (پیشنهادی)</span></label>
<label class="adm-opt"><input type="radio" name="thMode" value="fixed"> <span>همیشه تمی که الان در پیش‌نمایش است</span></label>
<label for="thOffset">تنظیم تاریخ قمری با تقویم رسمی ایران</label>
<select id="thOffset">${[-2, -1, 0, 1, 2].map(v => `<option value="${v}">${v === 0 ? 'بدون تغییر' : (v < 0 ? toFaN(-v) + ' روز عقب‌تر' : toFaN(v) + ' روز جلوتر')}</option>`).join('')}</select>
<p class="hint">اگر تاریخ قمری بالا با تقویم رسمی یک روز فرق داشت، از اینجا درستش کنید.</p>
<div class="adm-msg" id="thMsg"></div>
<h3 style="margin-top:12px">مناسبت‌های پیش رو</h3><ul class="th-upcoming" id="thUpcoming"></ul>
<h3 style="margin-top:12px">لوگوی جدید</h3><p class="hint">برای سایت و آیکون برنامه (اندروید، ویندوز، مک و نصب روی گوشی).</p>
<div class="th-icons"><img src="logo/logo.svg" width="96" height="96" alt="لوگو"><img src="logo/icon-512.png" width="96" height="96" alt="آیکون برنامه"><img src="logo/icon-512.png" width="48" height="48" alt=""><img src="logo/icon-512.png" width="32" height="32" alt=""></div>`;
    pane.prepend(card);
    const msg = (t, ok) => { const e = document.getElementById('thMsg'); e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
    const save = async v => {
      try { await window.saveSiteSetting('theme', Object.assign({ mode: 'auto', offset: 0 }, window.siteSettings?.theme, v)); msg('ذخیره شد. همه بازدیدکنندگان همین را می‌بینند (پس از انتشار عمومی تم).', true); }
      catch (e) { msg(e.message); }
      refreshCard(); apply();
    };
    card.querySelector('#thSwatches').onclick = e => {
      const b = e.target.closest('[data-th]'); if (!b) return;
      previewId = b.dataset.th; apply(); refreshCard();
      if (window.siteSettings?.theme?.mode && window.siteSettings.theme.mode !== 'auto') save({ mode: previewId });
    };
    card.addEventListener('change', e => {
      if (e.target.name === 'thMode') save({ mode: e.target.value === 'auto' ? 'auto' : current().id }).then(() => { if (e.target.value === 'auto') { previewId = null; apply(); refreshCard(); } });
      if (e.target.id === 'thOffset') save({ offset: +e.target.value });
    });
  }
  function toFaN(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
  function refreshCard() {
    if (!document.getElementById('thCard')) return;
    const s = window.siteSettings?.theme || {}, c = current(), o = c.occasion;
    document.getElementById('thToday').innerHTML = `<p class="hint" style="color:var(--ink)">امروز: <strong>${faHijri(today())}</strong>${o?.label ? ' · ' + o.label : ''}<br>تم فعلی: <strong>${THEMES[c.id].name}</strong>${previewId ? ' (پیش‌نمایش)' : ''}</p>`;
    document.querySelectorAll('#thSwatches [data-th]').forEach(b => b.classList.toggle('on', b.dataset.th === c.id));
    document.querySelectorAll('[name=thMode]').forEach(r => (r.checked = (r.value === 'auto') === ((s.mode || 'auto') === 'auto')));
    document.getElementById('thOffset').value = String(offset());
    document.getElementById('thUpcoming').innerHTML = upcoming().map(x => `<li><strong>${x.o.label}</strong> · ${faDate(x.ms)} <span class="hint">(${THEMES[x.o.theme].name.split(' (')[0]})</span></li>`).join('') || '<li>—</li>';
  }

  // ---------- راه‌اندازی ----------
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  window.siteTheme = { THEMES, OCCASIONS, occasionOn, today, apply, preview(id) { previewId = THEMES[id] ? id : null; apply(); refreshCard(); } };
  apply();
  window.addEventListener('hashchange', apply);
  document.addEventListener('settings:changed', () => { apply(); refreshCard(); });
  document.addEventListener('admin:tab', e => { if (e.detail === 'settings') { buildCard(); refreshCard(); } });
  // تاریخ قمری نیمه‌شب عوض می‌شود؛ صفحه‌ای که باز مانده هم به‌روز می‌شود.
  setInterval(apply, 30 * 60 * 1000);
})();
