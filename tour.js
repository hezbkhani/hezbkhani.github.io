// راهنمای قدم‌به‌قدم سایت: چند کادر کوچک که هر بار یک بخش صفحه یا منو را روشن نشان می‌دهند و کار آن را می‌گویند.
// بار اول خودش یک بار باز می‌شود (روی هر گوشی؛ localStorage، کلید tourSeen) و هر وقت خواستید: منوی ☰ › تنظیمات › راهنمای سایت.
// امکان tour در features.js است: مدیر می‌تواند برای همه خاموشش کند و هر کس در «نمایش امکانات» برای خودش پنهانش کند.
// قدم‌هایی که بخششان برای این بازدیدکننده نیست (مثلاً کارت امروز خاموش است) خودبه‌خود رد می‌شوند.
// استفاده: window.tour.start()
(function () {
  const SEEN = 'tourSeen';
  const fa = n => n.toLocaleString('fa-IR');
  const reduce = () => document.documentElement.getAttribute('data-motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = () => !window.features || window.features.shown('tour');

  document.head.insertAdjacentHTML('beforeend', `<style>
.tr-shade{position:fixed;inset:0;z-index:1000;background:transparent}
.tr-shade.tr-dim{background:#0009}
.tr-spot{position:fixed;z-index:1001;pointer-events:none;border-radius:12px;box-shadow:0 0 0 2px var(--t-gold,var(--gold)),0 0 0 200vmax #0009}
.tr-card{position:fixed;z-index:1002;width:min(340px,calc(100vw - 24px));padding:14px 16px 12px;background:var(--t-paper,var(--paper));color:var(--t-ink,var(--ink));text-shadow:none;border:1px solid var(--t-gold,var(--gold));border-radius:var(--r-card);box-shadow:0 10px 30px #0006;font-size:16px;line-height:1.8}
.tr-anim .tr-spot,.tr-anim .tr-card{transition:top .25s ease,left .25s ease,width .25s ease,height .25s ease}
.tr-card:focus{outline:none}
.tr-step{display:block;color:var(--t-ink2,var(--muted));font-size:13px}
.tr-card h3{margin:0 0 4px;color:var(--t-head,var(--deep));font-size:18px;line-height:1.6}
.tr-card p{margin:0}
.tr-btns{display:flex;align-items:center;gap:8px;margin-top:12px}
.tr-btns button{height:auto;min-height:42px;padding:0 16px;font-size:15px}
.tr-btns .tr-next{background:var(--deep)!important;color:#fff!important;border-color:var(--t-gold,var(--gold))}
.tr-btns .tr-back{background:transparent!important;color:var(--t-head,var(--deep))!important;border-color:var(--t-line,var(--line))}
.tr-btns .tr-skip{margin-inline-start:auto;padding:0 6px;background:transparent!important;color:var(--t-ink2,var(--muted))!important;border:0;font-weight:500;text-decoration:underline}
.tr-arrow{position:absolute;width:14px;height:14px;background:inherit;border:1px solid var(--t-gold,var(--gold));transform:rotate(45deg)}
.tr-arrow.up{top:-8px;border-right:0;border-bottom:0}
.tr-arrow.down{bottom:-8px;border-left:0;border-top:0}
</style>`);

  const vis = el => el && el.isConnected && !el.closest('[hidden],.hx-off,.hz-off') && el.getClientRects().length > 0;
  const first = sels => { for (const s of sels) { const el = document.querySelector(s); if (vis(el)) return el; } return null; };
  const menuBody = () => document.querySelector('.sm .sm-body');
  const menuOpen = () => !!document.querySelector('.sm.show');
  // گزینه‌ای از منو: اگر در دسته‌ای جمع‌شده است، دسته فقط برای همین قدم باز می‌شود (حالت ذخیره‌شده دسته دست نمی‌خورد).
  const opened = [];
  function unfold(el) {
    const box = el && el.closest('.sm-grp-body');
    if (box && box.hidden) { box.hidden = false; box.previousElementSibling?.setAttribute('aria-expanded', 'true'); opened.push(box); }
    return el;
  }
  function refold() {
    opened.splice(0).forEach(box => { if (!box.isConnected) return; box.hidden = true; box.previousElementSibling?.setAttribute('aria-expanded', 'false'); });
  }
  const inMenu = sel => menuBody()?.querySelector(sel);
  const grpOf = sel => { const el = inMenu(sel); if (!el) return null; const b = el.closest('.sm-grp-body'); return b ? b.previousElementSibling : el.closest('.sm-sec'); };

  // هر قدم: el() بخش روشن (بدون el کادر وسط صفحه است)، menu: داخل منوی ☰. has() برای شمردن قدم‌ها پیش از باز شدن منو.
  const STEPS = [
    { t: 'به نوران خوش آمدید', d: 'در چند قدم کوتاه بخش‌های اصلی سایت را نشانتان می‌دهیم. هر وقت خواستید می‌توانید رد شوید.', next: 'شروع', skip: 'بعداً' },
    { el: () => first(['#introPanel .intro-head', '#introPanel .brand']), t: 'صفحه اول', d: 'معرفی کوتاه نوران اینجاست. پس از ثبت‌نام، دوره‌ها و چله‌هایی که در آن‌ها عضو شده‌اید هم همین‌جا در صفحه اول می‌آیند.' },
    { el: () => first(['#dlCard']), t: 'امروز', d: 'تاریخ امروز، زمان مانده تا اذان بعدی، و مناسبت و اعمال امروز. با زدن روی ساعت اذان، اوقات شرعی کامل باز می‌شود. با ✕ گوشه هر کادر هم می‌توانید آن را پنهان کنید.' },
    { el: () => { const t = first(['#result .task']); return t ? t.closest('#result') : null; }, t: 'سهم امروز شما', d: 'حزبی که امروز باید بخوانید همین‌جاست. با «خواندن متن قرآن این سهم» متن و صوت آن باز می‌شود و پس از قرائت، گزارشش را در پایین صفحه ثبت کنید.' },
    { el: () => first(['#chellehPanel']), t: 'چله‌ها و دوره‌های من', d: 'برنامه امروز هر چله و دوره‌ای که در آن ثبت‌نام کرده‌اید، با متن آن و دکمه «خواندم» برای ثبت هر روز.' },
    { el: () => !first(['#result .task', '#chellehPanel']) && first(['#introMenu']), t: 'دوره‌ها و ثبت‌نام', d: 'با این دکمه فهرست دوره‌های قرآن و چله‌ها باز می‌شود. پس از ثبت‌نام، سهم هر روز شما در صفحه اول نشان داده می‌شود.' },
    { el: () => first(['.sm-btn']), top: true, t: 'منوی ☰', d: 'همه بخش‌های سایت اینجاست: ثبت‌نام، قرآن، ادعیه، ذکرشمار، تقویم و تنظیمات. بیایید نگاهی به داخلش بیندازیم.' },
    { menu: true, el: () => first(['.sm [data-sm-search]']), t: 'جستجو', d: 'آیه، دعا، دوره یا هر تنظیمی را از اینجا جستجو کنید.' },
    { menu: true, has: () => inMenu('[data-chl-type]'), el: () => grpOf('[data-chl-type]'), t: 'دوره‌های قرآن و چله‌ها', d: 'ثبت‌نام در حزب‌خوانی، جزءخوانی، روزی یک صفحه، و چله‌های زیارت عاشورا، حدیث کسا و متن‌های دیگر. هر دسته با زدن روی آن باز می‌شود.' },
    { menu: true, has: () => inMenu('[data-qf-open]'), el: () => unfold(inMenu('[data-qf-open]')), t: 'قرآن‌خوان', d: 'هر سوره، صفحه یا آیه را با ترجمه، تفسیر و صوت قاریان بخوانید. اندازه متن، ترجمه و قاری از دکمه ⚙ خود قرآن‌خوان تنظیم می‌شود.' },
    { menu: true, has: () => inMenu('[data-mf-open]'), el: () => unfold(inMenu('[data-mf-open]')), t: 'ادعیه و مفاتیح‌الجنان', d: 'مفاتیح‌الجنان کامل و دعاهای پرکاربرد مثل کمیل، توسل، ندبه و زیارت عاشورا، با متن عربی، ترجمه و صوت.' },
    { menu: true, has: () => inMenu('[data-tour-menu]'), el: () => { const el = unfold(inMenu('[data-tour-menu]')); return el && (el.closest('.sm-grp-body') || el.closest('.sm-sec')); }, t: 'تنظیمات', d: 'اعلان‌ها و یادآوری‌ها، اندازه متن و حالت تاریک، و پنهان کردن بخش‌هایی که لازم ندارید. این راهنما را هم هر وقت خواستید از همین‌جا دوباره ببینید.' }
  ];

  let steps = [], i = 0, ui = null, raf = 0, last = '', ownMenu = false;
  const cur = () => steps[i];

  function build() {
    ui = document.createElement('div'); ui.className = 'tr-root' + (reduce() ? '' : ' tr-anim');
    ui.innerHTML = '<div class="tr-shade"></div><div class="tr-spot" hidden></div><div class="tr-card" role="dialog" aria-modal="true" aria-labelledby="trTitle" aria-describedby="trText" tabindex="-1"><span class="tr-arrow" hidden></span><span class="tr-step"></span><h3 id="trTitle"></h3><p id="trText"></p><div class="tr-btns"><button type="button" class="tr-next"></button><button type="button" class="tr-back">قبلی</button><button type="button" class="tr-skip"></button></div></div>';
    ui.querySelector('.tr-next').onclick = () => go(1);
    ui.querySelector('.tr-back').onclick = () => go(-1);
    ui.querySelector('.tr-skip').onclick = () => end();
    document.body.appendChild(ui);
  }

  // قدم بعدی یا قبلی که بخشش الان هست؛ منو فقط برای قدم‌های منو باز است.
  function go(dir) {
    refold();
    for (let n = i + dir; n >= 0 && n < steps.length; n += dir) {
      const s = steps[n];
      if (s.menu && !menuOpen()) { ownMenu = true; window.siteMenu?.open(); }
      if (!s.menu && menuOpen() && ownMenu) { ownMenu = false; window.siteMenu?.close(); }
      if (!s.el || s.el()) { i = n; return show(); }
    }
    if (dir > 0) end();
  }

  function show() {
    const s = cur(), lastStep = i === steps.length - 1;
    ui.querySelector('.tr-step').textContent = i ? `${fa(i)} از ${fa(steps.length - 1)}` : '';
    ui.querySelector('#trTitle').textContent = s.t;
    ui.querySelector('#trText').textContent = s.d;
    ui.querySelector('.tr-next').textContent = s.next || (lastStep ? 'پایان' : 'بعدی');
    ui.querySelector('.tr-back').hidden = i < 2;
    ui.querySelector('.tr-skip').textContent = s.skip || 'رد شدن';
    ui.querySelector('.tr-skip').hidden = lastStep;
    if (s.top) { scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }); document.querySelector('.sm-btn')?.classList.remove('away'); }
    // منو با حرکت باز می‌شود و خودش جای فوکوس را عوض می‌کند؛ کمی بعد بخش اندازه گرفته و فوکوس به همین کادر برمی‌گردد.
    setTimeout(() => {
      if (!ui || cur() !== s) return;
      const el = s.el && s.el();
      if (el && !s.top) el.scrollIntoView({ block: el.offsetHeight > innerHeight * 0.5 ? 'start' : 'center', behavior: reduce() ? 'auto' : 'smooth' });
      last = ''; place();
      ui.querySelector('.tr-next').focus({ preventScroll: true });
    }, s.menu ? 320 : 40);
    last = ''; place();
  }

  // جای روشن و کادر هر فریم دوباره حساب می‌شود (اسکرول، چرخش گوشی، باز شدن منو)؛ فقط اگر چیزی عوض شده باشد.
  function place() {
    if (!ui) return;
    const s = cur(), el = s.el && s.el();
    if (s.menu && !menuOpen()) return end(); // منو با دکمه برگشت گوشی بسته شد
    const r = el && el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const card = ui.querySelector('.tr-card'), spot = ui.querySelector('.tr-spot'), arrow = ui.querySelector('.tr-arrow');
    const key = [vw, vh, card.offsetHeight, r ? [r.top, r.left, r.width, r.height].map(Math.round) : 0].join();
    if (key === last) return; last = key;
    const w = card.offsetWidth, h = card.offsetHeight, pad = 6, gap = 14;
    ui.querySelector('.tr-shade').classList.toggle('tr-dim', !r);
    spot.hidden = !r; arrow.hidden = true;
    if (!r) { card.style.top = Math.max(12, (vh - h) / 2) + 'px'; card.style.left = (vw - w) / 2 + 'px'; return; }
    const top = Math.max(r.top - pad, 4), bottom = Math.min(r.bottom + pad, vh - 4);
    Object.assign(spot.style, { top: top + 'px', left: r.left - pad + 'px', width: r.width + pad * 2 + 'px', height: Math.max(bottom - top, 0) + 'px' });
    let y, dir = '';
    if (vh - bottom >= h + gap + 8) { y = bottom + gap; dir = 'up'; }
    else if (top >= h + gap + 8) { y = top - gap - h; dir = 'down'; }
    else y = vh - h - 12; // بخش بلند: کادر پایین صفحه، روی آن
    const cx = r.left + r.width / 2, x = Math.min(Math.max(cx - w / 2, 12), vw - w - 12);
    card.style.top = y + 'px'; card.style.left = x + 'px';
    if (dir) { arrow.hidden = false; arrow.className = 'tr-arrow ' + dir; arrow.style.left = Math.min(Math.max(cx - x - 7, 16), w - 30) + 'px'; }
  }
  const loop = () => { place(); raf = ui ? requestAnimationFrame(loop) : 0; };

  function key(e) {
    if (!ui) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { if (e.target.closest?.('.tr-card')) { e.preventDefault(); go(e.key === 'ArrowLeft' ? 1 : -1); } return; }
    if (e.key === 'Tab') { // فوکوس فقط میان دکمه‌های همین کادر
      const bs = [...ui.querySelectorAll('.tr-btns button:not([hidden])')], k = bs.indexOf(document.activeElement);
      e.preventDefault(); e.stopImmediatePropagation();
      bs[(k + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
    }
  }

  function start() {
    if (ui) return;
    window.siteMenu?.close();
    try { localStorage.setItem(SEEN, '1'); } catch {}
    // قدم‌های منو را منوی ساخته‌شده (بدون باز شدن) می‌شمارد؛ قدم‌های صفحه همان لحظه.
    window.siteMenu?.items();
    steps = STEPS.filter(s => !s.el || (s.menu ? (s.has || s.el)() : s.el()));
    i = 0; build(); show();
    document.addEventListener('keydown', key, true);
    raf = requestAnimationFrame(loop);
  }
  function end() {
    if (!ui) return;
    refold();
    const u = ui; ui = null; cancelAnimationFrame(raf);
    document.removeEventListener('keydown', key, true);
    u.remove();
    if (ownMenu && menuOpen()) window.siteMenu?.close();
    ownMenu = false;
  }

  window.tour = {
    start,
    // دکمه منو برای بخش «تنظیمات» (reminders.js)
    menuItem() {
      if (!on()) return '';
      return '<button type="button" class="sm-item" data-tour-menu><span class="sm-ic">💡</span><span>راهنمای سایت<small>آشنایی قدم‌به‌قدم با بخش‌های نوران</small></span><span class="sm-go">‹</span></button>';
    }
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-tour-menu]') && !ui) { window.siteMenu?.close(); setTimeout(start, 320); } });

  // بار اول: فقط روی صفحه اول ساده (نه پیوند مستقیم به یک بخش، نه ‎#admin‎)، پس از نشستن کادرهای صفحه،
  // و وقتی کاربر چیزی (منو، خواننده یا برگه‌ای) باز نکرده است؛ اگر سرش گرم است، بار بعد.
  function auto(tries = 0) {
    try { if (localStorage.getItem(SEEN)) return; } catch { return; }
    if (location.search || location.hash || !on()) return;
    // کادرهای صفحه اول با حرکت وارد می‌شوند (backdrop.js)؛ تا آن‌هایی که در دیدند ننشسته‌اند صبر می‌کند.
    const arriving = [...document.querySelectorAll('.bgx-in:not(.bgx-done)')].some(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    const busy = arriving || document.body.matches('.sm-lock,.ib-lock') || document.querySelector('.sm.show') || [...document.querySelectorAll('[role=dialog]')].some(vis);
    if (busy) { if (tries < 5) setTimeout(() => auto(tries + 1), 3000); return; }
    start();
  }
  const kick = () => setTimeout(auto, 1500);
  document.readyState === 'complete' ? kick() : addEventListener('load', kick);
})();
