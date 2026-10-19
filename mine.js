// «نوران من» (امکان mine)، برنامه ختم شخصی (plans) و تصویر پایان چله (chlcal). این فایل همیشه بار می‌شود و کوچک می‌ماند:
// گزینه منو، یک خط «ختم قرآن من» در کارت «امروز» (daily.js)، دکمه تصویر پایان چله در کارت چله‌های کامل (chelleh.js) و حساب برنامه ختم.
// خود برگه «نوران من» و تنظیم برنامه در mine-sheet.js است و فقط با اولین باز شدن بار می‌شود.
// برنامه ختم فقط روی همین گوشی است (localStorage، کلید readPlan):
//   { n: روزها، s: شروع، e: پایان، b: [روز پایه، صفحه خوانده‌شده تا آن روز]، last: آخرین صفحه خوانده‌شده، log: { روز: [صفحه پیش از آن روز، تا صفحه] } }
// سهم هر روز از «پایه» تا پایان برنامه به‌طور مساوی پخش می‌شود؛ با «پخش عقب‌ماندگی» پایه به امروز می‌آید.
(function () {
  const shown = id => !!window.features?.shown(id);
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const DAY = 864e5, PAGES = 604;
  const isoAdd = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const isoDiff = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / DAY);
  // روز قرائت سایت (app.js: از اذان صبح عوض می‌شود)، تا با چله‌ها و حزب‌خوانی یکی باشد.
  const today = () => typeof isoIran === 'function' ? isoIran() : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());

  const css = `
#dlCard .nm-pl{display:flex;gap:6px;margin:6px 0 0}
#dlCard .nm-pl .dl-act{flex:1;min-width:0}
#dlCard .nm-rd{flex:none;min-width:64px;height:auto;min-height:46px;padding:0 12px;background:var(--emerald);color:#fff;border:1px solid var(--gold);border-radius:var(--r);font-weight:600}
.chl-card .nm-cert{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:auto;min-height:48px;margin:10px 0 0;font-weight:700;white-space:normal}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- برنامه ختم ----------
  const plan = {
    get() {
      const p = read('readPlan', null), day = /^\d{4}-\d{2}-\d{2}$/, int = Number.isInteger;
      if (!(p && int(p.n) && p.n > 0 && day.test(p.s) && day.test(p.e) && Array.isArray(p.b) && day.test(p.b[0]) && int(p.b[1]) && p.log && typeof p.log === 'object')) return null;
      // فقط عدد و تاریخ؛ این مقدارها در HTML کارت‌ها می‌آیند
      if (!int(p.last ??= 0) || !Object.entries(p.log).every(([d, L]) => day.test(d) && Array.isArray(L) && L.length === 2 && L.every(int))) return null;
      return p;
    },
    save(p) { write('readPlan', p); changed(); return p; },
    create(n) { const s = today(); return plan.save({ n, s, e: isoAdd(s, n - 1), b: [s, 0], last: 0, log: {}, t: Date.now() }); },
    // تا پایان روز iso باید تا کدام صفحه خوانده شده باشد
    target(p, iso) {
      const [bd, bp] = p.b, D = isoDiff(p.e, bd) + 1, k = isoDiff(iso, bd) + 1;
      return k <= 0 ? bp : k >= D ? PAGES : bp + Math.round((PAGES - bp) * k / D);
    },
    rate: p => Math.ceil(PAGES / p.n),
    status(p) {
      const t = today(), L = p.log[t];
      if (p.last >= PAGES) return { t, fin: true };
      const over = t > p.e, tT = plan.target(p, t), tY = plan.target(p, isoAdd(t, -1));
      const size = over ? plan.rate(p) : Math.max(1, tT - tY);
      const from = L ? L[0] + 1 : p.last + 1, to = L ? L[1] : Math.min(PAGES, p.last + size);
      return { t, done: !!L, from, to, over, tT, behind: Math.max(0, (L ? tT : tY) - p.last), day: isoDiff(t, p.s) + 1 };
    },
    // خواندم تا صفحه to (برای امروز)
    mark(p, to) {
      const t = today(), L = p.log[t];
      to = Math.max(1, Math.min(PAGES, to));
      p.log[t] = [L ? L[0] : p.last, to]; p.last = to;
      if (p.log[t][1] <= p.log[t][0]) { p.last = p.log[t][0]; delete p.log[t]; }
      if (p.last >= PAGES) p.fin = t;
      return plan.save(p);
    },
    undo(p) {
      const t = today(), L = p.log[t];
      if (L) { p.last = L[0]; delete p.log[t]; delete p.fin; if (p.b[0] > t || p.b[1] > p.last) p.b = [t, p.last]; } // پایه‌ای که پس از ثبت امروز گذاشته شده بود
      return plan.save(p);
    },
    // عقب‌ماندگی در روزهای باقی‌مانده پخش می‌شود؛ اگر زمان برنامه گذشته، با همان سرعت روزانه چند روز اضافه می‌شود.
    spread(p) {
      const t = today(), base = p.log[t] ? isoAdd(t, 1) : t;
      if (base > p.e) p.e = isoAdd(base, Math.ceil((PAGES - p.last) / plan.rate(p)) - 1);
      p.b = [base, p.last];
      return plan.save(p);
    }
  };

  // ---------- باز کردن برگه (بار شدن تنبل mine-sheet.js) ----------
  let loading = null;
  const load = () => loading || (loading = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'mine-sheet.js?v=2';
    s.onload = ok; s.onerror = () => { loading = null; no(); };
    document.head.appendChild(s);
  }));
  const open = mode => load().then(() => window.nrMineSheet.open(mode)).catch(() => {});
  // سوره و آیه اول هر صفحه از quran/index.json (همان فهرست قرآن‌خوان)؛ صفحه در «قرآن آزاد» باز می‌شود.
  async function readPage(p) {
    try { const ix = await window.quranReader.index(); window.quranFree?.openAt(ix.page[p - 1]); } catch {}
  }

  // ---------- خط «ختم قرآن من» در کارت امروز ----------
  function lineHtml() {
    const p = shown('plans') && plan.get(); if (!p) return '';
    const s = plan.status(p);
    if (s.fin) return p.fin && isoDiff(today(), p.fin) <= 2 ? `<div class="nm-pl"><button type="button" class="dl-act" data-nm-plan><span class="dl-ic">🎉</span><span><b>ختم قرآن شما کامل شد</b><small>قبول باشد. برای برنامه تازه بزنید</small></span><span class="dl-go">‹</span></button></div>` : '';
    return `<div class="nm-pl"><button type="button" class="dl-act" data-nm-plan><span class="dl-ic">🎯</span><span><b>ختم قرآن من</b><small>${s.done ? `✓ سهم امروز خوانده شد (تا صفحه ${toFa(s.to)})` : `امروز صفحه ${toFa(s.from)}${s.to > s.from ? ` تا ${toFa(s.to)}` : ''}${s.behind ? '، عقب‌تر از برنامه' : ''}`}</small></span><span class="dl-go">‹</span></button>${s.done ? '' : `<button type="button" class="nm-rd" data-nm-read="${s.from}">بخوان</button>`}</div>`;
  }
  let lineKey = '';
  function placeLine() {
    const card = document.getElementById('dlCard'); if (!card || card.hidden) return;
    const old = card.querySelector('.nm-pl');
    if (old && old.dataset.k === lineKey) return;
    if (old) old.remove();
    if (!lineKey) return;
    card.insertAdjacentHTML('beforeend', lineKey);
    card.lastElementChild.dataset.k = lineKey;
  }
  function refreshLine() { lineKey = lineHtml(); placeLine(); }
  // daily.js کارت را با هر تغییر از نو می‌سازد؛ خط برنامه پس از آن دوباره گذاشته می‌شود.
  { const intro = document.getElementById('introPanel'); if (intro) new MutationObserver(placeLine).observe(intro, { childList: true, subtree: true }); }

  // ---------- تصویر پایان چله (با shareCard در qr-plus.js) ----------
  function certs() {
    document.querySelectorAll('.nm-cert').forEach(b => b.remove());
    if (!shown('chlcal') || !window.shareCard) return;
    (window.chlMine?.() || []).forEach(m => {
      const n = (m.marked || []).length, card = document.getElementById('chlC' + m.code);
      if (!card || !m.days || n < m.days || !m.start_date) return;
      card.querySelector('.chl-actions, .chl-msg')?.insertAdjacentHTML('beforebegin', `<button type="button" class="reg-light nm-cert" data-nm-cert="${esc(m.code)}">🏅 تصویر پایان ${m.kind === 'text' ? 'چله' : 'دوره'}</button>`);
    });
  }
  document.addEventListener('chl:panel', certs);

  // ---------- منو ----------
  function menuSub() {
    const t = today(), p = shown('plans') && plan.get(), s = p && plan.status(p);
    const left = (window.chlMine?.() || []).filter(m => m.start_date && m.start_date <= t && !m.reserve && isoDiff(t, m.start_date) < m.days && !(m.marked || []).includes(t)).length + (s && !s.fin && !s.done ? 1 : 0);
    return left ? `امروز ${toFa(left)} کار مانده` : 'دوره‌ها، کارهای امروز، نشانه‌ها و خلاصه ماه';
  }
  window.siteMenu?.section({
    id: 'mine', order: -50,
    render(box) { if (shown('mine')) box.innerHTML = `<button type="button" class="sm-item" data-nm-open><span class="sm-ic">🏠</span><span>نوران من<small>${esc(menuSub())}</small></span><span class="sm-go">‹</span></button>`; }
  });
  // اگر «نوران من» خاموش باشد، برنامه ختم کنار «قرآن آزاد» در منو می‌آید.
  window.siteMenu?.section({
    id: 'plans', order: 3.5,
    render(box) {
      if (!shown('plans') || shown('mine')) return;
      const p = plan.get(), s = p && plan.status(p);
      const it = `<button type="button" class="sm-item" data-nm-open="plan"><span class="sm-ic">🎯</span><span>برنامه ختم قرآن من<small>${s ? s.fin ? 'ختم کامل شد. قبول باشد' : s.done ? 'سهم امروز خوانده شد' : `امروز صفحه ${toFa(s.from)} تا ${toFa(s.to)}` : 'ختم در ۳۰، ۶۰ یا ۱۲۰ روز، با سهم هر روز'}</small></span><span class="sm-go">‹</span></button>`;
      const a = document.querySelector('.sm [data-qp-saved]') || document.querySelector('.sm [data-qf-open]');
      if (a) a.insertAdjacentHTML('afterend', it); else box.innerHTML = `<h3>قرآن</h3>${it}`;
    }
  });

  document.addEventListener('click', e => {
    const o = e.target.closest('.sm [data-nm-open]');
    if (o) { window.siteMenu.close(); setTimeout(() => open(o.dataset.nmOpen || 'all'), 280); return; }
    if (e.target.closest('#dlCard [data-nm-plan]')) return open('plan');
    const r = e.target.closest('#dlCard [data-nm-read]'); if (r) return readPage(+r.dataset.nmRead);
    const c = e.target.closest('[data-nm-cert]');
    if (c) { const m = (window.chlMine?.() || []).find(x => x.code === c.dataset.nmCert); if (m) load().then(() => window.nrMineSheet.cert(m)).catch(() => {}); }
  });

  function changed() { refreshLine(); window.siteMenu?.refresh(); document.dispatchEvent(new Event('mine:changed')); }
  document.addEventListener('features:changed', () => { refreshLine(); certs(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLine(); });
  setInterval(() => { if (!document.hidden) refreshLine(); }, 60000);
  refreshLine(); certs(); // کارت چله‌ها ممکن است پیش از بار شدن این فایل ساخته شده باشد

  window.nrMine = { plan, open, readPage, today, isoAdd, isoDiff, shown, PAGES };
})();
