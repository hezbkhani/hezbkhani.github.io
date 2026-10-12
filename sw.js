// سرویس‌ورکر فقط برای اعلان یادآوری روزانه است؛ هیچ فایلی را کش نمی‌کند.
self.window = self; importScripts('config.js');
const cfg = self.APP_CONFIG || {};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'حزب‌خوانی قرآن کریم', {
    body: d.body || '', dir: 'rtl', lang: 'fa', tag: d.tag || 'quran', renotify: true,
    icon: 'icon-192.png', badge: 'icon-badge.png', data: { url: d.url || './' },
    actions: [{ action: 'open', title: 'باز کردن سایت' }, { action: 'cancel', title: 'لغو یادآوری' }]
  }));
});

async function cancelReminders() {
  const sub = await self.registration.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/push_unsubscribe`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_endpoint: sub.endpoint }) });
  } catch {}
  await sub.unsubscribe();
  await self.registration.showNotification('یادآوری روزانه لغو شد', { body: 'دیگر اعلانی برای سهم روزانه دریافت نمی‌کنید. از سایت می‌توانید دوباره فعالش کنید.', dir: 'rtl', lang: 'fa', icon: 'icon-192.png', tag: 'quran-cancelled' });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'cancel') { e.waitUntil(cancelReminders()); return; }
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list.find(c => c.url.split(/[?#]/)[0] === url.split(/[?#]/)[0] && 'navigate' in c);
    return w ? w.navigate(url).then(c => (c || w).focus()).catch(() => self.clients.openWindow(url)) : self.clients.openWindow(url);
  }));
});
