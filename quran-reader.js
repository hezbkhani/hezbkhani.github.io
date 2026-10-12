// خواندن متن قرآنِ سهم روزانه (عربی + ترجمه فارسی).
// برای اینکه دوباره فقط در نمای مدیر (آدرس با ‎#admin‎) نمایش داده شود، PREVIEW_ONLY را true کنید.
// متن عربی: مصحف مجمع ملک فهد (روایت حفص، رسم عثمان طه) با فونت KFGQPC Uthmanic Hafs.
// ترجمه: آیت‌الله ناصر مکارم شیرازی، از Tanzil.net. داده‌ها در پوشه quran/p هستند (یک فایل برای هر سهم).
(function () {
  const PREVIEW_ONLY = false;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  const fa = '۰۱۲۳۴۵۶۷۸۹', arD = '٠١٢٣٤٥٦٧٨٩';
  const toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const toAr = x => String(x).replace(/\d/g, d => arD[d]);
  const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
  const KEY = 'quranReader';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }
  };
  const prefs = Object.assign({ size: 27, trans: true, night: false }, store.get());
  const save = () => store.set(prefs);

  const css = `
@font-face{font-family:QuranHafs;src:url('quran/uthmanic-hafs.woff2') format('woff2');font-display:block}
.qr-open{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:12px;height:52px;background:var(--deep);border:1px solid var(--gold);font-size:17px}
.qr-open svg{width:22px;height:22px;flex:none}
body.qr-lock{overflow:hidden}
.qr{--bg:#fbf6ea;--card:#fffdf7;--text:#1f1a14;--tr:#4b4036;--muted:#7a6d60;--line:#e6d9bd;--accent:#0b6b50;--gold:#c79a45;
  position:fixed;inset:0;z-index:50;background:var(--bg);color:var(--text);text-shadow:none;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:none}
.qr.night{--bg:#14110d;--card:#1c1813;--text:#efe6d6;--tr:#c9bba7;--muted:#9b8e7c;--line:#3a3127;--accent:#5fc3a0;--gold:#b98f45}
.qr.show{display:block}
.qr-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;padding:8px 10px;padding-top:max(8px,env(safe-area-inset-top));background:var(--accent);color:#fff;box-shadow:0 2px 10px #0003}
.qr.night .qr-bar{background:#0f2a22}
.qr-bar button{flex:none;height:42px;min-width:42px;padding:0 10px;background:transparent;border:0;color:#fff;font-size:22px;line-height:1}
.qr-bar button:hover{background:#ffffff1f}
.qr-title{flex:1;min-width:0;text-align:center;line-height:1.35}
.qr-title b{display:block;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qr-title small{font-size:12.5px;opacity:.85}
.qr-progress{position:absolute;bottom:0;right:0;height:3px;width:0;background:var(--gold);transition:width .1s}
.qr-menu{position:sticky;top:58px;z-index:2;margin:0 auto;max-width:760px;display:none;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);box-shadow:0 8px 20px #0002}
.qr-menu.show{display:grid;gap:12px}
.qr-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:15.5px}
.qr-row .ctl{display:flex;gap:6px}
.qr-row .ctl button,.qr-chip{height:40px;min-width:44px;padding:0 12px;background:transparent;color:var(--text);border:1px solid var(--line);font-size:15px;font-weight:600}
.qr-row .ctl .qr-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}
.qr-body{max-width:760px;margin:0 auto;padding:6px 14px calc(40px + env(safe-area-inset-bottom))}
.qr-sura{margin:22px 0 6px;padding:12px 10px 8px;text-align:center;border:1px solid var(--gold);outline:3px double var(--gold);outline-offset:3px;background:var(--card)}
.qr-sura h3{margin:0;font:normal 30px/1.6 QuranHafs,serif;color:var(--accent)}
.qr-sura small{display:block;font-size:13px;color:var(--muted)}
.qr-bism{margin:16px 0 4px;text-align:center;font:normal calc(var(--qs)*1.05)/2 QuranHafs,serif}
.qr-ayah{padding:14px 2px;border-bottom:1px solid var(--line)}
.qr-ayah:last-child{border-bottom:0}
.qr-ar{margin:0;font:normal var(--qs)/2.15 QuranHafs,serif;text-align:right;word-spacing:1px}
.qr-num{color:var(--accent);white-space:nowrap}
.qr-fa{margin:8px 0 0;font-size:max(15px,calc(var(--qs)*.6));line-height:2;color:var(--tr);text-align:justify}
.qr-fa i{font-style:normal;color:var(--muted);font-size:.85em;margin-left:4px}
.qr.flow .qr-fa{display:none}
.qr.flow .qr-seg{padding:10px 2px;font:normal var(--qs)/2.2 QuranHafs,serif;text-align:justify}
.qr.flow .qr-ayah{display:inline;padding:0;border:0}
.qr.flow .qr-ar{display:inline}
.qr-end{margin:26px 0 10px;padding:18px 16px;text-align:center;background:var(--card);border:1px solid var(--line)}
.qr-end p{margin:0 0 12px;font-size:16px}
.qr-end button{width:100%;max-width:340px;height:50px;background:var(--accent);border:0;color:#fff}
.qr-src{margin:18px 0 0;font-size:12.5px;line-height:1.8;color:var(--muted);text-align:center}
.qr-state{padding:60px 16px;text-align:center;color:var(--muted)}
.qr.night .qr-end button,.qr.night .qr-row .ctl .qr-chip.on{color:#10201a}
.qr-state button{margin-top:12px;height:44px;background:var(--accent);color:#fff;border:0}
@media(min-width:700px){.qr-body{padding-left:24px;padding-right:24px}}
`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const el = document.createElement('div');
  el.className = 'qr';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'متن قرآن سهم امروز');
  el.innerHTML = `
<div class="qr-bar"><button type="button" data-a="close" aria-label="بستن">✕</button>
<div class="qr-title"><b id="qrTitle"></b><small id="qrSub"></small></div>
<button type="button" data-a="menu" aria-label="تنظیمات نمایش" aria-expanded="false" style="font:700 17px Vazirmatn,sans-serif">Aa</button>
<div class="qr-progress" id="qrProgress"></div></div>
<div class="qr-menu" id="qrMenu">
<div class="qr-row"><span>اندازه متن</span><span class="ctl"><button type="button" data-a="smaller" aria-label="کوچک‌تر">−</button><button type="button" data-a="bigger" aria-label="بزرگ‌تر">+</button></span></div>
<div class="qr-row"><span>ترجمه فارسی</span><span class="ctl"><button type="button" class="qr-chip" data-a="trans-on">نمایش</button><button type="button" class="qr-chip" data-a="trans-off">فقط عربی</button></span></div>
<div class="qr-row"><span>رنگ صفحه</span><span class="ctl"><button type="button" class="qr-chip" data-a="day">روز</button><button type="button" class="qr-chip" data-a="night">شب</button></span></div>
</div>
<div class="qr-body" id="qrBody"></div>`;
  document.body.appendChild(el);
  const $ = id => el.querySelector('#' + id);
  const menu = $('qrMenu'), body = $('qrBody');

  let current = null, pushed = false;

  function applyPrefs() {
    el.style.setProperty('--qs', prefs.size + 'px');
    el.classList.toggle('flow', !prefs.trans);
    el.classList.toggle('night', prefs.night);
    el.querySelector('[data-a="trans-on"]').classList.toggle('on', prefs.trans);
    el.querySelector('[data-a="trans-off"]').classList.toggle('on', !prefs.trans);
    el.querySelector('[data-a="day"]').classList.toggle('on', !prefs.night);
    el.querySelector('[data-a="night"]').classList.toggle('on', prefs.night);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  function render(data) {
    let count = 0;
    const html = data.segments.map(seg => {
      const to = seg.from + seg.ayahs.length - 1;
      count += seg.ayahs.length;
      const range = seg.from === 1 && to === seg.n ? `کامل · ${toFa(seg.n)} آیه` : `آیه ${toFa(seg.from)} تا ${toFa(to)}`;
      const bism = seg.from === 1 && seg.s !== 1 && seg.s !== 9 ? `<div class="qr-bism">${BISMILLAH}</div>` : '';
      const ayahs = seg.ayahs.map(([a, t], i) => {
        const n = seg.from + i;
        return `<div class="qr-ayah" id="qa-${seg.s}-${n}"><p class="qr-ar">${esc(a)}&nbsp;<span class="qr-num">${toAr(n)}</span> </p><p class="qr-fa"><i>(${toFa(n)})</i>${esc(t)}</p></div>`;
      }).join('');
      return `<div class="qr-sura"><h3>سُورَةُ ${esc(seg.ar.replace(/^ال/, 'ٱل'))}</h3><small>سوره ${esc(seg.fa)} · ${range}</small></div>${bism}<div class="qr-seg">${ayahs}</div>`;
    }).join('');
    $('qrSub').textContent = `${typeof hizbLabel === 'function' && hizbLabel(current.index) ? `حزب ${toFa(current.index + 1)} · ` : ''}${toFa(count)} آیه`;
    body.innerHTML = html + `<div class="qr-end"><p>پایان سهم امروز. قبول باشد.</p><button type="button" data-a="report">قرائت کردم؛ ثبت گزارش</button>
<p class="qr-src">متن عربی: مصحف مجمع ملک فهد (روایت حفص) · ترجمه: آیت‌الله مکارم شیرازی (Tanzil.net)</p></div>`;
    el.scrollTop = 0;
    onScroll();
  }

  async function load() {
    body.innerHTML = '<div class="qr-state">در حال بارگذاری متن…</div>';
    try {
      const r = await fetch(`quran/p/${String(current.index + 1).padStart(3, '0')}.json`);
      if (!r.ok) throw Error(r.status);
      render(await r.json());
    } catch {
      body.innerHTML = '<div class="qr-state">بارگذاری متن انجام نشد.<br><button type="button" data-a="retry">تلاش دوباره</button></div>';
    }
  }

  function open(task) {
    current = task;
    $('qrTitle').textContent = toFa(task.title);
    $('qrSub').textContent = '';
    applyPrefs();
    menu.classList.remove('show');
    el.classList.add('show');
    document.body.classList.add('qr-lock');
    if (!pushed) { history.pushState({ qr: 1 }, ''); pushed = true; }
    load();
    el.querySelector('[data-a="close"]').focus();
  }

  let afterClose = null;
  function close(fromHistory, then) {
    el.classList.remove('show');
    document.body.classList.remove('qr-lock');
    if (pushed && !fromHistory) { pushed = false; afterClose = then || null; history.back(); return; }
    pushed = false;
    if (then) then();
  }

  window.addEventListener('popstate', () => {
    if (el.classList.contains('show')) close(true);
    const f = afterClose; afterClose = null;
    if (f) setTimeout(f, 50);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('show')) close(); });

  function onScroll() {
    const max = el.scrollHeight - el.clientHeight;
    $('qrProgress').style.width = (max > 0 ? Math.min(100, el.scrollTop / max * 100) : 100) + '%';
  }
  el.addEventListener('scroll', onScroll, { passive: true });

  function keepPlace(fn) {
    // پس از تغییر اندازه یا حالت نمایش، همان آیه‌ای که بالای صفحه بود دوباره بالا بماند.
    const top = el.querySelector('.qr-bar').offsetHeight;
    const anchor = [...el.querySelectorAll('.qr-ayah')].find(a => a.getBoundingClientRect().bottom > top + 4);
    fn();
    if (anchor) el.scrollTop += anchor.getBoundingClientRect().top - top - 8;
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'close') return close();
    if (a === 'menu') { const s = menu.classList.toggle('show'); b.setAttribute('aria-expanded', s); return; }
    if (a === 'retry') return load();
    if (a === 'report') {
      const id = current.id;
      return close(false, () => {
        if (!window.reportId || typeof window.verifyReportIdentity !== 'function') return;
        reportId.value = toFa(id);
        verifyReportIdentity();
        reportId.closest('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    keepPlace(() => {
      if (a === 'smaller') prefs.size = Math.max(20, prefs.size - 2);
      if (a === 'bigger') prefs.size = Math.min(44, prefs.size + 2);
      if (a === 'trans-on') prefs.trans = true;
      if (a === 'trans-off') prefs.trans = false;
      if (a === 'day') prefs.night = false;
      if (a === 'night') prefs.night = true;
      applyPrefs();
    });
    save();
  });

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/></svg>';
  document.addEventListener('task:shown', e => {
    if (!enabled()) return;
    const t = e.detail, box = document.getElementById('result');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qr-open';
    b.innerHTML = `${ICON}<span>خواندن متن قرآن این سهم</span>`;
    b.onclick = () => open(t);
    box.appendChild(b);
  });
})();
