// ذکرشمار (شناسه امکان: zekr): برگه تمام‌قد از منوی ☰ › «ذکرشمار» برای شمردن صلوات، تسبیحات حضرت زهرا (س) و ذکرهای دیگر،
// و «نذر جمعی»: هدفی که مدیر در ‎#admin‎ › تنظیمات می‌سازد و ذکرهای همه بازدیدکنندگان روی یک نوار پیشرفت جمع می‌شود.
// شمارش و آمار شخصی فقط روی همین گوشی است (localStorage: zekrState، zekrStats). سهم نذر جمعی دسته‌دسته فرستاده می‌شود
// (zekrPending تا رسیدن به سرور می‌ماند)؛ جدول و تابع zekr_add در backend/supabase/zekr.sql. اگر آن فایل اجرا نشده باشد،
// بخش نذر جمعی بی‌صدا پنهان می‌ماند و ذکرشمار شخصی کار می‌کند. نمای شمارنده از شمارنده نماز امام جواد (ع) در ibadat.js گرفته شده است.
(function () {
  const cfg = window.APP_CONFIG || {};
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const shown = () => !!window.features?.shown('zekr');
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
  const DAY = 864e5;
  const isoAdd = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);

  // ---------- ذکرها ----------
  const ZAHRA = [['اللهُ اَکبَر', 34, 'الله اکبر'], ['اَلحَمدُ لِلّه', 33, 'الحمدلله'], ['سُبحانَ الله', 33, 'سبحان‌الله']];
  const LIST = [
    { id: 'salavat', name: 'صلوات', text: 'اللّهُمَّ صَلِّ عَلَی مُحَمَّدٍ وَ آلِ مُحَمَّد', def: 100 },
    { id: 'zahra', name: 'تسبیحات حضرت زهرا (س)', text: '۳۴ الله اکبر، ۳۳ الحمدلله، ۳۳ سبحان‌الله', seq: true },
    { id: 'subhan', name: 'سبحان‌الله', text: 'سُبحانَ الله', def: 33 },
    { id: 'hamd', name: 'الحمدلله', text: 'اَلحَمدُ لِلّه', def: 33 },
    { id: 'tahlil', name: 'لا اله الا الله', text: 'لا اِلهَ اِلَّا الله', def: 100 },
    { id: 'takbir', name: 'الله اکبر', text: 'اللهُ اَکبَر', def: 33 },
    { id: 'istighfar', name: 'استغفار', text: 'اَستَغفِرُ اللهَ رَبّی وَ اَتوبُ اِلَیه', def: 100 },
    { id: 'hawqala', name: 'لا حول و لا قوة الا بالله', text: 'لا حَولَ وَ لا قُوَّةَ اِلّا بِالله', def: 100 },
    { id: 'yunus', name: 'ذکر یونسیه', text: 'لا اِلهَ اِلّا اَنتَ سُبحانَکَ اِنّی کُنتُ مِنَ الظّالِمین', def: 100 },
    { id: 'custom', name: 'ذکر دلخواه', text: '', def: 100 }
  ];

  // S: انتخاب و شمارش جاری و تنظیمات؛ ST: آمار روزانه و همیشگی (روزها تا ۴۰ روز نگه داشته می‌شوند).
  const S = Object.assign({ sel: 'salavat', n: {}, tg: {}, vib: true, snd: false, custom: '' }, ls.get('zekrState', {}));
  const ST = Object.assign({ d: {}, all: {}, names: {} }, ls.get('zekrStats', {}));
  const saveS = () => ls.set('zekrState', S);
  function stat(it, k) {
    const t = today(), d = ST.d[t] = ST.d[t] || {};
    d[it.id] = Math.max(0, (d[it.id] || 0) + k);
    ST.all[it.id] = Math.max(0, (ST.all[it.id] || 0) + k);
    if (it.goal) ST.names[it.id] = it.name;
    const old = isoAdd(t, -40); for (const x in ST.d) if (x < old) delete ST.d[x];
    ls.set('zekrStats', ST);
  }

  // ---------- نذر جمعی ----------
  let goals = (ls.get('zekrGoals', []) || []).filter(g => !g.ends_on || g.ends_on >= today());
  let groupOff = false, loadedAt = 0;
  const P = ls.get('zekrPending', {}) || {};       // شمارش‌های فرستاده‌نشده هر هدف
  const flying = {};                              // در راه سرور
  let backoff = 0;
  const savedP = () => ls.set('zekrPending', P);
  const device = () => {
    let d = ls.get('zkDevice', '');
    if (!d) { const a = new Uint8Array(18); crypto.getRandomValues(a); d = 'zk' + [...a].map(x => x.toString(16).padStart(2, '0')).join(''); ls.set('zkDevice', d); }
    return d;
  };
  const headers = () => ({ apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' });
  const shownTotal = g => g.total + (P[g.id] || 0) + (flying[g.id] || 0);

  async function loadGoals() {
    if (!cfg.SUPABASE_URL || groupOff) return;
    // اگر تا یک ساعت پیش جدول نبود، دوباره پرسیده نمی‌شود (جز در ‎#admin‎) تا هر بار خطای ۴۰۴ در کنسول نیفتد.
    if (location.hash !== '#admin' && Date.now() - (ls.get('zekrNoSql', 0) || 0) < 36e5) { groupOff = true; return; }
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/zekr_goals?select=id,title,zekr,target,total,ends_on&active=eq.true&order=id.desc&limit=5`, { headers: headers(), cache: 'no-store', signal: ac.signal });
      if (!r.ok) {
        // جدول هنوز ساخته نشده (zekr.sql اجرا نشده): نذر جمعی پنهان می‌ماند.
        if (r.status === 404 || r.status === 400) { groupOff = true; goals = []; ls.set('zekrGoals', []); ls.set('zekrNoSql', Date.now()); changed(); }
        return;
      }
      goals = (await r.json()).filter(g => !g.ends_on || g.ends_on >= today());
      ls.set('zekrGoals', goals); ls.set('zekrNoSql', 0); loadedAt = Date.now();
      // سهم مانده برای هدفی که دیگر نیست دور ریخته می‌شود.
      for (const id in P) if (!goals.some(g => String(g.id) === id)) delete P[id];
      savedP(); changed(); send();
    } catch {} finally { clearTimeout(tm); }
  }
  // final: هنگام بستن برگه یا رفتن از صفحه؛ با keepalive تا پس از بسته شدن صفحه هم برسد.
  function send(final) {
    if (!cfg.SUPABASE_URL || groupOff || (!final && Date.now() < backoff)) return;
    for (const id in P) {
      const n = Math.min(500, P[id] || 0);
      if (!n || flying[id]) continue;
      P[id] -= n; if (!P[id]) delete P[id];
      flying[id] = n; savedP();
      const back = () => { P[id] = (P[id] || 0) + n; savedP(); };
      fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/zekr_add`, { method: 'POST', headers: headers(), keepalive: !!final, body: JSON.stringify({ p_goal: +id, p_n: n, p_device: device() }) })
        .then(async r => {
          const d = await r.json().catch(() => null);
          if (r.ok) { const g = goals.find(x => String(x.id) === id); if (g && typeof d === 'number') g.total = Math.max(g.total, d); ls.set('zekrGoals', goals); return; }
          const m = d?.message || '';
          if (m === 'zekr_limit') { back(); backoff = Date.now() + 30000; }
          else if (m === 'zekr_closed') loadGoals();          // هدف تمام یا خاموش شد
          else if (r.status === 404 || d?.code === 'PGRST202') { groupOff = true; goals = []; changed(); }
          else if (r.status >= 500) back();
        }, back)
        .finally(() => { delete flying[id]; paintGoals(); });
    }
  }
  setInterval(() => { if (Object.keys(P).length) send(); }, 4000);
  addEventListener('pagehide', () => send(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) send(true);
    else if (isOpen()) { wake(); if (Date.now() - loadedAt > 20000) loadGoals(); }
  });
  setInterval(() => { if (isOpen() && !document.hidden) loadGoals(); }, 30000);

  // ---------- برگه ذکرشمار ----------
  const css = `
.zk-shade{position:fixed;inset:0;z-index:60;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.zk-box{position:relative;width:100%;max-width:560px;height:calc(100dvh - 12px);display:flex;flex-direction:column;gap:8px;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:150px 150px 0 0/60px 60px 0 0;padding:12px 16px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:zkup .25s ease;overflow:hidden}
@keyframes zkup{from{transform:translateY(40px);opacity:.4}}
.zk-head{display:flex;align-items:center;gap:4px;flex:none}
.zk-head h2{flex:1;margin:0;text-align:center;font:normal 30px/1.5 SiteFont,Tahoma,serif;color:var(--deep)}
.zk-box .zk-ic{flex:none;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:21px}
.zk-box .zk-ic:hover{background:var(--hover)}
.zk-goals:empty{display:none}
.zk-box .zk-goal{display:block;width:100%;height:auto;padding:8px 12px;text-align:right;white-space:normal;background:#fff;color:var(--ink);border:1px solid var(--gold);border-radius:var(--r-card);font-weight:400;font-size:15px;line-height:1.6}
.zk-goal+.zk-goal{margin-top:6px}
.zk-goal.on{border-color:var(--emerald);box-shadow:0 0 0 2px var(--emerald) inset}
.zk-goal b{color:var(--deep);font-size:15.5px}
.zk-goal .zk-prog{height:10px;margin:6px 0 2px;border-radius:999px;background:#ece3cf;overflow:hidden}
.zk-goal .zk-prog i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--gold),var(--emerald));transition:width .4s}
.zk-goal small{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:13px}
.zk-box .zk-pick{flex:none;display:flex;align-items:center;gap:8px;width:100%;height:48px;background:#fff;color:var(--deep);border:1px solid var(--gold);border-radius:var(--r-card);font-size:16px}
.zk-pick span{color:var(--muted);font-weight:400}.zk-pick b{flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis}
.zk-box .zk-tap{flex:1;min-height:0;width:100%;height:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;white-space:normal;background:radial-gradient(circle at 50% 55%,#fff 0,var(--cream) 75%);color:var(--deep);border:1px solid var(--gold);border-radius:var(--r-panel);font-weight:400;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;transition:transform .06s}
.zk-tap:active{transform:scale(.985)}
.zk-tap:focus-visible{outline:3px solid var(--emerald);outline-offset:2px}
.zk-text{max-width:100%;font:600 24px/1.9 Vazirmatn,Tahoma,sans-serif;text-align:center;overflow-wrap:anywhere}
.zk-ring{position:relative;width:min(52vw,210px,32dvh);aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:conic-gradient(var(--emerald) var(--p,0%),#e8dfcc 0)}
.zk-ring::before{content:"";position:absolute;inset:10px;border-radius:50%;background:#fffaf0}
.zk-ring>*{position:relative}
.zk-ring b{font-size:clamp(44px,13vw,64px);line-height:1.1;font-weight:700}
.zk-ring small{font-size:15px;color:var(--muted)}
.zk-tap.done .zk-ring{background:var(--emerald)}
.zk-phase{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;font-size:13.5px}
.zk-phase span{padding:2px 10px;border-radius:999px;background:#ece3cf;color:var(--muted)}
.zk-phase span.now{background:var(--deep);color:#fff}.zk-phase span.ok{background:var(--mint);color:var(--deep)}
.zk-hint{font-size:13.5px;color:var(--muted)}
.zk-bar{flex:none;display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:8px}
.zk-box .zk-bar button{height:48px;padding:0 6px;font-size:15px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.zk-box .zk-bar button:hover{background:var(--hover)}
.zk-box .zk-bar button.warn{background:var(--danger);color:#fff;border-color:var(--danger)}
.zk-done-msg{min-height:1.6em;margin:0;text-align:center;font-weight:700;color:var(--ok)}
.zk-panel{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;background:#fffaf0;padding:12px 16px calc(14px + env(safe-area-inset-bottom));border-radius:inherit}
.zk-panel[hidden]{display:none}
.zk-panel .zk-pbody{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.zk-box .zk-row{display:flex;align-items:center;gap:10px;width:100%;height:auto;min-height:52px;padding:8px 6px;background:transparent;color:var(--ink);border:0;border-bottom:1px solid var(--line);border-radius:0;text-align:right;white-space:normal;font-weight:500;font-size:16px;line-height:1.6}
.zk-row:hover{background:var(--hover)}
.zk-row span{flex:1;min-width:0}.zk-row small{display:block;color:var(--muted);font-size:13px;font-weight:400;overflow-wrap:anywhere}
.zk-row i{flex:none;font-style:normal;color:var(--emerald);font-weight:700}
.zk-row.on{background:var(--mint)}
.zk-panel h3{margin:6px 0;font-size:16px;color:var(--deep)}
.zk-field{display:flex;gap:8px;margin:8px 0}.zk-field input{flex:1;min-width:0;height:48px;font-size:17px}
.zk-chips{display:flex;flex-wrap:wrap;gap:8px}
.zk-box .zk-chips button{flex:1 1 70px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.zk-box .zk-chips button.on{background:var(--deep);color:#fff}
.zk-opt{display:flex;align-items:center;gap:12px;padding:12px 4px;border-bottom:1px solid var(--line);cursor:pointer;margin:0;font-weight:500}
.zk-opt span{flex:1}.zk-opt small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.zk-sw{appearance:none;-webkit-appearance:none;flex:none;position:relative;width:46px!important;height:26px!important;margin:0;padding:0;border-radius:999px;border:1px solid var(--gold);background:#e8dfcc;cursor:pointer;transition:background .15s}
.zk-sw::after{content:"";position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0004;transition:right .15s}
.zk-sw:checked{background:var(--emerald)}.zk-sw:checked::after{right:22px}
.zk-tbl{width:100%;border-collapse:collapse;font-size:15px}
.zk-tbl th,.zk-tbl td{padding:7px 6px;border-bottom:1px solid var(--line);text-align:right}
.zk-tbl th{background:var(--deep);color:#fff;font-weight:600}
.zk-tbl td:not(:first-child),.zk-tbl th:not(:first-child){text-align:center;white-space:nowrap}
.zk-tbl tfoot td{font-weight:700;color:var(--deep)}
.zk-note{color:var(--muted);font-size:14px;margin:8px 0}
.zk-panel .zk-back{flex:none;margin-top:10px;width:100%}
body.zk-lock{overflow:hidden}
.sm-item small.zk-sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(min-width:700px){.zk-box{height:min(calc(100dvh - 24px),860px)}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  const items = () => [...goals.map(g => ({ id: 'g' + g.id, goal: g, name: g.title, text: g.zekr, def: 100 })), ...LIST];
  const cur = () => {
    const all = items(); let it = all.find(x => x.id === S.sel);
    if (!it || (it.id === 'custom' && !S.custom.trim())) it = all.find(x => x.id === 'salavat');
    return it.id === 'custom' ? { ...it, text: S.custom } : it;
  };
  const target = it => it.seq ? 100 : (S.tg[it.id] || it.def);
  const count = it => S.n[it.id] || 0;
  // در تسبیحات حضرت زهرا (س): مرحله جاری و شمار درون همان مرحله
  const phase = n => { let s = 0; for (let i = 0; i < 3; i++) { if (n < s + ZAHRA[i][1]) return { i, k: n - s }; s += ZAHRA[i][1]; } return { i: 3, k: 0 }; };

  let shade = null, box = null, armed = 0;
  const isOpen = () => !!shade?.isConnected;
  const $ = s => box.querySelector(s);

  function paintGoals() {
    if (!isOpen()) return;
    const el = $('.zk-goals'); if (!el) return;
    el.innerHTML = goals.slice(0, 2).map(g => {
      const t = shownTotal(g), p = Math.min(100, t / g.target * 100), on = S.sel === 'g' + g.id;
      return `<button type="button" class="zk-goal${on ? ' on' : ''}" data-zk-goal="${g.id}"><b>🤲 نذر جمعی: ${esc(g.title)}</b>
