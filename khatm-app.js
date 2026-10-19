// برگه ختم گروهی قرآن و کارت مدیر؛ khatm.js این فایل را فقط با اولین استفاده بارگذاری می‌کند.
// نمای ختم: ۳۰ خانه جزء (باز، برداشته‌شده با نام اختیاری، مال من، خوانده‌شده). با زدن هر خانه، نوار پایین برگه کارهای همان جزء را
// نشان می‌دهد: برداشتن، خواندن در قرآن آزاد (quran-free.js) از ابتدای جزء، «خواندم»، پس دادن و برگرداندن.
(function () {
  const K = window.khatm;
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const admin = () => location.hash === '#admin';
  const ERR = {
    khatm_taken: 'این جزء را همین الان کس دیگری برداشت. جزء دیگری انتخاب کنید.',
    khatm_not_mine: 'این جزء دست شما نیست.',
    khatm_closed: 'این ختم بسته شده است.',
    khatm_not_found: 'این ختم پیدا نشد؛ شاید پیوند ناقص است یا ختم حذف شده است.',
    khatm_too_many: 'در هر ختم حداکثر ۱۰ جزء نخوانده دست هر نفر است؛ اول یکی را تمام کنید.',
    khatm_limit: 'کمی صبر کنید و دوباره امتحان کنید.',
    khatm_bad_title: 'عنوان را بنویسید (دست‌کم دو حرف).',
    khatm_bad_niyyat: 'متن نیت حداکثر ۳۰۰ حرف باشد.',
    net: 'ارتباط با سرور برقرار نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.',
    nosql: 'ختم گروهی هنوز در سرور راه‌اندازی نشده است.' + (admin() ? ' فایل backend/supabase/khatm.sql را در Supabase اجرا کنید.' : '')
  };
  const errText = e => ERR[e?.code] || ERR[e?.message] || 'انجام نشد. لطفاً دوباره امتحان کنید.';
  const daysLeft = iso => Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));

  const css = `
.kh-shade{position:fixed;inset:0;z-index:48;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.kh-box{position:relative;width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 18px 0;box-shadow:0 -10px 40px #0007;animation:khup .25s ease}
@keyframes khup{from{transform:translateY(40px);opacity:.4}}
.kh-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.kh-back{float:right;height:44px;padding:0 6px;background:transparent;border:0;color:var(--deep);font-size:15px;font-weight:600}
.kh-box h2{clear:both;margin:4px 0 0;text-align:center;font:normal 32px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.kh-niy{margin:0 0 6px;text-align:center;color:#8a6a1f;font-size:16px;line-height:1.8}
.kh-sub{margin:0 0 8px;text-align:center;color:var(--muted);font-size:15px}
.kh-bar{height:10px;border-radius:999px;background:#ece3cf;overflow:hidden;display:flex;margin:8px 0 4px}
.kh-bar i{display:block;height:100%}
.kh-bar .d{background:var(--emerald)}.kh-bar .t{background:#d9b65c}
.kh-stat{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:14px;color:var(--muted);margin-bottom:8px}
.kh-stat b{color:var(--ink)}
.kh-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:8px 0}
@media(min-width:480px){.kh-grid{grid-template-columns:repeat(6,1fr)}}
.kh-t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;height:auto;min-height:62px;padding:4px 2px;border-radius:12px;border:1px solid var(--gold);background:#fff;color:var(--deep);font-weight:700;font-size:20px;line-height:1.3;white-space:normal}
.kh-t small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;font-weight:500;color:var(--muted)}
.kh-t.tk{background:#f6eedb;border-style:dashed;color:#7b6a4e}
.kh-t.me{background:var(--mint);border:2px solid var(--emerald);color:var(--deep)}
.kh-t.me small{color:var(--deep)}
.kh-t.dn{background:var(--emerald);border-color:var(--emerald);color:#fff}
.kh-t.dn small{color:#e9f5ef}
.kh-t:hover{background:var(--hover)}
.kh-t.tk:hover{background:#f6eedb}.kh-t.me:hover{background:var(--mint)}.kh-t.dn:hover{background:var(--emerald)}
.kh-light:hover,.kh-back:hover,.kh-x:hover,.kh-ax:hover{background:var(--hover)}
.kh-t.sel{outline:3px solid var(--gold);outline-offset:1px}
.kh-t:disabled{opacity:1;cursor:default}
.kh-key{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;font-size:13px;color:var(--muted);margin:2px 0 8px}
.kh-key i{display:inline-block;width:12px;height:12px;border-radius:4px;vertical-align:-1px;margin-left:4px;border:1px solid var(--gold);background:#fff}
.kh-key .tk{background:#f6eedb;border-style:dashed}.kh-key .me{background:var(--mint);border:2px solid var(--emerald)}.kh-key .dn{background:var(--emerald);border-color:var(--emerald)}
.kh-card{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:10px 0}
.kh-card h3{margin:0 0 4px;font-size:17px;color:var(--deep)}
.kh-card p{margin:4px 0}
.kh-done{background:var(--mint);border-right:5px solid var(--emerald);text-align:center}
.kh-done h3{font:normal 26px/1.6 SiteFont,Tahoma,serif}
.kh-act{position:sticky;bottom:0;z-index:2;margin:8px -18px 0;padding:12px 18px calc(14px + env(safe-area-inset-bottom));background:#fffaf0;border-top:2px solid var(--gold);box-shadow:0 -6px 16px #0002}
.kh-act h3{margin:0 0 2px;font-size:18px;color:var(--deep)}
.kh-act p{margin:2px 0 8px;font-size:14.5px;color:var(--muted);line-height:1.7}
.kh-act input{width:100%;margin:0 0 8px}
.kh-row{display:flex;flex-wrap:wrap;gap:8px}
.kh-row button{flex:1 1 auto;min-height:46px}
.kh-light{background:#fff;color:var(--deep);border-color:var(--line)}
.kh-ax{float:left;width:40px;height:40px;padding:0;margin:-6px -8px 0 0;background:transparent;border:0;color:var(--muted);font-size:20px}
.kh-msg{min-height:0;margin:4px 0;font-weight:600;color:var(--danger,#a33)}
.kh-msg.ok{color:var(--ok,#2d7a4b)}
.kh-msg:empty{display:none}
.kh-foot{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom))}
.kh-foot button{flex:1 1 auto;min-height:46px}
.kh-li{display:block;width:100%;height:auto;min-height:60px;margin:8px 0;padding:10px 14px;text-align:right;background:#fff;color:var(--ink);border:1px solid var(--gold);border-radius:var(--r-card);white-space:normal;line-height:1.7;font-weight:500}
.kh-li b{display:block;color:var(--deep);font-size:17px}
.kh-li small{display:block;color:var(--muted);font-size:13.5px}
.kh-li:hover{background:var(--hover)}
.kh-form label{display:block;margin:10px 0 4px;font-weight:600}
.kh-form input,.kh-form select,.kh-form textarea{width:100%}
.kh-form textarea{min-height:70px;font:inherit;font-size:16px;line-height:1.8;padding:8px;border:1px solid var(--gold);background:#fff;color:var(--ink);border-radius:10px}
.kh-note{font-size:14px;color:var(--muted);margin:6px 0}
body.kh-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ابتدای هر جزء (سوره و آیه) از نمایه قرآن‌خوان، اگر در دسترس باشد.
  let ix = null;
  const getIx = () => ix ? Promise.resolve(ix) : (window.quranReader?.index() || Promise.reject()).then(v => (ix = v));
  function juzStart(j) {
    const names = window.quranFree?.names; if (!ix || !names) return '';
    const g = ix.juz[j - 1]; let s = 0; while (s + 1 < ix.surah.length && ix.surah[s + 1] <= g) s++;
    return `از سوره ${names[s]}، آیه ${fa(g - ix.surah[s] + 1)}`;
  }

  // ---------- برگه ----------
  let shade = null, box = null, view = 'list', cur = null, sel = 0, busy = false, made = false, thenAfter = null, poll = 0;
  function ensure() {
    if (shade && shade.isConnected) return;
    shade = document.createElement('div'); shade.className = 'kh-shade';
    shade.innerHTML = '<div class="kh-box" role="dialog" aria-modal="true" aria-label="ختم گروهی قرآن"></div>';
    box = shade.firstChild;
    shade.addEventListener('click', onClick);
    document.body.appendChild(shade); document.body.classList.add('kh-lock');
    try { if (!history.state?.kh) history.pushState({ kh: 1 }, ''); } catch {}
    getIx().then(() => { if (view === 'k' && sel) paint(); }, () => {});
    clearInterval(poll);
    poll = setInterval(() => { if (view === 'k' && cur && !document.hidden && !busy) load(cur.id, true); }, 30000);
  }
  function close(fromHistory, then) {
    clearInterval(poll);
    if (!shade || !shade.isConnected) { if (then) then(); return; }
    shade.remove(); document.body.classList.remove('kh-lock');
    if (!fromHistory) { try { if (history.state?.kh) { thenAfter = then || null; history.back(); return; } } catch {} }
    if (then) then();
  }
  window.addEventListener('popstate', () => {
    if (shade && shade.isConnected && !history.state?.kh) close(true);
    const f = thenAfter; thenAfter = null;
    if (f) setTimeout(f, 30);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade && shade.isConnected) { if (sel) { sel = 0; paint(); } else close(); } });

  function open(id) {
    ensure();
    if (id) { load(id); return; }
    showList();
  }

  // ---------- فهرست ختم‌ها ----------
  async function showList() {
    view = 'list'; cur = null; sel = 0;
    const draw = rows => {
      if (view !== 'list') return;
      const list = rows.filter(k => k.status === 'open' || K.known().includes(k.id));
      box.innerHTML = `<button type="button" class="kh-x" data-kh="close" aria-label="بستن">✕</button><h2>ختم گروهی قرآن</h2>
