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
  document.querySelectorAll('main > header, main > .panel, main .bgx-frame').forEach(watch);
  // کادرهایی که فایل‌های دیگر بعداً اضافه می‌کنند (چله‌های من، ثبت‌نام، نصب برنامه)
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('panel') && !n.classList.contains('bgx-in')) watch(n); })))
    .observe(main, { childList: true });
})();

// پنجره وسط: کادرها فقط داخل قاب وسط تصویر زمینه می‌آیند و می‌روند (بالا و پایینش محو می‌شود)،
// نه روی گل‌ها و گوشه‌ها. جای قاب در هر تصویر (نسبت به عرض و ارتفاع تصویر): چپ، بالا، راست، پایین.
// در پیش‌نمایش مدیر (‎#admin‎) صفحه مثل قبل کامل اسکرول می‌شود.
(function () {
  const root = document.documentElement, k = root.dataset.bg;
  const WIN = { night: [.06, .21, .94, .74], sage: [.13, .23, .88, .76], blue: [.19, .19, .82, .80], garden: [.08, .27, .92, .77] };
  const SIZE = { night: [1024, 1536], sage: [1024, 1536], blue: [864, 1221], garden: [941, 1672] };
  if (!WIN[k]) return;
  const main = document.querySelector('main'), foot = document.querySelector('.site-foot');
  if (foot) main.append(foot); // تاریخ هم داخل همان پنجره، آخر صفحه
  function layout() {
    const on = location.hash !== '#admin';
    root.classList.toggle('bgx-win', on);
    if (!on) return;
    const vw = innerWidth, vh = innerHeight, [iw, ih] = SIZE[k], [l, t, r, b] = WIN[k];
    // همان اندازه‌ای که backdrop.css به تصویر می‌دهد: صفحه باریک «cover»، صفحه پهن تصویر کامل در وسط
    let w, h;
    if (vw / vh < 4 / 5) { const s = Math.max(vw / iw, vh / ih); w = iw * s; h = ih * s; }
    else { h = vh; w = iw / ih * vh; }
    const x0 = (vw - w) / 2;
    const L = Math.max(4, x0 + l * w), R = Math.min(vw - 4, x0 + r * w);
    const T = Math.max(8, t * h), B = Math.min(vh - 8, b * h);
    const st = main.style;
    st.setProperty('--win-l', `${Math.round(L)}px`); st.setProperty('--win-w', `${Math.round(R - L)}px`);
    st.setProperty('--win-t', `${Math.round(T)}px`); st.setProperty('--win-h', `${Math.round(B - T)}px`);
  }
  layout();
  addEventListener('resize', layout); addEventListener('hashchange', layout);
})();
