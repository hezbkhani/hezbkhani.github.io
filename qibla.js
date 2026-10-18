// قبله‌نما (امکان qibla در features.js): فقط دکمه منو اینجاست (در دسته‌ای که calendar.js می‌سازد)؛ خود قبله‌نما (qibla-page.js) با اولین باز کردن بار می‌شود.
(function () {
  const shown = () => !!window.features?.shown('qibla');
  let loading = null;
  const load = () => loading || (loading = new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'qibla-page.js?v=1';
    s.onload = ok; s.onerror = () => { loading = null; s.remove(); bad(); };
    document.head.appendChild(s);
  }));
  function open() {
    if (!shown()) return;
    load().then(() => window.qiblaPage.open()).catch(() => alert('بارگذاری قبله‌نما انجام نشد. اینترنت را بررسی کنید.'));
  }
  // دکمه منو در همان دسته «تقویم و قبله» که calendar.js می‌سازد.
  const menuItem = () => shown() ? '<button type="button" class="sm-item" data-qb-menu><span class="sm-ic">🧭</span><span>قبله‌نما<small>جهت قبله با قطب‌نمای گوشی</small></span><span class="sm-go">‹</span></button>' : '';
  document.addEventListener('click', e => { if (e.target.closest('[data-qb-menu]')) { window.siteMenu?.close(); setTimeout(open, 280); } });
  document.addEventListener('features:changed', () => { window.siteMenu?.refresh(); if (!shown()) window.qiblaPage?.close(); });
  window.qibla = { open, menuItem };
})();