<p class="kh-sub">یک ختم را انتخاب کنید، یک جزء بردارید و بخوانید؛ همه می‌بینند چه مانده است.</p>
${list.length ? list.map(k => `<button type="button" class="kh-li" data-kh-id="${esc(k.id)}"><b>${esc(k.title)}</b>${k.niyyat ? `<small>${esc(k.niyyat)}</small>` : ''}
<span class="kh-bar" aria-hidden="true"><i class="d" style="width:${k.done / 30 * 100}%"></i><i class="t" style="width:${k.taken / 30 * 100}%"></i></span>
<small>${k.status !== 'open' ? 'بسته شده · ' : ''}${k.done >= 30 ? 'کامل شد، قبول باشد' : `${fa(k.done)} از ۳۰ جزء خوانده شد · ${fa(30 - k.done - k.taken)} جزء باز`}${k.mine ? ` · ${fa(k.mine)} جزء دست شما` : ''}</small></button>`).join('')
        : '<p class="kh-note" style="text-align:center">فعلاً ختم بازی نیست.</p>'}
<div class="kh-foot"><button type="button" class="kh-light" data-kh="new">➕ ساختن ختم تازه</button></div>`;
    };
    draw(K.rows);
    draw(await K.refresh() || K.rows);
  }

  // ---------- یک ختم ----------
  async function load(id, quiet) {
    view = 'k';
    if (!quiet) { cur = null; sel = 0; box.innerHTML = '<button type="button" class="kh-x" data-kh="close" aria-label="بستن">✕</button><h2>ختم گروهی قرآن</h2><p class="kh-sub">در حال بارگذاری…</p>'; }
    try {
      const d = await K.rpc('khatm_get', { p_id: id });
      if (view !== 'k' || (quiet && cur?.id !== id)) return;
      cur = d; K.remember(id); paint();
    } catch (e) {
      if (quiet) return;
      if (e.code === 'khatm_not_found') K.forget(id);
      box.innerHTML = `<button type="button" class="kh-x" data-kh="close" aria-label="بستن">✕</button><h2>ختم گروهی قرآن</h2><p class="kh-msg">${esc(errText(e))}</p>
