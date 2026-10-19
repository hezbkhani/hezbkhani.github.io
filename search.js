// جستجوی سایت (امکان search): دکمه 🔎 در سربرگ منوی ☰ (menu.js) و کلید «/» روی رایانه.
// خود برگه جستجو (search-page.js) فقط با اولین باز کردن بار می‌شود تا صفحه اول سبک‌تر باشد.
// بخش‌های دیگر هم می‌توانند فهرست خودشان را بدهند: siteSearch.add({ group: 'duas'|'courses'|'sections', title, sub, ic, keys, run, on }) ؛ on() اختیاری: فقط وقتی true است دیده می‌شود
(function () {
  const shown = () => !!window.features?.shown('search');
  const extra = [];
  let loading = null;
  const load = () => loading || (loading = new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'search-page.js?v=1';
    s.onload = ok; s.onerror = () => { loading = null; s.remove(); bad(); };
    document.head.appendChild(s);
  }));
  function open(q) {
    if (!shown()) return;
    load().then(() => window.siteSearchPage.open(q)).catch(() => alert('بارگذاری جستجو انجام نشد. اینترنت را بررسی کنید.'));
  }
  const isOpen = () => document.body.classList.contains('srch-lock');

  // ---------- دکمه 🔎 در سربرگ منو ----------
  function sync() {
    const b = document.querySelector('.sm [data-sm-search]');
    if (b) b.hidden = !shown();
  }
  document.addEventListener('click', e => { if (e.target.closest('.sm [data-sm-search]')) { window.siteMenu?.close(); setTimeout(() => open(), 280); } });
  document.addEventListener('features:changed', sync);
  sync();
  // «/» روی رایانه: باز کردن جستجو (نه وقتی در کادر نوشتنی هستیم)
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || !shown() || isOpen()) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    if (document.querySelector('.sm.show')) { window.siteMenu.close(); setTimeout(() => open(), 280); } else open();
  }, true);

  window.siteSearch = {
    open,
    extra,
    add(x) { if (x && x.title && typeof x.run === 'function') extra.push(x); }
  };
})();
