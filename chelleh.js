// چله‌ها: خواندن گروهی زیارت عاشورا، حدیث کسا، زیارت آل یاسین و متن‌های دیگر به مدت ۴۰ روز.
// بخش عمومی: دیدن چله‌های جاری، پیوستن با نام، خواندن متن (عربی + ترجمه) و ثبت «امروز خواندم» با جدول ۴۰ روزه.
// زبانه «چله‌ها» در بخش مدیریت: ساختن چله، دیدن شرکت‌کنندگان و روزهای خوانده‌شده، و ویرایش یا افزودن متن.
// متن‌های آماده در پوشه chelleh هستند؛ جدول‌ها و تابع‌ها در backend/supabase/chelleh.sql. به admin.js نیاز دارد.
// فعلاً فقط در پیش‌نمایش مدیر (آدرس با ‎#admin‎)؛ برای نمایش به همه، PREVIEW_ONLY را false کنید.
(function () {
  const PREVIEW_ONLY = true;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  Object.assign(window.sbErrors, {
    chl_not_found: 'این چله پیدا نشد یا بسته شده است.',
    chl_not_joinable: 'پیوستن به این چله دیگر ممکن نیست.',
    chl_duplicate_name: 'این نام قبلاً در این چله ثبت شده است. اگر شخص دیگری هستید، نام خانوادگی یا نام پدر را هم بنویسید.',
    chl_member_not_found: 'این کد در چله‌ها پیدا نشد.',
    chl_bad_day: 'فقط برای امروز (یا دیروز، اگر فراموش شده بود) می‌شود ثبت کرد.'
  });
  const api = window.sbApi, rpc = window.sbRpc;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => toFa(x);
  const DAY = 86400000;
  const isoAdd = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const isoDiff = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / DAY);
  const dateFa = iso => (iso && window.J ? J.label(iso) : iso || '');
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // کدهای چله روی این دستگاه
  const KEY = 'chlCodes';
  const codes = {
    all() { const a = read(KEY, []); return Array.isArray(a) ? a : []; },
    add(c) { write(KEY, [...new Set([c, ...this.all()])]); },
    remove(c) { write(KEY, this.all().filter(x => x !== c)); }
  };

  // ---------- متن‌ها ----------
  // متن آماده از پوشه chelleh؛ اگر مدیر نسخه‌ای با همان key در پایگاه داده گذاشته باشد، آن نسخه خوانده می‌شود.
  let builtins = null, dbTexts = null;
  const textCache = {};
  async function loadBuiltins() {
    if (!builtins) builtins = await fetch('chelleh/index.json').then(r => r.json()).catch(() => []);
    return builtins;
  }
  async function loadDbTexts(force) {
    if (!dbTexts || force) {
      try { dbTexts = await api('chelleh_texts?select=key,title,about,sections,updated_at&order=title', { timeout: 8000 }); }
      catch { dbTexts = dbTexts || []; }
    }
    return dbTexts;
  }
  async function allTexts(force) {
    const [b, d] = await Promise.all([loadBuiltins(), loadDbTexts(force)]);
    const map = new Map(b.map(t => [t.key, { key: t.key, title: t.title, builtin: true, edited: false }]));
    d.forEach(t => map.set(t.key, { key: t.key, title: t.title, builtin: map.has(t.key), edited: map.has(t.key) }));
    return [...map.values()];
  }
  async function getText(key) {
    if (textCache[key]) return textCache[key];
    const d = (await loadDbTexts()).find(t => t.key === key);
    let t = d && Array.isArray(d.sections) && d.sections.length ? d : null;
    if (!t && /^[a-z0-9_-]+$/.test(key)) t = await fetch(`chelleh/${key}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (!t) throw Error('متن این چله پیدا نشد.');
    return (textCache[key] = t);
  }
  const textTitle = (key, list) => (list || []).find(t => t.key === key)?.title || key;

  // قالب ساده برای ویرایش متن در بخش مدیریت: هر بند با یک خط خالی جدا می‌شود؛
  // خط اول بند عربی است و خط‌های بعد ترجمه. خط «! …» توضیح است و خط «# ۱۰۰» یعنی تکرار.
  function toBlocks(sections) {
    return sections.map(s => [s.note ? '! ' + s.note : '', s.repeat ? '# ' + s.repeat : '', s.ar || '', s.fa || ''].filter(Boolean).join('\n')).join('\n\n');
  }
  function fromBlocks(text) {
    return text.replace(/\r/g, '').split(/\n\s*\n/).map(b => {
      const lines = b.split('\n').map(x => x.trim()).filter(Boolean), s = {}, rest = [];
      lines.forEach(l => {
        if (l.startsWith('!')) s.note = l.slice(1).trim();
        else if (/^#\s*[\d۰-۹٠-٩]+$/.test(l)) s.repeat = +norm(l.slice(1));
        else rest.push(l);
      });
      if (rest.length) { s.ar = rest[0]; if (rest.length > 1) s.fa = rest.slice(1).join(' '); }
      return s;
    }).filter(s => s.ar || s.note);
  }

  const css = `
@font-face{font-family:ChlArabic;src:url('quran/uthmanic-hafs.woff2') format('woff2');font-display:swap;unicode-range:U+0600-060B,U+060D-061E,U+0620-06FF,U+FB50-FDFF,U+FE70-FEFF}
.chl-card{background:#fff;color:#000;text-shadow:none;border:1px solid var(--gold);padding:12px 14px;margin:12px 0;position:relative}
.chl-card::before{content:"";position:absolute;inset:4px;border:1px solid rgba(215,170,91,.45);pointer-events:none}
.chl-card h3{margin:0 0 2px;font:normal 26px/1.7 SiteFont,Tahoma,serif;color:var(--deep)}
.chl-card .hint,.chl-card label,body.v2 .chl-card .hint{color:var(--muted);text-shadow:none}
.chl-card label{color:var(--ink);font-weight:600;font-size:15px;margin:10px 0 4px}
.chl-meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:15px;color:var(--muted)}
.chl-tag{display:inline-block;padding:0 10px;background:#e7f5f0;border:1px solid var(--gold);color:var(--deep);font-weight:600}
.chl-desc{white-space:pre-line;margin:6px 0 0;font-size:15.5px;color:var(--ink)}
.chl-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin:10px 0 4px;direction:rtl}
.chl-grid i{display:flex;align-items:center;justify-content:center;aspect-ratio:1;font-style:normal;font-size:12px;border:1px solid #e3d6b8;color:#9a8b78;background:#fffaf0}
.chl-grid i.d{background:var(--emerald);border-color:var(--deep);color:#fff;font-weight:700}
.chl-grid i.m{background:#f6e3e3;border-color:#e5c3c3;color:#a35a5a}
.chl-grid i.t{outline:2px solid var(--gold);outline-offset:1px;color:var(--deep);font-weight:700}
.chl-grid i.n{opacity:.45}
.chl-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--muted)}
.chl-legend b{display:inline-block;width:12px;height:12px;vertical-align:-1px;margin-left:4px;border:1px solid #e3d6b8}
.chl-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.chl-actions button{height:50px}
.chl-done{display:flex;align-items:center;justify-content:center;gap:6px;background:#e7f5f0!important;color:#00543f!important;border-color:var(--gold)!important}
.chl-big{font-size:20px;font-weight:800;color:var(--deep)}
.chl-msg{min-height:22px;margin-top:6px;font-weight:700}
.chl-ok{color:#006b50}.chl-bad{color:#9b2636}
.chl-small{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:14px}
.chl-small button{height:auto;padding:0;background:none;border:0;color:var(--deep);text-decoration:underline;font-weight:500;font-size:14px}
.chl-small button.chl-red{color:#9b2636}
.chl-sub{margin:16px 0 4px;font-size:18px}
.chl-read{display:flex;align-items:center;justify-content:center;gap:8px}
.chl-read svg{width:20px;height:20px}
body.chl-lock{overflow:hidden}
.cr{--bg:#fbf6ea;--card:#fffdf7;--text:#1f1a14;--tr:#4b4036;--muted:#7a6d60;--line:#e6d9bd;--accent:#0b6b50;--gold:#c79a45;--qs:28px;
  position:fixed;inset:0;z-index:50;background:var(--bg);color:var(--text);text-shadow:none;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:none;font-family:Vazirmatn,Tahoma,sans-serif}
.cr.night{--bg:#14110d;--card:#1c1813;--text:#efe6d6;--tr:#c9bba7;--muted:#9b8e7c;--line:#3a3127;--accent:#5fc3a0;--gold:#b98f45}
.cr.show{display:block}
.cr-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;padding:8px 10px;padding-top:max(8px,env(safe-area-inset-top));background:var(--accent);color:#fff;box-shadow:0 2px 10px #0003}
.cr.night .cr-bar{background:#0f2a22}
.cr-bar button{flex:none;height:42px;min-width:42px;padding:0 10px;background:transparent;border:0;color:#fff;font-size:22px;line-height:1}
.cr-title{flex:1;min-width:0;text-align:center;line-height:1.35}
.cr-title b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-title small{font-size:12.5px;opacity:.85}
.cr-prog{position:absolute;bottom:0;right:0;height:3px;width:0;background:var(--gold)}
.cr-menu{position:sticky;top:58px;z-index:2;max-width:760px;margin:0 auto;display:none;gap:12px;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);box-shadow:0 8px 20px #0002}
.cr-menu.show{display:grid}
.cr-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:15.5px}
.cr-row div{display:flex;gap:6px}
.cr-row button{height:40px;min-width:44px;padding:0 12px;background:transparent;color:var(--text);border:1px solid var(--line);font-size:15px;font-weight:600}
.cr-row button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.cr-body{max-width:760px;margin:0 auto;padding:6px 14px calc(40px + env(safe-area-inset-bottom))}
.cr-head{margin:22px 0 8px;padding:14px 10px 10px;text-align:center;border:1px solid var(--gold);outline:3px double var(--gold);outline-offset:3px;background:var(--card)}
.cr-head h3{margin:0;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--accent)}
.cr-head small{display:block;font-size:13px;color:var(--muted);line-height:1.8}
.cr-bism{margin:18px 0 6px;text-align:center;font:normal calc(var(--qs)*1.05)/2 ChlArabic,Vazirmatn,serif}
.cr-sec{padding:14px 2px;border-bottom:1px solid var(--line)}
.cr-sec:last-child{border-bottom:0}
.cr-note{margin:0 0 6px;color:var(--accent);font-weight:700;font-size:15px}
.cr-sec.only{border:1px dashed var(--line);background:var(--card);padding:10px 12px;margin:14px 0}
.cr-sec.only .cr-note{margin:0;color:var(--muted);font-weight:500}
.cr-ar{margin:0;font:normal var(--qs)/2.15 ChlArabic,Vazirmatn,serif;text-align:right;word-spacing:1px}
.cr-fa{margin:6px 0 0;font-size:calc(var(--qs)*.58);line-height:2;color:var(--tr);text-align:justify}
.cr.no-tr .cr-fa{display:none}
.cr-count{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
.cr-count button{height:48px;min-width:120px;background:var(--accent);border:1px solid var(--gold);color:#fff;font-size:18px;font-weight:700}
.cr-count button.full{background:var(--gold)}
.cr-count small{color:var(--muted)}
.cr-count .cr-reset{min-width:0;height:36px;background:transparent;color:var(--muted);border-color:var(--line);font-size:13px;font-weight:500}
.cr-end{margin:24px 0 8px;padding:16px;text-align:center;background:var(--card);border:1px solid var(--gold)}
.cr-end p{margin:0 0 10px}
.cr-end button{width:100%;height:54px;font-size:18px;background:var(--accent);border-color:var(--gold)}
.cr-end .chl-done{height:54px}
.chl-admin-list .chl-card h3{font:700 18px/1.6 Vazirmatn,Tahoma,sans-serif}
.chl-members{max-height:420px;overflow:auto;border:1px solid #e6dcc6;margin-top:8px}
.chl-members div{display:flex;gap:8px;align-items:center;padding:5px 8px;border-bottom:1px solid #f0e8d6}
.chl-members span{flex:1;min-width:0;overflow-wrap:anywhere}
.chl-members small{color:var(--muted)}
.chl-members button{height:32px;padding:0 10px;font-size:13px}
.chl-mini{display:inline-flex;gap:1px;vertical-align:middle;direction:rtl}
.chl-mini i{display:block;width:4px;height:12px;background:#eadfca}
.chl-mini i.d{background:var(--emerald)}
.chl-mark{font-weight:800;color:var(--emerald)}
.adm-card .hint,body.v2 #pane-chl .hint{color:var(--muted)}
.chl-edit textarea{min-height:260px;direction:rtl;font-size:15px}
@media(max-width:600px){.chl-actions{grid-template-columns:1fr}.cr-head h3{font-size:30px}}`;

  let started = false, panel, $p;
  function start() {
    if (started || !enabled()) return;
    started = true;
    { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
    panel = document.createElement('section');
    panel.className = 'panel'; panel.id = 'chellehPanel'; panel.hidden = true;
    panel.innerHTML = `<h2>چله‌ها</h2>
<p class="lead">با هم، چهل روز، یک زیارت یا دعا. به چله بپیوندید، متن را همین‌جا بخوانید و هر روز «امروز خواندم» را بزنید.</p>
<div id="chlMine"></div><div id="chlRounds"></div>
<details class="hint"><summary>کد چله دارید؟ (برای ادامه چله روی دستگاه دیگر)</summary>
<div class="row" style="margin-top:8px"><input id="chlCodeIn" inputmode="numeric" placeholder="کد ۸ رقمی"><button type="button" id="chlCodeBtn">ادامه چله</button></div>
<div class="chl-msg" id="chlCodeMsg"></div></details>`;
    // بعد از بخش «گزارش»؛ بخش مدیریت در ‎#admin‎ به بالای صفحه منتقل می‌شود و جای این بخش را عوض نمی‌کند.
    const after = document.getElementById('submitReport')?.closest('.panel');
    if (after) after.after(panel); else document.querySelector('main').appendChild(panel);
    $p = s => panel.querySelector(s);
    $p('#chlCodeBtn').onclick = addCode;
    panel.addEventListener('click', onPublicClick);
    loadPublic();
  }

  // ---------- بخش عمومی ----------
  let rounds = [], mine = [], today = null;
  async function loadPublic() {
    let error = '';
    try { rounds = (await rpc('chl_rounds')) || []; } catch (e) { error = e.message; rounds = []; }
    if (rounds[0]?.today) today = rounds[0].today;
    try { mine = codes.all().length ? (await rpc('chl_lookup', { p_codes: codes.all() })) || [] : []; } catch { mine = []; }
    if (mine[0]?.today) today = mine[0].today;
    today = today || isoIran();
    // کدِ چله‌های حذف‌شده یا بسته‌شده خودکار فراموش می‌شود.
    if (!error) { const found = new Set(mine.filter(m => m.status === 'open').map(m => m.code)); codes.all().filter(c => !found.has(c)).forEach(c => codes.remove(c)); }
    mine = mine.filter(m => m.status === 'open');
    const list = await allTexts().catch(() => []);
    panel.hidden = !enabled() || (!rounds.length && !mine.length && location.hash !== '#admin');
    const myRounds = new Set(mine.map(m => m.round_id));
    $p('#chlMine').innerHTML = mine.length ? '<h3 class="chl-sub">چله‌های من</h3>' + mine.map(m => mineCard(m, list)).join('') : '';
    const others = rounds.filter(r => !myRounds.has(r.id));
    $p('#chlRounds').innerHTML = error ? `<p class="chl-msg chl-bad">${esc(error)}</p>`
      : (others.length ? (mine.length ? '<h3 class="chl-sub">چله‌های دیگر</h3>' : '') + others.map(r => roundCard(r, list)).join('')
        : (mine.length ? '' : '<p class="hint">در حال حاضر چله‌ای در جریان نیست.</p>'));
  }
  window.chlReloadPublic = loadPublic;

  // روز چندم چله (۱ تا days)؛ پیش از شروع ۰ و پس از پایان بیشتر از days.
  const dayNo = r => isoDiff(today, r.start_date) + 1;
  function when(r) {
    const n = dayNo(r), end = isoAdd(r.start_date, r.days - 1);
    if (n < 1) return `شروع: ${esc(dateFa(r.start_date))}`;
    if (n > r.days) return `پایان یافت: ${esc(dateFa(end))}`;
    return `روز <b>${fa(n)}</b> از ${fa(r.days)}، تا ${esc(dateFa(end))}`;
  }
  const readBtn = (key, extra = '') => `<button type="button" class="reg-light chl-read" data-read="${esc(key)}" ${extra}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg>خواندن متن</button>`;

  function roundCard(r, list) {
    const join = r.joinable
      ? `<label for="chlName${r.id}">نام شما</label><div class="row"><input id="chlName${r.id}" maxlength="60" autocomplete="name" placeholder="مثلاً فاطمه رضایی"><button type="button" data-join="${r.id}">پیوستن به چله</button></div><div class="chl-msg" id="chlMsg${r.id}"></div>`
      : '<p class="hint">پیوستن به این چله بسته شده است.</p>';
    return `<div class="chl-card"><h3>${esc(r.title)}</h3><div class="chl-meta"><span class="chl-tag">${esc(textTitle(r.text_key, list))}</span><span>${when(r)}</span></div>
<div class="chl-meta"><span>${fa(r.members)} نفر در این چله</span>${dayNo(r) >= 1 && dayNo(r) <= r.days ? `<span>امروز ${fa(r.done_today)} نفر خوانده‌اند</span>` : ''}</div>
${r.description ? `<p class="chl-desc">${esc(r.description)}</p>` : ''}${join}<div class="reg-tools">${readBtn(r.text_key)}</div></div>`;
  }

  function grid(m) {
    const done = new Set(m.marked || []), n = dayNo(m);
    let s = '';
    for (let i = 1; i <= m.days; i++) {
      const iso = isoAdd(m.start_date, i - 1);
      const cls = done.has(iso) ? 'd' : i === n ? 't' : i < n ? 'm' : 'n';
      s += `<i class="${cls}" title="${esc(dateFa(iso))}">${done.has(iso) ? '✓' : fa(i)}</i>`;
    }
    return `<div class="chl-grid" aria-label="جدول روزهای چله">${s}</div><div class="chl-legend"><span><b style="background:var(--emerald)"></b>خوانده‌شده</span><span><b style="background:#f6e3e3"></b>جامانده</span><span><b style="outline:2px solid var(--gold)"></b>امروز</span></div>`;
  }

  function mineCard(m, list) {
    const n = dayNo(m), done = new Set(m.marked || []), count = done.size;
    const yesterday = isoAdd(today, -1);
    let act = '';
    if (n >= 1 && n <= m.days) {
      act = done.has(today)
        ? `<button type="button" class="chl-done" data-unmark="${m.code}" data-day="${today}" title="برداشتن">✓ امروز خوانده شد</button>`
        : `<button type="button" data-mark="${m.code}" data-day="${today}">امروز خواندم</button>`;
      act = `<div class="chl-actions">${readBtn(m.text_key, `data-code="${m.code}"`)}${act}</div>`;
      if (n > 1 && !done.has(yesterday)) act += `<div class="chl-small"><button type="button" data-mark="${m.code}" data-day="${yesterday}">دیروز خواندم ولی ثبت نکردم</button></div>`;
    } else if (n < 1) {
      act = `<p class="hint">چله از ${esc(dateFa(m.start_date))} شروع می‌شود. تا آن روز می‌توانید متن را ببینید.</p><div class="reg-tools">${readBtn(m.text_key)}</div>`;
    } else {
      act = `<p class="chl-big">چله تمام شد؛ ${fa(count)} روز از ${fa(m.days)} روز را خواندید.</p><p class="hint">قبول باشد. ان‌شاءالله در چله‌های بعدی هم همراه باشید.</p>`;
    }
    const progress = n >= 1 ? `<p style="margin:8px 0 0">${fa(count)} روز از ${fa(Math.min(n, m.days))} روز گذشته را خوانده‌اید.</p>` : '';
    return `<div class="chl-card"><h3>${esc(m.title)}</h3><div class="chl-meta"><span class="chl-tag">${esc(textTitle(m.text_key, list))}</span><span>${when(m)}</span></div>
<div class="chl-meta"><span>${esc(m.name)}</span><span>${fa(m.members)} نفر همراه</span>${n >= 1 && n <= m.days ? `<span>امروز ${fa(m.done_today)} نفر خوانده‌اند</span>` : ''}</div>
${m.description ? `<p class="chl-desc">${esc(m.description)}</p>` : ''}${progress}${n >= 1 ? grid(m) : ''}${act}
<div class="chl-msg" id="chlM${m.code}" style="min-height:0"></div>
<div class="chl-small"><span class="hint">کد چله شما: <b dir="ltr">${fa(m.code)}</b> (برای ادامه روی دستگاه دیگر)</span><button type="button" class="chl-red" data-leave="${m.code}">انصراف از چله</button></div></div>`;
  }

  async function addCode() {
    const c = norm($p('#chlCodeIn').value).replace(/\D/g, ''), msg = $p('#chlCodeMsg');
    if (c.length !== 8) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'کد چله ۸ رقم است.'; return; }
    try {
      const a = await rpc('chl_lookup', { p_codes: [c] });
      if (!a?.length) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'چله‌ای با این کد پیدا نشد.'; return; }
      codes.add(c); $p('#chlCodeIn').value = ''; msg.textContent = ''; loadPublic();
    } catch (e) { msg.className = 'chl-msg chl-bad'; msg.textContent = e.message; }
  }

  async function onPublicClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.read) { openReader(d.read, d.code ? mine.find(m => m.code === d.code) : null); return; }
    if (d.join) {
      const input = $p('#chlName' + d.join), msg = $p('#chlMsg' + d.join), name = input.value.trim();
      if (name.length < 2) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'نام خود را بنویسید.'; return; }
      b.disabled = true;
      try { codes.add(await rpc('chl_join', { p_round: +d.join, p_name: name })); await loadPublic(); }
      catch (err) { msg.className = 'chl-msg chl-bad'; msg.textContent = err.message; }
      b.disabled = false; return;
    }
    if (d.mark || d.unmark) {
      const code = d.mark || d.unmark;
      if (d.unmark && !confirm('ثبت «خواندم» برای امروز برداشته شود؟')) return;
      b.disabled = true;
      try { await mark(code, d.day, !!d.mark); } catch (err) { const m = $p('#chlM' + code); if (m) { m.className = 'chl-msg chl-bad'; m.textContent = err.message; } }
      b.disabled = false; return;
    }
    if (d.leave) {
      if (!confirm('از این چله انصراف می‌دهید؟ روزهای ثبت‌شده هم پاک می‌شود.')) return;
      try { await rpc('chl_leave', { p_code: d.leave }); codes.remove(d.leave); loadPublic(); }
      catch (err) { alert(err.message); }
    }
  }
  async function mark(code, day, done) {
    const marked = await rpc('chl_mark', { p_code: code, p_day: day, p_done: done });
    const m = mine.find(x => x.code === code);
    if (m) { m.marked = marked || []; if (day === today) m.done_today += done ? 1 : -1; }
    loadPublic();
    return m;
  }

  // ---------- خواندن متن ----------
  const RKEY = 'chlReader';
  const prefs = Object.assign({ size: 28, trans: true, night: false }, read(RKEY, {}));
  let reader = null, current = null;
  function buildReader() {
    if (reader) return reader;
    reader = document.createElement('div'); reader.className = 'cr'; reader.setAttribute('role', 'dialog'); reader.setAttribute('aria-modal', 'true');
    reader.innerHTML = `<div class="cr-bar"><button type="button" data-x="close" aria-label="بستن">✕</button><div class="cr-title"><b></b><small></small></div><button type="button" data-x="menu" aria-label="تنظیمات">⚙</button><span class="cr-prog"></span></div>
<div class="cr-menu"><div class="cr-row"><span>اندازه متن</span><div><button type="button" data-x="smaller">−</button><button type="button" data-x="bigger">+</button></div></div>
<div class="cr-row"><span>ترجمه فارسی</span><div><button type="button" data-x="tr-on">نمایش</button><button type="button" data-x="tr-off">پنهان</button></div></div>
<div class="cr-row"><span>حالت شب</span><div><button type="button" data-x="day">روز</button><button type="button" data-x="night">شب</button></div></div></div>
<div class="cr-body"></div>`;
    document.body.appendChild(reader);
    reader.addEventListener('click', onReaderClick);
    reader.addEventListener('scroll', () => { const h = reader.scrollHeight - reader.clientHeight; reader.querySelector('.cr-prog').style.width = (h > 0 ? reader.scrollTop / h * 100 : 0) + '%'; }, { passive: true });
    window.addEventListener('popstate', () => { if (reader.classList.contains('show')) close(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && reader.classList.contains('show')) close(); });
    return reader;
  }
  function applyPrefs() {
    reader.style.setProperty('--qs', prefs.size + 'px');
    reader.classList.toggle('night', prefs.night); reader.classList.toggle('no-tr', !prefs.trans);
    const on = { 'tr-on': prefs.trans, 'tr-off': !prefs.trans, day: !prefs.night, night: prefs.night };
    reader.querySelectorAll('.cr-row [data-x]').forEach(b => b.classList.toggle('on', !!on[b.dataset.x]));
    write(RKEY, prefs);
  }
  // شمارنده بندهای تکراری (مثلاً صد لعن و صد سلام)، جدا برای هر روز.
  const countKey = () => `chlCount:${current.key}:${today || isoIran()}`;
  const counts = () => read(countKey(), {});

  async function openReader(key, member) {
    buildReader();
    reader.querySelector('.cr-title b').textContent = 'در حال بارگذاری…';
    reader.querySelector('.cr-title small').textContent = '';
    reader.querySelector('.cr-body').innerHTML = '';
    reader.classList.add('show'); document.body.classList.add('chl-lock');
    try { history.pushState({ chl: 1 }, ''); } catch {}
    applyPrefs();
    let t;
    try { t = await getText(key); }
    catch (e) { reader.querySelector('.cr-title b').textContent = e.message; return; }
    current = { key, member, text: t };
    reader.querySelector('.cr-title b').textContent = t.title;
    reader.querySelector('.cr-title small').textContent = member ? `${member.title}، ${when(member).replace(/<[^>]+>/g, '')}` : '';
    renderReader();
    reader.scrollTop = 0;
  }
  function renderReader() {
    const t = current.text, c = counts(), m = current.member;
    let html = `<div class="cr-head"><h3>${esc(t.title)}</h3>${t.about ? `<small>${esc(t.about)}</small>` : ''}</div><p class="cr-bism">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>`;
    html += (t.sections || []).map((s, i) => {
      if (!s.ar) return `<div class="cr-sec only"><p class="cr-note">${esc(s.note)}</p></div>`;
      const n = c[i] || 0, rep = s.repeat ? `<div class="cr-count"><button type="button" data-count="${i}" class="${n >= s.repeat ? 'full' : ''}">${fa(n)} / ${fa(s.repeat)}</button><small>${n >= s.repeat ? 'کامل شد' : 'با هر بار خواندن بزنید'}</small>${n ? `<button type="button" class="cr-reset" data-reset="${i}">از نو</button>` : ''}</div>` : '';
      return `<div class="cr-sec">${s.note ? `<p class="cr-note">${esc(s.note)}</p>` : ''}<p class="cr-ar" lang="ar" dir="rtl">${esc(s.ar)}</p>${s.fa ? `<p class="cr-fa">${esc(s.fa)}</p>` : ''}${rep}</div>`;
    }).join('');
    if (m && dayNo(m) >= 1 && dayNo(m) <= m.days) {
      const done = (m.marked || []).includes(today);
      html += `<div class="cr-end"><p>${esc(m.name)}، روز ${fa(dayNo(m))} از ${fa(m.days)} چله</p>${done ? '<div class="chl-done">✓ امروز ثبت شده است. قبول باشد.</div>' : `<button type="button" data-done="1">خواندم؛ ثبت برای امروز</button>`}<div class="chl-msg" id="crMsg"></div></div>`;
    }
    html += '<p class="cr-bism" style="font-size:20px">صَدَقَ اللّهُ الْعَلِيُّ الْعَظِيم</p>';
    reader.querySelector('.cr-body').innerHTML = html;
  }
  async function onReaderClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return close();
    if (x === 'menu') return reader.querySelector('.cr-menu').classList.toggle('show');
    if (x === 'smaller') prefs.size = Math.max(20, prefs.size - 2);
    if (x === 'bigger') prefs.size = Math.min(44, prefs.size + 2);
    if (x === 'tr-on' || x === 'tr-off') prefs.trans = x === 'tr-on';
    if (x === 'day' || x === 'night') prefs.night = x === 'night';
    if (x) return applyPrefs();
    if (b.dataset.count || b.dataset.reset) {
      const i = +(b.dataset.count ?? b.dataset.reset), c = counts(), s = current.text.sections[i];
      c[i] = b.dataset.reset ? 0 : Math.min(s.repeat, (c[i] || 0) + 1);
      write(countKey(), c);
      if (navigator.vibrate && c[i] === s.repeat) navigator.vibrate(120);
      const top = reader.scrollTop; renderReader(); reader.scrollTop = top; return;
    }
    if (b.dataset.done) {
      b.disabled = true;
      try { current.member = await mark(current.member.code, today, true) || current.member; const top = reader.scrollTop; renderReader(); reader.scrollTop = top; }
      catch (err) { const m = reader.querySelector('#crMsg'); m.className = 'chl-msg chl-bad'; m.textContent = err.message; b.disabled = false; }
    }
  }
  function close(fromHistory) {
    reader.classList.remove('show'); document.body.classList.remove('chl-lock');
    reader.querySelector('.cr-menu').classList.remove('show');
    if (!fromHistory) { try { if (history.state?.chl) history.back(); } catch {} }
  }

  // ---------- مدیریت: زبانه «چله‌ها» ----------
  let pane = null, adminRounds = [], openRound = null, texts = [];
  function buildAdmin() {
    pane = document.getElementById('pane-chl'); if (!pane || pane.dataset.built) return;
    pane.dataset.built = 1;
    pane.innerHTML = `<div class="adm-card"><h3>چله جدید</h3>
<p class="hint">چله از تاریخ شروع به مدت چند روز (معمولاً ۴۰) ادامه دارد و هر روز از اذان صبح تهران شروع می‌شود. هر کس با نام خودش می‌پیوندد و روزهایی را که خوانده ثبت می‌کند.</p>
<div class="reg-grid"><div><label for="chlNewText">متن</label><select id="chlNewText"></select></div>
<div><label for="chlNewTitle">عنوان چله</label><input id="chlNewTitle" maxlength="80"></div></div>
<label>تاریخ شروع</label><input id="chlNewStart">
<div class="reg-grid"><div><label for="chlNewDays">تعداد روز</label><input id="chlNewDays" type="number" min="1" max="120" value="40" inputmode="numeric"></div><div></div></div>
<label for="chlNewDesc">نیت یا توضیح (اختیاری)</label><textarea id="chlNewDesc" maxlength="1000" placeholder="مثلاً: به نیت ظهور امام زمان و شفای بیماران"></textarea>
<div class="reg-tools"><button type="button" id="chlNewBtn">ساختن چله</button></div><div class="adm-msg" id="chlAdminMsg"></div></div>
<div class="adm-bar"><strong>چله‌ها</strong><button type="button" class="reg-light" id="chlReload">تازه‌سازی</button></div>
<div id="chlAdminRounds" class="chl-admin-list"><p class="hint">در حال دریافت…</p></div>
<div class="adm-card chl-edit"><h3>متن‌ها</h3>
<p class="hint">سه متن آماده (زیارت عاشورا، حدیث کسا، آل یاسین) در سایت هست. پیش از انتشار عمومی، متن و ترجمه را با یک مفاتیح چاپی مقابله کنید و اگر لازم بود همین‌جا اصلاح کنید. متن تازه (مثلاً دعای توسل) را هم می‌توانید اضافه کنید.</p>
<div class="row"><select id="chlTextPick"></select><button type="button" class="reg-light" id="chlTextLoad">ویرایش</button><button type="button" class="reg-light" id="chlTextNew">متن تازه</button></div>
<div id="chlTextForm" hidden><label for="chlTextTitle">عنوان</label><input id="chlTextTitle" maxlength="80">
<label for="chlTextAbout">منبع یا توضیح کوتاه</label><input id="chlTextAbout" maxlength="500">
<label for="chlTextBody">متن</label><p class="hint">هر بند را با یک خط خالی جدا کنید. خط اول هر بند متن عربی است و خط بعد ترجمه فارسی. خطی که با ! شروع شود توضیح است (مثلاً «! سپس صد مرتبه بگویید:») و خط «# ۱۰۰» یعنی آن بند ۱۰۰ بار تکرار می‌شود و شمارنده دارد.</p>
<textarea id="chlTextBody"></textarea>
<div class="reg-tools"><button type="button" id="chlTextSave">ذخیره متن</button><button type="button" class="reg-light" id="chlTextPreview">پیش‌نمایش</button><button type="button" class="reg-danger" id="chlTextReset" hidden>بازگرداندن متن اصلی</button></div></div>
<div class="adm-msg" id="chlTextMsg"></div></div>`;
    const $ = s => pane.querySelector(s);
    JDate($('#chlNewStart')); $('#chlNewStart').value = J.addDays(J.todayIso(), 1);
    $('#chlNewText').onchange = () => { $('#chlNewTitle').value = 'چله ' + textTitle($('#chlNewText').value, texts); };
    $('#chlNewBtn').onclick = createRound;
    $('#chlReload').onclick = loadAdmin;
    $('#chlTextLoad').onclick = () => editText($('#chlTextPick').value);
    $('#chlTextNew').onclick = () => editText(null);
    $('#chlTextSave').onclick = saveText;
    $('#chlTextPreview').onclick = () => { const t = formText(); if (!t.sections.length) return tmsg('متن خالی است.'); current = null; buildReader(); textCache.__preview = t; openReader('__preview'); };
    $('#chlTextReset').onclick = resetText;
    pane.addEventListener('click', onAdminClick);
  }
  const amsg = (t, ok) => { const m = pane.querySelector('#chlAdminMsg'); m.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); m.textContent = t; };
  const tmsg = (t, ok) => { const m = pane.querySelector('#chlTextMsg'); m.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); m.textContent = t; };

  async function loadAdmin() {
    buildAdmin(); if (!pane) return;
    const $ = s => pane.querySelector(s);
    texts = await allTexts(true);
    const opts = texts.map(t => `<option value="${esc(t.key)}">${esc(t.title)}${t.edited ? ' (ویرایش‌شده)' : ''}</option>`).join('');
    const keep = $('#chlNewText').value; $('#chlNewText').innerHTML = opts; if (keep) $('#chlNewText').value = keep;
    if (!$('#chlNewTitle').value) $('#chlNewTitle').value = 'چله ' + textTitle($('#chlNewText').value, texts);
    const keepPick = $('#chlTextPick').value; $('#chlTextPick').innerHTML = opts; if (keepPick) $('#chlTextPick').value = keepPick;
    const box = $('#chlAdminRounds');
    try {
      adminRounds = await api('chelleh_rounds?select=*,chelleh_members(count)&order=start_date.desc,id.desc', { auth: true });
      box.innerHTML = adminRounds.length ? adminRounds.map(adminCard).join('') : '<p class="hint">هنوز چله‌ای ساخته نشده است.</p>';
      if (openRound) showMembers(openRound);
    } catch (e) { box.innerHTML = `<p class="adm-bad">${esc(e.message)}</p>`; }
  }

  function adminCard(r) {
    const n = isoDiff(J.todayIso(), r.start_date) + 1, end = isoAdd(r.start_date, r.days - 1);
    const state = r.status === 'closed' ? 'بایگانی (پنهان)' : n < 1 ? 'هنوز شروع نشده' : n > r.days ? 'تمام شده' : `روز ${fa(n)} از ${fa(r.days)}`;
    const count = r.chelleh_members?.[0]?.count ?? 0;
    return `<div class="chl-card" id="chlA${r.id}"><h3>${esc(r.title)}</h3><div class="chl-meta"><span class="chl-tag">${esc(textTitle(r.text_key, texts))}</span><span>${state}</span><span>${fa(count)} نفر</span></div>
<p class="hint" style="margin:4px 0 0">از ${esc(dateFa(r.start_date))} تا ${esc(dateFa(end))}${r.joinable ? '' : '، پیوستن بسته است'}</p>${r.description ? `<p class="chl-desc">${esc(r.description)}</p>` : ''}
<div class="reg-tools"><button type="button" data-members="${r.id}">شرکت‌کنندگان</button><button type="button" class="reg-light" data-joinable="${r.id}">${r.joinable ? 'بستن پیوستن' : 'باز کردن پیوستن'}</button><button type="button" class="reg-light" data-status="${r.id}">${r.status === 'open' ? 'بایگانی' : 'نمایش دوباره'}</button><button type="button" class="reg-danger" data-delround="${r.id}">حذف</button></div>
<div id="chlMem${r.id}"></div></div>`;
  }

  async function createRound() {
    const $ = s => pane.querySelector(s);
    const text_key = $('#chlNewText').value, title = $('#chlNewTitle').value.trim() || 'چله ' + textTitle(text_key, texts);
    const start_date = $('#chlNewStart').value, days = Math.round(+norm($('#chlNewDays').value) || 40);
    if (!text_key || !start_date) return amsg('متن و تاریخ شروع را انتخاب کنید.');
    if (days < 1 || days > 120) return amsg('تعداد روز باید بین ۱ تا ۱۲۰ باشد.');
    $('#chlNewBtn').disabled = true;
    try {
      await api('chelleh_rounds', { method: 'POST', body: { title, text_key, start_date, days, description: $('#chlNewDesc').value.trim() }, auth: true, prefer: 'return=minimal' });
      $('#chlNewDesc').value = ''; amsg('چله ساخته شد.', true); await loadAdmin(); loadPublic();
    } catch (e) { amsg(e.message); }
    $('#chlNewBtn').disabled = false;
  }

  async function showMembers(id) {
    openRound = id;
    const box = pane.querySelector('#chlMem' + id); if (!box) return;
    const r = adminRounds.find(x => x.id === id), t = J.todayIso();
    box.innerHTML = '<p class="hint">در حال دریافت…</p>';
    try {
      const list = await api(`chelleh_members?round_id=eq.${id}&select=id,name,code,created_at,chelleh_marks(day)&order=created_at`, { auth: true });
      const n = Math.min(Math.max(isoDiff(t, r.start_date) + 1, 0), r.days);
      const rows = list.map((m, i) => {
        const days = new Set(m.chelleh_marks.map(x => x.day));
        const mini = Array.from({ length: r.days }, (_, k) => `<i class="${days.has(isoAdd(r.start_date, k)) ? 'd' : ''}"></i>`).join('');
        return `<div><small>${fa(i + 1)}</small><span>${esc(m.name)} ${days.has(t) ? '<span class="chl-mark" title="امروز خوانده">✓</span>' : ''}<br><small>${fa(days.size)} روز از ${fa(n)}، کد ${fa(m.code)}</small> <span class="chl-mini">${mini}</span></span><button type="button" class="reg-danger" data-delmem="${m.id}" data-name="${esc(m.name)}">حذف</button></div>`;
      }).join('');
      const doneToday = list.filter(m => m.chelleh_marks.some(x => x.day === t)).length;
      box.innerHTML = `<p style="margin:10px 0 0"><b>امروز ${fa(doneToday)} نفر از ${fa(list.length)} نفر خوانده‌اند.</b></p>
<div class="chl-members">${rows || '<p class="hint" style="padding:6px 8px">هنوز کسی نپیوسته است.</p>'}</div>
<div class="row" style="margin-top:8px"><input id="chlAdd${id}" maxlength="60" placeholder="افزودن نام (مثلاً کسی که در پیام‌رسان اعلام کرده)"><button type="button" data-addmem="${id}">افزودن</button></div>
<div class="reg-tools"><button type="button" class="reg-light" data-copy="${id}">کپی گزارش امروز برای گروه</button></div><div class="adm-msg" id="chlMemMsg${id}"></div>`;
      box._list = list;
    } catch (e) { box.innerHTML = `<p class="adm-bad">${esc(e.message)}</p>`; }
  }

  function reportText(r, list) {
    const t = J.todayIso(), n = isoDiff(t, r.start_date) + 1;
    const done = list.filter(m => m.chelleh_marks.some(x => x.day === t)), left = list.filter(m => !done.includes(m));
    return `${r.title}\n${J.label(t)}، روز ${fa(Math.max(1, Math.min(n, r.days)))} از ${fa(r.days)}\n\n✅ خوانده‌اند (${fa(done.length)} نفر):\n${done.map(m => '• ' + m.name).join('\n') || '—'}\n\n⏳ هنوز ثبت نکرده‌اند (${fa(left.length)} نفر):\n${left.map(m => '• ' + m.name).join('\n') || '—'}\n\nثبت روزانه: ${location.origin + location.pathname}`;
  }

  async function onAdminClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset, r = adminRounds.find(x => x.id === +(d.members || d.joinable || d.status || d.delround || d.addmem || d.copy));
    try {
      if (d.members) { if (openRound === r.id && pane.querySelector('#chlMem' + r.id).innerHTML) { openRound = null; pane.querySelector('#chlMem' + r.id).innerHTML = ''; } else showMembers(r.id); return; }
      if (d.joinable) { await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'PATCH', body: { joinable: !r.joinable }, auth: true, prefer: 'return=minimal' }); await loadAdmin(); loadPublic(); return; }
      if (d.status) { await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'PATCH', body: { status: r.status === 'open' ? 'closed' : 'open' }, auth: true, prefer: 'return=minimal' }); await loadAdmin(); loadPublic(); return; }
      if (d.delround) {
        if (!confirm(`چله «${r.title}» با همه شرکت‌کنندگان و روزهای ثبت‌شده‌اش حذف شود؟ این کار برگشت‌پذیر نیست. (برای پنهان کردن، «بایگانی» را بزنید.)`)) return;
        await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' }); if (openRound === r.id) openRound = null; await loadAdmin(); loadPublic(); return;
      }
      if (d.addmem) {
        const input = pane.querySelector('#chlAdd' + r.id), name = input.value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) return;
        await api('chelleh_members', { method: 'POST', body: { round_id: r.id, name }, auth: true, prefer: 'return=minimal' });
        input.value = ''; await showMembers(r.id); return;
      }
      if (d.delmem) {
        if (!confirm(`«${d.name}» از چله حذف شود؟`)) return;
        await api(`chelleh_members?id=eq.${d.delmem}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' }); showMembers(openRound); return;
      }
      if (d.copy) {
        const text = reportText(r, pane.querySelector('#chlMem' + r.id)._list || []);
        const m = pane.querySelector('#chlMemMsg' + r.id);
        try { await navigator.clipboard.writeText(text); m.className = 'adm-msg adm-ok'; m.textContent = 'کپی شد؛ در گروه بفرستید.'; }
        catch { prompt('متن گزارش را کپی کنید:', text); }
      }
    } catch (err) {
      const m = (d.addmem || d.copy) ? pane.querySelector('#chlMemMsg' + (d.addmem || d.copy)) : null;
      const msg = err.message === window.sbErrors.duplicate || /تکراری/.test(err.message) ? 'این نام قبلاً در این چله هست.' : err.message;
      if (m) { m.className = 'adm-msg adm-bad'; m.textContent = msg; } else amsg(msg);
    }
  }

  // ویرایش متن
  let editing = null;
  async function editText(key) {
    const $ = s => pane.querySelector(s);
    $('#chlTextForm').hidden = false; tmsg('');
    if (!key) {
      editing = { key: 'custom-' + Date.now().toString(36), builtin: false };
      $('#chlTextTitle').value = ''; $('#chlTextAbout').value = ''; $('#chlTextBody').value = '';
      $('#chlTextReset').hidden = true; $('#chlTextTitle').focus(); return;
    }
    const info = texts.find(t => t.key === key) || { key };
    delete textCache[key];
    try {
      const t = await getText(key);
      editing = { key, builtin: !!info.builtin };
      $('#chlTextTitle').value = t.title || ''; $('#chlTextAbout').value = t.about || ''; $('#chlTextBody').value = toBlocks(t.sections || []);
      $('#chlTextReset').hidden = !info.edited;
      tmsg(info.edited ? 'این متن در پایگاه داده ویرایش شده است.' : (info.builtin ? 'متن آماده سایت؛ با ذخیره، نسخه ویرایش‌شده جایگزین آن می‌شود.' : ''), true);
    } catch (e) { tmsg(e.message); }
  }
  function formText() {
    const $ = s => pane.querySelector(s);
    return { title: $('#chlTextTitle').value.trim(), about: $('#chlTextAbout').value.trim(), sections: fromBlocks($('#chlTextBody').value) };
  }
  async function saveText() {
    if (!editing) return;
    const t = formText();
    if (!t.title) return tmsg('عنوان متن را بنویسید.');
    if (!t.sections.length) return tmsg('متن خالی است.');
    try {
      await api('chelleh_texts', { method: 'POST', body: { key: editing.key, ...t, updated_at: new Date().toISOString() }, auth: true, prefer: 'resolution=merge-duplicates,return=minimal' });
      delete textCache[editing.key]; await loadAdmin(); pane.querySelector('#chlTextPick').value = editing.key;
      pane.querySelector('#chlTextReset').hidden = !editing.builtin;
      tmsg(`ذخیره شد (${fa(t.sections.length)} بند).`, true); loadPublic();
    } catch (e) { tmsg(e.message); }
  }
  async function resetText() {
    if (!editing?.builtin || !confirm('ویرایش‌ها پاک شود و متن آماده سایت برگردد؟')) return;
    try {
      await api(`chelleh_texts?key=eq.${encodeURIComponent(editing.key)}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
      delete textCache[editing.key]; await loadAdmin(); await editText(editing.key); tmsg('متن اصلی برگشت.', true);
    } catch (e) { tmsg(e.message); }
  }

  document.addEventListener('admin:tab', e => { if (e.detail === 'chl') loadAdmin(); });
  const boot = () => { start(); if (document.getElementById('pane-chl') && !document.getElementById('pane-chl').hidden) loadAdmin(); };
  window.addEventListener('hashchange', boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