<div class="zk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${g.target}" aria-valuenow="${t}"><i style="width:${p.toFixed(2)}%"></i></div>
<small><span>${fa(t)} از ${fa(g.target)}${t >= g.target ? ' (به هدف رسید؛ قبول باشد)' : ` (${fa(Math.floor(p))}٪)`}</span><span>${on ? 'ذکرهای شما اینجا جمع می‌شود' : 'برای شرکت بزنید'}</span></small></button>`;
    }).join('');
  }
  function paint() {
    if (!isOpen()) return;
    const it = cur(), n = count(it), tg = target(it), tap = $('.zk-tap');
    $('.zk-pick b').textContent = it.name;
    $('[data-zk=target]').textContent = it.seq ? 'هدف: ۱۰۰' : `هدف: ${fa(tg)}`;
    $('[data-zk=target]').disabled = !!it.seq;
    let text = it.text, big = n, sub = `از ${fa(tg)}`, pct, done = n >= tg, extra = '';
    if (it.seq) {
      const ph = phase(n);
      done = ph.i === 3;
      text = done ? ZAHRA[2][0] : ZAHRA[ph.i][0];
      big = done ? 100 : ph.k; sub = done ? 'از ۱۰۰' : `از ${fa(ZAHRA[ph.i][1])}`;
      pct = done ? 100 : ph.k / ZAHRA[ph.i][1] * 100;
      extra = `<div class="zk-hint">مجموع ${fa(n)} از ۱۰۰</div><div class="zk-phase">${ZAHRA.map((z, i) => `<span class="${i < ph.i ? 'ok' : i === ph.i ? 'now' : ''}">${i < ph.i ? '✓ ' : ''}${fa(z[1])} ${z[2]}</span>`).join('')}</div>`;
    } else pct = n ? ((n - 1) % tg + 1) / tg * 100 : 0;
    tap.classList.toggle('done', done && (it.seq || n % tg === 0));
    tap.innerHTML = `<div class="zk-text">${esc(text)}</div><div class="zk-ring" style="--p:${pct.toFixed(2)}%"><b>${fa(big)}</b><small>${sub}</small></div>${extra}<span class="zk-hint">${n ? (window.matchMedia('(hover:hover)').matches ? 'زدن یا کلید فاصله: یکی بیشتر' : 'هر جای این کادر را بزنید') : 'برای شمردن، هر جای این کادر را بزنید'}</span>`;
    tap.setAttribute('aria-label', `${it.name}: ${fa(n)} از ${fa(tg)}. برای شمردن بزنید`);
    $('.zk-done-msg').textContent = done ? (it.seq ? 'تسبیحات تمام شد؛ قبول باشد. زدن دوباره، دور تازه‌ای شروع می‌کند.' : n === tg ? 'به هدف رسیدید؛ قبول باشد' : `${fa(Math.floor(n / tg))} دور کامل؛ قبول باشد`) : '';
    paintGoals();
  }

  // ---------- لرزش، صدا و روشن ماندن صفحه ----------
  const buzz = p => { if (S.vib !== false && navigator.vibrate) try { navigator.vibrate(p); } catch {} };
  let actx = null;
  function tick() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.frequency.value = 900; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .07);
    } catch {}
  }
  let lock = null, waking = false;
  async function wake() {
    if (lock || waking || !('wakeLock' in navigator) || document.hidden) return;
    waking = true;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); if (!isOpen()) sleep(); } catch {} finally { waking = false; }
  }
  const sleep = () => { try { lock?.release(); } catch {} lock = null; };

  function tap() {
    const it = cur(); let n = count(it) + 1;
    if (it.seq && n > 100) n = 1;                 // دور تازه تسبیحات
    S.n[it.id] = n; saveS(); stat(it, 1);
    if (it.goal) { P[it.goal.id] = (P[it.goal.id] || 0) + 1; savedP(); }
    const tg = target(it);
    if (it.seq) { if (n === 100) buzz([200, 80, 200]); else if (n === 34 || n === 67) buzz([60, 40, 60]); }
    else if (n % tg === 0) buzz([200, 80, 200]);
    else if (n % 33 === 0) buzz(70);
    if (S.snd) tick();
    if (!lock) wake();
    paint();
  }
  function undo() {
    const it = cur(), n = count(it); if (!n) return;
    S.n[it.id] = n - 1; saveS(); stat(it, -1);
    if (it.goal && P[it.goal.id]) { P[it.goal.id]--; if (!P[it.goal.id]) delete P[it.goal.id]; savedP(); }
    paint();
  }
  // «از اول» با دو بار زدن، تا با یک لمس اشتباهی شمارش از دست نرود.
  function reset(b) {
    const it = cur();
    if (!count(it)) return;
    if (Date.now() - armed > 3000) { armed = Date.now(); b.classList.add('warn'); b.textContent = 'دوباره بزنید'; setTimeout(() => { if (b.isConnected) { b.classList.remove('warn'); b.textContent = 'از اول'; } }, 3000); return; }
    armed = 0; b.classList.remove('warn'); b.textContent = 'از اول';
    S.n[it.id] = 0; saveS(); paint();
  }

  // ---------- برگه‌های درونی: انتخاب ذکر، هدف، تنظیمات، آمار ----------
  function panel(html) {
    const p = $('.zk-panel');
    p.innerHTML = `<div class="zk-head"><h2 style="font-size:24px">${html.title}</h2></div><div class="zk-pbody">${html.body}</div><button type="button" class="reg-light zk-back" data-zk="back">بازگشت به شمارش</button>`;
    p.hidden = false;
    setTimeout(() => (p.querySelector('.on, input, .zk-row') || p.querySelector('.zk-back'))?.focus({ preventScroll: true }), 30);
  }
  const closePanel = () => { const p = $('.zk-panel'); if (p.hidden) return false; p.hidden = true; p.innerHTML = ''; $('.zk-tap').focus({ preventScroll: true }); return true; };
  function pickPanel() {
    const sel = cur().id, t = ST.d[today()] || {};
    const row = it => `<button type="button" class="zk-row${it.id === sel ? ' on' : ''}" data-zk-sel="${it.id}"><span>${it.goal ? '🤲 ' : ''}${esc(it.name)}<small>${esc(it.id === 'custom' ? (S.custom || 'متن ذکر را خودتان بنویسید') : it.goal ? `نذر جمعی: ${it.text}` : it.text)}</small></span>${t[it.id] ? `<small>امروز ${fa(t[it.id])}</small>` : ''}${it.id === sel ? '<i>✓</i>' : ''}</button>`;
    panel({ title: 'انتخاب ذکر', body: items().map(row).join('') + `<div class="zk-custom" hidden><h3>ذکر دلخواه</h3><div class="zk-field"><input type="text" maxlength="200" placeholder="متن ذکر" value="${esc(S.custom)}" aria-label="متن ذکر دلخواه"><button type="button" data-zk="custom">شروع</button></div></div>` });
  }
  function targetPanel() {
    const it = cur(), tg = target(it);
    panel({ title: 'هدف شمارش', body: `<p class="zk-note">برای «${esc(it.name)}». با رسیدن به هدف (اگر لرزش روشن باشد) گوشی می‌لرزد.</p>
