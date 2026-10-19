// گزارش استفاده از سایت، بدون ابزار بیرونی و بدون اطلاعات شخصی (جدول و تابع‌ها: backend/supabase/usage.sql).
// هر گوشی هر مورد را روزی یک بار می‌شمارد: بازدید آن روز، برنامه یا مرورگر، گوشی یا رایانه، گروه حزب‌خوانی خودش،
// هر بخشی که باز می‌کند (از روی ردیف تاریخچه‌ای که آن بخش می‌سازد، مثل { qr: 1 } قرآن‌خوان) و هر گزینه‌ای که در منوی ☰ می‌زند.
// فقط وقتی مدیر در ‎#admin‎ › گزارش‌ها › «گزارش استفاده از سایت» شمارش را روشن کرده باشد (site_settings › usage.enabled)؛ در ‎#admin‎ چیزی شمرده نمی‌شود.
// همان کارت مدیر را هم usage-view.js می‌سازد که فقط هنگام باز شدن زبانه «گزارش‌ها» بارگذاری می‌شود.
(function () {
  const cfg = window.APP_CONFIG || {};
  const SEEN = 'usageSeen', FIRST = 'usageFirst';
  const on = () => location.hash !== '#admin' && window.siteSettings?.usage?.enabled === true;
  const today = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date()); } catch { return new Date().toISOString().slice(0, 10); } };
  const seen = () => { try { const s = JSON.parse(localStorage.getItem(SEEN)); return s && s.d === today() ? s : { d: today(), k: [] }; } catch { return { d: today(), k: [] }; } };
  let queue = [], ready = false, timer = 0;

  function hit(kind, key) {
    key = String(key ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!key || location.hash === '#admin') return;
    const id = kind + ':' + key;
    if (seen().k.includes(id) || queue.some(h => h[0] + ':' + h[1] === id)) return;
    queue.push([kind, key]);
    if (ready) { clearTimeout(timer); timer = setTimeout(flush, 3000); }
  }
  function flush(final) {
    clearTimeout(timer);
    if (!queue.length || !ready || !cfg.SUPABASE_URL) return;
    if (!on()) { queue = []; return; }
    const hits = queue.splice(0, 40);
    // پیش از رسیدن جواب «دیده‌شده» ثبت می‌شود تا با بستن سریع صفحه دوباره فرستاده نشود؛ اگر نرسید، برمی‌گردد.
    const s = seen(); s.k.push(...hits.map(h => h[0] + ':' + h[1]));
    try { localStorage.setItem(SEEN, JSON.stringify(s)); } catch {}
    const back = () => { const t = seen(); t.k = t.k.filter(k => !hits.some(h => h[0] + ':' + h[1] === k)); try { localStorage.setItem(SEEN, JSON.stringify(t)); } catch {} };
    fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/usage_hit`, {
      method: 'POST', keepalive: !!final,
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_hits: hits })
    }).then(r => { if (!r.ok && r.status >= 500) back(); }, back);
    if (queue.length) flush(final);
  }

  function start() {
    hit('visit', 'all');
    try { if (!localStorage.getItem(FIRST)) { localStorage.setItem(FIRST, today()); hit('visit', 'new'); } } catch {}
    const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    hit('env', app ? 'app' : 'browser');
    hit('env', matchMedia('(pointer: coarse)').matches ? 'phone' : 'desktop');
    try { const g = JSON.parse(localStorage.getItem('me'))?.g; if (g) hit('group', g); } catch {}
  }

  // بخش‌ها: هر برگه تمام‌صفحه هنگام باز شدن یک ردیف تاریخچه با کلید خودش می‌سازد (menu.js برای منو: sm که شمرده نمی‌شود).
  // (chelleh.js برگه‌ای را که از منو باز می‌شود با replaceState جای ردیف منو می‌گذارد؛ پس هر دو دیده می‌شوند.)
  const SKIP = new Set(['sm']);
  ['pushState', 'replaceState'].forEach(fn => {
    const orig = history[fn];
    history[fn] = function (state) {
      try {
        const prev = history.state || {};
        if (state && typeof state === 'object') Object.keys(state).forEach(k => { if (!SKIP.has(k) && !prev[k] && /^[a-z]{2,6}$/.test(k)) hit('section', k); });
      } catch {}
      return orig.apply(this, arguments);
    };
  });
  // پیوند مستقیم اعلان‌ها و صفحه اول (مثل ?doa=… یا قرآن آزاد) هم برگه‌ها را با همین ردیف‌ها باز می‌کنند، پس جداگانه شمرده نمی‌شوند.

  // گزینه‌های منوی ☰: عنوان اصلی گزینه (بدون توضیح کوچک زیرش)
  document.addEventListener('click', e => {
    const b = e.target.closest?.('.sm .sm-item'); if (!b) return;
    const t = [...b.children].find(c => !c.classList.contains('sm-ic') && !c.classList.contains('sm-go') && c.tagName === 'SPAN');
    if (!t) return;
    const label = [...t.childNodes].filter(n => n.nodeType === 3 || n.tagName === 'B').map(n => n.textContent).join(' ');
    hit('menu', label || t.textContent);
  }, true);

  // اولین ارسال پس از رسیدن تنظیمات سایت (رویداد settings:changed از admin.js)
  // (اگر تنظیمات پیش از این فایل رسیده بود یا هرگز نرسید، پس از ۸ ثانیه با همان چه هست.)
  function begin() {
    if (ready) return;
    ready = true;
    if (on()) { start(); timer = setTimeout(flush, 3000); } else queue = [];
  }
  document.addEventListener('settings:changed', begin);
  setTimeout(begin, 8000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  addEventListener('pagehide', () => flush(true));

  // ---------- مدیر: کارت «گزارش استفاده از سایت» در زبانه «گزارش‌ها» ----------
  let view = null;
  const load = () => view || (view = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'usage-view.js?v=1';
    s.onload = () => (window.usageView ? res(window.usageView) : rej(Error('load')));
    s.onerror = () => { view = null; rej(Error('load')); };
    document.body.appendChild(s);
  }));
  function admin() {
    const pane = document.getElementById('pane-reports');
    if (pane && !pane.hidden) load().then(v => v.mount(pane), () => {});
  }
  document.addEventListener('admin:tab', e => { if (e.detail === 'reports') admin(); });
  if (document.getElementById('pane-reports')) admin();
})();
