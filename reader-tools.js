// ابزارهای خواندن، هر کدام پشت کلید امکانات (features.js) و با روشن/خاموش مدیر در «مدیریت › تنظیمات › امکانات سایت»:
//  duafav: دکمه ☆ در نوار بالای خواننده دعا (chelleh.js، window.chlRead) و فهرست «دعاهای منتخب من» در مفاتیح و منوی ☰ › ادعیه
//          (localStorage، کلید duaFav: [{ key, title, t }])
//  resume: خواننده دعا جای خواندن هر متن را نگه می‌دارد (کلید crPos: { key: { y, t } }) و بار بعد نوار «ادامه از جایی که ماندید» می‌آید
//  awake: تا قرآن‌خوان یا خواننده دعا و کتاب باز است، صفحه گوشی خاموش نمی‌شود (Wake Lock، اگر مرورگر پشتیبانی کند)
//  autoscroll: دکمه دو پیکان رو به پایین در نوار خواننده دعا و کتاب؛ متن آرام بالا می‌رود و سرعت با − و + عوض می‌شود (کلید autoScroll: سرعت)
//  copy: دکمه کپی کنار هر فراز در خواننده دعا و کتاب (متن عربی، ترجمه و نام متن)
//  print: ردیف «چاپ یا PDF» در ⚙ خواننده دعا و کتاب؛ فقط خود متن چاپ می‌شود
//  keys: میان‌برهای صفحه‌کلید در خواننده‌ها (فاصله پخش/توقف، ← و → صفحه بعد و قبل، + و − اندازه متن، ? راهنما) و «/» برای جستجو
// خواننده دعا رویدادهای chlread:open و chlread:close را می‌فرستد (chelleh.js)؛ خواننده کتاب‌ها (books.js، کلاس cr bk-r) هم همان ظاهر را دارد.
(function () {
  const on = id => !!window.features?.shown(id);
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const openCr = () => [...document.querySelectorAll('body > .cr.show')].pop() || null;
  const openQr = () => document.querySelector('.qr.show');

  const css = `
.rt-b{font-size:20px!important}
.rt-b[aria-pressed=true]{color:#ffe2a8!important}
.rt-auto-b[aria-pressed=true]{background:#ffffff2e!important;border-radius:10px}
.rt-b svg{display:block}
.rt-pill{position:fixed;z-index:55;left:50%;transform:translateX(-50%);bottom:calc(24px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:4px;max-width:calc(100vw - 32px);padding:4px 6px 4px 4px;background:var(--accent,#0b6b50);color:#fff;border-radius:999px;box-shadow:0 6px 20px #0005;font:500 15px Vazirmatn,Tahoma,sans-serif}
.rt-pill button{height:40px;min-width:40px;padding:0 12px;background:transparent;border:0;color:#fff;font:inherit;font-weight:600;border-radius:999px;white-space:nowrap}
.rt-pill button:hover,.rt-pill button:focus-visible{background:#ffffff26}
.rt-pill span{padding:0 4px;white-space:nowrap}
.cr.night ~ .rt-pill,.rt-pill.night{background:#1d3b31}
.rt-cp{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:0 4px;padding:0;vertical-align:middle;background:transparent!important;border:0;color:var(--muted)!important;opacity:.75;font-size:16px}
.rt-cp:hover,.rt-cp:focus-visible{opacity:1}
.rt-cp svg{width:20px;height:20px}
.rt-toast{position:fixed;z-index:80;left:16px;right:16px;width:fit-content;margin:0 auto;bottom:calc(24px + env(safe-area-inset-bottom));padding:10px 18px;border-radius:999px;background:#1f1a14;color:#fff;font:500 15px Vazirmatn,Tahoma,sans-serif;box-shadow:0 6px 20px #0005;text-align:center;text-shadow:none}
.rt-fav{margin:10px 0;background:#fff;border:1px solid var(--gold);border-right:5px solid var(--gold);border-radius:var(--r-card);padding:10px 14px}
.rt-fav h3{margin:0 0 4px;font-size:16px;color:var(--deep)}
.rt-fav button.rt-fi{display:flex;align-items:center;gap:8px;width:100%;height:auto;min-height:44px;padding:6px 4px;background:transparent;border:0;border-radius:0;color:var(--ink);text-align:right;white-space:normal;line-height:1.7;font-weight:500;font-size:15.5px}
.rt-fav button.rt-fi:hover{background:var(--hover)}
.rt-fav button.rt-fi span{flex:1;min-width:0}
.rt-fav p{margin:4px 0 0;font-size:13.5px;color:var(--muted)}
.rt-keys{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:#000a}
.rt-keys div{width:min(92vw,420px);background:#fffaf0;color:#2f241d;border:2px solid #d7aa5b;border-radius:16px;padding:16px 20px;font:15px/1.9 Vazirmatn,Tahoma,sans-serif;text-shadow:none}
.rt-keys h2{margin:0 0 6px;font-size:18px;color:#005c45;text-align:center}
.rt-keys dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0}
.rt-keys dt{text-align:center}
.rt-keys kbd{display:inline-block;min-width:28px;padding:0 6px;border:1px solid #c9b88f;border-bottom-width:3px;border-radius:6px;background:#fff;font:600 14px Vazirmatn,Tahoma,sans-serif}
.rt-keys button{display:block;margin:12px auto 0;height:42px;padding:0 22px}
@media print{
  body.rt-print>*:not(.rt-printing){display:none!important}
  body.rt-print{background:#fff!important;padding:0!important;color:#000!important}
  .rt-printing{position:static!important;display:block!important;overflow:visible!important;height:auto!important;background:#fff!important;color:#000!important;--text:#000;--tr:#222;--muted:#444;--bg:#fff;--card:#fff}
  .rt-printing :is(.cr-bar,.cr-menu,.cr-aud,.cr-end,.cr-count,button,.rt-pill){display:none!important}
  .rt-printing .cr-sec{break-inside:avoid}
  .rt-printing .cr-body{max-width:none!important;padding:0 8mm!important}
}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let toastT = 0;
  function toast(t) {
    document.querySelector('.rt-toast')?.remove(); clearTimeout(toastT);
    const d = document.createElement('div'); d.className = 'rt-toast'; d.setAttribute('role', 'status'); d.textContent = t;
    document.body.appendChild(d); toastT = setTimeout(() => d.remove(), 2600);
  }

  // ---------- منتخب‌ها (duafav) ----------
  const FAV = 'duaFav';
  const favs = () => { const a = read(FAV, []); return Array.isArray(a) ? a.filter(x => x && x.key && x.title) : []; };
  const isFav = key => favs().some(x => x.key === key);
  let curKey = null, curTitle = '';
  function setFav(key, title, yes) {
    const a = favs().filter(x => x.key !== key);
    if (yes) a.unshift({ key, title, t: Date.now() });
    write(FAV, a.slice(0, 60));
    window.siteMenu?.refresh();
  }
  function favBtn(cr) {
    const bar = cr.querySelector('.cr-bar'); if (!bar) return;
    let b = bar.querySelector('.rt-fav-b');
    if (!on('duafav') || !curKey || cr.classList.contains('bk-r')) { b?.remove(); return; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'rt-b rt-fav-b';
      bar.querySelector('[data-x="menu"]').before(b);
    }
    const f = isFav(curKey);
    b.textContent = f ? '★' : '☆'; b.setAttribute('aria-pressed', f);
    b.setAttribute('aria-label', f ? 'برداشتن از منتخب‌ها' : 'افزودن به دعاهای منتخب'); b.title = b.getAttribute('aria-label');
  }
  const favList = () => favs().map(x => `<button type="button" class="rt-fi" data-rt-fav="${esc(x.key)}"><span>${esc(x.title)}</span><em style="font-style:normal">★</em></button>`).join('');
  window.duaFav = {
    // کارت بالای برگه مفاتیح (mafatih.js)
    card() {
      if (!on('duafav')) return '';
      const a = favs();
      return `<div class="rt-fav"><h3>⭐ دعاهای منتخب من</h3>${a.length ? favList() : '<p>هنوز چیزی نشان نکرده‌اید. در هر دعا یا زیارت، دکمه ☆ بالای صفحه را بزنید تا اینجا بیاید.</p>'}</div>`;
    },
    // گزینه منو زیر «ادعیه» (از mafatih.menuItem)
    menuItem() {
      const a = favs(); if (!on('duafav') || !a.length) return '';
      return `<button type="button" class="sm-item" data-rt-favs><span class="sm-ic">⭐</span><span>دعاهای منتخب من<small>${esc(a.slice(0, 3).map(x => x.title).join('، '))}</small></span><span class="sm-go">‹</span></button>`;
    }
  };
  let favShade = null;
  function openFavs() {
    favShade?.remove();
    favShade = document.createElement('div'); favShade.className = 'ft-shade';
    favShade.innerHTML = `<div class="ft-box" role="dialog" aria-modal="true" aria-label="دعاهای منتخب من"><button type="button" class="ft-x" aria-label="بستن">✕</button><h2>دعاهای منتخب من</h2><p>برای برداشتن، در خود دعا دکمه ★ را دوباره بزنید.</p>${window.duaFav.card()}</div>`;
    favShade.addEventListener('click', e => { if (e.target === favShade || e.target.closest('.ft-x')) closeFavs(); });
    document.body.appendChild(favShade);
    setTimeout(() => favShade?.querySelector('.ft-x')?.focus(), 50);
  }
  const closeFavs = () => { favShade?.remove(); favShade = null; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && favShade) closeFavs(); });
  document.addEventListener('click', e => {
    if (e.target.closest('.sm [data-rt-favs]')) { window.siteMenu?.close(); setTimeout(openFavs, 280); return; }
    const f = e.target.closest('[data-rt-fav]');
    if (f) {
      const key = f.dataset.rtFav;
      closeFavs();
      // برگه مفاتیح (اگر باز است) اول بسته می‌شود تا تاریخچه برگشت درست بماند.
      const mf = document.querySelector('.mf-shade [data-mf="close"]');
      if (mf) { mf.click(); setTimeout(() => window.chlRead?.(key), 120); } else window.chlRead?.(key);
      return;
    }
    const b = e.target.closest('.rt-fav-b');
    if (b && curKey) {
      const yes = !isFav(curKey); setFav(curKey, curTitle, yes);
      favBtn(b.closest('.cr')); toast(yes ? '⭐ به دعاهای منتخب افزوده شد' : 'از منتخب‌ها برداشته شد');
    }
  });

  // ---------- ادامه از جای قبلی (resume) ----------
  const POS = 'crPos';
  let posT = 0, pill = null;
  function savePos(cr) {
    if (!curKey || !cr.classList.contains('show')) return;
    const h = cr.scrollHeight - cr.clientHeight, all = read(POS, {});
    if (h < cr.clientHeight * 1.5) return; // متن کوتاه
    const y = cr.scrollTop / h;
    if (y > .97 || y < .03) delete all[curKey]; else all[curKey] = { y: Math.round(y * 1e4) / 1e4, t: Date.now() };
    // فقط ۴۰ متن آخر
    const keys = Object.keys(all).sort((a, b) => all[b].t - all[a].t);
    keys.slice(40).forEach(k => delete all[k]);
    write(POS, all);
  }
  // نوارهای شناور بالای نوار صوت خواننده می‌نشینند، نه روی آن.
  function lift(el, cr) { const a = cr.querySelector('.cr-aud:not([hidden])'); if (a && a.offsetHeight) el.style.bottom = (a.offsetHeight + 12) + 'px'; }
  function dropPill() { pill?.remove(); pill = null; }
  function showResume(cr) {
    dropPill();
    if (!on('resume') || !curKey) return;
    const p = read(POS, {})[curKey]; if (!p || !(p.y > .03 && p.y < .97)) return;
    pill = document.createElement('div'); pill.className = 'rt-pill' + (cr.classList.contains('night') ? ' night' : ''); pill.setAttribute('role', 'status');
    pill.innerHTML = `<button type="button" data-rt-go>⤵ ادامه از جایی که ماندید (${fa(Math.round(p.y * 100))}٪)</button><button type="button" data-rt-x aria-label="از اول بخوانم">✕</button>`;
    pill.querySelector('[data-rt-go]').onclick = () => { cr.scrollTo({ top: p.y * (cr.scrollHeight - cr.clientHeight), behavior: 'smooth' }); dropPill(); };
    pill.querySelector('[data-rt-x]').onclick = dropPill;
    document.body.appendChild(pill); lift(pill, cr);
    setTimeout(() => { if (pill && pill.isConnected) dropPill(); }, 12000);
  }

  // ---------- کپی (copy) و چاپ (print) ----------
  const CP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>';
  function crButtons(cr) {
    const show = on('copy');
    cr.querySelectorAll('.cr-sec').forEach(s => {
      const ar = s.querySelector('.cr-ar'); if (!ar) return;
      const b = ar.querySelector('.rt-cp');
      if (show && !b) ar.insertAdjacentHTML('beforeend', `<button type="button" class="rt-cp" aria-label="کپی این فراز" title="کپی">${CP_ICON}</button>`);
      else if (!show && b) b.remove();
    });
    const menu = cr.querySelector('.cr-menu');
    if (menu) {
      let r = menu.querySelector('.rt-print');
      if (on('print') && !r) {
        r = document.createElement('div'); r.className = 'cr-row rt-print';
        r.innerHTML = '<span>چاپ یا ذخیره PDF</span><div><button type="button" data-rt-print>🖨️ چاپ متن</button></div>';
        menu.appendChild(r);
      } else if (!on('print') && r) r.remove();
    }
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {}
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-100px;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
  function printCr(cr) {
    cr.querySelector('.cr-menu')?.classList.remove('show');
    autoStop();
    cr.classList.add('rt-printing'); document.body.classList.add('rt-print');
    const done = () => { cr.classList.remove('rt-printing'); document.body.classList.remove('rt-print'); };
    addEventListener('afterprint', done, { once: true });
    setTimeout(() => { window.print(); setTimeout(done, 500); }, 50);
  }

  // ---------- حرکت خودکار متن (autoscroll) ----------
  const SPEEDS = [12, 18, 26, 36, 50, 70, 95]; // پیکسل در ثانیه
  let auto = null; // { cr, raf, last, acc }
  const speedIx = () => Math.max(0, Math.min(SPEEDS.length - 1, read('autoScroll', 2)));
  let autoBar = null;
  function autoBtn(cr) {
    const bar = cr.querySelector('.cr-bar'); if (!bar) return;
    let b = bar.querySelector('.rt-auto-b');
    if (!on('autoscroll')) { b?.remove(); if (auto?.cr === cr) autoStop(); return; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'rt-b rt-auto-b'; b.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 6l5 5 5-5M7 13l5 5 5-5"/></svg>';
      b.setAttribute('aria-label', 'حرکت خودکار متن'); b.title = 'حرکت خودکار متن';
      bar.querySelector('[data-x="menu"]').before(b);
    }
    b.setAttribute('aria-pressed', auto?.cr === cr);
  }
  function autoUi() {
    autoBar?.remove(); autoBar = null;
    if (!auto) return;
    autoBar = document.createElement('div'); autoBar.className = 'rt-pill' + (auto.cr.classList.contains('night') ? ' night' : '');
    autoBar.innerHTML = `<button type="button" data-as="slow" aria-label="آهسته‌تر">−</button><span>سرعت ${fa(speedIx() + 1)}</span><button type="button" data-as="fast" aria-label="تندتر">+</button><button type="button" data-as="pause">${auto.paused ? '▶ ادامه' : '⏸ توقف'}</button><button type="button" data-as="stop" aria-label="بستن حرکت خودکار">✕</button>`;
    document.body.appendChild(autoBar); lift(autoBar, auto.cr);
  }
  function tick(ts) {
    if (!auto) return;
    const { cr } = auto;
    if (!cr.classList.contains('show')) return autoStop();
    if (!auto.paused) {
      const dt = auto.last ? Math.min(100, ts - auto.last) : 0;
      auto.acc += SPEEDS[speedIx()] * dt / 1000;
      if (auto.acc >= 1) { const n = Math.floor(auto.acc); cr.scrollTop += n; auto.acc -= n; }
      if (cr.scrollTop + cr.clientHeight >= cr.scrollHeight - 2) { auto.paused = true; autoUi(); }
    }
    auto.last = ts;
    auto.raf = requestAnimationFrame(tick);
  }
  function autoStart(cr) {
    autoStop(); dropPill();
    auto = { cr, raf: 0, last: 0, acc: 0, paused: false };
    auto.raf = requestAnimationFrame(tick);
    autoUi(); autoBtn(cr);
  }
  function autoStop() {
    if (!auto) return;
    cancelAnimationFrame(auto.raf); const cr = auto.cr; auto = null; autoUi(); autoBtn(cr);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-as]'); if (!a || !auto) return;
    const x = a.dataset.as;
    if (x === 'slow' || x === 'fast') write('autoScroll', Math.max(0, Math.min(SPEEDS.length - 1, speedIx() + (x === 'fast' ? 1 : -1))));
    if (x === 'pause') { auto.paused = !auto.paused; auto.last = 0; }
    if (x === 'stop') return autoStop();
    autoUi();
  });

  // ---------- وصل شدن به خواننده‌ها ----------
  function hook(cr) {
    if (cr.dataset.rt) return; cr.dataset.rt = 1;
    const body = cr.querySelector('.cr-body');
    if (body) new MutationObserver(() => crButtons(cr)).observe(body, { childList: true });
    crButtons(cr); autoBtn(cr);
    cr.addEventListener('click', async e => {
      if (e.target.closest('.rt-auto-b')) { auto?.cr === cr ? autoStop() : autoStart(cr); return; }
      if (e.target.closest('[data-rt-print]')) { printCr(cr); return; }
      const b = e.target.closest('.rt-cp'); if (!b) return;
      e.stopPropagation();
      const s = b.closest('.cr-sec'), title = cr.querySelector('.cr-head h3')?.textContent || cr.querySelector('.cr-title b')?.textContent || '';
      const ar = s.querySelector('.cr-ar').textContent.trim(), tr = s.querySelector('.cr-fa')?.textContent.trim() || '';
      toast(await copyText([ar, tr, title ? `«${title}»، نوران` : ''].filter(Boolean).join('\n\n')) ? '📋 متن کپی شد' : 'کپی انجام نشد');
    });
    cr.addEventListener('scroll', () => {
      if (cr.classList.contains('bk-r')) return;
      clearTimeout(posT); posT = setTimeout(() => savePos(cr), 500);
    }, { passive: true });
  }
  const findAll = () => document.querySelectorAll('body > .cr').forEach(hook);
  new MutationObserver(findAll).observe(document.body, { childList: true });
  findAll();

  document.addEventListener('chlread:open', e => {
    const { key, title, el } = e.detail || {};
    curKey = key; curTitle = title || '';
    hook(el); favBtn(el); crButtons(el); autoBtn(el);
    showResume(el);
  });
  document.addEventListener('chlread:close', e => {
    if (e.detail?.el) savePos(e.detail.el);
    dropPill(); if (auto?.cr === e.detail?.el) autoStop();
    curKey = null;
  });
  // خواننده کتاب بسته شد (بی‌رویداد): حرکت خودکار در tick خودش می‌ایستد.

  document.addEventListener('features:changed', () => {
    document.querySelectorAll('body > .cr').forEach(cr => { crButtons(cr); autoBtn(cr); if (!cr.classList.contains('bk-r')) favBtn(cr); });
    if (!on('resume')) dropPill();
    syncWake();
  });

  // ---------- روشن ماندن صفحه (awake) ----------
  let lock = null, asking = false;
  async function syncWake() {
    const want = on('awake') && !document.hidden && !!(openQr() || openCr());
    if (want && !lock && !asking && 'wakeLock' in navigator) {
      asking = true;
      try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch {} finally { asking = false; }
    } else if (!want && lock) { try { await lock.release(); } catch {} lock = null; }
  }
  setInterval(syncWake, 2000);
  document.addEventListener('visibilitychange', syncWake);

  // ---------- میان‌برهای صفحه‌کلید (keys) ----------
  let help = null;
  function showHelp() {
    help?.remove();
    help = document.createElement('div'); help.className = 'rt-keys';
    help.innerHTML = `<div role="dialog" aria-modal="true" aria-label="میان‌برهای صفحه‌کلید"><h2>میان‌برهای صفحه‌کلید</h2><dl>
<dt><kbd>فاصله</kbd></dt><dd>پخش یا توقف صوت</dd>
<dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>صفحه یا بخش بعد و قبل</dd>
<dt><kbd>+</kbd> <kbd>−</kbd></dt><dd>بزرگ‌تر و کوچک‌تر کردن متن</dd>
<dt><kbd>A</kbd></dt><dd>حرکت خودکار متن (در دعا و کتاب)</dd>
<dt><kbd>/</kbd></dt><dd>جستجو در سایت (وقتی خواننده‌ای باز نیست)</dd>
<dt><kbd>Esc</kbd></dt><dd>بستن</dd>
<dt><kbd>?</kbd></dt><dd>همین راهنما</dd></dl><button type="button">باشه</button></div>`;
    help.addEventListener('click', e => { if (e.target === help || e.target.closest('button')) closeHelp(); });
    document.body.appendChild(help); help.querySelector('button').focus();
  }
  const closeHelp = () => { help?.remove(); help = null; };
  const visibleBtn = (root, sel) => [...root.querySelectorAll(sel)].find(b => b.offsetParent !== null && !b.disabled);
  document.addEventListener('keydown', e => {
    if (!on('keys') || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    if (help) { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); closeHelp(); } return; }
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    // برگه‌های دیگر (ذکرشمار، تصویر، تنظیمات) فاصله و جهت‌ها را برای خودشان دارند.
    if (document.querySelector('.zk-shade, .qp-share, .ft-shade, .mf-shade, .bk-shade, .qf-shade, .ib-shade')) return;
    const qr = openQr(), cr = qr ? null : openCr(), r = qr || cr;
    if (e.key === '?') { e.preventDefault(); showHelp(); return; }
    if (!r) {
      if (e.key === '/' && window.siteSearch?.open && on('search')) { e.preventDefault(); window.siteSearch.open(); }
      return;
    }
    const click = sel => { const b = visibleBtn(r, sel); if (b) { e.preventDefault(); b.click(); } return !!b; };
    if (e.key === ' ' || e.code === 'Space') {
      if (t && t.tagName === 'BUTTON' && r.contains(t)) return; // فاصله روی دکمه همان دکمه را می‌زند
      if (qr) { click('[data-a="play"]'); return; }
      const au = cr.querySelector('.cr-aud:not([hidden]) audio');
      if (au) { e.preventDefault(); au.paused ? au.play().catch(() => {}) : au.pause(); }
      else if (on('autoscroll')) { e.preventDefault(); auto?.cr === cr ? (auto.paused = !auto.paused, auto.last = 0, autoUi()) : autoStart(cr); }
      return;
    }
    if (e.key === 'ArrowLeft') { qr ? click('[data-a="pnext"]') : click('.bk-nav button:first-child:not(.bk-list-btn)'); return; }
    if (e.key === 'ArrowRight') { qr ? click('[data-a="pprev"]') : click('.bk-nav button:last-child:not(.bk-list-btn)'); return; }
    const size = k => { const b = r.querySelector(qr ? `[data-a="${k}"]` : `[data-x="${k}"]`); if (b) { e.preventDefault(); b.click(); } };
    if (e.key === '+' || e.key === '=') return size('bigger');
    if (e.key === '-' || e.key === '_') return size('smaller');
    if ((e.key === 'a' || e.key === 'A' || e.key === 'ش') && cr && on('autoscroll')) { e.preventDefault(); auto?.cr === cr ? autoStop() : autoStart(cr); }
  });
})();