<div class="zk-chips">${[33, 100, 1000].map(v => `<button type="button" class="${v === tg ? 'on' : ''}" data-zk-tg="${v}">${fa(v)}</button>`).join('')}</div>
<h3>عدد دلخواه</h3><div class="zk-field"><input type="text" inputmode="numeric" maxlength="6" placeholder="مثلاً ۱۴۶" value="${[33, 100, 1000].includes(tg) ? '' : fa(tg).replace(/٬/g, '')}" aria-label="عدد هدف دلخواه"><button type="button" data-zk="tgset">ثبت</button></div>` });
  }
  function optsPanel() {
    const vibOk = 'vibrate' in navigator;
    panel({ title: 'تنظیمات ذکرشمار', body: `<label class="zk-opt"><span>لرزش<small>${vibOk ? 'در هر ۳۳ ذکر و هنگام رسیدن به هدف' : 'این گوشی یا مرورگر لرزش را پشتیبانی نمی‌کند (مثلاً آیفون)'}</small></span><input type="checkbox" class="zk-sw" data-zk-opt="vib"${S.vib !== false ? ' checked' : ''}${vibOk ? '' : ' disabled'} aria-label="لرزش"></label>
<label class="zk-opt"><span>صدای شمارش<small>صدای کوتاه با هر بار زدن</small></span><input type="checkbox" class="zk-sw" data-zk-opt="snd"${S.snd ? ' checked' : ''} aria-label="صدای شمارش"></label>
<p class="zk-note">تا وقتی این برگه باز است، صفحه گوشی خاموش نمی‌شود${'wakeLock' in navigator ? '' : ' (اگر مرورگر اجازه دهد)'}. روی رایانه، کلید فاصله یا Enter هم یکی می‌شمارد. شمارش‌ها فقط روی همین گوشی نگه داشته می‌شود.</p>` });
  }
  function statsPanel() {
    const t = today(), dow = new Date(t + 'T00:00:00Z').getUTCDay(), week = [];
    for (let k = (dow + 1) % 7; k >= 0; k--) week.push(isoAdd(t, -k));     // از شنبه تا امروز
    const name = id => LIST.find(x => x.id === id)?.name || goals.find(g => 'g' + g.id === id)?.title || ST.names[id] || 'نذر جمعی';
    const ids = Object.keys(ST.all).filter(id => ST.all[id] > 0).sort((a, b) => ST.all[b] - ST.all[a]);
    const day = id => ST.d[t]?.[id] || 0, wk = id => week.reduce((s, d) => s + (ST.d[d]?.[id] || 0), 0);
    const sum = f => ids.reduce((s, id) => s + f(id), 0);
    panel({ title: 'آمار ذکرهای من', body: ids.length ? `<table class="zk-tbl"><thead><tr><th>ذکر</th><th>امروز</th><th>این هفته</th><th>همه</th></tr></thead><tbody>${ids.map(id => `<tr><td>${esc(name(id))}</td><td>${fa(day(id))}</td><td>${fa(wk(id))}</td><td>${fa(ST.all[id])}</td></tr>`).join('')}</tbody>
