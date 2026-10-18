// اعلان اذان (امکان azan در features.js): اعلان اذان صبح، ظهر و مغرب به افق شهری که در کارت «امروز» انتخاب شده (daily.js، prayerLoc).
// هر کدام جدا و پیش‌فرض خاموش؛ کلیدها در همان برگه «تنظیم اعلان‌ها» (reminders.js) است و در بخش اوقات شرعی کارت «امروز» یک پیوند به آن.
// وقت اذان را سرور حساب می‌کند (تابع daily-reminders، azan.ts، همان فرمول daily.js) پس شهر (گرد شده تا دو رقم اعشار، حدود ۱ کیلومتر)،
// منطقه زمانی و اذان‌های انتخابی با push_azan_set (backend/supabase/azan.sql) کنار اشتراک همین گوشی ذخیره می‌شود.
// انتخاب روی گوشی هم (azanPush) می‌ماند تا اگر اشتراک دوباره ساخته شد یا شهر عوض شد، دوباره فرستاده شود.
(function () {
  const cfg = window.APP_CONFIG || {}, KEY = 'azanPush', SENT = 'azanPushSent';
  const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = [['fajr', 'اذان صبح'], ['dhuhr', 'اذان ظهر'], ['maghrib', 'اذان مغرب']];
  const shown = () => !!window.features?.shown('azan');
  const mine = () => { const v = store.get(KEY); return Array.isArray(v) ? P.map(p => p[0]).filter(k => v.includes(k)) : []; };
  const city = () => window.daily?.loc?.() || null;
  const usable = () => !!window.sitePush?.enabled?.() && shown();

  const rpc = (name, body) => fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async r => { if (!r.ok) throw Error('rpc ' + r.status); const t = await r.text(); return t ? JSON.parse(t) : null; });
  async function currentSub() {
    try { if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return null; const r = await navigator.serviceWorker.getRegistration(); return r ? await r.pushManager.getSubscription() : null; } catch { return null; }
  }

  // فرستادن انتخاب و شهر به سرور، فقط وقتی عوض شده باشد (یا force). امکان پنهان باشد: اذان‌ها خاموش فرستاده می‌شود.
  async function sync(sub, force) {
    sub = sub || await currentSub(); const L = city(); if (!sub || !L) return;
    const want = shown() ? mine() : [], lat = +(+L.lat).toFixed(2), lng = +(+L.lng).toFixed(2);
    const sig = sub.endpoint.slice(-24) + JSON.stringify([want, lat, lng, L.tz]);
    if (!force && store.get(SENT) === sig) return;
    if (!want.length && !store.get(SENT)) return; // این گوشی هرگز اعلان اذان نداشته است.
    const k = sub.toJSON().keys;
    await rpc('push_azan_set', { p_endpoint: sub.endpoint, p_p256dh: k.p256dh, p_auth: k.auth, p_lat: lat, p_lng: lng, p_tz: L.tz, p_prayers: want });
    store.set(SENT, want.length ? sig : null);
  }
  const quiet = () => sync().catch(() => {});

  // ---------- بخش «اذان» در برگه تنظیم اعلان‌ها (reminders.js) ----------
  (window.pushExtra = window.pushExtra || []).push({
    offLabel: () => usable() ? 'اذان صبح، ظهر و مغرب به افق شهر شما (اختیاری)' : '',
    html: () => {
      if (!usable()) return '';
      const L = city(), m = mine();
      return `<section><h5>🕌 اعلان اذان</h5><p class="ns-who">به افق ${esc(L ? L.name : 'تهران')}؛ شهر را در کارت «امروز» › اوقات شرعی عوض کنید.</p>
${P.map(([k, t]) => `<label class="rm-t"><input type="checkbox" data-azan="${k}"${m.includes(k) ? ' checked' : ''}><span>${t}</span></label>`).join('')}
<p class="hint" style="margin:4px 0 0">ساعت اذان به وقت همان شهر است. اعلان در وقت اذان یا چند دقیقه پس از آن می‌رسد، نه زودتر.</p></section>`;
    },
    save: async (sub, box) => {
      const cs = [...box.querySelectorAll('[data-azan]')]; if (!cs.length) return;
      store.set(KEY, cs.filter(c => c.checked).map(c => c.dataset.azan));
      await sync(sub, true);
      window.daily?.refresh();
    },
    restore: sub => sync(sub, true).catch(() => {}),
    active: () => shown() && mine().length > 0
  });

  // ---------- پیوند کوچک در بخش اوقات شرعی کارت «امروز» ----------
  document.head.insertAdjacentHTML('beforeend', '<style>#dlCard .dl-azan{display:block;width:100%;height:auto;min-height:44px;margin-top:8px;padding:4px 10px;background:transparent;color:var(--dl-h);border:1px dashed var(--dl-line);border-radius:var(--r);font-weight:600;font-size:14.5px;white-space:normal;cursor:pointer}</style>');
  window.daily?.more(() => {
    if (!usable()) return '';
    const m = mine(), on = window.Notification?.permission === 'granted' && m.length;
    return `<button type="button" class="dl-azan" data-ns-open>🔔 اعلان اذان: ${on ? esc(P.filter(p => m.includes(p[0])).map(p => p[1].replace('اذان ', '')).join('، ')) : 'خاموش'} · تنظیم</button>`;
  });

  // از کارت «امروز» آمده: برگه که ساخته شد، بخش اذان (پایین برگه) دیده شود
  document.addEventListener('click', e => {
    if (!e.target.closest('#dlCard .dl-azan')) return;
    let n = 0; const t = setInterval(() => { const x = document.querySelector('.ns.show [data-azan]'); if (x || ++n > 40) { clearInterval(t); x?.closest('section')?.scrollIntoView({ block: 'center' }); } }, 100);
  });
  document.addEventListener('prayer:loc', quiet);
  document.addEventListener('features:changed', () => { quiet(); window.daily?.refresh(); });
  document.addEventListener('push:changed', () => window.daily?.refresh());
  quiet();
})();