<div class="kh-foot">${e.code === 'net' ? `<button type="button" data-kh="retry" data-id="${esc(id)}">دوباره امتحان کنید</button>` : ''}<button type="button" class="kh-light" data-kh="list">همه ختم‌ها</button></div>`;
    }
  }
  const state = j => cur.juz.find(z => z.j === j);
  function paint(msg, ok) {
    if (!cur) return;
    const done = cur.juz.filter(z => z.done).length, taken = cur.juz.length - done, free = 30 - cur.juz.length;
    const mine = cur.juz.filter(z => z.mine && !z.done).map(z => z.j), closed = cur.status !== 'open', full = done >= 30;
    const tile = j => {
      const z = state(j);
      const [cls, lab, al] = !z ? ['', 'باز', 'باز'] : z.done ? ['dn', z.mine ? '✓ شما' : '✓', 'خوانده شد'] : z.mine ? ['me', 'جزء شما', 'دست شما'] : ['tk', z.name || 'برداشته شد', `برداشته شد${z.name ? ' به نام ' + z.name : ''}`];
      return `<button type="button" class="kh-t ${cls}${sel === j ? ' sel' : ''}" data-kh-j="${j}" aria-label="جزء ${fa(j)}، ${esc(al)}"${closed && !(z && z.mine) ? ' disabled' : ''}>${fa(j)}<small>${esc(lab)}</small></button>`;
    };
    box.innerHTML = `<button type="button" class="kh-x" data-kh="close" aria-label="بستن">✕</button><button type="button" class="kh-back" data-kh="list">‹ همه ختم‌ها</button>
