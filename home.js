// صفحه اول: معرفی کوتاه، و فقط چیزهایی که بازدیدکننده در آن‌ها عضو است (ثبت‌نام‌های من، چله‌های من، گروه حزب‌خوانی من).
// فهرست کلی دوره‌ها و ثبت‌نام در منوی سه‌خط (menu.js) است.
// بخش‌های حزب‌خوانی (کلاس hz-panel در index.html) فقط وقتی دیده می‌شوند که گروه و شناسه روی این گوشی ذخیره شده باشد
// (پس از یک بار «نمایش سهم امروز» یا ثبت گزارش)، یا از منو یا دکمه «عضو گروه تلگرام یا بله هستم» باز شوند.
// در ‎#admin‎ همه بخش‌ها مثل قبل دیده می‌شوند. استفاده: window.hezbReveal(id)
(function () {
  const ME = 'me'; // همان کلید extras.js: { g: شماره گروه، id: شناسه }
  const read = () => { try { const m = JSON.parse(localStorage.getItem(ME)); return m && m.g && m.id >= 1 && m.id <= 120 ? m : null; } catch { return null; } };
  const write = v => { try { v ? localStorage.setItem(ME, JSON.stringify(v)) : localStorage.removeItem(ME); } catch {} };

  const css = `
.hz-off,.intro-off{display:none!important}
.intro-list{margin:0 0 4px;padding:0 22px 0 0}
.intro-list li{margin:0 0 6px}
.intro-notice{margin:14px 0 0;padding:10px 14px;background:var(--cream);color:var(--ink);text-shadow:none;border:1px solid var(--gold);border-right:5px solid var(--deep);border-radius:var(--r-card)}
.intro-notice b{display:block;color:var(--deep);font-size:18px}
.intro-notice p{margin:4px 0 0;font-size:15px;line-height:1.8}
.intro-tools{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.intro-tools button{flex:1 1 auto;height:auto;min-height:48px;white-space:normal;line-height:1.6;padding:6px 14px}
.hz-mine{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;margin:0 0 10px;padding:6px 12px;background:rgba(0,92,69,.75);border:1px solid var(--gold);border-radius:var(--r-card);font-size:15px}
.hz-mine[hidden]{display:none}
.hz-mine button{height:auto;padding:0;background:none;border:0;color:#ffe2a8;text-decoration:underline;font-weight:500;font-size:15px}
@media(max-width:600px){.intro-tools button{flex-basis:100%}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  const panels = [...document.querySelectorAll('.hz-panel')];
  const taskPanel = document.getElementById('hzTaskPanel');
  const mineBar = document.createElement('div'); mineBar.className = 'hz-mine'; mineBar.hidden = true;
  taskPanel.querySelector('h2').after(mineBar);
  let opened = false; // در همین بازدید از منو باز شده

  function apply() {
    const admin = location.hash === '#admin', me = read();
    panels.forEach(p => p.classList.toggle('hz-off', !(admin || opened || (me && (p === taskPanel || p.id === 'hzReportPanel')))));
    const g = me && groups.find(x => x.number === me.g);
    mineBar.hidden = !me || admin;
    if (!mineBar.hidden) mineBar.innerHTML = `<span>گروه حزب‌خوانی شما: <b>${esc(g ? g.name : `گروه ${toFa(me.g)}`)}</b> · شناسه ${toFa(me.id)}</span>${opened ? '' : '<button type="button" data-hz-change>تغییر گروه یا شناسه</button>'}`;
  }
  mineBar.addEventListener('click', e => { if (e.target.closest('[data-hz-change]')) reveal('hzGroupsPanel'); });

  function reveal(id) {
    if (!opened) { opened = true; apply(); window.siteMenu?.refresh(); }
    const el = id && document.getElementById(id), panel = el && (el.closest('.panel') || el);
    if (panel) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  window.hezbReveal = reveal;

  // گروه و شناسه پس از نمایش سهم یا ثبت گزارش روی همین گوشی ذخیره می‌شود.
  const remember = (g, id) => { if (!g || !(id >= 1 && id <= 120)) return; const m = read(); if (m && m.g === g && m.id === id) return; write({ g, id }); apply(); document.dispatchEvent(new Event('me:changed')); };
  document.addEventListener('task:shown', e => remember(selected?.number, e.detail?.id));
  new MutationObserver(() => { if (/با موفقیت ثبت شد|گزارش شما برای (امروز|این روز) قبلاً ثبت شده/.test(reportMessage.textContent) && verifiedReport) remember(verifiedReport.groupNumber, verifiedReport.id); })
    .observe(reportMessage, { childList: true, characterData: true, subtree: true });

  // بازدید بعدی: گروه انتخاب و سهم امروز و فرم گزارش با همان شناسه آماده می‌شود.
  function restore() {
    const me = read();
    if (me && groups.length && !groups.some(g => g.number === me.g)) write(null); // گروه حذف شده است
    apply();
    if (!me || !groups.length || pid.value || window.groupTouched) return;
    const btn = groupsNav.querySelector(`button[data-n="${me.g}"]`);
    if (!btn) return;
    selectGroup(me.g, btn);
    pid.value = toFa(me.id); reportId.value = toFa(me.id);
    showTask.click();
    verifyReportIdentity();
  }
  document.addEventListener('groups:loaded', restore);
  // پس از ورود به حساب روی گوشی تازه (account.js)، گروه و شناسه حساب همین‌جا آماده می‌شود.
  window.hezbRestore = restore;

  // متن‌های معرفی صفحه اول را مدیر در «تنظیمات» روشن/خاموش و ویرایش می‌کند (site_settings با کلید intro):
  // { [کلید]: { on: false برای پنهان، title: عنوان، text: متن } }؛ عنوان یا متن خالی یعنی همان متن اولیه index.html.
  // کلیدها همان data-intro در index.html هستند. پیش‌فرض‌ها در window.introDefaults برای فرم مدیریت (admin.js).
  const introEl = k => document.querySelector(`#introPanel [data-intro="${k}"]`);
  const INTRO_KEYS = ['tagline', 'lead', 'hezb', 'courses', 'chelleh', 'hint', 'notice'];
  const titled = k => k === 'hezb' || k === 'courses' || k === 'chelleh' || k === 'notice';
  window.introDefaults = Object.fromEntries(INTRO_KEYS.filter(introEl).map(k => {
    const el = introEl(k);
    if (k === 'notice') return [k, { title: el.querySelector('b').textContent, text: [...el.querySelectorAll('p')].map(p => p.textContent).join('\n') }];
    if (titled(k)) return [k, { title: el.querySelector('b').textContent.replace(/:\s*$/, ''), text: el.querySelector('span').textContent }];
    return [k, { text: el.textContent }];
  }));
  function applyIntro() {
    const s = window.siteSettings?.intro || {};
    Object.entries(window.introDefaults).forEach(([k, d]) => {
      const el = introEl(k); if (!el) return;
      const c = s[k] || {}, title = String(c.title || '').trim() || d.title, text = String(c.text || '').trim() || d.text;
      el.classList.toggle('intro-off', c.on === false);
      if (k === 'notice') {
        const html = `<b>${esc(title)}</b>` + text.split(/\n+/).map(t => t.trim()).filter(Boolean).map(t => `<p>${esc(t)}</p>`).join('');
        // اگر حساب کاربری روشن باشد، account.js متن این کادر را عوض کرده و از dataset.orig برای بازگرداندن استفاده می‌کند.
        if (el.dataset.orig !== undefined) el.dataset.orig = html;
        if (!el.dataset.acc && el.innerHTML !== html) el.innerHTML = html;
      } else if (titled(k)) {
        el.querySelector('b').textContent = el.tagName === 'LI' ? title + ':' : title;
        el.querySelector('span').textContent = text;
      } else el.textContent = text;
    });
  }
  applyIntro();
  document.addEventListener('settings:changed', applyIntro);
  window.applyIntro = applyIntro;

  // معرفی صفحه اول: به‌جای یک کادر بزرگ، عنوان و هر گزینه در کادر جدای خودش (شکل و رنگ کادرها با زمینه در backdrop.css)
  // و هر گزینه با یک لمس به همان بخش می‌رود.
  // در «ظاهر قبلی سایت» (بدون زمینه، انتخاب در منو) معرفی همان یک کادر قبلی می‌ماند.
  (function splitIntro() {
    if (!document.documentElement.dataset.bg) return;
    const intro = document.getElementById('introPanel');
    const h2 = intro.querySelector(':scope > h2'), tagline = intro.querySelector(':scope > .tagline'), lead = intro.querySelector(':scope > .lead'), hint = intro.querySelector(':scope > .hint');
    const list = intro.querySelector('.intro-list'), notice = intro.querySelector('.intro-notice');
    const head = document.createElement('div'); head.className = 'bgx-frame intro-head';
    h2.before(head); head.append(h2); if (tagline) head.append(tagline); head.append(lead); if (hint) head.append(hint);
    const go = ['hezb', 'menu', 'menu'];
    const opts = document.createElement('div'); opts.className = 'intro-opts';
    [...list.children].forEach((li, i) => {
      const a = document.createElement('a'); a.href = '#'; a.className = li.className + ' bgx-frame intro-opt'; a.dataset.go = go[i] || 'menu'; a.dataset.intro = li.dataset.intro;
      a.innerHTML = `<b>${esc(li.querySelector('b').textContent.replace(/:\s*$/, ''))}</b><span>${esc(li.querySelector('span').textContent)}</span>`;
      opts.append(a);
    });
    list.replaceWith(opts);
    opts.addEventListener('click', e => { const a = e.target.closest('[data-go]'); if (!a) return; e.preventDefault(); a.dataset.go === 'hezb' ? reveal('hzGroupsPanel') : window.siteMenu?.open(); });
    if (notice) notice.classList.add('bgx-frame');
    // خود کادر بزرگ دیگر کادر نیست؛ هر کادر کوچک جداگانه وارد می‌شود (backdrop.js).
    intro.classList.add('intro-split', 'bgx-in', 'bgx-done');
  })();

  document.getElementById('introMenu').onclick = () => window.siteMenu?.open();
  document.getElementById('introHezb').onclick = () => reveal('hzGroupsPanel');
  window.addEventListener('hashchange', apply);
  apply();
})();
