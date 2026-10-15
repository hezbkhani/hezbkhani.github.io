// حساب کاربری: ساختن حساب (نام، نام کاربری، ایمیل و رمز)، ورود با ایمیل یا نام کاربری، خروج، فراموشی رمز و رمز تازه.
// پس از ورود، کدهای چله و ثبت‌نام‌های حزب‌خوانی و گروه حزب‌خوانیِ این گوشی به حساب وصل می‌شوند و کدهای حساب روی گوشی
// برگردانده می‌شوند؛ پس روی هر گوشی با ورود به حساب همه چیز در صفحه اول دیده می‌شود (بدون به خاطر سپردن کد).
// گزارش و ثبت‌نام بدون حساب هم مثل قبل کار می‌کند. ورود و رمز با Supabase Auth است؛ backend/supabase/accounts.sql
// و تابع backend/supabase/functions/account-login (برای ورود با نام کاربری).
// استفاده: account.open('login' | 'signup' | 'forgot' | 'me', { note })، account.sync()، account.unlink(kind, code)، account.user
(function () {
  Object.assign(window.sbErrors, {
    acc_login_needed: 'ابتدا وارد حساب کاربری شوید.',
    acc_bad_username: 'نام کاربری باید ۳ تا ۳۰ حرف انگلیسی، عدد، نقطه یا _ باشد.',
    acc_username_taken: 'این نام کاربری را کس دیگری انتخاب کرده است؛ نام دیگری بنویسید.'
  });
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => toFa(x);
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const SKEY = 'userSession', PKEY = 'userProfile', LKEY = 'userLinked', MEKEY = 'meSynced';
  const siteUrl = () => location.origin + location.pathname;
  const latin = s => norm(String(s || '')).trim();
  const MIN_PASS = 8;
  // تا مدیر در «تنظیمات › حساب کاربری» روشنش نکند، فقط در ‎#admin‎ (برای آزمایش) دیده می‌شود.
  const enabled = () => location.hash === '#admin' || window.siteSettings?.accounts?.enabled === true;

  // ---------- Supabase Auth ----------
  const ERRS = {
    invalid_credentials: 'ایمیل (یا نام کاربری) یا رمز اشتباه است.',
    invalid_grant: 'ایمیل (یا نام کاربری) یا رمز اشتباه است.',
    email_not_confirmed: 'ایمیل شما هنوز تأیید نشده است. لینکی را که به ایمیلتان فرستادیم باز کنید (پوشه Spam را هم ببینید).',
    user_already_exists: 'با این ایمیل قبلاً حساب ساخته شده است. وارد شوید، یا اگر رمز یادتان نیست «فراموشی رمز» را بزنید.',
    email_exists: 'با این ایمیل قبلاً حساب ساخته شده است. وارد شوید، یا اگر رمز یادتان نیست «فراموشی رمز» را بزنید.',
    weak_password: `رمز ضعیف است. دست‌کم ${fa(MIN_PASS)} حرف بنویسید و فقط عدد نباشد.`,
    same_password: 'رمز تازه باید با رمز قبلی فرق داشته باشد.',
    signup_disabled: 'ساختن حساب هنوز در سایت روشن نشده است. کمی بعد دوباره امتحان کنید.',
    email_address_invalid: 'ایمیل درست نوشته نشده است.',
    validation_failed: 'ایمیل درست نوشته نشده است.',
    over_email_send_rate_limit: 'تعداد ایمیل‌های فرستاده‌شده زیاد بوده است. چند دقیقه بعد دوباره امتحان کنید.',
    over_request_rate_limit: 'تعداد تلاش‌ها زیاد بوده است. چند دقیقه بعد دوباره امتحان کنید.',
    otp_expired: 'این لینک باطل شده یا قبلاً استفاده شده است. دوباره درخواست کنید.',
    session_not_found: 'نشست شما تمام شده است؛ دوباره وارد شوید.'
  };
  function authError(d, status) {
    const code = d?.error_code || d?.code || d?.error || '', text = d?.msg || d?.error_description || d?.message || '';
    let m = ERRS[code];
    if (!m && /invalid login/i.test(text)) m = ERRS.invalid_credentials;
    if (!m && /not confirmed/i.test(text)) m = ERRS.email_not_confirmed;
    if (!m && /already (registered|exists)/i.test(text)) m = ERRS.user_already_exists;
    if (!m && /signups? not allowed/i.test(text)) m = ERRS.signup_disabled;
    if (!m && /password/i.test(text) && /(weak|at least|characters)/i.test(text)) m = ERRS.weak_password;
    if (!m && status === 429) m = ERRS.over_request_rate_limit;
    const e = Error(m || 'انجام نشد. لطفاً دوباره تلاش کنید.'); e.code = code; e.status = status; return e;
  }
  async function auth(path, { method = 'POST', body, token, query = '' } = {}) {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw Error('اتصال به سرور تنظیم نشده است.');
    let r;
    try {
      r = await fetch(`${cfg.SUPABASE_URL}/auth/v1/${path}${query}`, {
        method, headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch { throw Error('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw authError(d, r.status);
    return d;
  }
  const toSession = d => ({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (+d.expires_in || 3600), user: { id: d.user?.id, email: d.user?.email } });

  let refreshing = null;
  const session = {
    data: read(SKEY, null),
    save(d) { this.data = d; write(SKEY, d); },
    clear() { this.data = null; write(SKEY, null); write(PKEY, null); write(LKEY, null); write(MEKEY, null); },
    async token() {
      const s = this.data; if (!s) return '';
      if (s.expires_at - Date.now() / 1000 > 90) return s.access_token;
      refreshing = refreshing || auth('token', { query: '?grant_type=refresh_token', body: { refresh_token: s.refresh_token } })
        .then(d => this.save(toSession(d)), e => { if (e.status >= 400 && e.status < 500) { this.clear(); render(); } })
        .finally(() => { refreshing = null; });
      await refreshing;
      return this.data?.access_token || '';
    }
  };

  async function rpc(fn, args) {
    const token = await session.token();
    if (!token) throw Error(window.sbErrors.acc_login_needed);
    let r;
    try {
      r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}), cache: 'no-store' });
    } catch { throw Error('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'); }
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      const m = d?.message || '';
      if (r.status === 401 || /JWT/i.test(m)) { session.clear(); render(); throw Error(ERRS.session_not_found); }
      if (['PGRST202', '42883'].includes(d?.code)) throw Error('بخش حساب کاربری هنوز در Supabase راه‌اندازی نشده است (accounts.sql).');
      throw Error(window.sbErrors[m] || 'انجام نشد. لطفاً دوباره تلاش کنید.');
    }
    return d;
  }

  // ---------- همگام‌سازی کدها ----------
  const meOf = () => { const m = read('me', null); return m && m.g && m.id >= 1 && m.id <= 120 ? { g: m.g, id: m.id } : null; };
  const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
  let syncing = null, again = false;
  async function sync() {
    if (!session.data) return null;
    if (syncing) { again = true; return syncing; }
    syncing = (async () => {
      const chl = read('chlCodes', []), reg = read('regCodes', []), me = meOf();
      const d = await rpc('acc_sync', { p_chl: Array.isArray(chl) ? chl : [], p_reg: Array.isArray(reg) ? reg : [], p_hezb: me && !same(me, read(MEKEY, null)) ? me : null });
      write(PKEY, { name: d.name || '', username: d.username || '', email: d.email || '', proven: !!d.email_proven });
      write(LKEY, { chl: d.chl || [], reg: d.reg || [], hezb: d.hezb || null });
      const addChl = (d.chl || []).filter(c => !chl.includes(c)), addReg = (d.reg || []).filter(c => !reg.includes(c));
      if (addChl.length) write('chlCodes', [...new Set([...chl, ...addChl])]);
      if (addReg.length) write('regCodes', [...new Set([...reg, ...addReg])]);
      let reload = false;
      if (d.hezb) { if (!me) { write('me', d.hezb); reload = true; } write(MEKEY, me && !same(me, d.hezb) ? me : d.hezb); }
      else if (me) write(MEKEY, me);
      // برای ثبت‌نام بعدی، نام و ایمیل حساب آماده باشد.
      if (d.name && !read('chlName', '')) write('chlName', d.name);
      if (d.email && !read('chlEmail', '')) write('chlEmail', d.email);
      if (reload) { if (window.hezbRestore) window.hezbRestore(); else { location.reload(); return d; } }
      if (addChl.length) window.chlRefresh?.();
      if (addReg.length) window.regReloadPublic?.();
      if (d.email_linked > 0) toast(`${fa(d.email_linked)} ثبت‌نام چله با ایمیل شما پیدا شد و به حساب اضافه شد.`);
      render();
      return d;
    })().catch(e => { console.warn(e); return null; }).finally(() => { syncing = null; if (again) { again = false; sync(); } });
    return syncing;
  }
  async function unlink(kind, code) { if (session.data) try { await rpc('acc_unlink', { p_kind: kind, p_code: code || null }); } catch {} }

  // ---------- برگه حساب ----------
  const css = `
.acs{position:fixed;inset:0;z-index:50;display:none;align-items:flex-end;justify-content:center;background:#0009}
.acs.show{display:flex}
.acs-box{width:100%;max-width:520px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border-top:3px solid var(--gold);border-radius:18px 18px 0 0;padding:0 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px #0006}
@media(min-width:700px){.acs{align-items:center}.acs-box{border-radius:14px;border:2px solid var(--gold)}}
.acs-grip{width:44px;height:5px;border-radius:3px;background:#d9cba9;margin:10px auto 4px}
.acs-top{display:flex;align-items:flex-start;gap:8px}
.acs-top h2{flex:1;margin:4px 0 0;font:normal 32px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.acs-top button{flex:none;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.acs-box p{margin:6px 0}
.acs-box label{display:block;font-weight:700;margin:12px 0 6px;color:var(--ink)}
.acs-box label small{font-weight:400;color:var(--muted)}
.acs-box input{width:100%}
.acs-box .acs-main{width:100%;height:54px;margin-top:14px;font-size:18px}
.acs-box .acs-alt{width:100%;height:48px;margin-top:8px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.acs-links{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 14px;margin-top:12px}
.acs-link{height:auto;padding:4px 0;background:none;border:0;color:var(--deep);text-decoration:underline;font-weight:600;font-size:15px}
.acs-link:hover{background:none}
.acs-note{background:#fff5d9;border-radius:var(--r-card);border:1px solid var(--gold);border-right:4px solid var(--deep);padding:8px 12px;margin:8px 0;font-size:15px;line-height:1.8}
.acs-why{margin:4px 0 0;padding:0 20px 0 0;font-size:15px;color:var(--muted)}
.acs-msg{min-height:22px;margin-top:8px;font-weight:700}
.acs-msg:empty{min-height:0}
.acs-ok{color:#006b50}.acs-bad{color:#9b2636}
.acs-pass{position:relative}
.acs-pass input{padding-left:64px}
.acs-pass button{position:absolute;left:4px;top:50%;transform:translateY(-50%);height:38px;padding:0 10px;background:none;border:0;color:var(--deep);font-size:14px;font-weight:600}
.acs-pass button:hover{background:none}
.acs-me{background:#fff;border-radius:var(--r-card);border:1px solid var(--gold);padding:10px 14px;margin:8px 0}
.acs-me b{color:var(--deep);font-size:19px}
.acs-me div{font-size:15px;color:var(--muted);direction:ltr;text-align:right}
.acs-count{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}
.acs-count span{background:var(--mint);border-radius:var(--r);border:1px solid #cfe3da;padding:6px 4px;text-align:center;font-size:14px;color:var(--deep)}
.acs-count b{display:block;font-size:22px}
.acs-sent{text-align:center;padding:6px 0}
.acs-sent i{display:flex;width:64px;height:64px;margin:6px auto;border-radius:50%;background:var(--emerald);color:#fff;font-style:normal;font-size:30px;align-items:center;justify-content:center;border:2px solid var(--gold)}
body.acs-lock{overflow:hidden}
.intro-acc[hidden],.intro-notice[hidden]{display:none!important}
#introAccTools{margin-top:10px}
.intro-acc{margin:14px 0 0;border-radius:var(--r-card);padding:8px 12px;background:rgba(0,92,69,.75);border:1px solid var(--gold);font-size:15px;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;justify-content:space-between}
.intro-acc button{height:auto;padding:0;background:none;border:0;color:#ffe2a8;text-decoration:underline;font-weight:500;font-size:15px}
.intro-acc button:hover{background:none}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let sheet = null, mode = 'login', note = '', after = null, prefill = {};
  function build() {
    if (sheet) return;
    sheet = document.createElement('div'); sheet.className = 'acs'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = '<div class="acs-box"><div class="acs-grip"></div><div class="acs-in"></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', onClick);
    sheet.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); sheet.querySelector('.acs-main')?.click(); } });
    window.addEventListener('popstate', () => { if (sheet.classList.contains('show') && !history.state?.acs) close(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('show')) { e.preventDefault(); close(); } });
  }
  function open(m, opts = {}) {
    build();
    mode = m || (session.data ? 'me' : 'login'); note = opts.note || ''; after = opts.after || null; prefill = opts.prefill || {};
    const was = sheet.classList.contains('show');
    sheet.classList.add('show'); document.body.classList.add('acs-lock');
    try { if (!was && !history.state?.acs) history.pushState({ acs: 1 }, ''); } catch {}
    draw();
    setTimeout(() => sheet.querySelector('input:not([type=hidden])')?.focus({ preventScroll: true }), 80);
  }
  function close(fromHistory) {
    if (!sheet?.classList.contains('show')) return;
    sheet.classList.remove('show');
    document.body.classList.remove('acs-lock');
    if (!fromHistory) { try { if (history.state?.acs) history.back(); } catch {} }
  }
  const top = t => `<div class="acs-top"><h2>${t}</h2><button type="button" data-close aria-label="بستن">✕</button></div>`;
  const pass = (id, label, ac) => `<label for="${id}">${label}</label><div class="acs-pass"><input id="${id}" type="password" dir="ltr" maxlength="72" autocomplete="${ac}"><button type="button" data-show="${id}">نمایش</button></div>`;
  const noteBox = () => (note ? `<div class="acs-note">${esc(note)}</div>` : '');
  function draw(extra) {
    const box = sheet.querySelector('.acs-in'), p = read(PKEY, {}) || {}, linked = read(LKEY, {}) || {};
    if (mode === 'login') {
      box.innerHTML = top('ورود به حساب') + noteBox() + `
<label for="acsId">ایمیل یا نام کاربری</label><input id="acsId" dir="ltr" maxlength="120" autocomplete="username" autocapitalize="off" spellcheck="false" value="${esc(prefill.email || read('accLastId', ''))}">
${pass('acsPass', 'رمز', 'current-password')}
<button type="button" class="acs-main" data-do="login">ورود</button><div class="acs-msg" id="acsMsg"></div>
<div class="acs-links"><button type="button" class="acs-link" data-mode="forgot">رمز را فراموش کرده‌ام</button><button type="button" class="acs-link" data-mode="signup">حساب ندارم، می‌خواهم بسازم</button></div>`;
    } else if (mode === 'signup') {
      box.innerHTML = top('ساخت حساب کاربری') + noteBox() + `
<p>با حساب کاربری، همه چله‌ها، دوره‌ها و گروه حزب‌خوانی شما روی هر گوشی و در برنامه یک‌جا دیده می‌شود و دیگر لازم نیست کدی را به خاطر بسپارید.</p>
<label for="acsName">نام و نام خانوادگی</label><input id="acsName" maxlength="60" autocomplete="name" value="${esc(prefill.name || read('chlName', ''))}" placeholder="مثلاً فاطمه رضایی">
<label for="acsUser">نام کاربری <small>(انگلیسی، برای ورود)</small></label><input id="acsUser" dir="ltr" maxlength="30" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="مثلاً fatemeh_rezaei">
<label for="acsEmail">ایمیل <small>(برای تأیید حساب و فراموشی رمز)</small></label><input id="acsEmail" type="email" inputmode="email" dir="ltr" maxlength="120" autocomplete="email" value="${esc(prefill.email || read('chlEmail', ''))}" placeholder="name@example.com">
<p class="chl-note" style="color:var(--muted);font-size:14px">اگر در چله‌ای با ایمیل ثبت‌نام کرده‌اید، همان ایمیل را بنویسید تا آن چله‌ها خودکار به حسابتان اضافه شوند.</p>
${pass('acsPass', `رمز <small>(دست‌کم ${fa(MIN_PASS)} حرف)</small>`, 'new-password')}
<button type="button" class="acs-main" data-do="signup">ساخت حساب</button><div class="acs-msg" id="acsMsg"></div>
<div class="acs-links"><button type="button" class="acs-link" data-mode="login">حساب دارم، می‌خواهم وارد شوم</button></div>`;
    } else if (mode === 'sent') {
      box.innerHTML = top(extra?.title || 'ایمیل را ببینید') + `<div class="acs-sent"><i>✉</i><p>${esc(extra?.text || '')}</p><p class="chl-note" style="color:var(--muted);font-size:14px">اگر ایمیل نرسید، پوشه Spam را هم ببینید.</p></div>
${extra?.email ? `<button type="button" class="acs-alt" data-do="resend" data-email="${esc(extra.email)}">فرستادن دوباره ایمیل تأیید</button>` : ''}
<button type="button" class="acs-main" data-mode="login">رفتن به ورود</button><div class="acs-msg" id="acsMsg"></div>`;
    } else if (mode === 'forgot') {
      box.innerHTML = top('فراموشی رمز') + `<p>ایمیل حساب را بنویسید تا لینک ساختن رمز تازه برایتان فرستاده شود.</p>
<label for="acsEmail">ایمیل</label><input id="acsEmail" type="email" inputmode="email" dir="ltr" maxlength="120" autocomplete="email" value="${esc(/@/.test(read('accLastId', '')) ? read('accLastId', '') : '')}">
<button type="button" class="acs-main" data-do="forgot">فرستادن لینک</button><div class="acs-msg" id="acsMsg"></div>
<div class="acs-links"><button type="button" class="acs-link" data-mode="login">بازگشت به ورود</button></div>`;
    } else if (mode === 'newpass') {
      box.innerHTML = top('رمز تازه') + `<p>رمز تازه حساب خود را بنویسید.</p>${pass('acsPass', `رمز تازه <small>(دست‌کم ${fa(MIN_PASS)} حرف)</small>`, 'new-password')}
<button type="button" class="acs-main" data-do="newpass">ذخیره رمز تازه</button><div class="acs-msg" id="acsMsg"></div>`;
    } else if (mode === 'edit') {
      box.innerHTML = top('ویرایش حساب') + `<label for="acsName">نام و نام خانوادگی</label><input id="acsName" maxlength="60" value="${esc(p.name || '')}">
<label for="acsUser">نام کاربری <small>(انگلیسی، برای ورود)</small></label><input id="acsUser" dir="ltr" maxlength="30" autocapitalize="off" spellcheck="false" value="${esc(p.username || '')}">
<button type="button" class="acs-main" data-do="edit">ذخیره</button>
<button type="button" class="acs-alt" data-mode="newpass">تغییر رمز</button>
<div class="acs-msg" id="acsMsg"></div><div class="acs-links"><button type="button" class="acs-link" data-mode="me">بازگشت</button></div>`;
    } else {
      const n = k => (Array.isArray(linked[k]) ? linked[k].length : 0);
      box.innerHTML = top('حساب من') + noteBox() + `<div class="acs-me"><b>${esc(p.name || 'بدون نام')}</b>${p.username ? `<div>@${esc(p.username)}</div>` : ''}<div>${esc(p.email || session.data?.user?.email || '')}</div></div>
<div class="acs-count"><span><b>${fa(n('chl'))}</b>چله و دوره</span><span><b>${fa(n('reg'))}</b>ثبت‌نام حزب‌خوانی</span><span><b>${linked.hezb ? fa(linked.hezb.id) : '–'}</b>${linked.hezb ? `شناسه گروه ${fa(linked.hezb.g)}` : 'گروه حزب‌خوانی'}</span></div>
<p class="chl-note" style="color:var(--muted);font-size:14px">هر چله یا ثبت‌نامی که روی این گوشی انجام دهید خودکار به حساب اضافه می‌شود. اگر کدی از قبل دارید، در «چله‌های من» بخش «کد چله دارید؟» بزنید.</p>
<button type="button" class="acs-main" data-do="mine">دیدن چله‌ها و گروه‌های من</button>
<button type="button" class="acs-alt" data-mode="edit">ویرایش نام، نام کاربری یا رمز</button>
<button type="button" class="acs-alt" data-do="logout">خروج از حساب</button>
<p class="chl-note" style="color:var(--muted);font-size:14px">با خروج، چله‌ها و گروه‌های حساب از این گوشی برداشته می‌شوند و با ورود دوباره برمی‌گردند.</p><div class="acs-msg" id="acsMsg"></div>`;
    }
  }
  const val = id => sheet.querySelector('#' + id)?.value || '';
  const say = (t, ok) => { const m = sheet.querySelector('#acsMsg'); if (m) { m.className = 'acs-msg ' + (ok ? 'acs-ok' : 'acs-bad'); m.textContent = t; } };
  async function busy(b, label, fn) {
    const old = b.textContent; b.disabled = true; b.textContent = label;
    try { await fn(); } catch (e) { say(e.message); } finally { if (b.isConnected) { b.disabled = false; b.textContent = old; } }
  }

  async function loggedIn(d, msg) {
    session.save(toSession(d));
    await sync();
    const cb = after; after = null;
    render();
    if (cb) { close(); setTimeout(cb, 250); return; }
    mode = 'me'; note = msg || 'وارد حساب شدید.'; draw();
  }
  async function onClick(e) {
    if (e.target === sheet || e.target.closest('[data-close]')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.show) { const i = sheet.querySelector('#' + b.dataset.show); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'نمایش' : 'پنهان'; return; }
    if (b.dataset.mode) { mode = b.dataset.mode; note = ''; draw(); setTimeout(() => sheet.querySelector('input')?.focus({ preventScroll: true }), 50); return; }
    const act = b.dataset.do; if (!act) return;
    if (act === 'login') return busy(b, 'در حال ورود…', async () => {
      const id = latin(val('acsId')), password = val('acsPass');
      if (!id || !password) return say('ایمیل یا نام کاربری و رمز را بنویسید.');
      write('accLastId', id);
      let d;
      if (id.includes('@')) d = await auth('token', { query: '?grant_type=password', body: { email: id.toLowerCase(), password } });
      else {
        let r;
        try { r = await fetch(`${cfg.SUPABASE_URL}/functions/v1/account-login`, { method: 'POST', headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: id.toLowerCase(), password }) }); }
        catch { throw Error('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'); }
        const x = await r.json().catch(() => ({}));
        if (r.status === 404 || r.status === 401 || x.error === 'setup') throw Error('ورود با نام کاربری هنوز راه‌اندازی نشده است؛ لطفاً با ایمیل وارد شوید.');
        if (!r.ok || !x.access_token) throw authError(x, r.status);
        d = x;
      }
      await loggedIn(d);
    });
    if (act === 'signup') return busy(b, 'در حال ساخت حساب…', async () => {
      const name = val('acsName').trim().replace(/\s+/g, ' '), username = latin(val('acsUser')).toLowerCase(), email = latin(val('acsEmail')).toLowerCase(), password = val('acsPass');
      if (name.length < 2) return say('نام خود را بنویسید (دست‌کم دو حرف).');
      if (!/^[a-z0-9_.]{3,30}$/.test(username)) return say(window.sbErrors.acc_bad_username);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say(ERRS.email_address_invalid);
      if (password.length < MIN_PASS || /^\d+$/.test(password)) return say(ERRS.weak_password);
      if (!(await window.sbRpc('acc_username_free', { p_username: username }))) return say(window.sbErrors.acc_username_taken);
      const d = await auth('signup', { query: `?redirect_to=${encodeURIComponent(siteUrl())}`, body: { email, password, data: { name, username } } });
      write('accLastId', email); write('chlName', read('chlName', '') || name);
      if (d.access_token) return loggedIn(d, 'حساب شما ساخته شد و وارد شدید.');
      // Supabase برای ایمیلی که قبلاً حساب دارد هم همین پاسخ را می‌دهد (بدون identities) تا ایمیل‌ها معلوم نشوند.
      const exists = Array.isArray(d.identities) && d.identities.length === 0;
      mode = 'sent'; draw(exists ? { title: 'حساب از قبل هست', text: ERRS.user_already_exists } : { title: 'ایمیل را تأیید کنید', text: `لینک تأیید به ${email} فرستاده شد. آن را باز کنید تا حساب فعال شود و وارد شوید.`, email });
    });
    if (act === 'resend') return busy(b, 'در حال فرستادن…', async () => {
      await auth('resend', { query: `?redirect_to=${encodeURIComponent(siteUrl())}`, body: { type: 'signup', email: b.dataset.email } });
      say('دوباره فرستاده شد.', true);
    });
    if (act === 'forgot') return busy(b, 'در حال فرستادن…', async () => {
      const email = latin(val('acsEmail')).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say(ERRS.email_address_invalid);
      await auth('recover', { query: `?redirect_to=${encodeURIComponent(siteUrl())}`, body: { email } });
      mode = 'sent'; draw({ title: 'ایمیل را ببینید', text: `اگر با ${email} حسابی ساخته شده باشد، لینک ساختن رمز تازه به آن فرستاده شد.` });
    });
    if (act === 'newpass') return busy(b, 'در حال ذخیره…', async () => {
      const password = val('acsPass');
      if (password.length < MIN_PASS || /^\d+$/.test(password)) return say(ERRS.weak_password);
      await auth('user', { method: 'PUT', token: await session.token(), body: { password } });
      mode = 'me'; note = 'رمز تازه ذخیره شد.'; draw();
    });
    if (act === 'edit') return busy(b, 'در حال ذخیره…', async () => {
      const name = val('acsName').trim().replace(/\s+/g, ' '), username = latin(val('acsUser')).toLowerCase();
      if (name.length < 2) return say('نام خود را بنویسید (دست‌کم دو حرف).');
      if (username && !/^[a-z0-9_.]{3,30}$/.test(username)) return say(window.sbErrors.acc_bad_username);
      const d = await rpc('acc_profile_save', { p_name: name, p_username: username || null });
      write(PKEY, Object.assign(read(PKEY, {}) || {}, { name: d.name, username: d.username }));
      render(); mode = 'me'; note = 'ذخیره شد.'; draw();
    });
    if (act === 'mine') { close(); setTimeout(showMine, 250); return; }
    if (act === 'logout') return busy(b, 'در حال خروج…', logout);
  }
  function showMine() {
    const el = ['chellehPanel', 'regPanel', 'hzTaskPanel'].map(id => document.getElementById(id)).find(x => x && !x.hidden && x.offsetParent !== null);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else toast('هنوز در چله یا گروهی ثبت‌نام نکرده‌اید. از منوی سه‌خط یکی را انتخاب کنید.');
  }
  async function logout() {
    const linked = read(LKEY, {}) || {}, token = session.data?.access_token;
    if (token) auth('logout', { token }).catch(() => {});
    write('chlCodes', read('chlCodes', []).filter(c => !(linked.chl || []).includes(c)));
    write('regCodes', read('regCodes', []).filter(c => !(linked.reg || []).includes(c)));
    if (linked.hezb && same(meOf(), linked.hezb)) write('me', null);
    session.clear();
    location.reload();
  }

  // ---------- برگشت از لینک ایمیل (تأیید حساب یا رمز تازه) ----------
  async function fromLink() {
    const h = location.hash.slice(1);
    if (!/(^|&)(access_token|error_code|error)=/.test(h)) return;
    const q = new URLSearchParams(h);
    try { history.replaceState(history.state, '', siteUrl() + location.search); } catch { location.hash = ''; }
    if (q.get('error') || q.get('error_code')) { open('login', { note: ERRS[q.get('error_code')] || ERRS.otp_expired }); return; }
    const d = { access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_at: +q.get('expires_at') || 0, expires_in: +q.get('expires_in') || 3600 };
    try { d.user = await auth('user', { method: 'GET', token: d.access_token }); } catch (e) { open('login', { note: e.message }); return; }
    session.save(toSession(d));
    if (q.get('type') === 'recovery') { open('newpass'); return; }
    await sync();
    open('me', { note: 'ایمیل شما تأیید شد و وارد حساب شدید.' });
  }

  // ---------- منو و صفحه اول ----------
  function render() {
    window.siteMenu?.refresh();
    const intro = document.getElementById('introPanel');
    if (!intro) return;
    // اطلاعیه «حساب کاربری بسازید» (index.html) دکمه ساختن حساب و ورود می‌گیرد؛ پس از ورود، جایش نام شخص می‌آید.
    const notice = intro.querySelector('.intro-notice'), p = read(PKEY, {}) || {};
    if (notice && !notice.dataset.orig) notice.dataset.orig = notice.innerHTML;
    if (!enabled()) {
      document.getElementById('introAcc')?.remove();
      if (notice && notice.dataset.acc) { notice.innerHTML = notice.dataset.orig; delete notice.dataset.acc; notice.hidden = false; }
      return;
    }
    if (notice && !notice.dataset.acc) {
      notice.dataset.acc = 1;
      notice.innerHTML = '<b>حساب کاربری بسازید</b><p>با ساختن حساب (نام کاربری و رمز)، همه چله‌ها، دوره‌ها و گروه حزب‌خوانی‌ای که در آن‌ها عضو شده‌اید، در سایت و در هر برنامه‌ای که استفاده می‌کنید یک‌جا دیده می‌شود و دیگر لازم نیست کدی را به خاطر بسپارید.</p>' + notice.dataset.orig.replace(/^[\s\S]*?<\/p>/, '');
    }
    let tools = document.getElementById('introAccTools'), bar = document.getElementById('introAcc');
    if (notice && !tools) {
      tools = document.createElement('div'); tools.id = 'introAccTools'; tools.className = 'intro-tools';
      tools.innerHTML = '<button type="button" data-acc="signup">ساخت حساب کاربری</button><button type="button" class="intro-light" data-acc="login">ورود به حساب</button>';
      notice.appendChild(tools);
    }
    if (!bar) { bar = document.createElement('div'); bar.id = 'introAcc'; bar.className = 'intro-acc'; (notice || intro.lastElementChild).before(bar); }
    if (notice) notice.hidden = !!session.data;
    bar.hidden = !session.data;
    bar.innerHTML = session.data ? `<span>👤 وارد شده‌اید: <b>${esc(p.name || p.username || session.data.user?.email || '')}</b></span><button type="button" data-acc="me">حساب من</button>` : '';
    if (!notice && !session.data) { bar.hidden = false; bar.innerHTML = '<span>حساب کاربری بسازید تا چله‌ها و گروه‌هایتان روی هر گوشی یک‌جا باشد.</span><button type="button" data-acc="signup">ساخت حساب</button><button type="button" data-acc="login">ورود</button>'; }
  }
  document.addEventListener('click', e => { const b = e.target.closest('#introAcc [data-acc],#introAccTools [data-acc]'); if (b) open(b.dataset.acc); });
  window.siteMenu?.section({
    id: 'account', order: -100,
    render(box) {
      if (!enabled()) return;
      const p = read(PKEY, {}) || {};
      box.innerHTML = session.data
        ? `<button type="button" class="sm-item" data-acc-menu="me"><span class="sm-ic">👤</span><span>${esc(p.name || 'حساب من')}<small>${esc(p.username ? '@' + p.username : p.email || '')} · حساب من</small></span><span class="sm-go">‹</span></button>`
        : `<button type="button" class="sm-item" data-acc-menu="login"><span class="sm-ic">👤</span><span>ورود یا ساخت حساب کاربری<small>همه چله‌ها و گروه‌های شما روی هر گوشی، بدون کد</small></span><span class="sm-go">‹</span></button>`;
      box.querySelector('[data-acc-menu]').onclick = ev => { const m = ev.currentTarget.dataset.accMenu; window.siteMenu.close(); setTimeout(() => open(m), 280); };
    }
  });

  let toastEl = null, toastT = 0;
  function toast(t) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;max-width:90vw;background:#1f1a14;color:#fff;padding:10px 18px;border:1px solid var(--gold);text-shadow:none;font-size:15px;text-align:center'; document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 4000);
  }

  // گروه و شناسه حزب‌خوانی تازه (home.js) هم به حساب برود.
  document.addEventListener('me:changed', () => sync());

  document.addEventListener('groups:loaded', render);
  setTimeout(render, 6000); // تنظیمات تازه سایت پس از حافظه موقت می‌رسد
  document.addEventListener('settings:changed', render);
  window.addEventListener('hashchange', render);

  window.account = {
    get enabled() { return enabled(); },
    get user() { return session.data ? Object.assign({ email: session.data.user?.email }, read(PKEY, {})) : null; },
    open, close, sync, unlink
  };
  render();
  fromLink();
  window.addEventListener('hashchange', fromLink);
  if (session.data) setTimeout(sync, 1200);
})();