<tfoot><tr><td>جمع</td><td>${fa(sum(day))}</td><td>${fa(sum(wk))}</td><td>${fa(sum(id => ST.all[id]))}</td></tr></tfoot></table><p class="zk-note">هفته از شنبه حساب می‌شود. این آمار فقط روی همین گوشی است.</p>` : '<p class="zk-note">هنوز ذکری شمرده نشده است.</p>' });
  }

  function onClick(e) {
    if (e.target === shade) return close();
    const g = e.target.closest('[data-zk-goal]');
    // پس از هر دکمه، فوکوس به کادر شمارش برمی‌گردد تا کلید فاصله باز هم بشمارد.
    const back = () => $('.zk-tap').focus({ preventScroll: true });
    if (g) { S.sel = 'g' + g.dataset.zkGoal; saveS(); paint(); return back(); }
    const s = e.target.closest('[data-zk-sel]');
    if (s) {
      if (s.dataset.zkSel === 'custom') { const c = $('.zk-custom'); c.hidden = false; const i = c.querySelector('input'); i.focus(); i.scrollIntoView({ block: 'nearest' }); return; }
      S.sel = s.dataset.zkSel; saveS(); closePanel(); return paint();
    }
    const t = e.target.closest('[data-zk-tg]');
    if (t) { S.tg[cur().id] = +t.dataset.zkTg; saveS(); closePanel(); return paint(); }
    const b = e.target.closest('[data-zk]'); if (!b) return;
    const a = b.dataset.zk;
    if (a === 'close') return close();
    if (a === 'tap') return tap();
    if (a === 'undo') { undo(); return back(); }
    if (a === 'reset') { reset(b); return back(); }
    if (a === 'pick') return pickPanel();
    if (a === 'target') return targetPanel();
    if (a === 'opts') return optsPanel();
    if (a === 'stats') return statsPanel();
    if (a === 'back') return closePanel();
    if (a === 'custom') {
      const v = $('.zk-custom input').value.trim().slice(0, 200);
      if (!v) return $('.zk-custom input').focus();
      if (v !== S.custom) S.n.custom = 0;           // ذکر تازه، شمارش تازه
      S.custom = v; S.sel = 'custom'; saveS(); closePanel(); return paint();
    }
    if (a === 'tgset') {
      const v = parseInt($('.zk-field input').value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, ''), 10);
      if (!(v >= 1 && v <= 100000)) return $('.zk-field input').focus();
      S.tg[cur().id] = v; saveS(); closePanel(); return paint();
    }
  }

  function open() {
    if (!shown()) return;
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'zk-shade';
      shade.innerHTML = `<div class="zk-box" role="dialog" aria-modal="true" aria-label="ذکرشمار">
