// نصب سایت به‌صورت برنامه: دکمه نصب مرورگر و راهنمای «افزودن به صفحه اصلی» برای آیفون، اندروید و رایانه (برای همه).
// پیوند دانلود فایل‌های برنامه (.apk/.exe/.dmg) فعلاً فقط برای مدیر (آدرس با ‎#admin‎)؛ برای نمایش به همه، FILES_ADMIN_ONLY را false کنید.
// برای برگرداندن کل بخش به پیش‌نمایش مدیر، PREVIEW_ONLY را true کنید.
// فایل‌های برنامه را GitHub Actions می‌سازد (.github/workflows/apps.yml) و در بخش Releases همین مخزن می‌گذارد.
(function () {
  const PREVIEW_ONLY = false, FILES_ADMIN_ONLY = true;
  const DL = 'https://github.com/hezbkhani/hezbkhani.github.io/releases/latest/download/';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua), isMac = !isIOS && /Macintosh/.test(ua), isWin = /Windows/.test(ua);
  // داخل خود برنامه (نصب‌شده، اندروید، یا نسخه ویندوز/مک) این بخش لازم نیست.
  const desktopApp = (() => { try { if (/[?&]app=desktop\b/.test(location.search)) sessionStorage.setItem('hezbApp', '1'); return sessionStorage.getItem('hezbApp') === '1'; } catch { return /[?&]app=desktop\b/.test(location.search); } })();
  const inApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || desktopApp;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  const filesShown = () => !FILES_ADMIN_ONLY || location.hash === '#admin';

  // سرویس‌ورکر برای نسخه آفلاین و قابلیت نصب؛ همان فایلی که یادآوری روزانه هم استفاده می‌کند.
  if ('serviceWorker' in navigator && (enabled() || inApp)) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (inApp) return;

  document.head.insertAdjacentHTML('beforeend', `<style>
.ins-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:12px}
.ins-grid a{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:76px;padding:8px;background:rgba(255,255,255,.92);color:var(--deep);border:1px solid var(--gold);border-radius:var(--r-card);text-decoration:none;text-shadow:none;font-weight:700;line-height:1.5}
.ins-grid a small{font-weight:400;font-size:13px;color:var(--muted)}
.ins-grid a.mine{background:var(--cream);box-shadow:inset 0 0 0 2px var(--gold)}
.ins-box{margin-top:12px;padding:10px 16px;border-radius:var(--r-card);background:var(--cream);border:1px solid var(--gold);color:#000;text-shadow:none;line-height:1.8}
.ins-box ol{margin:4px 0;padding-inline-start:22px;list-style-type:persian}
.ins-box p{margin:0}
.ins-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
#installSection .ins-tabs button{height:40px;padding:0 14px;font-size:15px;background:#fff;color:var(--deep);border:1px solid var(--gold)}
#installSection .ins-tabs button.on{background:var(--deep);color:#fff}
#insBtn{margin-top:4px}
#installSection{position:relative}
.ins-x{position:absolute;top:8px;left:8px;width:40px;height:40px;padding:0;background:transparent;border:0;color:var(--muted);font-size:20px;z-index:1}
.ins-x:hover{background:transparent;color:var(--deep)}
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
  const GUIDES = {
    ios: ['آیفون و آیپد', `<p>این سایت را در <strong>Safari</strong> باز کنید، سپس:</p><ol><li>دکمه اشتراک‌گذاری <span aria-hidden="true">(مربع با فلش رو به بالا)</span> را بزنید.</li><li>گزینه «Add to Home Screen» یا «افزودن به صفحه اصلی» را انتخاب کنید.</li><li>«Add» را بزنید. نماد نوران روی صفحه اصلی می‌آید و یادآوری روزانه هم از همان‌جا کار می‌کند.</li></ol>`],
    android: ['اندروید', `<p>این سایت را در <strong>Chrome</strong> باز کنید، سپس:</p><ol><li>دکمه سه‌نقطه <span aria-hidden="true">(⋮)</span> بالای صفحه را بزنید.</li><li>گزینه «Install app» یا «Add to Home screen» (افزودن به صفحه اصلی) را انتخاب کنید.</li><li>«Install» یا «Add» را بزنید. نماد نوران روی صفحه اصلی گوشی می‌آید.</li></ol>`],
    pc: ['رایانه', `<p>این سایت را در <strong>Chrome</strong> یا <strong>Edge</strong> باز کنید، سپس:</p><ol><li>در نوار آدرس، نماد نصب <span aria-hidden="true">(رایانه با فلش رو به پایین یا ⊕)</span> را بزنید؛ یا از منوی سه‌نقطه گزینه «Install Nooran» یا «Apps ‹ Install this site as an app» را انتخاب کنید.</li><li>«Install» را بزنید. نوران مثل یک برنامه در پنجره خودش باز می‌شود.</li></ol>`]
  };
  const mine = isIOS ? 'ios' : isAndroid ? 'android' : 'pc';
  sec.innerHTML = `<h2>نصب برنامه</h2>
<p class="lead">نوران را روی صفحه اصلی گوشی یا رایانه خود بگذارید تا مثل یک برنامه با یک لمس باز شود. این کار از خود مرورگر انجام می‌شود و هیچ فایلی دانلود نمی‌شود.</p>
<button type="button" id="insBtn" hidden>نصب برنامه روی این دستگاه</button>
<nav class="ins-tabs">${Object.keys(GUIDES).map(k => `<button type="button" data-g="${k}">${GUIDES[k][0]}</button>`).join('')}</nav>
<div class="ins-box" id="insGuide"></div>
<div id="insFiles" hidden><p class="hint">فایل‌های برنامه (فعلاً فقط برای مدیر):</p>
<nav class="ins-grid">${links.map(l => item(...l)).join('')}</nav>
<div class="ins-box"><p>این فایل‌ها امضای تجاری ندارند، پس بار اول هشدار می‌بینید:</p><ol><li><strong>اندروید:</strong> اجازه «نصب برنامه‌های ناشناس» را برای مرورگر بدهید.</li><li><strong>ویندوز:</strong> روی «More info» و سپس «Run anyway» بزنید.</li><li><strong>مک:</strong> فایل را باز کنید و برنامه را به Applications بکشید؛ اگر باز نشد، از System Settings ‹ Privacy &amp; Security گزینه «Open Anyway» را بزنید.</li></ol></div></div>`;
  const anchor = document.getElementById('adminSection');
  anchor ? anchor.before(sec) : document.querySelector('main').appendChild(sec);

  const btn = sec.querySelector('#insBtn'), guide = sec.querySelector('#insGuide');
  const pick = k => { guide.innerHTML = `<p><strong>${GUIDES[k][0]}:</strong></p>` + GUIDES[k][1]; sec.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', b.dataset.g === k)); };
  sec.querySelector('.ins-tabs').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) pick(b.dataset.g); });
  pick(mine);

  let deferred = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({}));
    if (outcome === 'accepted') { btn.hidden = true; deferred = null; }
  });
  addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; });

  // در منوی ☰ هم یک میان‌بر به همین بخش هست.
  window.siteMenu?.section({
    id: 'install', order: 92,
    render(box) {
      if (!enabled()) return;
      box.innerHTML = '<h3>نصب برنامه</h3><button type="button" class="sm-item" data-ins-go><span class="sm-ic">📲</span><span>نصب نوران روی گوشی یا رایانه<small>افزودن به صفحه اصلی در آیفون، اندروید و رایانه</small></span><span class="sm-go">‹</span></button>';
      box.querySelector('[data-ins-go]').onclick = () => { window.siteMenu.close(); fromMenu = true; show(); setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280); };
    }
  });

  // نمایش در صفحه اول با تنظیم مدیر (site_settings.install.mode، زبانه «تنظیمات»):
  // 'always' همیشه · 'dismissible' (پیش‌فرض) با دکمه بستن؛ پس از بستن فقط از منو · 'menu' فقط از منو.
  const CLOSED = 'installClosed';
  const mode = () => window.siteSettings?.install?.mode || 'dismissible';
  const closed = () => { try { return localStorage.getItem(CLOSED) === '1'; } catch { return false; } };
  let fromMenu = false;
  sec.insertAdjacentHTML('afterbegin', '<button type="button" class="ins-x" aria-label="بستن" title="بستن">✕</button>');
  sec.querySelector('.ins-x').onclick = () => { try { localStorage.setItem(CLOSED, '1'); } catch {} fromMenu = false; show(); };
  function show() {
    const m = mode();
    sec.hidden = !enabled() || !(fromMenu || m === 'always' || (m === 'dismissible' && !closed()));
    sec.querySelector('.ins-x').hidden = m === 'always';
    sec.querySelector('#insFiles').hidden = !filesShown();
  }
  show(); addEventListener('hashchange', show); document.addEventListener('settings:changed', show);
})();
