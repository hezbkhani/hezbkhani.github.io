// نصب سایت به‌صورت برنامه: دکمه نصب (Chrome/Edge/اندروید)، راهنمای آیفون، و پیوند دانلود اندروید، ویندوز و مک.
// فعلاً فقط در پیش‌نمایش مدیر (آدرس با ‎#admin‎)؛ برای نمایش به همه، PREVIEW_ONLY را false کنید.
// فایل‌های برنامه را GitHub Actions می‌سازد (.github/workflows/apps.yml) و در بخش Releases همین مخزن می‌گذارد.
(function () {
  const PREVIEW_ONLY = true;
  const DL = 'https://github.com/hezbkhani/hezbkhani.github.io/releases/latest/download/';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua), isMac = !isIOS && /Macintosh/.test(ua), isWin = /Windows/.test(ua);
  // داخل خود برنامه (نصب‌شده، اندروید، یا نسخه ویندوز/مک) این بخش لازم نیست.
  const desktopApp = (() => { try { if (/[?&]app=desktop\b/.test(location.search)) sessionStorage.setItem('hezbApp', '1'); return sessionStorage.getItem('hezbApp') === '1'; } catch { return /[?&]app=desktop\b/.test(location.search); } })();
  const inApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || desktopApp;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';

  // سرویس‌ورکر برای نسخه آفلاین و قابلیت نصب؛ همان فایلی که یادآوری روزانه هم استفاده می‌کند.
  if ('serviceWorker' in navigator && (enabled() || inApp)) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (inApp) return;

  document.head.insertAdjacentHTML('beforeend', `<style>
.ins-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}
.ins-grid a{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:76px;padding:8px;background:rgba(255,255,255,.92);color:var(--deep);border:1px solid var(--gold);border-radius:var(--r-card);text-decoration:none;text-shadow:none;font-weight:700;line-height:1.5}
.ins-grid a small{font-weight:400;font-size:13px;color:var(--muted)}
.ins-grid a.mine{background:var(--cream);box-shadow:inset 0 0 0 2px var(--gold)}
.ins-box{margin-top:12px;padding:10px 16px;border-radius:var(--r-card);background:var(--cream);border:1px solid var(--gold);color:#000;text-shadow:none;line-height:1.8}
.ins-box ol{margin:4px 0;padding-inline-start:22px;list-style-type:persian}
.ins-box p{margin:0}
#insBtn{margin-top:4px}
@media(max-width:600px){.ins-grid{grid-template-columns:1fr 1fr}.ins-grid a{min-height:64px}}
</style>`);

  const sec = document.createElement('section');
  sec.className = 'panel'; sec.id = 'installSection'; sec.hidden = true;
  const item = (file, name, note, mine) => `<a href="${DL}${file}" class="${mine ? 'mine' : ''}" rel="noopener">${name}<small>${note}</small></a>`;
  const links = [
    ['Hezbkhani.apk', 'اندروید', 'فایل <bdi dir="ltr">.apk</bdi>', isAndroid],
    ['Hezbkhani-Setup.exe', 'ویندوز', 'فایل <bdi dir="ltr">.exe</bdi>', isWin],
    ['Hezbkhani.dmg', 'مک', 'فایل <bdi dir="ltr">.dmg</bdi>', isMac]
  ].sort((a, b) => b[3] - a[3]);
  sec.innerHTML = `<h2>نصب برنامه</h2>
<p class="lead">سایت را مثل یک برنامه روی گوشی یا رایانه خود نصب کنید تا با یک لمس باز شود. همه نسخه‌ها دقیقاً همین سایت‌اند.</p>
<button type="button" id="insBtn" hidden>نصب برنامه روی این دستگاه</button>
<div class="ins-box" id="insIOS" hidden><p><strong>آیفون و آیپد:</strong> این سایت را در Safari باز کنید، سپس:</p><ol><li>دکمه اشتراک‌گذاری <span aria-hidden="true">(مربع با فلش رو به بالا)</span> را بزنید.</li><li>گزینه «Add to Home Screen» یا «افزودن به صفحه اصلی» را انتخاب کنید.</li><li>«Add» را بزنید. نماد حزب‌خوانی روی صفحه اصلی می‌آید و یادآوری روزانه هم از همان‌جا کار می‌کند.</li></ol></div>
<p class="hint">دانلود برای دستگاه‌های دیگر:</p>
<nav class="ins-grid">${links.map(l => item(...l)).join('')}<a href="#" id="insIOSLink">آیفون و آیپد<small>افزودن به صفحه اصلی</small></a></nav>
<div class="ins-box" id="insWarn"><p>این فایل‌ها امضای تجاری ندارند، پس بار اول هشدار می‌بینید:</p><ol><li><strong>اندروید:</strong> اجازه «نصب برنامه‌های ناشناس» را برای مرورگر بدهید.</li><li><strong>ویندوز:</strong> روی «More info» و سپس «Run anyway» بزنید.</li><li><strong>مک:</strong> فایل را باز کنید و برنامه را به Applications بکشید؛ اگر باز نشد، از System Settings ‹ Privacy &amp; Security گزینه «Open Anyway» را بزنید.</li></ol></div>`;
  const anchor = document.getElementById('adminSection');
  anchor ? anchor.before(sec) : document.querySelector('main').appendChild(sec);

  const btn = sec.querySelector('#insBtn'), ios = sec.querySelector('#insIOS');
  if (isIOS) ios.hidden = false;
  sec.querySelector('#insIOSLink').addEventListener('click', e => { e.preventDefault(); ios.hidden = false; ios.scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  let deferred = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({}));
    if (outcome === 'accepted') { btn.hidden = true; deferred = null; }
  });
  addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; });

  const show = () => { sec.hidden = !enabled(); };
  show(); addEventListener('hashchange', show);
})();