<h2>${esc(cur.title)}</h2>${cur.niyyat ? `<p class="kh-niy">${esc(cur.niyyat)}</p>` : ''}
${made ? `<div class="kh-card"><h3>ختم ساخته شد</h3><p>پیوند آن را برای خانواده و دوستان بفرستید تا هر کس یک جزء بردارد. این ختم فقط با همین پیوند باز می‌شود.</p><div class="kh-row"><button type="button" data-kh="share">📤 فرستادن پیوند</button></div></div>` : ''}
${full ? `<div class="kh-card kh-done"><h3>الحمدلله، ختم قرآن کامل شد</h3><p>هر ۳۰ جزء خوانده شد. قبول باشد؛ از همه کسانی که همراهی کردند سپاس.</p>${window.contentPlus?.shown('khatmdua') ? '<div class="kh-row"><button type="button" data-kh="dua">📖 دعای ختم قرآن (صحیفه سجادیه)</button></div>' : ''}</div>` : ''}
${closed ? '<p class="kh-msg">این ختم بسته شده است؛ فقط می‌توانید جزءهای خودتان را بخوانید.</p>' : ''}
<div class="kh-bar" role="img" aria-label="${fa(done)} از ۳۰ جزء خوانده شد"><i class="d" style="width:${done / 30 * 100}%"></i><i class="t" style="width:${taken / 30 * 100}%"></i></div>
<div class="kh-stat"><span><b>${fa(done)}</b> خوانده شد</span><span><b>${fa(taken)}</b> در دست خواندن</span><span><b>${fa(free)}</b> باز</span></div>
${!full && !closed && !mine.length ? '<p class="kh-sub">روی یک جزءِ باز بزنید تا آن را برای خواندن بردارید.</p>' : ''}
<div class="kh-grid">${Array.from({ length: 30 }, (_, i) => tile(i + 1)).join('')}</div>
<div class="kh-key"><span><i></i>باز</span><span><i class="tk"></i>برداشته شد</span><span><i class="me"></i>دست شما</span><span><i class="dn"></i>خوانده شد</span></div>
${full ? '' : `<p class="kh-note">هر جزءی که برداشته شود تا ${fa(cur.hold_days)} روز برای همان نفر می‌ماند؛ اگر خوانده نشود، خودکار دوباره باز می‌شود.</p>`}
<div class="kh-foot"><button type="button" data-kh="share">📤 فرستادن پیوند ختم</button>
${cur.owner || admin() ? `<button type="button" class="kh-light" data-kh="${closed ? 'reopen' : 'close-khatm'}">${closed ? 'باز کردن دوباره ختم' : 'بستن ختم'}</button>` : ''}
<button type="button" class="kh-light" data-kh="new">➕ ختم تازه</button></div>
<p class="kh-msg${ok ? ' ok' : ''}" data-kh-msg>${esc(msg || '')}</p>
${sel ? panel(sel) : ''}`;
  }
  function panel(j) {
    const z = state(j), start = juzStart(j), head = `<button type="button" class="kh-ax" data-kh="unsel" aria-label="بستن">✕</button><h3>جزء ${fa(j)}</h3>`;
    const readBtn = t => `<button type="button" data-kh="read">📖 ${t}</button>`;
    let body;
    if (cur.status !== 'open') body = z && z.mine ? `<div class="kh-row">${readBtn('خواندن')}</div>` : '<p>این ختم بسته شده است.</p>';
    else if (!z) body = `<p>${start ? esc(start) + '. ' : ''}پس از برداشتن، تا ${fa(cur.hold_days)} روز برای شما نگه داشته می‌شود.</p>
