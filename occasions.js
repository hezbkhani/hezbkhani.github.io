// مناسبت‌های قمری روی صفحه اول: در محرم و صفر، فاطمیه، رمضان و اعیاد، زیر سرصفحه نوار نام مناسبت و یک آیه مناسب می‌آید،
// و اگر مدیر برای آن مناسبت زمینه‌ای انتخاب کرده باشد، صفحه با همان زمینه باز می‌شود (به‌جای زمینه تصادفی).
// زمینه‌ای که کاربر خودش در منو ثابت کرده (bgPick) دست نمی‌خورد. در ایام سوگواری روبان مشکی گوشه صفحه هم نشان داده می‌شود.
// تنظیم در site_settings با کلید theme: { mode: 'auto'|'off', offset: -2..2, bg: { muharram, fatimiyya, ramadan, eid: شناسه زمینه } }.
// زمینه مناسبت می‌تواند یکی از زمینه‌های همیشگی یا تصویری باشد که مدیر در «زمینه‌های صفحه اول» افزوده؛
// اگر آن تصویر را آنجا خاموش کنید، در روزهای عادی نشان داده نمی‌شود و فقط برای مناسبت می‌ماند.
// فعلاً فقط در پیش‌نمایش مدیر (آدرس با ‎#admin‎)؛ برای نمایش به همه، PREVIEW_ONLY را false کنید. به backdrop.js و admin.js نیاز دارد.
(function () {
  const PREVIEW_ONLY = true;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  const TZ = 'Asia/Tehran';
  const KINDS = { muharram: 'محرم و صفر', fatimiyya: 'فاطمیه', ramadan: 'ماه رمضان', eid: 'اعیاد' };
  const MOURNING = ['muharram', 'fatimiyya'];

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
  const conf = () => window.siteSettings?.theme || {};
  const offset = () => { const o = +(conf().offset || 0); return Number.isFinite(o) ? Math.max(-2, Math.min(2, o)) : 0; };
  function occasionOn(ms) {
    const h = hijri(ms); if (!h) return null;
    const lastDay = hijri(ms + DAY).m !== h.m, key = h.m * 100 + h.d;
    const at = (m, d) => m * 100 + (d === 30 && m === h.m && lastDay ? h.d : d);
    for (const [m1, d1, m2, d2, theme, label, verse] of OCCASIONS) {
      if (key >= at(m1, d1) && key <= at(m2, d2)) return { theme, label, verse: verse || theme, hijri: h };
    }
    return { theme: '', label: '', verse: '', hijri: h };
  }
  const today = () => tehranNoon() + offset() * DAY;

  // ---------- زمینه ----------
  const STYLES = ['night', 'sage', 'blue', 'garden', 'dark'];
  const NAMES = () => window.bgxNames || {};
  // همه زمینه‌ها، حتی تصویرهایی که مدیر برای روزهای عادی خاموش کرده
  function allBgs() {
    const s = window.siteSettings?.backgrounds || {};
    const out = ['night', 'sage', 'blue', 'garden'].map(id => ({ id, style: id, name: NAMES()[id] || id }));
    (s.custom || []).forEach(c => { if (c && STYLES.includes(c.style) && /^https:\/\/[^"'()\s\\]+$/.test(c.url || '')) out.push(c); });
    return out;
  }
  const userPinned = () => { try { return !!localStorage.getItem('bgPick'); } catch { return false; } };

  // ---------- نمایش ----------
  const css = `
.occ{display:flex;flex-direction:column;align-items:center;gap:4px;margin:0 auto 10px;text-align:center}
.occ-name{display:inline-block;padding:2px 18px;font-weight:700;font-size:16px;color:#fff;background:var(--deep);border:1px solid var(--gold);border-radius:99px;box-shadow:0 4px 14px #0005;text-shadow:none}
html[data-occ=muharram] .occ-name,html[data-occ=fatimiyya] .occ-name{background:#111}
.occ-verse{margin:0;font:normal 22px/2 SiteFont,Tahoma,serif;color:#fff;text-shadow:0 1px 3px #000,0 0 12px #000c}
.occ-verse small{display:block;font:500 12px/1.4 Vazirmatn,Tahoma,sans-serif;opacity:.85}
.occ-sash{position:fixed;top:0;left:0;width:96px;height:96px;z-index:30;pointer-events:none;background:linear-gradient(135deg,transparent 0 34%,#000 34% 52%,transparent 52%)}
@media(max-width:600px){.occ-verse{font-size:19px}.occ-sash{width:72px;height:72px}}
.occ-grid{display:grid;grid-template-columns:auto 1fr auto;gap:6px 8px;align-items:center;margin:8px 0}
.occ-grid select{height:40px;font-size:15px}
.occ-grid button{height:40px;font-size:14px;padding:0 10px}
.occ-up{margin:6px 0 0;padding:0;list-style:none;font-size:15px}
.occ-up li{padding:4px 0;border-bottom:1px solid #f0e8d6}`;
  let sim = null; // پیش‌نمایش موقت مدیر: نوع مناسبت (فقط روی همین گوشی)
  let bgBefore = null;

  function current() {
    if (sim) { const o = OCCASIONS.find(r => r[4] === sim && !/^(تاسوعا|شهادت|رحلت|اربعین|لیالی|عید|میلاد)/.test(r[5])) || OCCASIONS.find(r => r[4] === sim); return { theme: sim, label: o[5], verse: o[6] || sim }; }
    if (conf().mode === 'off') return null;
    const o = occasionOn(today());
    return o && o.theme ? o : null;
  }

  function apply() {
    const r = document.documentElement, head = document.querySelector('main > header');
    const o = enabled() ? current() : null;
    document.querySelectorAll('.occ,.occ-sash').forEach(e => e.remove());
    if (!o) {
      delete r.dataset.occ;
      if (bgBefore && window.bgxApply) { window.bgxApply(bgBefore); bgBefore = null; }
      return;
    }
    r.dataset.occ = o.theme;
    if (head) {
      const [ar, ref] = VERSES[o.verse] || VERSES[o.theme] || VERSES.default;
      head.insertAdjacentHTML('beforeend', `<div class="occ"><span class="occ-name">${o.label}</span><p class="occ-verse">﴿ ${ar} ﴾<small>${ref}</small></p></div>`);
    }
    if (MOURNING.includes(o.theme)) document.body.insertAdjacentHTML('afterbegin', '<div class="occ-sash" aria-hidden="true"></div>');
    // زمینه مناسبت، فقط اگر صفحه با زمینه‌ها باز شده (نه «ظاهر قبلی») و کاربر زمینه‌ای را ثابت نکرده
    const id = (conf().bg || {})[o.theme], e = id && allBgs().find(x => x.id === id);
    if (e && r.dataset.bg && window.bgxApply && (sim || !userPinned()) && window.bgxCur?.id !== e.id) {
      if (!bgBefore) bgBefore = window.bgxCur;
      window.bgxApply(e);
    }
  }

  // ---------- کارت تنظیمات مدیر ----------
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    if (!pane || document.getElementById('occCard')) return;
    const card = document.createElement('div'); card.className = 'adm-card'; card.id = 'occCard';
    pane.appendChild(card);
    card.addEventListener('change', async e => {
      const t = e.target, c = { mode: 'auto', offset: 0, bg: {}, ...conf() };
      if (t.name === 'occMode') c.mode = t.value;
      else if (t.id === 'occOffset') c.offset = +t.value;
      else if (t.dataset.occBg) c.bg = { ...c.bg, [t.dataset.occBg]: t.value || undefined };
      else return;
      const m = card.querySelector('#occMsg');
      try { await window.saveSiteSetting('theme', c); m.className = 'adm-msg adm-ok'; m.textContent = 'ذخیره شد.'; apply(); fill(); }
      catch (err) { m.className = 'adm-msg adm-bad'; m.textContent = err.message; }
    });
    card.addEventListener('click', e => {
      const b = e.target.closest('[data-occ-try]'); if (!b) return;
      sim = sim === b.dataset.occTry ? null : b.dataset.occTry; apply(); fill();
      if (sim) scrollTo({ top: 0, behavior: 'smooth' });
    });
    fill();
  }
  function fill() {
    const card = document.getElementById('occCard'); if (!card) return;
    const c = conf(), o = occasionOn(today()), bgs = allBgs();
    card.innerHTML = `<h3>مناسبت‌ها</h3>
<p class="hint">در ایام محرم و صفر، فاطمیه، رمضان و اعیاد، بالای صفحه نام مناسبت و یک آیه نشان داده می‌شود. برای هر مناسبت می‌توانید زمینه‌ای انتخاب کنید (مثلاً تصویری مشکی برای محرم که در «زمینه‌های صفحه اول» افزوده و برای روزهای عادی خاموش کرده‌اید). «امتحان» فقط روی همین گوشی نشان می‌دهد.</p>
<p class="hint" style="color:var(--ink)">امروز: <strong>${faHijri(today())}</strong>${o?.label ? ' · ' + o.label : ' · مناسبتی نیست'}</p>
<label class="adm-opt"><input type="radio" name="occMode" value="auto"${c.mode === 'off' ? '' : ' checked'}> <span>خودکار بر اساس تقویم قمری</span></label>
<label class="adm-opt"><input type="radio" name="occMode" value="off"${c.mode === 'off' ? ' checked' : ''}> <span>خاموش</span></label>
<div class="occ-grid">${Object.entries(KINDS).map(([k, n]) => `<b>${n}</b><select data-occ-bg="${k}" aria-label="زمینه ${n}"><option value="">زمینه عادی (بدون تغییر)</option>${bgs.map(e => `<option value="${esc(e.id)}"${(c.bg || {})[k] === e.id ? ' selected' : ''}>${esc(e.name || NAMES()[e.id] || e.id)}${e.on === false ? ' (فقط مناسبت)' : ''}</option>`).join('')}</select><button type="button" class="reg-light" data-occ-try="${k}">${sim === k ? 'پایان امتحان' : 'امتحان'}</button>`).join('')}</div>
<label for="occOffset">تنظیم تاریخ قمری با تقویم رسمی ایران</label>
<select id="occOffset">${[-2, -1, 0, 1, 2].map(v => `<option value="${v}"${v === offset() ? ' selected' : ''}>${v === 0 ? 'بدون تغییر' : (v < 0 ? fa(-v) + ' روز عقب‌تر' : fa(v) + ' روز جلوتر')}</option>`).join('')}</select>
<div class="adm-msg" id="occMsg"></div>
<h3 style="margin-top:12px">مناسبت‌های پیش رو</h3><ul class="occ-up">${upcoming().map(x => `<li><strong>${x.o.label}</strong> · ${faDate(x.ms)}</li>`).join('')}</ul>`;
  }

  // ---------- راه‌اندازی ----------
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  window.siteOccasion = { occasionOn, today, apply };
  apply();
  addEventListener('hashchange', apply);
  document.addEventListener('settings:changed', () => { apply(); fill(); });
  document.addEventListener('admin:tab', e => { if (e.detail === 'settings') { buildCard(); fill(); } });
  { const p0 = document.getElementById('pane-settings'); if (p0 && !p0.hidden) buildCard(); }
  setInterval(apply, 30 * 60 * 1000);
})();