<div class="zk-head"><button type="button" class="zk-ic" data-zk="close" aria-label="بستن">✕</button><h2>ذکرشمار</h2><button type="button" class="zk-ic" data-zk="stats" aria-label="آمار ذکرهای من" title="آمار">📊</button><button type="button" class="zk-ic" data-zk="opts" aria-label="تنظیمات ذکرشمار" title="تنظیمات">⚙️</button></div>
<div class="zk-goals"></div>
<button type="button" class="zk-pick" data-zk="pick"><span>ذکر:</span><b></b><span aria-hidden="true">▾ تغییر</span></button>
<button type="button" class="zk-tap" data-zk="tap"></button>
<p class="zk-done-msg" aria-live="polite"></p>
<div class="zk-bar"><button type="button" data-zk="undo">↶ یکی کم</button><button type="button" data-zk="target"></button><button type="button" data-zk="reset">از اول</button></div>
<div class="zk-panel" hidden></div></div>`;
      box = shade.querySelector('.zk-box');
      shade.addEventListener('click', onClick);
      shade.addEventListener('change', e => { const o = e.target.closest('[data-zk-opt]'); if (o) { S[o.dataset.zkOpt] = o.checked; saveS(); if (o.checked && o.dataset.zkOpt === 'vib') buzz(60); } });
      shade.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('.zk-field input')) { e.preventDefault(); e.target.nextElementSibling?.click(); } });
    }
    document.body.appendChild(shade); document.body.classList.add('zk-lock');
    paint(); wake();
    if (Date.now() - loadedAt > 20000) loadGoals();
    try { if (!history.state?.zk) history.pushState({ zk: 1 }, ''); } catch {}
    setTimeout(() => $('.zk-tap')?.focus({ preventScroll: true }), 60);
  }
  function close(fromHistory) {
    if (!isOpen()) return;
    send(true); sleep();
    $('.zk-panel').hidden = true;
    shade.remove(); document.body.classList.remove('zk-lock');
    if (!fromHistory) { try { if (history.state?.zk) history.back(); } catch {} }
  }
  window.addEventListener('popstate', () => { if (!history.state?.zk) close(true); });
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { if (!closePanel()) close(); return; }
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (!$('.zk-panel').hidden || e.target.closest?.('input,textarea,select')) return;
    const b = e.target.closest?.('button');
    if (b && b.dataset.zk !== 'tap') return;          // دکمه‌های دیگر کار خودشان را می‌کنند
    if (b && !e.repeat) return;                         // روی دکمه شمارش، کلیک خود دکمه می‌شمارد
    e.preventDefault();
    if (!e.repeat) tap();
  });

  // ---------- منوی ☰ ----------
  function menuSub() {
    const g = goals[0];
    if (!g) return 'صلوات، تسبیحات حضرت زهرا (س) و ذکرهای دیگر';
    const t = shownTotal(g);
    return `نذر جمعی «${g.title}»: ${t >= g.target ? 'به هدف رسید' : `${fa(Math.floor(t / g.target * 100))}٪`}`;
  }
  window.siteMenu?.section({
    id: 'zekr', order: 5.5,
    render(box) {
      if (!shown()) return;
      box.innerHTML = `<h3>ذکر و تسبیح</h3><button type="button" class="sm-item" data-zk-open><span class="sm-ic">📿</span><span>ذکرشمار<small class="zk-sub">${esc(menuSub())}</small></span><span class="sm-go">‹</span></button>`;
      box.querySelector('[data-zk-open]').onclick = () => { window.siteMenu.close(); setTimeout(open, 280); };
    }
  });
  function changed() { window.siteMenu?.refresh(); paint(); }
  let first = true;
  const boot = () => { if (shown() && first) { first = false; setTimeout(loadGoals, 2500); } };
  document.addEventListener('features:changed', () => { if (!shown()) close(); boot(); window.siteMenu?.refresh(); });
  boot();
  window.zekr = { open, list: LIST }; // list: نام ذکرها برای «نوران من» (mine-sheet.js)

  // ---------- مدیر: کارت «نذر جمعی ذکر و صلوات» در زبانه تنظیمات ----------
  const NO_SQL = 'ابتدا zekr.sql را در Supabase اجرا کنید (backend/supabase/zekr.sql، گام ۲۸ راهنمای backend).';
  const admErr = e => /راه‌اندازی نشده/.test(e.message) ? NO_SQL : e.message;
  let editing = null;
  function adminCard() {
    const pane = document.getElementById('pane-settings');
    if (!pane || !window.sbApi) return;
    let card = document.getElementById('setZekr');
    if (!card) {
      card = document.createElement('div'); card.className = 'adm-card'; card.id = 'setZekr';
      const ft = document.getElementById('setFeatures');
      ft ? ft.after(card) : pane.prepend(card);
      card.innerHTML = `<h3>نذر جمعی ذکر و صلوات</h3><p class="hint">هدفی بسازید (مثلاً ۱۴٬۰۰۰ صلوات)؛ ذکرهایی که همه بازدیدکنندگان در «منوی ☰ › ذکرشمار» برای آن می‌شمارند روی یک نوار پیشرفت جمع می‌شود. هدف روشن در بالای ذکرشمار و زیر نام آن در منو دیده می‌شود. «ذکرشمار» باید در «امکانات سایت» روشن باشد.</p>
