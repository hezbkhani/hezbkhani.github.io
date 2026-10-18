// اعلان‌های سایت روی این گوشی (Web Push):
// - حزب‌خوانی: پس از «نمایش سهم امروز» پیشنهاد می‌شود؛ هر روز سهم امروز، و عصر اگر گزارش ثبت نشده یادآوری.
// - اعمال و ختم‌ها (ibadat.js): نماز امام جواد (ع) چهارشنبه‌ها با اذان ظهر و ختم یاسین حضرت ام‌البنین (س) با اذان مغرب، برای هر گوشی که اعلان دارد.
// - چله و دوره‌های قرآن (جزء، صفحه): کارت بالای «چله‌های من»؛ برنامه امروز (مثلاً «جزء ۷»)، شروع از فردا، یادآوری «خواندم»،
//   رسیدن جا از فهرست رزرو و خبر تازه دوره. کدهای ثبت‌نام حزب‌خوانی هم همراهش می‌رود تا اعلام شناسه و گروه خبر داده شود.
// ساعت‌ها و متن‌ها را مدیر در «مدیریت › اعلان‌ها» تنظیم می‌کند (پیش‌فرض‌ها در notifications.json).
// هر کس با «تنظیم اعلان‌ها» (منوی ☰ › تنظیمات، یا پیوند همین نام در هر کارت) می‌تواند روی گوشی خودش هر نوع اعلان یا هر چله را
// خاموش کند یا ساعت دیگری بگذارد (push_prefs). پس از هر ثبت‌نام، hint() همین را یادآوری می‌کند.
// برای همه روشن است، مگر مدیر «اعلان برای همه» را خاموش کند (آن‌وقت فقط ‎#admin‎ و برنامه نصب‌شده).
// سمت سرور: backend/supabase/reminders.sql و تابع backend/supabase/functions/daily-reminders.
(function () {
  const cfg = window.APP_CONFIG || {}, LS = 'quranReminder', NO = 'quranReminderNo', CHL = 'pushChl', CHLNO = 'pushChlNo', SENT = 'pushCodesSent', PREFS = 'pushPrefs', CHLMUTE = 'pushChlMute';
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // پیش‌فرض: برای همه. اگر مدیر «اعلان برای همه» را خاموش کند، فقط ‎#admin‎ و برنامه نصب‌شده (برای آزمایش روی گوشی).
  const enabled = () => window.siteSettings?.notify?.public !== false || location.hash === '#admin' || standalone;
  // برنامه ویندوز و مک (WebView) سرویس اعلان ندارد؛ آنجا کارت اعلان نشان داده نمی‌شود.
  const desktopApp = (() => { try { return sessionStorage.getItem('hezbApp') === '1' || /[?&]app=desktop\b/.test(location.search); } catch { return /[?&]app=desktop\b/.test(location.search); } })();
  const supported = !desktopApp && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!cfg.VAPID_PUBLIC_KEY;

  document.head.insertAdjacentHTML('beforeend', `<style>
.rm-card{margin-top:14px;padding:12px 16px;border-radius:var(--r-card);background:var(--mint);border:1px solid var(--gold);color:#000;text-shadow:none;line-height:1.8}
.rm-card p{margin:0 0 8px}.rm-card .rm-row{display:flex;gap:8px;flex-wrap:wrap}
.rm-card button{height:42px;font-size:16px}
.rm-card .rm-link{height:auto;padding:0;border:0;background:none;color:var(--deep);text-decoration:underline;font-weight:600}
.rm-msg{min-height:0;margin-top:6px;font-weight:700}.rm-msg:empty{display:none}
.rm-card ol,.rm-card ul{margin:4px 0 8px;padding-inline-start:22px}.rm-card ol{list-style-type:persian}
.push-codes .rm-card{margin:0 0 12px}
.ns{position:fixed;inset:0;z-index:62;display:none;align-items:flex-end;justify-content:center;background:#0009}
.ns.show{display:flex}
.ns-box{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border-top:3px solid var(--gold);border-radius:18px 18px 0 0;padding:0 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;line-height:1.8}
.ns-grip{width:44px;height:5px;border-radius:3px;background:#d9cba9;margin:10px auto 4px}
.ns-top{display:flex;align-items:flex-start;gap:8px}
.ns-top h2{flex:1;margin:4px 0 6px;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.ns-top button{flex:none;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.ns-in ul{margin:4px 0 8px;padding-inline-start:22px}
.ns-in section{margin:10px 0;padding:8px 12px;background:#fff;border:1px solid var(--line);border-radius:var(--r-card)}
.ns-in h5{margin:2px 0 4px;font-size:16px;color:var(--deep)}
.ns-in h6{margin:10px 0 0;font-size:14px;color:var(--muted)}
.ns-in label.rm-t{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed #d8e6e0;line-height:1.6;font-weight:400}
.ns-in label.rm-t:last-child{border-bottom:0}
.ns-in label.rm-t span{flex:1}.ns-in label.rm-t small{color:var(--muted)}
.ns-in input[type=checkbox]{width:20px;height:20px;flex:none;margin:0}
.ns-in input[type=time]{width:112px;height:36px;font-size:15px;padding:0 6px;direction:ltr;flex:none}
.ns-in .rm-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ns-in .rm-row button{height:46px}
.ns-in .rm-link{height:auto;padding:0;border:0;background:none;color:var(--deep);text-decoration:underline;font-weight:600}
.ns-in .ns-off{color:var(--danger)}
.ns-ok{margin:0;color:var(--ok);font-weight:700}.ns-who{margin:0 0 4px;font-size:14px;color:var(--muted)}
.ns-hint{margin:12px 0 0;padding:10px 14px;background:var(--mint);color:var(--ink);text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);text-align:right;line-height:1.8}
.ns-hint p{margin:0}.ns-hint .chs-alt,.ns-hint button{width:100%;height:46px;margin-top:8px}.ns-hint .ns-where{margin-top:6px;font-size:13px;color:var(--muted)}
body.ns-lock{overflow:hidden}
@media(max-width:600px){.rm-card .rm-row{flex-direction:column}.rm-card .rm-row button{width:100%}.ns-in .rm-row{flex-direction:column}.ns-in .rm-row button{width:100%}}
</style>`);

  // ساعت‌های اعلان (پیش‌فرض‌ها + تنظیم مدیر) برای نوشتن در متن کارت‌ها.
  let defaults = null;
  const loadDefaults = () => defaults || (defaults = fetch('notifications.json').then(r => r.json()).catch(() => ({ types: {} })));
  // ساعت‌ها فقط به شکل ‎HH:MM‎ پذیرفته می‌شوند، چون مستقیم در HTML گذاشته می‌شوند.
  const hhmm = x => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x) ? x : '';
  async function timeOf(type) {
    const d = (await loadDefaults()).types || {}, s = window.siteSettings?.notify?.types || {};
    const p = store.get(PREFS) || {}, own = !d[type]?.event && !d[type]?.same && p.times?.[type];
    const t = hhmm(own) || hhmm(s[type]?.time) || hhmm(d[type]?.time);
    return { on: s[type]?.on !== false && !!d[type] && !(p.off || []).includes(type), time: t ? toFa(+t.slice(0, 2)) + (t.slice(3) === '00' ? '' : ':' + toFa(t.slice(3))) : '' };
  }

  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const rpc = (name, body) => fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async r => { if (!r.ok) throw Error('rpc ' + r.status); const t = await r.text(); return t ? JSON.parse(t) : null; });

  let regP = null;
  const reg = () => regP || (regP = navigator.serviceWorker.register('sw.js'));
  async function currentSub() { if (!supported) return null; try { return await (await reg()).pushManager.getSubscription(); } catch { return null; } }
  async function ensureSub() {
    // روی آیفون، درخواست اجازه باید بی‌درنگ پس از لمس دکمه باشد.
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw Error(perm === 'denied' ? 'denied' : 'dismissed');
    const r = await reg(); await navigator.serviceWorker.ready;
    return await r.pushManager.getSubscription() || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.VAPID_PUBLIC_KEY) });
  }
  const keys = sub => { const k = sub.toJSON().keys; return { p_endpoint: sub.endpoint, p_p256dh: k.p256dh, p_auth: k.auth }; };
  const arr = k => { const a = store.get(k); return Array.isArray(a) ? a.filter(c => /^\d{8}$/.test(c)) : []; };
  // کدهای چله و ثبت‌نام این گوشی (اگر اعلان چله‌ها روشن باشد).
  // چله‌هایی که در «تنظیم اعلان‌ها» خاموش شده‌اند فرستاده نمی‌شوند.
  const deviceCodes = () => { const m = store.get(CHLMUTE) || []; return store.get(CHL) ? { p_chl: arr('chlCodes').filter(c => !m.includes(c)), p_reg: arr('regCodes') } : { p_chl: [], p_reg: [] }; };
  async function syncCodes(force) {
    const sub = await currentSub(); if (!sub || !enabled()) return;
    const c = deviceCodes(), sig = sub.endpoint.slice(-24) + JSON.stringify(c);
    if (!force && store.get(SENT) === sig) return;
    if (!store.get(CHL) && !store.get(SENT)) return; // این گوشی هرگز اعلان چله نداشته است.
    await rpc('push_join', { ...keys(sub), ...c });
    store.set(SENT, sig);
    await restorePrefs(sub);
  }
  // انتخاب‌های کاربر روی همین گوشی هم نگه داشته می‌شود تا اگر اشتراک دوباره ساخته شد، از دست نرود.
  const hasPrefs = p => !!p && ((p.off || []).length || Object.keys(p.times || {}).length);
  async function restorePrefs(sub) { const p = store.get(PREFS); if (hasPrefs(p)) await rpc('push_prefs', { p_endpoint: sub.endpoint, p_prefs: p }).catch(() => {}); for (const x of extras()) await x.restore?.(sub); }
  // بخش‌هایی که فایل‌های دیگر به برگه تنظیم اعلان‌ها می‌افزایند (مثلاً اعلان اذان در azan.js):
  // { offLabel(), html(), save(sub, box), restore(sub), active() }
  const extras = () => window.pushExtra || [];

  async function status() {
    const sub = await currentSub(); if (!sub) return null;
    try { return (await rpc('push_status', { p_endpoint: sub.endpoint }))?.[0] || null; } catch { return undefined; }
  }

  // ---------- حزب‌خوانی ----------
  async function subscribe(t) {
    const sub = await ensureSub();
    await rpc('push_subscribe', { ...keys(sub), p_group: t.g, p_participant: t.id });
    store.set(LS, t); store.set(NO, null);
    await restorePrefs(sub);
  }
  async function unsubscribeHezb() {
    const sub = await currentSub();
    store.set(LS, null);
    if (!sub) return;
    let left = false;
    try { left = await rpc('push_untarget', { p_endpoint: sub.endpoint }); } catch {}
    if (!left) { await sub.unsubscribe(); store.set(CHL, null); store.set(SENT, null); }
  }
  async function sendTest() {
    const sub = await currentSub(); if (!sub) throw Error('nosub');
    const r = await fetch(`${cfg.SUPABASE_URL}/functions/v1/daily-reminders?slot=test`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    if (r.status === 404) throw Error('nosub');
    if (!r.ok) throw Error('test ' + r.status);
    if (!(await r.json()).sent) throw Error('notsent');
  }

  const same = (a, b) => a && b && a.g === b.g && a.id === b.id;
  const who = s => `${esc(s.groupName || 'گروه ' + toFa(s.g))} · شناسه ${toFa(s.id)}`;
  const ERR = {
    denied: 'اجازه اعلان داده نشد. اگر اشتباهی «Block» زدید، از تنظیمات مرورگر (نماد قفل کنار آدرس سایت) اعلان‌ها را برای این سایت مجاز کنید.',
    dismissed: 'اجازه اعلان داده نشد. هر وقت خواستید دوباره دکمه را بزنید.',
    nosub: 'روی این دستگاه اعلان فعال نیست.',
    notsent: 'اعلان فرستاده نشد. چند دقیقه دیگر دوباره امتحان کنید.'
  };
  const fail = e => ERR[e && e.message] || 'انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.';
  // راهنمای آیفون و مرورگرهای بدون اعلان (مشترک دو کارت)
  const unsupportedHtml = title => isIOS && !standalone
    ? `<p><strong>${title}</strong></p><p>در آیفون، اعلان فقط وقتی کار می‌کند که سایت را به صفحه اصلی اضافه کنید:</p>
<ol><li>این صفحه را در Safari باز کنید.</li><li>دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) را بزنید.</li><li>«Add to Home Screen» یا «افزودن به صفحه اصلی» را بزنید.</li><li>سایت را از نماد تازه روی صفحه اصلی باز کنید و اعلان را از همین‌جا فعال کنید.</li></ol>`
    : `<p>این مرورگر از اعلان پشتیبانی نمی‌کند. اگر سایت را داخل تلگرام یا بله باز کرده‌اید، آن را در Chrome باز کنید تا بتوانید اعلان‌ها را فعال کنید.</p>`;

  // دکمه‌های کارت با «لطفاً صبر کنید» و پیام خطا
  function wire(box, handlers, rerender) {
    const msg = box.querySelector('.rm-msg');
    box.querySelectorAll('button[data-a]').forEach(b => b.onclick = async () => {
      const h = handlers[b.dataset.a]; if (!h) return;
      if (h.panel) return h();
      if (h.quick) { await h(); return rerender(); }
      box.querySelectorAll('button').forEach(x => x.disabled = true);
      msg.style.color = ''; msg.textContent = 'لطفاً صبر کنید…';
      try {
        const done = await h();
        if (h.stay) { msg.textContent = done; box.querySelectorAll('button').forEach(x => x.disabled = false); return; }
        await rerender(); renderStatus();
        const m2 = box.querySelector('.rm-msg'); if (m2 && done) m2.textContent = done;
      } catch (e) {
        msg.style.color = 'var(--danger)'; msg.textContent = fail(e);
        box.querySelectorAll('button').forEach(x => x.disabled = false);
      }
    });
  }
  const quick = f => Object.assign(f, { quick: true }), stay = f => Object.assign(f, { stay: true });
  const testBtn = stay(async () => { await sendTest(); return 'اعلان آزمایشی فرستاده شد (برنامه امروز همین گوشی)؛ تا چند لحظه دیگر باید برسد.'; });

  // کارت زیر سهم امروز. t = {g, id, name, groupName}
  async function render(box, t) {
    if (desktopApp) { box.innerHTML = ''; box.hidden = true; return; }
    const saved = store.get(LS), sub = await currentSub();
    if (saved && !sub) store.set(LS, null); // در خود اعلان لغو شده بود.
    const active = sub && saved;
    const [m, e] = await Promise.all([timeOf('hezb_morning'), timeOf('hezb_evening')]);
    const when = `${m.on ? `هر روز ساعت ${m.time} سهم امروز` : ''}${m.on && e.on ? '، و ' : ''}${e.on ? `ساعت ${e.time} اگر گزارش ثبت نشده باشد یک یادآوری` : ''}`;
    let html;
    if (active && same(saved, t)) {
      html = `<p>✓ یادآوری روزانه برای این شناسه فعال است: ${when}.</p>
<div class="rm-row"><button type="button" data-a="prefs" class="rm-ghost">⚙ تنظیم اعلان‌ها</button><button type="button" data-a="test" class="rm-ghost">ارسال اعلان آزمایشی</button><button type="button" data-a="off" class="rm-ghost">لغو یادآوری</button></div>`;
    } else if (!supported) {
      html = unsupportedHtml('یادآوری روزانه با اعلان');
    } else if (Notification.permission === 'denied') {
      html = `<p>${ERR.denied}</p>`;
    } else if (same(store.get(NO), t) && !active) {
      html = `<button type="button" data-a="ask" class="rm-link">یادآوری روزانه با اعلان</button>`;
    } else {
      html = `<p><strong>یادآوری روزانه؟</strong> ${when} (به وقت ایران) با اعلان می‌آید؛ یک روز پیش از شروع گروه هم خبر می‌دهیم. بعداً می‌توانید هر کدام را خاموش کنید، ساعتش را عوض کنید یا همه را لغو کنید.</p>
${active ? `<p>یادآوری الان برای ${who(saved)} فعال است و با این شناسه جایگزین می‌شود.</p>` : ''}
<div class="rm-row"><button type="button" data-a="on">بله، یادآوری کن</button><button type="button" data-a="no" class="rm-ghost">نه، ممنون</button></div>`;
    }
    box.innerHTML = html + '<div class="rm-msg" aria-live="polite"></div>';
    wire(box, {
      no: quick(async () => store.set(NO, t)), ask: quick(async () => store.set(NO, null)),
      on: async () => { await subscribe(t); return 'یادآوری فعال شد.'; },
      off: async () => { await unsubscribeHezb(); return 'یادآوری لغو شد.'; },
      test: testBtn, prefs: prefsBtn(box)
    }, () => render(box, t));
  }

  // خط وضعیت همیشگی در بخش «شناسه و سهم روزانه» تا لغو همیشه در دسترس باشد.
  async function renderStatus() {
    let el = document.getElementById('rmStatus');
    const saved = store.get(LS), sub = saved && await currentSub();
    if (saved && !sub) store.set(LS, null);
    if (!enabled() || !saved || !sub) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'rmStatus'; el.className = 'rm-card'; document.getElementById('result').before(el); }
    el.innerHTML = `<p style="margin:0">🔔 یادآوری روزانه روی این دستگاه فعال است (${who(saved)}) · <button type="button" class="rm-link" data-p>⚙ تنظیم اعلان‌ها</button> · <button type="button" class="rm-link" data-x>لغو یادآوری</button></p><div class="rm-msg" aria-live="polite"></div>`;
    el.querySelector('[data-p]').onclick = () => togglePrefs(el);
    el.querySelector('[data-x]').onclick = async () => {
      try { await unsubscribeHezb(); el.remove(); const c = document.querySelector('#result .rm-card'); if (c && c._t) render(c, c._t); }
      catch (e) { el.querySelector('.rm-msg').textContent = fail(e); }
    };
  }

  // ---------- تنظیم اعلان‌ها (منو › تنظیمات، و پیوند «تنظیم اعلان‌ها» در همه کارت‌ها) ----------
  // یک برگه برای همه چیزهایی که روی این گوشی ثبت‌نام شده: حزب‌خوانی، هر چله و دوره قرآن جداگانه، و اعمال و ختم‌ها؛
  // هر نوع اعلان با کلید روشن/خاموش و ساعت. نوعی که مدیر خاموش کرده نشان داده نمی‌شود. پیش‌فرض همان تنظیم مدیر است.
  // خاموش کردن یک چله فقط کد آن را از کدهای این گوشی کنار می‌گذارد (pushChlMute)؛ سمت سرور تغییری لازم نیست.
  const fmt = t => t ? toFa(t) : '';
  const chlList = () => { const m = (window.chlMine?.() || []).filter(x => arr('chlCodes').includes(x.code)); return m.length ? m : arr('chlCodes').map(code => ({ code })); };
  async function typeRows(g) {
    const d = (await loadDefaults()).types || {}, a = window.siteSettings?.notify?.types || {}, p = store.get(PREFS) || {};
    return Object.entries(d).filter(([k, t]) => t.group === g && a[k]?.on !== false).map(([k, t]) => {
      const base = hhmm(a[k]?.time) || hhmm(t.time), timed = !t.event && !t.same && base, mine = hhmm(p.times?.[k]) || base;
      const label = esc(String(t.label || k).replace(/^[^:]*:\s*/, ''));
      return `<label class="rm-t"><input type="checkbox" data-k="${k}"${(p.off || []).includes(k) ? '' : ' checked'}><span>${label}${timed && mine !== base ? ` <small>(پیش‌فرض ${fmt(base)})</small>` : ''}</span>${timed ? `<input type="time" data-time="${k}" data-base="${base}" value="${mine}" aria-label="ساعت">` : ''}</label>`;
    }).join('');
  }
  async function settingsHtml() {
    if (!supported) return `<div class="rm-card">${unsupportedHtml('اعلان‌ها')}</div>`;
    if (Notification.permission === 'denied') return `<div class="rm-card"><p style="margin:0">${ERR.denied}</p></div>`;
    const st = await status(), chl = chlList(), regs = arr('regCodes').length, hz = store.get(LS);
    const hasHezb = !!hz || regs > 0 || (st && st.group_number != null);
    // خطای اینترنت (نه خاموش بودن): تنظیمات کاربر پنهان نشود و دکمه «روشن کردن» نیاید
    if (st === undefined) return `<p>وضعیت اعلان‌ها دریافت نشد. اتصال اینترنت را بررسی کنید و دوباره این بخش را باز کنید.</p><div class="rm-msg" aria-live="polite"></div>`;
    if (!st) {
      const items = [hasHezb && 'حزب‌خوانی: شناسه و گروه، سهم هر روز و یادآوری گزارش', chl.length && `${chl.length > 1 ? `${toFa(chl.length)} چله و دوره شما` : 'چله یا دوره شما'}: برنامه هر روز، یادآوری «خواندم» و خبرهای دوره`, 'اعمال و ختم‌ها: نماز امام جواد (ع) و ختم یاسین', 'ادعیه: دعای سمات، کمیل و توسل', ...extras().map(x => x.offLabel?.())].filter(Boolean);
      return `<p>اعلان روی این گوشی خاموش است. با روشن کردنش این‌ها یادتان می‌آید:</p><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>
<p class="hint" style="margin:0">پس از روشن کردن، هر کدام را می‌توانید خاموش کنید یا ساعتش را عوض کنید.</p>
<div class="rm-row"><button type="button" data-n="on">🔔 روشن کردن اعلان‌ها</button></div><div class="rm-msg" aria-live="polite"></div>`;
    }
    const muted = store.get(CHLMUTE) || [], chlOn = !!store.get(CHL);
    let html = '<p class="ns-ok">✓ اعلان روی این گوشی روشن است.</p>';
    if (hasHezb) {
      const rows = await typeRows('hezb');
      html += `<section><h5>📖 حزب‌خوانی</h5>${hz ? `<p class="ns-who">یادآوری روزانه برای ${who(hz)}</p>` : `<p class="ns-who">برای یادآوری سهم هر روز، شناسه خود را در «سهم امروز من» ببینید و «بله، یادآوری کن» را بزنید.</p>`}${rows}</section>`;
    }
    if (chl.length) {
      const rows = await typeRows('chl');
      html += `<section><h5>📿 چله‌ها و دوره‌های قرآن من</h5>${chl.map(m => `<label class="rm-t"><input type="checkbox" data-c="${m.code}"${chlOn && !muted.includes(m.code) ? ' checked' : ''}><span><b>${esc(m.title || 'کد ' + toFa(m.code))}</b>${m.name ? ` <small>${esc(m.name)}</small>` : ''}</span></label>`).join('')}
${rows ? `<h6>چه اعلان‌هایی بیاید</h6>${rows}` : ''}</section>`;
    }
    const ib = await typeRows('ibadat');
    if (ib) html += `<section><h5>🤲 اعمال و ختم‌ها</h5>${ib}</section>`;
    const doa = await typeRows('doa');
    if (doa) html += `<section><h5>📿 ادعیه</h5>${doa}</section>`;
    for (const x of extras()) html += (await x.html?.()) || '';
    return html + `<p class="hint" style="margin:8px 0 0">ساعت‌ها به وقت ایران است.</p>
<div class="rm-row"><button type="button" data-n="save">ذخیره</button><button type="button" data-n="test" class="rm-ghost">اعلان آزمایشی</button><button type="button" data-n="reset" class="rm-ghost">بازگشت به پیش‌فرض</button></div>
<div class="rm-msg" aria-live="polite"></div>
<p style="margin:14px 0 0"><button type="button" class="rm-link ns-off" data-n="alloff">خاموش کردن همه اعلان‌ها روی این گوشی</button></p>`;
  }
  async function savePrefs(next) {
    const sub = await currentSub(); if (!sub) throw Error('nosub');
    const saved = await rpc('push_prefs', { p_endpoint: sub.endpoint, p_prefs: next });
    if (saved === null) throw Error('nosub');
    store.set(PREFS, hasPrefs(saved) ? saved : null);
  }
  let sheet = null;
  function buildSheet() {
    if (sheet) return sheet;
    sheet = document.createElement('div'); sheet.className = 'ns'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'تنظیم اعلان‌ها');
    sheet.innerHTML = '<div class="ns-box"><div class="ns-grip"></div><div class="ns-top"><h2>تنظیم اعلان‌ها</h2><button type="button" data-n="close" aria-label="بستن">✕</button></div><div class="ns-in"></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => { if (e.target === sheet) closeSettings(); });
    window.addEventListener('popstate', () => { if (sheet.classList.contains('show') && !history.state?.ns) closeSettings(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('show')) { e.stopImmediatePropagation(); closeSettings(); } }, true);
    return sheet;
  }
  async function refreshAll() {
    const r = document.querySelector('#result .rm-card');
    await Promise.all([renderStatus(), renderCodes('chl'), renderCodes('reg'), r && r._t && render(r, r._t)]);
    document.dispatchEvent(new Event('push:changed'));
  }
  async function renderSettings(note) {
    const box = sheet.querySelector('.ns-in');
    box.innerHTML = await settingsHtml();
    const msg = box.querySelector('.rm-msg');
    if (msg && note) msg.textContent = note;
    const run = f => async () => {
      box.querySelectorAll('button').forEach(x => x.disabled = true); msg.style.color = ''; msg.textContent = 'لطفاً صبر کنید…';
      try { const t = await f(); if (t !== false) await renderSettings(t); else { box.querySelectorAll('button').forEach(x => x.disabled = false); if (msg.textContent === 'لطفاً صبر کنید…') msg.textContent = ''; } } catch (e) { msg.style.color = 'var(--danger)'; msg.textContent = fail(e); box.querySelectorAll('button').forEach(x => x.disabled = false); }
    };
    const on = (k, f) => { const b = box.querySelector(`[data-n=${k}]`); if (b) b.onclick = run(f); };
    on('on', async () => {
      const sub = await ensureSub();
      store.set(CHL, true); store.set(CHLNO, null);
      const c = deviceCodes();
      await rpc('push_join', { ...keys(sub), ...c });
      store.set(SENT, sub.endpoint.slice(-24) + JSON.stringify(c));
      await restorePrefs(sub); await refreshAll();
      return 'اعلان روشن شد. هر کدام را که نمی‌خواهید خاموش کنید یا ساعتش را عوض کنید.';
    });
    on('test', async () => { await sendTest(); msg.textContent = 'اعلان آزمایشی فرستاده شد؛ تا چند لحظه دیگر باید برسد.'; box.querySelectorAll('button').forEach(x => x.disabled = false); return false; });
    on('reset', async () => { await savePrefs({}); await refreshAll(); return 'اعلان‌ها به تنظیم پیش‌فرض برگشت.'; });
    on('save', async () => {
      const prev = store.get(PREFS) || {}, off = (prev.off || []).filter(k => !box.querySelector(`[data-k="${k}"]`)), times = {};
      box.querySelectorAll('[data-k]').forEach(c => { if (!c.checked) off.push(c.dataset.k); });
      // ساعت نوع‌هایی که اینجا نیست (مثلاً حزب‌خوانی وقتی فقط چله دارد) دست نمی‌خورد.
      Object.entries(prev.times || {}).forEach(([k, v]) => { if (!box.querySelector(`[data-time="${k}"]`)) times[k] = v; });
      box.querySelectorAll('[data-time]').forEach(i => { if (/^\d\d:\d\d$/.test(i.value) && i.value !== i.dataset.base) times[i.dataset.time] = i.value; });
      const cs = [...box.querySelectorAll('[data-c]')];
      if (cs.length) {
        store.set(CHLMUTE, cs.filter(c => !c.checked).map(c => c.dataset.c));
        if (cs.some(c => c.checked)) store.set(CHL, true);
      }
      await syncCodes(true);
      await savePrefs({ off, times });
      const s2 = await currentSub(); for (const x of extras()) await x.save?.(s2, box);
      await refreshAll();
      return 'تنظیم اعلان‌ها ذخیره شد.';
    });
    on('alloff', async () => {
      if (!confirm('همه اعلان‌های این گوشی خاموش شود؟')) return false;
      const sub = await currentSub();
      if (sub) { await rpc('push_unsubscribe', { p_endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
      [LS, CHL, SENT].forEach(k => store.set(k, null));
      await refreshAll();
      return 'همه اعلان‌های این گوشی خاموش شد.';
    });
  }
  async function openSettings() {
    buildSheet();
    sheet.classList.add('show'); document.body.classList.add('ns-lock');
    try { if (!history.state?.ns) history.pushState({ ns: 1 }, ''); } catch {}
    sheet.querySelector('.ns-in').innerHTML = '<p>لطفاً صبر کنید…</p>';
    sheet.querySelector('[data-n=close]').onclick = () => closeSettings();
    await renderSettings();
  }
  function closeSettings(fromHistory) {
    if (!sheet?.classList.contains('show')) return;
    sheet.classList.remove('show'); document.body.classList.remove('ns-lock');
    if (!fromHistory) { try { if (history.state?.ns) history.back(); } catch {} }
  }
  const togglePrefs = () => openSettings();
  const prefsBtn = () => Object.assign(async () => openSettings(), { panel: true });
  document.addEventListener('click', e => { if (e.target.closest('[data-ns-open]')) openSettings(); });

  // پس از هر ثبت‌نام (چله، دوره قرآن، حزب‌خوانی): یادآوری که اعلان‌ها را می‌شود روشن یا تنظیم کرد.
  function hint() {
    if (!enabled() || desktopApp) return '';
    const on = !!store.get(CHL);
    return `<div class="ns-hint"><p>🔔 ${on ? 'خبر این ثبت‌نام با اعلان روی همین گوشی می‌آید. چه اعلان‌هایی و چه ساعتی بیاید را خودتان انتخاب کنید.' : 'می‌خواهید برنامه هر روز، یادآوری‌ها و خبرهای این ثبت‌نام با اعلان روی همین گوشی بیاید؟'}</p>
<button type="button" class="chs-alt" data-ns-open>⚙ ${on ? 'تنظیم اعلان‌ها' : 'روشن کردن و تنظیم اعلان‌ها'}</button><p class="ns-where">هر وقت خواستید: منوی ☰ › تنظیمات › تنظیم اعلان‌ها</p></div>`;
  }

  window.siteMenu?.section({
    id: 'settings', order: 89,
    render(box) {
      // «نمایش امکانات» (features.js) و «اندازه متن و حالت تاریک» (comfort.js) هم در همین دسته است.
      const ft = (window.features?.menuItem() || '') + (window.comfort?.menuItem() || '');
      if ((!enabled() || desktopApp) && !ft) return;
      const parts = [(store.get(LS) || arr('regCodes').length) && 'حزب‌خوانی', arr('chlCodes').length && 'چله‌ها و دوره‌ها', 'اعمال و ختم‌ها'].filter(Boolean);
      box.innerHTML = '<h3>تنظیمات</h3>' + (!enabled() || desktopApp ? '' : `<button type="button" class="sm-item" data-ns-menu><span class="sm-ic">⚙️</span><span>تنظیم اعلان‌ها<small>چه اعلانی و چه ساعتی: ${parts.join('، ')}</small></span><span class="sm-go">‹</span></button>`) + ft;
      const ns = box.querySelector('[data-ns-menu]'); if (ns) ns.onclick = () => { window.siteMenu.close(); setTimeout(openSettings, 280); };
    }
  });

  // ---------- چله، دوره‌های قرآن و ثبت‌نام حزب‌خوانی ----------
  // یک کارت در «چله‌های من» و یکی در «ثبت‌نام‌های من»؛ هر دو همان یک اشتراک (کدهای این گوشی) را روشن یا خاموش می‌کنند.
  const HOSTS = {
    chl: { panel: 'chellehPanel', after: '.chl-head', codes: 'chlCodes', title: 'یادآوری چله‌ها با اعلان؟', short: 'یادآوری چله با اعلان', on: 'اعلان چله‌ها روی این گوشی فعال است' },
    reg: { panel: 'registerPanel', after: '#regMine > h3', codes: 'regCodes', title: 'خبر شناسه و شروع گروه با اعلان؟', short: 'خبر شناسه و شروع گروه با اعلان', on: 'اعلان ثبت‌نام روی این گوشی فعال است' }
  };
  async function renderCodes(where) {
    const h = HOSTS[where], panel = document.getElementById(h.panel), id = 'push-' + where;
    let box = document.getElementById(id);
    const anchor = panel && panel.querySelector(h.after);
    if (!panel || panel.hidden || !anchor || !enabled() || desktopApp || !arr(h.codes).length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = id; box.className = 'push-codes'; }
    if (anchor.nextElementSibling !== box) anchor.after(box);
    const sub = await currentSub();
    if (store.get(CHL) && !sub) { store.set(CHL, null); store.set(SENT, null); }
    const on = !!(sub && store.get(CHL));
    const [d, e, t, r] = await Promise.all(['chl_daily', 'chl_evening', 'chl_tomorrow', 'hezb_ready'].map(timeOf));
    let html;
    if (on) {
      const what = where === 'chl' ? `${d.on ? `: هر روز ساعت ${d.time} برنامه امروز` : ''}${e.on ? `، ساعت ${e.time} یادآوری «خواندم»` : ''}` : '';
      html = `<div class="rm-card"><p style="margin:0">🔔 ${h.on}${what}. · <button type="button" class="rm-link" data-a="prefs">⚙ تنظیم اعلان‌ها</button>${where === 'chl' ? ' · <button type="button" class="rm-link" data-a="test">اعلان آزمایشی</button>' : ''} · <button type="button" class="rm-link" data-a="off">لغو</button></p><div class="rm-msg" aria-live="polite"></div></div>`;
    } else if (!supported) {
      html = `<div class="rm-card">${unsupportedHtml(h.short)}</div>`;
    } else if (Notification.permission === 'denied') {
      html = `<div class="rm-card"><p style="margin:0">${ERR.denied}</p></div>`;
    } else if (store.get(CHLNO)) {
      html = `<p style="margin:0 0 10px"><button type="button" class="rm-link" data-a="ask" style="height:auto;padding:0;border:0;background:none;color:inherit;text-decoration:underline">🔔 ${h.short}</button></p><div class="rm-msg"></div>`;
    } else {
      const items = where === 'chl'
        ? [d.on && `هر روز ساعت ${d.time}: برنامه امروز، مثلاً «روز ۵ از ۴۰» یا «جزء ۷ قرآن»`, e.on && `ساعت ${e.time}: اگر «خواندم» را نزده‌اید، یک یادآوری`, t.on && `شب پیش از شروع${t.time ? ` (ساعت ${t.time})` : ''}: «چله شما فردا شروع می‌شود»`, 'رسیدن جا از فهرست رزرو و خبرهای تازه دوره']
        : [r.on && 'وقتی گروه کامل شد: شناسه شما، نام گروه و تاریخ شروع', 'اگر از فهرست رزرو به گروه آمدید', 'سپس هر روز سهم امروز و یادآوری گزارش (قابل لغو)'];
      html = `<div class="rm-card"><p><strong>${h.title}</strong></p><ul>${items.filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul><p>بعداً با «تنظیم اعلان‌ها» می‌توانید هر کدام را خاموش کنید یا ساعتش را عوض کنید.</p>
<div class="rm-row"><button type="button" data-a="on">بله، خبرم کن</button><button type="button" data-a="no" class="rm-ghost">نه، ممنون</button></div><div class="rm-msg" aria-live="polite"></div></div>`;
    }
    box.innerHTML = html;
    const both = () => Promise.all([renderCodes('chl'), renderCodes('reg')]);
    wire(box, {
      no: quick(async () => store.set(CHLNO, true)), ask: quick(async () => store.set(CHLNO, null)),
      on: async () => { await ensureSub(); store.set(CHL, true); store.set(CHLNO, null); await syncCodes(true); return 'اعلان فعال شد.'; },
      off: async () => {
        const s2 = await currentSub(); store.set(CHL, null);
        if (s2) { await syncCodes(true); const st = await status(); if (st && st.group_number == null && !extras().some(x => x.active?.())) { await rpc('push_unsubscribe', { p_endpoint: s2.endpoint }); await s2.unsubscribe(); } }
        store.set(SENT, null);
        return 'اعلان لغو شد.';
      },
      test: testBtn, prefs: prefsBtn(box)
    }, both);
  }
  const renderChl = () => { renderCodes('chl'); renderCodes('reg'); };

  document.addEventListener('task:shown', e => {
    if (!enabled() || typeof selected === 'undefined' || !selected) return;
    const t = { g: selected.number, id: e.detail.id, name: selected.names[e.detail.id - 1], groupName: selected.name };
    const box = document.createElement('div');
    box.className = 'rm-card'; box._t = t;
    document.getElementById('result').appendChild(box);
    render(box, t);
  });
  // چله‌های من دوباره ساخته شد (ثبت‌نام، انصراف، کد تازه): کارت اعلان و کدهای اشتراک به‌روز می‌شود.
  document.addEventListener('chl:panel', () => { renderCodes('chl'); syncCodes().catch(() => {}); });
  document.addEventListener('reg:mine', () => { renderCodes('reg'); syncCodes().catch(() => {}); });
  document.addEventListener('settings:changed', () => { renderStatus(); renderChl(); });
  window.addEventListener('hashchange', () => { renderStatus(); renderChl(); });
  renderStatus();
  window.sitePush = { syncCodes, status, enabled, supported, togglePrefs, openSettings, hint };

  // پیوند اعلان (?g=1&id=5): گروه و شناسه را خودکار پر می‌کند و سهم امروز و بخش گزارش را آماده می‌کند.
  const q = new URLSearchParams(location.search), qg = +q.get('g'), qid = +q.get('id');
  if (qg > 0 && qid >= 1 && qid <= 120) {
    let tries = 0;
    const fill = () => {
      const b = document.querySelector(`#groupsNav button[data-n="${qg}"]`);
      if (!b) { if (++tries < 50) setTimeout(fill, 200); return; }
      b.click();
      pid.value = toFa(qid); showTask.click();
      reportId.value = toFa(qid); verifyReportId.click();
    };
    fill();
  }
})();
