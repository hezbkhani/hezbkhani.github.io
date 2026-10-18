// جستجوی سایت (امکان search): یک کادر جستجو برای سوره‌ها، آیه‌ها (متن عربی و ترجمه)، ادعیه و زیارات، دوره‌ها و چله‌ها، و تنظیمات و بخش‌ها.
// ورود: دکمه 🔎 در سربرگ منوی ☰ (menu.js) و کلید «/» روی رایانه.
// گزینه‌های منو از خود منو خوانده می‌شوند (siteMenu.items())، پس هر چیزی که در منو هست (حتی بخش‌هایی که بعداً اضافه شوند) پیدا می‌شود
// و با زدن، دقیقاً همان کاری را می‌کند که زدنش در منو می‌کند. دعاها از chelleh/index.json و گزینه‌های بخش ادعیه منو می‌آیند و با chlRead باز می‌شوند.
// متن قرآن (۱۲۰ فایل quran/p، حدود ۳ مگابایت) فقط وقتی کسی جستجو در آیه‌ها را بزند گرفته می‌شود.
// بخش‌های دیگر هم می‌توانند فهرست خودشان را بدهند: siteSearch.add({ group: 'duas'|'courses'|'sections', title, sub, keys, run })
// پنج جستجوی آخر فقط روی همین گوشی (localStorage، کلید searchRecent).
(function () {
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shown = () => !!window.features?.shown('search');
  const AR = 'الفاتحة البقرة آل_عمران النساء المائدة الأنعام الأعراف الأنفال التوبة يونس هود يوسف الرعد إبراهيم الحجر النحل الإسراء الكهف مريم طه الأنبياء الحج المؤمنون النور الفرقان الشعراء النمل القصص العنكبوت الروم لقمان السجدة الأحزاب سبأ فاطر يس الصافات ص الزمر غافر فصلت الشورى الزخرف الدخان الجاثية الأحقاف محمد الفتح الحجرات ق الذاريات الطور النجم القمر الرحمن الواقعة الحديد المجادلة الحشر الممتحنة الصف الجمعة المنافقون التغابن الطلاق التحريم الملك القلم الحاقة المعارج نوح الجن المزمل المدثر القيامة الإنسان المرسلات النبأ النازعات عبس التكوير الانفطار المطففين الانشقاق البروج الطارق الأعلى الغاشية الفجر البلد الشمس الليل الضحى الشرح التين العلق القدر البينة الزلزلة العاديات القارعة التكاثر العصر الهمزة الفيل قريش الماعون الكوثر الكافرون النصر المسد الإخلاص الفلق الناس'.split(' ').map(x => x.replace('_', ' '));

  // ---------- یکسان‌سازی حروف ----------
  // عربی و فارسی یکسان (ي/ی، ك/ک، ة/ه، أإآٱ/ا، ؤ/و)، بدون اعراب، علامت‌های وقف، کشیده (ـ)، نیم‌فاصله؛ ارقام لاتین. «وٰ» رسم‌الخط عثمانی (صلوٰة) = «ا».
  // خروجی: متن یکسان‌شده بی‌فاصله و جای هر حرفش در متن اصلی (برای پررنگ کردن همان تکه).
  const DROP = /[ً-ٰٟۖ-ۭـ​-‏؜ء]/;
  const MAP = { 'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و' };
  function tightMap(s) {
    s = String(s); let t = ''; const at = [];
    for (let i = 0; i < s.length; i++) {
      let c = s[i];
      if (c === 'و' && s[i + 1] === 'ٰ') c = 'ا';
      else if (DROP.test(c)) continue;
      // فاصله‌ها یکی می‌شوند
      else if (/\s/.test(c)) { if (t && t[t.length - 1] !== ' ') { t += ' '; at.push(i); } continue; }
      const d = fa.indexOf(c), e = '٠١٢٣٤٥٦٧٨٩'.indexOf(c);
      c = d >= 0 ? String(d) : e >= 0 ? String(e) : (MAP[c] || c).toLowerCase();
      t += c; at.push(i);
    }
    if (t.endsWith(' ')) { t = t.slice(0, -1); at.pop(); }
    return { t, at };
  }
  const tight = s => tightMap(s).t;
  const words = s => String(s).split(/[\s،,.:؛]+/).map(tight).filter(Boolean);
  const bare = s => tight(s).replace(/ /g, '');
  const mark = (s, q) => {
    const m = tightMap(s), i = q ? m.t.indexOf(q) : -1;
    if (i < 0) return esc(s);
    const a = m.at[i], b = m.at[i + q.length - 1] + 1;
    return esc(s.slice(0, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>' + esc(s.slice(b));
  };
  // تکه‌ای از متن بلند، دور جای پیداشده
  const snip = (s, q, n = 110) => {
    const m = tightMap(s), i = q ? m.t.indexOf(q) : -1;
    if (i < 0) return esc(s.length > n ? s.slice(0, n) + '…' : s);
    const a = m.at[i], b = m.at[i + q.length - 1] + 1, from = Math.max(0, s.lastIndexOf(' ', Math.max(0, a - 40)));
    const to = Math.min(s.length, b + n - (a - from));
    return (from > 0 ? '…' : '') + esc(s.slice(from, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>' + esc(s.slice(b, to)) + (to < s.length ? '…' : '');
  };

  const css = `
.srch{position:fixed;inset:0;z-index:63;display:flex;flex-direction:column;background:#fffaf0;color:var(--ink);text-shadow:none}
.srch-top{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));background:var(--deep);border-bottom:2px solid var(--gold)}
.srch-top input{flex:1;max-width:640px;height:48px;font-size:17px;border-radius:var(--r-card);padding:0 14px}
.srch-top button{flex:none;width:48px;height:48px;padding:0;background:transparent;border:0;color:#fff;font-size:24px}
.srch-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px 0 calc(24px + env(safe-area-inset-bottom))}
.srch-in{max-width:640px;margin:0 auto;padding:0 14px}
.srch-g{margin:10px 0 0}
.srch-g h3{display:flex;align-items:center;gap:8px;margin:12px 0 4px;font-size:14px;font-weight:700;color:var(--muted)}
.srch-g h3 small{padding:0 8px;border-radius:999px;background:var(--mint);color:var(--deep);font-size:12.5px;font-weight:600}
.srch-it{display:flex;align-items:center;gap:12px;width:100%;height:auto;min-height:52px;margin:0;padding:8px 10px;background:transparent;border:0;border-bottom:1px solid var(--line);border-radius:0;color:var(--ink);text-align:right;font-weight:500;font-size:16px;white-space:normal;line-height:1.6}
.srch-it:hover,.srch-it:focus-visible{background:var(--hover)}
.srch-it .srch-ic{flex:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--mint);color:var(--deep);font-size:18px}
.srch-it span{flex:1;min-width:0}
.srch-it small{display:block;color:var(--muted);font-size:13.5px;font-weight:400;line-height:1.7}
.srch-it .srch-ar{display:block;font:normal 21px/1.9 QuranHafs,serif;color:var(--ink);direction:rtl}
.srch-it mark{background:#fde9a8;color:inherit;border-radius:3px}
.srch-more{display:block;width:100%;height:46px;margin:6px 0 0;background:var(--cream);color:var(--deep);border:1px solid var(--line);font-size:15px}
.srch-more:hover{background:var(--hover)}
.srch-note{margin:8px 2px;color:var(--muted);font-size:14.5px;line-height:1.8}
.srch-chips{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.srch-chips button{height:44px;padding:0 14px;background:#fff;color:var(--deep);border:1px solid var(--line);font-weight:500;font-size:15px}
.srch-chips button:hover{background:var(--hover)}
.srch-clear{height:auto!important;padding:0!important;border:0!important;background:none!important;color:var(--muted)!important;text-decoration:underline;font-size:13px!important;font-weight:400!important}
.srch-bar{height:4px;margin:6px 0;background:var(--line);border-radius:2px;overflow:hidden}.srch-bar i{display:block;height:100%;width:0;background:var(--emerald);transition:width .2s}
body.srch-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- جستجوهای اخیر ----------
  const RK = 'searchRecent';
  const recent = () => { try { const a = JSON.parse(localStorage.getItem(RK)); return Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, 5) : []; } catch { return []; } };
  const remember = q => { q = q.trim(); if (q.length < 2) return; const a = [q, ...recent().filter(x => tight(x) !== tight(q))].slice(0, 5); try { localStorage.setItem(RK, JSON.stringify(a)); } catch {} };

  // ---------- داده‌ها ----------
  let ix = null, duaList = null, duaListResolved = null, menuList = [], extra = [], mafItems = null;
  const getIx = () => ix ? Promise.resolve(ix) : window.quranReader.index().then(x => (ix = x));
  // همان فهرستی که chelleh.js گرفته به کار می‌رود (دوباره دانلود نمی‌شود).
  const getDuas = () => duaList || (duaList = (window.chlBuiltins ? window.chlBuiltins() : fetch('chelleh/index.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }))
    .then(a => { if (!a.length) throw Error('empty'); return a.filter(d => d && d.key && d.title && !d.quran); }).catch(() => { duaList = null; return []; }));
  const ayahCount = s => (s < 114 ? ix.surah[s] : ix.total) - ix.surah[s - 1];

  // کلمه‌های دیگری که مردم برای هر بخش می‌نویسند
  const SYN = [
    [/اعلان/, 'نوتیفیکیشن یادآوری اطلاع notification'],
    [/زمینه/, 'پس زمینه پسزمینه عکس تصویر ظاهر تم background'],
    [/حساب|ورود/, 'حساب کاربری ورود لاگین login ثبت نام عضویت'],
    [/نصب/, 'نصب برنامه اپ اپلیکیشن app install دانلود'],
    [/پیشنهاد|نظر/, 'پیشنهادها نظر انتقاد تماس ارتباط پیام feedback'],
    [/اندازه متن|حالت تاریک/, 'اندازه فونت قلم درشت ریز تاریک تیره شب روشن dark رنگ فاصله خطوط حرکت'],
    [/نمایش امکانات/, 'امکانات ویژگی پنهان'],
    [/قرآن آزاد/, 'قرآن مصحف خواندن صفحه جزء سوره'],
    [/سهم|حزب/, 'حزب حزب خوانی سهم'],
    [/چله/, 'چله دوره ثبت نام']
  ];
  const GROUPS = [['surahs', 'سوره‌ها'], ['ayahs', 'آیه‌ها'], ['duas', 'ادعیه، زیارات و کتاب‌ها'], ['courses', 'دوره‌ها و چله‌ها'], ['sections', 'تنظیمات و بخش‌ها']];
  // گزینه‌های منو: هر گزینه با نشانی خودش (شناسه بخش، شماره گزینه در بخش و عنوان) تا هنگام زدن دوباره پیدا شود.
  function readMenu() {
    menuList = [];
    const body = window.siteMenu?.items?.(); if (!body) return;
    const groupOf = (sec, head) => /chelleh/.test(sec) || /چله|دوره/.test(head) ? 'courses' : /ibadat|doa|dua|mafatih|ziarat|books|more|zekr/.test(sec) || /ادعیه|دعا|زیار|اعمال|ختم|مفاتیح|کتاب|ذکر|اذان/.test(head) ? 'duas' : 'sections';
    body.querySelectorAll('.sm-sec').forEach((sec, si) => {
      const id = sec.dataset.sec || `#${si}`;
      const items = [...sec.querySelectorAll('.sm-item')];
      const headOf = el => { const gb = el.closest('.sm-grp-body'); return (gb ? gb.previousElementSibling?.querySelector('b') : sec.querySelector('h3'))?.textContent.trim() || ''; };
      items.forEach((el, i) => {
        const tx = el.querySelector('span:not(.sm-ic):not(.sm-go)') || el, sm = tx.querySelector('small');
        const sub = sm ? sm.textContent.trim() : '', title = (tx.textContent.slice(0, tx.textContent.length - sub.length) || '').trim();
        if (!title) return;
        const head = headOf(el), ic = el.querySelector('.sm-ic')?.textContent.trim() || '•';
        const syn = SYN.filter(([re]) => re.test(title + ' ' + head)).map(([, w]) => w).join(' ');
        menuList.push({ group: groupOf(id, head), title, sub: sub || head, ic, keys: [title, sub, head, syn].join(' '), loc: { id, i, title, inline: el.matches('[data-fb-open]') } });
      });
      // بخش‌هایی که گزینه معمولی ندارند (مثل «زمینه صفحه»): خود عنوان، که منو را همان‌جا باز می‌کند.
      if (!items.length) {
        const head = (sec.querySelector('h3') || sec.querySelector('.sm-grp b'))?.textContent.trim();
        if (head) menuList.push({ group: 'sections', title: head, sub: 'در منوی ☰', ic: '☰', keys: head + ' ' + SYN.filter(([re]) => re.test(head)).map(([, w]) => w).join(' '), loc: { id, head, inline: true } });
      }
    });
  }
  // زدن گزینه منو: همان دکمه در منو زده می‌شود (منو بسته می‌ماند)؛ گزینه‌هایی که داخل خود منو باز می‌شوند (پیشنهادها، زمینه صفحه) منو را باز می‌کنند.
  function runMenu(loc) {
    const sm = window.siteMenu; if (!sm) return;
    const find = body => { const sec = body.querySelector(`.sm-sec[data-sec="${CSS.escape(loc.id)}"]`) || [...body.querySelectorAll('.sm-sec')][+String(loc.id).slice(1)]; return sec; };
    if (loc.inline) {
      sm.open();
      const sec = find(document.querySelector('.sm-body')); if (!sec) return;
      const grp = [...sec.querySelectorAll('.sm-grp')].find(b => !loc.head || b.textContent.includes(loc.head));
      if (grp && grp.getAttribute('aria-expanded') !== 'true') grp.click();
      setTimeout(() => { sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (loc.i != null) sec.querySelectorAll('.sm-item')[loc.i]?.click(); }, 300);
      return;
    }
    const sec = find(sm.items()); if (!sec) return;
    const items = [...sec.querySelectorAll('.sm-item')];
    const el = items[loc.i] && items[loc.i].textContent.includes(loc.title) ? items[loc.i] : items.find(x => x.textContent.includes(loc.title));
    el?.click();
  }

  // متن عربی و ترجمه مکارم همه آیه‌ها، بار اول جستجو در آیه‌ها
  let all = null, loading = null;
  function loadAyahs(onProgress) {
    if (all) return Promise.resolve(all);
    if (loading) return loading;
    let done = 0;
    loading = getIx().then(() => Promise.all(ix.portion.map((_, i) => fetch(`quran/p/${String(i + 1).padStart(3, '0')}.json`).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(d => { onProgress && onProgress(++done / ix.portion.length); return d; }))))
      .then(files => {
        const list = [];
        files.forEach(d => d.segments.forEach(seg => seg.ayahs.forEach(([ar, tr], j) => list.push({ g: ix.surah[seg.s - 1] + seg.from + j - 1, s: seg.s, n: seg.from + j, ar, tr, art: tight(ar), trt: tight(tr) }))));
        return (all = list);
      }).finally(() => { loading = null; });
    return loading;
  }

  // ---------- برگه جستجو ----------
  let shade = null, input = null, out = null, timer = 0, thenAfter = null, more = {}, ayahWanted = false;
  function open(q) {
    if (!shown()) return;
    if (shade && shade.isConnected) { input.focus(); return; }
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'srch'; shade.setAttribute('role', 'dialog'); shade.setAttribute('aria-modal', 'true'); shade.setAttribute('aria-label', 'جستجو');
      shade.innerHTML = `<div class="srch-top"><input type="search" enterkeyhint="search" autocomplete="off" placeholder="سوره، آیه، دعا، چله، تنظیمات…" aria-label="جستجو در سایت"><button type="button" data-s="close" aria-label="بستن">✕</button></div><div class="srch-body"><div class="srch-in" aria-live="polite"></div></div>`;
      input = shade.querySelector('input'); out = shade.querySelector('.srch-in');
      input.addEventListener('input', () => { clearTimeout(timer); more = {}; ayahWanted = !!all; timer = setTimeout(draw, 120); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); remember(input.value); out.querySelector('.srch-it')?.click(); } });
      shade.addEventListener('click', onClick);
    }
    more = {}; ayahWanted = !!all;
    input.value = q || '';
    document.body.appendChild(shade); document.body.classList.add('srch-lock');
    try { if (!history.state?.srch) history.pushState({ srch: 1 }, ''); } catch {}
    readMenu(); draw();
    getIx().then(() => { if (shade.isConnected && input.value) draw(); }).catch(() => {});
    getDuas().then(a => { duaListResolved = a; if (shade.isConnected && input.value) draw(); });
    // موردهای مفاتیح‌الجنان هم در جستجو هستند (فهرستش ۱۰ کیلوبایت است و فقط بار اول گرفته می‌شود).
    if (!mafItems && (!window.features || window.features.shown('mafatih'))) window.mafatih?.items().then(a => { mafItems = a; if (shade.isConnected && input.value) draw(); }).catch(() => {});
    setTimeout(() => input.focus(), 30);
  }
  function close(fromHistory, then) {
    if (!shade || !shade.isConnected) { if (then) then(); return; }
    shade.remove(); document.body.classList.remove('srch-lock');
    if (!fromHistory) { try { if (history.state?.srch) { thenAfter = then || null; history.back(); return; } } catch {} }
    if (then) then();
  }
  window.addEventListener('popstate', () => {
    if (shade && shade.isConnected && !history.state?.srch) close(true);
    const f = thenAfter; thenAfter = null;
    if (f) setTimeout(f, 30);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && shade && shade.isConnected) { e.stopImmediatePropagation(); close(); return; }
    // «/» روی رایانه: باز کردن جستجو (نه وقتی در کادر نوشتنی هستیم)
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && shown() && !(shade && shade.isConnected)) {
      const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      if (document.querySelector('.sm.show')) { window.siteMenu.close(); setTimeout(() => open(), 280); } else open();
    }
  }, true);

  const item = (act, ic, title, sub, extraHtml = '') => `<button type="button" class="srch-it" data-act="${esc(act)}"><span class="srch-ic" aria-hidden="true">${ic}</span><span>${title}${extraHtml}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const acts = [];
  const act = fn => (acts.push(fn), acts.length - 1);
  // total: تعداد همه پیداشده‌ها وقتی فقط ردیف‌های دیده‌شدنی ساخته شده‌اند (آیه‌ها).
  function group(key, rows, limit = 6, tail = '', total = rows.length) {
    if (!total && !tail) return '';
    const name = GROUPS.find(g => g[0] === key)[1], n = more[key] || limit;
    return `<section class="srch-g"><h3>${name}${total > 1 ? `<small>${toFa(total)}</small>` : ''}</h3>${rows.slice(0, n).join('')}${total > n ? `<button type="button" class="srch-more" data-more="${key}" data-n="${n + (key === 'ayahs' ? 20 : 10)}">نمایش بیشتر (${toFa(total - n)} مورد دیگر)</button>` : ''}${tail}</section>`;
  }
  // امتیاز یک گزینه: عنوان با پرسش شروع شود بهتر از وقتی وسطش باشد، بهتر از وقتی فقط در توضیح یا کلمه‌های دیگر باشد.
  function score(title, keys, qw) {
    const tt = tight(title), kt = tight(keys);
    if (!qw.every(w => kt.includes(w) || tt.includes(w))) return -1;
    const q = qw.join(' ');
    return tt === q ? 0 : tt.startsWith(q) ? 1 : tt.includes(q) ? 2 : qw.every(w => tt.includes(w)) ? 3 : 4;
  }
  const rank = list => list.filter(x => x[0] >= 0).sort((a, b) => a[0] - b[0]).map(x => x[1]);

  function draw() {
    if (!shade || !shade.isConnected) return;
    acts.length = 0;
    const raw = input.value.trim(), qw = words(raw), q = qw.join(' '), qn = qw.join('');
    if (!q) {
      const r = recent();
      out.innerHTML = (r.length ? `<section class="srch-g"><h3>جستجوهای اخیر <button type="button" class="srch-clear" data-s="clear">پاک کردن</button></h3><div class="srch-chips">${r.map(x => `<button type="button" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div></section>` : '')
        + '<p class="srch-note">نام سوره (فارسی یا عربی) یا شماره آن، «بقره ۲۵۵» یا «۲:۲۵۵»، کلمه‌ای از متن یا ترجمه آیه‌ها، نام دعا یا زیارت، چله‌ها و دوره‌ها، یا تنظیمات (مثل اعلان، زمینه، حساب، نصب برنامه) را بنویسید.</p>';
      return;
    }
    const html = [];
    // سوره‌ها، و اگر عدد آیه هم آمده («بقره ۲۵۵»، «۲:۲۵۵»)، خود آیه
    const surahs = [], direct = [];
    const names = window.quranFree?.names || [], alias = window.quranFree?.alias || {};
    if (ix && window.quranFree) {
      const surahRow = s => item(act(() => window.quranFree.openAt(ix.surah[s - 1])), toFa(s), `سوره ${esc(names[s - 1])} <small style="display:inline;font-size:.85em">${esc(AR[s - 1])}</small>`, `سوره ${toFa(s)} · ${toFa(ayahCount(s))} آیه`);
      const ayahRow = (s, n) => item(act(() => window.quranFree.openAt(ix.surah[s - 1] + n - 1)), '📖', `سوره ${esc(names[s - 1])}، آیه ${toFa(n)}`, 'خواندن از همین آیه');
      let m = qn.match(/^(\d{1,3})[:：/\-.،,](\d{1,3})$/) || raw.replace(/[۰-۹]/g, d => fa.indexOf(d)).match(/^(\d{1,3})\s*[:：/\-.،,\s]\s*(\d{1,3})$/);
      if (m) { const s = +m[1], n = +m[2]; if (s >= 1 && s <= 114 && n >= 1 && n <= ayahCount(s)) direct.push(ayahRow(s, n)); }
      else if ((m = qn.match(/^(\d{1,3})$/))) { const s = +m[1]; if (s >= 1 && s <= 114) surahs.push([0, surahRow(s)]); }
      else {
        const nm = qn.replace(/^سوره/, '').replace(/\d+$/, ''), num = +(qn.match(/(\d+)$/) || [])[1] || 0, key = nm.replace(/^ال(?=..)/, '');
        if (key) names.forEach((n, i) => {
          const ks = [n, AR[i], ...(alias[i + 1] || [])].map(x => bare(x).replace(/^ال(?=..)/, ''));
          const r = ks.some(k => k === key) ? 0 : ks.some(k => k.startsWith(key)) ? 1 : key.length > 2 && ks.some(k => k.includes(key)) ? 2 : -1;
          if (r < 0) return;
          if (num && num <= ayahCount(i + 1)) direct.push(ayahRow(i + 1, num));
          else surahs.push([r, surahRow(i + 1)]);
        });
      }
    }
    html.push(group('surahs', rank(surahs).slice(0, 12), 5));
    // آیه‌ها: متن عربی و ترجمه
    let tail = '';
    const ayahRows = [...direct];
    let ayahTotal = direct.length;
    if (qn.length >= 2 && !/^\d+$/.test(qn)) {
      if (all && ayahWanted) {
        const found = all.filter(a => a.art.includes(q) || a.trt.includes(q));
        // فقط ردیف‌هایی که دیده می‌شوند ساخته می‌شوند (جستجوی کوتاه هزاران آیه پیدا می‌کند).
        ayahTotal = direct.length + found.length;
        found.slice(0, Math.max(0, (more.ayahs || 20) - direct.length)).forEach(a => ayahRows.push(item(act(() => window.quranFree.openAt(a.g)), toFa(a.n), `سوره ${esc(names[a.s - 1])}، آیه ${toFa(a.n)}`, snip(a.tr, a.trt.includes(q) ? q : ''), `<span class="srch-ar">${snip(a.ar, a.art.includes(q) ? q : '', 70)}</span>`)));
        if (!found.length) tail = `<p class="srch-note">آیه‌ای با «${esc(raw)}» در متن عربی یا ترجمه پیدا نشد.</p>`;
      } else if (loading) tail = `<p class="srch-note">در حال دریافت متن قرآن برای جستجو…</p><div class="srch-bar"><i></i></div>`;
      else tail = `<button type="button" class="srch-more" data-s="ayahs">🔎 جستجوی «${esc(raw)}» در متن عربی و ترجمه آیه‌ها</button>${all ? '' : '<p class="srch-note">بار اول متن کامل قرآن (حدود ۳ مگابایت) دریافت می‌شود.</p>'}`;
    }
    // آیه مشخص («بقره ۲۵۵») بالا؛ پیداشده‌های متن آیه‌ها که زیادند، ته فهرست
    const ayahHtml = group('ayahs', ayahRows, 20, tail, ayahTotal);
    if (direct.length) html.push(ayahHtml);
    // ادعیه، دوره‌ها، تنظیمات (از منو و chelleh/index.json)
    const pool = { duas: [], courses: [], sections: [] };
    const duas = Array.isArray(duaListResolved) ? duaListResolved : [];
    const duaTitles = duas.map(d => tight(d.title));
    duas.forEach(d => pool.duas.push([score(d.title, d.title + ' ' + (d.keys || ''), qw), item(act(() => window.chlRead?.(d.key)), '📿', mark(d.title, q), 'متن، ترجمه و صوت')]));
    (mafItems || []).forEach(x => {
      if (duaTitles.includes(tight(x.it.title))) return; // همان دعا از فهرست بالا
      const sc = score(x.it.title, x.it.title + ' ' + x.where, qw);
      if (sc >= 0) pool.duas.push([sc, item(act(() => window.mafatih.openItem(x.it, x.where)), x.it.surah ? '📖' : '📚', mark(x.it.title, q), esc('مفاتیح‌الجنان · ' + x.where))]);
    });
    menuList.forEach(m => {
      if (m.group === 'duas' && duaTitles.some(t => tight(m.title).includes(t))) return; // همان دعا از فهرست بالا
      pool[m.group].push([score(m.title, m.keys, qw), item(act(() => runMenu(m.loc)), esc(m.ic), mark(m.title, q), esc(m.sub))]);
    });
    extra.forEach(x => { if (pool[x.group] && (!x.on || x.on())) pool[x.group].push([score(x.title, [x.title, x.sub, x.keys].join(' '), qw), item(act(x.run), esc(x.ic || '•'), mark(x.title, q), esc(x.sub || ''))]); });
    html.push(group('duas', rank(pool.duas)), group('courses', rank(pool.courses)), group('sections', rank(pool.sections)));
    if (!direct.length) html.push(ayahHtml);
    const body = html.join('');
    out.innerHTML = body || `<p class="srch-note">چیزی با «${esc(raw)}» پیدا نشد.</p>`;
  }

  function onClick(e) {
    const t = e.target;
    if (t.closest('[data-s="close"]')) return close();
    if (t.closest('[data-s="clear"]')) { try { localStorage.removeItem(RK); } catch {} return draw(); }
    const qb = t.closest('[data-q]'); if (qb) { input.value = qb.dataset.q; more = {}; ayahWanted = !!all; draw(); return input.focus(); }
    const mb = t.closest('[data-more]'); if (mb) { more[mb.dataset.more] = +mb.dataset.n; const y = shade.querySelector('.srch-body').scrollTop; draw(); shade.querySelector('.srch-body').scrollTop = y; return; }
    if (t.closest('[data-s="ayahs"]')) {
      remember(input.value); ayahWanted = true;
      const p = loadAyahs(f => { const bar = out.querySelector('.srch-bar i'); if (bar) bar.style.width = Math.round(f * 100) + '%'; });
      draw();
      p.then(() => draw()).catch(() => { if (!shade.isConnected) return; draw(); const n = out.querySelector('[data-s="ayahs"]'); if (n) n.insertAdjacentHTML('afterend', '<p class="srch-note" style="color:var(--danger)">دریافت متن قرآن انجام نشد. اینترنت را بررسی کنید و دوباره بزنید.</p>'); });
      return;
    }
    const it = t.closest('.srch-it'); if (!it) return;
    const fn = acts[+it.dataset.act]; if (!fn) return;
    remember(input.value);
    close(false, fn);
  }

  // ---------- دکمه 🔎 در سربرگ منو ----------
  function sync() {
    const b = document.querySelector('.sm [data-sm-search]');
    if (b) b.hidden = !shown();
    if (!shown() && shade && shade.isConnected) close();
  }
  document.addEventListener('click', e => { if (e.target.closest('.sm [data-sm-search]')) { window.siteMenu?.close(); setTimeout(() => open(), 280); } });
  document.addEventListener('features:changed', sync);
  sync();

  window.siteSearch = {
    open,
    // بخش‌های دیگر: siteSearch.add({ group: 'duas'|'courses'|'sections', title, sub, ic, keys, run, on }) ؛ on() اختیاری: فقط وقتی true است دیده می‌شود
    add(x) { if (x && x.title && typeof x.run === 'function') extra.push(x); }
  };
})();