<div data-z="list" class="hint">…</div>
<h4 data-z="ftitle" style="margin:14px 0 0;color:var(--deep)">هدف تازه</h4>
<label for="zkaTitle">عنوان</label><input id="zkaTitle" data-z="title" type="text" maxlength="120" placeholder="مثلاً: ۱۴٬۰۰۰ صلوات برای سلامتی امام زمان (عج)" style="width:100%">
<label for="zkaZekr">متن ذکر</label><select data-z="preset" aria-label="انتخاب از ذکرهای آماده" style="width:100%;margin-bottom:6px"><option value="">انتخاب از ذکرهای آماده…</option>${LIST.filter(x => x.text && !x.seq).map(x => `<option value="${esc(x.text)}">${esc(x.name)}</option>`).join('')}</select>
<input id="zkaZekr" data-z="zekr" type="text" maxlength="300" placeholder="متن ذکر" style="width:100%">
<label for="zkaTarget">عدد هدف</label><input id="zkaTarget" data-z="target" type="text" inputmode="numeric" maxlength="10" value="14000" dir="ltr" style="width:100%">
<label class="adm-opt"><input type="checkbox" data-z="hasEnd"> <span>تاریخ پایان دارد (پس از آن روز، شمارش برای این هدف بسته می‌شود)</span></label>
<div data-z="endBox" hidden><input data-z="end" type="date"></div>
<label class="adm-opt"><input type="checkbox" data-z="active" checked> <span>روشن: برای همه نمایش داده شود</span></label>
<div class="reg-tools"><button type="button" data-z="save">ساختن هدف</button><button type="button" class="reg-light" data-z="cancel" hidden>انصراف از ویرایش</button></div><div class="adm-msg" data-z="msg"></div>`;
      const q = f => card.querySelector(`[data-z="${f}"]`);
      q('preset').onchange = () => { if (q('preset').value) q('zekr').value = q('preset').value; q('preset').value = ''; };
      q('hasEnd').onchange = () => {
        q('endBox').hidden = !q('hasEnd').checked;
        if (q('hasEnd').checked && !q('end')._jd) { window.JDate?.(q('end'), { quick: false }); }
        if (q('hasEnd').checked && !q('end').value) q('end').value = window.J ? window.J.addDays(window.J.todayIso(), 30) : isoAdd(today(), 30);
      };
      q('save').onclick = () => saveGoal(card);
      q('cancel').onclick = () => fillForm(card, null);
      q('list').addEventListener('click', e => listAct(card, e));
    }
    loadAdmin(card);
  }
  const amsg = (card, t, ok) => { const e = card.querySelector('[data-z=msg]'); e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
  let adminRows = [];
  async function loadAdmin(card) {
    const list = card.querySelector('[data-z=list]');
    try {
      adminRows = await window.sbApi('zekr_goals?select=id,title,zekr,target,total,ends_on,active&order=id.desc', { auth: true });
      const t = today();
      list.className = '';
      list.innerHTML = adminRows.length ? adminRows.map(g => {
        const past = g.ends_on && g.ends_on < t, p = Math.min(100, g.total / g.target * 100);
        return `<div class="fba-item" data-id="${g.id}" style="border-top:1px solid #f0e8d6;padding:8px 0"><b>${esc(g.title)}</b> <small style="color:var(--muted)">${g.active && !past ? '🟢 روشن' : past ? '⏹ تمام‌شده' : '⚪ خاموش'}${g.ends_on ? `، تا ${esc(window.J ? window.J.label(g.ends_on) : g.ends_on)}` : '، بی‌تاریخ پایان'}</small>
