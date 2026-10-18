// تقویم مناسبت‌ها (امکان calendar در features.js): فقط دکمه منو و پیوند تاریخ کارت «امروز» اینجاست.
// خود تقویم (calendar-page.js) فقط با اولین باز کردن بار می‌شود تا صفحه اول سنگین نشود.
(function () {
  const shown = () => !!window.features?.shown('calendar');
  let loading = null;
  const load = () => loading || (loading = new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'calendar-page.js?v=1';
    s.onload = ok; s.onerror = () => { loading = null; s.remove(); bad(); };
    document.head.appendChild(s);
  }));
  function open(iso) {
    if (!shown()) return;
    load().then(() => window.calPage.open(iso)).catch(() => alert('بارگذاری تقویم انجام نشد. اینترنت را بررسی کنید.'));
  }

  window.siteMenu?.section({
    // یک دسته برای تقویم و قبله‌نما (qibla.js) تا منو شلوغ نشود.
    id: 'calendar', order: 4.8,
    render(box) {
      const q = window.qibla?.menuItem?.() || '';
      if (!shown() && !q) return;
      box.innerHTML = '<h3>تقویم و قبله</h3>' + (shown() ? '<button type="button" class="sm-item" data-cal-menu><span class="sm-ic">🗓️</span><span>تقویم مناسبت‌ها<small>مناسبت‌ها و اعمال هر روز ماه</small></span><span class="sm-go">‹</span></button>' : '') + q;
      box.querySelector('[data-cal-menu]')?.addEventListener('click', () => { window.siteMenu.close(); setTimeout(open, 280); });
    }
  });
  // تاریخ بالای کارت «امروز» (daily.js) وقتی این امکان روشن است data-cal دارد و تقویم را باز می‌کند.
  document.addEventListener('click', e => { if (e.target.closest('#dlCard [data-cal]')) open(); });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('#dlCard [data-cal]')) { e.preventDefault(); open(); } });
  document.addEventListener('features:changed', () => { window.siteMenu?.refresh(); if (!shown()) window.calPage?.close(); });
  window.calendar = { open };
})();
