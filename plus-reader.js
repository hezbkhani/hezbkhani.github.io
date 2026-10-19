// ابزارهای خواننده دعا و کتاب (plus.js این فایل را با باز شدن اولین خواننده بار می‌کند)، هر کدام پشت کلید خودش در features.js:
//  find: دکمه ذره‌بین در نوار بالا؛ کلمه در متن عربی و ترجمه پیدا می‌شود، بی‌توجه به اعراب و شکل «ی/ي/ى» و «ک/ك» و همزه‌ها.
//        نشان دادن با CSS Custom Highlight (بی‌دست زدن به متن)؛ مرورگرهای قدیمی‌تر فقط به جای پیدا شده می‌روند و آن را انتخاب می‌کنند.
//  progress: «حدود N دقیقه» زیر عنوان متن و «M دقیقه مانده» کنار نوار پیشرفتِ خود خواننده (‎.cr-prog‎)؛
//            سرعت: ۱۱۰ کلمه عربی در دقیقه (قرائت شمرده) و ۱۸۰ کلمه ترجمه، فقط اگر ترجمه نمایش داده می‌شود.
//  sharelink: ردیف «فرستادن پیوند» در ⚙ خواننده؛ پیوند مستقیم ‎?mafatih=NNN‎، ‎?book=..&n=..‎ یا ‎?read=کلید‎ (plus.js).
(function () {
  const on = id => !!window.features?.shown(id);
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HL = !!(window.CSS?.highlights && window.Highlight);
  document.head.insertAdjacentHTML('beforeend', `<style>
.px-find{position:sticky;top:var(--px-bar,56px);z-index:3;display:flex;align-items:center;gap:6px;margin:0;padding:6px 10px;background:var(--cream,#fdf6e6);border-bottom:1px solid var(--gold);box-shadow:0 4px 10px #0002}
.cr.night .px-find{background:#1f2a25;border-color:#3d5a4c}
.px-find input{flex:1;min-width:0;height:42px;padding:0 10px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:16px;background:#fff;color:#2b241a}
.px-find span{flex:none;min-width:52px;text-align:center;font-size:14px;color:var(--muted)}
.px-find button{flex:none;width:40px;height:40px;padding:0;background:transparent;border:0;color:inherit;font-size:18px}
::highlight(px-hit){background:#ffe08a;color:#2b241a}
::highlight(px-cur){background:#f0a33a;color:#1b140c}
.cr-head .px-min{display:block;margin-top:2px;font-size:13.5px;opacity:.75}
.px-left{position:absolute;bottom:4px;left:8px;font-size:11.5px;line-height:1;opacity:.8;pointer-events:none}
</style>`);
  // نویسه‌ها برای مقایسه: بی‌اعراب، یکسان‌شدن شکل‌ها؛ و نقشه هر نویسه به جای اصلی‌اش در متن
  const MARK = /[ؐ-ًؚ-ٰٟۖ-ۭـ‌‍]/;
  const SAME = { 'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ك': 'ک', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ة': 'ه', 'ۀ': 'ه' };
  const norm = s => { let o = ''; for (const c of s) if (!MARK.test(c)) o += SAME[c] || c.toLowerCase(); return o.replace(/\s+/g, ' '); };
  function index(root) {
    const nodes = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.cr-ar,.cr-fa,.cr-tr,.cr-note,.cr-head') && !n.parentElement.closest('button') ? 1 : 2 });
    let n; while ((n = w.nextNode())) nodes.push(n);
    return nodes.map(node => { const map = []; let s = ''; const t = node.data; for (let i = 0; i < t.length; i++) { const c = t[i]; if (MARK.test(c)) continue; const x = SAME[c] || c.toLowerCase(); s += /\s/.test(x) ? ' ' : x; map.push(i); } return { node, s, map }; });
  }
  let F = null; // { cr, box, hits: [Range], i }
  function findBar(cr) {
    if (F?.cr === cr) { F.box.querySelector('input').focus(); return; }
    closeFind();
    const box = document.createElement('div'); box.className = 'px-find'; box.setAttribute('role', 'search');
    box.innerHTML = '<input type="search" enterkeyhint="search" placeholder="جستجو در همین متن" aria-label="جستجو در همین متن"><span aria-live="polite"></span><button type="button" data-f="prev" aria-label="قبلی">▲</button><button type="button" data-f="next" aria-label="بعدی">▼</button><button type="button" data-f="x" aria-label="بستن جستجو">✕</button>';
    const bar = cr.querySelector('.cr-bar'); bar.after(box);
    cr.style.setProperty('--px-bar', bar.offsetHeight + 'px');
    F = { cr, box, hits: [], i: 0, ix: null };
    let t = 0;
    box.querySelector('input').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => run(e.target.value), 180); });
    box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); move(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.stopPropagation(); closeFind(); } });
    box.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; b.dataset.f === 'x' ? closeFind() : move(b.dataset.f === 'next' ? 1 : -1); });
    box.querySelector('input').focus();
  }
  function run(q) {
    if (!F) return;
    const k = norm(q.trim()); F.hits = []; F.i = 0;
    if (k.length >= 2) {
      F.ix = F.ix || index(F.cr.querySelector('.cr-body') || F.cr);
      for (const { node, s, map } of F.ix) {
        let p = s.indexOf(k);
        while (p >= 0 && F.hits.length < 500) {
          const r = document.createRange(); r.setStart(node, map[p]); r.setEnd(node, map[p + k.length - 1] + 1); F.hits.push(r);
          p = s.indexOf(k, p + k.length);
        }
      }
    }
    paint(); if (F.hits.length) show();
  }
  function paint() {
    const n = F.hits.length, s = F.box.querySelector('span');
    s.textContent = F.box.querySelector('input').value.trim().length < 2 ? '' : n ? `${fa(F.i + 1)} از ${fa(n)}` : 'نیست';
    if (HL) { CSS.highlights.set('px-hit', new Highlight(...F.hits)); CSS.highlights.set('px-cur', n ? new Highlight(F.hits[F.i]) : new Highlight()); }
  }
  function move(d) { if (!F || !F.hits.length) return; F.i = (F.i + d + F.hits.length) % F.hits.length; paint(); show(); }
  function show() {
    const r = F.hits[F.i], el = r.startContainer.parentElement, cr = F.cr, top = r.getBoundingClientRect().top - cr.getBoundingClientRect().top;
    cr.scrollTo({ top: cr.scrollTop + top - cr.clientHeight / 3, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (!HL) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    el.closest('details')?.setAttribute('open', '');
  }
  function closeFind() {
    if (!F) return;
    F.box.remove(); if (HL) { CSS.highlights.delete('px-hit'); CSS.highlights.delete('px-cur'); }
    F = null;
  }
  const findBtn = cr => {
    const bar = cr.querySelector('.cr-bar'); if (!bar) return;
    let b = bar.querySelector('.px-find-b');
    if (!on('find')) { b?.remove(); if (F?.cr === cr) closeFind(); return; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'rt-b px-find-b'; b.setAttribute('aria-label', 'جستجو در متن'); b.title = 'جستجو در متن';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
      bar.querySelector('[data-x="menu"]').before(b);
    }
  };

  // ---------- زمان خواندن ----------
  function minutes(cr) {
    const body = cr.querySelector('.cr-body'); if (!body) return 0;
    const count = sel => [...body.querySelectorAll(sel)].filter(e => e.offsetParent !== null).reduce((a, e) => a + (e.textContent.trim().split(/\s+/).filter(Boolean).length), 0);
    return count('.cr-ar') / 110 + count('.cr-fa,.cr-tr') / 180;
  }
  function timeInfo(cr) {
    const head = cr.querySelector('.cr-body .cr-head'), prog = cr.querySelector('.cr-prog');
    let m = cr.querySelector('.px-min'), left = cr.querySelector('.px-left');
    if (!on('progress') || !head) { m?.remove(); left?.remove(); return; }
    const total = minutes(cr); cr._pxMin = total;
    if (total < 1.5) { m?.remove(); left?.remove(); return; }
    if (!m) { m = document.createElement('small'); m.className = 'px-min'; head.appendChild(m); }
    const txt = `⏱️ خواندن حدود ${fa(Math.round(total))} دقیقه`;
    if (m.textContent !== txt) m.textContent = txt;
    if (prog && !left) { left = document.createElement('span'); left.className = 'px-left'; prog.parentElement.appendChild(left); }
    tick(cr);
  }
  function tick(cr) {
    const left = cr.querySelector('.px-left'); if (!left || !cr._pxMin) return;
    const h = cr.scrollHeight - cr.clientHeight, r = h > 0 ? cr.scrollTop / h : 0, m = Math.round(cr._pxMin * (1 - r));
    left.textContent = r > 0.02 ? (m >= 1 ? `${fa(m)} دقیقه مانده` : 'پایان نزدیک است') : '';
  }

  // ---------- فرستادن پیوند ----------
  function link(cr) {
    const u = new URL(location.origin + location.pathname);
    if (cr.classList.contains('bk-r')) {
      let last = {}; try { last = JSON.parse(localStorage.getItem('bookLast')) || {}; } catch {}
      const key = cr.dataset.book, l = key && last[key];
      if (!l) return null;
      u.searchParams.set('book', key); u.searchParams.set('n', `${l.part}-${l.n}`);
    } else {
      const k = window.plusReaderKey || ''; let m;
      if ((m = /^books\/mafatih\/(\d{3})$/.exec(k))) u.searchParams.set('mafatih', m[1]);
      else if (/^[a-z0-9_]{2,30}$/.test(k)) u.searchParams.set('read', k);
      else return null;
    }
    return u.toString();
  }
  function shareRow(cr) {
    const menu = cr.querySelector('.cr-menu'); if (!menu) return;
    let r = menu.querySelector('.px-share');
    if (on('sharelink') && !r) {
      r = document.createElement('div'); r.className = 'cr-row px-share';
      r.innerHTML = '<span>پیوند این متن</span><div><button type="button" data-px-share>🔗 فرستادن پیوند</button></div>';
      menu.appendChild(r);
    } else if (!on('sharelink') && r) r.remove();
  }
  async function share(cr) {
    cr.querySelector('.cr-menu')?.classList.remove('show');
    const url = link(cr), title = cr.querySelector('.cr-title b')?.textContent || 'نوران';
    if (!url) return toast('برای این متن پیوند مستقیم نیست.');
    if (navigator.share) { try { await navigator.share({ title, text: `«${title}» در نوران`, url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); toast('🔗 پیوند کپی شد'); } catch { toast(url); }
  }
  function toast(t) {
    document.querySelector('.rt-toast')?.remove();
    const d = document.createElement('div'); d.className = 'rt-toast'; d.setAttribute('role', 'status'); d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2800);
  }

  // ---------- وصل شدن به خواننده‌ها ----------
  function hook(cr) {
    findBtn(cr); shareRow(cr);
    if (cr.dataset.px) return; cr.dataset.px = 1;
    const body = cr.querySelector('.cr-body');
    // متن تازه (دعای دیگر، صفحه بعد کتاب، تغییر ترجمه): جستجو و زمان از نو
    const mine = ms => ms.every(m => m.target.closest?.('.px-min') || (m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].every(n => n.classList?.contains('px-min'))));
    if (body) new MutationObserver(ms => { if (mine(ms)) return; if (F?.cr === cr) { F.ix = null; run(F.box.querySelector('input').value); } clearTimeout(cr._pxT); cr._pxT = setTimeout(() => timeInfo(cr), 250); }).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    cr.addEventListener('click', e => {
      if (e.target.closest('.px-find-b')) return findBar(cr);
      if (e.target.closest('[data-px-share]')) return share(cr);
      if (e.target.closest('[data-x="close"]') && F?.cr === cr) closeFind();
    });
    cr.addEventListener('scroll', () => tick(cr), { passive: true });
    new MutationObserver(() => { if (!cr.classList.contains('show') && F?.cr === cr) closeFind(); }).observe(cr, { attributes: true, attributeFilter: ['class'] });
    timeInfo(cr);
  }
  const all = () => document.querySelectorAll('body > .cr').forEach(hook);
  new MutationObserver(all).observe(document.body, { childList: true });
  document.addEventListener('features:changed', () => document.querySelectorAll('body > .cr').forEach(cr => { findBtn(cr); shareRow(cr); timeInfo(cr); }));
  // میان‌بر Ctrl+F روی رایانه، وقتی خواننده‌ای باز است
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && on('find')) { const cr = [...document.querySelectorAll('body > .cr.show')].pop(); if (cr) { e.preventDefault(); findBar(cr); } }
  });
  all();
})();