<div style="color:var(--deep)">${esc(g.zekr)}</div><div class="zk-prog" style="height:8px;margin:6px 0;border-radius:999px;background:#ece3cf;overflow:hidden"><i style="display:block;height:100%;width:${p.toFixed(2)}%;background:var(--emerald)"></i></div>
<small>${fa(g.total)} از ${fa(g.target)} (${fa(Math.floor(p))}٪)</small>
<div class="reg-tools"><button type="button" class="reg-light" data-za="edit">ویرایش</button><button type="button" class="reg-light" data-za="toggle">${g.active ? 'خاموش کردن' : 'روشن کردن'}</button><button type="button" class="reg-light" data-za="del">حذف</button></div></div>`;
      }).join('') : '<p class="hint">هنوز هدفی ساخته نشده است.</p>';
    } catch (e) { list.className = 'adm-msg adm-bad'; list.textContent = admErr(e); }
  }
  function fillForm(card, g) {
    const q = f => card.querySelector(`[data-z="${f}"]`);
    editing = g ? g.id : null;
    q('title').value = g?.title || ''; q('zekr').value = g?.zekr || ''; q('target').value = String(g?.target || 14000);
    q('active').checked = g ? g.active : true;
    q('hasEnd').checked = !!g?.ends_on; q('hasEnd').onchange(); if (g?.ends_on) q('end').value = g.ends_on;
    q('ftitle').textContent = g ? `ویرایش «${g.title}»` : 'هدف تازه';
    q('save').textContent = g ? 'ذخیره تغییرات' : 'ساختن هدف'; q('cancel').hidden = !g;
    if (g) q('ftitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  async function saveGoal(card) {
    const q = f => card.querySelector(`[data-z="${f}"]`);
    const title = q('title').value.trim(), zekr = q('zekr').value.trim();
    const target = parseInt(q('target').value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, ''), 10);
    if (title.length < 2) return amsg(card, 'عنوان را بنویسید.');
    if (!zekr) return amsg(card, 'متن ذکر را بنویسید یا از فهرست انتخاب کنید.');
    if (!(target >= 1 && target <= 1e9)) return amsg(card, 'عدد هدف درست نیست.');
    const body = { title, zekr, target, active: q('active').checked, ends_on: q('hasEnd').checked && q('end').value || null, updated_at: new Date().toISOString() };
    q('save').disabled = true;
    try {
      if (editing) await window.sbApi(`zekr_goals?id=eq.${editing}`, { method: 'PATCH', body, auth: true, prefer: 'return=minimal' });
      else await window.sbApi('zekr_goals', { method: 'POST', body, auth: true, prefer: 'return=minimal' });
      amsg(card, editing ? 'ذخیره شد.' : 'هدف ساخته شد.', true);
      fillForm(card, null); loadAdmin(card); groupOff = false; loadGoals();
    } catch (e) { amsg(card, admErr(e)); }
    finally { q('save').disabled = false; }
  }
  async function listAct(card, e) {
    const b = e.target.closest('[data-za]'); if (!b) return;
    const id = +b.closest('[data-id]').dataset.id, g = adminRows.find(x => x.id === id); if (!g) return;
    if (b.dataset.za === 'edit') return fillForm(card, g);
    if (b.dataset.za === 'del' && !confirm(`هدف «${g.title}» و شمارش آن (${fa(g.total)}) حذف شود؟`)) return;
    b.disabled = true;
    try {
      if (b.dataset.za === 'del') await window.sbApi(`zekr_goals?id=eq.${id}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
      else await window.sbApi(`zekr_goals?id=eq.${id}`, { method: 'PATCH', body: { active: !g.active, updated_at: new Date().toISOString() }, auth: true, prefer: 'return=minimal' });
      amsg(card, 'انجام شد.', true); if (editing === id) fillForm(card, null);
      loadAdmin(card); loadGoals();
    } catch (err) { amsg(card, admErr(err)); b.disabled = false; }
  }
  document.addEventListener('admin:tab', e => { if (e.detail === 'settings') adminCard(); });
  const p0 = document.getElementById('pane-settings'); if (p0 && !p0.hidden) adminCard();
})();
