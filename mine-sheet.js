// برگه «نوران من» و «برنامه ختم قرآن من»؛ فقط با اولین باز شدن از mine.js بار می‌شود (window.nrMineSheet.open('all' یا 'plan')).
// چیز تازه‌ای از سرور نمی‌خواهد: دوره‌ها از chelleh.js (chlMine) و حزب‌خوانی (گروه و شناسه ذخیره‌شده و hezb_reported_days)،
// نشانه‌ها از qr-plus.js (qrSaved)، ذکرها از zekr.js (zekrStats) و برنامه ختم از mine.js. هر بخش فقط وقتی داده دارد دیده می‌شود.
// روزهای خواندن هر ماه روی همین گوشی جمع می‌شود (localStorage، کلید nmDays)، چون سرور حزب‌خوانی فقط هفته اخیر را می‌دهد.
(function () {
  const M = window.nrMine, P = M.plan, PAGES = M.PAGES, shown = M.shown;
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const num = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const dateFa = iso => (iso && window.J ? J.label(iso) : '');
  const NAMES = () => window.quranFree?.names || [];
  const sname = s => NAMES()[s - 1] || toFa(s);

  const css = `
.nm-shade{position:fixed;inset:0;z-index:62;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.nm-box{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:14px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;line-height:1.7}
.nm-box h2{margin:4px 0 0;font:normal 30px/1.6 SiteFont,Tahoma,serif;color:var(--deep);text-align:center}
.nm-sub{margin:0 0 6px;text-align:center;color:var(--muted);font-size:14.5px}
.nm-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.nm-x:hover{background:var(--hover)}
.nm-box h3{margin:16px 0 6px;font-size:15px;font-weight:700;color:var(--muted)}
.nm-row{display:flex;align-items:center;gap:10px;width:100%;height:auto;min-height:52px;margin:0 0 6px;padding:6px 12px;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:var(--r-card);text-align:right;font-weight:500;white-space:normal;line-height:1.55}
.nm-row:hover{background:var(--hover)}
.nm-row .nm-ic{flex:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--mint);font-size:18px}
.nm-row>span:nth-child(2){flex:1;min-width:0}
.nm-row b{display:block;color:var(--deep);font-weight:600}
.nm-row small{display:block;color:var(--muted);font-size:13.5px;overflow-wrap:anywhere}
.nm-st{flex:none;font-style:normal;font-size:13px;font-weight:600;padding:0 9px;border-radius:var(--pill);border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.nm-st.ok{color:#fff;background:var(--emerald);border-color:var(--deep)}
.nm-st.todo{color:#8a5a12;background:#fff3d6;border-color:#e8c98a}
.nm-card{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:12px 14px;margin:0 0 8px}
.nm-card p{margin:0 0 6px}
.nm-big{font-size:18px;font-weight:700;color:var(--deep)}
.nm-mute{color:var(--muted);font-size:14px}
.nm-bar{height:8px;margin:6px 0;background:#eee4cf;border-radius:var(--pill);overflow:hidden}
.nm-bar span{display:block;height:100%;background:var(--emerald)}
.nm-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.nm-btns button{height:auto;min-height:48px;white-space:normal;line-height:1.5;padding:4px 10px}
.nm-btns .nm-one{grid-column:1/-1}
.nm-note{margin:10px 0 0;padding:8px 12px;background:var(--cream);border:1px solid var(--gold);border-right:4px solid #c79a45;border-radius:var(--r);font-size:15px}
.nm-note button{display:block;width:100%;height:auto;min-height:44px;margin-top:8px;white-space:normal;line-height:1.5}
.nm-link{height:auto;min-height:44px;padding:0 4px;background:none;border:0;color:var(--deep);text-decoration:underline;font-weight:500;font-size:15px}
.nm-link:hover{background:none;color:var(--emerald)}
.nm-more{margin-top:10px;font-size:15px}
.nm-more summary{cursor:pointer;color:var(--deep);font-weight:600;min-height:40px;display:flex;align-items:center}
.nm-more .row{display:flex;gap:8px;margin:6px 0}
.nm-more .row input{width:auto;flex:1}
.nm-opts{display:grid;gap:8px}
.nm-opts button{display:flex;align-items:center;justify-content:space-between;gap:10px;height:auto;min-height:56px;padding:6px 14px;background:#fff;color:var(--deep);border:1px solid var(--emerald);white-space:normal;text-align:right;line-height:1.5}
.nm-opts button:hover{background:var(--hover)}
.nm-opts small{color:var(--muted);font-weight:400;font-size:13.5px}
.nm-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0}
.nm-chips span{padding:0 10px;border-radius:var(--pill);background:var(--mint);color:var(--deep);font-size:14px}
.nm-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:8px 0 4px;direction:rtl}
.nm-cal i{display:flex;align-items:center;justify-content:center;aspect-ratio:1;max-height:40px;font-style:normal;font-size:12.5px;border:1px solid #e3d6b8;border-radius:6px;color:#9a8b78;background:#fffaf0}
.nm-cal i.d{background:var(--emerald);border-color:var(--deep);color:#fff;font-weight:700}
.nm-cal i.t{outline:2px solid var(--gold);outline-offset:1px;color:var(--deep);font-weight:700}
.nm-cal i.d.t{color:#fff}
.nm-cal i.f{opacity:.4}
.nm-empty{text-align:center;padding:14px 4px 4px}
.nm-empty p{color:var(--muted);margin:0 0 12px}
.nm-empty button,.nm-cta{width:100%;height:auto;min-height:50px;white-space:normal}
.nm-cta{margin-top:14px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.nm-cta:hover{background:var(--hover)}
@media(min-width:700px){.nm-shade{align-items:center}.nm-box{border-bottom:2px solid var(--gold);border-radius:var(--r-panel);max-height:88vh}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let shade = null, mode = 'all', setup = false, ix = null, hezbDays = null, hezbKey = '';
  const box = () => shade.querySelector('.nm-box');
  const getIx = async () => ix || (ix = await window.quranReader.index());
  const lastLE = (a, g) => { let i = 0; while (i + 1 < a.length && a[i + 1] <= g) i++; return i; };
  const where = g => { const s = lastLE(ix.surah, g); return { s: s + 1, n: g - ix.surah[s] + 1, juz: lastLE(ix.juz, g) + 1 }; };

  // ---------- دوره‌ها و کارهای امروز ----------
  function hezb() {
    let me = null; try { me = JSON.parse(localStorage.getItem('me')); } catch {}
    if (!me || !me.g || !me.id) return null;
    let g = null, label = '', started = true;
    try { g = groups.find(x => x.number === me.g); } catch {}
    if (g) { try { const t = taskFor(g, me.id); started = t.days >= 0; label = started ? portions[t.index] || '' : ''; } catch {} }
    return { me, name: g ? g.name : `گروه ${toFa(me.g)}`, label: toFa(label), started };
  }
  async function loadHezb(h) {
    const cfg = window.APP_CONFIG || {}, key = `${h.me.g}:${h.me.id}`;
    if (hezbKey === key || !cfg.SUPABASE_URL) return;
    hezbKey = key;
    try {
      const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/hezb_reported_days`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_group: h.me.g, p_participant: h.me.id }) });
      const a = r.ok ? await r.json() : null;
      if (Array.isArray(a)) { hezbDays = a.map(String); remember(hezbDays); if (shade?.isConnected) render(); }
    } catch { /* بدون اینترنت: وضعیت امروز حزب‌خوانی نامعلوم می‌ماند */ }
  }
  function chlRow(m, t) {
    const marked = m.marked || [], n = m.start_date ? M.isoDiff(t, m.start_date) + 1 : 0;
    let sub = '', st = '';
    if (m.reserve) sub = `فهرست رزرو، نفر ${toFa(m.reserve_pos || '')}`;
    else if (!m.start_date) sub = `در انتظار تکمیل ظرفیت (${toFa(m.members || 0)} از ${toFa(m.capacity || 0)})`;
    else if (n < 1) sub = `شروع: ${dateFa(m.start_date)}`;
    else if (m.kind === 'page' ? marked.length >= m.days : n > m.days) return '';
    else {
      const done = marked.includes(t);
      sub = m.kind === 'page' ? `${toFa(marked.length)} از ${toFa(m.days)} صفحه` : `روز ${toFa(n)} از ${toFa(m.days)}${m.kind === 'juz' ? ` · امروز جزء ${toFa(((Math.max(1, m.slot || 1) - 1) + n - 1) % 30 + 1)}` : ''}`;
      st = done ? '<em class="nm-st ok">✓ خوانده شد</em>' : '<em class="nm-st todo">امروز مانده</em>';
    }
    return `<button type="button" class="nm-row" data-go="chl:${esc(m.code)}"><span class="nm-ic">${m.kind === 'text' ? '📿' : '📖'}</span><span><b>${esc(m.title)}</b><small>${esc(sub)}</small></span>${st}</button>`;
  }
  function coursesHtml(t) {
    let s = '';
    const h = hezb();
    if (h) {
      const done = hezbDays && hezbDays.includes(t);
      s += `<button type="button" class="nm-row" data-go="hezb"><span class="nm-ic">📖</span><span><b>حزب‌خوانی · ${esc(h.name)}</b><small>${h.started ? h.label ? `سهم امروز: ${esc(h.label)}` : `شناسه ${esc(toFa(h.me.id))}` : 'دوره هنوز شروع نشده است'}</small></span>${!h.started || !hezbDays ? '' : done ? '<em class="nm-st ok">✓ گزارش شد</em>' : '<em class="nm-st todo">امروز مانده</em>'}</button>`;
      loadHezb(h);
    }
    s += (window.chlMine?.() || []).map(m => chlRow(m, (m.today && m.today > t ? m.today : t))).join('');
    return s ? `<h3>دوره‌های من و کار امروز</h3>${s}` : '';
  }

  // ---------- برنامه ختم ----------
  const OPTS = [[30, 'روزی حدود ۲۰ صفحه (یک جزء)'], [60, 'روزی حدود ۱۰ صفحه (نیم جزء)'], [120, 'روزی حدود ۵ صفحه']];
  function setupHtml(p) {
    return `<div class="nm-card"><p class="nm-big">قرآن را در چند روز ختم کنید؟</p><p class="nm-mute">${toFa(PAGES)} صفحه مصحف مدینه، از امروز. هر روز سهم همان روز را می‌بینید و با یک دکمه در «قرآن آزاد» می‌خوانید. فقط روی همین گوشی ذخیره می‌شود.</p>
<div class="nm-opts">${OPTS.map(([n, d]) => `<button type="button" data-plan-new="${n}"><b>${toFa(n)} روز</b><small>${d}</small></button>`).join('')}</div>
<details class="nm-more"><summary>تعداد روز دلخواه</summary><div class="row"><input id="nmDays" inputmode="numeric" placeholder="مثلاً ۴۰" aria-label="تعداد روز"><button type="button" data-plan-custom>شروع</button></div><p class="nm-mute" id="nmDaysMsg"></p></details>
${p || mode === 'all' ? `<button type="button" class="nm-link" data-plan-cancel>${p ? 'انصراف و برگشت به برنامه فعلی' : 'برگشت'}</button>` : ''}</div>`;
  }
  function planHtml() {
    if (!shown('plans')) return '';
    const p = P.get();
    if (setup || (!p && mode === 'plan')) return `${mode === 'all' ? '<h3>برنامه ختم قرآن</h3>' : ''}${setupHtml(p)}`;
    if (!p) return '';
    const s = P.status(p), head = mode === 'all' ? '<h3>برنامه ختم قرآن من</h3>' : '';
    if (s.fin) return `${head}<div class="nm-card"><p class="nm-big">🎉 ختم قرآن کامل شد. قبول باشد.</p><p class="nm-mute">${toFa(PAGES)} صفحه، از ${esc(dateFa(p.s))} تا ${esc(dateFa(p.fin || s.t))}.</p>
<div class="nm-btns">${window.shareCard ? '<button type="button" data-plan="cert">🏅 تصویر ختم</button>' : ''}<button type="button" class="reg-light${window.shareCard ? '' : ' nm-one'}" data-plan="again">برنامه تازه</button></div>${window.contentPlus?.shown('khatmdua') ? '<div class="nm-btns"><button type="button" class="nm-one" data-go="khatmdua:">📖 دعای ختم قرآن (صحیفه سجادیه، دعای ۴۲)</button></div>' : ''}</div>`;
    const pct = Math.round(p.last / PAGES * 100), left = PAGES - p.last;
    const spreadDays = Math.max(1, M.isoDiff(p.e, p.log[s.t] ? M.isoAdd(s.t, 1) : s.t) + 1), spreadRate = Math.ceil(left / spreadDays);
    const behind = s.behind ? `<div class="nm-note">${toFa(s.behind)} صفحه از برنامه عقب هستید.${!s.over && !s.done && s.tT > s.to ? ` اگر امروز تا صفحه ${toFa(s.tT)} بخوانید، به برنامه می‌رسید.` : ''}
<button type="button" class="reg-light" data-plan="spread">${s.over || spreadDays < 2 && !s.done ? `ادامه با همان روزی ${toFa(P.rate(p))} صفحه` : `تقسیم عقب‌ماندگی بین ${toFa(spreadDays)} روز باقی‌مانده (روزی ${toFa(spreadRate)} صفحه)`}</button></div>` : '';
    return `${head}<div class="nm-card"><p class="nm-mute">ختم در ${toFa(p.n)} روز · روز ${toFa(Math.max(1, s.day))}${s.day <= p.n ? ` از ${toFa(p.n)}` : ''} · پایان ${esc(dateFa(p.e))}</p>
<div class="nm-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${PAGES}" aria-valuenow="${p.last}" aria-label="پیشرفت ختم"><span style="width:${pct}%"></span></div>
<p class="nm-mute">${toFa(p.last)} از ${toFa(PAGES)} صفحه خوانده‌اید (${toFa(pct)}٪).</p>
<p class="nm-big">${s.done ? '✓ سهم امروز خوانده شد' : 'سهم امروز'}: صفحه ${toFa(s.from)}${s.to > s.from ? ` تا ${toFa(s.to)}` : ''}</p>
<p class="nm-mute" id="nmRange">&nbsp;</p>
<div class="nm-btns">${s.done
      ? `<button type="button" data-plan="read" data-p="${Math.min(PAGES, s.to + 1)}">📖 ادامه از صفحه ${toFa(Math.min(PAGES, s.to + 1))}</button><button type="button" class="reg-light" data-plan="undo">برداشتن ثبت امروز</button>`
      : `<button type="button" data-plan="read" data-p="${s.from}">📖 خواندن از صفحه ${toFa(s.from)}</button><button type="button" class="reg-light" data-plan="done" data-p="${s.to}">✓ خواندم</button>`}</div>
<div id="nmFree"></div>${behind}
<details class="nm-more"><summary>بیشتر</summary>
<p class="nm-mute" style="margin:6px 0 0">بیشتر یا کمتر خواندید؟ آخرین صفحه‌ای را که امروز خواندید بنویسید:</p>
<div class="row"><input id="nmTo" inputmode="numeric" placeholder="شماره صفحه" aria-label="خواندم تا صفحه"><button type="button" data-plan="to">ثبت</button></div><p class="nm-mute" id="nmToMsg"></p>
<button type="button" class="nm-link" data-plan="again">برنامه تازه</button> · <button type="button" class="nm-link" data-plan="del">حذف برنامه</button></details></div>`;
  }
  // سوره و آیه سهم امروز، و پیشنهاد ثبت اگر در «قرآن آزاد» جلوتر خوانده‌اند (کلید quranFree همان فایل)
  async function planExtras() {
    const p = shown('plans') && P.get(); if (!p || setup) return;
    const s = P.status(p); if (s.fin) return;
    try { await getIx(); } catch { return; }
    const r = box()?.querySelector('#nmRange');
    if (r) {
      const a = where(ix.page[s.from - 1]), b = where((s.to < PAGES ? ix.page[s.to] : ix.total) - 1);
      r.textContent = a.s === b.s ? `سوره ${sname(a.s)}، آیه ${toFa(a.n)} تا ${toFa(b.n)}` : `از ${sname(a.s)} ${toFa(a.n)} تا ${sname(b.s)} ${toFa(b.n)}` + (a.juz === b.juz ? ` · جزء ${toFa(a.juz)}` : '');
    }
    const q = read('quranFree', null), f = box()?.querySelector('#nmFree');
    if (f && q && q.g >= 0 && q.t && Date.now() - q.t < 20 * 36e5) {
      const pg = lastLE(ix.page, q.g) + 1;
      if (pg > p.last && pg <= Math.min(PAGES, p.last + Math.max(40, 3 * (s.to - s.from + 1))) && !(s.done && pg <= s.to)) f.innerHTML = `<div class="nm-note">در «قرآن آزاد» به صفحه ${toFa(pg)} رسیده‌اید.<button type="button" class="reg-light" data-plan="done" data-p="${pg}">ثبت: امروز تا صفحه ${toFa(pg)} خواندم</button></div>`;
    }
  }

  // ---------- نشانه‌ها، ذکرها، این ماه ----------
  function savedHtml() {
    if (!shown('saved')) return '';
    const all = read('qrSaved', {}) || {}, keys = Object.keys(all).filter(k => /^\d+:\d+$/.test(k));
    if (!keys.length) return '';
    const top = keys.sort((a, b) => (all[b].t || 0) - (all[a].t || 0)).slice(0, 3), notes = keys.filter(k => all[k].note).length;
    return `<h3>نشانه‌ها و یادداشت‌ها</h3>${top.map(k => { const [s, n] = k.split(':'); return `<button type="button" class="nm-row" data-go="v:${k}"><span class="nm-ic">${all[k].note ? '✎' : '🔖'}</span><span><b>سوره ${esc(sname(+s))}، آیه ${toFa(n)}</b>${all[k].note ? `<small>${esc(String(all[k].note).slice(0, 90))}</small>` : ''}</span></button>`; }).join('')}
${keys.length > 3 && window.qpSaved ? `<button type="button" class="nm-link" data-go="saved">همه ${toFa(keys.length)} آیه${notes ? ` و ${toFa(notes)} یادداشت` : ''} ‹</button>` : ''}`;
  }
  function zekrHtml() {
    if (!shown('zekr') || !window.zekr) return '';
    const st = read('zekrStats', {}) || {}, all = st.all || {}, d = (st.d || {})[new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())] || {};
    const sum = o => Object.values(o).reduce((a, b) => a + (+b || 0), 0), total = sum(all);
    if (!total) return '';
    const names = Object.fromEntries((window.zekr.list || []).map(z => [z.id, z.name])), name = id => (st.names || {})[id] || names[id] || (id === 'custom' ? 'ذکر دلخواه' : '');
    const top = Object.entries(all).filter(([id, n]) => n > 0 && name(id)).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `<h3>ذکرها</h3><button type="button" class="nm-row" data-go="zekr"><span class="nm-ic">📿</span><span><b>امروز ${num(sum(d))} · روی هم ${num(total)}</b>${top.length ? `<small>${top.map(([id, n]) => `${esc(name(id))}: ${num(n)}`).join('، ')}</small>` : ''}</span><span class="nm-mute">‹</span></button>`;
  }
  // روزهای خواندن: چله‌ها، حزب‌خوانی (هفته اخیر از سرور) و برنامه ختم؛ روی گوشی جمع می‌شود تا ماه کامل بماند.
  function remember(list) {
    const d = new Set(read('nmDays', []) || []), n = d.size;
    list.forEach(x => /^\d{4}-\d\d-\d\d$/.test(x) && d.add(x));
    if (d.size !== n) write('nmDays', [...d].sort().slice(-400));
    return d;
  }
  function monthHtml(t) {
    if (!window.J) return '';
    const p = P.get(), list = [...(p ? Object.keys(p.log) : [])];
    (window.chlMine?.() || []).forEach(m => list.push(...(m.marked || [])));
    const days = remember(list), j = J.fromIso(t), len = J.monthLen(j.y, j.m), first = J.toIso(j.y, j.m, 1);
    if (!first) return '';
    let n = 0, cells = '';
    // ستون اول شنبه است؛ خانه‌های خالی پیش از روز اول ماه
    const wd = (new Date(Date.parse(first + 'T12:00:00Z')).getUTCDay() + 1) % 7;
    cells += '<i style="visibility:hidden"></i>'.repeat(wd);
    for (let k = 0; k < len; k++) {
      const iso = M.isoAdd(first, k), on = days.has(iso); if (on) n++;
      cells += `<i class="${on ? 'd' : ''}${iso === t ? ' t' : ''}${iso > t ? ' f' : ''}" title="${esc(dateFa(iso))}">${toFa(k + 1)}</i>`;
    }
    if (!n) return '';
    const mName = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.parse(first + 'T12:00:00Z')));
    return `<h3>${esc(mName)} ${toFa(j.y)}</h3><div class="nm-card"><p class="nm-big">${toFa(n)} روز خواندید${j.d > 1 ? ` <span class="nm-mute">از ${toFa(j.d)} روز گذشته این ماه</span>` : ''}</p>
<div class="nm-cal" aria-label="روزهای خواندن این ماه">${'شیدسچپج'.split('').map(x => `<i style="border:0;background:none;font-weight:700">${x}</i>`).join('')}${cells}</div>
<p class="nm-mute" style="margin:4px 0 0">روزهایی که در چله‌ها، حزب‌خوانی یا برنامه ختم «خواندم» زده‌اید.</p></div>`;
  }

  // تصویر پایان چله یا ختم، با shareCard در qr-plus.js
  function cert(m) {
    const page = m.kind === 'page', marked = [...(m.marked || [])].sort();
    const what = page ? `${toFa(m.days)} صفحه قرآن کریم را خواند و یک ختم کامل قرآن را به پایان رساند` : `${toFa(m.days)} روز، ${m.title} را خواند و ${m.kind === 'text' ? 'این چله' : 'این دوره'} را به پایان رساند`;
    window.shareCard({
      title: page ? 'ختم قرآن کریم' : m.title, sub: `${dateFa(m.start_date)} تا ${dateFa(marked[marked.length - 1])}`,
      ar: 'تَقَبَّلَ اللهُ مِنّا وَ مِنكُم', fa: `${m.name ? `${m.name}، ` : ''}${what}. قبول باشد.`, file: 'nooran-chelleh'
    });
  }
  function planCert(p) {
    window.shareCard?.({ title: 'ختم قرآن کریم', sub: `${dateFa(p.s)} تا ${dateFa(p.fin || M.today())}`, ar: 'تَقَبَّلَ اللهُ مِنّا وَ مِنكُم', fa: `ختم کامل قرآن کریم، ${toFa(PAGES)} صفحه در ${toFa(M.isoDiff(p.fin || M.today(), p.s) + 1)} روز. قبول باشد.`, file: 'nooran-khatm' });
  }

  // ---------- برگه ----------
  function render() {
    const t = M.today(), b = box();
    let body = '';
    if (mode === 'plan') body = planHtml();
    else {
      const parts = [coursesHtml(t), planHtml(), savedHtml(), zekrHtml(), monthHtml(t)];
      body = parts.join('');
      if (!body) body = `<div class="nm-empty"><p>اینجا دوره‌ها، کار امروز، نشانه‌ها و خلاصه خواندن ماه شما جمع می‌شود. هنوز چیزی ثبت نکرده‌اید.</p>${shown('plans') ? '<button type="button" data-plan="again">🎯 ساختن برنامه ختم قرآن</button>' : '<button type="button" data-go="menu">ثبت‌نام در دوره‌ها و چله‌ها</button>'}</div>`;
      else if (shown('plans') && !P.get() && !setup) body += '<button type="button" class="nm-cta" data-plan="again">🎯 برنامه ختم قرآن شخصی بسازید (۳۰، ۶۰ یا ۱۲۰ روز)</button>';
    }
    b.innerHTML = `<button type="button" class="nm-x" aria-label="بستن">✕</button><h2>${mode === 'plan' ? 'ختم قرآن من' : 'نوران من'}</h2><p class="nm-sub">${esc(dateFa(t))}</p>${body}`;
    planExtras();
  }
  let after = null;
  function open(m) {
    mode = m === 'plan' ? 'plan' : 'all'; setup = false;
    if (mode === 'all' && !shown('mine') || mode === 'plan' && !shown('plans')) return;
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'nm-shade';
      shade.innerHTML = '<div class="nm-box" role="dialog" aria-modal="true" aria-label="نوران من"></div>';
      shade.addEventListener('click', onClick);
      shade.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('#nmDays,#nmTo')) e.target.closest('.row').querySelector('button').click(); });
    }
    box().setAttribute('aria-label', mode === 'plan' ? 'ختم قرآن من' : 'نوران من');
    render();
    if (!shade.isConnected) {
      document.body.appendChild(shade); document.body.classList.add('ib-lock');
      try { if (!history.state?.nrm) history.pushState({ nrm: 1 }, ''); } catch {}
    }
    box().scrollTop = 0;
    setTimeout(() => shade?.querySelector('.nm-x')?.focus(), 50);
  }
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    shade.remove(); document.body.classList.remove('ib-lock');
    if (!fromHistory) { try { if (history.state?.nrm) history.back(); } catch {} }
  }
  // کاری که پس از بستن برگه انجام می‌شود (مثل باز کردن قرآن‌خوان) تا برگشت تاریخچه تمام نشده صبر می‌کند تا آن را نبندد.
  function closeThen(fn) {
    if (history.state?.nrm) { after = fn; close(); } else { close(true); fn(); }
  }
  window.addEventListener('popstate', () => {
    if (shade?.isConnected && !history.state?.nrm) close(true);
    const f = after; after = null; if (f) setTimeout(f, 40);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade?.isConnected) close(); });
  document.addEventListener('mine:changed', () => { if (shade?.isConnected) render(); });
  document.addEventListener('features:changed', () => { if (shade?.isConnected && (mode === 'plan' ? !shown('plans') : !shown('mine'))) close(); });
  document.addEventListener('chl:panel', () => { if (shade?.isConnected && mode === 'all') render(); });

  const pageNum = v => parseInt(String(v).replace(/[۰-۹]/g, d => fa.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, ''), 10);
  function onClick(e) {
    if (e.target === shade || e.target.closest('.nm-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    const go = b.dataset.go, pa = b.dataset.plan, p = P.get();
    if (go) {
      const [k, v] = go.split(/:(.*)/);
      if (k === 'chl') return closeThen(() => { const el = document.getElementById('chlC' + v); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } });
      if (k === 'hezb') return closeThen(() => window.hezbReveal?.('hzTaskPanel'));
      if (k === 'v') { const [s, n] = v.split(':').map(Number); return closeThen(() => { const R = window.quranReader; if (R && window.quranFree) window.quranFree.openAt(R.g(s, n)); }); }
      if (k === 'saved') return closeThen(() => window.qpSaved?.open());
      if (k === 'zekr') return closeThen(() => window.zekr?.open());
      if (k === 'menu') return closeThen(() => window.siteMenu?.open());
      if (k === 'khatmdua') return closeThen(() => window.contentPlus?.khatmDua());
      return;
    }
    if (b.dataset.planNew) { if (p && !P.status(p).fin && !confirm('برنامه فعلی کنار گذاشته شود و برنامه تازه از امروز شروع شود؟')) return; setup = false; P.create(+b.dataset.planNew); return; }
    if (b.hasAttribute('data-plan-custom')) {
      const n = pageNum(box().querySelector('#nmDays').value), msg = box().querySelector('#nmDaysMsg');
      if (!(n >= 3 && n <= 730)) { msg.textContent = 'عددی از ۳ تا ۷۳۰ روز بنویسید.'; return; }
      if (p && !P.status(p).fin && !confirm('برنامه فعلی کنار گذاشته شود و برنامه تازه از امروز شروع شود؟')) return;
      setup = false; P.create(n); return;
    }
    if (b.hasAttribute('data-plan-cancel')) { setup = false; return render(); }
    if (!pa) return;
    if (pa === 'again') { setup = true; render(); box().querySelector('.nm-opts button')?.focus(); return; }
    if (pa === 'cert' && p) return planCert(p);
    if (!p) return;
    if (pa === 'read') { const pg = +b.dataset.p; return closeThen(() => M.readPage(pg)); }
    if (pa === 'done') return P.mark(p, +b.dataset.p);
    if (pa === 'undo') return P.undo(p);
    if (pa === 'spread') return P.spread(p);
    if (pa === 'to') {
      const n = pageNum(box().querySelector('#nmTo').value), L = p.log[M.today()], min = (L ? L[0] : p.last) + 1;
      if (!(n >= min && n <= PAGES)) { box().querySelector('#nmToMsg').textContent = `صفحه‌ای از ${toFa(min)} تا ${toFa(PAGES)} بنویسید.`; return; }
      return P.mark(p, n);
    }
    if (pa === 'del' && confirm('برنامه ختم حذف شود؟')) P.save(null);
  }

  window.nrMineSheet = { open, close, cert };
})();
