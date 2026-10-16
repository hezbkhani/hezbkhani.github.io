// مدیریت › اعلان‌ها: روشن/خاموش کردن اعلان برای همه، روشن/خاموش، ساعت و متن هر نوع اعلان، ساعت سکوت شب،
// نمونه هر اعلان روی گوشی مدیر، پیام همگانی، و آمار ارسال. تنظیمات در site_settings با کلید notify ذخیره می‌شود
// و پیش‌فرض‌ها در notifications.json است. ارسال را تابع daily-reminders انجام می‌دهد. به admin.js و reminders.js نیاز دارد.
(function () {
  const cfg = window.APP_CONFIG || {};
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const VARS = {
    hezb: '{name} نام، {task} سهم امروز، {group} نام گروه، {id} شناسه، {date} تاریخ شروع',
    ibadat: '{night} شب چندم ختم (اول تا چهارم)، {task} برنامه آن شب (مثلاً «دو بار سوره یاسین، هدیه به حضرت ابوالفضل العباس (ع)»)',
    chl: '{name} نام، {course} نام چله یا دوره، {task} برنامه امروز (مثلاً «جزء ۷ قرآن»)، {day} روز چندم، {days} چند روز، {left} روزهای مانده، {date} تاریخ شروع، {news} متن خبر'
  };
  let defaults = null, built = false;

  document.head.insertAdjacentHTML('beforeend', `<style>
.ntf-type{border-top:1px solid #f0e8d6;padding:10px 0}.ntf-type:first-of-type{border-top:0}
.ntf-type .ntf-top{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.ntf-type .ntf-top label{margin:0;display:flex;gap:8px;align-items:center;font-weight:700}
.ntf-type input[type=checkbox]{width:20px;height:20px;margin:0}
.ntf-type input[type=time]{width:10em;min-width:150px;height:38px;direction:ltr;text-align:left}
.ntf-type input[type=text]{width:100%;margin-top:6px}
.ntf-type textarea{min-height:64px!important;margin-top:6px}
.ntf-type.off .ntf-fields{opacity:.45}
.ntf-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.ntf-tools button{height:34px;font-size:14px;padding:0 10px}
.ntf-stat{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0}.ntf-stat span{background:#f6f1e4;border:1px solid #e8dcc0;border-radius:var(--pill);padding:4px 12px}
.ntf-runs{font-size:14px;max-height:220px;overflow:auto}.ntf-runs div{padding:3px 0;border-bottom:1px solid #f4eee0}
.ntf-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ntf-row input[type=time]{width:10em;min-width:150px;height:38px;direction:ltr;text-align:left}
#ntfSave{position:sticky;bottom:8px}
</style>`);

  const loadDefaults = () => defaults ? Promise.resolve(defaults) : fetch('notifications.json', { cache: 'no-store' }).then(r => r.json()).then(d => (defaults = d));
  const saved = () => (window.siteSettings || {}).notify || {};
  const msg = (id, t, ok) => { const e = $(id); if (!e) return; e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
  const token = async () => { await window.adminSession?.fresh(); return window.adminSession?.data?.access_token || ''; };
  async function fn(slot, body) {
    const r = await fetch(`${cfg.SUPABASE_URL}/functions/v1/daily-reminders?slot=${slot}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error === 'not_subscribed' ? 'روی این گوشی اعلان فعال نیست؛ اول «فعال کردن اعلان روی این گوشی» را بزنید.' : d.error === 'not_admin' ? 'ورود مدیر تأیید نشد؛ دوباره وارد شوید.' : r.status === 404 ? 'تابع daily-reminders پیدا نشد؛ مرحله deploy در راهنما انجام شده است؟' : 'ارسال نشد (' + (d.error || r.status) + ').');
    return d;
  }
  async function mySub() {
    try { const r = await navigator.serviceWorker.getRegistration(); return r && await r.pushManager.getSubscription(); } catch { return null; }
  }

  async function build(p) {
    const d = await loadDefaults();
    const typeCard = ([k, t]) => `<div class="ntf-type" data-type="${k}"><div class="ntf-top"><label><input type="checkbox" data-f="on"> ${esc(t.label)}</label>
${t.time ? `<span>ساعت <input type="time" data-f="time" step="300"></span>` : t.offset != null ? `<span>دقیقه نسبت به اذان ${t.azan === 'dhuhr' ? 'ظهر' : 'مغرب'} <input type="number" data-f="offset" step="5" min="-240" max="240" style="width:6em;direction:ltr"></span>` : t.azan ? `<span class="hint">با اذان ${t.azan === 'dhuhr' ? 'ظهر' : 'مغرب'} تهران</span>` : t.same ? '<span class="hint">همان ساعت «برنامه امروز»</span>' : '<span class="hint">همان لحظه (جز ساعت‌های سکوت)</span>'}</div>
<div class="ntf-fields"><input type="text" data-f="title" maxlength="80" placeholder="عنوان"><textarea data-f="body" maxlength="400" placeholder="متن"></textarea>
<div class="ntf-tools"><button type="button" class="reg-light" data-sample="${k}">نمونه روی گوشی من</button><button type="button" class="reg-light" data-reset="${k}">متن پیش‌فرض</button></div></div></div>`;
    const group = g => Object.entries(d.types).filter(([, t]) => t.group === g).map(typeCard).join('');
    p.innerHTML = `
<div class="adm-card"><h3>اعلان برای همه</h3>
<label class="adm-opt"><input type="checkbox" id="ntfPublic"> <span>پیشنهاد اعلان به همه بازدیدکنندگان (اگر خاموش باشد، فقط در ‎#admin‎ و برنامه نصب‌شده دیده می‌شود)</span></label>
<p class="hint">پیش‌فرض روشن است. اگر هنوز مراحل «اعلان» راهنمای راه‌اندازی (Supabase) انجام نشده، فعلاً خاموشش کنید تا کسی با خطا روبه‌رو نشود.</p><div class="adm-msg" id="ntfPublicMsg"></div></div>
<div class="adm-card"><h3>این گوشی</h3><p class="hint" id="ntfMine">…</p><div class="reg-tools"><button type="button" id="ntfMineOn">فعال کردن اعلان روی این گوشی</button></div><div class="adm-msg" id="ntfMineMsg"></div></div>
<div class="adm-card"><h3>وضعیت ارسال</h3><div id="ntfStats" class="hint">…</div><div class="reg-tools"><button type="button" class="reg-light" id="ntfReload">تازه کردن</button></div></div>
<p class="hint" style="margin:0 0 10px">ساعت‌ها و روشن/خاموش بودن این‌جا پیش‌فرض همه است. هر کس روی گوشی خودش با «تنظیم اعلان‌ها» می‌تواند نوعی را خاموش کند یا ساعت دیگری بگذارد؛ نوعی که این‌جا خاموش باشد برای هیچ‌کس نمی‌رود.</p>
<div class="adm-card"><h3>اعلان‌های حزب‌خوانی</h3><p class="hint">جای‌نگهدارها: ${esc(VARS.hezb)}</p>${group('hezb')}</div>
<div class="adm-card"><h3>اعلان‌های چله و دوره‌های قرآن</h3><p class="hint">جای‌نگهدارها: ${esc(VARS.chl)}. اگر یک نفر چند چله روی یک گوشی داشته باشد، برنامه همه در یک اعلان می‌آید.</p>${group('chl')}</div>
<div class="adm-card"><h3>اعمال و ختم‌ها</h3><p class="hint">برای همه کسانی که اعلان را روی گوشی فعال کرده‌اند، با اذان تهران. جای‌نگهدارها: ${esc(VARS.ibadat)}</p>${group('ibadat')}
<div class="ntf-row" style="margin-top:8px"><label for="ntfHijri" style="margin:0">تاریخ قمری</label><select id="ntfHijri" style="flex:none;width:auto">${[-2, -1, 0, 1, 2].map(n => `<option value="${n}">${n ? `${toFa(Math.abs(n))} روز ${n > 0 ? 'جلوتر' : 'عقب‌تر'}` : 'بدون تغییر'}</option>`).join('')}</select></div>
<p class="hint" id="ntfHijriInfo"></p></div>
<div class="adm-card"><h3>ادعیه</h3><p class="hint">برای همه کسانی که اعلان را روی گوشی فعال کرده‌اند، با فاصله از اذان مغرب تهران (عدد منفی یعنی پیش از اذان).</p>${group('doa')}</div>
<div class="adm-card"><h3>ساعت سکوت شب</h3><p class="hint">اعلان‌های لحظه‌ای (اعلام شناسه، رزرو، خبر) در این ساعت‌ها نمی‌روند و صبح فرستاده می‌شوند.</p>
<div class="ntf-row">از <input type="time" id="ntfQuietFrom" step="300"> تا <input type="time" id="ntfQuietTo" step="300"></div></div>
<div class="reg-tools"><button type="button" id="ntfSave">ذخیره تنظیمات اعلان</button></div><div class="adm-msg" id="ntfSaveMsg"></div>
<div class="adm-card"><h3>پیام همگانی</h3><p class="hint">همین حالا به همه گوشی‌هایی که اعلان را فعال کرده‌اند فرستاده می‌شود؛ مثلاً خبر مراسم ختم یا تغییر برنامه.</p>
<label for="ntfBTitle">عنوان</label><input id="ntfBTitle" maxlength="80">
<label for="ntfBBody">متن</label><textarea id="ntfBBody" maxlength="500"></textarea>
<label for="ntfBTo">گیرندگان</label><select id="ntfBTo"><option value="all">همه</option><option value="hezb">فقط حزب‌خوانی (کسانی که شناسه دارند)</option><option value="chl">فقط چله و دوره‌های قرآن</option></select>
<div class="reg-tools"><button type="button" id="ntfBSend">فرستادن پیام</button></div><div class="adm-msg" id="ntfBMsg"></div></div>`;

    p.addEventListener('change', e => { const t = e.target.closest('.ntf-type'); if (t && e.target.dataset.f === 'on') t.classList.toggle('off', !e.target.checked); });
    p.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.reset) { const t = d.types[b.dataset.reset], c = b.closest('.ntf-type'); c.querySelector('[data-f=title]').value = t.title; c.querySelector('[data-f=body]').value = t.body; if (t.time) c.querySelector('[data-f=time]').value = t.time; if (t.offset != null) c.querySelector('[data-f=offset]').value = t.offset; return; }
      if (b.dataset.sample) {
        const c = b.closest('.ntf-type'), sub = await mySub();
        if (!sub) return msg('ntfMineMsg', 'روی این گوشی اعلان فعال نیست؛ اول «فعال کردن اعلان روی این گوشی» را بزنید.');
        b.disabled = true;
        try { await save(true); await fn('sample', { type: b.dataset.sample, endpoint: sub.endpoint }); b.textContent = 'فرستاده شد ✓'; setTimeout(() => (b.textContent = 'نمونه روی گوشی من'), 4000); }
        catch (err) { alert(err.message); }
        b.disabled = false; return;
      }
    });
    $('ntfPublic').onchange = async () => {
      try { await window.saveSiteSetting('notify', { ...collect(), public: $('ntfPublic').checked }); msg('ntfPublicMsg', $('ntfPublic').checked ? 'روشن شد: همه بازدیدکنندگان پیشنهاد اعلان را می‌بینند.' : 'خاموش شد: فقط مدیر و برنامه نصب‌شده.', true); document.dispatchEvent(new Event('settings:changed')); }
      catch (err) { msg('ntfPublicMsg', err.message); $('ntfPublic').checked = !$('ntfPublic').checked; }
    };
    $('ntfSave').onclick = async () => { try { await save(); msg('ntfSaveMsg', 'ذخیره شد. از اجرای بعدی (حداکثر ۱۵ دقیقه) به کار می‌رود.', true); } catch (err) { msg('ntfSaveMsg', err.message); } };
    $('ntfReload').onclick = loadStats;
    $('ntfHijri').onchange = hijriInfo;
    $('ntfMineOn').onclick = async () => {
      try {
        if (!('PushManager' in window) || !cfg.VAPID_PUBLIC_KEY) throw Error('این مرورگر اعلان ندارد (روی آیفون اول سایت را به صفحه اصلی اضافه کنید).');
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw Error('اجازه اعلان داده نشد.');
        const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob((cfg.VAPID_PUBLIC_KEY + '='.repeat((4 - cfg.VAPID_PUBLIC_KEY.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)) });
        const k = sub.toJSON().keys;
        const st = await window.sitePush?.status();
        if (!st) await window.sbRpc('push_join', { p_endpoint: sub.endpoint, p_p256dh: k.p256dh, p_auth: k.auth, p_chl: [], p_reg: [] });
        msg('ntfMineMsg', 'فعال شد. حالا «نمونه روی گوشی من» را امتحان کنید.', true); mine();
      } catch (err) { msg('ntfMineMsg', err.message); }
    };
    $('ntfBSend').onclick = async () => {
      const title = $('ntfBTitle').value.trim(), body = $('ntfBBody').value.trim(), to = $('ntfBTo');
      if (!title || !body) return msg('ntfBMsg', 'عنوان و متن را بنویسید.');
      if (!confirm(`این پیام همین حالا به «${to.options[to.selectedIndex].text}» فرستاده شود؟\n\n${title}\n${body}`)) return;
      $('ntfBSend').disabled = true; msg('ntfBMsg', 'در حال ارسال…', true);
      try { const r = await fn('broadcast', { title, body, audience: to.value }); msg('ntfBMsg', `فرستاده شد به ${toFa(r.sent)} گوشی${r.failed ? `؛ ${toFa(r.failed)} ناموفق` : ''}${r.removed ? `؛ ${toFa(r.removed)} اشتراک منقضی حذف شد` : ''}.`, true); $('ntfBTitle').value = ''; $('ntfBBody').value = ''; loadStats(); }
      catch (err) { msg('ntfBMsg', err.message); }
      $('ntfBSend').disabled = false;
    };
  }

  function collect() {
    const types = {};
    document.querySelectorAll('#pane-notify .ntf-type').forEach(c => {
      const k = c.dataset.type, d = defaults.types[k], v = f => c.querySelector(`[data-f=${f}]`);
      const o = { on: v('on').checked };
      if (v('time') && v('time').value && v('time').value !== d.time) o.time = v('time').value;
      if (v('offset') && v('offset').value !== '' && +v('offset').value !== d.offset && Math.abs(Math.round(+v('offset').value)) <= 240) o.offset = Math.round(+v('offset').value);
      if (v('title').value.trim() && v('title').value.trim() !== d.title) o.title = v('title').value.trim();
      if (v('body').value.trim() && v('body').value.trim() !== d.body) o.body = v('body').value.trim();
      types[k] = o;
    });
    const q = { from: $('ntfQuietFrom').value || defaults.quiet.from, to: $('ntfQuietTo').value || defaults.quiet.to };
    return { public: $('ntfPublic').checked, hijri: +$('ntfHijri').value || 0, quiet: q, types };
  }
  async function save(silent) {
    // جای‌نگهدار ناشناخته احتمالاً غلط تایپی است.
    const bad = [...document.querySelectorAll('#pane-notify .ntf-type [data-f=title], #pane-notify .ntf-type [data-f=body]')]
      .flatMap(x => (x.value.match(/\{(\w+)\}/g) || []).filter(m => !/\{(name|task|course|day|days|left|date|group|id|news|night)\}/.test(m)));
    if (bad.length && !silent) throw Error('جای‌نگهدار ناشناخته: ' + [...new Set(bad)].join('، '));
    await window.saveSiteSetting('notify', collect());
  }

  // ختم یاسین از نزدیک‌ترین پنجشنبه به نیمه ماه قمری شروع می‌شود؛ مدیر اگر تاریخ قمری سایت با تقویم رسمی فرق داشت اصلاحش می‌کند.
  function hijriInfo() {
    const ib = window.ibadat, el = $('ntfHijri'), out = $('ntfHijriInfo');
    if (!ib || !el || !out) return;
    const off = +el.value || 0, k = ib.khatm(off), today = ib.tehranToday();
    out.textContent = `امروز طبق سایت: ${ib.hijriLabel(today, off)}. اگر با تقویم رسمی فرق دارد، اینجا اصلاح کنید و ذخیره کنید.` +
      (k ? ` ختم یاسین ${k[0] <= today ? 'جاری' : 'بعدی'}: شب‌های جمعه ${k.map(d => ib.dateFa(d).replace(/^\S+\s/, '')).join('، ')}.` : '');
  }
  function fillForm() {
    const s = saved(), d = defaults;
    $('ntfPublic').checked = s.public !== false;
    $('ntfHijri').value = String(Number.isInteger(s.hijri) && Math.abs(s.hijri) <= 2 ? s.hijri : 0); hijriInfo();
    $('ntfQuietFrom').value = s.quiet?.from || d.quiet.from; $('ntfQuietTo').value = s.quiet?.to || d.quiet.to;
    document.querySelectorAll('#pane-notify .ntf-type').forEach(c => {
      const k = c.dataset.type, t = d.types[k], o = (s.types || {})[k] || {}, v = f => c.querySelector(`[data-f=${f}]`);
      v('on').checked = o.on !== false; c.classList.toggle('off', o.on === false);
      if (v('time')) v('time').value = o.time || t.time;
      if (v('offset')) v('offset').value = Number.isInteger(o.offset) ? o.offset : t.offset;
      v('title').value = o.title || t.title; v('body').value = o.body || t.body;
    });
  }
  async function mine() {
    const sub = await mySub(), st = sub && await window.sitePush?.status();
    $('ntfMine').textContent = !sub || !st ? 'اعلان روی این گوشی فعال نیست. برای دیدن «نمونه»ها فعالش کنید.' : `اعلان روی این گوشی فعال است${st.group_number ? ` (حزب‌خوانی: گروه ${toFa(st.group_number)}، شناسه ${toFa(st.participant_id)})` : ''}${st.chl ? `، ${toFa(st.chl)} چله` : ''}.`;
    $('ntfMineOn').hidden = !!(sub && st);
  }
  async function loadStats() {
    const box = $('ntfStats');
    try {
      const s = await window.sbRpc('push_stats', {}, true);
      if (!s) { box.textContent = 'آمار در دسترس نیست.'; return; }
      const SL = { auto: 'خودکار', morning: 'صبح', evening: 'عصر', broadcast: 'پیام همگانی' };
      const t = iso => new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
      box.innerHTML = `<div class="ntf-stat"><span>گوشی‌ها: <b>${toFa(s.devices)}</b></span><span>حزب‌خوانی: <b>${toFa(s.hezb)}</b></span><span>چله و دوره: <b>${toFa(s.chl)}</b></span><span>ثبت‌نام: <b>${toFa(s.reg)}</b></span>${s.custom ? `<span>با تنظیم دلخواه: <b>${toFa(s.custom)}</b></span>` : ''}<span>فرستاده‌شده امروز: <b>${toFa(s.sent_today)}</b></span></div>
${(s.groups || []).length ? `<p class="hint" style="margin:4px 0">${s.groups.map(g => `گروه ${toFa(g.group)}: ${toFa(g.devices)}`).join(' · ')}</p>` : ''}
<div class="ntf-runs">${(s.runs || []).length ? s.runs.map(r => `<div>${t(r.at)} · ${SL[r.slot] || esc(r.slot)}: ${toFa(r.stats.sent || 0)} فرستاده${r.stats.failed ? `، <span class="adm-bad">${toFa(r.stats.failed)} ناموفق</span>` : ''}${r.stats.removed ? `، ${toFa(r.stats.removed)} منقضی` : ''}${r.stats.title ? ` («${esc(r.stats.title)}»)` : ''}</div>`).join('') : '<p class="hint">هنوز اعلانی فرستاده نشده است. اگر زمان‌بندی (cron) را ساخته‌اید و مشترک دارید، پس از ساعت اعلان‌ها اینجا دیده می‌شود.</p>'}</div>`;
    } catch (e) { box.innerHTML = `<span class="adm-bad">${esc(e.message)}</span>`; }
  }

  document.addEventListener('admin:tab', async e => {
    if (e.detail !== 'notify') return;
    const p = $('pane-notify'); if (!p) return;
    try {
      if (!built) { built = true; await build(p); }
      fillForm(); mine(); loadStats();
    } catch (err) { built = false; p.innerHTML = `<p class="adm-bad">بارگذاری انجام نشد: ${esc(err.message)}</p>`; }
  });
})();
