// یادآوری روزانه با اعلان مرورگر: پس از «نمایش سهم امروز» پیشنهاد می‌شود؛ ساعت ۱۰ صبح سهم روز و ساعت ۷ عصر (اگر گزارش ثبت نشده) یادآوری.
// فعلاً فقط در نمای پیش‌نمایش مدیر (آدرس با ‎#admin‎)؛ برای انتشار عمومی، PREVIEW_ONLY را false کنید.
// سمت سرور: backend/supabase/reminders.sql و تابع backend/supabase/functions/daily-reminders.
(function () {
  const PREVIEW_ONLY = true;
  const cfg = window.APP_CONFIG || {}, LS = 'quranReminder', NO = 'quranReminderNo';
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // در پیش‌نمایش، نسخه نصب‌شده روی صفحه اصلی (که نشانی #admin ندارد) هم یادآوری را نشان می‌دهد تا روی آیفون آزمایش شود.
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin' || standalone;
  // برنامه ویندوز و مک (WebView) سرویس اعلان ندارد؛ آنجا کارت یادآوری نشان داده نمی‌شود.
  const desktopApp = (() => { try { return sessionStorage.getItem('hezbApp') === '1' || /[?&]app=desktop\b/.test(location.search); } catch { return /[?&]app=desktop\b/.test(location.search); } })();
  const supported = !desktopApp && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!cfg.VAPID_PUBLIC_KEY;

  document.head.insertAdjacentHTML('beforeend', `<style>
.rm-card{margin-top:14px;padding:12px 16px;background:#e7f5f0;border:1px solid var(--gold);color:#000;text-shadow:none;line-height:1.8}
.rm-card p{margin:0 0 8px}.rm-card .rm-row{display:flex;gap:8px;flex-wrap:wrap}
.rm-card button{height:42px;font-size:16px}.rm-card .rm-ghost{background:#fff;color:var(--deep)}
.rm-card .rm-link{height:auto;padding:0;border:0;background:none;color:var(--deep);text-decoration:underline;font-weight:600}
.rm-msg{min-height:0;margin-top:6px;font-weight:700}.rm-msg:empty{display:none}
.rm-card ol{margin:4px 0 8px;padding-inline-start:22px;list-style-type:persian}
@media(max-width:600px){.rm-card .rm-row{flex-direction:column}.rm-card .rm-row button{width:100%}}
</style>`);

  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const rpc = (name, body) => fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw Error('rpc ' + r.status); });

  let regP = null;
  const reg = () => regP || (regP = navigator.serviceWorker.register('sw.js'));
  async function currentSub() { if (!supported) return null; try { return await (await reg()).pushManager.getSubscription(); } catch { return null; } }

  async function subscribe(t) {
    // روی آیفون، درخواست اجازه باید بی‌درنگ پس از لمس دکمه باشد.
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw Error(perm === 'denied' ? 'denied' : 'dismissed');
    const r = await reg(); await navigator.serviceWorker.ready;
    const sub = await r.pushManager.getSubscription() || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.VAPID_PUBLIC_KEY) });
    const k = sub.toJSON().keys;
    await rpc('push_subscribe', { p_endpoint: sub.endpoint, p_p256dh: k.p256dh, p_auth: k.auth, p_group: t.g, p_participant: t.id });
    store.set(LS, t); store.set(NO, null);
  }
  async function unsubscribe() {
    const sub = await currentSub();
    if (sub) { try { await rpc('push_unsubscribe', { p_endpoint: sub.endpoint }); } catch {} await sub.unsubscribe(); }
    store.set(LS, null);
  }
  async function sendTest() {
    const sub = await currentSub(); if (!sub) throw Error('nosub');
    const r = await fetch(`${cfg.SUPABASE_URL}/functions/v1/daily-reminders?slot=test`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    if (!r.ok) throw Error('test ' + r.status);
    if (!(await r.json()).sent) throw Error('notsent');
  }

  const same = (a, b) => a && b && a.g === b.g && a.id === b.id;
  const who = s => `${esc(s.groupName || 'گروه ' + toFa(s.g))} · شناسه ${toFa(s.id)}`;
  const ERR = {
    denied: 'اجازه اعلان داده نشد. اگر اشتباهی «Block» زدید، از تنظیمات مرورگر (نماد قفل کنار آدرس سایت) اعلان‌ها را برای این سایت مجاز کنید.',
    dismissed: 'اجازه اعلان داده نشد. هر وقت خواستید دوباره دکمه را بزنید.',
    nosub: 'روی این دستگاه یادآوری فعال نیست.',
    notsent: 'اعلان فرستاده نشد: دوره این گروه هنوز شروع نشده یا گروه در فهرست سایت نیست.'
  };
  const fail = e => ERR[e && e.message] || 'انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.';

  // کارت زیر سهم امروز. t = {g, id, name, groupName}
  async function render(box, t) {
    if (desktopApp) { box.innerHTML = ''; box.hidden = true; return; }
    const saved = store.get(LS), sub = await currentSub();
    if (saved && !sub) store.set(LS, null); // در خود اعلان لغو شده بود.
    const active = sub && saved;
    let html;
    if (active && same(saved, t)) {
      html = `<p>✓ یادآوری روزانه برای این شناسه فعال است: ساعت ۱۰ صبح سهم روز، و ساعت ۷ عصر اگر گزارش ثبت نشده باشد.</p>
<div class="rm-row"><button type="button" data-a="off" class="rm-ghost">لغو یادآوری</button><button type="button" data-a="test" class="rm-ghost">ارسال اعلان آزمایشی</button></div>`;
    } else if (!supported && isIOS && !standalone) {
      html = `<p><strong>یادآوری روزانه با اعلان</strong></p><p>در آیفون، اعلان فقط وقتی کار می‌کند که سایت را به صفحه اصلی اضافه کنید:</p>
<ol><li>این صفحه را در Safari باز کنید.</li><li>دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) را بزنید.</li><li>«Add to Home Screen» یا «افزودن به صفحه اصلی» را بزنید.</li><li>سایت را از نماد تازه روی صفحه اصلی باز کنید، شناسه را بزنید و یادآوری را فعال کنید.</li></ol>`;
    } else if (!supported) {
      html = `<p>این مرورگر از اعلان پشتیبانی نمی‌کند. اگر سایت را داخل تلگرام یا بله باز کرده‌اید، آن را در Chrome باز کنید تا بتوانید یادآوری روزانه را فعال کنید.</p>`;
    } else if (Notification.permission === 'denied') {
      html = `<p>${ERR.denied}</p>`;
    } else if (same(store.get(NO), t) && !active) {
      html = `<button type="button" data-a="ask" class="rm-link">یادآوری روزانه با اعلان</button>`;
    } else {
      html = `<p><strong>یادآوری روزانه؟</strong> هر روز ساعت ۱۰ صبح (به وقت ایران) سهم امروزتان را با اعلان می‌فرستیم، و اگر تا ساعت ۷ عصر گزارش ثبت نشده بود، دوباره یادآوری می‌کنیم. هر زمان بخواهید می‌توانید لغو کنید.</p>
${active ? `<p>یادآوری الان برای ${who(saved)} فعال است و با این شناسه جایگزین می‌شود.</p>` : ''}
<div class="rm-row"><button type="button" data-a="on">بله، یادآوری کن</button><button type="button" data-a="no" class="rm-ghost">نه، ممنون</button></div>`;
    }
    box.innerHTML = html + '<div class="rm-msg" aria-live="polite"></div>';
    const msg = box.querySelector('.rm-msg');
    box.querySelectorAll('button[data-a]').forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'no') { store.set(NO, t); return render(box, t); }
      if (a === 'ask') { store.set(NO, null); return render(box, t); }
      box.querySelectorAll('button').forEach(x => x.disabled = true);
      msg.style.color = ''; msg.textContent = 'لطفاً صبر کنید…';
      try {
        if (a === 'on') await subscribe(t);
        if (a === 'off') await unsubscribe();
        if (a === 'test') { await sendTest(); msg.textContent = 'اعلان آزمایشی فرستاده شد؛ تا چند لحظه دیگر باید برسد.'; box.querySelectorAll('button').forEach(x => x.disabled = false); return; }
        await render(box, t); renderStatus();
        box.querySelector('.rm-msg').textContent = a === 'on' ? 'یادآوری فعال شد.' : 'یادآوری لغو شد.';
      } catch (e) {
        msg.style.color = '#9b2636'; msg.textContent = fail(e);
        box.querySelectorAll('button').forEach(x => x.disabled = false);
      }
    });
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
      try { await unsubscribe(); el.remove(); const c = document.querySelector('#result .rm-card'); if (c && c._t) render(c, c._t); }
      catch (e) { el.querySelector('.rm-msg').textContent = fail(e); }
    };
  }

  document.addEventListener('task:shown', e => {
    if (!enabled() || typeof selected === 'undefined' || !selected) return;
    const t = { g: selected.number, id: e.detail.id, name: selected.names[e.detail.id - 1], groupName: selected.name };
    const box = document.createElement('div');
    box.className = 'rm-card'; box._t = t;
    document.getElementById('result').appendChild(box);
    render(box, t);
  });
  window.addEventListener('hashchange', renderStatus);
  renderStatus();

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
