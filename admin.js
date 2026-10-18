// مدیریت سایت: ورود ماندگار مدیر، زبانه‌های «گزارش‌ها / گروه‌ها / ثبت‌نام / چله‌ها / اعلان‌ها / نظرها / تنظیمات»، تقویم شمسی،
// و تنظیمات سایت (اطلاعیه بالای صفحه، نمایش بخش ثبت‌نام، منبع فهرست گروه‌ها، فهرست مدیران).
// داده‌ها در Supabase هستند؛ جدول‌ها در backend/supabase/registration.sql.
(function () {
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 86400000;

  // ---------- تقویم شمسی ----------
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const pFmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  const ord = (m, d) => (m <= 6 ? (m - 1) * 31 : 186 + (m - 7) * 30) + d - 1;
  const J = {
    fromMs(ms) { const p = Object.fromEntries(pFmt.formatToParts(new Date(ms)).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)])); return { y: p.year, m: p.month, d: p.day }; },
    fromIso(iso) { const [y, m, d] = iso.split('-').map(Number); return J.fromMs(Date.UTC(y, m - 1, d, 12)); },
    toMs(jy, jm, jd) {
      let t = Date.UTC(jy + 621, 2, 21, 12) + ord(jm, jd) * DAY;
      const same = ms => { const p = J.fromMs(ms); return p.y === jy && p.m === jm && p.d === jd; };
      for (let i = 0; i < 5; i++) { const p = J.fromMs(t), diff = (jy - p.y) * 365 + ord(jm, jd) - ord(p.m, p.d); if (!diff) break; t += diff * DAY; }
      for (const k of [0, -1, 1, -2, 2]) if (same(t + k * DAY)) return t + k * DAY;
      return null;
    },
    toIso(jy, jm, jd) { const t = J.toMs(jy, jm, jd); return t == null ? '' : new Date(t).toISOString().slice(0, 10); },
    monthLen(jy, jm) { if (jm <= 6) return 31; if (jm <= 11) return 30; const t = J.toMs(jy, 12, 30); if (t == null) return 29; const p = J.fromMs(t); return p.m === 12 && p.d === 30 ? 30 : 29; },
    todayIso() { const p = iranParts(new Date()); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; },
    addDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10); },
    label(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return orderedDate(new Date(Date.UTC(y, m - 1, d, 12))); }
  };
  window.J = J;

  // انتخاب تاریخ شمسی: ورودی اصلی پنهان می‌شود ولی مقدارش همان تاریخ میلادی YYYY-MM-DD می‌ماند.
  const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function JDate(input, { quick = true, empty = false } = {}) {
    if (input._jd) return input._jd;
    const box = document.createElement('div'); box.className = 'jd';
    const today = J.fromIso(J.todayIso());
    const years = []; for (let y = today.y - 2; y <= today.y + 2; y++) years.push(y);
    box.innerHTML = `<div class="jd-row"><select class="jd-d" aria-label="روز"></select><select class="jd-m" aria-label="ماه">${MONTHS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('')}</select><select class="jd-y" aria-label="سال">${years.map(y => `<option value="${y}">${toFa(y)}</option>`).join('')}</select></div>
${quick ? '<div class="jd-quick"><button type="button" data-q="0">امروز</button><button type="button" data-q="1">فردا</button><button type="button" data-q="7">یک هفته بعد</button></div>' : ''}<div class="jd-label"></div>`;
    const [sd, sm, sy] = ['.jd-d', '.jd-m', '.jd-y'].map(s => box.querySelector(s)), lab = box.querySelector('.jd-label');
    const fillDays = () => { const n = J.monthLen(+sy.value, +sm.value), cur = Math.min(+sd.value || 1, n); sd.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${toFa(i + 1)}</option>`).join(''); sd.value = cur; };
    const show = iso => {
      if (!iso) { lab.textContent = empty ? 'تاریخی انتخاب نشده است.' : ''; return; }
      const p = J.fromIso(iso);
      if (!years.includes(p.y)) { sy.insertAdjacentHTML('beforeend', `<option value="${p.y}">${toFa(p.y)}</option>`); }
      sy.value = p.y; sm.value = p.m; fillDays(); sd.value = p.d;
      lab.textContent = J.label(iso);
    };
    const pick = () => { fillDays(); const iso = J.toIso(+sy.value, +sm.value, +sd.value); nativeValue.set.call(input, iso); lab.textContent = J.label(iso); input.dispatchEvent(new Event('change', { bubbles: true })); };
    [sd, sm, sy].forEach(s => s.addEventListener('change', pick));
    box.addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (q) { const iso = J.addDays(J.todayIso(), +q.dataset.q); nativeValue.set.call(input, iso); show(iso); input.dispatchEvent(new Event('change', { bubbles: true })); } });
    Object.defineProperty(input, 'value', { configurable: true, get() { return nativeValue.get.call(this); }, set(v) { nativeValue.set.call(this, v || ''); show(v || ''); } });
    input.type = 'hidden'; input.after(box);
    sy.value = today.y; sm.value = today.m; fillDays(); sd.value = today.d;
    show(nativeValue.get.call(input));
    return (input._jd = { box });
  }
  window.JDate = JDate;

  // ---------- ارتباط با Supabase ----------
  const ERR = window.sbErrors = Object.assign(window.sbErrors || {}, {
    not_admin: 'این حساب دسترسی مدیر ندارد. اگر ایمیل مدیر دیگری است، از «تنظیمات › مدیران» اضافه‌اش کنید.'
  });
  const SETUP = 'این بخش هنوز در Supabase راه‌اندازی نشده است: فایل backend/supabase/registration.sql را در SQL Editor اجرا کنید.';
  async function sbApi(path, { method = 'GET', body, auth = false, prefer, timeout = 15000 } = {}) {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw Error('اتصال به سرور تنظیم نشده است.');
    if (auth) await session.fresh();
    const token = auth ? adminToken : '';
    const headers = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${token || cfg.SUPABASE_ANON_KEY}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeout);
    let r;
    try { r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: ac.signal }); }
    catch { throw Error('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'); }
    finally { clearTimeout(t); }
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) {
      const m = data?.message || '';
      if (r.status === 401 || /JWT/i.test(m)) { if (auth) session.expired(); throw Error('نشست مدیر منقضی شده است؛ دوباره وارد شوید.'); }
      if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(data?.code)) throw Error(SETUP);
      if (data?.code === '42501' || /row-level security|permission denied/i.test(m)) throw Error(ERR.not_admin);
      if (data?.code === '23505') throw Error(ERR.duplicate || 'این مورد تکراری است.');
      throw Error(ERR[m] || 'انجام نشد. لطفاً دوباره تلاش کنید.');
    }
    return data;
  }
  window.sbApi = sbApi;
  window.sbRpc = (fn, args, auth) => sbApi(`rpc/${fn}`, { method: 'POST', body: args || {}, auth });

  // ---------- ورود ماندگار مدیر ----------
  const SKEY = 'adminSession';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(SKEY)) || null; } catch { return null; } },
    set(v) { try { v ? localStorage.setItem(SKEY, JSON.stringify(v)) : localStorage.removeItem(SKEY); } catch {} }
  };
  async function authCall(grant, body) {
    const r = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) { const e = Error(/invalid/i.test(d.error_description || d.msg || d.error || '') ? 'ایمیل یا رمز عبور اشتباه است.' : 'ورود ناموفق بود.'); e.status = r.status; throw e; }
    return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600), email: d.user?.email || body.email || '' };
  }
  let refreshing = null;
  const session = {
    data: store.get(),
    async fresh() {
      const s = this.data; if (!s) return;
      if (s.expires_at - Date.now() / 1000 > 90) { adminToken = s.access_token; return; }
      refreshing = refreshing || authCall('refresh_token', { refresh_token: s.refresh_token }).then(n => { n.email = n.email || s.email; this.save(n); }, e => { if (e.status === 400 || e.status === 401 || e.status === 403) this.expired(); }).finally(() => { refreshing = null; });
      await refreshing;
    },
    save(s) { this.data = s; store.set(s); adminToken = s.access_token; },
    expired() { if (!this.data) return; this.data = null; store.set(null); adminToken = ''; ui.loggedOut('نشست شما تمام شده است؛ دوباره وارد شوید.'); },
    logout() { this.data = null; store.set(null); adminToken = ''; ui.loggedOut('از حساب مدیر خارج شدید.'); }
  };
  window.adminSession = session;

  // ---------- پوسته مدیریت ----------
  const TABS = [['reports', 'گزارش‌ها'], ['groups', 'گروه‌ها'], ['reg', 'ثبت‌نام'], ['chl', 'چله‌ها'], ['notify', 'اعلان‌ها'], ['fb', 'نظرها'], ['settings', 'تنظیمات']];
  const TKEY = 'adminTab';
  const css = `
.jd-row{display:grid;grid-template-columns:1fr 1.6fr 1.2fr;gap:6px}
.jd-row select{width:100%;padding:0 6px}
#adminPanel .admin-filters{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.jd-quick{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.jd-quick button{height:36px;font-size:14px;padding:0 10px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.jd-quick button:hover{background:var(--hover)}
.jd-label{font-size:15px;color:var(--deep);margin-top:4px;min-height:1.6em}
.panel .jd-label{color:inherit}
.reg-round .jd-label,.adm-card .jd-label{color:var(--deep)}
.adm-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 10px}
.adm-bar button{height:38px;font-size:15px}
#adminPanel [hidden]{display:none!important}
.adm-tabs{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:0 -8px 12px;padding:6px 8px;border-radius:var(--r-card);background:rgba(40,26,17,.92);box-shadow:0 4px 10px #0004}
.adm-tabs button{height:44px;padding:0 4px;font-size:15px;background:rgba(255,255,255,.9);color:var(--deep);border-color:var(--gold)}
.adm-tabs button.on{background:var(--deep);color:#fff}
.adm-pane[hidden]{display:none!important}
.adm-card{background:#fff;color:#000;text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:12px 14px;margin:12px 0}
.adm-card h3{margin:0 0 6px;font-size:19px;color:var(--deep)}
.adm-card label{font-weight:600;font-size:15px;margin:10px 0 4px}
.intro-adm{border-top:1px solid #eee;padding:6px 0}.intro-adm input[type=text],.intro-adm textarea{width:100%;margin:4px 0}
.adm-card .hint,body.v2 .adm-card .hint{color:var(--muted);text-shadow:none}
.adm-card textarea{width:100%;min-height:90px;font:inherit;font-size:16px;line-height:1.8;padding:8px;border:1px solid var(--gold);color:var(--ink);background:#fff}
.adm-opt{display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-weight:500!important}
.adm-opt input{flex:none;width:20px;height:20px;margin:5px 0 0}
.adm-list div{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0e8d6;direction:ltr}
.adm-list button{height:34px;font-size:14px;padding:0 10px}
.site-notice{background:var(--cream);color:#2f241d;text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:12px 16px;margin:0 0 20px;white-space:pre-line;font-weight:500}
.adm-ok{color:var(--ok)}.adm-bad{color:var(--danger)}
.adm-msg{min-height:22px;margin-top:6px;font-weight:700}
/* در زمینه‌های صفحه اول ‎--deep‎ همان رنگ قاب است و دکمه‌های کادرها هم به رنگ قاب می‌شوند؛ پس نام زبانه‌ها دیده نمی‌شد. */
html[data-bg] #admTabs button{background:#fffaf0;color:#2b2118;border-color:var(--t-gold,var(--gold))}
html[data-bg] #admTabs button.on{background:var(--t-frame);color:#fff}
@media(max-width:600px){.adm-tabs{grid-template-columns:repeat(4,1fr);gap:3px}.adm-tabs button{height:40px;font-size:14px;padding:0 2px}}`;

  const $ = id => document.getElementById(id);
  const ui = {
    built: false,
    build() {
      if (this.built) return; this.built = true;
      const ctl = $('adminControls');
      const bar = document.createElement('div'); bar.className = 'adm-bar'; bar.id = 'admBar';
      bar.innerHTML = '<span id="admWho"></span><button type="button" class="reg-light" id="admLogout">خروج</button>';
      const tabs = document.createElement('nav'); tabs.className = 'adm-tabs'; tabs.id = 'admTabs';
      tabs.innerHTML = TABS.map(([k, n]) => `<button type="button" data-tab="${k}">${n}</button>`).join('');
      ctl.prepend(bar, tabs);
      const panes = {};
      TABS.forEach(([k]) => { const p = document.createElement('div'); p.className = 'adm-pane'; p.id = 'pane-' + k; ctl.appendChild(p); panes[k] = p; });
      // بخش گزارش‌های قبلی به زبانه «گزارش‌ها» منتقل می‌شود.
      panes.reports.innerHTML = '<p class="hint">گروه و روز را انتخاب کنید تا ببینید چه کسانی سهم آن روز را گزارش داده‌اند.</p>';
      [...ctl.children].filter(n => !n.classList.contains('adm-pane') && n !== bar && n !== tabs).forEach(n => panes.reports.appendChild(n));
      if ($('adminDate')) JDate($('adminDate'));
      tabs.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) this.tab(b.dataset.tab); });
      $('admLogout').onclick = () => session.logout();
      buildSettings(panes.settings);
      this.tab((() => { try { return localStorage.getItem(TKEY); } catch { return null; } })() || 'reports');
    },
    tab(k) {
      if (!TABS.some(t => t[0] === k)) k = 'reports';
      document.querySelectorAll('#admTabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
      document.querySelectorAll('.adm-pane').forEach(p => { p.hidden = p.id !== 'pane-' + k; });
      try { localStorage.setItem(TKEY, k); } catch {}
      document.dispatchEvent(new CustomEvent('admin:tab', { detail: k }));
    },
    loggedIn() {
      this.build();
      const login = [$('adminEmail'), $('adminPassword'), $('adminLogin')];
      document.querySelectorAll('label[for=adminEmail],label[for=adminPassword]').forEach(l => (l.hidden = true));
      login.forEach(el => { (el.closest('.row') || el).hidden = true; });
      $('adminPanel').querySelector('.hint').hidden = true;
      $('admWho').textContent = 'وارد شده: ' + (session.data?.email || 'مدیر');
      $('adminMessage').textContent = '';
      $('adminControls').hidden = false;
      document.dispatchEvent(new Event('admin:login'));
      checkAdmin();
    },
    loggedOut(msg) {
      document.querySelectorAll('label[for=adminEmail],label[for=adminPassword]').forEach(l => (l.hidden = false));
      [$('adminEmail'), $('adminPassword'), $('adminLogin')].forEach(el => { (el.closest('.row') || el).hidden = false; });
      $('adminPanel').querySelector('.hint').hidden = false;
      $('adminControls').hidden = true;
      $('adminMessage').textContent = msg || '';
      document.dispatchEvent(new Event('admin:logout'));
    }
  };

  async function checkAdmin() {
    try {
      const ok = await window.sbRpc('is_site_admin', {}, true);
      if (ok === false) { $('adminMessage').textContent = ERR.not_admin; }
    } catch (e) { if (e.message === SETUP) $('adminMessage').textContent = SETUP; }
  }

  async function doLogin() {
    const msg = $('adminMessage');
    if (!cfg.SUPABASE_URL) { msg.textContent = 'ابتدا Supabase را تنظیم کنید.'; return; }
    const email = $('adminEmail').value.trim(), password = $('adminPassword').value;
    if (!email || !password) { msg.textContent = 'ایمیل و رمز عبور را وارد کنید.'; return; }
    $('adminLogin').disabled = true; msg.textContent = 'در حال ورود…';
    try { session.save(await authCall('password', { email, password })); $('adminPassword').value = ''; ui.loggedIn(); }
    catch (e) { msg.textContent = e.message; }
    $('adminLogin').disabled = false;
  }

  // ---------- تنظیمات سایت ----------
  // site_settings: notice {enabled,text} · intro {[کلید]: {on,title,text}} (home.js) · registration {mode:'auto'|'hidden'} · install {mode:'dismissible'|'always'|'menu'} (install.js) · quran {intro} (quran-reader.js) · groups_source {source:'db'|'files'}
  async function saveSetting(key, value) {
    await sbApi('site_settings', { method: 'POST', body: { key, value, updated_at: new Date().toISOString() }, auth: true, prefer: 'resolution=merge-duplicates,return=minimal' });
    window.siteSettings = Object.assign(window.siteSettings || {}, { [key]: value });
    try { localStorage.setItem('siteSettingsCache', JSON.stringify(window.siteSettings)); } catch {}
  }
  window.saveSiteSetting = saveSetting;

  function buildSettings(p) {
    p.innerHTML = `
<div class="adm-card"><h3>اطلاعیه بالای صفحه</h3><p class="hint">متنی که همه بازدیدکنندگان بالای سایت می‌بینند، مثلاً خبر شروع دوره یا تغییر برنامه.</p>
<label class="adm-opt"><input type="checkbox" id="setNoticeOn"> نمایش اطلاعیه</label>
<textarea id="setNoticeText" maxlength="1000" placeholder="متن اطلاعیه"></textarea>
<div class="reg-tools"><button type="button" id="setNoticeSave">ذخیره اطلاعیه</button></div><div class="adm-msg" id="setNoticeMsg"></div></div>
<div class="adm-card" id="setIntro"><h3>متن‌های صفحه اول</h3><p class="hint">هر بخش معرفی صفحه اول را می‌توانید پنهان کنید یا متنش را تغییر دهید. اگر عنوان یا متنی را خالی بگذارید، همان متن اولیه نمایش داده می‌شود. در کادر آخر هر خط یک بند جداست.</p>
<div id="setIntroFields"></div>
<div class="reg-tools"><button type="button" id="setIntroSave">ذخیره متن‌های صفحه اول</button><button type="button" class="reg-light" id="setIntroReset">بازگرداندن متن‌های اولیه</button></div><div class="adm-msg" id="setIntroMsg"></div></div>
<div class="adm-card"><h3>بخش «ثبت‌نام دوره جدید»</h3>
<label class="adm-opt"><input type="radio" name="setReg" value="auto"> <span>خودکار: فقط وقتی ثبت‌نامی باز یا اعلام‌شده هست نمایش داده شود</span></label>
<label class="adm-opt"><input type="radio" name="setReg" value="hidden"> <span>پنهان برای همه (فقط مدیر در ‎#admin‎ می‌بیند)</span></label>
<div class="adm-msg" id="setRegMsg"></div></div>
<div class="adm-card"><h3>بخش «نصب برنامه» در صفحه اول</h3><p class="hint">در منوی ☰ همیشه هست. اینجا تعیین می‌کنید در صفحه اول چطور دیده شود.</p>
<label class="adm-opt"><input type="radio" name="setIns" value="dismissible"> <span>نمایش با دکمه بستن: هر کس بخواهد می‌بندد و بعد فقط از منو در دسترس است</span></label>
<label class="adm-opt"><input type="radio" name="setIns" value="always"> <span>همیشه در صفحه اول (بدون دکمه بستن)</span></label>
<label class="adm-opt"><input type="radio" name="setIns" value="menu"> <span>فقط در منو</span></label>
<div class="adm-msg" id="setInsMsg"></div></div>
<div class="adm-card"><h3>قرآن‌خوان</h3>
<label class="adm-opt"><input type="checkbox" id="setQIntro"> <span>دکمه «معرفی سوره» (محتوا و فضیلت هر سوره) در قرآن‌خوان</span></label>
<p class="hint">وقتی روشن باشد، هر کس می‌تواند آن را از تنظیمات قرآن‌خوان برای خودش پنهان کند. وقتی خاموش باشد، نه دکمه دیده می‌شود نه تنظیمش.</p><div class="adm-msg" id="setQMsg"></div></div>
<div class="adm-card"><h3>حساب کاربری</h3><p class="hint">ساختن حساب و ورود (نام کاربری و رمز) برای بازدیدکنندگان. پیش از روشن کردن، accounts.sql و تنظیمات Supabase (گام ۲۵ راهنمای backend) را انجام دهید. در ‎#admin‎ همیشه برای آزمایش دیده می‌شود.</p>
<label class="adm-opt"><input type="checkbox" id="setAccOn"> <span>نمایش حساب کاربری به همه</span></label><div class="adm-msg" id="setAccMsg"></div></div>
<div class="adm-card"><h3>منبع فهرست گروه‌ها</h3>
<label class="adm-opt"><input type="radio" name="setSrc" value="db"> <span>پایگاه داده (پیشنهادی): همان فهرستی که در زبانه «گروه‌ها» ویرایش می‌کنید</span></label>
<label class="adm-opt"><input type="radio" name="setSrc" value="files"> <span>فایل‌های پوشه groups در گیت‌هاب</span></label>
<p class="hint">اگر پایگاه داده در دسترس نباشد یا خالی باشد، سایت خودکار از فایل‌ها می‌خواند.</p><div class="adm-msg" id="setSrcMsg"></div></div>
<div class="adm-card"><h3>مدیران</h3><p class="hint">هر ایمیلی که اینجا باشد و در Supabase › Authentication حساب داشته باشد، می‌تواند وارد این بخش شود.</p>
<div class="adm-list" id="setAdmins"></div>
<div class="row" style="margin-top:8px"><input id="setAdminNew" type="email" placeholder="ایمیل مدیر جدید" dir="ltr"><button type="button" id="setAdminAdd">افزودن</button></div><div class="adm-msg" id="setAdminMsg"></div></div>`;
    const m = (id, t, ok) => { const e = $(id); e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
    $('setNoticeSave').onclick = async () => {
      try { await saveSetting('notice', { enabled: $('setNoticeOn').checked, text: $('setNoticeText').value.trim() }); renderNotice(); m('setNoticeMsg', 'ذخیره شد.', true); }
      catch (e) { m('setNoticeMsg', e.message); }
    };
    $('setIntroSave').onclick = async () => {
      const d = window.introDefaults || {}, v = {};
      Object.keys(d).forEach(k => {
        const f = n => p.querySelector(`[data-ik="${k}"][data-f="${n}"]`), title = f('title')?.value.trim() || '', text = f('text').value.trim();
        v[k] = { on: f('on').checked, title: title === d[k].title ? '' : title, text: text === d[k].text.trim() ? '' : text };
      });
      try { await saveSetting('intro', v); window.applyIntro?.(); m('setIntroMsg', 'ذخیره شد؛ صفحه اول برای همه به‌روز می‌شود.', true); }
      catch (e) { m('setIntroMsg', e.message); }
    };
    $('setIntroReset').onclick = () => { fillIntro({}); m('setIntroMsg', 'متن‌های اولیه در فرم گذاشته شد؛ برای اعمال، «ذخیره» را بزنید.', true); };
    p.addEventListener('change', async e => {
      const t = e.target;
      try {
        if (t.name === 'setReg') { await saveSetting('registration', { mode: t.value }); m('setRegMsg', 'ذخیره شد.', true); document.dispatchEvent(new Event('settings:changed')); }
        if (t.id === 'setAccOn') { await saveSetting('accounts', { enabled: t.checked }); m('setAccMsg', t.checked ? 'ذخیره شد؛ حساب کاربری برای همه نمایش داده می‌شود.' : 'ذخیره شد؛ فقط در ‎#admin‎ دیده می‌شود.', true); document.dispatchEvent(new Event('settings:changed')); }
        if (t.id === 'setQIntro') { await saveSetting('quran', Object.assign({}, window.siteSettings?.quran, { intro: t.checked })); m('setQMsg', t.checked ? 'ذخیره شد؛ «معرفی سوره» برای همه روشن است.' : 'ذخیره شد؛ «معرفی سوره» برای همه پنهان است.', true); document.dispatchEvent(new Event('settings:changed')); }
        if (t.name === 'setIns') { await saveSetting('install', { mode: t.value }); m('setInsMsg', 'ذخیره شد.', true); document.dispatchEvent(new Event('settings:changed')); }
        if (t.name === 'setSrc') { await saveSetting('groups_source', { source: t.value }); m('setSrcMsg', 'ذخیره شد. برای دیدن نتیجه، صفحه را تازه کنید.', true); document.dispatchEvent(new Event('settings:changed')); }
      } catch (err) { if (t.id === 'setQIntro') { t.checked = !t.checked; return m('setQMsg', err.message); } m(t.id === 'setAccOn' ? 'setAccMsg' : t.name === 'setReg' ? 'setRegMsg' : t.name === 'setIns' ? 'setInsMsg' : 'setSrcMsg', err.message); }
    });
    $('setAdminAdd').onclick = async () => {
      const email = $('setAdminNew').value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { m('setAdminMsg', 'ایمیل معتبر وارد کنید.'); return; }
      try { await sbApi('site_admins', { method: 'POST', body: { email }, auth: true, prefer: 'resolution=ignore-duplicates,return=minimal' }); $('setAdminNew').value = ''; m('setAdminMsg', 'اضافه شد. این شخص باید در Supabase › Authentication هم حساب داشته باشد.', true); loadAdmins(); }
      catch (e) { m('setAdminMsg', e.message); }
    };
    $('setAdmins').addEventListener('click', async e => {
      const b = e.target.closest('[data-del]'); if (!b) return;
      if (!confirm(`دسترسی مدیر «${b.dataset.del}» برداشته شود؟`)) return;
      try { await sbApi(`site_admins?email=eq.${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' }); loadAdmins(); }
      catch (err) { m('setAdminMsg', err.message); }
    });
    document.addEventListener('admin:tab', e => { if (e.detail === 'settings') loadSettingsForm(); });
  }
  const INTRO_LABELS = { tagline: 'جمله زیر نام نوران', lead: 'جمله اول معرفی', hezb: 'حزب‌خوانی', courses: 'دوره‌های قرآن', chelleh: 'چله‌ها', hint: 'جمله پایانی معرفی', notice: 'کادر ثبت‌نام کنید' };
  function fillIntro(saved) {
    const d = window.introDefaults || {};
    $('setIntroFields').innerHTML = Object.keys(d).map(k => {
      const c = saved[k] || {}, a = `data-ik="${k}"`;
      return `<div class="intro-adm"><label class="adm-opt"><input type="checkbox" ${a} data-f="on"${c.on === false ? '' : ' checked'}> <span>نمایش «${INTRO_LABELS[k] || k}»</span></label>${'title' in d[k] ? `<input type="text" ${a} data-f="title" maxlength="80" placeholder="عنوان" value="${esc(c.title || d[k].title)}">` : ''}<textarea ${a} data-f="text" maxlength="1500" rows="${k === 'notice' ? 5 : 2}" placeholder="${esc(d[k].text)}">${esc(c.text || d[k].text)}</textarea></div>`;
    }).join('');
  }
  async function loadSettingsForm() {
    await refreshSettings();
    const s = window.siteSettings || {};
    $('setNoticeOn').checked = !!s.notice?.enabled; $('setNoticeText').value = s.notice?.text || '';
    document.querySelectorAll('[name=setReg]').forEach(r => (r.checked = r.value === (s.registration?.mode || 'auto')));
    $('setAccOn').checked = !!s.accounts?.enabled;
    $('setQIntro').checked = s.quran?.intro !== false;
    fillIntro(s.intro || {});
    document.querySelectorAll('[name=setSrc]').forEach(r => (r.checked = r.value === (s.groups_source?.source || 'db')));
    document.querySelectorAll('[name=setIns]').forEach(r => (r.checked = r.value === (s.install?.mode || 'dismissible')));
    loadAdmins();
  }
  async function loadAdmins() {
    const box = $('setAdmins');
    try {
      const a = await sbApi('site_admins?select=email&order=email', { auth: true });
      const me = (session.data?.email || '').toLowerCase();
      box.innerHTML = a.length ? a.map(x => `<div><span>${esc(x.email)}</span>${x.email === me ? '<span class="hint">(شما)</span>' : `<button type="button" class="reg-danger" data-del="${esc(x.email)}">حذف</button>`}</div>`).join('') : '<p class="hint">فهرست خالی است.</p>';
    } catch (e) { box.innerHTML = `<p class="adm-bad">${esc(e.message)}</p>`; }
  }

  // تنظیمات برای همه بازدیدکنندگان (با حافظه موقت برای باز شدن سریع صفحه)
  async function refreshSettings() {
    try {
      const rows = await sbApi('site_settings?select=key,value', { timeout: 6000 });
      window.siteSettings = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
      try { localStorage.setItem('siteSettingsCache', JSON.stringify(window.siteSettings)); } catch {}
    } catch {}
    return window.siteSettings || {};
  }
  function renderNotice() {
    const n = (window.siteSettings || {}).notice;
    let el = $('siteNotice');
    if (!n?.enabled || !n.text) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'siteNotice'; el.className = 'site-notice'; el.setAttribute('role', 'status'); document.querySelector('header').after(el); }
    el.textContent = n.text;
  }

  // ---------- راه‌اندازی ----------
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  renderNotice();
  refreshSettings().then(() => { renderNotice(); document.dispatchEvent(new Event('settings:changed')); });

  $('adminLogin').onclick = doLogin;
  $('adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  const place = () => {
    if (location.hash !== '#admin') return;
    const sec = $('adminSection'), head = document.querySelector('main > header');
    if (head && head.nextElementSibling !== sec) head.after(sec);
  };
  window.addEventListener('hashchange', () => { place(); if (location.hash === '#admin') scrollTo(0, 0); }); place();
  const restore = () => { if (session.data) session.fresh().then(() => { if (session.data) ui.loggedIn(); }); };
  // اسکریپت‌ها defer هستند (readyState هنگام اجرا interactive است)؛ تا پایان اجرای همه اسکریپت‌ها صبر می‌کنیم.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', restore); else restore();
  setInterval(() => { if (session.data) session.fresh(); }, 5 * 60 * 1000);
})();
