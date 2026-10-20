// منوی سه‌خط بالا سمت چپ: میان‌بر به بخش‌های صفحه، و بخش‌هایی که فایل‌های دیگر اضافه می‌کنند (مثل ثبت‌نام چله در chelleh.js).
// استفاده: siteMenu.section({ id, order, render(box) }) ؛ siteMenu.open() / siteMenu.close() / siteMenu.refresh()
(function () {
  const css = `
.sm-btn{position:fixed;top:max(10px,env(safe-area-inset-top));left:10px;z-index:30;width:48px;height:48px;padding:0;display:flex;align-items:center;justify-content:center;background:rgba(0,92,69,.92);border:1px solid var(--gold);box-shadow:0 4px 14px #0006;color:#fff;border-radius:12px}
.sm-btn svg{width:26px;height:26px}
.sm-btn:hover{background:var(--deep)}
.sm-btn{transition:transform .25s ease,opacity .25s}
.sm-btn.away{transform:translateY(-140%);opacity:0;pointer-events:none}
.sm-btn .sm-dot{position:absolute;top:7px;right:7px;width:9px;height:9px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 2px rgba(0,92,69,.92)}
.sm-shade{position:fixed;inset:0;z-index:45;background:#0008;opacity:0;pointer-events:none;transition:opacity .2s}
.sm-shade.show{opacity:1;pointer-events:auto}
.sm{position:fixed;top:0;bottom:0;left:0;z-index:46;width:min(88vw,380px);background:#fffaf0;color:var(--ink);text-shadow:none;box-shadow:6px 0 30px #0007;transform:translateX(-105%);transition:transform .25s ease;display:flex;flex-direction:column;font-size:16px}
.sm.show{transform:none}
.sm-head{display:flex;align-items:center;gap:10px;padding:12px 14px;padding-top:max(12px,env(safe-area-inset-top));background:var(--deep);color:#fff;border-bottom:2px solid var(--gold)}
.sm-head img{width:40px;height:40px;object-fit:contain;border-radius:10px}
.sm-head b{flex:1;font:normal 26px/1.5 SiteFont,Tahoma,serif}
.sm-head button{width:42px;height:42px;padding:0;background:transparent;border:0;font-size:24px;color:#fff}
.sm-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px 0 calc(20px + env(safe-area-inset-bottom))}
.sm-sec{padding:6px 0;border-bottom:1px solid #eadfca}
.sm-sec:last-child{border-bottom:0}
.sm-sec h3{margin:8px 16px 4px;font-size:14px;font-weight:700;color:var(--muted);letter-spacing:0}
.sm-item{display:flex;align-items:center;gap:12px;width:100%;height:auto;min-height:52px;padding:8px 16px;background:transparent;border:0;border-radius:0;color:var(--ink);text-align:right;font-weight:500;font-size:16px;white-space:normal;line-height:1.6}
.sm-item:hover,.sm-item:focus-visible{background:var(--hover)}
.sm-item .sm-ic{flex:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--mint);color:var(--deep);font-size:19px}
.sm-item span{flex:1;min-width:0}
.sm-item small{display:block;color:var(--muted);font-size:13px;font-weight:400;line-height:1.6}
.sm-item .sm-go{flex:none;color:var(--muted);font-size:18px}
.sm-note{margin:6px 16px;font-size:14px;color:var(--muted)}
.sm-grp{display:flex;align-items:center;gap:8px;width:100%;height:auto;min-height:44px;margin:0;padding:6px 16px;background:transparent;border:0;border-radius:0;color:var(--deep);text-align:right;font-size:15px;font-weight:700;line-height:1.6}
.sm-grp:hover,.sm-grp:focus-visible{background:var(--hover)}
.sm-grp b{flex:1;font-weight:700}
.sm-grp small{flex:none;min-width:24px;padding:0 7px;border-radius:999px;background:var(--mint);color:var(--deep);font-size:13px;font-weight:500;text-align:center}
.sm-grp i{flex:none;font-style:normal;color:var(--muted);font-size:14px;transition:transform .2s}
.sm-grp[aria-expanded="true"] i{transform:rotate(180deg)}
.sm-grp-body[hidden]{display:none}
body.sm-lock{overflow:hidden}
@media(max-width:600px){header{padding-top:max(8vh,64px)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sm-btn'; btn.setAttribute('aria-label', 'منو'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const shade = document.createElement('div'); shade.className = 'sm-shade';
  const nav = document.createElement('nav'); nav.className = 'sm'; nav.setAttribute('aria-label', 'منو'); nav.setAttribute('aria-hidden', 'true');
  nav.innerHTML = `<div class="sm-head"><img src="icon-192.png" alt=""><b>نوران</b><button type="button" data-sm-search aria-label="جستجو" hidden><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button><button type="button" data-sm-close aria-label="بستن">✕</button></div><div class="sm-body"></div>`;
  document.body.append(btn, shade, nav);
  // منوی بسته با Tab در دسترس نیست و وقتی باز است، Tab فقط داخل منو می‌چرخد.
  nav.inert = true;
  const behind = on => document.querySelectorAll('main, .site-foot').forEach(el => { el.inert = on; });
  const body = nav.querySelector('.sm-body');

  // میان‌برهای ثابت به بخش‌های صفحه؛ فقط بخش‌هایی که الان دیده می‌شوند.
  const LINKS = [
    ['pid', '📖', 'سهم امروز من', 'دیدن سهم و متن قرائت امروز'],
    ['reportId', '✅', 'گزارش قرائت', 'اعلام قرائت سهم امروز'],
    ['nameSearch', '🔎', 'فراموشی شناسه', 'جستجوی نام در گروه‌ها'],
    ['registerPanel', '📝', 'ثبت‌نام دوره حزب‌خوانی', '']
  ];
  const sections = [];
  const visible = el => el && !el.closest('[hidden]') && el.offsetParent !== null;
  function render() {
    body.innerHTML = '';
    // بخش‌های order ≥ ۵۰ (تنظیمات، زمینه صفحه) پس از میان‌برهای حزب‌خوانی، ته منو می‌آیند.
    const sorted = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0)), tail = document.createDocumentFragment();
    sorted.forEach(s => {
      const box = document.createElement('div'); box.className = 'sm-sec'; box.dataset.sec = s.id;
      try { s.render(box); } catch (e) { console.error(e); }
      if (box.childNodes.length) ((s.order || 0) >= 50 ? tail : body).appendChild(box);
    });
    // بخش‌های حزب‌خوانی در صفحه اول فقط برای اعضا دیده می‌شوند (home.js)؛ در منو همیشه هستند و با زدن، باز می‌شوند.
    // اگر «قرآن حزب‌خوانی» در فهرست ثبت‌نام دوره‌ها هست، همان ثبت‌نام دوباره زیر حزب‌خوانی نمی‌آید.
    const hezbListed = !!body.querySelector('[data-chl-type="hezb"]');
    const links = LINKS.filter(([id]) => id === 'registerPanel' ? !hezbListed && (window.regHasOpen || visible(document.getElementById(id))) : document.getElementById(id));
    if (links.length) {
      const box = document.createElement('div'); box.className = 'sm-sec';
      box.innerHTML = '<h3>حزب‌خوانی قرآن</h3>' + links.map(([id, ic, t, s]) => `<button type="button" class="sm-item" data-sm-to="${id}"><span class="sm-ic">${ic}</span><span>${t}${s ? `<small>${s}</small>` : ''}</span><span class="sm-go">‹</span></button>`).join('');
      body.appendChild(box);
    }
    body.appendChild(tail);
    fold();
  }
  // هر عنوان بخش (h3) با چند گزینه زیرش جمع می‌شود و با زدن باز می‌شود؛ باز یا بسته بودن هر دسته روی همین گوشی می‌ماند.
  // دسته‌های یک‌گزینه‌ای (تنظیمات، نصب، پیشنهادها) همان‌طور باز می‌مانند. «حزب‌خوانی قرآن» برای عضو گروه از اول باز است.
  const FOLD = 'smOpen';
  const folds = () => { try { return JSON.parse(localStorage.getItem(FOLD)) || {}; } catch { return {}; } };
  const isMember = () => { try { return !!JSON.parse(localStorage.getItem('me'))?.id; } catch { return false; } };
  function fold() {
    const saved = folds();
    body.querySelectorAll('.sm-sec h3').forEach(h => {
      const items = [];
      for (let n = h.nextSibling; n && n.nodeName !== 'H3'; n = n.nextSibling) items.push(n);
      const count = items.reduce((c, n) => c + (n.nodeType === 1 ? (n.matches('.sm-item') ? 1 : n.querySelectorAll('.sm-item').length) : 0), 0);
      if (count === 1) return;
      const key = h.textContent.trim(), open = key in saved ? saved[key] : key === 'حزب‌خوانی قرآن' && isMember();
      const box = document.createElement('div'); box.className = 'sm-grp-body'; box.hidden = !open; box.append(...items);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sm-grp'; b.setAttribute('aria-expanded', open);
      b.innerHTML = `<b></b>${count ? `<small>${count.toLocaleString('fa-IR')}</small>` : ''}<i>▾</i>`;
      b.querySelector('b').textContent = key;
      b.onclick = () => {
        const on = box.hidden; box.hidden = !on; b.setAttribute('aria-expanded', on);
        const f = folds(); f[key] = on; try { localStorage.setItem(FOLD, JSON.stringify(f)); } catch {}
        // دسته تازه‌بازشده تا جای ممکن دیده شود، بی‌آنکه عنوانش از بالا بیرون برود.
        if (on) { const r = body.getBoundingClientRect(), over = box.getBoundingClientRect().bottom - r.bottom; if (over > 0) body.scrollBy({ top: Math.min(over + 8, b.getBoundingClientRect().top - r.top), behavior: 'smooth' }); }
      };
      h.replaceWith(b, box);
    });
  }
  let lastFocus = null;
  function open() {
    render();
    lastFocus = document.activeElement;
    nav.classList.add('show'); shade.classList.add('show'); document.body.classList.add('sm-lock');
    nav.setAttribute('aria-hidden', 'false'); btn.setAttribute('aria-expanded', 'true'); nav.inert = false; behind(true);
    try { if (!history.state?.sm) history.pushState({ sm: 1 }, ''); } catch {}
    setTimeout(() => nav.querySelector('[data-sm-close]').focus(), 50);
  }
  function close(fromHistory) {
    if (!nav.classList.contains('show')) return;
    nav.classList.remove('show'); shade.classList.remove('show'); document.body.classList.remove('sm-lock');
    nav.setAttribute('aria-hidden', 'true'); btn.setAttribute('aria-expanded', 'false'); nav.inert = true; behind(false);
    if (!fromHistory) { try { if (history.state?.sm) history.back(); } catch {} }
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch {}
  }
  btn.onclick = () => (nav.classList.contains('show') ? close() : open());
  shade.onclick = () => close();
  nav.addEventListener('click', e => {
    if (e.target.closest('[data-sm-close]')) return close();
    const to = e.target.closest('[data-sm-to]');
    if (to) {
      close();
      if (to.dataset.smTo === 'registerPanel' && window.regOpenPublic) { setTimeout(() => window.regOpenPublic(), 280); return; }
      window.hezbReveal?.();
      const el = document.getElementById(to.dataset.smTo), panel = el && (el.closest('.panel') || el);
      setTimeout(() => { if (!panel) return; panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (el.tagName === 'INPUT') setTimeout(() => el.focus({ preventScroll: true }), 400); }, 280);
    }
  });
  window.addEventListener('popstate', () => close(true));
  // هنگام پایین رفتن در صفحه دکمه کنار می‌رود تا روی محتوا نیفتد؛ با کمی بالا آمدن دوباره پیدا می‌شود.
  let lastY = scrollY;
  // در بخش مدیریت، وقتی نوار زبانه‌ها بالای صفحه چسبیده، دکمه روی زبانه آخر می‌افتاد؛ آنجا کنار می‌رود.
  const tabsUnder = () => { const t = document.querySelector('.adm-tabs'); if (!t || !t.offsetParent) return false; const r = t.getBoundingClientRect(); return r.top < 70 && r.bottom > 0; };
  addEventListener('scroll', () => {
    const y = scrollY, d = y - lastY;
    if (Math.abs(d) < 8) return;
    btn.classList.toggle('away', (d > 0 && y > 120 || tabsUnder()) && !nav.classList.contains('show'));
    lastY = y;
  }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  const dots = {};
  // تا وقتی کسی وسط ساختن «زمینه من» است (تصویر انتخاب کرده یا در حال انتخاب است)، منو از نو ساخته نمی‌شود تا کارش پاک نشود؛ بار بعدِ باز کردن منو تازه می‌شود.
  const busy = () => !!body.querySelector('.bgp-mine > *');
  window.siteMenu = {
    section(s) { const i = sections.findIndex(x => x.id === s.id); if (i >= 0) sections[i] = s; else sections.push(s); if (nav.classList.contains('show') && !busy()) render(); },
    open, close,
    refresh() { if (nav.classList.contains('show') && !busy()) render(); },
    // برای جستجو (search.js): همه گزینه‌های منو، ساخته‌شده در همان جای خودشان (بی‌آنکه منو باز شود)، تا با زدن دقیقاً همان کار را بکنند.
    items() { if (!nav.classList.contains('show')) render(); return body; },
    // نقطه طلایی روی دکمه منو؛ هر بخش با کلید خودش (مثلاً 'fb' برای پاسخ تازه به پیشنهاد) روشن یا خاموشش می‌کند.
    dot(on, key = 'chl') { dots[key] = !!on; on = Object.values(dots).some(Boolean); let d = btn.querySelector('.sm-dot'); if (on && !d) { d = document.createElement('i'); d.className = 'sm-dot'; btn.appendChild(d); } else if (!on && d) d.remove(); }
  };
})();
