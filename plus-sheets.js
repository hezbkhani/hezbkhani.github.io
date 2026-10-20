// برگه‌های دور ششم (plus.js)؛ فقط با اولین باز کردن یکی از آن‌ها بار می‌شود: window.plusSheets[نام](…).
// wird: برنامه عبادی روزانه؛ layl: راهنمای نماز شب (مفاتیح‌الجنان، ۴۱۳ «کیفیت نماز شب»)؛ mahdi: گوشه امام زمان (عج)؛ qaza: حساب قضا؛
// ehda: یاد درگذشتگان؛ popsurahs: سوره‌ها و آیه‌های پرکاربرد؛ events: برنامه جلسات؛ convert: تبدیل تاریخ؛ backup: پشتیبان و انتقال؛
// adminCards: کارت‌های «یاد درگذشتگان» و «برنامه جلسات» در مدیریت › تنظیمات.
// متن دعاها از همان فایل‌های مفاتیح سایت (books/mafatih، ترجمه استاد انصاریان) خوانده می‌شود، نه نوشته دوباره، تا با منبع یکی بماند.
(function () {
  const P = window.plus, C = window.contentPlus, D = window.daily;
  const { toFa, esc, read, write, HM, WD } = P;
  const shown = id => !!window.features?.shown(id);
  const go = g => C ? C.go(g) : null;
  const digits = s => String(s ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  // متن مفاتیح «ی» و «ک» فارسی دارد که در قلم عربی سایت نیست (مثل ramadan.js)
  const arabic = t => String(t).replace(/ک/g, 'ك').replace(/ی(?=[ً-ْٰ]*(?:[^؀-ۿ]|$))/g, 'ى').replace(/ی/g, 'ي');
  const getJson = (() => { const memo = {}; return f => memo[f] || (memo[f] = fetch(f).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { delete memo[f]; throw e; })); })();
  const buzz = ms => { try { navigator.vibrate?.(ms); } catch {} };

  const css = `
.pxs-shade{position:fixed;inset:0;z-index:47;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.pxs-box{width:100%;max-width:600px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 16px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:pxsup .25s ease;line-height:1.8}
@keyframes pxsup{from{transform:translateY(40px);opacity:.4}}
@media(min-width:640px){.pxs-shade{align-items:center}.pxs-box{border-radius:var(--r-panel);border-bottom:2px solid var(--gold)}}
.pxs-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.pxs-box h2{margin:8px 0 0;text-align:center;font:normal 32px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.pxs-sub{margin:0 0 10px;text-align:center;color:var(--muted);font-size:15px}
.pxs-card{margin:10px 0;padding:10px 14px;background:#fff;border:1px solid var(--gold);border-radius:var(--r-card)}
.pxs-card h3{margin:0 0 4px;font-size:16.5px;color:var(--deep)}
.pxs-card p{margin:4px 0}
.pxs-note{font-size:14px;color:var(--muted);line-height:1.8}
.pxs-ar{margin:6px 0;font:normal 21px/2.1 ChlArabic,Vazirmatn,serif;color:var(--deep);text-align:center}
.pxs-fa{margin:2px 0 6px;font-size:15px;color:var(--ink);text-align:center}
.pxs-src{display:block;font-size:12.5px;color:var(--muted);text-align:center}
.pxs-go{display:flex;align-items:center;gap:10px;width:100%;height:auto;min-height:50px;margin:6px 0;padding:8px 12px;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:var(--r);text-align:right;white-space:normal;line-height:1.6;font-weight:500;font-size:15.5px}
.pxs-go:hover,.pxs-go:focus-visible{background:var(--hover)}
.pxs-go>i{flex:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--mint);font-style:normal;font-size:18px}
.pxs-go>span{flex:1;min-width:0}
.pxs-go small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.pxs-go>em{flex:none;font-style:normal;color:var(--muted)}
.pxs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:8px 0}
.pxs-grid .pxs-go{margin:0;min-height:58px}
.pxs-chk{display:flex;align-items:center;gap:10px;margin:0;padding:8px 6px;border-bottom:1px solid var(--line);cursor:pointer;font-weight:500}
.pxs-chk:last-child{border-bottom:0}
.pxs-chk input{flex:none;width:24px;height:24px;margin:0;accent-color:var(--emerald)}
.pxs-chk span{flex:1;min-width:0;line-height:1.6}
.pxs-chk small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.pxs-chk.done span{color:var(--muted);text-decoration:line-through;text-decoration-color:var(--gold)}
.pxs-chk .pxs-del{flex:none;width:36px;height:36px;padding:0;background:transparent;border:0;color:var(--muted);font-size:18px}
.pxs-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.pxs-row>input,.pxs-row>select,.pxs-row>textarea{flex:1 1 160px;min-width:0;height:46px;padding:0 10px;border:1px solid var(--line);border-radius:var(--r);background:#fff;color:var(--ink);font:inherit;font-size:16px}
.pxs-row>textarea{height:auto;min-height:90px;padding:8px 10px;line-height:1.8}
.pxs-row>button,.pxs-btn{flex:none;min-height:46px;height:auto;padding:0 16px;font-size:15px}
.pxs-btn2{background:#fff!important;color:var(--deep)!important;border:1px solid var(--gold)!important}
.pxs-days{display:flex;gap:4px;justify-content:center;margin:8px 0 0}
.pxs-days span{display:flex;flex-direction:column;align-items:center;font-size:12px;color:var(--muted)}
.pxs-days b{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:12px;color:var(--deep)}
.pxs-days b.full{background:var(--emerald);border-color:var(--emerald);color:#fff}
.pxs-days b.some{background:var(--mint)}
.pxs-big{text-align:center;font-size:15px;color:var(--muted)}
.pxs-big b{display:block;font-size:30px;color:var(--deep);line-height:1.5}
.pxs-steps{margin:0;padding:0;list-style:none}
.pxs-cnt{display:flex;align-items:center;gap:8px;margin:8px 0;padding:8px 10px;background:var(--cream);border:1px solid var(--line);border-radius:var(--r)}
.pxs-cnt>span{flex:1;min-width:0}
.pxs-cnt .pxs-ar{margin:0;font-size:19px;text-align:right}
.pxs-cnt small{display:block;color:var(--muted);font-size:13px}
.pxs-cnt button.pxs-tap{flex:none;min-width:86px;height:56px;padding:0 10px;font-size:18px;font-weight:700;border-radius:var(--r-card)}
.pxs-cnt button.pxs-tap.ok{background:var(--mint);color:var(--deep);border:1px solid var(--emerald)}
.pxs-cnt button.pxs-0{flex:none;width:36px;height:36px;padding:0;background:transparent;border:0;color:var(--muted);font-size:16px}
.pxs-q{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)}
.pxs-q:last-child{border-bottom:0}
.pxs-q b{font-weight:600;color:var(--deep)}
.pxs-q input{width:84px;height:44px;padding:0 6px;text-align:center;border:1px solid var(--line);border-radius:var(--r);font:inherit;font-size:17px;background:#fff;color:var(--ink)}
.pxs-q button{width:44px;height:44px;padding:0;font-size:22px;background:#fff;color:var(--deep);border:1px solid var(--gold)}
.pxs-names{margin:4px 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.pxs-names li{display:flex;align-items:center;gap:2px;padding:2px 12px;background:var(--cream);border:1px solid var(--line);border-radius:999px;font-size:15px}
.pxs-names li button{width:30px;height:30px;padding:0;background:transparent;border:0;color:var(--muted);font-size:14px}
.pxs-ev{margin:10px 0;padding:10px 14px;background:#fff;border:1px solid var(--gold);border-right:5px solid var(--gold);border-radius:var(--r-card)}
.pxs-ev h3{margin:0;font-size:17px;color:var(--deep)}
.pxs-ev p{margin:2px 0;font-size:15px}
.pxs-ev .pxs-row{margin:6px 0 0}
.pxs-seg{display:flex;gap:6px;margin:6px 0}
.pxs-seg button{flex:1 1 0;min-width:0;height:46px;padding:0 4px;background:#fff;color:var(--deep);border:1px solid var(--line);font-weight:600;font-size:15px}
.pxs-seg button.on{background:var(--emerald);border-color:var(--emerald);color:#fff}
.pxs-cv{display:grid;grid-template-columns:1.3fr 1.3fr 1fr;gap:6px}
.pxs-cv select{height:46px;padding:0 6px;border:1px solid var(--line);border-radius:var(--r);background:#fff;color:var(--ink);font:inherit;font-size:16px;min-width:0}
.pxs-res{margin:0;padding:0;list-style:none}
.pxs-res li{display:flex;justify-content:space-between;gap:8px;padding:8px 2px;border-bottom:1px solid var(--line)}
.pxs-res li:last-child{border-bottom:0}
.pxs-res li span{color:var(--muted)}
.pxs-res li b{color:var(--deep);text-align:left}
.pxs-msg{min-height:1.6em;margin:6px 0 0;text-align:center;font-weight:600;color:var(--deep)}
.pxs-msg.bad{color:var(--danger,#b3261e)}
body.pxs-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- قاب برگه ----------
  let shade = null, onClose = null;
  function open(title, sub, html, after) {
    close();
    shade = document.createElement('div'); shade.className = 'pxs-shade';
    shade.innerHTML = `<div class="pxs-box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button type="button" class="pxs-x" aria-label="بستن">✕</button><h2>${esc(title)}</h2>${sub ? `<p class="pxs-sub">${esc(sub)}</p>` : ''}<div class="pxs-body">${html}</div></div>`;
    shade.addEventListener('click', e => {
      if (e.target === shade || e.target.closest('.pxs-x')) return close();
      const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
      const a = e.target.closest('[data-ay]'); if (a) { const [s, x, y] = a.dataset.ay.split(',').map(Number); C?.openAyahs(s, x || 0, y || 0, a.dataset.t, a.dataset.sub || ''); }
    });
    document.body.appendChild(shade); document.body.classList.add('pxs-lock');
    shade.querySelector('.pxs-x').focus({ preventScroll: true });
    onClose = after || null;
    return shade.querySelector('.pxs-body');
  }
  function close() {
    if (shade) { shade.remove(); shade = null; }
    document.body.classList.remove('pxs-lock');
    if (onClose) { const f = onClose; onClose = null; try { f(); } catch {} }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade && !document.querySelector('.qr.show,.cr.show')) close(); });
  const goBtn = (attr, ic, t, s) => `<button type="button" class="pxs-go" ${attr}><i aria-hidden="true">${ic}</i><span>${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</span><em aria-hidden="true">‹</em></button>`;
  const mfOk = () => !!window.mafatih?.openKey && shown('mafatih');
  const mfBtn = (k, ic, t, s) => mfOk() ? goBtn(`data-go="mf:${k}"`, ic, t, s || 'مفاتیح‌الجنان') : '';
  const changed = () => P.refresh();

  // ---------- برنامه عبادی روزانه ----------
  function wird() {
    const W = () => P.wird() || { on: P.WDEF.slice(), custom: [], done: {} };
    const save = w => { // فقط ۶۰ روز آخر نگه داشته می‌شود
      const keys = Object.keys(w.done).sort().slice(-60); w.done = Object.fromEntries(keys.map(k => [k, w.done[k]]));
      write('wird', w); changed();
    };
    let editing = false;
    const body = open('برنامه عبادی روزانه', 'کارهای خیر هر روز را تیک بزنید؛ فقط روی همین گوشی است و کسی آن را نمی‌بیند.', '');
    const all = w => [...P.WIRD.filter(x => w.on.includes(x[0])).map(([id, ic, t]) => ({ id, ic, t })), ...w.custom.map(c => ({ id: c.id, ic: '⭐', t: c.t, custom: 1 }))];
    function paint() {
      const w = W(), iso = P.todayIso(), done = w.done[iso] || [], list = all(w), n = list.filter(x => done.includes(x.id)).length;
      // هفت روز اخیر و روزهای پیوسته‌ای که همه کارها انجام شده
      const day = i => D ? D.addDays(iso, -i) : iso;
      const rate = d => { const x = (w.done[d] || []).filter(id => list.some(l => l.id === id)).length; return list.length ? x / list.length : 0; };
      let streak = 0; for (let i = rate(iso) === 1 ? 0 : 1; i < 60 && rate(day(i)) === 1; i++) streak++;
      const week = [6, 5, 4, 3, 2, 1, 0].map(i => { const d = day(i), r = rate(d); return `<span><b class="${r === 1 ? 'full' : r > 0 ? 'some' : ''}">${r === 1 ? '✓' : toFa(Math.round(r * 100))}</b>${esc(WD[new Date(d + 'T12:00:00Z').getUTCDay()].slice(0, 1))}</span>`; }).join('');
      if (editing) {
        body.innerHTML = `<div class="pxs-card"><h3>کارهای برنامه من</h3>${P.WIRD.map(([id, ic, t]) => `<label class="pxs-chk"><input type="checkbox" data-w-on="${id}"${w.on.includes(id) ? ' checked' : ''}><span>${ic} ${esc(t)}</span></label>`).join('')}
${w.custom.map(c => `<div class="pxs-chk"><span>⭐ ${esc(c.t)}</span><button type="button" class="pxs-del" data-w-del="${esc(c.id)}" aria-label="حذف ${esc(c.t)}">✕</button></div>`).join('')}
<div class="pxs-row"><input type="text" maxlength="60" placeholder="کار دلخواه، مثلاً «سوره واقعه»" aria-label="کار دلخواه" data-w-new><button type="button" data-w-add>افزودن</button></div></div>
<div class="pxs-row"><button type="button" class="pxs-btn" data-w-edit style="flex:1">✓ تمام</button></div>`;
        return;
      }
      body.innerHTML = `<div class="pxs-card"><p class="pxs-big"><b>${toFa(n)} از ${toFa(list.length)}</b>${n === list.length && n ? 'همه کارهای امروز انجام شد؛ قبول باشد' : 'کارهای امروز'}</p>
${list.map(x => `<label class="pxs-chk${done.includes(x.id) ? ' done' : ''}"><input type="checkbox" data-w-done="${esc(x.id)}"${done.includes(x.id) ? ' checked' : ''}><span>${x.ic} ${esc(x.t)}</span></label>`).join('') || '<p class="pxs-note">هیچ کاری انتخاب نشده؛ «تغییر کارها» را بزنید.</p>'}
<div class="pxs-days" aria-label="هفت روز اخیر">${week}</div>${streak > 1 ? `<p class="pxs-note" style="text-align:center">🔥 ${toFa(streak)} روز پیوسته همه کارها انجام شده</p>` : ''}</div>
<div class="pxs-row"><button type="button" class="pxs-btn pxs-btn2" data-w-edit style="flex:1">✎ تغییر کارها</button></div>
<p class="pxs-note">روز با تاریخ شهرِ کارت «امروز» عوض می‌شود. یادتان باشد که این برنامه برای یادآوری خود شماست، نه شمردن عمل.</p>`;
    }
    body.addEventListener('change', e => {
      const w = W(), t = e.target, iso = P.todayIso();
      if (t.dataset.wDone) { const d = new Set(w.done[iso] || []); t.checked ? d.add(t.dataset.wDone) : d.delete(t.dataset.wDone); w.done[iso] = [...d]; if (t.checked) buzz(20); save(w); paint(); }
      else if (t.dataset.wOn) { w.on = P.WIRD.map(x => x[0]).filter(id => id === t.dataset.wOn ? t.checked : w.on.includes(id)); save(w); }
    });
    body.addEventListener('click', e => {
      const w = W();
      if (e.target.closest('[data-w-edit]')) { if (!P.wird()) save(w); editing = !editing; return paint(); }
      const del = e.target.closest('[data-w-del]'); if (del) { w.custom = w.custom.filter(c => c.id !== del.dataset.wDel); save(w); return paint(); }
      if (e.target.closest('[data-w-add]')) {
        const inp = body.querySelector('[data-w-new]'), t = inp.value.trim(); if (!t) return inp.focus();
        w.custom.push({ id: 'c' + Date.now().toString(36), t: t.slice(0, 60) }); save(w); paint(); body.querySelector('[data-w-new]')?.focus();
      }
    });
    body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-w-new]')) { e.preventDefault(); body.querySelector('[data-w-add]').click(); } });
    paint();
  }

  // ---------- شمارنده (قنوت وتر) ----------
  function counter(id, ar, fa, target, store) {
    const n = store[id] || 0;
    return `<div class="pxs-cnt"><span><p class="pxs-ar">${ar}</p><small>${esc(fa)}، ${toFa(target)} مرتبه</small></span><button type="button" class="pxs-0" data-c0="${id}" aria-label="از اول">↺</button><button type="button" class="pxs-tap${n >= target ? ' ok' : ''}" data-c="${id}" data-tg="${target}" aria-label="شمردن، ${toFa(n)} از ${toFa(target)}">${n >= target ? '✓ ' : ''}${toFa(n)}</button></div>`;
  }

  // ---------- راهنمای نماز شب ----------
  // از مفاتیح‌الجنان (۴۱۳، «کیفیت نماز شب»): ابتدای وقت نیمه‌شب است و هرچه به طلوع صبح صادق نزدیک‌تر بهتر؛ هشت رکعت دو رکعت دو رکعت،
  // سپس دو رکعت شفع و یک رکعت وتر. در قنوت وتر: هفتاد استغفار، هفت «هذا مقام العائذ بک من النار»، سیصد «العفو» و دعا برای چهل مؤمن.
  function layl() {
    const KEY = 'laylState', st = () => { const s = read(KEY, {}); return s && s.night === night() ? s : { night: night(), steps: [], c: {} }; };
    // شب با «اذان صبح بعدی» شناخته می‌شود تا پس از نیمه‌شب هم همان شب بماند
    function night() { if (!D) return ''; const L = D.loc(), now = D.clock(L.tz), iso = D.ymd(now, L.tz), T = D.times(iso, L); return now < T.fajr ? iso : D.addDays(iso, 1); }
    const STEPS = [['n1', 'دو رکعت اول نماز شب'], ['n2', 'دو رکعت دوم'], ['n3', 'دو رکعت سوم'], ['n4', 'دو رکعت چهارم'], ['shaf', 'دو رکعت نماز شفع'], ['witr', 'یک رکعت نماز وتر، با قنوت']];
    const body = open('راهنمای نماز شب', 'یازده رکعت، به ترتیب مفاتیح‌الجنان', '');
    function times() {
      if (!D) return '';
      const L = D.loc(), now = D.clock(L.tz), iso = D.ymd(now, L.tz), T = D.times(iso, L);
      const [mid, fajr] = now < T.fajr ? [T.prevMid, T.fajr] : [T.mid, T.nextFajr];
      const inTime = now >= mid && now < fajr;
      return `<div class="pxs-card"><h3>🕰️ وقت امشب (${esc(L.short || L.name)})</h3><p>از نیمه‌شب شرعی <b>${D.hm(mid, L.tz)}</b> تا اذان صبح <b>${D.hm(fajr, L.tz)}</b>${inTime ? `؛ اکنون وقت است و <b>${D.dur(fajr - now)}</b> مانده.` : '.'}</p><p class="pxs-note">«ابتدای وقت آن نیمه‌شب است، و هرچه به طلوع صبح صادق نزدیک‌تر شود، بهتر است.» (مفاتیح‌الجنان)</p></div>`;
    }
    function paint() {
      const s = st(), names = read('laylNames', []).filter(x => typeof x === 'string');
      body.innerHTML = `${times()}
<div class="pxs-card"><h3>رکعت‌ها</h3><p class="pxs-note">پس از هر دو رکعت سلام داده می‌شود. در هر رکعت «حمد» و هر سوره‌ای که بخواهید کافی است و «حمد» تنها هم جایز است؛ در قنوت، سه مرتبه «سبحان‌الله» کفایت می‌کند.</p>
${STEPS.map(([id, t]) => `<label class="pxs-chk${s.steps.includes(id) ? ' done' : ''}"><input type="checkbox" data-l-step="${id}"${s.steps.includes(id) ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}
<p class="pxs-note">در شفع و وتر پس از «حمد» سوره «توحید» خوانده می‌شود؛ یا در شفع رکعت اول «ناس» و رکعت دوم «فلق»، و در وتر «توحید» سه مرتبه و «فلق» و «ناس».</p></div>
<div class="pxs-card"><h3>قنوت نماز وتر</h3><p class="pxs-note">همه مستحب است؛ هر قدر توانستید. استغفار را می‌شود با دست راست شمرد و دست چپ را به دعا برداشت.</p>
${counter('istighfar', 'أَسْتَغْفِرُ اللهَ رَبِّي وَأَتُوبُ إِلَيْهِ', 'از خدا آمرزش می‌خواهم و به سوی او بازمی‌گردم', 70, s.c)}
${counter('aez', 'هٰذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ', 'این است جایگاه پناه‌برنده به تو از آتش', 7, s.c)}
${counter('afw', 'الْعَفْوَ', 'گذشت، گذشت', 300, s.c)}
<p><b>دعا برای چهل مؤمن</b> <small class="pxs-note">(${toFa(names.length)} از ۴۰ نام)</small></p>
<ul class="pxs-names">${names.map((x, i) => `<li>${esc(x)}<button type="button" data-l-del="${i}" aria-label="حذف ${esc(x)}">✕</button></li>`).join('')}</ul>
${names.length < 40 ? '<div class="pxs-row"><input type="text" maxlength="40" placeholder="نام یک مؤمن" aria-label="نام یک مؤمن" data-l-new><button type="button" data-l-add>افزودن</button></div>' : ''}
<p class="pxs-note">فهرست نام‌ها فقط روی همین گوشی می‌ماند.</p></div>
<div class="pxs-card"><h3>پس از نماز</h3>
${window.zekr ? goBtn('data-l-zahra', '📿', 'تسبیحات حضرت زهرا (س)', 'با ذکرشمار') : ''}
${mfBtn('670', '🤲', 'دعای حزین', 'پس از نماز شب؛ مفاتیح‌الجنان')}
${mfBtn('413', '📖', 'متن کامل «کیفیت نماز شب»', 'دعاهای برخاستن، پنج آیه آل‌عمران و قنوت')}
${mfBtn('650', '✨', 'فضیلت نماز شب', 'مفاتیح‌الجنان')}
${goBtn('data-ay="3,190,194" data-t="پنج آیه آخر سوره آل‌عمران" data-sub="هنگام برخاستن برای نماز شب"', '🌙', 'پنج آیه آخر آل‌عمران', 'هنگام برخاستن، به سفارش مفاتیح')}</div>
<p class="pxs-note">نیت و احکام نماز را از رساله مرجع تقلید خود ببینید. تیک‌ها و شمارش‌ها فقط برای همین شب روی همین گوشی است.</p>`;
    }
    body.addEventListener('change', e => {
      const id = e.target.dataset.lStep; if (!id) return;
      const s = st(), x = new Set(s.steps); e.target.checked ? x.add(id) : x.delete(id); s.steps = [...x]; write(KEY, s); paint();
    });
    body.addEventListener('click', e => {
      const s = st(), c = e.target.closest('[data-c]');
      if (c) { const id = c.dataset.c, tg = +c.dataset.tg; s.c[id] = (s.c[id] || 0) + 1; write(KEY, s); buzz(s.c[id] === tg ? [60, 60, 60] : 12); const y = body.parentElement.scrollTop; paint(); body.parentElement.scrollTop = y; body.querySelector(`[data-c="${id}"]`)?.focus(); return; }
      const z = e.target.closest('[data-c0]'); if (z) { s.c[z.dataset.c0] = 0; write(KEY, s); const y = body.parentElement.scrollTop; paint(); body.parentElement.scrollTop = y; return; }
      if (e.target.closest('[data-l-zahra]')) return window.zekr?.open('zahra');
      const del = e.target.closest('[data-l-del]'); if (del) { const n = read('laylNames', []); n.splice(+del.dataset.lDel, 1); write('laylNames', n); return paint(); }
      if (e.target.closest('[data-l-add]')) {
        const inp = body.querySelector('[data-l-new]'), t = inp.value.trim(); if (!t) return inp.focus();
        const n = read('laylNames', []); n.push(t.slice(0, 40)); write('laylNames', n.slice(0, 40)); paint(); body.querySelector('[data-l-new]')?.focus();
      }
    });
    body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-l-new]')) { e.preventDefault(); body.querySelector('[data-l-add]').click(); } });
    paint();
  }

  // ---------- گوشه امام زمان (عج) ----------
  async function mahdi() {
    const body = open('گوشه امام زمان (عج)', 'دعاها و زیارت‌های حضرت ولی‌عصر (عج)، از مفاتیح‌الجنان', '<p class="pxs-note" style="text-align:center">در حال بارگذاری…</p>');
    let sal = '', faraj = '';
    try {
      const [a, b] = await Promise.all([getJson('books/mafatih/143.json'), getJson('books/mafatih/064.json')]);
      const s1 = a.sections[1], s3 = a.sections[3], f = b.sections[1];
      if (s1?.ar && s3?.ar) sal = `<p class="pxs-ar">${esc(arabic(s1.ar.replace(/\s*فُلانِ\s*بن\s*فُلان\s*$/, '') + ' ' + s3.ar))}</p><p class="pxs-fa">${esc(s1.fa.replace(/\s*فلان بن فلان\s*$/, '') + ' ' + s3.fa)}</p>`;
      if (f?.ar) faraj = `<p class="pxs-ar">${esc(arabic(f.ar))}</p><p class="pxs-fa">${esc(f.fa || '')}</p>`;
    } catch {}
    if (!shade) return;
    body.innerHTML = `${sal ? `<div class="pxs-card"><h3>🌟 دعای سلامتی امام زمان (عج)</h3>${sal}<span class="pxs-src">مفاتیح‌الجنان، اعمال شب بیست‌وسوم ماه رمضان؛ ترجمه استاد انصاریان</span></div>` : ''}
${faraj ? `<details class="pxs-card"><summary><b>🤲 دعای فرج «إلهي عَظُمَ البَلاء»</b></summary>${faraj}<span class="pxs-src">مفاتیح‌الجنان، دعای فرج امام زمان (عج)؛ ترجمه استاد انصاریان</span></details>` : ''}
${goBtn('data-go="rd:ahd"', '🌅', 'دعای عهد', 'هر صبح؛ با صوت')}
${goBtn('data-go="rd:alyasin"', '🕌', 'زیارت آل‌یاسین', 'با صوت')}
${mfBtn('336', '🌄', 'دعای ندبه', 'صبح جمعه و عیدها')}
${mfBtn('039', '🕌', 'زیارت امام زمان (عج) در روز جمعه', 'مفاتیح‌الجنان')}
${mfBtn('335', '💚', 'صلوات بر آن حضرت', 'مفاتیح‌الجنان')}
${mfBtn('067', '🙏', 'استغاثه به امام زمان (عج)', 'مفاتیح‌الجنان')}
${mfBtn('026', '🧎', 'نماز امام زمان (عج) و دعای آن', 'مفاتیح‌الجنان')}
${window.zekr ? goBtn('data-m-sal', '📿', 'صلوات با ذکرشمار', 'اللّهُمَّ صَلِّ عَلَی مُحَمَّدٍ وَ آلِ مُحَمَّد') : ''}`;
    body.addEventListener('click', e => { if (e.target.closest('[data-m-sal]')) window.zekr?.open('salavat'); });
  }

  // ---------- حساب قضا ----------
  const QK = [['fajr', 'نماز صبح'], ['dhuhr', 'نماز ظهر'], ['asr', 'نماز عصر'], ['maghrib', 'نماز مغرب'], ['isha', 'نماز عشا'], ['fast', 'روزه']];
  function qaza() {
    const Q = () => Object.assign({ per: 1, paid: 0 }, read('qaza', {}));
    const body = open('حساب نماز و روزه قضا', 'دفتر شخصی روی همین گوشی؛ کسی جز شما آن را نمی‌بیند.', '');
    const num = v => Math.max(0, Math.min(99999, parseInt(digits(v), 10) || 0));
    function paint(focus) {
      const q = Q(), pr = QK.slice(0, 5), left = pr.reduce((a, [k]) => a + (q[k] || 0), 0), maxDays = Math.max(0, ...pr.map(([k]) => q[k] || 0));
      const days = Math.ceil(maxDays / q.per);
      let end = ''; if (days && D) { const L = D.loc(), iso = D.addDays(D.ymd(D.clock(L.tz), L.tz), days); end = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00Z')); }
      body.innerHTML = `<div class="pxs-card"><p class="pxs-big"><b>${toFa(left)}</b>نماز قضا مانده${q.fast ? ` · ${toFa(q.fast)} روز روزه` : ''}</p>
${QK.map(([k, t]) => `<div class="pxs-q"><b>${t}</b><button type="button" data-q="${k}" data-d="-1" aria-label="یکی کمتر ${t}">−</button><input inputmode="numeric" value="${toFa(q[k] || 0)}" data-qi="${k}" aria-label="شمار ${t}"><button type="button" data-q="${k}" data-d="1" aria-label="یکی بیشتر ${t}">+</button></div>`).join('')}</div>
<div class="pxs-card"><h3>ادا کردن</h3><div class="pxs-row"><button type="button" class="pxs-btn" data-q-day style="flex:1"${left ? '' : ' disabled'}>✓ یک روز کامل (پنج نماز) خواندم</button></div>
<div class="pxs-row"><span style="flex:1">هر روز چند روز نماز قضا می‌خوانم؟</span><select data-q-per aria-label="برنامه روزانه">${[1, 2, 3, 4, 5, 7, 10].map(n => `<option value="${n}"${q.per === n ? ' selected' : ''}>${toFa(n)} روز</option>`).join('')}</select></div>
${days ? `<p>با این برنامه حدود <b>${toFa(days)} روز</b> دیگر تمام می‌شود${end ? `؛ یعنی ${esc(end)}` : ''}.</p>` : left ? '' : '<p>نماز قضایی ثبت نشده است.</p>'}
${q.paid ? `<p class="pxs-note">تا حالا ${toFa(q.paid)} نماز قضا با این دفتر ادا شده؛ قبول باشد.</p>` : ''}</div>
<p class="pxs-note">این فقط یک دفتر یادداشت است. احکام قضا (ترتیب نمازها، کفاره و فدیه روزه و…) را از رساله مرجع تقلید خود بپرسید.</p>`;
      if (focus) body.querySelector(focus)?.focus();
    }
    const save = q => { write('qaza', q); changed(); };
    body.addEventListener('click', e => {
      const q = Q(), b = e.target.closest('[data-q]');
      if (b) { const k = b.dataset.q, d = +b.dataset.d, was = q[k] || 0; q[k] = Math.max(0, was + d); if (d < 0 && was > 0 && k !== 'fast') q.paid = (q.paid || 0) + 1; save(q); return paint(`[data-q="${k}"][data-d="${d}"]`); }
      if (e.target.closest('[data-q-day]')) { QK.slice(0, 5).forEach(([k]) => { if (q[k] > 0) { q[k]--; q.paid = (q.paid || 0) + 1; } }); buzz(40); save(q); paint('[data-q-day]'); }
    });
    body.addEventListener('change', e => {
      const q = Q();
      if (e.target.dataset.qi) { q[e.target.dataset.qi] = num(e.target.value); save(q); paint(); }
      if (e.target.matches('[data-q-per]')) { q.per = +e.target.value || 1; save(q); paint('[data-q-per]'); }
    });
    paint();
  }

  // ---------- یاد درگذشتگان ----------
  function ehda() {
    const body = open('یاد درگذشتگان', 'شادی روح درگذشتگان را با فاتحه و صلوات یاد کنیم', '');
    function paint() {
      const c = P.ehdaConf(), mine = P.myEhda();
      body.innerHTML = `${c.note ? `<div class="pxs-card"><p>${esc(c.note)}</p></div>` : ''}
${c.names.length ? `<div class="pxs-card"><h3>🕯️ درگذشتگان اعضای نوران</h3><ul class="pxs-names">${c.names.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
<div class="pxs-card"><h3>عزیزان من</h3><p class="pxs-note">فقط روی همین گوشی؛ پنجشنبه‌ها همین‌جا یادتان می‌آید.</p><ul class="pxs-names">${mine.map((n, i) => `<li>${esc(n)}<button type="button" data-e-del="${i}" aria-label="حذف ${esc(n)}">✕</button></li>`).join('')}</ul>
<div class="pxs-row"><input type="text" maxlength="60" placeholder="نام، مثلاً «پدرم، مرحوم …»" aria-label="نام درگذشته" data-e-new><button type="button" data-e-add>افزودن</button></div></div>
<div class="pxs-card"><h3>خواندنی‌ها</h3>
${goBtn('data-ay="1,0,0" data-t="سوره حمد" data-sub="به نیت شادی روح درگذشتگان"', '📖', 'سوره حمد (فاتحه)', '')}
${goBtn('data-ay="112,0,0" data-t="سوره توحید" data-sub="به نیت شادی روح درگذشتگان"', '📖', 'سوره توحید', '')}
${goBtn('data-ay="36,0,0" data-t="سوره یس" data-sub="به نیت شادی روح درگذشتگان"', '📗', 'سوره یس', '')}
${mfBtn('355', '🕊️', 'زیارت اهل قبور', 'دعا هنگام زیارت قبور مؤمنان')}
${mfBtn('624', '🤲', 'دعا برای میت', 'مفاتیح‌الجنان')}
${mfBtn('441', '💚', 'خیرات برای اموات', 'مفاتیح‌الجنان')}
${mfBtn('442', '🧎', 'نماز برای والدین و اموات', 'مفاتیح‌الجنان')}</div>`;
    }
    body.addEventListener('click', e => {
      const del = e.target.closest('[data-e-del]'); if (del) { const m = P.myEhda(); m.splice(+del.dataset.eDel, 1); write('ehdaMine', m); changed(); return paint(); }
      if (e.target.closest('[data-e-add]')) {
        const inp = body.querySelector('[data-e-new]'), t = inp.value.trim(); if (!t) return inp.focus();
        write('ehdaMine', [...P.myEhda(), t.slice(0, 60)].slice(0, 50)); changed(); paint(); body.querySelector('[data-e-new]')?.focus();
      }
    });
    body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-e-new]')) { e.preventDefault(); body.querySelector('[data-e-add]').click(); } });
    paint();
  }

  // ---------- سوره‌ها و آیه‌های پرکاربرد ----------
  // [سوره، از آیه، تا آیه (۰: کل سوره)، عنوان، توضیح]
  const POP = [
    [36, 0, 0, 'یس', 'قلب قرآن'], [55, 0, 0, 'الرحمن', '۷۸ آیه'], [56, 0, 0, 'واقعه', '۹۶ آیه'], [67, 0, 0, 'ملک', '۳۰ آیه'],
    [18, 0, 0, 'کهف', 'شب و روز جمعه'], [62, 0, 0, 'جمعه', '۱۱ آیه'], [78, 0, 0, 'نبأ', '۴۰ آیه'], [44, 0, 0, 'دخان', '۵۹ آیه'],
    [32, 0, 0, 'سجده', '۳۰ آیه'], [48, 0, 0, 'فتح', '۲۹ آیه'], [97, 0, 0, 'قدر', '۵ آیه'], [1, 0, 0, 'حمد', '۷ آیه'],
    [112, 0, 0, 'توحید', '۴ آیه'], [113, 0, 0, 'فلق', '۵ آیه'], [114, 0, 0, 'ناس', '۶ آیه'], [109, 0, 0, 'کافرون', '۶ آیه'],
    [2, 255, 257, 'آیة‌الکرسی', 'بقره ۲۵۵ تا ۲۵۷'], [2, 285, 286, 'آمن الرسول', 'دو آیه آخر بقره'], [59, 21, 24, 'آیه‌های آخر حشر', 'حشر ۲۱ تا ۲۴'],
    [3, 190, 194, 'پنج آیه آخر آل‌عمران', 'هنگام نماز شب'], [24, 35, 35, 'آیه نور', 'نور ۳۵'], [21, 87, 88, 'ذکر یونسیه', 'انبیاء ۸۷ و ۸۸'], [68, 51, 52, 'وَإِن یَکاد', 'قلم ۵۱ و ۵۲']
  ];
  function popsurahs() {
    open('سوره‌ها و آیه‌های پرکاربرد', 'با یک لمس، در قرآن‌خوان سایت با ترجمه و صوت', `<div class="pxs-grid">${POP.map(([s, a, b, t, d]) => goBtn(`data-ay="${s},${a},${b}" data-t="${esc(a ? t : 'سوره ' + t)}" data-sub="${esc(d)}"`, a ? '✨' : '📖', a ? t : 'سوره ' + t, d)).join('')}</div>`);
  }

  // ---------- برنامه جلسات ----------
  const shamsi = (ms, o) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', Object.assign({ timeZone: 'Asia/Tehran' }, o)).format(new Date(ms));
  const safeUrl = u => /^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : '';
  function ics(e) {
    const t = P.tehranMs(e.at), f = ms => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const x = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nooran//FA', 'BEGIN:VEVENT', `UID:${e.id || t}@hezbkhani.github.io`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(t)}`, `DTEND:${f(t + 36e5)}`,
      `SUMMARY:${x(e.t)}`, e.place ? `LOCATION:${x(e.place)}` : '', `DESCRIPTION:${x([e.note, safeUrl(e.link)].filter(Boolean).join('\n'))}`, safeUrl(e.link) ? `URL:${safeUrl(e.link)}` : '',
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${x(e.t)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })); a.download = 'nooran-event.ics';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function events() {
    const list = P.events();
    const body = open('برنامه جلسات', 'به وقت تهران', list.length ? list.map((e, i) => {
      const t = P.tehranMs(e.at), link = safeUrl(e.link);
      return `<div class="pxs-ev"><h3>${esc(e.t)}</h3><p>📅 ${esc(shamsi(t, { weekday: 'long', day: 'numeric', month: 'long' }))}، ساعت ${esc(shamsi(t, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }))}</p>${e.place ? `<p>📍 ${esc(e.place)}</p>` : ''}${e.note ? `<p class="pxs-note">${esc(e.note)}</p>` : ''}
<div class="pxs-row">${link ? `<a class="pxs-go" style="flex:1;margin:0" href="${esc(link)}" target="_blank" rel="noopener"><i aria-hidden="true">🔗</i><span>ورود به جلسه یا نقشه</span></a>` : ''}<button type="button" class="pxs-btn pxs-btn2" data-ev="${i}">📆 افزودن به تقویم گوشی</button></div></div>`;
    }).join('') : '<p class="pxs-note" style="text-align:center">فعلاً جلسه‌ای در برنامه نیست.</p>');
    body.addEventListener('click', e => { const b = e.target.closest('[data-ev]'); if (b) ics(list[+b.dataset.ev]); });
  }

  // ---------- تبدیل تاریخ ----------
  const CAL = {
    sh: { n: 'شمسی', loc: 'en-u-ca-persian-nu-latn', months: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'], ys: [1300, 1450] },
    hq: { n: 'قمری', months: HM, ys: [1340, 1490] },
    gr: { n: 'میلادی', months: ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'], ys: [1920, 2070] }
  };
  const isoAdd = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  // تاریخ میلادی ← { y, m, d } در هر تقویم؛ قمری همان تقویم سایت (رسمی ایران با جابه‌جایی مدیر)
  function parts(iso, cal) {
    if (cal === 'gr') { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; }
    if (cal === 'hq') return window.ibadat?.hijri?.(iso) || null;
    const p = new Intl.DateTimeFormat(CAL.sh.loc, { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(iso + 'T12:00:00Z')), g = t => +p.find(x => x.type === t).value;
    return { y: g('year'), m: g('month'), d: g('day') };
  }
  // { y, m, d } در یک تقویم ← تاریخ میلادی (حدس نزدیک و جستجو در ±۶۰ روز)؛ null اگر چنین روزی نیست
  function toIso(cal, y, m, d) {
    if (cal === 'gr') { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCMonth() === m - 1 ? t.toISOString().slice(0, 10) : null; }
    const guess = cal === 'sh' ? Date.UTC(y + 621, 2, 21) + ((m - 1) * 30.4 + d - 1) * 864e5 : (1948439.5 + (y - 1) * 354.367 + (m - 1) * 29.53 + d - 2440587.5) * 864e5;
    const g0 = new Date(guess).toISOString().slice(0, 10);
    for (let i = 0; i <= 60; i++) for (const s of i ? [i, -i] : [0]) { const iso = isoAdd(g0, s), p = parts(iso, cal); if (p && p.y === y && p.m === m && p.d === d) return iso; }
    return null;
  }
  function convert() {
    let from = 'sh', cur = parts(P.todayIso(), 'sh');
    const body = open('تبدیل تاریخ', 'تاریخ را در یک تقویم انتخاب کنید', '');
    function paint() {
      const c = CAL[from], iso = toIso(from, cur.y, cur.m, cur.d);
      const label = cal => { const p = iso && parts(iso, cal); return p ? `${toFa(p.d)} ${CAL[cal].months[p.m - 1]} ${toFa(p.y)}` : '—'; };
      body.innerHTML = `<div class="pxs-seg" role="group" aria-label="تقویم">${Object.entries(CAL).map(([k, v]) => `<button type="button" data-cv-from="${k}" class="${k === from ? 'on' : ''}" aria-pressed="${k === from}">${v.n}</button>`).join('')}</div>
<div class="pxs-cv"><select data-cv="d" aria-label="روز">${Array.from({ length: from === 'hq' ? 30 : 31 }, (_, i) => `<option value="${i + 1}"${cur.d === i + 1 ? ' selected' : ''}>${toFa(i + 1)}</option>`).join('')}</select>
<select data-cv="m" aria-label="ماه">${c.months.map((n, i) => `<option value="${i + 1}"${cur.m === i + 1 ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
<select data-cv="y" aria-label="سال">${Array.from({ length: c.ys[1] - c.ys[0] + 1 }, (_, i) => c.ys[0] + i).map(y => `<option value="${y}"${cur.y === y ? ' selected' : ''}>${toFa(y)}</option>`).join('')}</select></div>
<div class="pxs-card">${iso ? `<ul class="pxs-res"><li><span>روز هفته</span><b>${WD[new Date(iso + 'T12:00:00Z').getUTCDay()]}</b></li>${['sh', 'hq', 'gr'].map(k => `<li><span>${CAL[k].n}</span><b>${esc(label(k))}</b></li>`).join('')}</ul>` : '<p class="pxs-msg bad">این روز در این ماه نیست.</p>'}</div>
<div class="pxs-row"><button type="button" class="pxs-btn pxs-btn2" data-cv-today style="flex:1">امروز</button></div>
<p class="pxs-note">تاریخ قمری مطابق تقویم رسمی ایران است و ممکن است با رؤیت هلال یک روز جابه‌جا شود.</p>`;
    }
    body.addEventListener('click', e => {
      const f = e.target.closest('[data-cv-from]');
      if (f) { const iso = toIso(from, cur.y, cur.m, cur.d) || P.todayIso(); from = f.dataset.cvFrom; cur = parts(iso, from) || cur; return paint(); }
      if (e.target.closest('[data-cv-today]')) { cur = parts(P.todayIso(), from); paint(); }
    });
    body.addEventListener('change', e => { const k = e.target.dataset.cv; if (k) { cur = { ...cur, [k]: +e.target.value }; paint(); body.querySelector(`[data-cv="${k}"]`)?.focus(); } });
    paint();
  }

  // ---------- پشتیبان و انتقال ----------
  // فقط داده‌های شخصی خود کاربر؛ ورود به حساب، مدیر، شناسه دستگاه‌ها و حافظه‌های موقت منتقل نمی‌شوند.
  const KEEP = ['me', 'reportedDays', 'regCodes', 'chlCodes', 'chlName', 'chlEmail', 'zekrState', 'zekrStats', 'khatmIds', 'khatmName', 'readPlan', 'nmDays',
    'prayerLoc', 'qrSaved', 'qrPlus', 'quranFree', 'quranReader', 'chlReader', 'bookReader', 'bookLast', 'mafatihLast', 'duaFav', 'crPos', 'comfort', 'featHide',
    'secHide', 'bgPick', 'bgMine', 'audioPrefs', 'autoScroll', 'lastRead', 'menuRecent', 'searchRecent', 'wird', 'qaza', 'ehdaMine', 'laylNames', 'lite'];
  function backup() {
    const body = open('پشتیبان و انتقال', 'برای گوشی تازه یا پس از پاک شدن مرورگر', '');
    const have = () => KEEP.filter(k => { try { return localStorage.getItem(k) != null; } catch { return false; } });
    function paint(msg, bad) {
      body.innerHTML = `<div class="pxs-card"><h3>💾 ذخیره فایل پشتیبان</h3><p class="pxs-note">نشانه‌ها و یادداشت‌های قرآن، دعاهای منتخب، ذکرها، ختم‌ها و برنامه‌ها، کدهای ثبت‌نام و چله، شهر اوقات شرعی و تنظیمات نمایش در یک فایل کوچک ذخیره می‌شوند (${toFa(have().length)} مورد). رمز حساب کاربری در فایل نیست.</p>
<div class="pxs-row"><button type="button" class="pxs-btn" data-b-save style="flex:1">ذخیره فایل</button>${navigator.canShare ? '<button type="button" class="pxs-btn pxs-btn2" data-b-share style="flex:1">فرستادن به خودم</button>' : ''}</div></div>
<div class="pxs-card"><h3>📥 بازگرداندن از فایل</h3><p class="pxs-note">فایل پشتیبان نوران را انتخاب کنید. داده‌های همین گوشی با محتوای فایل جایگزین می‌شوند و صفحه از نو باز می‌شود.</p>
<div class="pxs-row"><button type="button" class="pxs-btn pxs-btn2" data-b-pick style="flex:1">انتخاب فایل پشتیبان</button><input type="file" accept=".json,application/json" data-b-file aria-label="فایل پشتیبان" hidden></div><div data-b-ask></div></div>
<p class="pxs-msg${bad ? ' bad' : ''}" role="status">${esc(msg || '')}</p>`;
    }
    const file = () => {
      const data = {}; have().forEach(k => { data[k] = localStorage.getItem(k); });
      const d = P.todayIso();
      return new File([JSON.stringify({ app: 'nooran', v: 1, at: new Date().toISOString(), data })], `nooran-backup-${d}.json`, { type: 'application/json' });
    };
    let pending = null;
    body.addEventListener('click', async e => {
      if (e.target.closest('[data-b-save]')) {
        const f = file(), a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        return paint('فایل ذخیره شد؛ آن را در جای امنی نگه دارید.');
      }
      if (e.target.closest('[data-b-pick]')) return body.querySelector('[data-b-file]').click();
      if (e.target.closest('[data-b-share]')) { const f = file(); try { if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'پشتیبان نوران' }); else paint('این گوشی فرستادن فایل را پشتیبانی نمی‌کند؛ «ذخیره فایل» را بزنید.', 1); } catch {} return; }
      if (e.target.closest('[data-b-yes]') && pending) {
        Object.entries(pending).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch {} });
        try { sessionStorage.setItem('ftReset', '1'); } catch {}
        return location.reload();
      }
      if (e.target.closest('[data-b-no]')) { pending = null; paint(); }
    });
    body.addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!e.target.matches('[data-b-file]') || !f) return;
      try {
        if (f.size > 5e6) throw Error();
        const j = JSON.parse(await f.text());
        if (j?.app !== 'nooran' || !j.data || typeof j.data !== 'object') throw Error();
        pending = Object.fromEntries(Object.entries(j.data).filter(([k, v]) => KEEP.includes(k) && typeof v === 'string' && v.length < 4e6));
        const n = Object.keys(pending).length; if (!n) throw Error();
        body.querySelector('[data-b-ask]').innerHTML = `<p>${toFa(n)} مورد در فایل پیدا شد${j.at ? ` (ذخیره‌شده در ${esc(new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium' }).format(new Date(j.at)))})` : ''}. جایگزین شوند؟</p><div class="pxs-row"><button type="button" class="pxs-btn" data-b-yes>بله، بازگردان</button><button type="button" class="pxs-btn pxs-btn2" data-b-no>انصراف</button></div>`;
      } catch { pending = null; paint('این فایل، پشتیبان نوران نیست یا خراب است.', 1); }
    });
    paint();
  }

  // ---------- کارت‌های مدیریت ----------
  function adminCards() {
    const pane = document.getElementById('pane-settings'); if (!pane) return;
    const anchor = document.getElementById('setFeatures');
    let card = document.getElementById('setPlus');
    if (!card) {
      card = document.createElement('div'); card.id = 'setPlus';
      anchor ? anchor.after(card) : pane.prepend(card);
      card.addEventListener('click', onAdmin);
    }
    const c = P.ehdaConf(), evs = Array.isArray(window.siteSettings?.events) ? window.siteSettings.events : [];
    const when = e => { const t = P.tehranMs(e.at); return isFinite(t) ? `${shamsi(t, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}، ${shamsi(t, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}` : 'تاریخ نامعتبر'; };
    card.innerHTML = `<div class="adm-card"><h3>🕯️ یاد درگذشتگان (پنجشنبه‌ها)</h3><p class="hint">پنجشنبه از اذان ظهر تا غروب جمعه، در کارت «امروز» برای همه دیده می‌شود (امکان «یاد درگذشتگان»). هر نام در یک سطر، مثلاً «مرحوم حاج علی رضایی». هر عضو هم می‌تواند نام عزیزان خودش را فقط برای خودش اضافه کند.</p>
<textarea id="pxEhdaNames" rows="5" maxlength="6000" placeholder="هر نام در یک سطر">${esc(c.names.join('\n'))}</textarea>
<input type="text" id="pxEhdaNote" maxlength="300" placeholder="یادداشت کوتاه بالای فهرست (اختیاری)" value="${esc(c.note)}">
<div class="reg-tools"><button type="button" data-pxa="ehda">ذخیره نام‌ها</button></div><div class="adm-msg" id="pxEhdaMsg"></div></div>
<div class="adm-card"><h3>📅 برنامه جلسات</h3><p class="hint">جلسه بعدی از هفت روز پیش از آن در کارت «امروز» دیده می‌شود و فهرست همه در «منوی ☰ › بیشتر › برنامه جلسات» (امکان «برنامه جلسات»). جلسه‌های گذشته خودشان پنهان می‌شوند. ساعت به وقت تهران.</p>
${evs.length ? `<ul class="pxs-res">${evs.map((e, i) => `<li><span>${esc(e.t)}<br><small>${esc(when(e))}${e.place ? ` · ${esc(e.place)}` : ''}</small></span><button type="button" data-pxa="del" data-i="${i}" aria-label="حذف ${esc(e.t)}">حذف</button></li>`).join('')}</ul>` : '<p class="hint">جلسه‌ای ثبت نشده است.</p>'}
<input type="text" id="pxEvT" maxlength="80" placeholder="عنوان، مثلاً «دعای کمیل»">
<label>تاریخ <input type="date" id="pxEvD"></label> <label>ساعت <input type="time" id="pxEvH" value="21:00"></label> <small id="pxEvSh" class="hint"></small>
<input type="text" id="pxEvP" maxlength="120" placeholder="مکان (اختیاری)">
<input type="url" id="pxEvL" maxlength="300" placeholder="پیوند جلسه آنلاین یا نقشه، با https (اختیاری)">
<input type="text" id="pxEvN" maxlength="300" placeholder="توضیح کوتاه (اختیاری)">
<label class="adm-opt"><input type="checkbox" id="pxEvW"> هر هفته همین روز و ساعت، تا ۸ هفته</label>
<div class="reg-tools"><button type="button" data-pxa="add">افزودن جلسه</button></div><div class="adm-msg" id="pxEvMsg"></div></div>`;
    const d = card.querySelector('#pxEvD'), sh = card.querySelector('#pxEvSh');
    d.addEventListener('input', () => { sh.textContent = d.value ? shamsi(Date.parse(d.value + 'T12:00:00Z'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; });
  }
  async function onAdmin(e) {
    const b = e.target.closest('[data-pxa]'); if (!b) return;
    const card = document.getElementById('setPlus'), k = b.dataset.pxa;
    const msg = (id, t, ok) => { const m = card.querySelector(id); m.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); m.textContent = t; };
    b.disabled = true;
    try {
      if (k === 'ehda') {
        const names = card.querySelector('#pxEhdaNames').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 200).map(x => x.slice(0, 80));
        await window.saveSiteSetting('ehda', { names, note: card.querySelector('#pxEhdaNote').value.trim().slice(0, 300) });
        P.refresh(); adminCards(); msg('#pxEhdaMsg', 'ذخیره شد.', 1);
      } else {
        let evs = (Array.isArray(window.siteSettings?.events) ? window.siteSettings.events : []).filter(x => isFinite(P.tehranMs(x.at)) && P.tehranMs(x.at) > Date.now() - DAY2);
        if (k === 'del') evs.splice(+b.dataset.i, 1);
        if (k === 'add') {
          const v = id => card.querySelector(id).value.trim(), t = v('#pxEvT'), d = v('#pxEvD'), h = v('#pxEvH') || '21:00', link = v('#pxEvL');
          if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(h)) { b.disabled = false; return msg('#pxEvMsg', 'عنوان، تاریخ و ساعت را بنویسید.'); }
          if (link && !/^https:\/\/\S+$/.test(link)) { b.disabled = false; return msg('#pxEvMsg', 'پیوند باید با https:// شروع شود.'); }
          const n = card.querySelector('#pxEvW').checked ? 8 : 1, base = Date.parse(d + 'T00:00:00Z');
          for (let i = 0; i < n; i++) evs.push({ id: Date.now().toString(36) + i, t: t.slice(0, 80), at: `${new Date(base + i * 7 * 864e5).toISOString().slice(0, 10)}T${h}`, place: v('#pxEvP').slice(0, 120), link, note: v('#pxEvN').slice(0, 300) });
        }
        evs = evs.sort((a, c) => P.tehranMs(a.at) - P.tehranMs(c.at)).slice(0, 60);
        await window.saveSiteSetting('events', evs);
        P.refresh(); adminCards(); msg('#pxEvMsg', k === 'add' ? 'جلسه افزوده شد.' : 'حذف شد.', 1);
      }
    } catch (err) { msg(k === 'ehda' ? '#pxEhdaMsg' : '#pxEvMsg', err.message || 'ذخیره نشد.'); }
    b.disabled = false;
  }
  const DAY2 = 2 * 864e5;
  document.addEventListener('settings:changed', () => { if (document.getElementById('setPlus')) adminCards(); });

  window.plusSheets = { wird, layl, mahdi, qaza, ehda, popsurahs, events, convert, backup, adminCards, close };
})();
