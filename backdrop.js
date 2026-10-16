// زمینه صفحه اول (backdrop.css): کادرها و عنوان بالای صفحه وقتی به چشم می‌آیند، یکی‌یکی و مرتب وارد می‌شوند.
// خود زمینه را اسکریپت کوچک داخل <head> در index.html انتخاب می‌کند (هر بار یکی غیر از دفعه قبل).
(function () {
  const root = document.documentElement;
  window.bgxReady = true;
  if (!root.dataset.bg || !root.classList.contains('bgx-anim')) return;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.remove('bgx-anim'); return; }

  const io = new IntersectionObserver(entries => {
    const shown = entries.filter(e => e.isIntersecting).map(e => e.target)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
    shown.forEach((el, i) => {
      const delay = i * 140;
      el.style.setProperty('--bgx-d', `${delay}ms`);
      el.classList.add('bgx-in');
      io.unobserve(el);
      // پس از پایان حرکت، انیمیشن برداشته می‌شود تا روی بقیه چیزهای کادر (مثل پنجره‌های باز شونده) اثری نگذارد.
      setTimeout(() => { el.classList.add('bgx-done'); el.style.removeProperty('--bgx-d'); }, delay + 1200);
    });
  }, { rootMargin: '0px 0px -6% 0px' });

  const main = document.querySelector('main');
  const watch = el => { if (!el.classList.contains('bgx-in')) io.observe(el); };
  document.querySelectorAll('main > header, main > .panel').forEach(watch);
  // کادرهایی که فایل‌های دیگر بعداً اضافه می‌کنند (چله‌های من، ثبت‌نام، نصب برنامه)
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('panel')) watch(n); })))
    .observe(main, { childList: true });
})();
