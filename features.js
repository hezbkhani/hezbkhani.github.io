// امکانات تازه: هر کدام را مدیر در «مدیریت › تنظیمات › امکانات سایت» برای همه روشن یا خاموش می‌کند (site_settings با کلید features:
// { [شناسه]: true }) و هر بازدیدکننده در «منوی ☰ › تنظیمات › نمایش امکانات» می‌تواند هر کدام را برای خودش پنهان کند (localStorage: featHide).
// تا مدیر روشن نکرده، فقط در پیش‌نمایش ‎#admin‎ دیده می‌شوند.
// استفاده در فایل‌های دیگر: features.shown('prayer') ؛ با هر تغییر رویداد features:changed روی document فرستاده می‌شود.
(function () {
  const LIST = [
    ['prayer', '🕌', 'اوقات شرعی', 'ساعت اذان‌ها در صفحه اول و زمان مانده تا اذان بعدی'],
    ['today', '🗓️', 'امروز', 'مناسبت امروز و دعا و اعمال سفارش‌شده، در صفحه اول'],
    ['saved', '🔖', 'نشانه‌ها و یادداشت‌ها', 'نشانه گذاشتن، رنگ کردن و یادداشت روی آیه‌ها'],
    ['audioplus', '🔁', 'تکرار آیه و زمان‌سنج خواب', 'در تنظیمات صوت قرآن‌خوان'],
    ['mafatih', '📚', 'مفاتیح‌الجنان', 'همه دعاها، زیارات و اعمال در منوی «ادعیه»', true],
    ['zekr', '📿', 'ذکرشمار', 'شمارنده ذکر و صلوات و نذر جمعی صلوات'],
    ['search', '🔎', 'جستجو', 'یک جستجو برای آیه‌ها، دعاها، دوره‌ها و تنظیمات'],
    ['comfort', '🔠', 'اندازه متن و حالت تاریک', 'اندازه و فاصله خطوط و حالت تاریک برای همه بخش‌ها'],
    ['share', '🖼️', 'اشتراک تصویری', 'ساختن تصویر زیبا از یک آیه یا فراز دعا'],
    ['hifz', '🧠', 'حالت حفظ', 'پنهان کردن متن آیه‌ها و نمایش کلمه به کلمه هنگام حفظ'],
    ['azan', '🔔', 'یادآوری اذان', 'اعلان اذان صبح، ظهر و مغرب برای شهر انتخاب‌شده'],
    ['ramadan', '🌙', 'حالت رمضان', 'سحر و افطار، دعای هر روز و برنامه ختم، فقط در ماه رمضان'],
    ['khatm', '📗', 'ختم گروهی جزء به جزء', 'هر کس یک جزء برمی‌دارد و همه می‌بینند چه مانده است'],
    ['chlcal', '🟩', 'تقویم و گواهی چله', 'جدول ۴۰ روزه هر چله و تصویر پایان چله'],
    ['mine', '🏠', 'نوران من', 'یک صفحه برای دوره‌ها، کارهای امروز، نشانه‌ها و خلاصه ماه'],
    ['plans', '🎯', 'برنامه ختم شخصی', 'ختم قرآن در ۳۰، ۶۰ یا ۱۲۰ روز با سهم هر روز'],
    ['calendar', '📅', 'تقویم مناسبت‌ها', 'تقویم ماه با مناسبت‌ها و اعمال هر روز'],
    ['qibla', '🧭', 'قبله‌نما', 'جهت قبله با قطب‌نمای گوشی یا روی نقشه'],
    ['dashboard', '📊', 'نمودارهای مدیریت', 'آمار گزارش‌ها و اعضا در بخش مدیریت'],
    ['tour', '💡', 'راهنمای سایت', 'آشنایی قدم‌به‌قدم با بخش‌ها؛ بار اول خودش باز می‌شود', true]
  ];
  const HIDE = 'featHide';
  const admin = () => location.hash === '#admin';
  const conf = () => window.siteSettings?.features || {};
  // این امکان‌ها نمایش/پنهانِ خودشان را در منوی ⚙ قرآن‌خوان دارند (qr-plus.js)، نه در برگه «نمایش امکانات».
  // حالت حفظ پنهان نمی‌شود: ردیف روشن/خاموش خودش در همان منو کافی است.
  const READER = ['saved', 'share', 'audioplus', 'hifz'];
  const hidden = () => { try { return (JSON.parse(localStorage.getItem(HIDE)) || []).filter(x => x !== 'hifz'); } catch { return []; } };
  // ستون پنجم فهرست: true یعنی تا مدیر خاموش نکرده روشن است (مثل مفاتیح که پیش از این امکانات هم در سایت بود).
  const def = id => LIST.some(f => f[0] === id && f[4] === true);
  const on = id => admin() || (conf()[id] ?? def(id)) === true;
  const shown = id => on(id) && !hidden().includes(id);
  const fire = () => document.dispatchEvent(new Event('features:changed'));
  const setHidden = (id, hide) => {
    const h = hidden().filter(x => x !== id); if (hide) h.push(id);
    try { localStorage.setItem(HIDE, JSON.stringify(h)); } catch {}
    fire();
  };

  // بخش‌های صفحه اول که به هیچ امکانی بسته نیستند (کادرهای معرفی، اطلاعیه، نصب): hide-x.js هر کدام را با features.addSection ثبت می‌کند
  // و بازدیدکننده با ✕ همان بخش یا از همین برگه پنهانش می‌کند (localStorage: secHide). get/set دلخواه برای بخشی که کلید خودش را دارد (نصب).
  const SEC = 'secHide', sections = [];
  const secList = () => { try { const a = JSON.parse(localStorage.getItem(SEC)); return Array.isArray(a) ? a : []; } catch { return []; } };
  const secOf = id => sections.find(s => s.id === id);
  const secShown = id => { const s = secOf(id); return s?.get ? s.get() : !secList().includes(id); };
  const setSecHidden = (id, hide) => {
    const s = secOf(id);
    if (s?.set) s.set(hide);
    else { const h = secList().filter(x => x !== id); if (hide) h.push(id); try { localStorage.setItem(SEC, JSON.stringify(h)); } catch {} }
    fire();
  };
  const addSection = d => { const i = sections.findIndex(s => s.id === d.id); i < 0 ? sections.push(d) : sections.splice(i, 1, d); };
  const secAvail = () => sections.filter(s => !s.avail || s.avail());

  // «بازگشت به حالت پیش‌فرض»: فقط ترجیح‌های نمایش. داده‌های شخصی (نشانه‌ها، ذکرها، ختم و برنامه‌ها، ثبت‌نام‌ها و کدها، شهر اوقات شرعی،
  // اعلان‌ها، حساب، تصویر زمینه خود شخص) دست نمی‌خورند. از تنظیمات خواننده‌ها فقط اندازه و نمایش؛ قاری و مترجم انتخاب‌شده می‌ماند.
  const RESET_KEYS = [HIDE, SEC, 'comfort', 'installClosed', 'bgPick', 'smOpen', 'qrPlus'];
  const RESET_FIELDS = { quranReader: ['size', 'trans', 'night', 'intro', 'tafsir', 'mode'], chlReader: ['size', 'trans', 'night'], bookReader: ['size', 'trans', 'night'] };
  function resetDisplay() {
    RESET_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    Object.entries(RESET_FIELDS).forEach(([k, f]) => {
      try { const v = JSON.parse(localStorage.getItem(k)); if (v && typeof v === 'object') { f.forEach(x => delete v[x]); localStorage.setItem(k, JSON.stringify(v)); } } catch {}
    });
    // تنظیمات خواننده‌ها هنگام بار شدن صفحه خوانده می‌شود؛ پس صفحه از نو بار می‌شود و پیام تأیید پس از آن نشان داده می‌شود.
    try { sessionStorage.setItem('ftReset', '1'); } catch {}
    location.reload();
  }
  function toast(t) {
    const d = document.createElement('div'); d.className = 'ft-toast'; d.setAttribute('role', 'status'); d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 4000);
  }
  try { if (sessionStorage.getItem('ftReset')) { sessionStorage.removeItem('ftReset'); setTimeout(() => toast('نمایش سایت به حالت پیش‌فرض برگشت.'), 300); } } catch {}

  const css = `
.ft-shade{position:fixed;inset:0;z-index:62;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.ft-box{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:14px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007}
.ft-box h2{margin:4px 0 2px;font:normal 30px/1.6 SiteFont,Tahoma,serif;color:var(--deep);text-align:center}
.ft-box>p{margin:0 0 8px;text-align:center;color:var(--muted);font-size:15px}
.ft-x{float:left;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.ft-row{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--line);cursor:pointer;font-weight:500;margin:0}
.ft-row:last-child{border-bottom:0}
.ft-row .ft-ic{flex:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--mint);font-size:19px}
.ft-row span{flex:1;min-width:0;line-height:1.6}
.ft-row small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.ft-sw{appearance:none;-webkit-appearance:none;flex:none;position:relative;width:46px!important;height:26px!important;margin:0;padding:0;border-radius:999px;border:1px solid var(--gold);background:#e8dfcc;cursor:pointer;transition:background .15s}
.ft-sw::after{content:"";position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0004;transition:right .15s}
.ft-sw:checked{background:var(--emerald)}
.ft-sw:checked::after{right:22px}
.ft-sw:focus-visible{outline:2px solid var(--deep);outline-offset:2px}
.ft-empty{text-align:center;color:var(--muted);padding:16px 0}
.ft-adm .ft-row{padding:8px 0}
.ft-box h3{margin:14px 0 0;padding-top:10px;border-top:1px solid var(--line);font-size:16px;color:var(--deep)}
.ft-reset{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);text-align:center}
.ft-reset>button{min-height:44px;padding:0 18px;background:transparent;color:var(--deep);border:1px solid var(--gold);border-radius:var(--r);font:inherit;font-weight:500;cursor:pointer}
.ft-reset p{margin:0 0 10px;color:var(--ink);font-size:14px;line-height:1.8;text-align:right}
.ft-reset .ft-yes{background:var(--deep);color:#fff;border-color:var(--deep);margin-left:8px}
.ft-toast{position:fixed;z-index:70;left:16px;right:16px;width:fit-content;margin:0 auto;bottom:calc(24px + env(safe-area-inset-bottom));padding:10px 18px;border-radius:999px;background:var(--deep);color:#fff;font-size:15px;box-shadow:0 6px 20px #0005;text-align:center}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const row = ([id, ic, t, d], checked, attr) => `<label class="ft-row"><span class="ft-ic">${ic}</span><span>${esc(t)}<small>${esc(d)}</small></span><input type="checkbox" class="ft-sw" ${attr}="${id}"${checked ? ' checked' : ''} aria-label="${esc(t)}"></label>`;

  // ---------- برگه «نمایش امکانات» برای هر بازدیدکننده ----------
  let shade = null;
  function openSettings() {
    const list = LIST.filter(f => on(f[0]) && !READER.includes(f[0]));
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'ft-shade';
      shade.innerHTML = '<div class="ft-box" role="dialog" aria-modal="true" aria-label="نمایش امکانات"></div>';
      shade.addEventListener('click', e => { if (e.target === shade || e.target.closest('.ft-x')) close(); });
      shade.addEventListener('change', e => {
        const t = e.target.closest('[data-ft-user]'); if (t) setHidden(t.dataset.ftUser, !t.checked);
        const s = e.target.closest('[data-ft-sec]'); if (s) setSecHidden(s.dataset.ftSec, !s.checked);
      });
      shade.addEventListener('click', e => {
        const r = shade.querySelector('.ft-reset');
        if (e.target.closest('[data-ft-reset]')) { r.innerHTML = RESET_ASK; r.querySelector('.ft-yes').focus(); }
        else if (e.target.closest('.ft-no')) { r.innerHTML = RESET_BTN; r.querySelector('button').focus(); }
        else if (e.target.closest('.ft-yes')) resetDisplay();
      });
    }
    const h = hidden(), secs = secAvail();
    shade.querySelector('.ft-box').innerHTML = `<button type="button" class="ft-x" aria-label="بستن">✕</button><h2>نمایش امکانات</h2><p>هر چیزی را که لازم ندارید خاموش کنید تا صفحه خلوت‌تر شود. فقط روی همین گوشی است و هر وقت بخواهید برمی‌گردد. امکانات قرآن‌خوان در منوی ⚙ خود قرآن‌خوان است.</p>${list.length ? list.map(f => row(f, !h.includes(f[0]), 'data-ft-user')).join('') : secs.length ? '' : '<p class="ft-empty">فعلاً امکان تازه‌ای روشن نیست.</p>'}${secs.length ? `<h3>بخش‌های صفحه اول</h3>${secs.map(s => row([s.id, s.ic, s.t, s.d], secShown(s.id), 'data-ft-sec')).join('')}` : ''}<div class="ft-reset">${RESET_BTN}</div>`;
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    try { if (!history.state?.ft) history.pushState({ ft: 1 }, ''); } catch {}
    setTimeout(() => shade.querySelector('.ft-x')?.focus(), 50);
  }
  const RESET_BTN = '<button type="button" data-ft-reset>↺ بازگشت به حالت پیش‌فرض</button>';
  const RESET_ASK = '<p>همه امکانات و بخش‌های پنهان‌شده دوباره نمایش داده می‌شوند و اندازه متن، حالت تاریک، زمینه صفحه و نمایش خواننده‌ها به حالت اول برمی‌گردد. نشانه‌ها، ذکرها، ختم‌ها و برنامه‌ها، ثبت‌نام‌ها، شهر اوقات شرعی و اعلان‌ها دست نمی‌خورند.</p><button type="button" class="ft-yes">بله، برگردان</button><button type="button" class="ft-no">انصراف</button>';
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    shade.remove(); document.body.classList.remove('ib-lock');
    if (!fromHistory) { try { if (history.state?.ft) history.back(); } catch {} }
  }
  window.addEventListener('popstate', () => { if (!history.state?.ft) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // ---------- کارت مدیریت: روشن و خاموش کردن هر امکان برای همه ----------
  function adminCard() {
    const pane = document.getElementById('pane-settings');
    if (!pane) return;
    let card = document.getElementById('setFeatures');
    if (!card) {
      card = document.createElement('div'); card.className = 'adm-card ft-adm'; card.id = 'setFeatures';
      pane.prepend(card);
      card.addEventListener('change', async e => {
        const t = e.target.closest('[data-ft-adm]'); if (!t) return;
        const msg = card.querySelector('.adm-msg'), v = { ...conf(), [t.dataset.ftAdm]: t.checked };
        try {
          await window.saveSiteSetting('features', v);
          msg.className = 'adm-msg adm-ok'; msg.textContent = 'ذخیره شد.';
          fire(); window.siteMenu?.refresh();
        } catch (err) { t.checked = !t.checked; msg.className = 'adm-msg adm-bad'; msg.textContent = err.message; }
      });
    }
    const c = conf();
    card.innerHTML = `<h3>امکانات سایت</h3><p class="hint">هر امکان روشن باشد برای همه دیده می‌شود؛ خاموش باشد فقط شما در ‎#admin‎ برای آزمایش می‌بینید. هر بازدیدکننده هم می‌تواند در «منوی ☰ › تنظیمات › نمایش امکانات» هر کدام را برای خودش پنهان کند.</p>${LIST.map(f => row(f, (c[f[0]] ?? def(f[0])) === true, 'data-ft-adm')).join('')}<div class="adm-msg"></div>`;
  }
  document.addEventListener('admin:tab', e => { if (e.detail === 'settings') adminCard(); });
  document.addEventListener('settings:changed', () => { if (document.getElementById('setFeatures')) adminCard(); fire(); });

  window.features = {
    list: LIST, on, shown, openSettings, setHidden, addSection, secShown, setSecHidden, resetDisplay,
    // دکمه منو برای بخش «تنظیمات» (reminders.js)
    menuItem() {
      const mine = LIST.filter(f => on(f[0]) && !READER.includes(f[0])), secs = secAvail();
      if (!mine.length && !secs.length) return '';
      const n = mine.filter(f => shown(f[0])).length + secs.filter(s => secShown(s.id)).length, all = mine.length + secs.length;
      return `<button type="button" class="sm-item" data-ft-menu><span class="sm-ic">🧩</span><span>نمایش امکانات<small>${n === all ? 'همه نمایش داده می‌شوند' : `${n.toLocaleString('fa-IR')} از ${all.toLocaleString('fa-IR')} نمایش داده می‌شوند`}</small></span><span class="sm-go">‹</span></button>`;
    }
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-ft-menu]')) { window.siteMenu?.close(); setTimeout(openSettings, 280); } });
  window.addEventListener('hashchange', fire);
})();
