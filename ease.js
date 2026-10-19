// آسانی کار با سایت: ده بهبود کوچک، هر کدام پشت کلید امکانات (features.js) با روشن/خاموش مدیر در «مدیریت › تنظیمات › امکانات سایت»
// و پنهان شدن برای هر کس در «منوی ☰ › تنظیمات › نمایش امکانات».
//  dock: نوار میان‌بر پایین صفحه روی گوشی (قرآن، ادعیه، ذکرشمار، نوران من، منو)؛ وقتی برگه‌ای باز است یا صفحه‌کلید بالاست پنهان می‌شود
//  recent: «اخیراً» بالای منوی ☰؛ چهار گزینه آخری که از منو زده شده (localStorage، کلید menuRecent: [{ a: ویژگی‌های data-*، h: متن }])
//  totop: دکمه ↑ «بازگشت به بالا» وقتی در صفحه یا متن بلند پایین رفته‌اید و کمی بالا می‌کشید
//  swipe: ورق زدن قرآن‌خوان و کتاب‌ها با کشیدن انگشت (به راست: صفحه بعد، به چپ: صفحه قبل؛ مثل ورق زدن مصحف)
//  pinch: بزرگ و کوچک کردن متن قرآن‌خوان، دعا و کتاب با باز و بسته کردن دو انگشت (همان دکمه‌های + و − خود خواننده)
//  enterkey: دکمه «برو» صفحه‌کلید در فرم‌های حزب‌خوانی صفحه اول (شناسه، گزارش، جستجوی نام) همان دکمه کنارش را می‌زند
//  net: نوار «اینترنت قطع است» و پیام «دوباره وصل شد»
//  whatsnew: «تازه‌های نوران»؛ امکان‌هایی که مدیر تازه روشن کرده یک بار با جای پیدا کردنشان معرفی می‌شوند (کلید featSeen)
//  invite: «معرفی نوران به دوستان» در منو؛ فرستادن پیوند سایت با برگه اشتراک گوشی، یا کپی آن
//  continue: «ادامه خواندن» در کارت امروز صفحه اول؛ آخرین دعا یا قرآنی که باز کرده بودید با یک لمس (کلید lastRead: { key, title, t })
(function () {
  const F = window.features; if (!F) return;
  const on = id => F.shown(id);
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const admin = () => location.hash === '#admin';
  // هر برگه‌ای که باز است کلاسی با پسوند ‎-lock‎ روی body می‌گذارد (sm-lock منو، qr-lock قرآن‌خوان، chl-lock خواننده دعا، …)
  const locked = () => /(^|\s)[a-z]+-lock(\s|$)/.test(document.body.className);
  const reduce = () => document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const openQr = () => document.querySelector('.qr.show');
  const openCr = () => [...document.querySelectorAll('body > .cr.show')].pop() || null;
  const visibleBtn = (root, sel) => [...root.querySelectorAll(sel)].find(b => b.offsetParent !== null && !b.disabled);

  const css = `
.ez-dock{position:fixed;left:0;right:0;bottom:0;z-index:29;display:flex;justify-content:space-around;gap:2px;padding:4px 6px calc(4px + env(safe-area-inset-bottom));background:#fffaf0;border-top:2px solid var(--gold);box-shadow:0 -4px 16px #0003;text-shadow:none}
.ez-dock[hidden],.ez-up[hidden],.ez-net[hidden]{display:none!important}
.ez-dock button{flex:1 1 0;min-width:0;height:auto;min-height:54px;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:transparent;border:0;border-radius:10px;color:var(--deep);font-size:12.5px;font-weight:600;line-height:1.5;white-space:nowrap}
.ez-dock button:hover,.ez-dock button:focus-visible{background:var(--mint)}
.ez-dock button:focus-visible{outline:2px solid var(--deep);outline-offset:-2px}
.ez-dock .ez-i{font-size:21px;line-height:1.3}
.ez-dock svg{width:24px;height:24px;margin:2px 0 1px}
@media(min-width:701px){.ez-dock{display:none!important}}
@media(max-width:700px){html.ez-docked body{padding-bottom:calc(74px + env(safe-area-inset-bottom))}
  html.ez-docked :is(.ft-toast,.ez-toast,.ez-new,.x-offline,.ez-net){bottom:calc(84px + env(safe-area-inset-bottom))}}
.ez-up{position:fixed;z-index:75;left:14px;bottom:calc(var(--ez-b,20px) + env(safe-area-inset-bottom));width:48px;height:48px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,92,69,.92);color:#fff;border:1px solid var(--gold);box-shadow:0 4px 14px #0006;opacity:0;transform:translateY(12px);transition:opacity .2s,transform .2s}
.ez-up.show{opacity:1;transform:none}
.ez-up svg{width:24px;height:24px}
.ez-up:hover{background:var(--deep)}
.ez-rh{margin:8px 16px 4px;font-size:14px;font-weight:700;color:var(--muted)}
.ez-recent{padding:6px 0;border-bottom:1px solid #eadfca}
.ez-toast{position:fixed;z-index:80;left:16px;right:16px;width:fit-content;max-width:calc(100vw - 32px);margin:0 auto;bottom:calc(24px + env(safe-area-inset-bottom));padding:10px 18px;border-radius:999px;background:var(--deep);color:#fff;font-size:15px;text-align:center;text-shadow:none;box-shadow:0 4px 14px #0005}
.ez-net{position:fixed;z-index:78;left:12px;right:12px;max-width:640px;margin:0 auto;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;padding:8px 14px;background:#5a1b1b;color:#fff;text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);font-size:15px;line-height:1.7;box-shadow:0 4px 14px #0005}
.ez-net span{flex:1;min-width:0}
.ez-net button{flex:none;height:36px;padding:0 12px;background:transparent;border:1px solid #fff8;color:#fff;font-size:14px}
.ez-new{position:fixed;z-index:44;left:12px;right:12px;max-width:520px;margin:0 auto;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;padding:6px 6px 6px 8px;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-radius:var(--r-panel);box-shadow:0 8px 24px #0006}
.ez-new>button{height:auto;min-height:44px;background:transparent;border:0;color:var(--ink);font-weight:500;white-space:normal;line-height:1.6}
.ez-new [data-ez-new]{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:4px 8px;text-align:right}
.ez-new [data-ez-new] b{color:var(--deep)}
.ez-new [data-ez-new] small{display:block;color:var(--muted);font-size:13px}
.ez-new [data-ez-new] .ez-i{font-size:24px}
.ez-new [data-ez-nx]{flex:none;width:44px;padding:0;color:var(--muted);font-size:20px}
.ez-new>button:hover{background:var(--hover)}
.ez-box .ez-ok{display:block;width:100%;margin-top:14px}
`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  function toast(t) {
    document.querySelectorAll('.ez-toast').forEach(x => x.remove());
    const d = document.createElement('div'); d.className = 'ez-toast'; d.setAttribute('role', 'status'); d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 3500);
  }

  // ---------- ۱. نوار میان‌بر پایین صفحه (dock) ----------
  const ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const DOCK = [
    ['quran', '📖', 'قرآن', () => !!window.quranFree, () => window.quranFree.open()],
    ['duas', '📚', 'ادعیه', () => !!window.mafatih && on('mafatih'), () => window.mafatih.open()],
    ['zekr', '📿', 'ذکرشمار', () => !!window.zekr && on('zekr'), () => window.zekr.open()],
    ['mine', '🏠', 'نوران من', () => !!window.nrMine && on('mine'), () => window.nrMine.open()],
    ['menu', ICON_MENU, 'منو', () => !!window.siteMenu, () => window.siteMenu.open()]
  ];
  const dock = document.createElement('nav'); dock.className = 'ez-dock'; dock.setAttribute('aria-label', 'میان‌برها'); dock.hidden = true;
  document.body.appendChild(dock);
  let dockKey = '';
  function drawDock() {
    const list = DOCK.filter(d => d[3]()), key = list.map(d => d[0]).join();
    if (key === dockKey) return;
    dockKey = key;
    dock.innerHTML = list.map(([id, ic, t]) => `<button type="button" data-ez-dock="${id}">${ic.startsWith('<svg') ? ic : `<span class="ez-i" aria-hidden="true">${ic}</span>`}<span>${t}</span></button>`).join('');
  }
  dock.addEventListener('click', e => {
    const b = e.target.closest('[data-ez-dock]'); if (!b) return;
    const d = DOCK.find(x => x[0] === b.dataset.ezDock);
    try { d && d[4](); } catch (err) { console.error(err); }
  });
  // صفحه‌کلید گوشی باز است؟ (کادر نوشتنی در فوکوس، یا ارتفاع دیدنی صفحه خیلی کم شده)
  const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && !/^(checkbox|radio|button|range)$/.test(a.type || ''); };
  function dockState() {
    const show = on('dock') && !locked() && !typing() && !document.querySelector('.tr-root') && !!dock.children.length;
    if (show) drawDock();
    dock.hidden = !show;
    document.documentElement.classList.toggle('ez-docked', show && matchMedia('(max-width: 700px)').matches);
    upPlace();
  }

  // ---------- ۲. «اخیراً» در منو (recent) ----------
  const REC = 'menuRecent';
  const attrs = el => Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value]));
  const selOf = a => Object.entries(a).map(([k, v]) => `[${k}="${CSS.escape(v)}"]`).join('');
  const smBody = () => document.querySelector('.sm-body');
  document.addEventListener('click', e => {
    const it = e.target.closest?.('.sm .sm-item'); if (!it || it.closest('.ez-recent')) return;
    const a = attrs(it); if (!Object.keys(a).length) return;
    const h = it.innerHTML, list = read(REC, []).filter(x => selOf(x.a) !== selOf(a));
    list.unshift({ a, h }); write(REC, list.slice(0, 4));
  }, true);
  function drawRecent() {
    const body = smBody(); if (!body) return;
    body.querySelector(':scope > .ez-recent')?.remove();
    if (!on('recent') || !document.querySelector('.sm.show')) return;
    // فقط گزینه‌هایی که هنوز در منو هستند (امکانی که خاموش شده یا ثبت‌نامی که بسته شده، خودش کنار می‌رود)
    const list = read(REC, []).filter(x => x && x.a && body.querySelector(selOf(x.a)));
    if (!list.length) return;
    const box = document.createElement('div'); box.className = 'ez-recent';
    box.innerHTML = '<h4 class="ez-rh">اخیراً</h4>' + list.map((x, i) => `<button type="button" class="sm-item" data-ez-rec="${i}">${x.h}</button>`).join('');
    // متن ذخیره‌شده خود منو بوده، ولی برای اطمینان فقط ساختار ساده‌اش (آیکون، عنوان، توضیح) نگه داشته می‌شود
    box.querySelectorAll('[data-ez-rec]').forEach(b => b.querySelectorAll('script,iframe,img,svg,input,button').forEach(n => n.remove()));
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-ez-rec]'); if (!b) return;
      e.stopPropagation();
      const x = list[+b.dataset.ezRec], orig = x && [...body.querySelectorAll(selOf(x.a))].find(n => !box.contains(n));
      orig?.click();
    });
    body.prepend(box);
  }
  {
    const watch = () => {
      const body = smBody(), nav = document.querySelector('.sm');
      if (!body || !nav) return false;
      new MutationObserver(() => { if (!body.querySelector(':scope > .ez-recent')) drawRecent(); }).observe(body, { childList: true });
      new MutationObserver(drawRecent).observe(nav, { attributes: true, attributeFilter: ['class'] });
      return true;
    };
    watch() || document.addEventListener('DOMContentLoaded', watch, { once: true });
  }

  // ---------- ۳. بازگشت به بالا (totop) ----------
  const up = document.createElement('button');
  up.type = 'button'; up.className = 'ez-up'; up.hidden = true; up.setAttribute('aria-label', 'بازگشت به بالا');
  up.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(up);
  let upT = null, lastTop = new WeakMap(), upHide = null;
  const scroller = t => t === document || t === document.documentElement || t === document.body ? null : t;
  const topOf = el => el ? el.scrollTop : scrollY;
  const viewH = el => el ? el.clientHeight : innerHeight;
  const fullH = el => el ? el.scrollHeight : document.documentElement.scrollHeight;
  function upPlace() {
    // بالای نوار صوت خواننده‌ها و نوار میان‌بر پایین
    let b = 20;
    if (upT) { const bar = [...upT.querySelectorAll('.cr-aud, .qr-player, .kh-act')].find(x => x.offsetHeight && getComputedStyle(x).display !== 'none'); if (bar) b += bar.offsetHeight; }
    else if (document.documentElement.classList.contains('ez-docked')) b += 70;
    up.style.setProperty('--ez-b', b + 'px');
  }
  function upShow(v) {
    if (v) { up.hidden = false; upPlace(); requestAnimationFrame(() => up.classList.add('show')); }
    else { up.classList.remove('show'); clearTimeout(upHide); upHide = setTimeout(() => { if (!up.classList.contains('show')) up.hidden = true; }, 220); }
  }
  document.addEventListener('scroll', e => {
    if (!on('totop')) return;
    const el = scroller(e.target);
    if (el && (!(el instanceof Element) || el.matches('textarea, .sm-body') || el.closest('.sm'))) return;
    if (!el && locked()) return; // صفحه پشت یک برگه باز
    const key = el || window, y = topOf(el), prev = lastTop.get(key) ?? y; lastTop.set(key, y);
    const far = y > Math.max(900, viewH(el) * 1.5) && fullH(el) > viewH(el) * 3;
    if (!far) { if (upT === el) upShow(false); return; }
    // پایین رفتن (خواندن، یا حرکت خودکار متن) دکمه را پنهان و کمی بالا کشیدن پیدایش می‌کند
    if (y < prev - 30) { upT = el; upShow(true); }
    else if (y > prev + 4 && upT === el) upShow(false);
  }, { capture: true, passive: true });
  up.addEventListener('click', () => {
    const el = upT, behavior = reduce() ? 'auto' : 'smooth';
    (el || window).scrollTo({ top: 0, behavior });
    upShow(false);
  });
  // با بسته شدن برگه‌ای که دکمه برایش بود
  setInterval(() => { if (!up.hidden && upT && (!upT.isConnected || upT.offsetParent === null && getComputedStyle(upT).position !== 'fixed' || getComputedStyle(upT).display === 'none')) { upT = null; upShow(false); } }, 800);

  // ---------- ۴ و ۵. ورق زدن با کشیدن انگشت (swipe) و اندازه متن با دو انگشت (pinch) ----------
  const reader = () => { const qr = openQr(); if (qr) return { r: qr, qr: true }; const cr = openCr(); return cr ? { r: cr, qr: false } : null; };
  const SKIP = 'input, textarea, select, [contenteditable], button, a, .cr-menu, .qr-menu, .qr-set, .cr-aud, .qr-player, .rt-pill, audio';
  // آیا میان هدف و خواننده جایی هست که خودش افقی جابه‌جا می‌شود (مثل ردیف دکمه‌ها)؟
  const hScroll = (t, r) => { for (let n = t; n && n !== r; n = n.parentElement) { if (n.scrollWidth > n.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true; } return false; };
  let sw = null, pin = null;
  const dist = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
  document.addEventListener('touchstart', e => {
    const R = reader();
    sw = pin = null;
    if (!R || !R.r.contains(e.target)) return;
    if (e.touches.length === 2 && on('pinch')) { pin = { R, d: dist(e.touches), n: 0 }; return; }
    if (e.touches.length !== 1 || !on('swipe') || e.target.closest(SKIP) || hScroll(e.target, R.r)) return;
    const t = e.touches[0]; sw = { R, x: t.clientX, y: t.clientY, t: Date.now() };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (pin && e.touches.length === 2) {
      e.preventDefault(); // بزرگ‌نمایی خود مرورگر نه؛ اندازه متن خواننده عوض می‌شود و متن در صفحه جا می‌افتد
      const d = dist(e.touches), k = d / pin.d;
      if (k > 1.22 || k < 0.82) {
        const big = k > 1, b = pin.R.r.querySelector(pin.R.qr ? `[data-a="${big ? 'bigger' : 'smaller'}"]` : `[data-x="${big ? 'bigger' : 'smaller'}"]`);
        if (b && !b.disabled) { b.click(); pin.n++; }
        pin.d = d;
      }
    } else if (sw && e.touches.length > 1) sw = null;
  }, { passive: false });
  document.addEventListener('touchend', e => {
    if (pin) { if (!e.touches.length) pin = null; return; }
    const s = sw; sw = null;
    if (!s || !e.changedTouches.length) return;
    const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Date.now() - s.t > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2.2) return;
    if (String(getSelection?.() || '').trim()) return; // انتخاب متن برای کپی
    const next = dx > 0, r = s.R.r;
    const sel = s.R.qr ? (next ? '[data-a="pnext"]' : '[data-a="pprev"]') : (next ? '.bk-nav button:first-child:not(.bk-list-btn)' : '.bk-nav button:last-child:not(.bk-list-btn)');
    const b = visibleBtn(r, sel);
    if (b) { b.click(); navigator.vibrate?.(10); }
  }, { passive: true });
  // سافاری آیفون بزرگ‌نمایی دو انگشتی را با رویداد gesture خودش هم انجام می‌دهد
  document.addEventListener('gesturestart', e => { if (pin) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchcancel', () => { sw = pin = null; }, { passive: true });

  // ---------- ۶. دکمه «برو» صفحه‌کلید در فرم‌های صفحه اول (enterkey) ----------
  const ENTER = { pid: ['showTask', 'go'], reportId: ['verifyReportId', 'go'], nameSearch: ['searchName', 'search'] };
  function enterHints() {
    Object.entries(ENTER).forEach(([id, [, hint]]) => { const el = document.getElementById(id); if (el) on('enterkey') ? el.setAttribute('enterkeyhint', hint) : el.removeAttribute('enterkeyhint'); });
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || !on('enterkey')) return;
    const m = ENTER[e.target?.id]; if (!m) return;
    const b = document.getElementById(m[0]); if (!b || b.disabled) return;
    e.preventDefault(); b.click();
    e.target.blur(); // صفحه‌کلید پایین می‌رود تا نتیجه دیده شود
  });

  // ---------- ۷. قطع و وصل اینترنت (net) ----------
  const net = document.createElement('div'); net.className = 'ez-net'; net.hidden = true; net.setAttribute('role', 'status');
  net.innerHTML = '<span>اینترنت قطع است. گزارش، ثبت‌نام و متن‌های تازه تا وصل شدن دوباره باز نمی‌شوند.</span><button type="button" aria-label="بستن">✕</button>';
  net.querySelector('button').onclick = () => { net.hidden = true; };
  document.body.appendChild(net);
  // در پیش‌نمایش مدیر، extras.js نوار خودش را دارد
  const netOn = () => on('net') && !(admin() && document.body.classList.contains('v2'));
  addEventListener('offline', () => { if (netOn()) net.hidden = false; });
  addEventListener('online', () => { const was = !net.hidden; net.hidden = true; if (netOn() && was) toast('اینترنت دوباره وصل شد.'); });

  // ---------- ۸. تازه‌های نوران (whatsnew) ----------
  const SEEN = 'featSeen';
  const userFeats = () => F.list.filter(f => f[0] !== 'dashboard' && F.on(f[0]) && F.shown(f[0])).map(f => f[0]);
  let newBar = null, fresh0 = false;
  // فقط پس از رسیدن تنظیمات تازه از سرور (admin.js رویداد settings:changed را می‌فرستد)؛ وگرنه برای بازدیدکننده تازه،
  // که هنوز تنظیمات ذخیره‌شده ندارد، همه امکان‌ها «تازه» به نظر می‌رسید
  document.addEventListener('settings:changed', () => { fresh0 = true; setTimeout(checkNew, 300); });
  function checkNew() {
    if (admin() || !on('whatsnew')) { newBar?.remove(); newBar = null; return; }
    if (!fresh0) return;
    const cur = userFeats(), seen = read(SEEN, null);
    // بار اول: همه امکان‌های روشن «دیده‌شده» حساب می‌شوند (راهنمای سایت معرفی‌شان می‌کند)
    if (!Array.isArray(seen)) { write(SEEN, cur); return; }
    const fresh = cur.filter(id => !seen.includes(id));
    if (!fresh.length) { newBar?.remove(); newBar = null; return; }
    if (locked() || document.querySelector('.tr-root')) return;
    const f = F.list.find(x => x[0] === fresh[0]);
    if (!newBar) {
      newBar = document.createElement('div'); newBar.className = 'ez-new'; newBar.setAttribute('role', 'status');
      newBar.addEventListener('click', e => {
        if (e.target.closest('[data-ez-nx]')) markSeen();
        else if (e.target.closest('[data-ez-new]')) showNew();
      });
      document.body.appendChild(newBar);
    }
    newBar.innerHTML = `<button type="button" data-ez-new><span class="ez-i" aria-hidden="true">✨</span><span><b>${fresh.length > 1 ? `${fa(fresh.length)} امکان تازه در نوران` : `تازه در نوران: ${esc(f[2])}`}</b><small>${fresh.length > 1 ? 'برای دیدن فهرست و جای هر کدام بزنید' : esc(f[3])}</small></span></button><button type="button" data-ez-nx aria-label="دیدم، بستن">✕</button>`;
  }
  function markSeen() {
    const seen = read(SEEN, []); write(SEEN, [...new Set([...(Array.isArray(seen) ? seen : []), ...userFeats()])]);
    newBar?.remove(); newBar = null;
  }
  function showNew() {
    const seen = read(SEEN, []), fresh = userFeats().filter(id => !seen.includes(id)).map(id => F.list.find(x => x[0] === id));
    markSeen();
    const where = F.where || {};
    const shade = document.createElement('div'); shade.className = 'ft-shade';
    shade.innerHTML = `<div class="ft-box ez-box" role="dialog" aria-modal="true" aria-label="تازه‌های نوران"><button type="button" class="ft-x" aria-label="بستن">✕</button><h2>تازه‌های نوران</h2><p>این امکان‌ها تازه به سایت اضافه شده‌اند. هر کدام را لازم ندارید، در «منوی ☰ › تنظیمات › نمایش امکانات» خاموش کنید.</p>${fresh.map(([id, ic, t, d]) => `<div class="ft-row"><span class="ft-ic">${ic}</span><span>${esc(t)}<small>${esc(d)}</small>${where[id] ? `<small class="ft-where">📍 ${esc(where[id])}</small>` : ''}</span></div>`).join('')}<button type="button" class="ez-ok">متوجه شدم</button></div>`;
    const close = () => { shade.remove(); document.body.classList.remove('ez-lock'); dockState(); };
    shade.addEventListener('click', e => { if (e.target === shade || e.target.closest('.ft-x, .ez-ok')) close(); });
    shade.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.body.appendChild(shade); document.body.classList.add('ez-lock');
    setTimeout(() => shade.querySelector('.ft-x')?.focus(), 50);
  }

  // ---------- ۹. معرفی نوران به دوستان (invite) ----------
  const SITE = () => location.origin + location.pathname.replace(/index\.html$/, '');
  async function invite() {
    const url = SITE(), text = 'نوران؛ ختم گروهی قرآن و ادعیه. سهم قرائت هر روز، چله‌ها، مفاتیح‌الجنان و قرآن‌خوان با صوت و ترجمه، همه در یک‌جا:';
    if (navigator.share) { try { await navigator.share({ title: 'نوران', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text + '\n' + url); toast('پیوند سایت کپی شد؛ در پیام‌رسان بچسبانید.'); }
    catch { prompt('این پیوند را کپی کنید:', url); }
  }
  window.siteMenu?.section({
    id: 'invite', order: 98,
    render(box) {
      if (!on('invite')) return;
      box.innerHTML = '<h3>دعوت دوستان</h3><button type="button" class="sm-item" data-ez-invite><span class="sm-ic">💌</span><span>معرفی نوران به دوستان<small>فرستادن پیوند سایت در تلگرام، بله، واتساپ و …</small></span><span class="sm-go">‹</span></button>';
      box.querySelector('[data-ez-invite]').onclick = () => { window.siteMenu.close(); setTimeout(invite, 280); };
    }
  });

  // ---------- ۱۰. ادامه خواندن در صفحه اول (continue) ----------
  const LAST = 'lastRead', QF = 'quranFree', DAYS3 = 3 * 864e5;
  document.addEventListener('chlread:open', e => {
    const d = e.detail || {}; if (!d.key || !d.title) return;
    write(LAST, { key: String(d.key), title: String(d.title).slice(0, 120), t: Date.now() });
  });
  async function lastItem() {
    const a = read(LAST, null), q = read(QF, null), now = Date.now();
    const da = a && a.key && now - a.t < DAYS3 ? a : null, dq = q && q.g >= 0 && now - (q.t || 0) < DAYS3 && window.quranFree ? q : null;
    if (dq && (!da || dq.t > da.t)) {
      let title = 'قرآن آزاد';
      try { const ix = await window.quranReader.index(); let s = 0; while (s < 113 && ix.surah[s + 1] <= dq.g) s++; title = `سوره ${window.quranFree.names[s]}، آیه ${fa(dq.g - ix.surah[s] + 1)}`; } catch {}
      return { k: 'q:' + dq.g, ic: '📖', title, run: () => window.quranFree.openAt(dq.g) };
    }
    if (da && window.chlRead) return { k: 'd:' + da.key, ic: '📍', title: da.title, run: () => window.chlRead(da.key) };
    return null;
  }
  let cont = null, gen = 0;
  async function placeCont() {
    const my = ++gen, card = document.getElementById('dlCard');
    const it = on('continue') && card && !card.hidden ? await lastItem() : null;
    if (my !== gen) return; // در این فاصله بار دیگری خوانده شد
    cont = it;
    const k = it ? it.k + it.title : '', old = card?.querySelector('.ez-cont');
    if (old && old.dataset.k === k) return;
    old?.remove();
    if (!it || !card) return;
    card.insertAdjacentHTML('beforeend', `<div class="ez-cont dl-acts"><button type="button" class="dl-act" data-ez-cont><span class="dl-ic" aria-hidden="true">${it.ic}</span><span><b>ادامه خواندن</b><small>${esc(it.title)}</small></span><span class="dl-go">‹</span></button></div>`);
    card.lastElementChild.dataset.k = k;
  }
  document.addEventListener('click', e => { if (e.target.closest?.('[data-ez-cont]') && cont) cont.run(); });
  // daily.js کارت امروز را با هر تغییر از نو می‌سازد؛ این خط پس از آن دوباره گذاشته می‌شود (مثل خط «ختم قرآن من» در mine.js)
  { const intro = document.getElementById('introPanel'); if (intro) new MutationObserver(() => { const c = document.getElementById('dlCard'); if (c && on('continue') && !c.querySelector('.ez-cont')) placeCont(); }).observe(intro, { childList: true, subtree: true }); }

  // ---------- به‌روزرسانی همه با تغییر امکانات، باز و بسته شدن برگه‌ها و فوکوس ----------
  let lockWas = null;
  new MutationObserver(() => {
    const l = locked();
    if (l === lockWas) return;
    lockWas = l; dockState();
    // پس از بستن یک خواننده، «ادامه خواندن» تازه می‌شود و تازه‌ها (اگر برگه‌ای جلویش بود) نشان داده می‌شوند
    if (!l) { placeCont(); setTimeout(checkNew, 600); }
    if (l && upT === null) upShow(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(dockState).observe(document.body, { childList: true }); // راهنمای سایت (tr-root) باز یا بسته شد
  document.addEventListener('focusin', dockState);
  document.addEventListener('focusout', () => setTimeout(dockState, 50));
  function all() { dockKey = ''; drawDock(); dockState(); enterHints(); placeCont(); checkNew(); if (!on('totop')) upShow(false); if (!netOn()) net.hidden = true; else if (!navigator.onLine) net.hidden = false; }
  document.addEventListener('features:changed', all);
  addEventListener('hashchange', all);
  drawDock(); dockState(); enterHints();
  if (!navigator.onLine && netOn()) net.hidden = false;
  // تنظیمات تازه مدیر چند لحظه پس از باز شدن صفحه می‌رسد؛ تازه‌ها پس از آن بررسی می‌شوند
  setTimeout(() => { placeCont(); checkNew(); }, 2500);
})();