<input type="text" maxlength="40" data-kh-name placeholder="نام شما (اختیاری؛ دیگران می‌بینند)" aria-label="نام شما، اختیاری" value="${esc(ls.get('khatmName', '') || window.account?.user?.name || '')}">
<div class="kh-row"><button type="button" data-kh="take">این جزء را برمی‌دارم</button></div>`;
    else if (z.mine && !z.done) body = `<p>${start ? esc(start) + '. ' : ''}تا ${fa(daysLeft(z.until))} روز دیگر برای شما نگه داشته می‌شود.</p>
<div class="kh-row">${readBtn('خواندن')}<button type="button" data-kh="done">✓ خواندم</button></div><div class="kh-row" style="margin-top:8px"><button type="button" class="kh-light" data-kh="release">پس دادن این جزء</button></div>`;
    else if (z.mine) body = `<p>این جزء را خوانده‌اید. قبول باشد.</p><div class="kh-row">${readBtn('خواندن دوباره')}<button type="button" class="kh-light" data-kh="undo">هنوز نخوانده‌ام</button></div>`;
    else if (z.done) body = '<p>این جزء خوانده شده است.</p>';
    else body = `<p>${z.name ? `«${esc(z.name)}» این جزء را برداشته است` : 'این جزء را کس دیگری برداشته است'}؛ اگر تا ${fa(daysLeft(z.until))} روز دیگر خوانده نشود، دوباره باز می‌شود.</p>`;
    return `<div class="kh-act" role="region" aria-label="جزء ${fa(j)}">${head}${body}</div>`;
  }

  async function act(action) {
    if (busy || !cur) return;
    const j = sel, args = { p_id: cur.id, p_juz: j, p_action: action };
    if (action === 'take') {
      const nm = (box.querySelector('[data-kh-name]')?.value || '').trim().slice(0, 40);
      args.p_name = nm; ls.set('khatmName', nm);
    }
    busy = true; box.querySelectorAll('.kh-act button').forEach(b => (b.disabled = true));
    try {
      cur = await K.rpc('khatm_act', args);
      made = false;
      if (action !== 'take') sel = 0;
      const done = cur.juz.filter(z => z.done).length;
      paint({ take: `جزء ${fa(j)} برای شما برداشته شد. «خواندن» آن را از ابتدای جزء باز می‌کند.`, done: done >= 30 ? '' : `قبول باشد! جزء ${fa(j)} خوانده شد.`, release: `جزء ${fa(j)} برای دیگران باز شد.`, undo: `جزء ${fa(j)} دوباره دست شماست.` }[action], true);
      K.refresh();
    } catch (e) {
      if (e.code === 'khatm_taken' || e.code === 'khatm_not_mine' || e.code === 'khatm_closed') { sel = 0; await load(cur.id, true); }
      paint(errText(e));
    } finally { busy = false; }
  }
  async function read() {
    const j = sel;
    try { await getIx(); } catch { return paint('بارگذاری متن قرآن انجام نشد. اینترنت را بررسی کنید.'); }
    close(false, () => window.quranFree?.openAt(ix.juz[j - 1]));
  }
  async function share() {
    const url = location.origin + location.pathname + '?khatm=' + encodeURIComponent(cur.id);
    const text = `ختم گروهی قرآن: ${cur.title}${cur.niyyat ? '\n' + cur.niyyat : ''}\nیک جزء بردارید و بخوانید:`;
    try { if (navigator.share) { await navigator.share({ title: cur.title, text, url }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + url); paint('پیوند ختم کپی شد؛ آن را در پیام‌رسان بفرستید.', true); }
    catch { prompt('این پیوند را کپی کنید و بفرستید:', url); }
  }
  async function setOpen(on) {
    if (!on && !confirm('این ختم بسته شود؟ پس از بستن کسی نمی‌تواند جزء تازه‌ای بردارد.')) return;
    try { cur = await K.rpc('khatm_owner_set', { p_id: cur.id, p_open: on }); paint(on ? 'ختم دوباره باز شد.' : 'ختم بسته شد.', true); K.refresh(); }
    catch (e) { paint(errText(e)); }
  }

  // ---------- ساختن ختم تازه (برای همه؛ ختم بازدیدکننده فقط با پیوندش باز می‌شود) ----------
  function showNew() {
    view = 'new'; cur = null; sel = 0;
    box.innerHTML = `<button type="button" class="kh-x" data-kh="close" aria-label="بستن">✕</button><button type="button" class="kh-back" data-kh="list">‹ همه ختم‌ها</button>
