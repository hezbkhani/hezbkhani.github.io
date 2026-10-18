// اعمال و ختم‌ها: نماز حاجت امام جواد (ع) چهارشنبه‌ها و ختم سوره یاسین هدیه به حضرت ام‌البنین (س).
// ادعیه: دعای سمات (عصر جمعه)، کمیل (شب جمعه) و توسل (شب چهارشنبه)؛ متن، ترجمه و صوت در خواننده چله‌ها (chelleh/samat.json و …).
// پیوند اعلان‌ها (?doa=javad_wed، ?doa=ommolbanin، ?doa=doa_kumayl و …) همین برگه‌ها را باز می‌کند؛ در منو هم هستند.
// اعلان‌ها را تابع daily-reminders با اذان ظهر و مغرب تهران می‌فرستد (نوع‌های javad_wed و ommolbanin در notifications.json).
// محاسبه شب‌های ختم همان khatmNight در backend/supabase/functions/daily-reminders/notify.ts است؛ اگر یکی را تغییر دادید دیگری را هم.
(function () {
  const cfg = window.APP_CONFIG || {};
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const DAY = 864e5;
  const css = `
.ib-shade{position:fixed;inset:0;z-index:60;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.ib-box{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:150px 150px 0 0/60px 60px 0 0;padding:14px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:ibup .25s ease}
@keyframes ibup{from{transform:translateY(40px);opacity:.4}}
.ib-x{float:left;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.ib-box h2{margin:18px 0 2px;text-align:center;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.ib-sub{margin:0 0 12px;text-align:center;color:var(--muted);font-size:15px}
.ib-card{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:10px 0}
.ib-card h3{margin:0 0 4px;font-size:17px;color:var(--deep)}
.ib-steps{margin:0;padding-inline-start:24px;list-style-type:persian}.ib-steps li{margin:6px 0}
.ib-zekr{margin:8px 0;padding:10px;text-align:center;font:600 22px/1.9 Vazirmatn,Tahoma,sans-serif;color:var(--deep);background:var(--cream);border:1px solid var(--gold);border-radius:var(--r-card)}
.ib-count{display:flex;align-items:center;gap:12px;margin-top:8px}
.ib-count button.ib-tap{flex:1;height:64px;font-size:22px;border-radius:var(--r-card)}
.ib-count b{min-width:90px;text-align:center;font-size:20px;color:var(--deep)}
.ib-count .rm-ghost{height:40px;font-size:14px}
.ib-done{background:var(--mint)!important;color:var(--deep)!important}
.ib-tbl{width:100%;border-collapse:collapse;font-size:15px}
.ib-tbl td:nth-child(2){white-space:nowrap}.ib-tbl th,.ib-tbl td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;vertical-align:top}
.ib-tbl th{background:var(--deep);color:#fff;font-weight:600}
.ib-tbl tr.now td{background:var(--cream);font-weight:600}.ib-tbl tr.past td{color:var(--muted)}
.ib-tbl small{display:block;color:var(--muted);font-weight:400}
.ib-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.ib-tools button{flex:1 1 auto}
.ib-box audio{width:100%;margin-top:6px}
.ib-note{font-size:14.5px;color:var(--muted);margin:6px 0 0}
.ib-box .rm-link{height:auto;padding:0;border:0;background:none;color:var(--deep);text-decoration:underline;font-weight:600;font-size:inherit}
.ib-msg{font-weight:700;margin-top:6px}.ib-msg:empty{display:none}
body.ib-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- تاریخ قمری و شب‌های ختم ----------
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const ms = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const tehranToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
  const offset = () => { const h = window.siteSettings?.notify?.hijri; return Number.isInteger(h) && Math.abs(h) <= 2 ? h : 0; };
  let HD = null, HL = null;
  try {
    HD = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric' });
    HL = new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
    if (!/islamic/.test(HD.resolvedOptions().calendar)) HD = null;
  } catch { HD = null; }
  const hijriDay = (s, off) => +HD.formatToParts(new Date(ms(s) + off * DAY + 432e5)).find(p => p.type === 'day').value;
  const hijriLabel = (s, off = offset()) => HL ? HL.format(new Date(ms(s) + off * DAY + 432e5)).replace(/\s*ه‍?\.ق\.?$/, '') : '';
  // آیا این پنجشنبه شب اول ختم است؟ (نیمه ماه قمری حداکثر ۳ روز با نزدیک‌ترین پنجشنبه فاصله دارد.)
  const isStart = (s, off) => { for (let j = -3; j <= 3; j++) if (hijriDay(iso(ms(s) + j * DAY), off) === 15) return true; return false; };
  // چهار شب ختمی که امروز در آن است، یا ختم بعدی. خروجی: [تاریخ شب اول تا چهارم].
  function khatm(off = offset(), today = tehranToday()) {
    if (!HD) return null;
    const t = ms(today), thu = t - ((new Date(t).getUTCDay() + 3) % 7) * DAY; // پنجشنبه همین هفته یا قبل از آن
    for (let s = thu - 21 * DAY; s < t + 42 * DAY; s += 7 * DAY) {
      if (s + 21 * DAY < t || !isStart(iso(s), off)) continue;
      return [0, 1, 2, 3].map(k => iso(s + k * 7 * DAY));
    }
    return null;
  }
  const dateFa = s => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ms(s)));
  const NIGHTS = ['اول', 'دوم', 'سوم', 'چهارم'], TIMES = ['یک بار', 'دو بار', 'سه بار', 'چهار بار'];
  const task = n => `${TIMES[n - 1]} سوره یاسین، ${n < 4 ? 'هدیه به حضرت ابوالفضل العباس (ع)' : 'به نیابت از حضرت عباس (ع) هدیه به مادرشان حضرت ام‌البنین (س)'}`;
  window.ibadat = { khatm, hijriLabel, tehranToday, dateFa };

  // ---------- اعلان روی این گوشی ----------
  const ERR = { denied: 'اجازه اعلان در تنظیمات مرورگر بسته شده است.', dismissed: 'اجازه اعلان داده نشد.' };
  const rpc = (name, body) => fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw Error('rpc ' + r.status); });
  const offByMe = type => { try { return (JSON.parse(localStorage.getItem('pushPrefs')) || {}).off?.includes(type); } catch { return false; } };
  async function notifyHtml(type, when) {
    const sp = window.sitePush;
    if (!sp || !sp.enabled() || window.siteSettings?.notify?.types?.[type]?.on === false) return '';
    if (!sp.supported) return `<p class="ib-note">🔔 ${when} با اعلان یادآوری می‌شود. ${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'روی آیفون، اول سایت را به صفحه اصلی اضافه کنید و از آنجا باز کنید.' : ''}</p>`;
    const st = await sp.status().catch(() => null);
    if (st) return `<p class="ib-note">🔔 ${when} با اعلان روی این گوشی یادآوری می‌شود${offByMe(type) ? '، ولی این یادآوری را در «تنظیم اعلان‌ها» خاموش کرده‌اید' : ''}. <button type="button" class="rm-link" data-ib="prefs">تنظیم اعلان‌ها</button></p>`;
    return `<div class="ib-tools"><button type="button" data-ib="notify">🔔 یادآوری با اعلان روی این گوشی</button></div><p class="ib-note">${when}.</p><div class="ib-msg" aria-live="polite"></div>`;
  }
  async function enableNotify(box) {
    const msg = box.querySelector('.ib-msg');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw Error(perm);
      const reg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
      const key = cfg.VAPID_PUBLIC_KEY, b = atob((key + '='.repeat((4 - key.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
      const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(b, c => c.charCodeAt(0)) });
      if (!(await window.sitePush.status().catch(() => null))) {
        const k = sub.toJSON().keys;
        await rpc('push_join', { p_endpoint: sub.endpoint, p_p256dh: k.p256dh, p_auth: k.auth, p_chl: [], p_reg: [] });
      }
      render(current);
    } catch (e) { msg.style.color = 'var(--danger)'; msg.textContent = ERR[e.message] || 'فعال نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.'; }
  }

  // ---------- برگه‌ها ----------
  const ZEKR = 'ماشاءَاللهُ لا حَولَ وَ لا قُوَّةَ اِلّا بِالله';
  const COUNT = 146, CK = 'ibJavadCount';
  const readCount = () => { try { const c = JSON.parse(localStorage.getItem(CK)); return c && c.d === tehranToday() ? c.n : 0; } catch { return 0; } };
  const writeCount = n => { try { localStorage.setItem(CK, JSON.stringify({ d: tehranToday(), n })); } catch {} };

  async function javadHtml() {
    const n = readCount();
    return `<h2>نماز حاجت امام جواد (ع)</h2><p class="ib-sub">روزهای چهارشنبه</p>
<div class="ib-card"><ol class="ib-steps">
<li>روز چهارشنبه، <b>بعد از نماز عصر</b> بلافاصله <b>دو رکعت نماز هدیه به امام جواد (ع)</b> بخوانید.</li>
<li>بلافاصله بعد از نماز، <b>۱۴۶ مرتبه</b> این ذکر را بگویید:<div class="ib-zekr">${ZEKR}</div></li>
<li>سپس حاجات خود را از خدا بخواهید.</li></ol></div>
<div class="ib-card"><h3>صوت نماز حاجت امام جواد (ع)</h3><audio controls preload="none" src="audio/namaz-imam-javad.mp3"></audio>${window.audioOpt.bar()}</div>
<div class="ib-card"><h3>شمارنده ذکر</h3><div class="ib-count"><button type="button" class="ib-tap${n >= COUNT ? ' ib-done' : ''}" data-ib="tap">${n >= COUNT ? 'تمام شد؛ قبول باشد' : 'بزنید'}</button><b data-ib-n>${toFa(n)} از ${toFa(COUNT)}</b><button type="button" class="rm-ghost" data-ib="zero">از اول</button></div></div>
${await notifyHtml('javad_wed', 'هر چهارشنبه با اذان ظهر')}`;
  }
  async function ommolbaninHtml() {
    const k = khatm(), today = tehranToday();
    let rows = '';
    if (k) {
      const next = k.findIndex(d => d >= today);
      rows = `<table class="ib-tbl"><tr><th>شب</th><th>تاریخ</th><th>برنامه</th></tr>${k.map((d, i) => `<tr class="${i === next ? 'now' : d < today ? 'past' : ''}"><td>${NIGHTS[i]}${i === next && d === today ? '<small>امشب</small>' : ''}</td><td>${dateFa(d).replace(/^\S+\s/, '')}<small>پنجشنبه شب</small></td><td>${task(i + 1)}</td></tr>`).join('')}</table>
<p class="ib-note">ختم این ماه از ${dateFa(k[0])} (${hijriLabel(k[0])}) شروع ${k[0] <= today ? 'شده است' : 'می‌شود'}.</p>`;
    } else rows = `<ul class="ib-steps">${NIGHTS.map((x, i) => `<li>هفته ${x}: ${task(i + 1)}</li>`).join('')}</ul>`;
    return `<h2>ختم سوره یاسین حضرت ام‌البنین (س)</h2><p class="ib-sub">برای حاجات مهم، توسل به حضرت ابوالفضل العباس (ع) و مادرشان</p>
<div class="ib-card"><p style="margin:0 0 8px">در هر ماه قمری، از نزدیک‌ترین پنجشنبه به نیمه ماه، ختم سوره یاسین هدیه به حضرت ام‌البنین (س) شروع می‌شود و چهار هفته، هر پنجشنبه شب (شب جمعه) ادامه دارد:</p>${rows}
<div class="ib-tools"><button type="button" data-ib="yasin">📖 خواندن سوره یاسین</button></div></div>
<div class="ib-card"><h3>توسل به حضرت ام‌البنین (س)</h3><audio controls preload="none" src="audio/tavasol-ommolbanin.mp3"></audio>${window.audioOpt.bar()}</div>
${await notifyHtml('ommolbanin', 'شب‌های ختم با اذان مغرب')}`;
  }
  // ادعیه: key متن در پوشه chelleh، روز (getUTCDay) و فاصله پیش‌فرض اعلان از اذان مغرب در notifications.json.
  const DOAS = {
    doa_samat: { key: 'samat', title: 'دعای سمات', sub: 'ساعت‌های پایانی روز جمعه، پیش از غروب', day: 'جمعه', about: 'دعای سمات (دعای شبّور) از دعاهای مشهور مفاتیح‌الجنان است که مستحب است در ساعت‌های آخر روز جمعه خوانده شود.' },
    doa_kumayl: { key: 'kumayl', title: 'دعای کمیل', sub: 'شب‌های جمعه', day: 'پنجشنبه', night: 'شب جمعه', about: 'دعای کمیل را امیرالمؤمنین علی (ع) به کمیل بن زیاد آموخت؛ خواندن آن در شب‌های جمعه و شب نیمه شعبان سفارش شده است.' },
    doa_tavassul: { key: 'tavassul', title: 'دعای توسل', sub: 'شب‌های چهارشنبه', day: 'سه‌شنبه', night: 'شب چهارشنبه', about: 'دعای توسل، توسل به پیامبر اکرم (ص) و اهل‌بیت (ع) برای برآمدن حاجات است و رسم است که شب‌های چهارشنبه خوانده شود.' }
  };
  const doaOffset = async type => { const s = window.siteSettings?.notify?.types?.[type]?.offset; if (Number.isInteger(s)) return s; return (await fetch('notifications.json').then(r => r.json()).catch(() => null))?.types?.[type]?.offset || 0; };
  const minutesFa = m => m % 60 ? `${toFa(m)} دقیقه` : m === 60 ? 'یک ساعت' : `${toFa(m / 60)} ساعت`;
  async function doaHtml(type) {
    const d = DOAS[type], off = await doaOffset(type);
    const when = `هر ${d.day}${d.night ? ` (${d.night})` : ''} ${off ? `${minutesFa(Math.abs(off))} ${off < 0 ? 'پیش از' : 'پس از'} اذان مغرب` : 'با اذان مغرب'}`;
    return `<h2>${d.title}</h2><p class="ib-sub">${d.sub}</p>
<div class="ib-card"><p style="margin:0">${d.about}</p>
<div class="ib-tools"><button type="button" data-ib="read" data-key="${d.key}">📖 خواندن دعا: متن، ترجمه و صوت</button></div></div>
${await notifyHtml(type, when)}`;
  }
  const PAGES = { javad_wed: javadHtml, ommolbanin: ommolbaninHtml };
  for (const t in DOAS) PAGES[t] = () => doaHtml(t);

  let shade = null, current = null;
  async function render(type) {
    const box = shade.querySelector('.ib-box');
    box.innerHTML = '<button type="button" class="ib-x" data-ib="close" aria-label="بستن">✕</button>' + await PAGES[type]();
  }
  async function open(type) {
    if (!PAGES[type]) return;
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'ib-shade';
      shade.innerHTML = '<div class="ib-box" role="dialog" aria-modal="true"></div>';
      shade.addEventListener('click', onClick);
    }
    current = type;
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    await render(type);
    try { if (!history.state?.ib) history.pushState({ ib: 1 }, ''); } catch {}
  }
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    shade.querySelector('audio')?.pause();
    shade.remove(); document.body.classList.remove('ib-lock'); current = null;
    if (!fromHistory) { try { if (history.state?.ib) history.back(); } catch {} }
  }
  async function onClick(e) {
    if (e.target === shade) return close();
    const b = e.target.closest('[data-ib]'); if (!b) return;
    const a = b.dataset.ib, box = shade.querySelector('.ib-box');
    if (a === 'close') return close();
    if (a === 'tap' || a === 'zero') {
      const n = a === 'zero' ? 0 : Math.min(COUNT, readCount() + 1);
      writeCount(n);
      box.querySelector('[data-ib-n]').textContent = `${toFa(n)} از ${toFa(COUNT)}`;
      const t = box.querySelector('[data-ib=tap]'); t.classList.toggle('ib-done', n >= COUNT); t.textContent = n >= COUNT ? 'تمام شد؛ قبول باشد' : 'بزنید';
      if (n === COUNT && navigator.vibrate) navigator.vibrate([80, 60, 80]);
      return;
    }
    if (a === 'notify') { b.disabled = true; await enableNotify(box); b.disabled = false; return; }
    if (a === 'prefs') return window.sitePush.openSettings();
    if (a === 'read') {
      if (!window.chlRead) return;
      // برگه این دعا بسته می‌شود و خواننده جای آن در تاریخچه می‌نشیند (دکمه برگشت خواننده را می‌بندد).
      close(true); try { if (history.state?.ib) history.replaceState(null, ''); } catch {}
      return window.chlRead(b.dataset.key);
    }
    if (a === 'yasin') {
      const qr = window.quranReader, ix = qr && await qr.index().catch(() => null);
      if (!ix) return alert('بارگذاری متن قرآن انجام نشد. اینترنت را بررسی کنید.');
      close();
      qr.openRange({ title: 'سوره یاسین', sub: 'ختم یاسین حضرت ام‌البنین (س)', from: ix.surah[35], to: ix.surah[36], endText: 'پایان سوره یاسین. قبول باشد.' });
    }
  }
  // برگه «تنظیم اعلان‌ها» روی این برگه باز می‌شود؛ برگشت از آن، این برگه را نمی‌بندد.
  window.addEventListener('popstate', () => { if (!history.state?.ib) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.ibadat.open = open;

  window.siteMenu?.section({
    id: 'ibadat', order: 5,
    render(box) {
      const k = khatm(), today = tehranToday(), i = k ? k.findIndex(d => d >= today) : -1;
      const sub = i >= 0 ? (k[i] === today ? `امشب شب ${NIGHTS[i]} ختم` : `شب ${NIGHTS[i]}: ${dateFa(k[i])}`) : 'هر ماه قمری، چهار شب جمعه';
      box.innerHTML = `<h3>اعمال و ختم‌ها</h3>
<button type="button" class="sm-item" data-ib-open="javad_wed"><span class="sm-ic">🤲</span><span>نماز حاجت امام جواد (ع)<small>چهارشنبه‌ها بعد از نماز عصر</small></span><span class="sm-go">‹</span></button>
<button type="button" class="sm-item" data-ib-open="ommolbanin"><span class="sm-ic">📖</span><span>ختم یاسین حضرت ام‌البنین (س)<small>${sub}</small></span><span class="sm-go">‹</span></button>`;
      box.querySelectorAll('[data-ib-open]').forEach(x => x.onclick = () => { window.siteMenu.close(); setTimeout(() => open(x.dataset.ibOpen), 280); });
    }
  });

  window.siteMenu?.section({
    id: 'doa', order: 6,
    render(box) {
      box.innerHTML = `<h3>ادعیه</h3>${Object.entries(DOAS).map(([k, d]) => `<button type="button" class="sm-item" data-ib-open="${k}"><span class="sm-ic">📿</span><span>${d.title}<small>${d.sub}</small></span><span class="sm-go">‹</span></button>`).join('')}${window.mafatih?.menuItem() || ''}`;
      box.querySelectorAll('[data-ib-open]').forEach(x => x.onclick = () => { window.siteMenu.close(); setTimeout(() => open(x.dataset.ibOpen), 280); });
    }
  });

  // پیوند اعلان: ?doa=javad_wed، ?doa=ommolbanin، ?doa=doa_samat و …
  const q = new URLSearchParams(location.search).get('doa');
  if (q) {
    try { const u = new URL(location.href); u.searchParams.delete('doa'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    open(q);
  }
})();
