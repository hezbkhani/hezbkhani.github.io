// سرویس‌ورکر: اعلان‌های سایت (سهم امروز، برنامه چله، یادآوری‌ها و خبرها)، و نسخه آفلاین برای حالت «برنامه» (نصب‌شده).
// همیشه اول از اینترنت می‌خواند تا تغییرات سایت فوراً دیده شود؛ فقط اگر اینترنت نبود از نسخه ذخیره‌شده استفاده می‌کند.
self.window = self; importScripts('config.js');
const cfg = self.APP_CONFIG || {};

const CACHE = 'hezb-v2';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'portions.json', 'Vazirmatn.woff2', 'IranNastaliq2.woff2', 'background.jpg'];

// اسکریپت‌های صفحه (با شماره نسخه‌شان، مثل app.js?v=7) هم از همان index.html برداشته و ذخیره می‌شوند
// تا برنامه نصب‌شده از همان اولین بار بدون اینترنت هم باز شود.
async function precache() {
  const c = await caches.open(CACHE);
  await c.addAll(SHELL);
  const html = await (await c.match('index.html')).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
  await Promise.all(scripts.map(u => c.add(u).catch(() => {})));
}
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(precache().catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hezb-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // فقط فایل‌های خود سایت؛ درخواست‌های پایگاه داده و سایت‌های دیگر دست‌نخورده می‌مانند.
  if (req.method !== 'GET' || url.origin !== self.location.origin || req.headers.has('range')) return;
  e.respondWith(fetch(req).then(res => {
    if (res.status === 200 && res.type === 'basic') {
      const copy = res.clone();
      // نسخه‌های قدیمیِ همین فایل (?v= دیگر) پاک می‌شوند تا بدون اینترنت همیشه آخرین نسخه به کار رود.
      caches.open(CACHE).then(async c => {
        await c.put(req, copy);
        if (url.search) for (const k of await c.keys()) { const u = new URL(k.url); if (u.pathname === url.pathname && u.search !== url.search) c.delete(k); }
      }).catch(() => {});
    }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('./') : Response.error()))));
});

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

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'cancel') { e.waitUntil(cancelReminders()); return; }
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list.find(c => c.url.split(/[?#]/)[0] === url.split(/[?#]/)[0] && 'navigate' in c);
    return w ? w.navigate(url).then(c => (c || w).focus()).catch(() => self.clients.openWindow(url)) : self.clients.openWindow(url);
  }));
});