<h2>ختم تازه</h2><p class="kh-sub">مثلاً برای شادی روح عزیزی، شفای بیمار یا حاجتی. پس از ساختن، پیوندش را برای دیگران بفرستید.</p>
<div class="kh-form"><label for="khT">عنوان</label><input id="khT" type="text" maxlength="120" placeholder="مثلاً: ختم قرآن برای پدربزرگ">
<label for="khN">نیت یا تقدیم (اختیاری)</label><textarea id="khN" maxlength="300" placeholder="مثلاً: به نیت شادی روح مرحوم … و سلامتی همه"></textarea>
<label for="khH">هر جزء چند روز برای هر نفر بماند؟</label><select id="khH">${[1, 2, 3, 5, 7].map(n => `<option value="${n}"${n === 3 ? ' selected' : ''}>${fa(n)} روز</option>`).join('')}</select>
<p class="kh-note">اگر کسی جزئش را در این مدت نخواند، خودکار برای دیگران باز می‌شود.</p>
<p class="kh-msg" data-kh-msg></p><div class="kh-foot"><button type="button" data-kh="create">ساختن ختم</button></div></div>`;
    setTimeout(() => box.querySelector('#khT')?.focus(), 60);
  }
  async function create(b) {
    const t = box.querySelector('#khT').value.trim(), n = box.querySelector('#khN').value.trim(), h = +box.querySelector('#khH').value, m = box.querySelector('[data-kh-msg]');
    if (t.length < 2) { m.textContent = ERR.khatm_bad_title; return; }
    b.disabled = true; m.textContent = '';
    try {
      const id = await K.rpc('khatm_create', { p_title: t, p_niyyat: n, p_hold: h });
      K.remember(id); made = true; await load(id); K.refresh();
    } catch (e) { m.textContent = errText(e); b.disabled = false; }
  }

  function onClick(e) {
    if (e.target === shade) return close();
    const t = e.target.closest('[data-kh-j]');
    if (t) { const j = +t.dataset.khJ; sel = sel === j ? 0 : j; paint(); if (sel) setTimeout(() => box.querySelector('[data-kh-name]')?.focus({ preventScroll: true }), 50); return; }
    const li = e.target.closest('[data-kh-id]'); if (li) return load(li.dataset.khId);
    const b = e.target.closest('[data-kh]'); if (!b) return;
    const k = b.dataset.kh;
    if (k === 'close') close();
    else if (k === 'list') showList();
    else if (k === 'new') showNew();
    else if (k === 'create') create(b);
    else if (k === 'retry') load(b.dataset.id);
    else if (k === 'unsel') { sel = 0; paint(); }
    else if (k === 'read') read();
    else if (k === 'dua') window.contentPlus?.khatmDua(); // دعای ۴۲ صحیفه (content-plus.js)
    else if (k === 'share') share();
    else if (k === 'close-khatm') setOpen(false);
    else if (k === 'reopen') setOpen(true);
    else if (['take', 'done', 'release', 'undo'].includes(k)) act(k);
  }

  // ---------- مدیر: کارت «ختم گروهی قرآن» در زبانه تنظیمات ----------
  function adminCard() {
    const pane = document.getElementById('pane-settings');
    if (!pane || !window.sbApi) return;
    let card = document.getElementById('setKhatm');
    if (!card) {
      card = document.createElement('div'); card.className = 'adm-card'; card.id = 'setKhatm';
      const after = document.getElementById('setZekr') || document.getElementById('setFeatures');
      after ? after.after(card) : pane.prepend(card);
      card.innerHTML = `<h3>ختم گروهی قرآن</h3><p class="hint">ختمی که اینجا می‌سازید در «منوی ☰ › ختم گروهی قرآن» برای همه دیده می‌شود (اگر «ختم گروهی جزء به جزء» در امکانات سایت روشن باشد). بازدیدکنندگان هم می‌توانند ختم خودشان را بسازند که فقط با پیوندش باز می‌شود و اینجا با «فقط پیوند» دیده می‌شود.</p>
