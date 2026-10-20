// دور ششم امکانات (هر کدام یک کلید در features.js و روشن/خاموش مدیر در «مدیریت › تنظیمات › امکانات سایت»). این فایل سبک است و فقط
// جای هر امکان را در صفحه می‌گذارد؛ برگه‌ها در plus-sheets.js و ابزارهای خواننده در plus-reader.js هستند که فقط با اولین استفاده بار می‌شوند.
// - کارت «امروز» (daily.js): countdown (روزهای مانده تا مناسبت‌های تعطیل رسمی)، muharram (۱ محرم تا آخر صفر)، events (جلسه پیش رو)،
//   ehda (پنجشنبه و جمعه)، taqib (تا یک ساعت پس از هر اذان)، layl (از نیمه‌شب شرعی تا اذان صبح)، mahdi (روز جمعه) و wird (پیشرفت امروز).
// - منوی ☰: دسته «برنامه عبادی» (wird، layl، qaza، mahdi، ehda)، «سوره‌های پرکاربرد» زیر قرآن، و در «بیشتر» برنامه جلسات و تبدیل تاریخ؛
//   در «تنظیمات» پشتیبان و حالت کم‌حجم.
// - lockplay: نام متن و دکمه‌های پخش روی صفحه قفل گوشی و هدفون (Media Session) برای هر صوتی که سایت پخش می‌کند.
// - lite: ویژگی data-lite روی <html> (اسکریپت اول index.html پیش از نمایش صفحه می‌گذارد): بی‌تصویر زمینه و بی‌جلوه (backdrop.css).
// - پیوندهای مستقیم: ‎?read=kumayl‎ (متن‌های خواننده دعا) و ‎?ayah=2:255‎ (یک آیه در قرآن آزاد)، برای «فرستادن پیوند».
// داده‌های مدیر در site_settings: ehda = { names: [..], note }، events = [{ id, t, at: 'YYYY-MM-DDTHH:MM' (به وقت تهران), place, link, note }].
(function () {
  const shown = id => !!window.features?.shown(id);
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const MIN = 6e4, DAY = 864e5;

  // ---------- بار کردن برگه‌ها ----------
  let loading = null;
  const load = () => loading || (loading = new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'plus-sheets.js?v=1';
    s.onload = ok; s.onerror = () => { loading = null; s.remove(); bad(); };
    document.head.appendChild(s);
  }));
  const sheet = (name, arg) => load().then(() => window.plusSheets[name](arg)).catch(() => alert('بارگذاری انجام نشد. اینترنت را بررسی کنید.'));

  // ---------- داده‌های مدیر ----------
  const ehdaConf = () => { const e = window.siteSettings?.ehda; return { names: Array.isArray(e?.names) ? e.names.filter(x => typeof x === 'string' && x.trim()).slice(0, 200) : [], note: typeof e?.note === 'string' ? e.note : '' }; };
  const tehranMs = at => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(at || ''); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) - 3.5 * 36e5 : NaN; };
  // جلسه‌ها به ترتیب زمان؛ جلسه‌ای که شروع شده تا دو ساعت پس از آن هنوز «امروز» دیده می‌شود.
  const events = (now = Date.now()) => (Array.isArray(window.siteSettings?.events) ? window.siteSettings.events : [])
    .filter(e => e && typeof e.t === 'string' && e.t.trim() && isFinite(tehranMs(e.at)) && tehranMs(e.at) > now - 2 * 36e5)
    .sort((a, b) => tehranMs(a.at) - tehranMs(b.at));
  const myEhda = () => (read('ehdaMine', []) || []).filter(x => typeof x === 'string' && x.trim());

  // ---------- برنامه عبادی روزانه (wird) ----------
  // کلید wird: { on: [شناسه‌ها], custom: [{ id, t }], done: { 'YYYY-MM-DD': [شناسه‌ها] } } ؛ روز با تاریخ شهر کارت «امروز» عوض می‌شود.
  const WIRD = [
    ['fajr', '🌅', 'نماز صبح اول وقت'], ['dhuhr', '☀️', 'نماز ظهر و عصر'], ['maghrib', '🌇', 'نماز مغرب و عشا'],
    ['zahra', '📿', 'تسبیحات حضرت زهرا (س)'], ['quran', '📖', 'دست‌کم یک صفحه قرآن'], ['salavat', '🤲', 'صد صلوات'],
    ['ahd', '🌟', 'دعای عهد'], ['ashura', '🏴', 'زیارت عاشورا'], ['layl', '🌌', 'نماز شب'], ['sadaqa', '💚', 'صدقه'],
    ['parents', '🕊️', 'دعا برای پدر و مادر'], ['istighfar', '🙏', 'استغفار']
  ];
  const WDEF = ['fajr', 'dhuhr', 'maghrib', 'zahra', 'quran'];
  const wird = () => { const w = read('wird', null); return w && typeof w === 'object' ? { on: Array.isArray(w.on) ? w.on : WDEF, custom: Array.isArray(w.custom) ? w.custom : [], done: w.done && typeof w.done === 'object' ? w.done : {} } : null; };
  const todayIso = () => { const D = window.daily; if (!D) return new Date().toISOString().slice(0, 10); const L = D.loc(); return D.ymd(D.clock(L.tz), L.tz); };

  // ---------- کارت «امروز» ----------
  const D = window.daily;
  const HM = ['محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی‌القعده', 'ذی‌الحجه'];
  const WD = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  const mf = () => !!window.mafatih?.openKey && shown('mafatih');
  if (D) {
    document.head.insertAdjacentHTML('beforeend', `<style>
#dlCard .px-cd{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 8px;font-size:14px;color:var(--dl-m)}
#dlCard .px-cd li{padding:1px 10px;border:1px solid var(--dl-line);border-radius:999px;background:var(--dl-soft)}
#dlCard .px-cd b{color:var(--dl-h);font-weight:700}
#dlCard .px-mh{margin:6px 0 0;padding:6px 10px 4px;background:#2b2523;color:#f3e9da;border:1px solid #4a3f3a;border-radius:var(--r)}
#dlCard .px-mh p{margin:0;text-align:center;font-size:15px;font-weight:600}
#dlCard .px-mh small{display:block;font-weight:400;font-size:13.5px;opacity:.85}
#dlCard .px-mh .dl-act{background:transparent;color:#f3e9da;border-color:#5a4d46}
#dlCard .px-mh .dl-act b{color:#f7eedf}
#dlCard .px-mh .dl-act small,#dlCard .px-mh .dl-go{color:#d9cbb8}
#dlCard .px-mh .dl-ic{background:#ffffff1a}
#dlCard .px-rows .dl-act{margin-top:4px}
#dlCard .px-w{display:flex;align-items:center;gap:8px;width:100%;height:auto;min-height:44px;margin:6px 0 0;padding:4px 8px;background:transparent;border:1px dashed var(--dl-line);border-radius:var(--r);color:var(--dl-h);font:inherit;font-size:14.5px;text-align:right;cursor:pointer}
#dlCard .px-w span{flex:1}
#dlCard .px-w i{font-style:normal;letter-spacing:2px}
html[data-theme=dark] #dlCard .px-mh{background:#16110f}
</style>`);
    D.go('px', k => k === 'zahra' ? window.zekr?.open?.('zahra') : sheet(k));
    const act = (go, ic, t, s) => `<button type="button" class="dl-act" data-go="${esc(go)}"><span class="dl-ic" aria-hidden="true">${ic}</span><span><b>${esc(t)}</b><small>${esc(s)}</small></span><span class="dl-go" aria-hidden="true">‹</span></button>`;
    const occMemo = new Map();
    const holidays = iso => { if (!occMemo.has(iso)) { occMemo.set(iso, (window.dailyInfo?.(iso)?.occ || []).filter(o => o.hol).map(o => o.t)); if (occMemo.size > 400) occMemo.clear(); } return occMemo.get(iso); };
    D.block(({ L, iso, T, now }) => {
      let html = '', arb = false;
      const h = D.hijri(iso) || { m: 0, d: 0 }, wd = new Date(iso + 'T12:00:00Z').getUTCDay(), beforeFajr = now < T.fajr, day = !beforeFajr && now < T.mag;
      // حالت محرم و صفر
      if (shown('muharram') && (h.m === 1 || h.m === 2)) {
        const eve = now >= T.mag, he = eve ? D.hijri(D.addDays(iso, 1)) : h, rows = [];
        const head = '🏴 ایام سوگواری سالار شهیدان (ع)';
        let sub = '';
        if (eve && he?.m === 1 && he.d <= 10) sub = `امشب، شب ${['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم (تاسوعا)', 'دهم (عاشورا)'][he.d - 1]} محرم`;
        // اربعین ۲۰ صفر: از روز ۱۱ محرم شمار روزها؛ روز اربعین را کارت «امروز» خودش نشان می‌دهد
        let toArb = 0;
        if (h.m === 2 ? h.d < 20 : h.d >= 11) for (let i = 1; i <= 40; i++) { const x = D.hijri(D.addDays(iso, i)); if (x?.m === 2 && x.d === 20) { toArb = i; break; } }
        if (!sub && toArb) { sub = `${toFa(toArb)} روز تا اربعین حسینی`; arb = true; }
        if (!(h.m === 1 && h.d <= 10)) rows.push(act('rd:ashura', '🏴', 'زیارت عاشورا', 'هر روز این ایام، با صوت'));
        if (mf()) {
          rows.push(act('mf:280', '🕌', 'زیارت وارث', 'مفاتیح‌الجنان'));
          if (h.m === 1 && h.d <= 12) rows.push(act('mf:652', '🕯️', 'زیارت ناحیه مقدسه', 'مفاتیح‌الجنان'));
          if (h.m === 2 && h.d >= 10 && h.d < 20) rows.push(act('mf:299', '🚶', 'زیارت اربعین', 'برای روز اربعین'));
        }
        html += `<div class="px-mh"><p>${esc(head)}${sub ? `<small>${esc(sub)}</small>` : ''}</p>${rows.slice(0, 2).join('')}</div>`;
      }
      // روزهای مانده تا مناسبت‌ها (تعطیل‌های رسمی مذهبی؛ دو مورد پیش رو در ۹۰ روز آینده)
      if (shown('countdown')) {
        const out = [];
        for (let i = 1; i <= 90 && out.length < 2; i++) { const t = holidays(D.addDays(iso, i)); if (t.length && !(arb && /اربعین/.test(t[0]))) out.push(`<li><b>${toFa(i)}</b> ${i === 1 ? 'روز، فردا' : 'روز'} تا ${esc(t[0].split('؛')[0])}</li>`); }
        if (out.length) html += `<ul class="px-cd" aria-label="روزهای مانده تا مناسبت‌ها">${out.join('')}</ul>`;
      }
      const rows = [];
      // تعقیبات: تا یک ساعت پس از اذان صبح، ظهر و مغرب
      if (shown('taqib') && mf()) {
        const tq = [[T.fajr, '006', 'صبح'], [T.dhuhr, '002', 'ظهر و عصر'], [T.mag, '004', 'مغرب و عشا']].find(([t]) => now >= D.round(t) && now - D.round(t) < 60 * MIN);
        if (tq) rows.push(act('mf:' + tq[1], '🕋', `تعقیبات نماز ${tq[2]}`, 'مفاتیح‌الجنان؛ و تسبیحات حضرت زهرا (س)'));
      }
      // نماز شب: از نیمه‌شب شرعی تا اذان صبح
      if (shown('layl')) {
        const end = now < T.fajr && now >= T.prevMid ? T.fajr : now >= T.mid && now < T.nextFajr ? T.nextFajr : 0;
        if (end) rows.push(act('px:layl', '🌌', 'وقت نماز شب است', `${D.dur(end - now)} تا اذان صبح؛ هرچه نزدیک‌تر به اذان، بهتر`));
      }
      // جلسه پیش رو: از هفت روز پیش از آن
      if (shown('events')) {
        const e = events(now)[0];
        if (e && tehranMs(e.at) - now < 7 * DAY) {
          const t = tehranMs(e.at), dd = Math.round((Date.parse(new Date(t + 3.5 * 36e5).toISOString().slice(0, 10)) - Date.parse(D.ymd(now, 'Asia/Tehran'))) / DAY);
          const when = (dd <= 0 ? (t <= now ? 'هم‌اکنون' : 'امروز') : dd === 1 ? 'فردا' : WD[new Date(t + 3.5 * 36e5).getUTCDay()]) + (t > now ? `، ساعت ${D.hm(t, 'Asia/Tehran')}` : '');
          rows.push(act('px:events', '📅', e.t, `${when}${e.place ? `، ${e.place}` : ''}`));
        }
      }
      // یاد درگذشتگان: پنجشنبه از اذان ظهر تا غروب جمعه
      if (shown('ehda') && ((wd === 4 && now >= T.dhuhr) || (wd === 5 && now < T.mag))) {
        const n = ehdaConf().names.length + myEhda().length;
        rows.push(act('px:ehda', '🕯️', 'یاد درگذشتگان', n ? `فاتحه برای شادی روح ${toFa(n)} نفر` : 'فاتحه و صلوات برای درگذشتگان'));
      }
      // جمعه، روز امام زمان (عج)
      if (shown('mahdi') && wd === 5 && day) rows.push(act('px:mahdi', '🌟', 'جمعه، روز امام زمان (عج)', 'دعای سلامتی و فرج، ندبه، عهد و زیارت آل‌یاسین'));
      // بیش از دو ردیف کارت را شلوغ می‌کند؛ ترتیب بالا همان اولویت است.
      if (rows.length) html += `<div class="px-rows">${rows.slice(0, 2).join('')}</div>`;
      // برنامه عبادی امروز
      const w = shown('wird') && wird();
      if (w) {
        const ids = [...w.on.filter(id => WIRD.some(x => x[0] === id)), ...w.custom.map(c => c.id)], done = (w.done[iso] || []).filter(id => ids.includes(id)).length;
        if (ids.length) html += `<button type="button" class="px-w" data-go="px:wird"><span>✅ برنامه امروز: <b>${toFa(done)}</b> از ${toFa(ids.length)}${done === ids.length ? '، قبول باشد' : ''}</span><i aria-hidden="true">${'●'.repeat(Math.min(done, 12))}${'○'.repeat(Math.max(0, Math.min(ids.length, 12) - done))}</i></button>`;
      }
      return html;
    });
  }

  // ---------- منو ----------
  const item = (attr, ic, t, s) => `<button type="button" class="sm-item" data-px-open="${attr}"><span class="sm-ic">${ic}</span><span>${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</span><span class="sm-go">‹</span></button>`;
  window.siteMenu?.section({
    id: 'worship', order: 5.6,
    render(box) {
      const w = wird(), it = [];
      if (shown('wird')) it.push(item('wird', '✅', 'برنامه عبادی روزانه', w ? 'تیک کارهای امروز' : 'کارهای خیر هر روز، با تیک زدن'));
      if (shown('layl')) it.push(item('layl', '🌌', 'راهنمای نماز شب', 'وقت امشب، رکعت‌ها و قنوت وتر'));
      if (shown('mahdi')) it.push(item('mahdi', '🌟', 'گوشه امام زمان (عج)', 'دعای سلامتی و فرج، عهد، ندبه و آل‌یاسین'));
      if (shown('qaza')) { const q = read('qaza', null), n = q ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].reduce((a, k) => a + (+q[k] || 0), 0) : 0; it.push(item('qaza', '🧾', 'حساب نماز و روزه قضا', n ? `${toFa(n)} نماز مانده` : 'شمار قضا و برنامه ادا')); }
      if (shown('ehda')) it.push(item('ehda', '🕯️', 'یاد درگذشتگان', 'فاتحه و دعا برای اموات'));
      box.innerHTML = it.length ? '<h3>برنامه عبادی</h3>' + it.join('') : '';
    }
  });
  window.siteMenu?.section({
    id: 'popsurahs', order: 2.1,
    render(box) { box.innerHTML = shown('popsurahs') ? item('popsurahs', '⭐', 'سوره‌ها و آیه‌های پرکاربرد', 'یس، الرحمن، واقعه، ملک، آیة‌الکرسی و…') : ''; }
  });
  const more = window.siteMore;
  if (more) {
    more.add({ id: 'events', icon: '📅', title: 'برنامه جلسات', sub: 'جلسه‌ها و مراسم پیش رو', open: () => sheet('events'), when: () => shown('events') && events().length > 0 });
    more.add({ id: 'convert', icon: '📆', title: 'تبدیل تاریخ', sub: 'شمسی، قمری و میلادی', open: () => sheet('convert'), when: () => shown('convert') });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-px-open]'); if (!b) return;
    const k = b.dataset.pxOpen;
    if (k === 'lite') { setLite(!liteOn()); window.siteMenu?.refresh(); return; }
    window.siteMenu?.close(); setTimeout(() => sheet(k), 280);
  });

  // ---------- حالت کم‌حجم (lite) ----------
  // کلید lite: '1' روشن، '0' خاموش؛ اگر نبود و گوشی «صرفه‌جویی داده» را خواسته، روشن.
  const saveData = () => !!navigator.connection?.saveData;
  const liteOn = () => { const v = (() => { try { return localStorage.getItem('lite'); } catch { return null; } })(); return shown('lite') && (v === '1' || (v !== '0' && saveData())); };
  function setLite(on) { try { localStorage.setItem('lite', on ? '1' : '0'); } catch {} applyLite(); }
  function applyLite() { liteOn() ? document.documentElement.setAttribute('data-lite', '') : document.documentElement.removeAttribute('data-lite'); }
  document.addEventListener('features:changed', applyLite);
  applyLite();

  // ---------- پیوندهای مستقیم ----------
  const qs = new URLSearchParams(location.search), qRead = qs.get('read'), qAyah = /^(\d{1,3}):(\d{1,3})$/.exec(qs.get('ayah') || '');
  if (qRead || qAyah) {
    try { const u = new URL(location.href); u.searchParams.delete('read'); u.searchParams.delete('ayah'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    const go = () => {
      if (qRead && /^[a-z0-9_]{2,30}$/.test(qRead)) window.chlRead?.(qRead);
      if (qAyah) {
        const s = +qAyah[1], a = +qAyah[2], R = window.quranReader;
        R?.index().then(ix => { if (s >= 1 && s <= 114 && a >= 1 && a <= R.ayahs(s)) window.quranFree?.openAt(ix.surah[s - 1] + a - 1); }).catch(() => {});
      }
    };
    document.readyState === 'complete' ? setTimeout(go, 300) : addEventListener('load', () => setTimeout(go, 300), { once: true });
  }

  // ---------- کنترل صوت از صفحه قفل (lockplay) ----------
  // هر audio که سایت پخش کند (خواننده دعا و کتاب در صفحه است؛ قرآن‌خوان Audio بیرون از صفحه دارد، پس play خود Audio پیچیده شده).
  if ('mediaSession' in navigator && window.MediaMetadata) {
    let cur = null;
    const title = () => {
      const qr = document.querySelector('.qr.show'), cr = [...document.querySelectorAll('body > .cr.show')].pop();
      if (qr) return [qr.querySelector('#qrTitle')?.textContent || 'قرآن', qr.querySelector('#qrSub')?.textContent || 'قرآن کریم'];
      if (cr) return [cr.querySelector('.cr-title b')?.textContent || cr.querySelector('.cr-head h3')?.textContent || 'نوران', cr.querySelector('.cr-aud select')?.selectedOptions?.[0]?.textContent || ''];
      return [document.title.split('|')[0].trim() || 'نوران', ''];
    };
    const ms = navigator.mediaSession;
    const set = (k, f) => { try { ms.setActionHandler(k, f); } catch {} };
    function hook(el) {
      if (!shown('lockplay')) return;
      cur = el;
      const [t, s] = title();
      try { ms.metadata = new MediaMetadata({ title: t, artist: s || 'نوران', album: 'نوران', artwork: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] }); } catch {}
      set('play', () => cur?.play());
      set('pause', () => cur?.pause());
      set('seekbackward', d => { if (cur) cur.currentTime = Math.max(0, cur.currentTime - (d?.seekOffset || 10)); });
      set('seekforward', d => { if (cur && isFinite(cur.duration)) cur.currentTime = Math.min(cur.duration - 0.5, cur.currentTime + (d?.seekOffset || 10)); });
      ms.playbackState = 'playing';
    }
    const P = HTMLMediaElement.prototype, play = P.play;
    P.play = function () { const r = play.apply(this, arguments); try { if (this instanceof HTMLAudioElement) hook(this); } catch {} return r; };
    document.addEventListener('pause', e => { if (e.target === cur && shown('lockplay')) ms.playbackState = 'paused'; }, true);
  }

  // ---------- ابزارهای خواننده (find، progress، sharelink) ----------
  let rd = null;
  const wantReader = () => shown('find') || shown('progress') || shown('sharelink');
  const loadReader = () => rd || (rd = new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'plus-reader.js?v=2';
    s.onload = ok; s.onerror = () => { rd = null; s.remove(); bad(); };
    document.head.appendChild(s);
  }));
  const checkReaders = () => { if (wantReader() && document.querySelector('body > .cr')) loadReader().catch(() => {}); };
  new MutationObserver(checkReaders).observe(document.body, { childList: true });
  document.addEventListener('features:changed', checkReaders);
  // کلید متن باز در خواننده دعا (برای «فرستادن پیوند»): همان که chelleh.js با chlread:open می‌فرستد
  document.addEventListener('chlread:open', e => { window.plusReaderKey = e.detail?.key || null; });

  // ---------- منوی «تنظیمات» (reminders.js) ----------
  window.plus = {
    sheet, events, ehdaConf, myEhda, wird, WIRD, WDEF, todayIso, tehranMs, toFa, esc, read, write, HM, WD,
    menuItem() {
      let h = '';
      if (shown('backup')) h += item('backup', '💾', 'پشتیبان و انتقال', 'نشانه‌ها، ذکرها و برنامه‌ها در یک فایل، برای گوشی دیگر');
      if (shown('lite')) h += `<button type="button" class="sm-item" data-px-open="lite" aria-pressed="${liteOn()}"><span class="sm-ic">🪶</span><span>حالت کم‌حجم<small>${liteOn() ? 'روشن: بی‌تصویر زمینه و بی‌جلوه' : 'خاموش؛ برای اینترنت ضعیف روشن کنید'}</small></span><span class="sm-go">${liteOn() ? '✓' : ''}</span></button>`;
      return h;
    },
    refresh: () => { D?.refresh(); window.siteMenu?.refresh(); }
  };

  // ---------- کارت‌های مدیریت (یاد درگذشتگان و برنامه جلسات) ----------
  document.addEventListener('admin:tab', e => { if (e.detail === 'settings' && (shown('ehda') || shown('events'))) load().then(() => window.plusSheets.adminCards()).catch(() => {}); });
})();
