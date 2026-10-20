// دکمه کوچک ✕ روی هر بخش صفحه اول تا بازدیدکننده همان بخش را برای خودش پنهان کند (فقط روی همین گوشی).
// - کارت امروز (اوقات شرعی، مناسبت‌ها، دعای روز هفته) به امکان‌های prayer، today و weekday بسته است و کارت آیه و سخن روز به ayahday و hadithday: ✕ همان‌ها را با features.setHidden پنهان می‌کند.
// - کادرهای معرفی، اطلاعیه و نصب برنامه امکان نیستند: با features.addSection ثبت می‌شوند (کلید secHide؛ نصب کلید خودش installClosed)
//   و در «منوی ☰ › تنظیمات › نمایش امکانات» ردیف روشن/خاموش دارند.
// پس از پنهان کردن، به‌جای بخش یک خط کوچک با دکمه «بازگرداندن» می‌آید؛ فقط برای همین بازدید (بار بعد آن بخش اصلاً نیست).
// نام سایت، دکمه‌های راهنمای معرفی، بخش‌های حزب‌خوانی و چله‌های من (کار روزانه خود شخص) و قرآن‌خوان ✕ ندارند.
(function () {
  const F = window.features; if (!F) return;
  const PATH = 'منوی ☰ › تنظیمات › نمایش امکانات'; // همان نام دسته و ردیف منو (reminders.js، features.menuItem)
  document.head.insertAdjacentHTML('beforeend', `<style>
.hx-host{position:relative}
/* !important: سبک عمومی دکمه‌های کادر (backdrop.css) رنگ زمینه سبز می‌دهد */
.hx-x{position:absolute;z-index:3;top:9px;left:9px;width:36px;height:36px;min-height:0;padding:0;display:flex;align-items:center;justify-content:center;background:transparent!important;color:var(--t-ink2,var(--muted))!important;filter:none!important;border:0;border-radius:50%;font-size:16px;line-height:1;opacity:.6;cursor:pointer;box-shadow:none}
.hx-x::after{content:"";position:absolute;inset:-4px;border-radius:50%}
.hx-x:hover,.hx-x:focus-visible{opacity:1;background:#0000000f!important}
.hx-x:focus-visible{outline:2px solid var(--deep);outline-offset:1px}
.hx-wrap>.hx-x{left:33px}
@media(hover:hover) and (pointer:fine){.hx-host>.hx-x{opacity:0;transition:opacity .15s}.hx-host:hover>.hx-x,.hx-host>.hx-x:focus-visible{opacity:.75}}
@media(max-width:600px){.hx-wrap>.hx-x{left:27px}}
.bgx-anim .hx-wrap:has(>.intro-opt:not(.bgx-done))>.hx-x{visibility:hidden}
.hx-off{display:none!important}
.hx-note{display:flex;align-items:center;gap:10px;margin:14px 24px;padding:6px 8px 6px 14px;background:var(--t-paper,#fffaf0);color:var(--t-ink,var(--ink));text-shadow:none;border:1px dashed var(--gold);border-radius:var(--r);font-size:14px;line-height:1.7}
.hx-host:is(li){padding-left:36px}
li.hx-note{list-style:none}
.hx-note span{flex:1;min-width:0}
.hx-note button{flex:none;min-height:40px;height:auto;padding:0 14px;background:transparent!important;color:var(--t-head,var(--deep))!important;filter:none!important;border:1px solid var(--gold);border-radius:var(--r);font:inherit;font-weight:600;white-space:nowrap;cursor:pointer}
@media(max-width:600px){.hx-note{margin:12px 18px}}
</style>`);

  const intro = k => document.querySelector(`#introPanel .intro-opt[data-intro="${k}"], #introPanel .intro-list > li[data-intro="${k}"]`);
  const live = el => el && !el.classList.contains('intro-off') && !el.hidden;
  // کادرهای معرفی در ظاهر با زمینه پیوند (<a>) هستند؛ دکمه داخل پیوند نمی‌نشیند، پس هر کدام در یک قاب بی‌شکل می‌رود.
  const wrapped = el => {
    if (!el || el.tagName !== 'A') return el;
    if (el.parentElement.classList.contains('hx-wrap')) return el.parentElement;
    const w = document.createElement('div'); w.className = 'hx-wrap'; el.before(w); w.append(el); return w;
  };
  const insMode = () => window.siteSettings?.install?.mode || 'dismissible';
  const insClosed = () => { try { return localStorage.getItem('installClosed') === '1'; } catch { return false; } };

  // feats: پنهان کردن با امکان‌ها؛ وگرنه بخش ثبت‌شده در features
  const T = [
    { id: 'today', feats: ['prayer', 'today', 'weekday'], host: () => document.getElementById('dlCard') },
    { id: 'words', feats: ['ayahday', 'hadithday'], host: () => document.getElementById('dwCard') },
    { id: 'intro-hezb', ic: '📖', t: 'معرفی حزب‌خوانی', d: 'کادر حزب‌خوانی در صفحه اول', el: () => intro('hezb') },
    { id: 'intro-courses', ic: '📘', t: 'معرفی دوره‌های قرآن', d: 'کادر دوره‌های قرآن در صفحه اول', el: () => intro('courses') },
    { id: 'intro-chelleh', ic: '🕯️', t: 'معرفی چله‌ها', d: 'کادر چله‌ها در صفحه اول', el: () => intro('chelleh') },
    { id: 'intro-notice', ic: '📝', t: 'اطلاعیه ثبت‌نام', d: 'کادر «ثبت‌نام کنید» یا «حساب کاربری بسازید»', el: () => document.querySelector('#introPanel .intro-notice') },
    // نصب برنامه دکمه بستن خودش را دارد (install.js)؛ فقط ردیف برگه و خط «بازگرداندن» اینجاست.
    { id: 'install', own: true, ic: '📲', t: 'راهنمای نصب برنامه', d: 'در صفحه اول؛ از منوی ☰ › نصب برنامه هم باز می‌شود', el: () => document.getElementById('installSection'),
      avail: () => !!document.getElementById('installSection') && insMode() === 'dismissible',
      get: () => !insClosed(), set: hide => { try { hide ? localStorage.setItem('installClosed', '1') : localStorage.removeItem('installClosed'); } catch {} } }
  ];
  T.filter(t => !t.feats).forEach(t => F.addSection({ id: t.id, ic: t.ic, t: t.t, d: t.d, get: t.get, set: t.set, avail: t.avail || (() => live(t.el())) }));
  const hostOf = t => t.host ? t.host() : wrapped(t.el());
  const isShown = t => t.feats ? t.feats.some(F.shown) : F.secShown(t.id);

  const notes = new Map(); // id → خط «پنهان شد» همین بازدید
  let busy = false, hiding = false;
  function sync() {
    if (busy) return; busy = true;
    try {
      T.forEach(t => {
        const h = hostOf(t); if (!h) return;
        if (!t.feats && !t.own) h.classList.toggle('hx-off', !F.secShown(t.id));
        if (t.own || h.querySelector(':scope > .hx-x')) return;
        h.classList.add('hx-host');
        const b = document.createElement('button'); b.type = 'button'; b.className = 'hx-x'; b.dataset.hx = t.id;
        b.setAttribute('aria-label', 'پنهان کردن این بخش'); b.title = 'پنهان کردن این بخش'; b.textContent = '✕';
        h.prepend(b);
      });
      // اگر بخشی از برگه «نمایش امکانات» دوباره روشن شد، خط «پنهان شد» آن هم برود.
      if (!hiding) notes.forEach((n, id) => { const t = T.find(x => x.id === id); if (isShown(t)) { n.remove(); notes.delete(id); } });
    } finally { busy = false; }
  }

  function hide(t) {
    const h = hostOf(t); if (!h) return;
    // در «ظاهر قبلی» سایت کادرهای معرفی بند فهرست‌اند
    const note = document.createElement(h.tagName === 'LI' ? 'li' : 'div'); note.className = 'hx-note'; note.setAttribute('role', 'status');
    note.innerHTML = `<span>این بخش پنهان شد. نمایش دوباره: ${PATH}</span><button type="button">بازگرداندن</button>`;
    const undoFeats = t.feats ? t.feats.filter(F.shown) : [];
    // خط پیش از پنهان کردن جا می‌گیرد (کارت امروز با پنهان شدن از صفحه برداشته می‌شود)؛ hiding نمی‌گذارد sync میان دو setHidden آن را بردارد.
    notes.get(t.id)?.remove();
    h.before(note); notes.set(t.id, note);
    hiding = true;
    try { if (t.feats) undoFeats.forEach(id => F.setHidden(id, true)); else if (!t.own) F.setSecHidden(t.id, true); } finally { hiding = false; }
    note.querySelector('button').onclick = () => {
      note.remove(); notes.delete(t.id);
      if (t.feats) undoFeats.forEach(id => F.setHidden(id, false)); else F.setSecHidden(t.id, false);
      setTimeout(() => hostOf(t)?.querySelector('.hx-x, .ins-x')?.focus(), 50);
    };
    note.querySelector('button').focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.hx-x');
    if (b) { e.preventDefault(); e.stopPropagation(); hide(T.find(t => t.id === b.dataset.hx)); return; }
    // دکمه ✕ خود نصب برنامه: install.js بخش را می‌بندد؛ خط «بازگرداندن» پس از آن.
    if (e.target.closest('#installSection .ins-x')) setTimeout(() => { if (insClosed()) hide(T.find(t => t.id === 'install')); });
  }, true);

  document.addEventListener('features:changed', sync);
  const main = document.querySelector('main');
  // کارت امروز و اطلاعیه هر بار از نو ساخته می‌شوند؛ دکمه ✕ دوباره گذاشته می‌شود.
  if (main) new MutationObserver(() => { if (!busy) sync(); }).observe(main, { childList: true, subtree: true });
  sync();
})();