<div data-ka="list" class="hint">…</div>
<h4 style="margin:14px 0 0;color:var(--deep)">ختم تازه</h4>
<label for="khaT">عنوان</label><input id="khaT" type="text" maxlength="120" placeholder="مثلاً: ختم قرآن ماه رمضان" style="width:100%">
<label for="khaN">نیت یا تقدیم (اختیاری)</label><input id="khaN" type="text" maxlength="300" placeholder="مثلاً: به نیت سلامتی و فرج امام زمان (عج)" style="width:100%">
<label for="khaH">مهلت هر جزء (روز)؛ پس از آن جزء خودکار باز می‌شود</label><select id="khaH" style="width:100%">${[1, 2, 3, 4, 5, 7, 10, 14].map(n => `<option value="${n}"${n === 3 ? ' selected' : ''}>${fa(n)} روز</option>`).join('')}</select>
<div class="reg-tools"><button type="button" data-ka="create">ساختن ختم</button></div><div class="adm-msg" data-ka="msg"></div>`;
      card.addEventListener('click', e => adminClick(card, e));
      card.addEventListener('change', e => { const s = e.target.closest('[data-ka-hold]'); if (s) adminPatch(card, s.dataset.kaHold, { hold_days: +s.value }); });
    }
    adminLoad(card);
  }
  const amsg = (card, t, ok) => { const e = card.querySelector('[data-ka=msg]'); e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
  const admErr = e => /راه‌اندازی نشده/.test(e.message) ? 'ابتدا khatm.sql را در Supabase اجرا کنید (backend/supabase/khatm.sql).' : e.message;
  let arows = [];
  async function adminLoad(card) {
    const list = card.querySelector('[data-ka=list]');
    try {
      arows = await window.sbApi('khatms?select=id,title,niyyat,hold_days,listed,status,completed_at,created_at,khatm_juz(done,taken_at)&order=created_at.desc&limit=60', { auth: true });
      list.className = '';
      list.innerHTML = arows.length ? arows.map(k => {
        const done = k.khatm_juz.filter(z => z.done).length, taken = k.khatm_juz.filter(z => !z.done && Date.parse(z.taken_at) > Date.now() - k.hold_days * 864e5).length;
        return `<div data-id="${esc(k.id)}" style="border-top:1px solid #f0e8d6;padding:8px 0"><b>${esc(k.title)}</b> <small style="color:var(--muted)">${k.status === 'open' ? '🟢 باز' : '⚪ بسته'} · ${k.listed ? 'در منو برای همه' : 'فقط پیوند'}</small>
