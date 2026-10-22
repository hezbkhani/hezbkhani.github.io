// نوران به https://nooranquran.github.io رفت. این سرویس‌ورکر فقط اعلان‌های گوشی‌هایی را که اینجا اعلان روشن کرده بودند نشان می‌دهد
// (تا وقتی در نشانی تازه دوباره روشنش کنند)، و با زدن اعلان، صفحهٔ اینجا را باز می‌کند تا داده‌ها هم به نشانی تازه برده شوند.
self.window = self; importScripts('config.js');
const cfg = self.APP_CONFIG || {};

self.addEventListener('install', () => self.skipWaiting());
// نسخه‌های ذخیره‌شدهٔ سایت قدیم پاک می‌شوند و صفحه‌های باز دوباره بارگذاری می‌شوند تا به نشانی تازه بروند.
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(list => Promise.all(list.map(c => c.navigate(c.url).catch(() => {}))))
));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'نوران', {
    body: d.body || '', dir: 'rtl', lang: 'fa', tag: d.tag || 'quran', renotify: true,
    icon: 'icon-192.png', badge: 'icon-badge.png', data: { url: d.url || './' },
    actions: [{ action: 'open', title: 'باز کردن سایت' }, { action: 'cancel', title: 'قطع اعلان‌ها' }]
  }));
});

async function cancelReminders() {
  const sub = await self.registration.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/push_unsubscribe`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_endpoint: sub.endpoint }) });
  } catch {}
  await sub.unsubscribe();
  await self.registration.showNotification('اعلان‌ها قطع شد', { body: 'دیگر اعلانی از نوران روی این گوشی نمی‌آید. از سایت می‌توانید دوباره فعالش کنید.', dir: 'rtl', lang: 'fa', icon: 'icon-192.png', tag: 'quran-cancelled' });
}

// پیوند اعلان (که حالا به نشانی تازه است) روی همین نشانی باز می‌شود تا صفحهٔ انتقال، داده‌ها را هم ببرد.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'cancel') { e.waitUntil(cancelReminders()); return; }
  const u = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope);
  e.waitUntil(self.clients.openWindow(new URL(u.pathname + u.search + u.hash, self.registration.scope).href));
});
