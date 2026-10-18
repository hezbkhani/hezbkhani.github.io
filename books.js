// کتاب‌ها: نهج‌البلاغه و صحیفه سجادیه (و در دسته «بیشتر»: منتهی‌الآمال، گزیده غررالحکم و رساله حقوق)، متن عربی با چند ترجمه (فارسی و زبان‌های دیگر) و صوت.
// - منوی سه‌خط (menu.js): بخش «کتاب‌ها»؛ هر کتاب برگه فهرست (بخش‌ها، جستجو، ادامه خواندن) و خواننده تمام‌صفحه دارد.
// - داده‌ها در books/<کتاب>/index.json (فهرست، مترجم‌ها، صوت‌ها) و books/<کتاب>/<بخش>/<NNN>.json (یک فایل برای هر خطبه، نامه، حکمت یا دعا).
//   قالب هر فایل همان قالب متن‌های چله (chelleh/*.json) است: {title, about?, sections: [{ar, fa?, tr?: {<مترجم>: متن}, note?}], audio?: [{name, url}]}؛
//   fa ترجمه مترجم اول فهرست است و بقیه در tr. جزئیات منبع‌ها در books/README.txt.
// - خواننده همان ظاهر خواننده متن‌های چله (کلاس‌های .cr در chelleh.js) را دارد؛ تنظیمات زبان و مترجم مثل قرآن‌خوان است.
// پیوند مستقیم: ‎?book=nahj‎ یا ‎?book=nahj&n=khutbah-1‎ (کتاب، بخش و شماره).
(function () {
  const BOOKS = [
    { key: 'nahj', title: 'نهج‌البلاغه', icon: '📕', sub: 'خطبه‌ها، نامه‌ها و حکمت‌های امام علی (ع)' },
    { key: 'sahifa', title: 'صحیفه سجادیه', icon: '📗', sub: 'دعاهای امام سجاد (ع)' },
    // کتاب‌های دسته «بیشتر» ته منو (more.js)، نه بخش «کتاب‌ها»؛ ساخت با tools/books/build_more.py.
    { key: 'muntaha', title: 'منتهی‌الآمال', icon: '📜', sub: 'زندگانی چهارده معصوم (ع)، نوشته محدث قمی', more: true },
    { key: 'ghurar', title: 'غررالحکم (گزیده)', icon: '💬', sub: '۶۰۰ سخن کوتاه امام علی (ع) با ترجمه', more: true },
    { key: 'huquq', title: 'رساله حقوق', icon: '⚖️', sub: 'پنجاه حق از امام سجاد (ع)', more: true }
  ];
  // نام زبان‌ها برای فهرست «زبان ترجمه» (مثل قرآن‌خوان)؛ مترجم‌های هر کتاب در index.json آن آمده‌اند.
  const LANG_NAMES = { fa: 'فارسی', en: 'انگلیسی · English', ur: 'اردو', fr: 'فرانسوی · Français', de: 'آلمانی · Deutsch', es: 'اسپانیایی · Español', tr: 'ترکی · Türkçe', ru: 'روسی · Русский', id: 'اندونزیایی · Indonesia', az: 'آذربایجانی · Azərbaycan' };
  const RTL = ['fa', 'ar', 'ur'];
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => String(x).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const pad3 = n => String(n).padStart(3, '0');
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  // جستجو بی‌توجه به اعراب، «ي/ی» و «ك/ک»، نیم‌فاصله و ارقام فارسی.
  const norm = s => String(s || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/‌/g, ' ').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).toLowerCase();

  const css = `
.bk-shade{position:fixed;inset:0;z-index:48;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.bk-box{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:bkup .25s ease}
@keyframes bkup{from{transform:translateY(40px);opacity:.4}}
.bk-x{float:left;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.bk-box h2{margin:10px 0 0;text-align:center;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.bk-sub{margin:0 0 10px;text-align:center;color:var(--muted);font-size:15px}
.bk-card{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:10px 0}
.bk-resume{display:block;width:100%;height:auto;text-align:right;background:var(--mint);color:var(--deep);border:1px solid var(--gold);border-right:5px solid var(--deep);border-radius:var(--r-card);padding:8px 14px;margin:10px 0;font-weight:700;font-size:17px;white-space:normal;line-height:1.7}
.bk-resume small{display:block;color:var(--muted);font-size:14px;font-weight:500}
.bk-tabs{display:flex;gap:6px;margin:0 0 8px}
.bk-tabs button{flex:1;height:40px;padding:0 8px;background:#fff;color:var(--deep);border:1px solid var(--line);font-size:15px}
.bk-tabs button.on{background:var(--deep);color:#fff;border-color:var(--deep)}
.bk-psel{width:100%;height:44px;margin:0 0 8px;font-size:15px}
.bk-h{margin:18px 0 4px;font-size:calc(var(--qs)*.66);color:var(--accent)}
.bk-p{margin:0 0 12px;font-size:calc(var(--qs)*.62);line-height:2.1;text-align:justify}
.bk-find{width:100%;margin:0 0 8px}
.bk-list{display:grid;gap:6px}
.bk-list button{display:flex;gap:10px;align-items:baseline;width:100%;height:auto;min-height:44px;padding:6px 12px;text-align:right;white-space:normal;line-height:1.7;background:#fff;color:var(--ink);border:1px solid var(--line);font-weight:500;font-size:15px}
.bk-list button:hover{background:var(--hover)}
.bk-list button b{flex:none;min-width:2.4em;color:var(--deep)}
.bk-list button.cur{border:2px solid var(--emerald);background:var(--mint)}
.bk-list mark{background:#fde9a8;color:inherit}
.bk-note{margin:6px 0 0;font-size:14px;color:var(--muted)}
.bk-src{margin:12px 0 0;font-size:13px;color:var(--muted);line-height:1.8}
body.bk-lock{overflow:hidden}
.cr-row select{flex:1;min-width:0;max-width:62%;height:40px;padding:0 8px;font:inherit;font-size:15px;color:var(--text);background:var(--bg);border:1px solid var(--line)}
.cr-fa[dir=ltr]{text-align:left}
.cr-fa small{display:block;margin-top:2px;color:var(--muted);font-size:.8em}
.bk-nav{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
.bk-nav button{flex:1 1 0;max-width:200px;height:46px;background:var(--accent);color:#fff;border:0;font:600 15px Vazirmatn,sans-serif}
.bk-nav button.bk-list-btn{background:transparent;color:var(--accent);border:1px solid var(--line)}
.cr.night .bk-nav button{color:#10201a}.cr.night .bk-nav button.bk-list-btn{color:var(--accent)}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- داده‌ها ----------
  const idx = {}, files = {};
  const getIndex = key => idx[key] || (idx[key] = fetch(`books/${key}/index.json`).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { delete idx[key]; throw e; }));
  const getItem = (key, part, n) => {
    const f = `books/${key}/${part}/${pad3(n)}.json`;
    return files[f] || (files[f] = fetch(f).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { delete files[f]; throw e; }));
  };
  // ترجمه‌های دیگر (جز مترجم اول) در کتاب‌هایی که trFiles دارند جدا هستند: books/<کتاب>/tr/<مترجم>/<بخش>/<شماره>.json
  // (tools/books/split_translations.py)؛ فقط ترجمه برگزیده دانلود و به بندها افزوده می‌شود.
  const getTr = (key, id, part, n) => {
    const f = `books/${key}/tr/${id}/${part}/${pad3(n)}.json`;
    return files[f] || (files[f] = fetch(f).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { delete files[f]; throw e; }));
  };
  async function withTr(ix, part, n, item) {
    const id = trChoice(ix).tr?.id;
    if (!ix.trFiles || !id || id === ix.translations[0].id || item.sections?.some(s => s.tr?.[id])) return item;
    try {
      const d = await getTr(ix.key, id, part, n);
      if (d.n === item.sections.length) item.sections.forEach((s, i) => { if (d.t[i] != null) (s.tr ||= {})[id] = d.t[i]; });
    } catch {}
    return item;
  }
  const partOf = (ix, id) => ix.parts.find(p => p.id === id) || ix.parts[0];
  // نام کوتاه هر متن (خطبه ۳، دعای ۲۰)؛ بخش‌هایی که شماره‌شان معنا ندارد (روزهای هفته) با همان عنوان.
  const short = (p, n) => p.plain ? (p.items.find(i => i[0] === n) || [])[1] || '' : `${p.one} ${fa(n)}`;
  const itemLabel = (p, n, title) => p.plain ? title : `${p.one} ${fa(n)}${title ? `: ${title}` : ''}`;

  // جای خواندن هر کتاب و تنظیمات خواننده فقط روی همین دستگاه.
  const LAST = 'bookLast', RKEY = 'bookReader';
  const prefs = Object.assign({ size: 28, trans: true, night: false, lang: {}, tr: {}, audio: {} }, read(RKEY, {}));
  const savePrefs = () => write(RKEY, prefs);

  // زبان و مترجم انتخاب‌شده برای این کتاب؛ مترجم اول هر زبان پیش‌فرض است.
  function trChoice(ix) {
    const list = ix.translations || [], langs = [...new Set(list.map(t => t.lang))];
    const lang = langs.includes(prefs.lang[ix.key]) ? prefs.lang[ix.key] : langs[0];
    const ofLang = list.filter(t => t.lang === lang), want = prefs.tr[ix.key + ':' + lang];
    return { langs, lang, ofLang, tr: ofLang.find(t => t.id === want) || ofLang[0] };
  }
  // متن ترجمه یک بند: fa همان مترجم اول کتاب است و بقیه در tr.
  const trText = (ix, s, id) => (s.tr && s.tr[id]) || (id === ix.translations?.[0]?.id ? s.fa : '') || '';

  // ---------- برگه فهرست ----------
  let shade = null, sheetBook = null, tab = null, query = '';
  function openSheet(key) {
    sheetBook = key;
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'bk-shade';
      shade.addEventListener('click', onSheetClick);
      shade.addEventListener('input', e => { if (e.target.matches('.bk-find')) { query = e.target.value; renderList(); } });
      // کتاب‌هایی که بخش زیادی دارند (منتهی‌الآمال: چهارده معصوم) به جای زبانه، فهرست کشویی دارند.
      shade.addEventListener('change', e => { if (e.target.matches('.bk-psel')) { tab = e.target.value; shade.querySelector('.bk-find').value = query = ''; renderList(); } });
      document.body.appendChild(shade);
      try { history.pushState({ bks: 1 }, ''); } catch {}
    } else shade.hidden = false;
    document.body.classList.add('bk-lock');
    renderSheet();
  }
  function closeSheet(fromHistory) {
    if (!shade) return;
    shade.remove(); shade = null; query = '';
    if (!reader?.classList.contains('show')) document.body.classList.remove('bk-lock');
    if (!fromHistory) { try { if (history.state?.bks) history.back(); } catch {} }
  }
  async function renderSheet() {
    const b = BOOKS.find(x => x.key === sheetBook);
    shade.innerHTML = `<div class="bk-box" role="dialog" aria-modal="true" aria-label="${esc(b.title)}"><button type="button" class="bk-x" data-bk="close" aria-label="بستن">✕</button><h2>${esc(b.title)}</h2><p class="bk-sub">${esc(b.sub)}</p><div class="bk-in"><p class="bk-note">در حال بارگذاری…</p></div></div>`;
    let ix;
    try { ix = await getIndex(sheetBook); }
    catch { if (shade) shade.querySelector('.bk-in').innerHTML = '<p class="bk-note">فهرست کتاب دریافت نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.</p>'; return; }
    if (!shade || sheetBook !== ix.key) return;
    const last = read(LAST, {})[ix.key];
    if (!tab || !ix.parts.some(p => p.id === tab)) tab = last?.part && ix.parts.some(p => p.id === last.part) ? last.part : ix.parts[0].id;
    const lp = last && ix.parts.find(p => p.id === last.part), lt = lp && lp.items.find(i => i[0] === last.n);
    shade.querySelector('.bk-in').innerHTML = `${lt ? `<button type="button" class="bk-resume" data-bk-open="${lp.id}-${last.n}">ادامه خواندن<small>${esc(itemLabel(lp, last.n, lt[1]))}</small></button>` : ''}
${ix.about ? `<p class="bk-note" style="margin-bottom:8px">${esc(ix.about)}</p>` : ''}
${ix.parts.length > 4 ? `<select class="bk-psel" aria-label="بخش">${ix.parts.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select>` : ix.parts.length > 1 ? `<div class="bk-tabs" role="tablist">${ix.parts.map(p => `<button type="button" role="tab" data-bk-tab="${p.id}">${esc(p.title)}</button>`).join('')}</div>` : ''}
<input type="search" class="bk-find" placeholder="جستجوی شماره یا عنوان" aria-label="جستجو" value="${esc(query)}">
<div class="bk-list"></div>${ix.src ? `<p class="bk-src">${esc(ix.src)}</p>` : ''}`;
    renderList(ix);
  }
  async function renderList(ix) {
    ix = ix || await getIndex(sheetBook).catch(() => null);
    if (!ix || !shade) return;
    shade.querySelectorAll('[data-bk-tab]').forEach(b => b.classList.toggle('on', b.dataset.bkTab === tab));
    const ps = shade.querySelector('.bk-psel'); if (ps) ps.value = tab;
    const last = read(LAST, {})[ix.key], q = norm(query.trim()), qn = /^\d+$/.test(q) ? +q : 0;
    // با جستجو همه بخش‌ها گشته می‌شوند؛ بی‌جستجو فقط بخش انتخاب‌شده.
    const parts = q ? ix.parts : [partOf(ix, tab)], out = [];
    parts.forEach(p => p.items.forEach(([n, t]) => {
      if (q && n !== qn && !norm(t).includes(q)) return;
      out.push(`<button type="button" data-bk-open="${p.id}-${n}"${last?.part === p.id && last.n === n ? ' class="cur"' : ''}><b>${p.plain ? '' : (q && ix.parts.length > 1 ? esc(p.one) + ' ' : '') + fa(n)}</b><span>${esc(t)}</span></button>`);
    }));
    shade.querySelector('.bk-list').innerHTML = out.length ? out.slice(0, 600).join('') : '<p class="bk-note">چیزی پیدا نشد.</p>';
  }
  function onSheetClick(e) {
    if (e.target === shade) return closeSheet();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.bk === 'close') return closeSheet();
    if (b.dataset.bkTab) { tab = b.dataset.bkTab; shade.querySelector('.bk-find').value = query = ''; return renderList(); }
    if (b.dataset.bkOpen) { const [p, n] = b.dataset.bkOpen.split('-'); return openReader(sheetBook, p, +n); }
  }

  // ---------- خواننده ----------
  let reader = null, cur = null;
  function buildReader() {
    if (reader) return reader;
    reader = document.createElement('div'); reader.className = 'cr bk-r'; reader.setAttribute('role', 'dialog'); reader.setAttribute('aria-modal', 'true');
    reader.innerHTML = `<div class="cr-bar"><button type="button" data-x="close" aria-label="بستن">✕</button><div class="cr-title"><b></b><small></small></div><button type="button" data-x="menu" aria-label="تنظیمات" title="تنظیمات">⚙</button><span class="cr-prog"></span></div>
<div class="cr-menu"><div class="cr-row"><span>اندازه متن</span><div><button type="button" data-x="smaller">−</button><button type="button" data-x="bigger">+</button></div></div>
<div class="cr-row"><span>ترجمه</span><div><button type="button" data-x="tr-on">نمایش</button><button type="button" data-x="tr-off">فقط عربی</button></div></div>
<div class="cr-row"><span>حالت شب</span><div><button type="button" data-x="day">روز</button><button type="button" data-x="night">شب</button></div></div>
<div class="cr-row"><span>زبان ترجمه</span><select data-x-sel="lang" aria-label="زبان ترجمه"></select></div>
<div class="cr-row"><span>مترجم</span><select data-x-sel="tr" aria-label="مترجم"></select></div></div>
<div class="cr-body"></div>
<div class="cr-aud" hidden><div><span>صوت</span><select data-x-sel="audio" aria-label="انتخاب صوت"></select></div><audio controls preload="none"></audio>${window.audioOpt?.bar?.() || ''}</div>`;
    document.body.appendChild(reader);
    reader.addEventListener('click', onReaderClick);
    reader.addEventListener('change', onReaderChange);
    let saveT = 0;
    reader.addEventListener('scroll', () => {
      const h = reader.scrollHeight - reader.clientHeight; reader.querySelector('.cr-prog').style.width = (h > 0 ? reader.scrollTop / h * 100 : 0) + '%';
      // جای خواندن (نسبت به بلندی متن) کمی پس از ایستادن اسکرول ذخیره می‌شود.
      clearTimeout(saveT); saveT = setTimeout(() => {
        if (!cur?.item || !reader.classList.contains('show')) return;
        const all = read(LAST, {}), l = all[cur.key];
        if (l && l.part === cur.part.id && l.n === cur.n) { l.y = Math.round(reader.scrollTop / reader.scrollHeight * 1e4) / 1e4; write(LAST, all); }
      }, 400);
    }, { passive: true });
    return reader;
  }
  function applyPrefs() {
    reader.style.setProperty('--qs', prefs.size + 'px');
    reader.classList.toggle('night', prefs.night); reader.classList.toggle('no-tr', !prefs.trans);
    const on = { 'tr-on': prefs.trans, 'tr-off': !prefs.trans, day: !prefs.night, night: prefs.night };
    reader.querySelectorAll('.cr-row [data-x]').forEach(b => b.classList.toggle('on', !!on[b.dataset.x]));
    if (cur?.ix) {
      // کتاب بی‌ترجمه (مثل منتهی‌الآمال) گزینه «ترجمه» ندارد.
      reader.querySelector('[data-x="tr-on"]').closest('.cr-row').hidden = !cur.ix.translations?.length;
      const c = trChoice(cur.ix);
      const ls = reader.querySelector('[data-x-sel="lang"]'), ts = reader.querySelector('[data-x-sel="tr"]');
      ls.innerHTML = c.langs.map(l => `<option value="${l}">${esc(LANG_NAMES[l] || l)}</option>`).join(''); ls.value = c.lang;
      ls.closest('.cr-row').hidden = c.langs.length < 2;
      ts.innerHTML = c.ofLang.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(''); ts.value = c.tr?.id || '';
      ts.closest('.cr-row').hidden = c.ofLang.length < 2;
    }
    savePrefs();
  }
  async function openReader(key, part, n) {
    buildReader();
    const first = !reader.classList.contains('show');
    reader.querySelector('.cr-title b').textContent = 'در حال بارگذاری…';
    reader.querySelector('.cr-title small').textContent = '';
    reader.querySelector('.cr-menu').classList.remove('show');
    reader.classList.add('show'); document.body.classList.add('bk-lock');
    if (first) { try { history.pushState({ bkr: 1 }, ''); } catch {} }
    let ix, item;
    try {
      ix = await getIndex(key);
      // ترجمه برگزیده هم‌زمان با خود متن گرفته می‌شود، نه پس از آن.
      const tid = trChoice(ix).tr?.id;
      if (ix.trFiles && tid && tid !== ix.translations[0].id) getTr(key, tid, part, n).catch(() => {});
      item = await getItem(key, part, n).then(it => withTr(ix, part, n, it));
    }
    catch {
      reader.querySelector('.cr-title b').textContent = 'متن باز نشد';
      reader.querySelector('.cr-body').innerHTML = '<p class="cr-sec only" style="margin-top:30px">متن دریافت نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.</p>';
      return;
    }
    const p = partOf(ix, part);
    cur = { key, ix, part: p, n, item };
    // اگر همین متن آخرین متنِ خوانده‌شده بود، از همان جایی که مانده بود ادامه می‌یابد.
    const all = read(LAST, {}), was = all[key], y = was && was.part === p.id && was.n === n ? was.y || 0 : 0;
    all[key] = { part: p.id, n }; write(LAST, all);
    // کتاب‌هایی با بخش‌های زیاد (مثل باب‌های منتهی‌الآمال) نام بخش را در عنوان دارند، نه فقط «بخش ۱۰».
    reader.querySelector('.cr-title b').textContent = `${ix.parts.length > 4 ? p.title : ix.title}، ${short(p, n)}`;
    reader.querySelector('.cr-title small').textContent = p.plain ? '' : item.title || '';
    applyPrefs();
    renderReader();
    reader.scrollTop = y ? y * reader.scrollHeight : 0;
    // دو متن بعدی از پیش گرفته می‌شوند تا «بعدی» زود باز شود.
    const nx = step(1); if (nx) getItem(key, nx[0].id, nx[1]).then(it => withTr(ix, nx[0].id, nx[1], it)).catch(() => {});
  }
  // متن قبلی یا بعدی (در همان بخش، و از آخر یک بخش به اول بخش بعد).
  function step(d) {
    const { ix, part, n } = cur, pi = ix.parts.indexOf(part), i = part.items.findIndex(x => x[0] === n);
    if (part.items[i + d]) return [part, part.items[i + d][0]];
    const np = ix.parts[pi + d]; if (!np) return null;
    return [np, np.items[d > 0 ? 0 : np.items.length - 1][0]];
  }
  function renderReader() {
    const { ix, part, n, item } = cur, c = trChoice(ix), dir = RTL.includes(c.lang) ? 'rtl' : 'ltr';
    let html = `<div class="cr-head"><h3>${esc(short(part, n))}</h3>${item.title && !part.plain ? `<small style="font-size:16px;color:var(--text)">${esc(item.title)}</small>` : ''}${item.about ? `<small>${esc(item.about)}</small>` : ''}</div>`;
    if (item.bism !== false) html += '<p class="cr-bism">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>';
    html += (item.sections || []).map(s => {
      // متن نثر فارسی (منتهی‌الآمال): h عنوان و p بند.
      if (s.h) return `<h4 class="bk-h">${esc(s.h)}</h4>`;
      if (s.p) return `<p class="bk-p">${esc(s.p)}</p>`;
      if (!s.ar) return `<div class="cr-sec only"><p class="cr-note">${esc(s.note)}</p></div>`;
      const t = c.tr ? trText(ix, s, c.tr.id) : '';
      return `<div class="cr-sec">${s.note ? `<p class="cr-note">${esc(s.note)}</p>` : ''}<p class="cr-ar" lang="ar" dir="rtl">${esc(s.ar)}</p>${t ? `<p class="cr-fa" lang="${c.lang}" dir="${dir}">${esc(t)}</p>` : ''}</div>`;
    }).join('');
    const pv = step(-1), nx = step(1);
    html += `<div class="cr-end">${c.tr ? `<p style="margin:0;font-size:13px;color:var(--muted)">ترجمه: ${esc(c.tr.name)}${c.tr.src ? '، ' + esc(c.tr.src) : ''}</p>` : ''}<div class="bk-nav">${nx ? `<button type="button" data-bk-go="${nx[0].id}-${nx[1]}">${esc(short(nx[0], nx[1]))} ›</button>` : ''}<button type="button" class="bk-list-btn" data-bk-go="list">فهرست</button>${pv ? `<button type="button" data-bk-go="${pv[0].id}-${pv[1]}">‹ ${esc(short(pv[0], pv[1]))}</button>` : ''}</div></div>`;
    reader.querySelector('.cr-body').innerHTML = html;
    renderAudio();
  }
  // صوت‌های این متن: فهرست ثابت خود متن (audio) و صوت‌های کتاب (index.json → audio: [{id, name, parts?, url}])؛
  // url الگوست با {part}، {n}، {nn} یا {nnn}، یا به جای آن urls: {<بخش>: {<شماره>: نشانی}} برای فایل‌هایی که نامشان شماره ندارد.
  function audioList() {
    const { ix, part, n, item } = cur, list = [];
    (item.audio || []).forEach(a => a && a.url && list.push(a));
    (ix.audio || []).forEach(a => {
      if (a.parts && !a.parts.includes(part.id)) return;
      const url = a.urls ? a.urls[part.id]?.[n] : a.url?.replace('{part}', part.id).replace('{nnn}', pad3(n)).replace('{nn}', String(n).padStart(2, '0')).replace('{n}', n);
      if (url) list.push({ id: a.id, name: a.name, url });
    });
    return list;
  }
  function renderAudio() {
    const aud = reader.querySelector('.cr-aud'), list = audioList(), au = aud.querySelector('audio');
    aud.hidden = !list.length;
    if (!list.length) { au.pause(); au.removeAttribute('src'); return; }
    const sel = aud.querySelector('select'), want = prefs.audio[cur.key];
    const i = Math.max(0, list.findIndex(a => (a.id || a.name) === want));
    sel.innerHTML = list.map((a, k) => `<option value="${k}">${esc(a.name)}</option>`).join(''); sel.value = i;
    if (au.getAttribute('src') !== list[i].url) au.src = list[i].url;
  }
  function onReaderChange(e) {
    const k = e.target.dataset.xSel; if (!k || !cur) return;
    const v = e.target.value;
    if (k === 'lang') prefs.lang[cur.key] = v;
    if (k === 'tr') prefs.tr[cur.key + ':' + trChoice(cur.ix).lang] = v;
    if (k === 'audio') {
      const a = audioList()[+v]; if (!a) return;
      prefs.audio[cur.key] = a.id || a.name; savePrefs();
      const au = reader.querySelector('.cr-aud audio'), was = !au.paused; au.src = a.url; if (was) au.play().catch(() => {});
      return;
    }
    applyPrefs();
    const top = reader.scrollTop, c = cur;
    withTr(c.ix, c.part.id, c.n, c.item).then(() => { if (cur !== c) return; renderReader(); reader.scrollTop = top; });
  }
  function onReaderClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeReader();
    if (x === 'menu') return reader.querySelector('.cr-menu').classList.toggle('show');
    if (x === 'smaller') prefs.size = Math.max(20, prefs.size - 2);
    if (x === 'bigger') prefs.size = Math.min(44, prefs.size + 2);
    if (x === 'tr-on' || x === 'tr-off') prefs.trans = x === 'tr-on';
    if (x === 'day' || x === 'night') prefs.night = x === 'night';
    if (x) return applyPrefs();
    const go = b.dataset.bkGo;
    if (go === 'list') { const k = cur.key; closeReader(); if (!shade) setTimeout(() => openSheet(k), 50); return; }
    if (go) { const [p, n] = go.split('-'); reader.querySelector('.cr-aud audio').pause(); openReader(cur.key, p, +n); }
  }
  function closeReader(fromHistory) {
    if (!reader?.classList.contains('show')) return;
    reader.classList.remove('show');
    try { reader.querySelector('.cr-aud audio').pause(); } catch {}
    reader.querySelector('.cr-menu').classList.remove('show');
    if (!shade) document.body.classList.remove('bk-lock');
    else renderList();
    if (!fromHistory) { try { if (history.state?.bkr) history.back(); } catch {} }
  }
  window.addEventListener('popstate', () => {
    if (reader?.classList.contains('show') && !history.state?.bkr) closeReader(true);
    else if (shade && !history.state?.bks && !history.state?.bkr) closeSheet(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (reader?.classList.contains('show')) closeReader(); else if (shade) closeSheet();
  });

  // ---------- منو ----------
  window.siteMenu?.section({
    id: 'books', order: 7,
    render(box) {
      const last = read(LAST, {});
      box.innerHTML = `<h3>کتاب‌ها</h3>${BOOKS.filter(b => !b.more).map(b => `<button type="button" class="sm-item" data-bk-book="${b.key}"><span class="sm-ic">${b.icon}</span><span>${b.title}<small>${last[b.key] ? 'ادامه از جایی که خواندید' : b.sub}</small></span><span class="sm-go">‹</span></button>`).join('')}`;
      box.querySelectorAll('[data-bk-book]').forEach(x => x.onclick = () => { window.siteMenu.close(); setTimeout(() => openSheet(x.dataset.bkBook), 280); });
    }
  });
  window.books = { open: openSheet, read: openReader, more: BOOKS.filter(b => b.more) };

  // پیوند ‎?book=nahj‎ یا ‎?book=sahifa&n=dua-20‎
  const qs = new URLSearchParams(location.search), qb = qs.get('book');
  if (qb && BOOKS.some(b => b.key === qb)) {
    const m = /^([a-z]+)-(\d+)$/.exec(qs.get('n') || '');
    try { const u = new URL(location.href); u.searchParams.delete('book'); u.searchParams.delete('n'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    openSheet(qb);
    if (m) openReader(qb, m[1], +m[2]);
  }
})();
