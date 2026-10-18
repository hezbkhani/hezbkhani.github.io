// کتابخانه ادعیه و زیارات (مفاتیح): یک گزینه در دسته «ادعیه» منو که برگه‌ای با دسته‌ها، جستجوی عنوان، «اخیراً خوانده‌شده» و نشان‌شده‌ها باز می‌کند.
// متن هر دعا همان chelleh/<key>.json است و با window.chlRead(key) در خواننده چله‌ها (chelleh.js) باز می‌شود؛ این متن‌ها در chelleh/index.json نیستند تا در ثبت‌نام چله نیایند.
// فقط وقتی features.shown('mafatih') روشن است دیده می‌شود (ibadat.js گزینه منو را از mafatih.menuItem() می‌گیرد). منبع و ویرایش‌های متن‌ها: chelleh/MAFATIH-SOURCES.md
(function () {
  const ID = 'mafatih', RK = 'mfRecent', SK = 'mfStar', TK = 'mfTab';
  // [شناسه دسته, عنوان, عنوان کوتاه زبانه, [[key, عنوان, توضیح کوتاه], …]]
  const CATS = [
    ['doa', 'ادعیه مشهور', 'ادعیه', [
      ['kumayl', 'دعای کمیل', 'شب‌های جمعه'],
      ['nodbeh', 'دعای ندبه', 'صبح جمعه و عیدها'],
      ['samat', 'دعای سمات', 'عصر جمعه'],
      ['tavassul', 'دعای توسل', 'شب‌های چهارشنبه'],
      ['faraj', 'دعای فرج', 'الهی عظم البلاء'],
      ['ahd', 'دعای عهد', 'چهل صبح'],
      ['mashlool', 'دعای مشلول', ''],
      ['mujir', 'دعای مجیر', 'ایام البیض ماه رمضان'],
      ['abuhamza', 'دعای ابوحمزه ثمالی', 'سحرهای ماه رمضان'],
      ['kisa', 'حدیث شریف کسا', '']
    ]],
    ['ziyarat', 'زیارات', 'زیارات', [
      ['ashura', 'زیارت عاشورا', 'امام حسین (ع)'],
      ['warith', 'زیارت وارث', 'امام حسین (ع)'],
      ['aminallah', 'زیارت امین‌الله', 'امیرالمؤمنین (ع) و همه ائمه'],
      ['alyasin', 'زیارت آل یاسین', 'امام زمان (عج)']
    ]],
    ['week', 'دعای روزهای هفته', 'روزهای هفته', [
      ['week_sat', 'دعای روز شنبه', ''], ['week_sun', 'دعای روز یکشنبه', ''], ['week_mon', 'دعای روز دوشنبه', ''],
      ['week_tue', 'دعای روز سه‌شنبه', ''], ['week_wed', 'دعای روز چهارشنبه', ''], ['week_thu', 'دعای روز پنجشنبه', ''],
      ['week_fri', 'دعای روز جمعه', '']
    ]],
    ['zekr', 'تعقیبات و اذکار', 'اذکار', [
      ['tasbih_zahra', 'تسبیحات حضرت زهرا (س)', 'پس از هر نماز']
    ]]
  ];
  const ALL = CATS.flatMap(c => c[3]);
  const byKey = Object.fromEntries(ALL.map(x => [x[0], x]));
  const WEEK = ['week_sun', 'week_mon', 'week_tue', 'week_wed', 'week_thu', 'week_fri', 'week_sat'];
  const todayWeek = () => { try { const d = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', weekday: 'short' }).format(new Date()); return WEEK[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(d)]; } catch { return WEEK[new Date().getDay()]; } };

  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const recent = () => read(RK, []).filter(k => byKey[k]).slice(0, 3);
  const stars = () => read(SK, []).filter(k => byKey[k]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // جستجو بی‌اعتنا به ی/ي، ک/ك، نیم‌فاصله و فاصله
  const norm = s => String(s).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[أإآ]/g, 'ا').replace(/[ً-ْ‌\s()]/g, '');
  const shown = () => !!window.features?.shown(ID);

  const css = `
.mf-shade{position:fixed;inset:0;z-index:60;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.mf-box{width:100%;max-width:560px;height:88vh;max-height:88vh;display:flex;flex-direction:column;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;box-shadow:0 -10px 40px #0007;animation:ibup .25s ease}
.mf-top{padding:12px 16px 8px;border-bottom:1px solid var(--line)}
.mf-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.mf-top h2{margin:2px 0 0;font:normal 30px/1.5 SiteFont,Tahoma,serif;color:var(--deep);text-align:center}
.mf-top p{margin:0 0 8px;text-align:center;color:var(--muted);font-size:14px}
.mf-q{display:block;width:100%;height:44px;font-size:16px;padding:0 12px;border-radius:var(--r-card);background:#fff}
.mf-tabs{display:flex;gap:6px;overflow-x:auto;padding:8px 0 2px;scrollbar-width:none}.mf-tabs::-webkit-scrollbar{display:none}
.mf-tabs button{flex:none;height:40px;padding:0 14px;font-size:15px;font-weight:500;border-radius:999px;background:#fff;color:var(--deep)}
.mf-tabs button[aria-selected="true"]{background:var(--emerald);color:#fff}
.mf-body{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:4px 16px calc(18px + env(safe-area-inset-bottom))}
.mf-h{margin:12px 0 2px;font-size:14px;font-weight:700;color:var(--muted)}
.mf-row{display:flex;align-items:center;border-bottom:1px solid var(--line)}
.mf-row:last-child{border-bottom:0}
.mf-open{flex:1;min-width:0;display:flex;align-items:center;gap:10px;height:auto;min-height:52px;padding:6px 2px;background:transparent;border:0;border-radius:0;color:var(--ink);text-align:right;font-weight:500;font-size:16px;white-space:normal;line-height:1.6}
.mf-open:hover,.mf-open:focus-visible{background:var(--hover)}
.mf-open span{flex:1;min-width:0}
.mf-open small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.mf-open i{flex:none;font-style:normal;font-size:12px;padding:1px 8px;border-radius:999px;background:var(--cream);color:var(--deep);border:1px solid var(--gold)}
.mf-star{flex:none;width:44px;height:44px;padding:0;background:transparent;border:0;color:#b9ab92;font-size:22px}
.mf-star[aria-pressed="true"]{color:var(--gold)}
.mf-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.mf-chips button{height:auto;min-height:40px;padding:4px 12px;font-size:15px;font-weight:500;border-radius:999px;background:var(--mint);color:var(--deep);white-space:normal}
.mf-empty{text-align:center;color:var(--muted);padding:20px 0}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let shade = null, q = '', tab = read(TK, 'doa');
  if (!CATS.some(c => c[0] === tab)) tab = 'doa';

  function row(x) {
    const [k, t, s] = x, on = stars().includes(k), today = k === todayWeek();
    return `<div class="mf-row"><button type="button" class="mf-open" data-mf="${k}"><span>${esc(t)}${s ? `<small>${esc(s)}</small>` : ''}</span>${today ? '<i>امروز</i>' : ''}</button><button type="button" class="mf-star" data-mf-star="${k}" aria-pressed="${on}" aria-label="${on ? 'برداشتن نشان' : 'نشان گذاشتن'}: ${esc(t)}">${on ? '★' : '☆'}</button></div>`;
  }
  function renderBody() {
    const body = shade.querySelector('.mf-body');
    shade.querySelectorAll('.mf-tabs button').forEach(b => b.setAttribute('aria-selected', !q && b.dataset.mfTab === tab));
    if (q) {
      const n = norm(q), list = ALL.filter(x => norm(x[1] + x[2]).includes(n));
      body.innerHTML = list.length ? list.map(row).join('') : '<p class="mf-empty">چیزی با این عنوان پیدا نشد.</p>';
      return;
    }
    let h = '';
    const r = recent(), s = stars();
    if (r.length) h += `<h3 class="mf-h">اخیراً خوانده‌شده</h3><div class="mf-chips">${r.map(k => `<button type="button" data-mf="${k}">${esc(byKey[k][1])}</button>`).join('')}</div>`;
    if (s.length) h += `<h3 class="mf-h">نشان‌شده‌ها ★</h3>${s.map(k => row(byKey[k])).join('')}`;
    const c = CATS.find(x => x[0] === tab);
    h += `<h3 class="mf-h">${esc(c[1])}</h3>${c[3].map(row).join('')}`;
    body.innerHTML = h;
  }
  function open() {
    if (!shown()) return;
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'mf-shade';
      shade.innerHTML = `<div class="mf-box" role="dialog" aria-modal="true" aria-label="مفاتیح: ادعیه و زیارات"><div class="mf-top"><button type="button" class="mf-x" aria-label="بستن">✕</button><h2>ادعیه و زیارات</h2><p>از مفاتیح‌الجنان، با ترجمه فارسی</p><input type="search" class="mf-q" placeholder="جستجوی نام دعا یا زیارت…" aria-label="جستجوی نام دعا یا زیارت"><div class="mf-tabs" role="tablist">${CATS.map(c => `<button type="button" role="tab" data-mf-tab="${c[0]}">${esc(c[2])}</button>`).join('')}</div></div><div class="mf-body"></div></div>`;
      shade.addEventListener('click', onClick);
      shade.querySelector('.mf-q').addEventListener('input', e => { q = e.target.value.trim(); renderBody(); });
    }
    q = ''; shade.querySelector('.mf-q').value = '';
    renderBody();
    shade.querySelector('.mf-body').scrollTop = 0;
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    try { if (!history.state?.mf) history.pushState({ mf: 1 }, ''); } catch {}
    setTimeout(() => shade.querySelector('.mf-x')?.focus(), 50);
  }
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    shade.remove(); document.body.classList.remove('ib-lock');
    if (!fromHistory) { try { if (history.state?.mf) history.back(); } catch {} }
  }
  function onClick(e) {
    if (e.target === shade || e.target.closest('.mf-x')) return close();
    const t = e.target.closest('[data-mf-tab]');
    if (t) { tab = t.dataset.mfTab; write(TK, tab); q = ''; shade.querySelector('.mf-q').value = ''; renderBody(); shade.querySelector('.mf-body').scrollTop = 0; return; }
    const s = e.target.closest('[data-mf-star]');
    if (s) {
      const k = s.dataset.mfStar, l = stars();
      write(SK, l.includes(k) ? l.filter(x => x !== k) : [k, ...l]);
      const top = shade.querySelector('.mf-body').scrollTop; renderBody(); shade.querySelector('.mf-body').scrollTop = top;
      return;
    }
    const o = e.target.closest('[data-mf]');
    if (o) {
      const k = o.dataset.mf;
      write(RK, [k, ...read(RK, []).filter(x => x !== k)].slice(0, 3));
      if (!window.chlRead) return;
      // برگه بسته می‌شود و خواننده جای آن در تاریخچه می‌نشیند (دکمه برگشت خواننده را می‌بندد).
      close(true); try { if (history.state?.mf) history.replaceState(null, ''); } catch {}
      window.chlRead(k);
    }
  }
  window.addEventListener('popstate', () => { if (!history.state?.mf) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.addEventListener('features:changed', () => { if (!shown()) close(); window.siteMenu?.refresh(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-mf-menu]')) { window.siteMenu?.close(); setTimeout(open, 280); } });

  window.mafatih = {
    open,
    // گزینه منو برای دسته «ادعیه» (ibadat.js)؛ وقتی امکان خاموش است چیزی برنمی‌گرداند.
    menuItem() {
      if (!shown()) return '';
      return `<button type="button" class="sm-item" data-mf-menu><span class="sm-ic">📚</span><span>مفاتیح: همه ادعیه و زیارات<small>${ALL.length.toLocaleString('fa-IR')} دعا و زیارت، با ترجمه فارسی</small></span><span class="sm-go">‹</span></button>`;
    }
  };
})();
