// نمودارهای مدیریت (شناسه امکان: dashboard): کارت جمع‌شده «آمار و نمودارها» بالای زبانه «گزارش‌ها» در ‎#admin‎.
// این فایل فقط وقتی آن زبانه باز شود، dashboard-view.js را بارگذاری می‌کند؛ داده از تابع dash_stats (backend/supabase/dashboard.sql).
(function () {
  let app = null;
  const load = () => app || (app = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'dashboard-view.js?v=1';
    s.onload = () => (window.dashView ? res(window.dashView) : rej(Error('load')));
    s.onerror = () => { app = null; rej(Error('load')); };
    document.body.appendChild(s);
  }));
  function go() {
    const pane = document.getElementById('pane-reports');
    if (!window.features?.shown('dashboard')) { document.getElementById('dashCard')?.remove(); return; }
    if (pane && !pane.hidden) load().then(a => a.mount(pane), () => {});
  }
  document.addEventListener('admin:tab', e => { if (e.detail === 'reports') go(); });
  document.addEventListener('features:changed', go);
})();
