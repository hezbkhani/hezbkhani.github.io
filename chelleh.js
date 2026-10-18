// چله‌ها: خواندن گروهی زیارت عاشورا، حدیث کسا، زیارت آل یاسین و متن‌های دیگر (معمولاً ۴۰ روز).
// - منوی سه‌خط (menu.js): بخش «ثبت‌نام در چله» با نوع‌هایی که مدیر تعیین می‌کند؛ با زدن هر کدام صفحه ثبت‌نام باز می‌شود.
// - صفحه اصلی: بخش «چله‌های من» (با خبر دوره و ایمیل اختیاری برای اخبار) برای کسانی که روی این گوشی ثبت‌نام کرده‌اند (جدول روزها، «امروز خواندم»، خواندن متن).
// - مدیریت (زبانه «چله‌ها»): نوع‌های منو (مدت، ظرفیت هر دوره یا همیشه باز، شروع، تعداد بار در روز)، دوره‌ها و شرکت‌کنندگان، متن‌ها.
// لینک مستقیم ثبت‌نام: ‎?chelleh=ashura‎ (کلید نوع). داده‌ها در Supabase، جدول‌ها و تابع‌ها در backend/supabase/chelleh.sql.
// متن‌های آماده در پوشه chelleh هستند. به admin.js و menu.js نیاز دارد.
(function () {
  Object.assign(window.sbErrors, {
    chl_not_found: 'این چله پیدا نشد یا بسته شده است.',
    chl_not_joinable: 'ثبت‌نام در این دوره بسته شده است (ظرفیت و فهرست رزرو کامل است). صفحه را دوباره باز کنید تا دوره بعد را ببینید.',
    chl_reserve: 'شما در فهرست رزرو هستید؛ وقتی جایی در گروه باز شد، می‌توانید ثبت کنید.',
    chl_duplicate_name: 'این نام قبلاً در این دوره ثبت شده است. اگر شخص دیگری هستید، نام خانوادگی یا نام پدر را هم بنویسید.',
    chl_member_not_found: 'این کد در چله‌ها پیدا نشد.',
    chl_not_started: 'چله شما هنوز شروع نشده است.',
    chl_bad_day: 'فقط برای امروز یا روزهای فراموش‌شده تا یک هفته گذشته می‌شود ثبت کرد.',
    chl_need_start: 'این نوع ظرفیت ندارد (همیشه باز است)؛ برای دوره تازه، تاریخ شروع را مشخص کنید.',
    chl_empty: 'این دوره هنوز شرکت‌کننده‌ای ندارد.',
    chl_bad_email: 'ایمیل درست نوشته نشده است. اگر نمی‌خواهید، خالیش بگذارید.'
  });
  const api = window.sbApi, rpc = window.sbRpc;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => toFa(x);
  const DAY = 86400000;
  const isoAdd = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
  const isoDiff = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / DAY);
  const dateFa = iso => (iso && window.J ? J.label(iso) : iso || '');
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const isAdminView = () => location.hash === '#admin';
  const siteUrl = () => location.origin + location.pathname;
  const regLink = key => `${siteUrl()}?chelleh=${encodeURIComponent(key)}`;
  const startWord = n => (n <= 0 ? 'همان روز' : n === 1 ? 'از روز بعد' : `${fa(n)} روز بعد`);

  // کدهای چله روی این دستگاه
  const KEY = 'chlCodes';
  const codes = {
    all() { const a = read(KEY, []); return Array.isArray(a) ? a.filter(c => /^\d{8}$/.test(c)) : []; },
    add(c) { write(KEY, [...new Set([c, ...this.all()])]); },
    remove(c) { write(KEY, this.all().filter(x => x !== c)); }
  };

  // ---------- متن‌ها ----------
  // متن آماده از پوشه chelleh؛ اگر مدیر نسخه‌ای با همان key در پایگاه داده گذاشته باشد، آن نسخه خوانده می‌شود.
  let builtins = null, dbTexts = null;
  const textCache = {};
  async function loadBuiltins() {
    if (!builtins) builtins = await fetch('chelleh/index.json').then(r => r.json()).catch(() => []);
    return builtins;
  }
  async function loadDbTexts(force) {
    if (!dbTexts || force) {
      try { dbTexts = await api('chelleh_texts?select=key,title,about,sections,audio,updated_at&order=title', { timeout: 8000 }); }
      catch { dbTexts = dbTexts || []; }
    }
    return dbTexts;
  }
  async function allTexts(force) {
    const [b, d] = await Promise.all([loadBuiltins(), loadDbTexts(force)]);
    const map = new Map(b.map(t => [t.key, { key: t.key, title: t.title, builtin: true, edited: false, quran: t.quran || null }]));
    d.forEach(t => { if (!map.get(t.key)?.quran) map.set(t.key, { key: t.key, title: t.title, builtin: map.has(t.key), edited: map.has(t.key) }); });
    return [...map.values()];
  }
  async function getText(key) {
    if (textCache[key]) return textCache[key];
    const d = (await loadDbTexts()).find(t => t.key === key);
    let t = d && Array.isArray(d.sections) && d.sections.length ? d : null;
    if (!t && /^[a-z0-9_-]+$/.test(key)) t = await fetch(`chelleh/${key}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (!t) throw Error('متن این چله پیدا نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.');
    return (textCache[key] = t);
  }
  // ترجمه‌های دیگر هر متن (فارسی از مترجم‌های دیگر و زبان‌های دیگر) در پوشه chelleh/tr است:
  // فهرست مترجم‌ها در index.json و برای هر مترجم یک فایل برای هر متن، { n: تعداد بندها، t: ترجمه هر بند به همان ترتیب }.
  // ترجمه فارسی خود متن (fa) پیش‌فرض است؛ اگر مدیر متن را ویرایش کرده و تعداد بندها فرق کند، ترجمه پیش‌فرض نشان داده می‌شود.
  const TR_LANGS = { fa: 'فارسی', en: 'English', de: 'Deutsch', ur: 'اردو', hi: 'हिन्दी', tr: 'Türkçe', az: 'Azərbaycanca', fr: 'Français', es: 'Español', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', ru: 'Русский', sw: 'Kiswahili', bn: 'বাংলা' };
  const RTL = ['fa', 'ar', 'ur'];
  let trList = null;
  const loadTrList = () => trList || (trList = fetch('chelleh/tr/index.json').then(r => (r.ok ? r.json() : [])).catch(() => { trList = null; return []; }));
  const textTitle = (key, list) => (list || []).find(t => t.key === key)?.title || key;

  // قالب ساده برای ویرایش متن در بخش مدیریت: هر بند با یک خط خالی جدا می‌شود؛
  // خط اول بند عربی است و خط‌های بعد ترجمه. خط «! …» توضیح است و خط «# ۱۰۰» یعنی تکرار.
  function toBlocks(sections) {
    return sections.map(s => [s.note ? '! ' + s.note : '', s.repeat ? '# ' + s.repeat : '', s.ar || '', s.fa || ''].filter(Boolean).join('\n')).join('\n\n');
  }
  function fromBlocks(text) {
    return text.replace(/\r/g, '').split(/\n\s*\n/).map(b => {
      const lines = b.split('\n').map(x => x.trim()).filter(Boolean), s = {}, rest = [];
      lines.forEach(l => {
        if (l.startsWith('!')) s.note = l.slice(1).trim();
        else if (/^#\s*[\d۰-۹٠-٩]+$/.test(l)) s.repeat = +norm(l.slice(1));
        else rest.push(l);
      });
      if (rest.length) { s.ar = rest[0]; if (rest.length > 1) s.fa = rest.slice(1).join(' '); }
      return s;
    }).filter(s => s.ar || s.note);
  }

  const css = `
@font-face{font-family:ChlArabic;src:url('quran/uthmanic-hafs.woff2') format('woff2');font-display:swap;unicode-range:U+0600-060B,U+060D-061E,U+0620-06FF,U+FB50-FDFF,U+FE70-FEFF}
.chl-card{background:#fff;color:#000;text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:12px 14px;margin:12px 0;position:relative}
.chl-card::before{content:"";position:absolute;inset:4px;border:1px solid rgba(215,170,91,.45);border-radius:calc(var(--r-card) - 4px);pointer-events:none}
.chl-card h3{margin:0 0 2px;font:normal 26px/1.7 SiteFont,Tahoma,serif;color:var(--deep)}
.chl-card .hint,.chl-card label,body.v2 .chl-card .hint{color:var(--muted);text-shadow:none}
.chl-card label{color:var(--ink);font-weight:600;font-size:15px;margin:10px 0 4px}
.chl-card.flash{animation:chlflash 1.6s ease}
@keyframes chlflash{0%,40%{box-shadow:0 0 0 4px var(--gold)}100%{box-shadow:none}}
.chl-meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:15px;color:var(--muted)}
.chl-tag{display:inline-block;padding:0 12px;border-radius:var(--pill);background:var(--mint);border:1px solid var(--gold);color:var(--deep);font-weight:600}
.chl-tag.wait{background:var(--cream)}
.chl-desc{white-space:pre-line;margin:6px 0 0;font-size:15.5px;color:var(--ink)}
.chl-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin:10px 0 4px;direction:rtl}
.chl-grid i{display:flex;align-items:center;justify-content:center;aspect-ratio:1;font-style:normal;font-size:12px;border:1px solid #e3d6b8;border-radius:6px;color:#9a8b78;background:#fffaf0}
.chl-grid i.d{background:var(--emerald);border-color:var(--deep);color:#fff;font-weight:700}
.chl-grid i.m{background:#f6e3e3;border-color:#e5c3c3;color:#a35a5a}
.chl-grid i.t{outline:2px solid var(--gold);outline-offset:1px;color:var(--deep);font-weight:700}
.chl-grid i.n{opacity:.45}
.chl-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--muted)}
.chl-legend b{display:inline-block;width:12px;height:12px;vertical-align:-1px;margin-left:4px;border:1px solid #e3d6b8;border-radius:3px}
.chl-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.chl-actions button{height:50px}
.chl-done{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--mint)!important;color:var(--deep)!important;border-color:var(--gold)!important}
.chl-big{font-size:20px;font-weight:800;color:var(--deep)}
.chl-msg{min-height:22px;margin-top:6px;font-weight:700}
.chl-msg:empty{min-height:0;margin:0}
.chl-ok{color:var(--ok)}.chl-bad{color:var(--danger)}
.chl-small{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:10px;font-size:14px}
.chl-small button{height:auto;padding:0;background:none;border:0;color:var(--deep);text-decoration:underline;font-weight:500;font-size:14px}
.chl-small button.chl-red{color:var(--danger)}
.chl-bar{height:10px;background:#eee4cf;margin:8px 0 4px;overflow:hidden;border-radius:var(--pill)}
.chl-bar span{display:block;height:100%;background:var(--emerald)}
.chl-read{display:flex;align-items:center;justify-content:center;gap:8px}
.chl-read svg{width:20px;height:20px}
.chl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.chl-head button{height:42px;font-size:15px}
.chl-fold summary{cursor:pointer;margin:10px 0 0;color:#f4ead8;font-size:15px}
.sm .chl-mi .sm-ic{background:var(--cream)}
.chs{position:fixed;inset:0;z-index:48;display:none;align-items:flex-end;justify-content:center;background:#0009}
.chs.show{display:flex}
.chs-box{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border-top:3px solid var(--gold);border-radius:18px 18px 0 0;padding:0 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:chsup .22s ease}
@keyframes chsup{from{transform:translateY(30px);opacity:.4}to{transform:none;opacity:1}}
.chs-grip{width:44px;height:5px;border-radius:3px;background:#d9cba9;margin:10px auto 4px}
.chs-top{display:flex;align-items:flex-start;gap:8px}
.chs-top h2{flex:1;margin:4px 0 0;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.chs-top button{flex:none;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.chs-facts{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
.chs-facts span{padding:2px 10px;background:var(--mint);border:1px solid #cfe3da;color:var(--deep);font-size:14px;font-weight:600;border-radius:var(--pill)}
.chs-state{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:10px 0;font-size:15.5px}
.chs-state b{color:var(--deep)}
.chs-box label{display:block;font-weight:700;margin:12px 0 6px;color:var(--ink);text-shadow:none}
.chs-box input{width:100%}
.chs-box .chs-main{width:100%;height:54px;margin-top:10px;font-size:18px}
.chs-box .chs-alt{width:100%;height:48px;margin-top:8px}
.chs-ok{text-align:center;padding:10px 0}
.chs-ok .chs-check{width:64px;height:64px;margin:6px auto;border-radius:50%;background:var(--emerald);color:#fff;font-size:34px;display:flex;align-items:center;justify-content:center;border:2px solid var(--gold)}
.chs-ok p{margin:6px 0}
.chs-code{display:inline-block;direction:ltr;font-size:22px;letter-spacing:2px;font-weight:700;color:var(--deep);background:var(--cream);padding:0 10px;border:1px dashed var(--gold);border-radius:6px}
.chs-rounds{margin:10px 0}
.chs-rounds label{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;padding:10px 12px;border-radius:var(--r);background:#fff;border:1px solid #d9cba9;font-weight:400;font-size:15px;cursor:pointer}
.chs-rounds label:has(input:checked){border:2px solid var(--emerald);background:#f2faf6}
.chs-rounds input{width:auto;margin-top:6px;flex:none}
.chs-rounds b{color:var(--deep)}
.chl-note{margin:4px 0 0;font-size:14px;color:var(--muted);line-height:1.8}
.chl-news{white-space:pre-line;margin:8px 0 0;padding:8px 12px;border-radius:var(--r);background:var(--cream);border-right:4px solid var(--gold);font-size:15px;color:var(--ink)}
.chl-mail{margin-top:8px;font-size:14px;color:var(--muted)}
.chl-mail summary{cursor:pointer}
.chl-mail input{direction:ltr;text-align:left}
.chs-dup{background:#fff;border:1px solid var(--gold);border-right:4px solid var(--deep);border-radius:var(--r-card);padding:10px 14px;margin:10px 0}
.chs-dup b{color:var(--deep)}
.chs-dup p{margin:4px 0 0;font-size:15px}
.chs-mine{background:var(--mint);border:1px solid var(--gold);border-radius:var(--r-card);padding:8px 12px;margin:10px 0;font-size:15px}
body.chl-lock{overflow:hidden}
${''}.cr{--bg:#fbf6ea;--card:#fffdf7;--text:#1f1a14;--tr:#4b4036;--muted:#7a6d60;--line:#e6d9bd;--accent:#0b6b50;--gold:#c79a45;--qs:28px;
  position:fixed;inset:0;z-index:50;background:var(--bg);color:var(--text);text-shadow:none;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;display:none;font-family:Vazirmatn,Tahoma,sans-serif}
.cr.night{--bg:#14110d;--card:#1c1813;--text:#efe6d6;--tr:#c9bba7;--muted:#9b8e7c;--line:#3a3127;--accent:#5fc3a0;--gold:#b98f45}
.cr.show{display:block}
.cr-aud{position:sticky;bottom:0;z-index:2;display:flex;flex-direction:column;gap:6px;padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:var(--card);border-top:1px solid var(--gold);box-shadow:0 -4px 16px #0002}
.cr-aud[hidden]{display:none}
.cr-aud div{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--muted)}
.cr-aud select{flex:1;min-width:0;height:40px;padding:0 8px;font:inherit;font-size:15px;color:var(--text);background:var(--bg);border:1px solid var(--line)}
.cr-aud audio{width:100%;height:42px}
.cr-bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:6px;padding:8px 10px;padding-top:max(8px,env(safe-area-inset-top));background:var(--accent);color:#fff;box-shadow:0 2px 10px #0003}
.cr.night .cr-bar{background:#0f2a22}
.cr-bar button{flex:none;height:42px;min-width:42px;padding:0 10px;background:transparent;border:0;color:#fff;font-size:22px;line-height:1}
.cr-title{flex:1;min-width:0;text-align:center;line-height:1.35}
.cr-title b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-title small{font-size:12.5px;opacity:.85}
.cr-prog{position:absolute;bottom:0;right:0;height:3px;width:0;background:var(--gold)}
.cr-menu{position:sticky;top:58px;z-index:2;max-width:760px;margin:0 auto;display:none;gap:12px;padding:14px 16px;background:var(--card);border-bottom:1px solid var(--line);box-shadow:0 8px 20px #0002}
.cr-menu.show{display:grid}
.cr-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:15.5px}
.cr-row div{display:flex;gap:6px}
.cr-row button{height:40px;min-width:44px;padding:0 12px;background:transparent;color:var(--text);border:1px solid var(--line);font-size:15px;font-weight:600}
.cr-row button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.cr-row select{flex:1;min-width:0;max-width:62%;height:40px;padding:0 8px;font:inherit;font-size:15px;color:var(--text);background:var(--bg);border:1px solid var(--line)}
.cr-row[hidden]{display:none}
.cr-body{max-width:760px;margin:0 auto;padding:6px 14px calc(40px + env(safe-area-inset-bottom))}
.cr-head{margin:22px 0 8px;padding:14px 10px 10px;text-align:center;border:1px solid var(--gold);outline:3px double var(--gold);outline-offset:3px;background:var(--card)}
.cr-head h3{margin:0;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--accent)}
.cr-head small{display:block;font-size:13px;color:var(--muted);line-height:1.8}
.cr-bism{margin:18px 0 6px;text-align:center;font:normal calc(var(--qs)*1.05)/2 ChlArabic,Vazirmatn,serif}
.cr-sec{padding:14px 2px;border-bottom:1px solid var(--line)}
.cr-sec:last-child{border-bottom:0}
.cr-note{margin:0 0 6px;color:var(--accent);font-weight:700;font-size:15px}
.cr-sec.only{border:1px dashed var(--line);background:var(--card);padding:10px 12px;margin:14px 0}
.cr-sec.only .cr-note{margin:0;color:var(--muted);font-weight:500}
.cr-ar{margin:0;font:normal var(--qs)/2.15 ChlArabic,Vazirmatn,serif;text-align:right;word-spacing:1px}
.cr-fa{margin:6px 0 0;font-size:calc(var(--qs)*.58);line-height:2;color:var(--tr);text-align:justify}
.cr.no-tr .cr-fa,.cr.no-tr .cr-trsrc{display:none}
.cr-fa[dir=ltr]{text-align:left;font-family:Georgia,'Times New Roman',serif;line-height:1.75}
.cr-fa[lang=ur]{font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',Vazirmatn,serif;line-height:2.3}
.cr-trsrc{display:block;margin-top:6px;font-size:12.5px;color:var(--muted);line-height:1.8}
.cr-count{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
.cr-count button{height:48px;min-width:120px;background:var(--accent);border:1px solid var(--gold);color:#fff;font-size:18px;font-weight:700}
.cr-count button.full{background:var(--gold)}
.cr-count small{color:var(--muted)}
.cr-count .cr-reset{min-width:0;height:36px;background:transparent;color:var(--muted);border-color:var(--line);font-size:13px;font-weight:500}
.cr-end{margin:24px 0 8px;padding:16px;text-align:center;background:var(--card);border:1px solid var(--gold)}
.cr-end p{margin:0 0 10px}
.cr-end button{width:100%;height:54px;font-size:18px;background:var(--accent);border-color:var(--gold)}
.cr-end .chl-done{height:54px}
.chl-adm .chl-card h3{font:700 18px/1.6 Vazirmatn,Tahoma,sans-serif}
.chl-adm .adm-card .hint,body.v2 #pane-chl .hint{color:var(--muted)}
.chl-adm h4{margin:18px 0 6px;font-size:17px;color:#fff;text-shadow:var(--glow)}
.chl-members{max-height:420px;overflow:auto;border:1px solid var(--line);border-radius:var(--r);margin-top:8px}
.chl-members div{display:flex;gap:8px;align-items:center;padding:5px 8px;border-bottom:1px solid #f0e8d6}
.chl-members span{flex:1;min-width:0;overflow-wrap:anywhere}
.chl-members small{color:var(--muted)}
.chl-members button{height:32px;padding:0 10px;font-size:13px}
.chl-members a{flex:none;display:inline-flex;align-items:center;height:32px;padding:0 10px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid var(--emerald);border-radius:var(--r);background:#fff;color:var(--deep)}
.chl-promo button{height:34px;padding:0 14px;font-size:14px;margin-inline-start:6px}
.chl-mini{display:inline-flex;gap:1px;vertical-align:middle;direction:rtl;flex-wrap:wrap}
.chl-mini i{display:block;width:4px;height:12px;background:#eadfca}
.chl-mini i.d{background:var(--emerald)}
.chl-mark{font-weight:800;color:var(--emerald)}
.chl-form{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}
.chl-form .full{grid-column:1/-1}
.chl-form input[type=number]{direction:ltr;text-align:right}
.chl-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chl-chips button{height:34px;padding:0 12px;font-size:14px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.chl-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.chl-tools button{flex:1 1 auto;height:42px;font-size:15px}
.chl-tools .chl-arr{flex:0 0 48px;padding:0}
.chl-tools .chl-mailto{flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;height:42px;padding:0 14px;font-size:15px;font-weight:700;text-decoration:none;border:1px solid var(--emerald);border-radius:var(--r);background:#fff;color:var(--deep)}
.chl-off{opacity:.6}
.chl-edit textarea{min-height:260px;direction:rtl;font-size:15px}
@media(min-width:700px){.chs{align-items:center;padding:24px}.chs-box{border:1px solid var(--gold);border-top-width:3px;border-radius:18px;max-height:88vh}.chs-grip{visibility:hidden}}
@media(max-width:600px){.chl-actions{grid-template-columns:1fr}.cr-head h3{font-size:30px}.chl-form{grid-template-columns:1fr}.chs-top h2{font-size:30px}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- داده‌ها ----------
  let hezbRounds = [];
  let types = [], typesError = '', mine = [], today = null, ready = false;
  async function loadTypes() {
    try { types = (await rpc('chl_types')) || []; typesError = ''; } catch (e) { types = []; typesError = e.message; }
    if (types.some(t => t.kind === 'hezb')) { try { hezbRounds = (await rpc('reg_rounds')) || []; } catch { hezbRounds = []; } }
    if (types[0]?.today) today = types[0].today;
    return types;
  }
  async function loadMine() {
    const list = codes.all();
    if (!list.length) { mine = []; return mine; }
    try {
      // سرور در هر درخواست حداکثر ۲۰ کد را می‌خواند؛ برای بیشتر، چند درخواست فرستاده می‌شود تا کدی بی‌دلیل فراموش نشود.
      const parts = []; for (let i = 0; i < list.length; i += 20) parts.push(list.slice(i, i + 20));
      const a = (await Promise.all(parts.map(p => rpc('chl_lookup', { p_codes: p })))).flatMap(x => x || []);
      // کدِ چله‌های حذف‌شده یا بایگانی‌شده خودکار فراموش می‌شود.
      const found = new Set(a.filter(m => m.status === 'open').map(m => m.code));
      list.filter(c => !found.has(c)).forEach(c => codes.remove(c));
      mine = a.filter(m => m.status === 'open');
      if (mine[0]?.today) today = mine[0].today;
    } catch { /* اینترنت قطع: فهرست قبلی می‌ماند */ }
    return mine;
  }
  window.chlRefresh = async () => { await refresh(); if (sheet?.classList.contains('show') && sheetType) renderSheet(); };
  window.chlMine = () => mine; // برای «تنظیم اعلان‌ها» (reminders.js): نام هر چله کنار کلید اعلانش
  window.chlRead = key => openReader(key, null); // برای بخش «ادعیه» (ibadat.js): متن، ترجمه و صوت دعا
  async function refresh() {
    await Promise.all([loadTypes(), loadMine()]);
    today = today || isoIran();
    ready = true;
    renderPanel(); window.siteMenu?.refresh();
    updateDot();
  }
  // نفر رزروی که جای کسی را گرفته، تا پیام را ندیده نقطه منو روشن می‌ماند.
  const promoNew = m => m.promoted_at && !read('chlPromoSeen', []).includes(m.code);
  function updateDot() {
    window.siteMenu?.dot(mine.some(m => (state(m) === 'run' && !(m.marked || []).includes(today)) || promoNew(m)));
  }
  window.chlRefresh = refresh;

  // وضعیت هر عضویت: wait (در انتظار تکمیل ظرفیت)، soon (تاریخ شروع آینده)، run (در جریان)، end (تمام شده)
  const dayNo = m => (m.start_date ? isoDiff(today, m.start_date) + 1 : 0);
  function state(m) {
    if (m.reserve) return 'reserve';
    if (!m.start_date) return 'wait';
    const n = dayNo(m);
    if (m.kind === 'page') return n < 1 ? 'soon' : (m.marked || []).length >= m.days ? 'end' : 'run';
    return n < 1 ? 'soon' : n > m.days ? 'end' : 'run';
  }
  // متن امروز در جزءخوانی (جزء گردشی) و روزی یک صفحه (صفحه بعد از آخرین صفحه خوانده‌شده).
  function todaySpec(m) {
    if (m.kind === 'juz') return { juz: ((Math.max(1, m.slot || 1) - 1) + (Math.max(1, dayNo(m)) - 1)) % 30 + 1 };
    if (m.kind === 'page') return { page: Math.min(m.days || 604, (m.marked || []).filter(d => d < today).length + 1) };
    return null;
  }
  // سوره، جزء یا صفحه با خواننده قرآن سایت باز می‌شود (همان ترجمه‌ها و صوت قاری‌ها).
  async function openQuran(spec, m) {
    const qr = window.quranReader;
    const ix = qr && await qr.index().catch(() => null);
    if (!ix) return toast('بارگذاری متن قرآن انجام نشد. اینترنت را بررسی کنید.');
    let from, to, title;
    if (spec.surah) { from = ix.surah[spec.surah - 1]; to = spec.surah < 114 ? ix.surah[spec.surah] : ix.total; title = spec.title || `سوره ${fa(spec.surah)}`; }
    else if (spec.juz) { from = ix.juz[spec.juz - 1]; to = spec.juz < 30 ? ix.juz[spec.juz] : ix.total; title = `جزء ${fa(spec.juz)} قرآن`; }
    else { from = ix.page[spec.page - 1]; to = spec.page < 604 ? ix.page[spec.page] : ix.total; title = `صفحه ${fa(spec.page)} قرآن`; }
    const run = m && state(m) === 'run', done = run && (m.marked || []).includes(today);
    // روزی یک صفحه: صفحه قبل و بعد را هم می‌شود خواند (بدون ثبت)؛ برای خواندن آزاد، «قرآن آزاد» پیشنهاد می‌شود.
    const p = spec.page, base = spec.base || p, extra = p && p !== base;
    const nav = p ? { prev: p > 1 ? 'صفحه قبل' : '', next: p < 604 ? 'صفحه بعد' : '', menu: window.quranFree ? 'قرآن آزاد' : '', autoNext: false,
      onPrev: () => openQuran({ page: p - 1, base }, m), onNext: () => openQuran({ page: p + 1, base }, m), onMenu: () => window.quranFree.open() } : null;
    qr.openRange({
      title, sub: m ? (extra ? `${m.title} · غیر از صفحه امروز` : m.title) : '', from, to, nav,
      note: p && window.quranFree ? 'برای خواندن صفحه‌های دیگر، «قرآن آزاد» بهتر است: از هر سوره، آیه یا صفحه‌ای شروع می‌کنید و جای خواندن‌تان روی گوشی ذخیره می‌شود.' : '',
      endText: extra ? `پایان ${title}. صفحه امروز شما صفحه ${fa(base)} است.` : done ? 'امروز ثبت شده است. قبول باشد.' : `پایان ${title}. قبول باشد.`,
      endButton: 'خواندم؛ ثبت برای امروز',
      onEnd: run && !done && !extra ? () => mark(m.code, today, true).then(() => { toast('ثبت شد. قبول باشد.'); flash(m.code); }).catch(e => toast(e.message)) : null
    });
  }
  const typeOf = key => types.find(t => t.key === key);

  // ---------- منو ----------
  // «قرآن آزاد» (quran-free.js) هم در همین فهرست، پس از دوره‌های قرآن می‌آید.
  window.siteMenu?.section({
    id: 'chelleh', order: 1,
    render(box) {
      if (!ready) { box.innerHTML = '<h3>ثبت‌نام در چله</h3><p class="sm-note">در حال دریافت…</p>'; return; }
      if (!types.length) { if (isAdminView() && typesError) box.innerHTML = `<h3>ثبت‌نام در چله</h3><p class="sm-note">${esc(typesError)}</p>`; return; }
      const mineHtml = mine.length ? `<button type="button" class="sm-item" data-chl-mine><span class="sm-ic">⭐</span><span>چله‌های من<small>${fa(mine.length)} چله${mine.some(m => state(m) === 'run' && !(m.marked || []).includes(today)) ? '، امروز هنوز ثبت نشده' : ''}</small></span><span class="sm-go">‹</span></button>` : '';
      const item = t => `<button type="button" class="sm-item chl-mi" data-chl-type="${esc(t.key)}"><span class="sm-ic">${t.kind === 'text' ? '📿' : '📖'}</span><span>${esc(t.title)}<small>${esc(typeLine(t))}</small></span><span class="sm-go">‹</span></button>`;
      const quran = types.filter(t => t.kind !== 'text'), chl = types.filter(t => t.kind === 'text');
      box.innerHTML = mineHtml + (quran.length ? `<h3>ثبت‌نام در دوره‌های قرآن</h3>${quran.map(item).join('')}${window.quranFree ? window.quranFree.menuItem() : ''}` : '') + (chl.length ? `<h3>ثبت‌نام در چله</h3>${chl.map(item).join('')}` : '');
      box.onclick = e => {
        const b = e.target.closest('[data-chl-type],[data-chl-mine]'); if (!b) return;
        window.siteMenu.close(true);
        if (b.dataset.chlType) openSheet(b.dataset.chlType, true);
        else { goBack(); setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200); }
      };
    }
  });
  // منو با history.back بسته می‌شود؛ وقتی از منو صفحه دیگری باز می‌شود، به‌جای back همان ردیف تاریخچه جایگزین می‌شود.
  function goBack() { try { if (history.state?.sm) history.back(); } catch {} }
  function pushState(s, replace) { try { if (replace && history.state?.sm) history.replaceState(s, ''); else history.pushState(s, ''); } catch {} }

  // حزب‌خوانی: ثبت‌نام همان دوره‌های registration.sql است (گروه ۱۲۰ نفره).
  // دوره‌ای که جای خالی دارد، یا ظرفیتش پر است ولی فهرست رزروش هنوز جا دارد (حتی پس از اعلام گروه).
  const hezbFull = r => r.registered >= 120;
  const hezbOpen = () => hezbRounds.filter(r => r.status !== 'closed' && (!hezbFull(r) || (r.reserved ?? 0) < (r.reserve_slots ?? 0)))
    .sort((a, b) => hezbFull(a) - hezbFull(b));
  let hezbAsReserve = false;
  const PLAT = { telegram: 'تلگرام', bale: 'بله' };
  function hezbLine() {
    const o = hezbOpen()[0];
    return o ? `گروه ۱۲۰ نفره: ${fa(o.registered)} از ۱۲۰ نفر` : 'گروه ۱۲۰ نفره، هر روز یک حزب';
  }
  function renderHezb(box, top, t, done) {
    if (done) {
      box.innerHTML = top(t.title) + `<div class="chs-ok"><div class="chs-check">✓</div><p class="chl-big">ثبت‌نام شد. قبول باشد.</p>
<p>${hezbAsReserve ? 'ظرفیت ۱۲۰ نفر کامل بود و شما در فهرست رزرو هستید. اگر کسی انصراف دهد، شناسه او به شما می‌رسد و در بخش «ثبت‌نام دوره جدید» همین سایت نشان داده می‌شود.' : 'وقتی ظرفیت ۱۲۰ نفر کامل شد، شناسه شما (عددی از ۱ تا ۱۲۰) و تاریخ شروع در بخش «ثبت‌نام دوره جدید» همین سایت نشان داده می‌شود.'}</p>
<p class="chl-note">کد پیگیری: <span class="chs-code">${fa(done)}</span><br>این کد روی همین گوشی ذخیره شد.</p></div>${window.sitePush?.hint() || ''}
<button type="button" class="chs-main" data-hz-go>دیدن ثبت‌نام من</button>`;
      return;
    }
    const open = hezbOpen();
    const rounds = open.map((r, i) => `<label><input type="radio" name="hzRound" value="${r.id}"${i ? '' : ' checked'}><span><b>${esc(r.title)}</b> (${PLAT[r.platform] || esc(r.platform)})<br>${fa(Math.min(120, r.registered))} از ۱۲۰ نفر ثبت‌نام کرده‌اند.<div class="chl-bar"><span style="width:${Math.min(100, r.registered / 1.2)}%"></span></div>${hezbFull(r) ? `ظرفیت کامل است؛ ${fa((r.reserve_slots ?? 0) - (r.reserved ?? 0))} جا در فهرست رزرو مانده.` : r.start_date ? `شروع: ${esc(dateFa(r.start_date))}` : `با ${fa(120 - r.registered)} نفر دیگر گروه تشکیل می‌شود.`}</span></label>`).join('');
    box.innerHTML = top(t.title) + `<div class="chs-facts"><span>۱۲۰ نفر</span><span>هر روز یک حزب</span><span>هر روز یک ختم قرآن</span></div>
${t.description ? `<p class="chl-desc">${esc(t.description)}</p>` : ''}
${open.length ? `<div class="chs-state">${open.length > 1 ? 'یکی از گروه‌ها را انتخاب کنید:' : ''}<div class="chs-rounds">${rounds}</div></div>
<label for="chsName">نام و نام خانوادگی</label><input id="chsName" maxlength="60" autocomplete="name" placeholder="مثلاً فاطمه رضایی" value="${esc(read('chlName', ''))}">
<button type="button" class="chs-main" data-hz-join>${open.every(hezbFull) ? 'ثبت در فهرست رزرو' : 'ثبت‌نام'}</button><div class="chl-msg" id="chsMsg"></div>`
  : '<div class="chs-state">الان ثبت‌نامی باز نیست. زمان ثبت‌نام دوره بعد در گروه‌ها اعلام می‌شود و همین‌جا هم دیده می‌شود.</div>'}`;
  }
  async function hezbJoin(b) {
    const input = sheet.querySelector('#chsName'), msg = sheet.querySelector('#chsMsg'), name = input.value.trim().replace(/\s+/g, ' ');
    const id = +sheet.querySelector('[name=hzRound]:checked')?.value;
    if (name.length < 2) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'نام خود را بنویسید (دست‌کم دو حرف).'; input.focus(); return; }
    const label = b.textContent; b.disabled = true; b.textContent = 'در حال ثبت…'; sheet.querySelector('#chsDup')?.remove();
    try {
      hezbAsReserve = hezbFull(hezbRounds.find(r => r.id === id) || { registered: 0 });
      const a = await rpc('reg_register', { p_round: id, p_name: name });
      const code = a[0].code;
      try { const k = 'regCodes', l = JSON.parse(localStorage.getItem(k)) || []; localStorage.setItem(k, JSON.stringify([...new Set([code, ...l])])); } catch {}
      write('chlName', name);
      window.regReloadPublic?.();
      hezbRounds = (await rpc('reg_rounds').catch(() => hezbRounds)) || hezbRounds;
      renderSheet(code);
      window.account?.sync();
    } catch (err) { msg.className = 'chl-msg chl-bad'; msg.textContent = err.message; b.disabled = false; b.textContent = label; if (err.message === window.sbErrors.duplicate_name) dupHelp(msg, 'reg'); }
  }

  function typeLine(t) {
    if (t.kind === 'hezb') return hezbLine();
    const base = t.kind === 'page' ? 'هر روز یک صفحه' : t.kind === 'juz' ? `${fa(t.days)} روز، هر روز یک جزء` : `${fa(t.days)} روز`;
    if (t.start_mode === 'self') return `${base}، همیشه باز، از روز ثبت‌نام`;
    if (t.round_start) {
      const k = isoDiff(t.round_start, today);
      const full = t.capacity && t.waiting >= t.capacity ? `، ظرفیت کامل؛ رزرو ${fa(t.reserved || 0)} از ${fa(t.reserve)}` : '';
      return `${base}، دوره ${fa(t.round_number)}: ${k > 0 ? `شروع ${dateFa(t.round_start)}` : `روز ${fa(1 - k)}`}${full}`;
    }
    if (!t.round_id) return t.start_mode === 'fill' ? `${base}، ثبت‌نام: ۰ از ${fa(t.capacity)} نفر` : base;
    return `${base}، دوره ${fa(t.round_number || 1)}: ${fa(t.waiting || 0)} از ${fa(t.capacity)} نفر`;
  }

  // ---------- صفحه ثبت‌نام (از پایین باز می‌شود) ----------
  let sheet = null, sheetType = null, sheetRounds = [];
  // وضعیت یک دوره گروهی برای صفحه ثبت‌نام: تعداد ثبت‌نام، تاریخ شروع یا تعداد لازم، و روز چندم اگر شروع شده.
  const isFull = r => r.capacity && r.members >= r.capacity;
  function roundLine(r, t) {
    const who = isFull(r) ? `ظرفیت ${fa(r.capacity)} نفر کامل است؛ ${fa(r.reserved || 0)} از ${fa(r.reserve)} جای فهرست رزرو پر شده. اگر الان ثبت‌نام کنید، در فهرست رزرو قرار می‌گیرید و با انصراف هر نفر جای او را می‌گیرید`
      : `${fa(r.members)}${r.capacity ? ' از ' + fa(r.capacity) : ''} نفر ثبت‌نام کرده‌اند`;
    if (!r.start_date) {
      const left = Math.max(0, (r.capacity || 0) - r.members);
      return `<b>دوره ${fa(r.number)}</b>: ${who}.<div class="chl-bar"><span style="width:${Math.min(100, r.members / (r.capacity || 1) * 100)}%"></span></div>با ${fa(left)} نفر دیگر ظرفیت کامل می‌شود و ${t.kind === 'text' ? 'چله' : 'دوره'} خودکار ${startWord(t.start_after_days)} شروع می‌شود.`;
    }
    const k = isoDiff(r.start_date, today);
    if (k > 0) return `<b>دوره ${fa(r.number)}</b>: شروع ${esc(dateFa(r.start_date))} (${k === 1 ? 'فردا' : fa(k) + ' روز دیگر'}). ${who}.`;
    return `<b>دوره ${fa(r.number)}</b>: شروع شده است؛ امروز <b>روز ${fa(1 - k)} از ${fa(t.days)}</b>. ${who}.${isFull(r) ? '' : ' اگر الان ثبت‌نام کنید، از امروز همراه گروه می‌خوانید.'}`;
  }
  function buildSheet() {
    if (sheet) return;
    sheet = document.createElement('div'); sheet.className = 'chs'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = '<div class="chs-box"><div class="chs-grip"></div><div class="chs-in"></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', e => {
      if (e.target === sheet || e.target.closest('[data-chs-close]')) return closeSheet();
      onSheetClick(e);
    });
    sheet.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'chsName') sheet.querySelector('[data-chs-join],[data-hz-join]')?.click(); });
    // فقط وقتی ردیف تاریخچه خودِ برگه رفته باشد بسته می‌شود؛ بستن متنِ بازشده روی برگه، برگه را نمی‌بندد.
    window.addEventListener('popstate', () => { if (sheet.classList.contains('show') && !history.state?.chs) closeSheet(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented && sheet.classList.contains('show') && !reader?.classList.contains('show') && !document.querySelector('.qr.show')) closeSheet(); });
  }
  async function openSheet(key, fromMenu) {
    buildSheet();
    sheetType = key;
    sheet.classList.add('show'); document.body.classList.add('chl-lock');
    pushState({ chs: 1 }, fromMenu);
    const t = typeOf(key);
    sheetRounds = [];
    if (!t) { sheet.querySelector('.chs-in').innerHTML = '<div class="chs-top"><h2>چله</h2><button type="button" data-chs-close aria-label="بستن">✕</button></div><p>در حال دریافت…</p>'; await loadTypes(); }
    const tt = typeOf(key);
    if (tt && tt.kind !== 'hezb' && (tt.start_mode !== 'self' || tt.round_id)) { try { sheetRounds = (await rpc('chl_type_rounds', { p_type: key })) || []; } catch { sheetRounds = []; } }
    if (sheetType === key) renderSheet();
  }
  function closeSheet(fromHistory) {
    if (!sheet?.classList.contains('show')) return;
    sheet.classList.remove('show');
    if (!reader?.classList.contains('show')) document.body.classList.remove('chl-lock');
    if (!fromHistory) { try { if (history.state?.chs) history.back(); } catch {} }
  }
  function renderSheet(done) {
    const t = typeOf(sheetType), box = sheet.querySelector('.chs-in');
    const top = title => `<div class="chs-top"><h2>${esc(title)}</h2><button type="button" data-chs-close aria-label="بستن">✕</button></div>`;
    if (!t) { box.innerHTML = top('چله') + `<p class="chl-bad">${esc(typesError || 'این چله دیگر در فهرست نیست.')}</p>`; return; }
    if (t.kind === 'hezb') return renderHezb(box, top, t, done);
    if (done) {
      const m = mine.find(x => x.code === done);
      const when = !m ? '' : state(m) === 'reserve' ? `ظرفیت اصلی کامل بود؛ شما نفر ${fa(m.reserve_pos)} فهرست رزرو هستید. اگر کسی انصراف دهد، جای او را می‌گیرید${m.kind === 'juz' ? ' (و از جزء او ادامه می‌دهید)' : ''} و در «چله‌های من» خبر می‌دهیم.`
        : state(m) === 'wait' ? `هر وقت ظرفیت دوره (${fa(m.capacity)} نفر) کامل شود، چله ${startWord(t.start_after_days)} شروع می‌شود و همین‌جا خبر می‌دهیم. الان ${fa(m.members)} نفر ثبت‌نام کرده‌اند.`
        : state(m) === 'soon' ? `${m.kind === 'text' ? 'چله' : 'دوره'} شما ${dateFa(m.start_date)} شروع می‌شود.` : m.kind === 'page' ? 'از امروز شروع شد. همین حالا صفحه ۱ را بخوانید و «خواندم» را بزنید؛ فردا صفحه ۲.' : m.kind === 'juz' ? `دوره شروع شده است؛ امروز جزء ${fa(todaySpec(m).juz)} را بخوانید.` : 'چله شما از امروز شروع شده است. همین حالا می‌توانید متن را بخوانید و «امروز خواندم» را بزنید.';
      box.innerHTML = top(t.title) + `<div class="chs-ok"><div class="chs-check">✓</div><p class="chl-big">ثبت‌نام شد. قبول باشد.</p><p>${esc(when)}</p>
<p class="chl-note">${m?.email ? `اخبار دوره به ${esc(m.email)} هم فرستاده می‌شود.` : 'اخبار دوره را در همین سایت، بخش «چله‌های من» ببینید.'}</p>
<p class="hint" style="color:var(--muted)">کد چله شما: <span class="chs-code">${fa(done)}</span><br>این کد روی همین گوشی ذخیره شد. برای ادامه روی گوشی دیگر لازم است.</p></div>${window.sitePush?.hint() || ''}
<button type="button" class="chs-main" data-chs-go="${done}">رفتن به چله‌های من</button><button type="button" class="chs-alt" data-chs-share>دعوت دیگران به این چله</button>`;
      return;
    }
    const who = t.start_mode !== 'self' && t.capacity ? `هر دوره ${fa(t.capacity)} نفر${t.reserve ? ` و ${fa(t.reserve)} رزرو` : ''}` : 'بدون محدودیت نفرات';
    const facts = t.kind === 'page' ? ['هر روز یک صفحه', `${fa(t.days)} صفحه، یک ختم`, who]
      : t.kind === 'juz' ? [`${fa(t.days)} روز`, 'هر روز یک جزء', who]
      : [`${fa(t.days)} روز`, t.times_per_day > 1 ? `هر روز ${fa(t.times_per_day)} بار` : 'هر روز یک بار', who];
    const selfStart = `${t.kind === 'page' ? 'از صفحه ۱' : 'چله شما'} ${t.start_after_days ? startWord(t.start_after_days) + ' از ثبت‌نام' : 'از همان روز ثبت‌نام'} شروع می‌شود`;
    let st;
    const openOpt = t.start_mode === 'self' && sheetRounds.length ? `<label><input type="radio" name="chsRound" value="" checked><span><b>همیشه باز</b>: ${selfStart}.</span></label>` : '';
    if (sheetRounds.length > 1 || openOpt) st = `${openOpt ? 'می‌توانید از امروز خودتان شروع کنید یا با یک دوره گروهی همراه شوید:' : 'چند دوره ثبت‌نام دارد؛ یکی را انتخاب کنید:'}<div class="chs-rounds">${openOpt}${sheetRounds.map((r, i) => `<label><input type="radio" name="chsRound" value="${r.id}"${i || openOpt ? '' : ' checked'}><span>${roundLine(r, t)}${r.news ? `<span class="chl-news" style="display:block">${esc(r.news)}</span>` : ''}</span></label>`).join('')}</div>`;
    else if (sheetRounds.length === 1) st = roundLine(sheetRounds[0], t) + (sheetRounds[0].news ? `<div class="chl-news">${esc(sheetRounds[0].news)}</div>` : '');
    else if (t.start_mode === 'self') st = `همیشه باز است. ${selfStart}${t.kind === 'page' ? ' و هر روز از همان جایی که مانده‌اید ادامه می‌دهید' : ''}.${t.active ? ` الان <b>${fa(t.active)}</b> نفر در ${t.kind === 'text' ? 'این چله' : 'این دوره'} هستند.` : ''}`;
    else if (t.round_start) st = `<b>دوره ${fa(t.round_number)}</b> ${isoDiff(t.round_start, today) > 0 ? 'شروع می‌شود' : 'شروع شده'}: ${esc(dateFa(t.round_start))}.${t.capacity ? ` ${fa(t.waiting)} از ${fa(t.capacity)} نفر ثبت‌نام کرده‌اند.` : ''}${t.capacity && t.waiting >= t.capacity && t.reserve ? ` ظرفیت کامل است؛ ثبت‌نام تازه به فهرست رزرو می‌رود (${fa(t.reserved || 0)} از ${fa(t.reserve)}).` : ''}`;
    else {
      const left = t.capacity - (t.waiting || 0);
      st = `<b>دوره ${fa(t.round_number || 1)}</b> در حال ثبت‌نام: ${fa(t.waiting || 0)} از ${fa(t.capacity)} نفر.<div class="chl-bar"><span style="width:${Math.min(100, (t.waiting || 0) / t.capacity * 100)}%"></span></div>
با ${fa(left)} نفر دیگر ظرفیت کامل می‌شود و ${t.kind === 'text' ? 'چله' : 'دوره'} خودکار ${startWord(t.start_after_days)} شروع می‌شود.`;
    }
    const already = mine.filter(m => m.type_key === t.key && state(m) !== 'end');
    const r0 = sheetRounds.length === 1 ? sheetRounds[0] : null, toReserve = r0 ? isFull(r0) : t.capacity && t.waiting >= t.capacity && t.reserve > 0 && t.start_mode !== 'self';
    const lastName = read('chlName', '');
    box.innerHTML = top(t.title) + `<div class="chs-facts">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</div>
${t.description ? `<p class="chl-desc">${esc(t.description)}</p>` : ''}<div class="chs-state">${st}</div>
${already.length ? `<div class="chs-mine">شما با نام «${esc(already.map(m => m.name).join('، '))}» در این چله هستید. اگر برای شخص دیگری ثبت‌نام می‌کنید، نام او را بنویسید.</div>` : ''}
<label for="chsName">نام و نام خانوادگی</label><input id="chsName" maxlength="60" autocomplete="name" placeholder="مثلاً فاطمه رضایی" value="${already.length ? '' : esc(lastName)}">
<label for="chsEmail">ایمیل <small style="font-weight:400;color:var(--muted)">(اختیاری)</small></label><input id="chsEmail" type="email" inputmode="email" dir="ltr" maxlength="120" autocomplete="email" placeholder="name@example.com" value="${esc(read('chlEmail', ''))}">
<p class="chl-note">برای دریافت اخبار دوره، مثل شروع چله. اگر نمی‌خواهید خالی بگذارید؛ همه اخبار در همین سایت، بخش «چله‌های من» هم هست.</p>
<button type="button" class="chs-main" data-chs-join>${toReserve ? 'ثبت‌نام در فهرست رزرو' : t.kind === 'text' ? 'ثبت‌نام در چله' : 'ثبت‌نام در دوره'}</button><div class="chl-msg" id="chsMsg"></div>
${t.reserve && !toReserve ? `<p class="chl-note">وقتی ${fa(t.capacity)} نفر کامل شد، ${fa(t.reserve)} نفر بعدی در فهرست رزرو می‌روند تا اگر کسی انصراف داد، جایش خودکار پر شود.</p>` : ''}
<button type="button" class="chs-alt chl-read" data-read="${esc(t.text_key)}">${ICON_BOOK}دیدن متن ${t.kind === 'text' ? esc(textTitle(t.text_key, textsList) || '') : 'قرآن'}</button>`;
  }
  async function onSheetClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.read) {
      const t = typeOf(sheetType);
      if (t?.kind === 'juz') return openQuran({ juz: 1 });
      if (t?.kind === 'page') return openQuran({ page: 1 });
      return openReader(b.dataset.read, null);
    }
    if (b.hasAttribute('data-chs-join')) {
      const input = sheet.querySelector('#chsName'), msg = sheet.querySelector('#chsMsg'), name = input.value.trim().replace(/\s+/g, ' ');
      const email = norm(sheet.querySelector('#chsEmail').value).trim(), pick = sheet.querySelector('[name=chsRound]:checked')?.value;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.className = 'chl-msg chl-bad'; msg.textContent = window.sbErrors.chl_bad_email; sheet.querySelector('#chsEmail').focus(); return; }
      if (name.length < 2) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'نام خود را بنویسید (دست‌کم دو حرف).'; input.focus(); return; }
      const label = b.textContent; b.disabled = true; b.textContent = 'در حال ثبت…'; sheet.querySelector('#chsDup')?.remove();
      try {
        const code = pick ? await rpc('chl_join', { p_round: +pick, p_name: name, p_email: email || null })
          : await rpc('chl_join_type', { p_type: sheetType, p_name: name, p_email: email || null });
        codes.add(code); write('chlName', name); write('chlEmail', email);
        await refresh();
        renderSheet(code);
        window.account?.sync();
      } catch (err) { msg.className = 'chl-msg chl-bad'; msg.textContent = err.message; b.disabled = false; b.textContent = label; if (err.message === window.sbErrors.chl_duplicate_name) dupHelp(msg, 'chl'); }
      return;
    }
    if (b.hasAttribute('data-dup-acc')) {
      const m = b.dataset.dupAcc, key = sheetType;
      const prefill = { name: sheet.querySelector('#chsName')?.value.trim() || '', email: norm(sheet.querySelector('#chsEmail')?.value || '').trim() };
      // پس از ورود، چله‌های حساب روی گوشی می‌آیند و همین برگه دوباره نشان می‌دهد «شما با نام … در این چله هستید».
      closeSheet();
      setTimeout(() => window.account?.open(m, { note: DUP_NOTE, prefill, after: () => openSheet(key) }), 250);
      return;
    }
    if (b.hasAttribute('data-dup-code')) { const f = sheet.querySelector('#chsDupForm'); f.hidden = false; f.querySelector('input').focus(); return; }
    if (b.hasAttribute('data-dup-go')) return dupCode(b);
    if (b.hasAttribute('data-hz-join')) return hezbJoin(b);
    if (b.hasAttribute('data-hz-go')) {
      closeSheet();
      setTimeout(() => window.regOpenPublic?.(), 300);
      return;
    }
    if (b.dataset.chsGo) { const c = b.dataset.chsGo; closeSheet(); setTimeout(() => flash(c), 250); return; }
    if (b.hasAttribute('data-chs-share')) share(typeOf(sheetType));
  }
  // «این نام قبلاً ثبت شده»: به‌جای بن‌بست، راه ورود به حساب یا افزودن با کد.
  const DUP_NOTE = 'اگر قبلاً با ایمیل در چله ثبت‌نام کرده‌اید، با همان ایمیل وارد شوید یا حساب بسازید؛ پس از تأیید ایمیل، چله‌هایتان خودکار به حساب اضافه می‌شود.';
  function dupHelp(msg, kind) {
    const user = window.account?.user, chl = kind === 'chl', acc = !!window.account?.enabled;
    msg.insertAdjacentHTML('afterend', `<div class="chs-dup" id="chsDup"><b>این ثبت‌نام خود شماست؟</b>
${!acc ? `<p>اگر کد ${chl ? 'چله' : 'پیگیری'} را دارید، آن را بنویسید تا ثبت‌نامتان روی همین گوشی بیاید.</p>` : user ? `<p>این ثبت‌نام هنوز به حساب شما وصل نیست. اگر کد ${chl ? 'چله' : 'پیگیری'} را دارید، اینجا بنویسید${chl ? '؛ اگر هنگام ثبت‌نام ایمیل همین حساب را نوشته بودید، پس از تأیید ایمیل حساب خودکار اضافه می‌شود' : ''}.</p>`
  : `<p>وارد حساب کاربری شوید تا ثبت‌نام‌هایتان روی همین گوشی بیاید${chl ? '؛ اگر حساب ندارید و هنگام ثبت‌نام ایمیل نوشته بودید، با همان ایمیل حساب بسازید' : ''}. یا اگر کد ${chl ? 'چله' : 'پیگیری'} را دارید، آن را بنویسید.</p>
<button type="button" class="chs-main" data-dup-acc="login">ورود به حساب کاربری</button><button type="button" class="chs-alt" data-dup-acc="signup">ساخت حساب کاربری</button>`}
<button type="button" class="chs-alt" data-dup-code>کد ${chl ? 'چله' : 'پیگیری'} را دارم</button>
<div id="chsDupForm" hidden><label for="chsDupCode">کد ۸ رقمی</label><input id="chsDupCode" inputmode="numeric" maxlength="12" dir="ltr"><button type="button" class="chs-main" data-dup-go="${kind}">افزودن به این گوشی</button><div class="chl-msg" id="chsDupMsg"></div></div>
<p class="chl-note">${acc ? 'اگر نه حساب دارید، نه کد و نه ایمیل،' : 'اگر کد را ندارید،'} به مدیر گروه پیام دهید تا کدتان را بفرستد.</p></div>`);
  }
  async function dupCode(b) {
    const c = norm(sheet.querySelector('#chsDupCode').value).replace(/\D/g, ''), msg = sheet.querySelector('#chsDupMsg');
    if (c.length !== 8) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'کد ۸ رقم است.'; return; }
    b.disabled = true;
    try {
      if (b.dataset.dupGo === 'reg') {
        const a = await rpc('reg_lookup', { p_code: c });
        if (!a?.length) throw Error('ثبت‌نامی با این کد پیدا نشد.');
        const l = read('regCodes', []); write('regCodes', [...new Set([c, ...(Array.isArray(l) ? l : [])])]);
        window.regReloadPublic?.(); window.account?.sync();
        closeSheet(); setTimeout(() => window.regOpenPublic?.(), 300);
      } else {
        const a = await rpc('chl_lookup', { p_codes: [c] });
        if (!a?.length) throw Error('چله‌ای با این کد پیدا نشد.');
        codes.add(c); await refresh(); window.account?.sync();
        closeSheet(); setTimeout(() => flash(c), 250);
      }
    } catch (e) { msg.className = 'chl-msg chl-bad'; msg.textContent = e.message; b.disabled = false; }
  }
  async function share(t) {
    if (!t) return;
    const text = `دعوت به ${t.title}${t.capacity ? ` (هر دوره ${fa(t.capacity)} نفر)` : ''}؛ ${fa(t.days)} روز با هم بخوانیم. برای ثبت‌نام این لینک را باز کنید:`;
    const url = regLink(t.key);
    try { if (navigator.share) { await navigator.share({ title: t.title, text, url }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('لینک دعوت کپی شد؛ در گروه بفرستید.'); }
    catch { prompt('این متن را کپی کنید:', `${text}\n${url}`); }
  }
  let toastEl = null, toastT = 0;
  function toast(t) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;max-width:90vw;background:#1f1a14;color:#fff;padding:10px 18px;border:1px solid var(--gold);text-shadow:none;font-size:15px;text-align:center'; document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }
  const ICON_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/></svg>';
  let textsList = [];
  allTexts().then(l => { textsList = l; }).catch(() => {});

  // ---------- صفحه اصلی: «چله‌های من» ----------
  const panel = document.createElement('section');
  panel.className = 'panel'; panel.id = 'chellehPanel'; panel.hidden = true;
  {
    const groupsPanel = document.getElementById('groupsNav')?.closest('.panel');
    document.querySelector('main').insertBefore(panel, groupsPanel || null);
  }
  panel.addEventListener('click', onPanelClick);

  function renderPanel() {
    const has = mine.length > 0;
    panel.hidden = !has && !(isAdminView() && types.length);
    if (panel.hidden) return;
    const order = { run: 0, soon: 1, wait: 2, reserve: 2, end: 3 };
    const list = [...mine].sort((a, b) => order[state(a)] - order[state(b)]);
    const active = list.filter(m => state(m) !== 'end'), ended = list.filter(m => state(m) === 'end');
    panel.innerHTML = `<div class="chl-head"><h2>چله‌های من</h2><button type="button" class="reg-light" data-new>+ چله تازه</button></div>
${has ? '' : '<p class="hint">هنوز در چله‌ای ثبت‌نام نکرده‌اید. از منوی سه‌خط بالای صفحه یا دکمه «چله تازه» یکی را انتخاب کنید.</p>'}
${active.map(card).join('')}${ended.length ? `<details class="chl-fold"${active.length ? '' : ' open'}><summary>چله‌های تمام‌شده (${fa(ended.length)})</summary>${ended.map(card).join('')}</details>` : ''}
<details class="hint"><summary>کد چله دارید؟ (برای ادامه چله روی گوشی دیگر)</summary>
<div class="row" style="margin-top:8px"><input id="chlCodeIn" inputmode="numeric" placeholder="کد ۸ رقمی"><button type="button" data-addcode>ادامه چله</button></div><div class="chl-msg" id="chlCodeMsg"></div></details>`;
    // کارت اعلان (reminders.js) و کدهای اشتراک اعلان به‌روز می‌شود.
    document.dispatchEvent(new Event('chl:panel'));
  }
  const readBtn = (key, code, label) => `<button type="button" class="reg-light chl-read" data-read="${esc(key)}"${code ? ` data-code="${code}"` : ''}>${ICON_BOOK}${label || 'خواندن متن'}</button>`;

  // کسی که از فهرست رزرو آمده، روزهای پیش از آمدنش جامانده حساب نمی‌شود.
  // (روز قرائت از اذان صبح شروع می‌شود؛ پیش از اذان، تاریخ تقویم یک روز جلوتر است.)
  const fromDay = m => { const p = m.promoted_day && m.promoted_day > today ? today : m.promoted_day; return p && p > m.start_date ? p : m.start_date; };
  function grid(m) {
    const done = new Set(m.marked || []), n = dayNo(m), from = fromDay(m);
    let s = '';
    for (let i = 1; i <= m.days; i++) {
      const iso = isoAdd(m.start_date, i - 1);
      const cls = done.has(iso) ? 'd' : i === n ? 't' : i < n && iso >= from ? 'm' : 'n';
      s += `<i class="${cls}" title="${esc(dateFa(iso))}">${done.has(iso) ? '✓' : fa(i)}</i>`;
    }
    return `<div class="chl-grid" aria-label="جدول روزهای چله">${s}</div><div class="chl-legend"><span><b style="background:var(--emerald)"></b>خوانده‌شده</span><span><b style="background:#f6e3e3"></b>جامانده</span><span><b style="outline:2px solid var(--gold)"></b>امروز</span></div>`;
  }

  function card(m) {
    const s = state(m), n = dayNo(m), done = new Set(m.marked || []), count = done.size, yesterday = isoAdd(today, -1);
    // روزهای جامانده تا LATE_DAYS روز گذشته (app.js) را می‌شود جداگانه ثبت کرد؛ chl_mark هم همین بازه را می‌پذیرد.
    const lateBtns = () => {
      const from = fromDay(m), a = [];
      for (let i = typeof LATE_DAYS === 'number' ? LATE_DAYS : 1; i >= 1; i--) { const d = isoAdd(today, -i); if (d >= from && !done.has(d)) a.push(d); }
      return a.length ? `<div class="chl-small"><span>خواندم ولی ثبت نکردم:</span>${a.map(d => `<button type="button" data-mark="${m.code}" data-day="${d}">${d === yesterday ? 'دیروز' : esc(typeof shortDayFa === 'function' ? shortDayFa(d) : dateFa(d))}</button>`).join('')}</div>` : '';
    };
    const label = m.personal || !m.type_key ? '' : `<span>دوره ${fa(m.number)}</span>`;
    let body = '', tag = '';
    const promo = promoNew(m) ? `<div class="chl-news chl-promo"><b>از فهرست رزرو به گروه اصلی آمدید.</b> ${m.replaced_name ? `جای «${esc(m.replaced_name)}» که انصراف داد به شما رسید. ` : ''}${s === 'run' ? (m.kind === 'juz' ? `از امروز جزء ${fa(todaySpec(m).juz)} را بخوانید.` : 'از امروز همراه گروه بخوانید.') : s === 'soon' || s === 'wait' ? 'با شروع دوره همراه گروه می‌خوانید.' : ''} <button type="button" class="reg-light" data-promo="${m.code}">دیدم</button></div>` : '';
    if (s === 'reserve') {
      tag = '<span class="chl-tag wait">فهرست رزرو</span>';
      body = `<p style="margin:8px 0 0">ظرفیت ${fa(m.capacity)} نفره دوره کامل است و شما <b>نفر ${fa(m.reserve_pos)} فهرست رزرو</b> هستید.</p>
<p class="hint">اگر کسی از گروه انصراف دهد، جای او خودکار به نفر اول رزرو می‌رسد${m.kind === 'juz' ? ' و از جزء همان نفر ادامه می‌دهد' : ''}. خبرش همین‌جا و روی منوی سایت دیده می‌شود${m.email ? ' (و مدیر می‌تواند به ایمیل شما هم خبر دهد)' : ''}.</p>
<div class="chl-actions">${readBtn(m.text_key, m.code)}</div>`;
    } else if (s === 'wait') {
      const left = Math.max(0, (m.capacity || 0) - m.members), t = typeOf(m.type_key);
      tag = '<span class="chl-tag wait">در انتظار تکمیل ظرفیت</span>';
      body = `<p style="margin:8px 0 0">${fa(m.members)} از ${fa(m.capacity)} نفر ثبت‌نام کرده‌اند.</p><div class="chl-bar"><span style="width:${Math.min(100, m.members / (m.capacity || 1) * 100)}%"></span></div>
<p class="hint">با ${fa(left)} نفر دیگر، ${m.kind === 'text' ? 'چله' : 'دوره'} خودکار ${startWord(t ? t.start_after_days : 1)} شروع می‌شود. با دعوت دوستان زودتر شروع می‌شود.</p>
<div class="chl-actions">${readBtn(m.text_key, m.code)}<button type="button" data-share="${esc(m.type_key || '')}">دعوت دیگران</button></div>`;
    } else if (s === 'soon') {
      tag = '<span class="chl-tag wait">به‌زودی</span>';
      const k = isoDiff(m.start_date, today);
      body = `<p style="margin:8px 0 0">${m.kind === 'text' ? 'چله' : 'دوره'} شما ${esc(dateFa(m.start_date))} شروع می‌شود (${k === 1 ? 'فردا' : fa(k) + ' روز دیگر'}).</p><div class="reg-tools">${readBtn(m.text_key, m.code)}</div>`;
    } else if (s === 'run' && m.kind === 'page') {
      const pg = todaySpec(m).page;
      tag = `<span class="chl-tag">صفحه ${fa(pg)} از ${fa(m.days)}</span>`;
      const act = done.has(today)
        ? `<button type="button" class="chl-done" data-unmark="${m.code}" data-day="${today}" title="برای برداشتن بزنید">✓ امروز خوانده شد</button>`
        : `<button type="button" data-mark="${m.code}" data-day="${today}">صفحه ${fa(pg)} را خواندم</button>`;
      body = `<p style="margin:8px 0 0">تا امروز ${fa(count)} صفحه از ${fa(m.days)} صفحه قرآن را خوانده‌اید.${done.has(today) ? ` فردا صفحه ${fa(Math.min(m.days, count + 1))}.` : ''}</p><div class="chl-bar"><span style="width:${Math.min(100, count / m.days * 100)}%"></span></div>
<div class="chl-actions">${readBtn('quran', m.code, `خواندن صفحه ${fa(pg)}`)}${act}</div>
${n > 1 && !done.has(today) ? lateBtns() : ''}`;
    } else if (s === 'run') {
      tag = `<span class="chl-tag">روز ${fa(n)} از ${fa(m.days)}</span>`;
      const act = done.has(today)
        ? `<button type="button" class="chl-done" data-unmark="${m.code}" data-day="${today}" title="برای برداشتن بزنید">✓ امروز خوانده شد</button>`
        : `<button type="button" data-mark="${m.code}" data-day="${today}">امروز خواندم</button>`;
      const since = isoDiff(today, fromDay(m)) + 1;
      body = `<p style="margin:8px 0 0">${fa(count)} روز از ${fa(since)} روز ${since < n ? 'پس از آمدن به گروه' : 'گذشته'} را خوانده‌اید.${m.times_per_day > 1 ? ` هر روز ${fa(m.times_per_day)} بار بخوانید.` : ''}</p>${grid(m)}
${m.kind === 'juz' ? `<p class="chl-big" style="margin:8px 0 0">امروز: جزء ${fa(todaySpec(m).juz)}</p>` : ''}
<div class="chl-actions">${readBtn(m.text_key, m.code, m.kind === 'juz' ? `خواندن جزء ${fa(todaySpec(m).juz)}` : '')}${act}</div>
${since > 1 ? lateBtns() : ''}`;
    } else {
      tag = '<span class="chl-tag">تمام شد</span>';
      body = m.kind === 'page' ? `<p class="chl-big">${fa(count)} صفحه، یک ختم کامل قرآن. قبول باشد.</p>` : `<p class="chl-big">${fa(count)} روز از ${fa(m.days)} روز را خواندید. قبول باشد.</p>${grid(m)}
<div class="chl-actions">${m.type_key && typeOf(m.type_key) ? `<button type="button" data-again="${esc(m.type_key)}">شروع دوباره این چله</button>` : ''}<button type="button" class="reg-light" data-forget="${m.code}">برداشتن از فهرست</button></div>`;
    }
    return `<div class="chl-card" id="chlC${m.code}"><h3>${esc(m.title)}</h3><div class="chl-meta">${tag}<span>${esc(m.name)}</span>${label}${s === 'run' ? `<span>امروز ${fa(m.done_today)} از ${fa(m.members)} نفر خوانده‌اند</span>` : ''}</div>
${promo}${m.description ? `<p class="chl-desc">${esc(m.description)}</p>` : ''}${m.news && s !== 'end' ? `<div class="chl-news"><b>خبر دوره:</b> ${esc(m.news)}</div>` : ''}${body}<div class="chl-msg" id="chlM${m.code}"></div>
${s !== 'end' ? `<details class="chl-mail"><summary>${m.email ? `اخبار دوره به ایمیل ${esc(m.email)} (تغییر)` : 'دریافت اخبار دوره با ایمیل'}</summary><div class="row" style="margin-top:6px"><input id="chlE${m.code}" type="email" inputmode="email" maxlength="120" placeholder="name@example.com" value="${esc(m.email || '')}"><button type="button" data-email="${m.code}">ذخیره</button></div></details>` : ''}
${s !== 'end' ? `<div class="chl-small"><span class="hint">کد چله: <b dir="ltr">${fa(m.code)}</b></span><button type="button" class="chl-red" data-leave="${m.code}">${s === 'reserve' ? 'خروج از فهرست رزرو' : `انصراف از ${m.kind === 'text' ? 'چله' : 'دوره'}`}</button></div>` : ''}</div>`;
  }
  function flash(code) {
    const el = document.getElementById('chlC' + code); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  async function onPanelClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (b.hasAttribute('data-new')) return window.siteMenu ? window.siteMenu.open() : null;
    if (d.read) return openReader(d.read, d.code ? mine.find(m => m.code === d.code) : null);
    if (d.share !== undefined) return share(typeOf(d.share));
    if (d.again) return openSheet(d.again);
    if (d.forget) { codes.remove(d.forget); window.account?.unlink('chl', d.forget); mine = mine.filter(m => m.code !== d.forget); renderPanel(); return; }
    if (b.hasAttribute('data-addcode')) return addCode();
    if (d.promo) { write('chlPromoSeen', [...read('chlPromoSeen', []).slice(-50), d.promo]); renderPanel(); updateDot(); return; }
    if (d.email) {
      const v = norm(panel.querySelector('#chlE' + d.email).value).trim();
      try { const e = await rpc('chl_set_email', { p_code: d.email, p_email: v }); const m = mine.find(x => x.code === d.email); if (m) m.email = e; if (e) write('chlEmail', e); renderPanel(); toast(e ? 'ایمیل ثبت شد.' : 'ایمیل برداشته شد.'); }
      catch (err) { const el = panel.querySelector('#chlM' + d.email); if (el) { el.className = 'chl-msg chl-bad'; el.textContent = err.message; } }
      return;
    }
    if (d.mark || d.unmark) {
      const code = d.mark || d.unmark;
      if (d.unmark && !confirm('ثبت «خواندم» برای امروز برداشته شود؟')) return;
      b.disabled = true;
      try { await mark(code, d.day, !!d.mark); if (d.mark) toast(d.day === today ? 'ثبت شد. قبول باشد.' : d.day === isoAdd(today, -1) ? 'روز دیروز هم ثبت شد.' : `${typeof shortDayFa === 'function' ? shortDayFa(d.day) : 'آن روز'} هم ثبت شد.`); }
      catch (err) { const m = panel.querySelector('#chlM' + code); if (m) { m.className = 'chl-msg chl-bad'; m.textContent = err.message; } b.disabled = false; }
      return;
    }
    if (d.leave) {
      const m = mine.find(x => x.code === d.leave);
      const note = m?.reserve ? '' : m?.reserved ? ' جای شما خودکار به نفر اول فهرست رزرو داده می‌شود.' : '';
      if (!confirm(m?.reserve ? `«${m.name}» از فهرست رزرو ${m.title} خارج شود؟` : `«${m?.name || ''}» از ${m?.title || 'این چله'} انصراف دهد؟ روزهای ثبت‌شده هم پاک می‌شود.${note}`)) return;
      try { await rpc('chl_leave', { p_code: d.leave }); codes.remove(d.leave); await refresh(); toast('انصراف ثبت شد.'); }
      catch (err) { const el = panel.querySelector('#chlM' + d.leave); if (el) { el.className = 'chl-msg chl-bad'; el.textContent = err.message; } }
    }
  }
  async function addCode() {
    const c = norm(panel.querySelector('#chlCodeIn').value).replace(/\D/g, ''), msg = panel.querySelector('#chlCodeMsg');
    if (c.length !== 8) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'کد چله ۸ رقم است.'; return; }
    try {
      const a = await rpc('chl_lookup', { p_codes: [c] });
      if (!a?.length) { msg.className = 'chl-msg chl-bad'; msg.textContent = 'چله‌ای با این کد پیدا نشد.'; return; }
      codes.add(c); await refresh(); flash(c); window.account?.sync();
    } catch (e) { msg.className = 'chl-msg chl-bad'; msg.textContent = e.message; }
  }
  async function mark(code, day, done) {
    const marked = await rpc('chl_mark', { p_code: code, p_day: day, p_done: done });
    const m = mine.find(x => x.code === code);
    if (m) { m.marked = marked || []; if (day === today) m.done_today = Math.max(0, m.done_today + (done ? 1 : -1)); }
    renderPanel(); updateDot();
    return m;
  }

  // ---------- خواندن متن ----------
  const RKEY = 'chlReader';
  const prefs = Object.assign({ size: 28, trans: true, night: false }, read(RKEY, {}));
  let reader = null, current = null;
  function buildReader() {
    if (reader) return reader;
    reader = document.createElement('div'); reader.className = 'cr'; reader.setAttribute('role', 'dialog'); reader.setAttribute('aria-modal', 'true');
    reader.innerHTML = `<div class="cr-bar"><button type="button" data-x="close" aria-label="بستن">✕</button><div class="cr-title"><b></b><small></small></div><button type="button" data-x="menu" aria-label="تنظیمات">⚙</button><span class="cr-prog"></span></div>
<div class="cr-menu"><div class="cr-row"><span>اندازه متن</span><div><button type="button" data-x="smaller">−</button><button type="button" data-x="bigger">+</button></div></div>
<div class="cr-row"><span>ترجمه</span><div><button type="button" data-x="tr-on">نمایش</button><button type="button" data-x="tr-off">پنهان</button></div></div>
<div class="cr-row" hidden><span>مترجم</span><select id="crTr" aria-label="ترجمه"></select></div>
<div class="cr-row"><span>حالت شب</span><div><button type="button" data-x="day">روز</button><button type="button" data-x="night">شب</button></div></div></div>
<div class="cr-body"></div>
<div class="cr-aud" hidden><div><span>صوت</span><select aria-label="انتخاب صوت"></select></div><audio controls preload="none"></audio></div>`;
    document.body.appendChild(reader);
    reader.addEventListener('click', onReaderClick);
    reader.querySelector('.cr-aud select').addEventListener('change', e => {
      const list = current?.text?.audio || [], a = list[+e.target.value]; if (!a) return;
      prefs.audio = Object.assign(prefs.audio || {}, { [current.key]: a.url }); write(RKEY, prefs);
      const au = reader.querySelector('.cr-aud audio'), was = !au.paused; au.src = a.url; if (was) au.play().catch(() => {});
    });
    reader.querySelector('#crTr').addEventListener('change', async e => {
      prefs.tr = e.target.value; write(RKEY, prefs);
      if (!current) return;
      const top = reader.scrollTop; await loadTr(); renderReader(); reader.scrollTop = top;
    });
    reader.addEventListener('scroll', () => { const h = reader.scrollHeight - reader.clientHeight; reader.querySelector('.cr-prog').style.width = (h > 0 ? reader.scrollTop / h * 100 : 0) + '%'; }, { passive: true });
    window.addEventListener('popstate', () => { if (reader.classList.contains('show') && !history.state?.chl) closeReader(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && reader.classList.contains('show')) closeReader(); });
    return reader;
  }
  function applyPrefs() {
    reader.style.setProperty('--qs', prefs.size + 'px');
    reader.classList.toggle('night', prefs.night); reader.classList.toggle('no-tr', !prefs.trans);
    const on = { 'tr-on': prefs.trans, 'tr-off': !prefs.trans, day: !prefs.night, night: prefs.night };
    reader.querySelectorAll('.cr-row [data-x]').forEach(b => b.classList.toggle('on', !!on[b.dataset.x]));
    write(RKEY, prefs);
  }
  async function loadTr() {
    const { key, text } = current, sel = reader.querySelector('#crTr');
    const list = (await loadTrList()).filter(x => (x.texts || []).includes(key));
    const opt = x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`, langs = [...new Set(list.map(x => x.lang))].filter(l => l !== 'fa');
    sel.innerHTML = `<optgroup label="فارسی"><option value="">ترجمه پیش‌فرض سایت</option>${list.filter(x => x.lang === 'fa').map(opt).join('')}</optgroup>`
      + langs.map(l => `<optgroup label="${esc(TR_LANGS[l] || l)}">${list.filter(x => x.lang === l).map(opt).join('')}</optgroup>`).join('');
    sel.closest('.cr-row').hidden = !list.length;
    const meta = list.find(x => x.id === prefs.tr);
    const data = meta && await fetch(`chelleh/tr/${meta.id}/${key}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    const ok = data && Array.isArray(data.t) && data.n === (text.sections || []).length;
    current.tr = ok ? { meta, t: data.t } : null;
    sel.value = ok ? meta.id : '';
  }
  // شمارنده بندهای تکراری (مثلاً صد لعن و صد سلام)، جدا برای هر روز.
  const countKey = () => `chlCount:${current.key}:${today || isoIran()}`;
  const counts = () => read(countKey(), {});

  async function openReader(key, member) {
    if (member && (member.kind === 'juz' || member.kind === 'page')) return openQuran(todaySpec(member), member);
    const bt = (await loadBuiltins()).find(x => x.key === key);
    if (bt?.quran) return openQuran({ surah: bt.quran.surah, title: bt.title }, member);
    buildReader();
    reader.querySelector('.cr-title b').textContent = 'در حال بارگذاری…';
    reader.querySelector('.cr-title small').textContent = '';
    reader.querySelector('.cr-body').innerHTML = '';
    reader.querySelector('.cr-menu').classList.remove('show');
    reader.classList.add('show'); document.body.classList.add('chl-lock');
    pushState({ chl: 1 });
    applyPrefs();
    let t;
    try { t = await getText(key); }
    catch (e) { reader.querySelector('.cr-title b').textContent = 'متن باز نشد'; reader.querySelector('.cr-body').innerHTML = `<p class="cr-sec only" style="margin-top:30px">${esc(e.message)}</p>`; return; }
    current = { key, member, text: t, tr: null };
    await loadTr();
    reader.querySelector('.cr-title b').textContent = t.title;
    reader.querySelector('.cr-title small').textContent = member && state(member) === 'run' ? `${member.title}، روز ${fa(dayNo(member))} از ${fa(member.days)}` : '';
    renderReader();
    reader.scrollTop = 0;
  }
  function renderReader() {
    const t = current.text, c = counts(), m = current.member;
    const tr = current.tr, lang = tr ? tr.meta.lang : 'fa', dir = RTL.includes(lang) ? 'rtl' : 'ltr';
    const trSrc = tr ? `<small class="cr-trsrc">ترجمه: ${esc(tr.meta.name)}${tr.meta.src ? ` · ${esc(tr.meta.src)}` : ''}</small>` : '';
    let html = `<div class="cr-head"><h3>${esc(t.title)}</h3>${t.about ? `<small>${esc(t.about)}</small>` : ''}${trSrc}</div><p class="cr-bism">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>`;
    html += (t.sections || []).map((s, i) => {
      if (!s.ar) return `<div class="cr-sec only"><p class="cr-note">${esc(s.note)}</p></div>`;
      const n = c[i] || 0, rep = s.repeat ? `<div class="cr-count"><button type="button" data-count="${i}" class="${n >= s.repeat ? 'full' : ''}">${fa(n)} / ${fa(s.repeat)}</button><small>${n >= s.repeat ? 'کامل شد' : 'با هر بار خواندن بزنید'}</small>${n ? `<button type="button" class="cr-reset" data-reset="${i}">از نو</button>` : ''}</div>` : '';
      const f = tr ? tr.t[i] : s.fa;
      return `<div class="cr-sec">${s.note ? `<p class="cr-note">${esc(s.note)}</p>` : ''}<p class="cr-ar" lang="ar" dir="rtl">${esc(s.ar)}</p>${f ? `<p class="cr-fa" lang="${lang}" dir="${dir}">${esc(f)}</p>` : ''}${rep}</div>`;
    }).join('');
    if (m && state(m) === 'run') {
      const done = (m.marked || []).includes(today);
      html += `<div class="cr-end"><p>${esc(m.name)}، روز ${fa(dayNo(m))} از ${fa(m.days)} چله</p>${done ? '<div class="chl-done">✓ امروز ثبت شده است. قبول باشد.</div>' : `<button type="button" data-done="1">خواندم؛ ثبت برای امروز</button>`}<div class="chl-msg" id="crMsg"></div></div>`;
    }
    html += '<p class="cr-bism" style="font-size:20px">صَدَقَ اللّهُ الْعَلِيُّ الْعَظِيم</p>';
    reader.querySelector('.cr-body').innerHTML = html;
    // صوت‌های این متن (اگر هست)؛ آخرین انتخاب هر متن یادش می‌ماند.
    const aud = reader.querySelector('.cr-aud'), list = Array.isArray(t.audio) ? t.audio.filter(a => a && a.url) : [];
    aud.hidden = !list.length;
    if (list.length) {
      const sel = aud.querySelector('select'), au = aud.querySelector('audio');
      let i = Math.max(0, list.findIndex(a => a.url === prefs.audio?.[current.key]));
      sel.innerHTML = list.map((a, k) => `<option value="${k}">${esc(a.name)}</option>`).join(''); sel.value = i;
      if (au.getAttribute('src') !== list[i].url) au.src = list[i].url;
    }
  }
  async function onReaderClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'close') return closeReader();
    if (x === 'menu') return reader.querySelector('.cr-menu').classList.toggle('show');
    if (x === 'smaller') prefs.size = Math.max(20, prefs.size - 2);
    if (x === 'bigger') prefs.size = Math.min(44, prefs.size + 2);
    if (x === 'tr-on' || x === 'tr-off') prefs.trans = x === 'tr-on';
    if (x === 'day' || x === 'night') prefs.night = x === 'night';
    if (x) return applyPrefs();
    if (!current) return;
    if (b.dataset.count || b.dataset.reset) {
      const i = +(b.dataset.count ?? b.dataset.reset), c = counts(), s = current.text.sections[i];
      c[i] = b.dataset.reset ? 0 : Math.min(s.repeat, (c[i] || 0) + 1);
      write(countKey(), c);
      if (navigator.vibrate && c[i] === s.repeat) navigator.vibrate(120);
      const top = reader.scrollTop; renderReader(); reader.scrollTop = top; return;
    }
    if (b.dataset.done) {
      b.disabled = true;
      try { current.member = await mark(current.member.code, today, true) || current.member; const top = reader.scrollTop; renderReader(); reader.scrollTop = top; }
      catch (err) { const m = reader.querySelector('#crMsg'); m.className = 'chl-msg chl-bad'; m.textContent = err.message; b.disabled = false; }
    }
  }
  function closeReader(fromHistory) {
    reader.classList.remove('show');
    try { reader.querySelector('.cr-aud audio').pause(); } catch {}
    if (!sheet?.classList.contains('show')) document.body.classList.remove('chl-lock');
    reader.querySelector('.cr-menu').classList.remove('show');
    if (!fromHistory) { try { if (history.state?.chl) history.back(); } catch {} }
  }

  // ---------- مدیریت: زبانه «چله‌ها» ----------
  let pane = null, adminTypes = [], adminRounds = [], texts = [], openRound = null, editKey = null, roundFilter = '';
  const $a = s => pane.querySelector(s);
  function buildAdmin() {
    pane = document.getElementById('pane-chl'); if (!pane || pane.dataset.built) return;
    pane.dataset.built = 1; pane.classList.add('chl-adm');
    pane.innerHTML = `<div class="adm-card"><h3>منوی ثبت‌نام چله</h3>
<p class="hint">این‌ها در منوی سه‌خط بالای سایت دیده می‌شوند. برای هر کدام تعیین کنید چند روز است و هر دوره چند نفر؛ «همیشه باز» یعنی هر کس از روز ثبت‌نام چله خودش را شروع می‌کند. در حالت دوره‌ای، با کامل شدن ظرفیت، دوره خودکار شروع و دوره بعد باز می‌شود.</p>
<div id="chlTypes"><p class="hint">در حال دریافت…</p></div>
<div class="chl-tools"><button type="button" id="chlTypeNew">+ افزودن چله تازه به منو</button></div><div class="adm-msg" id="chlTypeMsg"></div></div>
<div class="adm-bar"><strong>دوره‌ها و شرکت‌کنندگان</strong><button type="button" class="reg-light" id="chlReload">تازه‌سازی</button></div>
<div class="adm-card"><div class="chl-form"><div><label for="chlRoundFilter">نمایش</label><select id="chlRoundFilter"></select></div>
<div><label class="adm-opt" style="margin-top:38px"><input type="checkbox" id="chlShowClosed"> بایگانی‌شده‌ها هم</label></div></div>
<details style="margin-top:8px"><summary><b>باز کردن دوره تازه</b></summary>
<p class="hint">معمولاً لازم نیست: با پر شدن هر دوره، دوره بعد خودکار باز می‌شود. اگر می‌خواهید دوره‌ای با تاریخ مشخص یا چند دوره هم‌زمان داشته باشید، از اینجا بسازید.</p>
<div class="chl-form"><div><label for="chlNrType">چله</label><select id="chlNrType"></select></div><div></div>
<label class="adm-opt full"><input type="checkbox" id="chlNrHasStart"> تاریخ شروع مشخص دارد (وگرنه با پر شدن ظرفیت شروع می‌شود)</label>
<div class="full" id="chlNrStartBox" hidden><input id="chlNrStart"></div></div>
<div class="chl-tools"><button type="button" id="chlNrBtn">باز کردن دوره</button></div></details><div class="adm-msg" id="chlAdminMsg"></div></div>
<div id="chlAdminRounds"><p class="hint">در حال دریافت…</p></div>
<div class="adm-card chl-edit"><h3>متن‌ها</h3>
<p class="hint">سه متن آماده (زیارت عاشورا، حدیث کسا، آل یاسین) در سایت هست. متن و ترجمه را با یک مفاتیح چاپی مقابله کنید و اگر لازم بود همین‌جا اصلاح کنید. متن تازه (مثلاً دعای توسل) را هم می‌توانید اضافه کنید و بعد در «منوی ثبت‌نام» برای آن چله بسازید.</p>
<div class="row"><select id="chlTextPick"></select><button type="button" class="reg-light" id="chlTextLoad">ویرایش</button><button type="button" class="reg-light" id="chlTextNew">متن تازه</button></div>
<div id="chlTextForm" hidden><label for="chlTextTitle">عنوان</label><input id="chlTextTitle" maxlength="80">
<label for="chlTextAbout">منبع یا توضیح کوتاه</label><input id="chlTextAbout" maxlength="500">
<label for="chlTextBody">متن</label><p class="hint">هر بند را با یک خط خالی جدا کنید. خط اول هر بند متن عربی است و خط بعد ترجمه فارسی. خطی که با ! شروع شود توضیح است (مثلاً «! سپس صد مرتبه بگویید:») و خط «# ۱۰۰» یعنی آن بند ۱۰۰ بار تکرار می‌شود و شمارنده دارد.</p>
<textarea id="chlTextBody"></textarea>
<label for="chlTextAudio">صوت‌ها</label><p class="hint">هر خط یک صوت: نام، خط عمودی، نشانی فایل صوتی (https). مثلاً: «علی فانی | https://…/ashura.mp3». در صفحه خواندن، صوت‌ها برای انتخاب و پخش می‌آیند.</p>
<textarea id="chlTextAudio" dir="ltr" style="min-height:90px;font-size:14px"></textarea>
<div class="reg-tools"><button type="button" id="chlTextSave">ذخیره متن</button><button type="button" class="reg-light" id="chlTextPreview">پیش‌نمایش</button><button type="button" class="reg-danger" id="chlTextReset" hidden>بازگرداندن متن اصلی</button></div></div>
<div class="adm-msg" id="chlTextMsg"></div></div>`;
    JDate($a('#chlNrStart')); $a('#chlNrStart').value = J.addDays(J.todayIso(), 1);
    $a('#chlNrHasStart').onchange = e => { $a('#chlNrStartBox').hidden = !e.target.checked; };
    $a('#chlNrBtn').onclick = newRound;
    $a('#chlNrType').onchange = e => { const t = adminTypes.find(x => x.key === e.target.value), need = t?.start_mode !== 'fill'; $a('#chlNrHasStart').checked = need; $a('#chlNrStartBox').hidden = !$a('#chlNrHasStart').checked; };
    $a('#chlReload').onclick = loadAdmin;
    $a('#chlRoundFilter').onchange = e => { roundFilter = e.target.value; renderRounds(); };
    $a('#chlShowClosed').onchange = renderRounds;
    $a('#chlTypeNew').onclick = () => { editKey = '__new'; renderTypes(); };
    $a('#chlTextLoad').onclick = () => editText($a('#chlTextPick').value);
    $a('#chlTextNew').onclick = () => editText(null);
    $a('#chlTextSave').onclick = saveText;
    $a('#chlTextPreview').onclick = () => { const t = formText(); if (!t.sections.length) return tmsg('متن خالی است.'); textCache.__preview = t; openReader('__preview'); };
    $a('#chlTextReset').onclick = resetText;
    pane.addEventListener('click', onAdminClick);
  }
  const msgTo = (id, t, ok) => { const m = $a('#' + id); if (!m) return; m.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); m.textContent = t; };
  const amsg = (t, ok) => msgTo('chlAdminMsg', t, ok), tmsg = (t, ok) => msgTo('chlTextMsg', t, ok), ymsg = (t, ok) => msgTo('chlTypeMsg', t, ok);

  async function loadAdmin() {
    buildAdmin(); if (!pane) return;
    texts = textsList = await allTexts(true);
    const opts = texts.map(t => `<option value="${esc(t.key)}">${esc(t.title)}${t.edited ? ' (ویرایش‌شده)' : ''}</option>`).join('');
    const keepPick = $a('#chlTextPick').value; $a('#chlTextPick').innerHTML = opts; if (keepPick) $a('#chlTextPick').value = keepPick;
    try {
      [adminTypes, adminRounds] = await Promise.all([
        api('chelleh_types?select=*&order=sort,created_at', { auth: true }),
        api('chelleh_rounds?select=*,chelleh_members(count)&order=id.desc', { auth: true })
      ]);
    } catch (e) {
      $a('#chlTypes').innerHTML = `<p class="adm-bad">${esc(e.message)}</p>`; $a('#chlAdminRounds').innerHTML = ''; return;
    }
    const tOpts = adminTypes.map(t => `<option value="${esc(t.key)}">${esc(t.title)}</option>`).join('');
    $a('#chlNrType').innerHTML = adminTypes.filter(t => t.kind !== 'hezb').map(t => `<option value="${esc(t.key)}">${esc(t.title)}</option>`).join(''); $a('#chlNrType').onchange?.({ target: $a('#chlNrType') });
    $a('#chlRoundFilter').innerHTML = '<option value="">همه چله‌ها</option>' + tOpts + (adminRounds.some(r => !r.type_key) ? '<option value="-">بدون نوع (قدیمی)</option>' : '');
    $a('#chlRoundFilter').value = roundFilter;
    renderTypes(); await renderRounds();
  }

  // نوع‌ها
  const KINDS = { text: 'چله (هر روز کل متن)', juz: 'جزءخوانی گردشی', page: 'روزی یک صفحه قرآن', hezb: 'حزب‌خوانی (گروه ۱۲۰ نفره)' };
  function typeSummary(t) {
    if (t.kind === 'hezb') return 'ثبت‌نام همان دوره‌های زبانه «ثبت‌نام» است (گروه ۱۲۰ نفره، تلگرام یا بله).';
    const len = t.kind === 'page' ? `${fa(t.days)} صفحه، روزی یک صفحه` : `${fa(t.days)} روز${t.kind === 'juz' ? '، روزی یک جزء' : ''}`;
    const mode = t.start_mode === 'self' ? `همیشه باز، هر کس از ${t.start_after_days ? startWord(t.start_after_days) + ' ثبت‌نام' : 'روز ثبت‌نام'}`
      : t.start_mode === 'date' ? `همه با هم از ${t.next_start ? dateFa(t.next_start) : 'تاریخ مشخص'}${t.capacity ? `، هر دوره ${fa(t.capacity)} نفر` : ''}${t.auto_next ? '، دوره‌ها پشت سر هم' : ''}`
      : `هر دوره ${fa(t.capacity)} نفر، شروع ${startWord(t.start_after_days)} پس از تکمیل`;
    return `${KINDS[t.kind] || ''}؛ ${len}، ${mode}${t.capacity && t.reserve && t.start_mode !== 'self' ? `، ${fa(t.reserve)} نفر رزرو` : ''}${t.times_per_day > 1 ? `، روزی ${fa(t.times_per_day)} بار` : ''}`;
  }
  function renderTypes() {
    const box = $a('#chlTypes');
    const list = adminTypes.map((t, i) => editKey === t.key ? typeForm(t) : `<div class="chl-card${t.visible ? '' : ' chl-off'}"><h3>${esc(t.title)}${t.visible ? '' : ' (پنهان)'}</h3>
<p class="hint" style="margin:0">${esc(typeSummary(t))}${t.kind === 'text' ? `<br>متن: ${esc(textTitle(t.text_key, texts))}` : ''}</p>
<div class="chl-tools"><button type="button" data-tedit="${esc(t.key)}">ویرایش</button><button type="button" class="reg-light" data-tlink="${esc(t.key)}">کپی لینک ثبت‌نام</button><button type="button" class="reg-light chl-arr" data-tup="${i}" ${i ? '' : 'disabled'} aria-label="بالاتر">▲</button><button type="button" class="reg-light chl-arr" data-tdown="${i}" ${i < adminTypes.length - 1 ? '' : 'disabled'} aria-label="پایین‌تر">▼</button></div></div>`);
    if (editKey === '__new') list.push(typeForm(null));
    box.innerHTML = list.join('') || '<p class="hint">هنوز چله‌ای در منو نیست. «افزودن چله تازه» را بزنید.</p>';
    const f = box.querySelector('.chl-tform');
    if (f) { const di = f.querySelector('#ctDate'), v = di.value; JDate(di); di.value = v; syncForm(); f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  function typeForm(t) {
    const v = t || { key: '', title: '', kind: 'text', text_key: texts[0]?.key || 'ashura', description: '', days: 40, capacity: null, start_mode: 'date', next_start: null, start_after_days: 0, times_per_day: 1, auto_next: true, visible: true };
    const opts = texts.map(x => `<option value="${esc(x.key)}"${x.key === v.text_key ? ' selected' : ''}>${esc(x.title)}</option>`).join('');
    const radio = (val, label) => `<label class="adm-opt"><input type="radio" name="ctMode" value="${val}"${v.start_mode === val ? ' checked' : ''}> <span>${label}</span></label>`;
    const next = v.next_start || J.addDays(J.todayIso(), 1);
    return `<div class="chl-card chl-tform"><h3>${t ? 'ویرایش ' + esc(t.title) : 'دوره تازه در منو'}</h3><div class="chl-form">
<div class="full"><label for="ctTitle">نام در منو</label><input id="ctTitle" maxlength="80" value="${esc(v.title)}" placeholder="مثلاً چله زیارت عاشورا"></div>
<div><label for="ctKind">نوع</label><select id="ctKind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}"${k === v.kind ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
<div id="ctTextBox"><label for="ctText">متن</label><select id="ctText">${opts}</select></div>
<div id="ctDaysBox"><label for="ctDays">مدت (روز)</label><input id="ctDays" type="number" min="1" max="1000" inputmode="numeric" value="${v.days}"><div class="chl-chips">${[40, 30, 14, 7].map(n => `<button type="button" data-set="ctDays" data-v="${n}">${fa(n)}</button>`).join('')}</div></div>
<div class="full" id="ctModeBox"><label>شروع</label>
${radio('self', 'همیشه باز: هر کس از روز ثبت‌نام خودش شروع می‌کند')}
${radio('date', 'همه با هم، از تاریخی که تعیین می‌کنید؛ دوره‌های بعد پشت سر هم')}
${radio('fill', 'همه با هم، وقتی تعداد نفرات به عدد مشخصی رسید')}
<div id="ctDateBox"><label for="ctDate">تاریخ شروع دوره بعد</label><input id="ctDate" value="${esc(next)}"></div>
<div id="ctCapBox"><label class="adm-opt" id="ctCapOnRow"><input type="checkbox" id="ctCapOn"${v.capacity ? ' checked' : ''}> <span>محدودیت تعداد نفرات هر دوره</span></label>
<div id="ctCapIn"><label for="ctCap">تعداد نفرات هر دوره</label><input id="ctCap" type="number" min="2" max="1000" inputmode="numeric" value="${v.capacity || 40}"><div class="chl-chips">${[30, 40, 72, 110, 120].map(n => `<button type="button" data-set="ctCap" data-v="${n}">${fa(n)} نفر</button>`).join('')}</div>
<label for="ctRes">فهرست رزرو (نفر)</label><input id="ctRes" type="number" min="0" max="50" inputmode="numeric" value="${v.reserve || 0}"><div class="chl-chips">${[0, 3, 5, 10].map(n => `<button type="button" data-set="ctRes" data-v="${n}">${n ? fa(n) + ' نفر' : 'بدون رزرو'}</button>`).join('')}</div>
<p class="hint" style="margin:2px 0 0">پس از تکمیل ظرفیت، این تعداد نفر دیگر در فهرست رزرو ثبت‌نام می‌کنند؛ هر کس انصراف دهد، نفر اول رزرو خودکار جایش را می‌گیرد.</p></div></div>
<label class="adm-opt" id="ctNextRow"><input type="checkbox" id="ctNext"${v.auto_next ? ' checked' : ''}> <span>دوره بعد خودکار باز شود</span></label>
<div id="ctStartBox"><label for="ctStart">شروع پس از ثبت‌نام یا تکمیل ظرفیت</label><select id="ctStart">${[0, 1, 2, 3, 7].map(n => `<option value="${n}"${n === v.start_after_days ? ' selected' : ''}>${n ? startWord(n) : 'همان روز'}</option>`).join('')}${[0, 1, 2, 3, 7].includes(v.start_after_days) ? '' : `<option value="${v.start_after_days}" selected>${startWord(v.start_after_days)}</option>`}</select></div></div>
<div id="ctTimesBox"><label for="ctTimes">چند بار در روز</label><input id="ctTimes" type="number" min="1" max="100" inputmode="numeric" value="${v.times_per_day}"></div>
<div class="full"><label for="ctDesc">نیت یا توضیح (در صفحه ثبت‌نام دیده می‌شود)</label><textarea id="ctDesc" maxlength="1000" placeholder="مثلاً: به نیت ظهور امام زمان و شفای بیماران">${esc(v.description)}</textarea></div>
<label class="adm-opt full"><input type="checkbox" id="ctVisible"${v.visible ? ' checked' : ''}> <span>در منوی سایت نمایش داده شود</span></label></div>
<p class="hint" id="ctHezbNote">تعداد نفرات، تاریخ شروع و گروه‌های حزب‌خوانی در زبانه «ثبت‌نام» تنظیم می‌شود؛ اینجا فقط نام و توضیحِ منو است.</p>
${t ? '<p class="hint">تغییرها روی دوره‌هایی که هنوز شروع نشده‌اند و ثبت‌نام‌های تازه اعمال می‌شود؛ دوره‌های در جریان همان‌طور ادامه می‌دهند.</p>' : ''}
<div class="chl-tools"><button type="button" data-tsave="${esc(v.key)}">ذخیره</button><button type="button" class="reg-light" data-tcancel>انصراف</button>${t ? `<button type="button" class="reg-danger" data-tdel="${esc(t.key)}">حذف از منو</button>` : ''}</div><div class="adm-msg" id="ctMsg"></div></div>`;
  }
  // نمایش فیلدهای مربوط به نوع و حالت شروع انتخاب‌شده.
  function syncForm() {
    const g = id => $a('#' + id); if (!g('ctKind')) return;
    const kind = g('ctKind').value, mode = document.querySelector('[name=ctMode]:checked')?.value || 'date', hz = kind === 'hezb';
    const show = (id, on) => { const e = g(id); if (e) e.hidden = !on; };
    show('ctTextBox', kind === 'text'); show('ctTimesBox', kind === 'text'); show('ctDaysBox', kind === 'text' || kind === 'juz');
    show('ctModeBox', !hz); show('ctHezbNote', hz);
    show('ctDateBox', mode === 'date'); show('ctCapBox', mode !== 'self'); show('ctCapOnRow', mode === 'date');
    show('ctCapIn', mode === 'fill' || g('ctCapOn').checked); show('ctNextRow', mode !== 'self'); show('ctStartBox', mode !== 'date');
  }
  async function saveType(key) {
    const g = id => $a('#' + id), num = (id, d) => Math.round(+norm(g(id).value) || d);
    const title = g('ctTitle').value.trim(), kind = g('ctKind').value, mode = kind === 'hezb' ? 'fill' : document.querySelector('[name=ctMode]:checked')?.value || 'date';
    const capOn = mode === 'fill' || (mode === 'date' && g('ctCapOn').checked);
    const body = { title, kind, text_key: kind === 'text' ? g('ctText').value : 'quran', days: kind === 'page' ? 604 : kind === 'hezb' ? 120 : num('ctDays', 40),
      start_mode: mode, capacity: kind === 'hezb' ? 120 : capOn ? num('ctCap', 40) : null, next_start: mode === 'date' ? g('ctDate').value || null : null,
      reserve: capOn ? Math.min(50, Math.max(0, Math.round(+norm(g('ctRes').value) || 0))) : 0, start_after_days: +g('ctStart').value, times_per_day: kind === 'text' ? num('ctTimes', 1) : 1, auto_next: mode === 'self' ? true : g('ctNext').checked,
      description: g('ctDesc').value.trim(), visible: g('ctVisible').checked };
    const bad = !title ? 'نام را بنویسید.' : body.days < 1 || body.days > 1000 ? 'مدت باید بین ۱ تا ۱۰۰۰ روز باشد.' : capOn && (body.capacity < 2 || body.capacity > 1000) ? 'تعداد نفرات باید بین ۲ تا ۱۰۰۰ باشد.'
      : body.times_per_day < 1 || body.times_per_day > 100 ? 'تعداد بار در روز باید بین ۱ تا ۱۰۰ باشد.' : mode === 'date' && !body.next_start ? 'تاریخ شروع را انتخاب کنید.' : '';
    if (bad) return msgTo('ctMsg', bad);
    try {
      if (key) await api(`chelleh_types?key=eq.${encodeURIComponent(key)}`, { method: 'PATCH', body, auth: true, prefer: 'return=minimal' });
      else { key = 'c' + Date.now().toString(36); await api('chelleh_types', { method: 'POST', body: { key, sort: (adminTypes.at(-1)?.sort || 0) + 1, ...body }, auth: true, prefer: 'return=minimal' }); }
      await rpc('chl_admin_sync_type', { p_type: key }, true);
      editKey = null; await loadAdmin(); refresh(); ymsg('ذخیره شد و در منوی سایت اعمال شد.', true);
    } catch (e) { msgTo('ctMsg', e.message); }
  }

  // دوره‌ها
  function roundState(r) {
    const count = r.chelleh_members?.[0]?.count ?? 0;
    if (r.status === 'closed') return ['بایگانی', count];
    if (r.personal) return [r.joinable ? 'همیشه باز (شروع هر نفر جداست)' : 'همیشه باز، ثبت‌نام تازه بسته', count];
    if (!r.start_date) return [`در حال ثبت‌نام: ${fa(count)}${r.capacity ? ' از ' + fa(r.capacity) : ''} نفر`, count];
    const n = isoDiff(today || J.todayIso(), r.start_date) + 1;
    return [n < 1 ? `شروع ${dateFa(r.start_date)}` : n > r.days ? 'تمام شده' : `روز ${fa(n)} از ${fa(r.days)}`, count];
  }
  function renderRounds() {
    const box = $a('#chlAdminRounds'), all = $a('#chlShowClosed').checked;
    const list = adminRounds.filter(r => (all || r.status === 'open') && (!roundFilter || (roundFilter === '-' ? !r.type_key : r.type_key === roundFilter)));
    box.innerHTML = list.length ? list.map(roundCard).join('') : '<p class="hint" style="color:#f4ead8">دوره‌ای نیست. اولین ثبت‌نام از منوی سایت، دوره را خودکار می‌سازد.</p>';
    if (openRound && list.some(r => r.id === openRound)) return showMembers(openRound);
  }
  function roundCard(r) {
    const [st, count] = roundState(r), end = r.start_date ? isoAdd(r.start_date, r.days - 1) : null;
    const waiting = !r.personal && !r.start_date && r.status === 'open';
    return `<div class="chl-card${r.status === 'closed' ? ' chl-off' : ''}" id="chlA${r.id}"><h3>${esc(r.title)}${r.personal ? '' : ` · دوره ${fa(r.number)}`}</h3><div class="chl-meta"><span class="chl-tag${waiting ? ' wait' : ''}">${esc(st)}</span></div>
${r.start_date && !r.personal ? `<p class="hint" style="margin:4px 0 0">از ${esc(dateFa(r.start_date))} تا ${esc(dateFa(end))}${r.joinable ? '' : '، ثبت‌نام بسته'}</p>` : ''}
<div class="chl-tools"><button type="button" data-members="${r.id}">شرکت‌کنندگان</button>${waiting && count ? `<button type="button" class="reg-light" data-startnow="${r.id}">شروع از امروز</button>` : ''}${!r.personal && r.status === 'open' ? `<button type="button" class="reg-light" data-joinable="${r.id}">${r.joinable ? 'بستن ثبت‌نام' : 'باز کردن ثبت‌نام'}</button>` : ''}<button type="button" class="reg-light" data-status="${r.id}">${r.status === 'open' ? 'بایگانی' : 'بازگرداندن'}</button><button type="button" class="reg-danger" data-delround="${r.id}">حذف</button></div>
<div id="chlMem${r.id}"></div></div>`;
  }
  async function newRound() {
    const key = $a('#chlNrType').value, start = $a('#chlNrHasStart').checked ? $a('#chlNrStart').value : null;
    if (!key) return amsg('ابتدا در «منوی ثبت‌نام» یک چله بسازید.');
    $a('#chlNrBtn').disabled = true;
    try { await rpc('chl_admin_new_round', { p_type: key, p_start: start }, true); amsg('دوره تازه باز شد.', true); await loadAdmin(); refresh(); }
    catch (e) { amsg(e.message); }
    $a('#chlNrBtn').disabled = false;
  }

  async function showMembers(id) {
    openRound = id;
    const box = $a('#chlMem' + id); if (!box) return;
    const r = adminRounds.find(x => x.id === id), t = today || J.todayIso();
    box.innerHTML = '<p class="hint">در حال دریافت…</p>';
    try {
      const [all, leaves] = await Promise.all([
        api(`chelleh_members?round_id=eq.${id}&select=id,name,code,email,created_at,start_date,slot,reserve,promoted_at,replaced_name,chelleh_marks(day)&order=created_at`, { auth: true }),
        api(`chelleh_leaves?round_id=eq.${id}&select=*&order=left_at.desc`, { auth: true }).catch(() => [])
      ]);
      const list = all.filter(m => !m.reserve).sort((a, b) => (a.slot || 1e9) - (b.slot || 1e9)), res = all.filter(m => m.reserve);
      const mails = [...new Set(list.map(m => m.email).filter(Boolean))];
      const rows = list.map((m, i) => {
        const s = m.start_date || r.start_date, days = new Set(m.chelleh_marks.map(x => x.day));
        const n = s ? Math.min(Math.max(isoDiff(t, s) + 1, 0), r.days) : 0;
        const mini = s && r.kind !== 'page' ? `<span class="chl-mini">${Array.from({ length: r.days }, (_, k) => `<i class="${days.has(isoAdd(s, k)) ? 'd' : ''}"></i>`).join('')}</span>` : '';
        const info = !s ? 'منتظر شروع دوره' : n < 1 ? `شروع ${dateFa(s)}` : r.kind === 'page' ? `${fa(days.size)} صفحه خوانده` : `${fa(days.size)} روز از ${fa(n)}`;
        return `<div><small>${fa(m.slot || i + 1)}</small><span>${esc(m.name)} ${days.has(t) ? '<span class="chl-mark" title="امروز خوانده">✓</span>' : ''}<br><small>${info}، کد ${fa(m.code)}${m.promoted_at ? `، از رزرو به جای ${esc(m.replaced_name || '')}` : ''}</small>${m.email ? `<br><small dir="ltr">${esc(m.email)}</small>` : ''} ${mini}</span><button type="button" class="reg-danger" data-delmem="${m.id}" data-name="${esc(m.name)}">حذف</button></div>`;
      }).join('');
      const doneToday = list.filter(m => m.chelleh_marks.some(x => x.day === t)).length;
      const resRows = res.map((m, i) => `<div><small>ر${fa(i + 1)}</small><span>${esc(m.name)}<br><small>کد ${fa(m.code)}</small>${m.email ? `<br><small dir="ltr">${esc(m.email)}</small>` : ''}</span><button type="button" class="reg-danger" data-delmem="${m.id}" data-name="${esc(m.name)}">حذف</button></div>`).join('');
      const mailTo = (to, name) => `<a class="chl-mailto" style="height:32px;font-size:13px" href="mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(r.title)}&body=${encodeURIComponent(`${name} عزیز، سلام. یکی از شرکت‌کنندگان ${r.title} انصراف داد و جای او به شما رسید. از امروز همراه گروه بخوانید؛ جزئیات در ${siteUrl()} بخش «چله‌های من» است.`)}">ایمیل به او</a>`;
      const leaveRows = leaves.map(l => `<div><span>${esc(l.name)}${l.was_reserve ? ' (از رزرو)' : l.slot ? ` (جایگاه ${fa(l.slot)})` : ''}<br><small>${l.by_admin ? 'حذف به دست مدیر' : 'انصراف'}، ${esc(dateFa(String(l.left_at).slice(0, 10)))}${l.replaced_by_name ? `؛ جایگزین: <b>${esc(l.replaced_by_name)}</b>` : l.was_reserve ? '' : '؛ رزروی نبود که جایش را بگیرد'}</small></span>${l.replaced_by_email ? mailTo(l.replaced_by_email, l.replaced_by_name) : ''}</div>`).join('');
      box.innerHTML = `<p style="margin:10px 0 0"><b>${fa(list.length)} نفر${r.capacity ? ` از ${fa(r.capacity)}` : ''}؛ امروز ${fa(doneToday)} نفر خوانده‌اند.</b></p>
<div class="chl-members">${rows || '<p class="hint" style="padding:6px 8px">هنوز کسی ثبت‌نام نکرده است.</p>'}</div>
${r.reserve || res.length ? `<p style="margin:10px 0 0"><b>فهرست رزرو: ${fa(res.length)} از ${fa(r.reserve)} نفر</b></p><div class="chl-members">${resRows || '<p class="hint" style="padding:6px 8px">هنوز کسی در فهرست رزرو نیست.</p>'}</div>` : ''}
${leaves.length ? `<details style="margin-top:10px"${leaves.some(l => Date.now() - Date.parse(l.left_at) < 3 * 864e5) ? ' open' : ''}><summary><b>انصراف‌ها (${fa(leaves.length)})</b></summary><div class="chl-members">${leaveRows}</div><p class="hint" style="margin:4px 0 0">جایگزین دفعه بعد که سایت را باز کند پیام «به گروه اصلی آمدید» را می‌بیند. اگر ایمیل داده باشد، با «ایمیل به او» خبرش کنید.</p></details>` : ''}
${r.status === 'open' ? `<div class="row" style="margin-top:8px"><input id="chlAdd${id}" maxlength="60" placeholder="افزودن نام (مثلاً کسی که در پیام‌رسان اعلام کرده)"><button type="button" data-addmem="${id}">افزودن</button></div>` : ''}
<div class="chl-tools"><button type="button" class="reg-light" data-copy="${id}">کپی گزارش امروز برای گروه</button></div>
<label for="chlNews${id}" style="margin-top:12px">خبر دوره</label><p class="hint" style="margin:0">روی کارت همه شرکت‌کنندگان این دوره در سایت دیده می‌شود (مثلاً «چله از شنبه شروع می‌شود»). برای پاک کردن، خالی ذخیره کنید.</p>
<textarea id="chlNews${id}" maxlength="1000" style="min-height:70px">${esc(r.news || '')}</textarea>
<div class="chl-tools"><button type="button" data-news="${id}">ذخیره خبر</button>${mails.length ? `<a class="reg-light chl-mailto" href="mailto:?bcc=${encodeURIComponent(mails.join(','))}&subject=${encodeURIComponent(r.title)}&body=${encodeURIComponent(r.news || '')}">ایمیل به ${fa(mails.length)} نفر</a><button type="button" class="reg-light" data-mails="${id}">کپی ایمیل‌ها</button>` : ''}</div>
<p class="hint" style="margin:4px 0 0">${mails.length ? `${fa(mails.length)} نفر ایمیل داده‌اند؛ «ایمیل به همه» برنامه ایمیل شما را با نشانی‌ها (مخفی از هم) و متن خبر باز می‌کند.` : 'هنوز کسی در این دوره ایمیل نداده است.'}</p><div class="adm-msg" id="chlMemMsg${id}"></div>`;
      box._mails = mails;
      box._list = list;
    } catch (e) { box.innerHTML = `<p class="adm-bad">${esc(e.message)}</p>`; }
  }
  function reportText(r, list) {
    const t = today || J.todayIso(), done = list.filter(m => m.chelleh_marks.some(x => x.day === t)), left = list.filter(m => !done.includes(m));
    const n = r.start_date ? isoDiff(t, r.start_date) + 1 : 0;
    const head = r.personal || !r.start_date ? `${r.title}\n${J.label(t)}` : `${r.title}، دوره ${fa(r.number)}\n${J.label(t)}، ${n < 1 ? `شروع از ${dateFa(r.start_date)}` : `روز ${fa(Math.min(n, r.days))} از ${fa(r.days)}`}`;
    // جزءخوانی: جزء امروز هر نفر کنار نامش (نفر k در روز n جزء k+n-1).
    const who = m => r.kind === 'juz' && n >= 1 ? `• ${m.name} (جزء ${fa(((m.slot || list.indexOf(m) + 1) - 1 + (n - 1)) % 30 + 1)})` : '• ' + m.name;
    return `${head}\n\n✅ خوانده‌اند (${fa(done.length)} نفر):\n${done.map(who).join('\n') || '—'}\n\n⏳ هنوز ثبت نکرده‌اند (${fa(left.length)} نفر):\n${left.map(who).join('\n') || '—'}\n\nثبت روزانه: ${siteUrl()}`;
  }
  async function copy(text, msgId) {
    try { await navigator.clipboard.writeText(text); msgTo(msgId, 'کپی شد؛ در گروه بفرستید.', true); }
    catch { prompt('این متن را کپی کنید:', text); }
  }

  async function onAdminClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    try {
      if (d.set) { $a('#' + d.set).value = d.v; return; }
      if (d.tedit) { editKey = d.tedit; renderTypes(); return; }
      if (b.hasAttribute('data-tcancel')) { editKey = null; renderTypes(); return; }
      if (d.tsave !== undefined) return saveType(d.tsave || null);
      if (d.tlink) {
        const t = adminTypes.find(x => x.key === d.tlink);
        return copy(`برای ثبت‌نام در ${t.title} این لینک را باز کنید:\n${regLink(t.key)}`, 'chlTypeMsg');
      }
      if (d.tup || d.tdown) {
        const i = +(d.tup ?? d.tdown), j = d.tup ? i - 1 : i + 1, a = adminTypes[i], c = adminTypes[j];
        const sa = a.sort ?? i, sc = c.sort ?? j, [na, nc] = sa === sc ? [j, i] : [sc, sa];
        await Promise.all([[a, na], [c, nc]].map(([t, s]) => api(`chelleh_types?key=eq.${encodeURIComponent(t.key)}`, { method: 'PATCH', body: { sort: s }, auth: true, prefer: 'return=minimal' })));
        await loadAdmin(); refresh(); return;
      }
      if (d.tdel) {
        const t = adminTypes.find(x => x.key === d.tdel);
        if (!confirm(`«${t.title}» از منو حذف شود؟ دوره‌ها و شرکت‌کنندگانش می‌مانند و در فهرست دوره‌ها دیده می‌شوند. (برای پنهان کردن موقت، تیک «نمایش در منو» را بردارید.)`)) return;
        await api(`chelleh_types?key=eq.${encodeURIComponent(t.key)}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
        editKey = null; await loadAdmin(); refresh(); return;
      }
      const r = adminRounds.find(x => x.id === +(d.members || d.startnow || d.joinable || d.status || d.delround || d.addmem || d.copy || d.news || d.mails));
      if (d.news) { const v = $a('#chlNews' + r.id).value.trim(); await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'PATCH', body: { news: v }, auth: true, prefer: 'return=minimal' }); await loadAdmin(); msgTo('chlMemMsg' + r.id, v ? 'خبر ذخیره شد و روی کارت شرکت‌کنندگان دیده می‌شود.' : 'خبر پاک شد.', true); return; }
      if (d.mails) return copy(($a('#chlMem' + r.id)._mails || []).join(', '), 'chlMemMsg' + r.id);
      if (d.members) { const box = $a('#chlMem' + r.id); if (openRound === r.id && box.innerHTML) { openRound = null; box.innerHTML = ''; } else showMembers(r.id); return; }
      if (d.startnow) {
        if (!confirm(`«${r.title}، دوره ${fa(r.number)}» از امروز شروع شود؟ ثبت‌نام این دوره بسته می‌شود.`)) return;
        await rpc('chl_admin_start', { p_round: r.id }, true); await loadAdmin(); refresh(); return;
      }
      if (d.joinable) { await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'PATCH', body: { joinable: !r.joinable }, auth: true, prefer: 'return=minimal' }); await loadAdmin(); refresh(); return; }
      if (d.status) { await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'PATCH', body: { status: r.status === 'open' ? 'closed' : 'open' }, auth: true, prefer: 'return=minimal' }); await loadAdmin(); refresh(); return; }
      if (d.delround) {
        if (!confirm(`«${r.title}${r.personal ? '' : '، دوره ' + fa(r.number)}» با همه شرکت‌کنندگان و روزهای ثبت‌شده‌اش حذف شود؟ این کار برگشت‌پذیر نیست. (برای پنهان کردن، «بایگانی» را بزنید.)`)) return;
        await api(`chelleh_rounds?id=eq.${r.id}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' }); if (openRound === r.id) openRound = null; await loadAdmin(); refresh(); return;
      }
      if (d.addmem) {
        const input = $a('#chlAdd' + r.id), name = input.value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) return msgTo('chlMemMsg' + r.id, 'نام را بنویسید.');
        await rpc('chl_admin_add', { p_round: r.id, p_name: name }, true);
        input.value = ''; await loadAdmin(); msgTo('chlMemMsg' + r.id, `«${name}» اضافه شد.`, true); return;
      }
      if (d.delmem) {
        if (!confirm(`«${d.name}» از چله حذف شود؟ اگر فهرست رزرو کسی دارد، نفر اول آن جایش را می‌گیرد.`)) return;
        await rpc('chl_admin_remove', { p_member: +d.delmem }, true); await loadAdmin(); return;
      }
      if (d.copy) return copy(reportText(r, $a('#chlMem' + r.id)._list || []), 'chlMemMsg' + r.id);
    } catch (err) {
      const id = d.addmem || d.copy || d.news || d.mails ? 'chlMemMsg' + (d.addmem || d.copy || d.news || d.mails) : d.tup || d.tdown || d.tdel ? 'chlTypeMsg' : 'chlAdminMsg';
      msgTo(id, err.message);
    }
  }
  document.addEventListener('change', e => {
    if (!pane || !['ctMode', 'ctKind', 'ctCapOn'].includes(e.target.name || e.target.id)) return;
    if (e.target.id === 'ctKind') {
      // پیش‌فرض هر نوع: جزءخوانی ۳۰ روز و ۳۰ نفر؛ روزی یک صفحه همیشه باز.
      const k = e.target.value, setMode = m => { const r = document.querySelector(`[name=ctMode][value=${m}]`); if (r) r.checked = true; };
      if (k === 'juz') { $a('#ctDays').value = 30; $a('#ctCap').value = 30; $a('#ctRes').value = 5; setMode('fill'); }
      if (k === 'page') setMode('self');
      if (k === 'text') { $a('#ctDays').value = 40; }
    }
    syncForm();
  });

  // ویرایش متن
  let editing = null;
  async function editText(key) {
    $a('#chlTextForm').hidden = false; tmsg('');
    if (!key) {
      editing = { key: 'custom-' + Date.now().toString(36), builtin: false };
      $a('#chlTextTitle').value = ''; $a('#chlTextAbout').value = ''; $a('#chlTextBody').value = ''; $a('#chlTextAudio').value = '';
      $a('#chlTextReset').hidden = true; $a('#chlTextTitle').focus(); return;
    }
    const info = texts.find(t => t.key === key) || { key };
    if (info.quran) { $a('#chlTextForm').hidden = true; editing = null; return tmsg('متن این سوره از مصحف خود سایت خوانده می‌شود (با ترجمه‌های مختلف و صوت قاری‌ها)؛ ویرایش لازم نیست.', true); }
    delete textCache[key];
    try {
      const t = await getText(key);
      editing = { key, builtin: !!info.builtin };
      $a('#chlTextTitle').value = t.title || ''; $a('#chlTextAbout').value = t.about || ''; $a('#chlTextBody').value = toBlocks(t.sections || []);
      $a('#chlTextAudio').value = (t.audio || []).map(a => `${a.name} | ${a.url}`).join('\n');
      $a('#chlTextReset').hidden = !info.edited;
      tmsg(info.edited ? 'این متن در پایگاه داده ویرایش شده است.' : (info.builtin ? 'متن آماده سایت؛ با ذخیره، نسخه ویرایش‌شده جایگزین آن می‌شود.' : ''), true);
    } catch (e) { tmsg(e.message); }
  }
  function formText() {
    const audio = $a('#chlTextAudio').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(([n, u]) => n && /^https:\/\/\S+$/.test(u || '')).map(([name, url]) => ({ name, url }));
    return { title: $a('#chlTextTitle').value.trim(), about: $a('#chlTextAbout').value.trim(), sections: fromBlocks($a('#chlTextBody').value), audio };
  }
  async function saveText() {
    if (!editing) return;
    const t = formText();
    if (!t.title) return tmsg('عنوان متن را بنویسید.');
    if (!t.sections.length) return tmsg('متن خالی است.');
    try {
      await api('chelleh_texts', { method: 'POST', body: { key: editing.key, ...t, updated_at: new Date().toISOString() }, auth: true, prefer: 'resolution=merge-duplicates,return=minimal' });
      delete textCache[editing.key]; await loadAdmin(); $a('#chlTextPick').value = editing.key;
      $a('#chlTextReset').hidden = !editing.builtin;
      tmsg(`ذخیره شد (${fa(t.sections.length)} بند).`, true);
    } catch (e) { tmsg(e.message); }
  }
  async function resetText() {
    if (!editing?.builtin || !confirm('ویرایش‌ها پاک شود و متن آماده سایت برگردد؟')) return;
    try {
      await api(`chelleh_texts?key=eq.${encodeURIComponent(editing.key)}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
      delete textCache[editing.key]; await loadAdmin(); await editText(editing.key); tmsg('متن اصلی برگشت.', true);
    } catch (e) { tmsg(e.message); }
  }

  // ---------- راه‌اندازی ----------
  document.addEventListener('admin:tab', e => { if (e.detail === 'chl') loadAdmin(); });
  window.addEventListener('hashchange', () => renderPanel());
  refresh().then(() => {
    // لینک مستقیم ثبت‌نام: ?chelleh=<کلید>
    // پیوند اعلان‌های چله (?mine=1): رفتن به «چله‌های من».
    if (new URLSearchParams(location.search).has('mine')) {
      try { const u = new URL(location.href); u.searchParams.delete('mine'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
      if (!panel.hidden) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
    const key = new URLSearchParams(location.search).get('chelleh');
    if (key) {
      // پارامتر از نشانی برداشته می‌شود تا با تازه‌سازی صفحه، صفحه ثبت‌نام دوباره باز نشود.
      try { const u = new URL(location.href); u.searchParams.delete('chelleh'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
      openSheet(key);
    }
    if (document.getElementById('pane-chl') && !document.getElementById('pane-chl').hidden) loadAdmin();
  });
  // روز چله با اذان صبح عوض می‌شود؛ وقتی کاربر به صفحه برمی‌گردد، وضعیت تازه می‌شود.
  let lastShow = Date.now();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastShow > 5 * 60000) refresh(); if (document.visibilityState === 'hidden') lastShow = Date.now(); });
})();
