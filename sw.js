// سرویس‌ورکر: اعلان‌های سایت (سهم امروز، برنامه چله، یادآوری‌ها و خبرها)، و نسخه آفلاین برای حالت «برنامه» (نصب‌شده).
// صفحه و داده‌ها را همیشه اول از اینترنت می‌خواند تا تغییرات سایت فوراً دیده شود؛ فقط اگر اینترنت نبود از نسخه ذخیره‌شده استفاده می‌کند.
// قلم‌ها، تصویرها، فایل‌های نسخه‌دار (?v=) و متن‌های ثابت (قرآن، کتاب‌ها، چله‌ها) از نسخه ذخیره‌شده باز می‌شوند و در پس‌زمینه تازه می‌شوند.
self.window = self; importScripts('config.js');
const cfg = self.APP_CONFIG || {};

const CACHE = 'hezb-v2';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'portions.json', 'Vazirmatn.woff2', 'IranNastaliq2.woff2'];
// background.jpg (ظاهر قبلی) از پیش ذخیره نمی‌شود تا نصب برنامه ۲۰۰ کیلوبایت سبک‌تر شود؛ اگر کسی آن ظاهر را برگزید، بار اول ذخیره می‌شود.

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
// «پیش‌بارگیری صفحه»: درخواست خود صفحه هم‌زمان با بیدار شدن سرویس‌ورکر فرستاده می‌شود، نه بعد از آن؛ باز شدن سایت روی گوشی کمی زودتر می‌شود.
self.addEventListener('activate', e => e.waitUntil(Promise.all([
  self.registration.navigationPreload?.enable().catch(() => {}),
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('hezb-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
])));

// قلم‌ها، تصویرها و فایل‌هایی که شماره نسخه در آدرسشان دارند (مثل app.js?v=7) زیر همان آدرس عوض نمی‌شوند؛
// پس اگر نسخه ذخیره‌شده‌شان هست فوراً از همان باز می‌شوند (حتی با اینترنت ضعیف) و چند ثانیه بعد، وقتی صفحه باز شد،
// بی‌صدا از اینترنت تازه می‌شوند تا اگر فایلی بدون عوض شدن شماره‌اش تغییر کرد، از بار بعد درست دیده شود.
const STATIC = /\.(woff2|ttf|webp|jpe?g|png|svg|gif|ico)$/i;
// متن‌های ثابت سایت (قرآن و ترجمه‌ها و تفسیرها، کتاب‌ها، متن پیش‌فرض چله‌ها، portions.json) هم همین‌طور: اگر یک بار گرفته شده‌اند
// فوراً از نسخه ذخیره‌شده باز می‌شوند و در پس‌زمینه تازه می‌شوند؛ پس اصلاح یک متن از بار بعدِ باز کردن دیده می‌شود.
// با اینترنت کند، باز شدن سهم امروز، قرآن و کتاب‌ها دیگر منتظر جواب سرور نمی‌ماند. داده‌های پایگاه داده (Supabase) دست‌نخورده‌اند.
const TEXTS = /\/(quran|books|chelleh)\/.+\.json$|\/portions\.json$/;

async function save(req, url, res) {
  const c = await caches.open(CACHE);
  await c.put(req, res);
  // نسخه‌های قدیمیِ همین فایل (?v= دیگر) پاک می‌شوند تا بدون اینترنت همیشه آخرین نسخه به کار رود.
  if (url.search) for (const k of await c.keys()) { const u = new URL(k.url); if (u.pathname === url.pathname && u.search !== url.search) c.delete(k); }
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // فقط فایل‌های خود سایت؛ درخواست‌های پایگاه داده و سایت‌های دیگر دست‌نخورده می‌مانند.
  if (req.method !== 'GET' || url.origin !== self.location.origin || req.headers.has('range')) return;
  const keep = res => {
    if (res.status === 200 && res.type === 'basic') e.waitUntil(save(req, url, res.clone()).catch(() => {}));
    return res;
  };
  const net = () => fetch(req).then(keep);
  const offline = () => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('./') : Response.error()));
  if (url.searchParams.has('v') || STATIC.test(url.pathname) || TEXTS.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => {
      if (!hit) return net().catch(offline);
      e.waitUntil(new Promise(r => setTimeout(r, 5000)).then(net).catch(() => {}));
      return hit;
    }));
    return;
  }
  // خود صفحه: اگر اینترنت کند است (بیش از ۳ ثانیه)، نسخه ذخیره‌شده فوراً باز می‌شود و نسخه تازه برای بار بعد ذخیره می‌شود.
  if (req.mode === 'navigate') {
    const n = Promise.resolve(e.preloadResponse).catch(() => null).then(r => r ? keep(r) : net());
    const late = new Promise(r => setTimeout(r, 3000)).then(() => caches.match(req, { ignoreSearch: true })).then(r => r || caches.match('./')).then(r => r || n);
    e.respondWith(Promise.race([n, late]).catch(offline));
    return;
  }
  e.respondWith(net().catch(offline));
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
