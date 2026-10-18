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
    ['hifz', '🧠', 'حالت حفظ', 'پنهان کردن متن آیه‌ها و نمایش کلمه به کلمه هنگام حفظ']
  ];
  const HIDE = 'featHide';
  const admin = () => location.hash === '#admin';
  const conf = () => window.siteSettings?.features || {};
  const hidden = () => { try { return JSON.parse(localStorage.getItem(HIDE)) || []; } catch { return []; } };
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
.ft-adm .ft-row{padding:8px 0}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const row = ([id, ic, t, d], checked, attr) => `<label class="ft-row"><span class="ft-ic">${ic}</span><span>${esc(t)}<small>${esc(d)}</small></span><input type="checkbox" class="ft-sw" ${attr}="${id}"${checked ? ' checked' : ''} aria-label="${esc(t)}"></label>`;

  // ---------- برگه «نمایش امکانات» برای هر بازدیدکننده ----------
  let shade = null;
  function openSettings() {
    const list = LIST.filter(f => on(f[0]));
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'ft-shade';
      shade.innerHTML = '<div class="ft-box" role="dialog" aria-modal="true" aria-label="نمایش امکانات"></div>';
      shade.addEventListener('click', e => { if (e.target === shade || e.target.closest('.ft-x')) close(); });
      shade.addEventListener('change', e => { const t = e.target.closest('[data-ft-user]'); if (t) setHidden(t.dataset.ftUser, !t.checked); });
    }
    const h = hidden();
    shade.querySelector('.ft-box').innerHTML = `<button type="button" class="ft-x" aria-label="بستن">✕</button><h2>نمایش امکانات</h2><p>هر چیزی را که لازم ندارید خاموش کنید تا صفحه خلوت‌تر شود. فقط روی همین گوشی است و هر وقت بخواهید برمی‌گردد.</p>${list.length ? list.map(f => row(f, !h.includes(f[0]), 'data-ft-user')).join('') : '<p class="ft-empty">فعلاً امکان تازه‌ای روشن نیست.</p>'}`;
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    try { if (!history.state?.ft) history.pushState({ ft: 1 }, ''); } catch {}
    setTimeout(() => shade.querySelector('.ft-x')?.focus(), 50);
  }
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
    list: LIST, on, shown, openSettings,
    // دکمه منو برای بخش «تنظیمات» (reminders.js)
    menuItem() {
      if (!LIST.some(f => on(f[0]))) return '';
      const n = LIST.filter(f => shown(f[0])).length, all = LIST.filter(f => on(f[0])).length;
      return `<button type="button" class="sm-item" data-ft-menu><span class="sm-ic">🧩</span><span>نمایش امکانات<small>${n === all ? 'همه نمایش داده می‌شوند' : `${n.toLocaleString('fa-IR')} از ${all.toLocaleString('fa-IR')} نمایش داده می‌شوند`}</small></span><span class="sm-go">‹</span></button>`;
    }
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-ft-menu]')) { window.siteMenu?.close(); setTimeout(openSettings, 280); } });
  window.addEventListener('hashchange', fire);
})();
