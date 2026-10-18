// مفاتیح‌الجنان: فهرست باب‌ها و فصل‌های کتاب (books/mafatih/index.json) و باز کردن هر دعا، زیارت، مناجات یا عمل
// در همان خواننده متن چله‌ها (window.chlRead در chelleh.js: متن عربی، ترجمه، صوت، اندازه متن و حالت شب).
// متن هر مورد در books/mafatih/<شماره>.json به همان قالب متن‌های chelleh است؛ موردهایی که سایت از قبل داشت (کمیل، سمات، توسل،
// عاشورا، کسا، عهد، مشلول) با ref همان فایل chelleh را باز می‌کنند و سوره‌ها در قرآن‌خوان باز می‌شوند.
// فایل‌ها را tools/mafatih/build.py می‌سازد. در منو زیر «ادعیه» است؛ پیوند ?mafatih=1 (یا ?mafatih=<شماره>) هم همین را باز می‌کند.
(function () {
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const norm = s => String(s).replace(/[ً-ٰٟ]/g, '').replace(/[يىئ]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
    .replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/[\s‌()«»:،.]+/g, '').toLowerCase();
  const LAST = 'mafatihLast';
  const readLast = () => { try { const v = JSON.parse(localStorage.getItem(LAST)); return v && v.title ? v : null; } catch { return null; } };

  let book = null;
  const loadBook = async () => book || (book = await fetch('books/mafatih/index.json').then(r => { if (!r.ok) throw Error(); return r.json(); }));
  // همه موردها با جای هر کدام (باب و فصل)، برای جستجو و پیوند مستقیم
  const allItems = () => book.chapters.flatMap((c, ci) => c.parts.flatMap(p => p.items.map(it => ({ it, ci, where: [c.title, p.title].filter(Boolean).join(' · ') }))));

  const css = `
.mf-shade{position:fixed;inset:0;z-index:48;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.mf-box{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:mfup .25s ease}
@keyframes mfup{from{transform:translateY(40px);opacity:.4}}
.mf-x{float:left;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.mf-box h2{margin:10px 0 0;text-align:center;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.mf-sub{margin:0 0 10px;text-align:center;color:var(--muted);font-size:15px}
.mf-card{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:10px 0}
.mf-card h3{margin:0 0 6px;font-size:16px;color:var(--deep)}
.mf-resume{background:var(--mint);border-right:5px solid var(--deep)}
.mf-resume button{width:100%;margin-top:6px}
.mf-ch{margin:8px 0;background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);overflow:hidden}
.mf-ch>summary{display:flex;align-items:center;gap:8px;min-height:50px;padding:8px 14px;cursor:pointer;list-style:none;font-weight:700;color:var(--deep);font-size:16px}
.mf-ch>summary::-webkit-details-marker{display:none}
.mf-ch>summary b{flex:1}
.mf-ch>summary small{flex:none;padding:0 8px;border-radius:999px;background:var(--mint);font-size:13px;font-weight:500}
.mf-ch>summary i{flex:none;font-style:normal;color:var(--muted);transition:transform .2s}
.mf-ch[open]>summary i{transform:rotate(180deg)}
.mf-ch[open]>summary{border-bottom:1px solid var(--line)}
.mf-part{padding:4px 0 8px}
.mf-part h4{margin:8px 14px 2px;font-size:14px;color:var(--muted);font-weight:700}
.mf-it{display:flex;align-items:center;gap:8px;width:100%;height:auto;min-height:44px;padding:6px 14px;background:transparent;border:0;border-radius:0;color:var(--ink);text-align:right;white-space:normal;line-height:1.7;font-weight:500;font-size:15.5px}
.mf-it:hover,.mf-it:focus-visible{background:var(--hover)}
.mf-it span{flex:1;min-width:0}
.mf-it small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.mf-it em{flex:none;font-style:normal;font-size:14px}
.mf-res:empty{display:none}
.mf-res{margin-top:6px;border-top:1px solid var(--line)}
.mf-note{margin:6px 0 0;font-size:14px;color:var(--muted)}
body.mf-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  const itemBtn = (it, where) => `<button type="button" class="mf-it" data-mf-key="${esc(it.key || '')}" data-mf-ref="${esc(it.ref || '')}" data-mf-surah="${it.surah || ''}" data-mf-title="${esc(it.title)}"><span>${esc(it.title)}${where ? `<small>${esc(where)}</small>` : ''}</span>${it.audio || it.ref ? '<em title="صوت دارد" aria-label="صوت دارد">🎧</em>' : it.surah ? '<em aria-hidden="true">📖</em>' : ''}</button>`;

  let shade = null, thenAfter = null;
  async function openSheet() {
    if (shade && shade.isConnected) return;
    // پنجره فوراً با «در حال بارگذاری…» باز می‌شود؛ اگر فهرست نیامد، پیام و «تلاش دوباره» همین‌جا دیده می‌شود.
    shade = document.createElement('div'); shade.className = 'mf-shade';
    shade.innerHTML = '<div class="mf-box" role="dialog" aria-modal="true" aria-label="مفاتیح‌الجنان"><button type="button" class="mf-x" data-mf="close" aria-label="بستن">✕</button><h2>مفاتیح‌الجنان</h2><p class="mf-note">در حال بارگذاری…</p></div>';
    shade.addEventListener('click', onClick);
    shade.addEventListener('input', e => { if (e.target.id === 'mfQ') search(e.target.value); });
    shade.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'mfQ') { e.preventDefault(); shade.querySelector('.mf-res .mf-it')?.click(); } });
    document.body.appendChild(shade); document.body.classList.add('mf-lock');
    try { if (!history.state?.mf) history.pushState({ mf: 1 }, ''); } catch {}
    await fill();
  }
  async function fill() {
    const me = shade;
    try { await loadBook(); } catch {
      if (me.isConnected) me.querySelector('.mf-note').innerHTML = 'بارگذاری فهرست مفاتیح‌الجنان انجام نشد. اینترنت را بررسی کنید. <button type="button" data-mf="retry">تلاش دوباره</button>';
      return;
    }
    if (me === shade && me.isConnected) render();
  }
  function closeSheet(fromHistory, then) {
    if (!shade || !shade.isConnected) { if (then) then(); return; }
    shade.remove(); document.body.classList.remove('mf-lock');
    if (!fromHistory) { try { if (history.state?.mf) { thenAfter = then || null; history.back(); return; } } catch {} }
    if (then) then();
  }
  window.addEventListener('popstate', () => {
    if (shade && shade.isConnected && !history.state?.mf) closeSheet(true);
    const f = thenAfter; thenAfter = null;
    if (f) setTimeout(f, 30);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade && shade.isConnected) closeSheet(); });

  function render() {
    const box = shade.querySelector('.mf-box'), last = readLast();
    box.innerHTML = `<button type="button" class="mf-x" data-mf="close" aria-label="بستن">✕</button>
<h2>مفاتیح‌الجنان</h2><p class="mf-sub">دعاها، زیارات، مناجات‌ها و اعمال سال، با متن عربی، ترجمه فارسی و صوت</p>
${last ? `<div class="mf-card mf-resume"><h3>آخرین متنی که باز کردید</h3>${itemBtn(last.it, last.where)}</div>` : ''}
<div class="mf-card"><input id="mfQ" type="search" autocomplete="off" placeholder="جستجوی نام دعا یا زیارت، مثلاً ندبه، عرفه، جامعه" aria-label="جستجو در مفاتیح‌الجنان"><div class="mf-res" id="mfRes"></div></div>
${book.chapters.map(c => `<details class="mf-ch"><summary><b>${esc(c.title)}</b><small>${toFa(c.parts.reduce((n, p) => n + p.items.length, 0))}</small><i>▾</i></summary>
${c.parts.map(p => `<div class="mf-part">${p.title ? `<h4>${esc(p.title)}</h4>` : ''}${p.items.map(it => itemBtn(it)).join('')}</div>`).join('')}</details>`).join('')}
<p class="mf-note">${esc(book.about)} 🎧 یعنی صوت هم دارد.</p><p class="mf-note">منبع: ${esc(book.src)}</p>`;
  }
  function search(v) {
    const res = shade.querySelector('#mfRes'), q = norm(v);
    if (q.length < 2) { res.innerHTML = ''; return; }
    const found = allItems().filter(x => norm(x.it.title).includes(q));
    res.innerHTML = found.length ? found.slice(0, 40).map(x => itemBtn(x.it, x.where)).join('') + (found.length > 40 ? `<p class="mf-note">${toFa(found.length)} مورد؛ ۴۰ مورد اول.</p>` : '')
      : `<p class="mf-note">موردی با «${esc(v)}» پیدا نشد.</p>`;
  }

  async function openItem(it, where) {
    try { localStorage.setItem(LAST, JSON.stringify({ title: it.title, it, where })); } catch {}
    if (it.surah) {
      const qr = window.quranReader, ix = qr && await qr.index().catch(() => null);
      if (!ix) return alert('بارگذاری متن قرآن انجام نشد. اینترنت را بررسی کنید.');
      const n = it.surah;
      return qr.openRange({ title: it.title, sub: 'مفاتیح‌الجنان', from: ix.surah[n - 1], to: n < 114 ? ix.surah[n] : ix.total, endText: `پایان ${it.title}. قبول باشد.` });
    }
    if (!window.chlRead) return;
    // با بستن متن، فهرست مفاتیح دوباره باز می‌شود تا متن بعدی را بشود انتخاب کرد.
    window.chlRead(it.ref || 'books/mafatih/' + it.key, () => openSheet());
  }
  function onClick(e) {
    if (e.target === shade) return closeSheet();
    const b = e.target.closest('[data-mf], .mf-it'); if (!b) return;
    if (b.dataset.mf === 'close') return closeSheet();
    if (b.dataset.mf === 'retry') { b.closest('.mf-note').textContent = 'در حال بارگذاری…'; return fill(); }
    if (b.classList.contains('mf-it')) {
      const it = { title: b.dataset.mfTitle };
      if (b.dataset.mfKey) it.key = b.dataset.mfKey;
      if (b.dataset.mfRef) it.ref = b.dataset.mfRef;
      if (b.dataset.mfSurah) it.surah = +b.dataset.mfSurah;
      const found = allItems().find(x => x.it.title === it.title && (x.it.key || x.it.ref || x.it.surah) === (it.key || it.ref || it.surah));
      if (found) Object.assign(it, found.it);
      closeSheet(false, () => openItem(it, found?.where || ''));
    }
  }

  // ---------- منو: زیر «ادعیه» (ibadat.js)؛ اگر آن بخش نبود، جداگانه ----------
  // مدیر می‌تواند در «امکانات سایت» خاموشش کند (features.js، پیش‌فرض روشن).
  function menuItem() {
    if (window.features && !window.features.shown('mafatih')) return '';
    const last = readLast();
    return `<button type="button" class="sm-item" data-mf-open><span class="sm-ic">📚</span><span>مفاتیح‌الجنان<small>${last ? `آخرین: ${esc(last.title)}` : 'همه دعاها، زیارات، مناجات‌ها و اعمال'}</small></span><span class="sm-go">‹</span></button>`;
  }
  window.siteMenu?.section({
    id: 'mafatih', order: 6.5,
    render(box) { const m = menuItem(); if (m && !document.querySelector('.sm [data-mf-open]')) box.innerHTML = `<h3>ادعیه</h3>${m}`; }
  });
  document.addEventListener('click', e => { if (e.target.closest('.sm [data-mf-open]')) { window.siteMenu.close(); setTimeout(openSheet, 280); } });
  // openKey('336'): باز کردن یک مورد با شماره‌اش (برای کارت «امروز» در daily.js)
  const openKey = q => loadBook().then(() => { const x = allItems().find(x => x.it.key === q); x ? openItem(x.it, x.where) : openSheet(); }).catch(() => {});
  // items(): همه موردها برای جستجوی سایت (search.js)؛ openItem: باز کردن یکی از آن‌ها
  window.mafatih = { open: openSheet, menuItem, openKey, openItem, items: () => loadBook().then(allItems) };

  // پیوند ?mafatih=1 یا ?mafatih=<شماره مورد>
  const q = new URLSearchParams(location.search).get('mafatih');
  if (q) {
    try { const u = new URL(location.href); u.searchParams.delete('mafatih'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    if (/^\d{3}$/.test(q)) openKey(q);
    else openSheet();
  }
})();
