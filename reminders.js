// اعلان‌های سایت روی این گوشی (Web Push):
// - حزب‌خوانی: پس از «نمایش سهم امروز» پیشنهاد می‌شود؛ هر روز سهم امروز، و عصر اگر گزارش ثبت نشده یادآوری.
// - چله و دوره‌های قرآن (جزء، صفحه): کارت بالای «چله‌های من»؛ برنامه امروز (مثلاً «جزء ۷»)، شروع از فردا، یادآوری «خواندم»،
//   رسیدن جا از فهرست رزرو و خبر تازه دوره. کدهای ثبت‌نام حزب‌خوانی هم همراهش می‌رود تا اعلام شناسه و گروه خبر داده شود.
// ساعت‌ها و متن‌ها را مدیر در «مدیریت › اعلان‌ها» تنظیم می‌کند (پیش‌فرض‌ها در notifications.json).
// تا مدیر «اعلان برای همه» را روشن نکرده، فقط در ‎#admin‎ و برنامه نصب‌شده دیده می‌شود.
// سمت سرور: backend/supabase/reminders.sql و تابع backend/supabase/functions/daily-reminders.
(function () {
  const cfg = window.APP_CONFIG || {}, LS = 'quranReminder', NO = 'quranReminderNo', CHL = 'pushChl', CHLNO = 'pushChlNo', SENT = 'pushCodesSent';
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // پیش از انتشار عمومی، نسخه نصب‌شده روی صفحه اصلی (که نشانی #admin ندارد) هم اعلان را نشان می‌دهد تا روی گوشی آزمایش شود.
  const enabled = () => !!window.siteSettings?.notify?.public || location.hash === '#admin' || standalone;
  // برنامه ویندوز و مک (WebView) سرویس اعلان ندارد؛ آنجا کارت اعلان نشان داده نمی‌شود.
  const desktopApp = (() => { try { return sessionStorage.getItem('hezbApp') === '1' || /[?&]app=desktop\b/.test(location.search); } catch { return /[?&]app=desktop\b/.test(location.search); } })();
  const supported = !desktopApp && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!cfg.VAPID_PUBLIC_KEY;

  document.head.insertAdjacentHTML('beforeend', `<style>
.rm-card{margin-top:14px;padding:12px 16px;background:#e7f5f0;border:1px solid var(--gold);color:#000;text-shadow:none;line-height:1.8}
.rm-card p{margin:0 0 8px}.rm-card .rm-row{display:flex;gap:8px;flex-wrap:wrap}
.rm-card button{height:42px;font-size:16px}.rm-card .rm-ghost{background:#fff;color:var(--deep)}
.rm-card .rm-link{height:auto;padding:0;border:0;background:none;color:var(--deep);text-decoration:underline;font-weight:600}
.rm-msg{min-height:0;margin-top:6px;font-weight:700}.rm-msg:empty{display:none}
.rm-card ol,.rm-card ul{margin:4px 0 8px;padding-inline-start:22px}.rm-card ol{list-style-type:persian}
.push-codes .rm-card{margin:0 0 12px}
@media(max-width:600px){.rm-card .rm-row{flex-direction:column}.rm-card .rm-row button{width:100%}}
</style>`);

  // ساعت‌های اعلان (پیش‌فرض‌ها + تنظیم مدیر) برای نوشتن در متن کارت‌ها.
  let defaults = null;
  const loadDefaults = () => defaults || (defaults = fetch('notifications.json').then(r => r.json()).catch(() => ({ types: {} })));
  async function timeOf(type) {
    const d = (await loadDefaults()).types || {}, s = window.siteSettings?.notify?.types || {};
    const t = s[type]?.time || d[type]?.time || '';
    return { on: s[type]?.on !== false && !!d[type], time: t ? toFa(+t.slice(0, 2)) + (t.slice(3) === '00' ? '' : ':' + toFa(t.slice(3))) : '' };
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
  const deviceCodes = () => store.get(CHL) ? { p_chl: arr('chlCodes'), p_reg: arr('regCodes') } : { p_chl: [], p_reg: [] };
  async function syncCodes(force) {
    const sub = await currentSub(); if (!sub || !enabled()) return;
    const c = deviceCodes(), sig = sub.endpoint.slice(-24) + JSON.stringify(c);
    if (!force && store.get(SENT) === sig) return;
    if (!store.get(CHL) && !store.get(SENT)) return; // این گوشی هرگز اعلان چله نداشته است.
    await rpc('push_join', { ...keys(sub), ...c });
    store.set(SENT, sig);
  }
  async function status() {
    const sub = await currentSub(); if (!sub) return null;
    try { return (await rpc('push_status', { p_endpoint: sub.endpoint }))?.[0] || null; } catch { return undefined; }
  }

  // ---------- حزب‌خوانی ----------
  async function subscribe(t) {
    const sub = await ensureSub();
    await rpc('push_subscribe', { ...keys(sub), p_group: t.g, p_participant: t.id });
    store.set(LS, t); store.set(NO, null);
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
      if (h.quick) { await h(); return rerender(); }
      box.querySelectorAll('button').forEach(x => x.disabled = true);
      msg.style.color = ''; msg.textContent = 'لطفاً صبر کنید…';
      try {
        const done = await h();
        if (h.stay) { msg.textContent = done; box.querySelectorAll('button').forEach(x => x.disabled = false); return; }
        await rerender(); renderStatus();
        const m2 = box.querySelector('.rm-msg'); if (m2 && done) m2.textContent = done;
      } catch (e) {
        msg.style.color = '#9b2636'; msg.textContent = fail(e);
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
<div class="rm-row"><button type="button" data-a="off" class="rm-ghost">لغو یادآوری</button><button type="button" data-a="test" class="rm-ghost">ارسال اعلان آزمایشی</button></div>`;
    } else if (!supported) {
      html = unsupportedHtml('یادآوری روزانه با اعلان');
    } else if (Notification.permission === 'denied') {
      html = `<p>${ERR.denied}</p>`;
    } else if (same(store.get(NO), t) && !active) {
      html = `<button type="button" data-a="ask" class="rm-link">یادآوری روزانه با اعلان</button>`;
    } else {
      html = `<p><strong>یادآوری روزانه؟</strong> ${when} (به وقت ایران) با اعلان می‌آید؛ یک روز پیش از شروع گروه هم خبر می‌دهیم. هر زمان بخواهید می‌توانید لغو کنید.</p>
${active ? `<p>یادآوری الان برای ${who(saved)} فعال است و با این شناسه جایگزین می‌شود.</p>` : ''}
<div class="rm-row"><button type="button" data-a="on">بله، یادآوری کن</button><button type="button" data-a="no" class="rm-ghost">نه، ممنون</button></div>`;
    }
    box.innerHTML = html + '<div class="rm-msg" aria-live="polite"></div>';
    wire(box, {
      no: quick(async () => store.set(NO, t)), ask: quick(async () => store.set(NO, null)),
      on: async () => { await subscribe(t); return 'یادآوری فعال شد.'; },
      off: async () => { await unsubscribeHezb(); return 'یادآوری لغو شد.'; },
      test: testBtn
    }, () => render(box, t));
  }

  // خط وضعیت همیشگی در بخش «شناسه و سهم روزانه» تا لغو همیشه در دسترس باشد.
  async function renderStatus() {
    let el = document.getElementById('rmStatus');
    const saved = store.get(LS), sub = saved && await currentSub();
    if (saved && !sub) store.set(LS, null);
    if (!enabled() || !saved || !sub) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'rmStatus'; el.className = 'rm-card'; document.getElementById('result').before(el); }
    el.innerHTML = `<p style="margin:0">🔔 یادآوری روزانه روی این دستگاه فعال است (${who(saved)}) · <button type="button" class="rm-link">لغو یادآوری</button></p><div class="rm-msg" aria-live="polite"></div>`;
    el.querySelector('button').onclick = async () => {
      try { await unsubscribeHezb(); el.remove(); const c = document.querySelector('#result .rm-card'); if (c && c._t) render(c, c._t); }
      catch (e) { el.querySelector('.rm-msg').textContent = fail(e); }
    };
  }

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
      html = `<div class="rm-card"><p style="margin:0">🔔 ${h.on}${what}. · <button type="button" class="rm-link" data-a="off">لغو</button>${where === 'chl' ? ' · <button type="button" class="rm-link" data-a="test">اعلان آزمایشی</button>' : ''}</p><div class="rm-msg" aria-live="polite"></div></div>`;
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
      html = `<div class="rm-card"><p><strong>${h.title}</strong></p><ul>${items.filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul>
<div class="rm-row"><button type="button" data-a="on">بله، خبرم کن</button><button type="button" data-a="no" class="rm-ghost">نه، ممنون</button></div><div class="rm-msg" aria-live="polite"></div></div>`;
    }
    box.innerHTML = html;
    const both = () => Promise.all([renderCodes('chl'), renderCodes('reg')]);
    wire(box, {
      no: quick(async () => store.set(CHLNO, true)), ask: quick(async () => store.set(CHLNO, null)),
      on: async () => { await ensureSub(); store.set(CHL, true); store.set(CHLNO, null); await syncCodes(true); return 'اعلان فعال شد.'; },
      off: async () => {
        const s2 = await currentSub(); store.set(CHL, null);
        if (s2) { await syncCodes(true); const st = await status(); if (st && st.group_number == null) { await rpc('push_unsubscribe', { p_endpoint: s2.endpoint }); await s2.unsubscribe(); } }
        store.set(SENT, null);
        return 'اعلان لغو شد.';
      },
      test: testBtn
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
  window.sitePush = { syncCodes, status, enabled, supported };

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