${k.niyyat ? `<div style="color:var(--muted);font-size:14px">${esc(k.niyyat)}</div>` : ''}
<div class="kh-bar"><i class="d" style="width:${done / 30 * 100}%"></i><i class="t" style="width:${taken / 30 * 100}%"></i></div>
<small>${fa(done)} از ۳۰ خوانده شد، ${fa(taken)} در دست خواندن${k.completed_at ? ' · کامل شد' : ''}</small>
<div class="reg-tools" style="align-items:center"><button type="button" class="reg-light" data-ka="open">دیدن</button><button type="button" class="reg-light" data-ka="link">کپی پیوند</button><button type="button" class="reg-light" data-ka="toggle">${k.status === 'open' ? 'بستن' : 'باز کردن'}</button><button type="button" class="reg-light" data-ka="listed">${k.listed ? 'برداشتن از منو' : 'نمایش در منو'}</button><button type="button" class="reg-light" data-ka="del">حذف</button>
<label style="margin:0;font-weight:500;font-size:14px">مهلت <select data-ka-hold="${esc(k.id)}" aria-label="مهلت هر جزء">${[1, 2, 3, 4, 5, 7, 10, 14].map(n => `<option value="${n}"${n === k.hold_days ? ' selected' : ''}>${fa(n)} روز</option>`).join('')}</select></label></div></div>`;
      }).join('') : '<p class="hint">هنوز ختمی ساخته نشده است.</p>';
    } catch (e) { list.className = 'adm-msg adm-bad'; list.textContent = admErr(e); }
  }
  async function adminPatch(card, id, body) {
    try { await window.sbApi(`khatms?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: Object.assign(body, { updated_at: new Date().toISOString() }), auth: true, prefer: 'return=minimal' }); amsg(card, 'ذخیره شد.', true); adminLoad(card); K.refresh(); }
    catch (e) { amsg(card, admErr(e)); }
  }
  async function adminClick(card, e) {
    const b = e.target.closest('[data-ka]'); if (!b) return;
    const k = b.dataset.ka;
    if (k === 'create') {
      const t = card.querySelector('#khaT').value.trim();
      if (t.length < 2) return amsg(card, 'عنوان را بنویسید.');
      b.disabled = true;
      try {
        await window.sbRpc('khatm_create', { p_title: t, p_niyyat: card.querySelector('#khaN').value.trim(), p_hold: +card.querySelector('#khaH').value, p_device: K.device() }, true);
        card.querySelector('#khaT').value = ''; card.querySelector('#khaN').value = '';
        amsg(card, 'ختم ساخته شد و در منو دیده می‌شود.', true); adminLoad(card); K.refresh();
      } catch (err) { amsg(card, admErr(err)); }
      b.disabled = false; return;
    }
    const row = b.closest('[data-id]'), id = row?.dataset.id, r = arows.find(x => x.id === id); if (!r) return;
    if (k === 'open') open(id);
    else if (k === 'link') {
      const url = location.origin + location.pathname + '?khatm=' + id;
      try { await navigator.clipboard.writeText(url); amsg(card, 'پیوند کپی شد: ' + url, true); } catch { prompt('پیوند ختم:', url); }
    }
    else if (k === 'toggle') adminPatch(card, id, { status: r.status === 'open' ? 'closed' : 'open' });
    else if (k === 'listed') adminPatch(card, id, { listed: !r.listed });
    else if (k === 'del') {
      if (!confirm(`ختم «${r.title}» و همه جزءهای برداشته‌شده آن حذف شود؟`)) return;
      try { await window.sbApi(`khatms?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' }); amsg(card, 'حذف شد.', true); adminLoad(card); K.refresh(); }
      catch (err) { amsg(card, admErr(err)); }
    }
  }

  window.khatmApp = { open, close: () => close(), adminCard };
})();
