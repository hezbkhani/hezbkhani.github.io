// ثبت‌نام دوره جدید (تلگرام یا بله) و مدیریت آن، و ویرایش فهرست گروه‌ها از بخش مدیریت.
// فعلاً فقط در نمای پیش‌نمایش مدیر (آدرس با ‎#admin‎) نمایش داده می‌شود؛ برای انتشار عمومی، PREVIEW_ONLY را false کنید.
// داده‌ها در Supabase هستند؛ جدول‌ها و تابع‌ها در backend/supabase/registration.sql.
(function () {
  const PREVIEW_ONLY = true;
  const CAPACITY = 120;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  const PLATFORMS = { telegram: 'تلگرام', bale: 'بله' };
  const STATUS = { open: 'در حال ثبت‌نام', full: 'ظرفیت تکمیل شد', assigned: 'شناسه‌ها داده شد، هنوز اعلام نشده', announced: 'اعلام شد', closed: 'بسته شد' };
  const ERRORS = {
    round_not_open: 'ثبت‌نام این دوره بسته است یا ظرفیت آن تکمیل شده است.',
    round_not_found: 'این دوره پیدا نشد.',
    duplicate_name: 'این نام قبلاً در این دوره ثبت شده است. اگر شخص دیگری هستید، نام خانوادگی یا نام پدر را هم بنویسید.',
    bad_name: 'نام باید بین ۲ تا ۶۰ حرف باشد و نشانه‌هایی مثل < > نداشته باشد.',
    ids_already_assigned: 'شناسه‌ها داده شده است و انصراف از سایت دیگر ممکن نیست؛ لطفاً به مدیر گروه پیام دهید.',
    round_not_full: 'دوره هنوز به ۱۲۰ نفر نرسیده است.',
    ids_not_assigned: 'ابتدا شناسه‌ها را بدهید.',
    already_announced: 'این دوره اعلام شده است؛ برای تغییر نام‌ها از بخش «فهرست گروه‌ها» استفاده کنید.',
    not_admin: 'دسترسی مدیر لازم است. دوباره وارد شوید.',
    bad_input: 'تاریخ شروع و شماره گروه را وارد کنید.'
  };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => toFa(x);
  const dateFa = iso => { const [y, m, d] = iso.split('-').map(Number); return orderedDate(new Date(Date.UTC(y, m - 1, d, 12))); };
  const siteUrl = () => location.origin + location.pathname;

  // کدهای پیگیری این دستگاه
  const KEY = 'regCodes';
  const codes = {
    all() { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch { return []; } },
    save(a) { try { localStorage.setItem(KEY, JSON.stringify([...new Set(a)])); } catch {} },
    add(c) { this.save([c, ...this.all()]); },
    remove(c) { this.save(this.all().filter(x => x !== c)); }
  };

  async function api(path, { method = 'GET', body, token, prefer } = {}) {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw Error('اتصال به سرور تنظیم نشده است.');
    const headers = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${token || cfg.SUPABASE_ANON_KEY}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;
    let r;
    try { r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' }); }
    catch { throw Error('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'); }
    const text = await r.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) {
      const m = data?.message || '';
      if (r.status === 401 || /JWT/i.test(m)) throw Error('نشست مدیر منقضی شده است؛ دوباره وارد شوید.');
      throw Error(ERRORS[m] || 'انجام نشد. لطفاً دوباره تلاش کنید.');
    }
    return data;
  }
  const rpc = (fn, args, token) => api(`rpc/${fn}`, { method: 'POST', body: args || {}, token });

  const css = `
.reg-round{background:#fff;color:#000;text-shadow:none;border:1px solid var(--gold);padding:12px 14px;margin:12px 0}
.reg-round h3{margin:0 0 4px;font-size:19px;color:var(--deep)}
.reg-meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:15px;color:var(--muted)}
.reg-plat{display:inline-block;padding:0 10px;background:#e7f5f0;border:1px solid var(--gold);color:var(--deep);font-weight:600}
.reg-bar{height:8px;background:#eee4cf;margin:8px 0 10px;overflow:hidden}
.reg-bar span{display:block;height:100%;background:var(--emerald)}
.reg-round .row{margin-top:6px}
.reg-msg{min-height:22px;margin-top:6px;font-weight:700}
.reg-note{background:#e7f5f0;color:#00563f;text-shadow:none;border:1px solid var(--gold);padding:10px 14px;margin:12px 0;font-weight:600}
.reg-ok{color:#006b50}.reg-bad{color:#9b2636}
.reg-code{display:inline-block;direction:ltr;font-size:24px;letter-spacing:2px;font-weight:700;color:var(--deep);background:#fff5d9;padding:0 10px;border:1px dashed var(--gold)}
.reg-id{font-size:30px;font-weight:800;color:var(--deep)}
.reg-sub{margin:16px 0 4px;font-size:18px}
button.reg-light{background:#fff;color:var(--deep);border-color:var(--emerald)}
button.reg-danger{background:#9b2636}
.reg-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.reg-tools button{flex:1 1 auto}
.reg-list{max-height:360px;overflow:auto;border:1px solid #e6dcc6;margin-top:8px}
.reg-list div{display:flex;gap:8px;align-items:center;padding:4px 8px;border-bottom:1px solid #f0e8d6}
.reg-list div span{flex:1;min-width:0;overflow-wrap:anywhere}
.reg-list button{height:34px;padding:0 10px;font-size:14px}
.reg-n{flex:0 0 auto!important;min-width:2.4em;color:var(--muted)}
.reg-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}
.reg-grid label{margin:4px 0 0;font-weight:600;font-size:15px}
textarea.reg-names{width:100%;min-height:220px;font:inherit;font-size:16px;line-height:1.8;padding:8px;border:1px solid var(--gold);color:var(--ink);background:#fff}
pre.reg-text{white-space:pre-wrap;max-height:220px;overflow:auto;background:#fffaf0;border:1px solid #e6dcc6;padding:8px;font:inherit;font-size:15px;margin:8px 0}
.admin-block{margin-top:22px;padding-top:14px;border-top:1px solid var(--gold)}
.admin-block>h3{margin:0 0 6px;font-size:22px}
@media(max-width:600px){.reg-grid{grid-template-columns:1fr}}`;

  let panel, adminBlock, groupsBlock;

  // ---------- صفحه عمومی ----------
  function buildPublic() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    panel = document.createElement('section');
    panel.className = 'panel'; panel.id = 'registerPanel';
    panel.innerHTML = `<h2>ثبت نام دوره جدید</h2>
<div id="regRounds"><p class="hint">در حال دریافت…</p></div>
<div id="regMine"></div>
<details class="hint"><summary>کد پیگیری دارید؟ (برای دیدن شناسه یا انصراف از دستگاه دیگر)</summary>
<div class="row" style="margin-top:8px"><input id="regCodeIn" inputmode="numeric" placeholder="کد ۸ رقمی"><button type="button" id="regCodeBtn">پیگیری</button></div>
<div class="reg-msg" id="regCodeMsg"></div></details>`;
    const groupsPanel = document.getElementById('groupsNav')?.closest('.panel');
    document.querySelector('main').insertBefore(panel, groupsPanel || null);
    panel.querySelector('#regCodeBtn').onclick = async () => {
      const c = norm(regCodeIn.value).replace(/\D/g, ''), msg = panel.querySelector('#regCodeMsg');
      if (c.length !== 8) { msg.className = 'reg-msg reg-bad'; msg.textContent = 'کد پیگیری ۸ رقم است.'; return; }
      try {
        const a = await rpc('reg_lookup', { p_code: c });
        if (!a?.length) { msg.className = 'reg-msg reg-bad'; msg.textContent = 'ثبت‌نامی با این کد پیدا نشد.'; return; }
        codes.add(c); regCodeIn.value = ''; msg.textContent = ''; loadPublic();
      } catch (e) { msg.className = 'reg-msg reg-bad'; msg.textContent = e.message; }
    };
    panel.addEventListener('click', onPublicClick);
  }

  async function loadPublic() {
    const box = panel.querySelector('#regRounds');
    let rounds = [];
    try { rounds = await rpc('reg_rounds'); } catch (e) { box.innerHTML = `<p class="reg-msg reg-bad">${esc(e.message)}</p>`; }
    const live = rounds.filter(r => r.status !== 'closed');
    if (rounds.length || !box.querySelector('.reg-bad')) {
      box.innerHTML = live.length ? live.map(roundCard).join('') : '<p class="hint">در حال حاضر ثبت‌نامی باز نیست. زمان ثبت‌نام دوره بعد در گروه‌ها اعلام می‌شود.</p>';
    }
    await loadMine();
  }

  function roundCard(r) {
    const pct = Math.min(100, Math.round(r.registered / CAPACITY * 100));
    let body = '';
    if (r.status === 'open') body = `<label for="regName${r.id}">نام و نام خانوادگی</label><div class="row"><input id="regName${r.id}" maxlength="60" autocomplete="name" placeholder="مثلاً فاطمه رضایی"><button type="button" data-reg="${r.id}">ثبت نام</button></div><div class="reg-msg" id="regMsg${r.id}"></div>`;
    else if (r.status === 'announced') body = `<p class="hint">گروه تشکیل شد. تاریخ شروع: <strong>${esc(dateFa(r.start_date))}</strong>. اگر ثبت‌نام کرده‌اید، شناسه شما در «ثبت‌نام‌های من» یا با کد پیگیری دیده می‌شود.</p>`;
    else body = `<p class="hint">ظرفیت تکمیل شد. شناسه‌ها و تاریخ شروع به‌زودی اعلام می‌شود.</p>`;
    return `<div class="reg-round"><h3>${esc(r.title)}</h3><div class="reg-meta"><span class="reg-plat">${PLATFORMS[r.platform] || esc(r.platform)}</span><span>${fa(r.registered)} از ${fa(CAPACITY)} نفر</span><span>${STATUS[r.status]}</span></div><div class="reg-bar"><span style="width:${pct}%"></span></div>${body}</div>`;
  }

  async function loadMine() {
    const box = panel.querySelector('#regMine'), list = codes.all();
    if (!list.length) { box.innerHTML = ''; return; }
    const items = await Promise.all(list.map(async c => { try { const a = await rpc('reg_lookup', { p_code: c }); return { c, r: a?.[0] || null }; } catch { return { c, r: undefined }; } }));
    box.innerHTML = '<h3 class="reg-sub">ثبت‌نام‌های من</h3>' + items.map(({ c, r }) => {
      if (r === undefined) return `<div class="reg-round"><span class="hint">کد ${fa(c)}: دریافت وضعیت انجام نشد.</span></div>`;
      if (r === null) return `<div class="reg-round"><p class="hint">ثبت‌نام با کد ${fa(c)} دیگر وجود ندارد (انصراف داده‌اید یا مدیر آن را حذف کرده است).</p><button type="button" class="reg-light" data-forget="${c}">حذف از این فهرست</button></div>`;
      let s = `<div class="reg-round"><h3>${esc(r.name)}</h3><div class="reg-meta"><span class="reg-plat">${PLATFORMS[r.platform] || esc(r.platform)}</span><span>${esc(r.title)}</span><span>${STATUS[r.status]}</span></div>`;
      s += `<p class="hint">کد پیگیری: <span class="reg-code">${fa(c)}</span></p>`;
      if (r.status === 'announced' && r.participant_id) s += `<p>شناسه شما: <span class="reg-id">${fa(r.participant_id)}</span><br>تاریخ شروع: <strong>${esc(dateFa(r.start_date))}</strong></p><p class="hint">از روز شروع، با همین شناسه در بخش «شناسه و سهم روزانه» سهم خود را ببینید.</p>`;
      else if (r.status === 'open' || r.status === 'full') s += `<p class="hint">شما نفر ${fa(r.place)} از ${fa(r.registered)} ثبت‌نام‌کننده هستید. پس از تکمیل ظرفیت، شناسه و تاریخ شروع همین‌جا نشان داده می‌شود.</p><button type="button" class="reg-danger" data-unreg="${c}">انصراف از ثبت‌نام</button><div class="reg-msg" id="regUn${c}"></div>`;
      else if (r.status === 'assigned') s += '<p class="hint">شناسه‌ها داده شده و به‌زودی اعلام می‌شود.</p>';
      else s += `<button type="button" class="reg-light" data-forget="${c}">حذف از این فهرست</button>`;
      return s + '</div>';
    }).join('');
  }

  async function onPublicClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.reg) {
      const id = +b.dataset.reg, input = panel.querySelector('#regName' + id), msg = panel.querySelector('#regMsg' + id);
      const name = input.value.replace(/\s+/g, ' ').trim();
      if (name.length < 2) { msg.className = 'reg-msg reg-bad'; msg.textContent = 'نام خود را کامل بنویسید.'; return; }
      b.disabled = true; msg.className = 'reg-msg'; msg.textContent = 'در حال ثبت…';
      try {
        const a = await rpc('reg_register', { p_round: id, p_name: name });
        codes.add(a[0].code);
        await loadPublic();
        const m = panel.querySelector('#regMine');
        m.insertAdjacentHTML('afterbegin', `<p class="reg-note">ثبت‌نام «${esc(name)}» انجام شد. کد پیگیری <span class="reg-code">${fa(a[0].code)}</span> را یادداشت کنید؛ برای انصراف یا دیدن شناسه از دستگاه دیگر لازم است.</p>`);
        m.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) { msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false; }
    } else if (b.dataset.unreg) {
      const c = b.dataset.unreg, msg = panel.querySelector('#regUn' + c);
      if (!confirm('از ثبت‌نام در این دوره انصراف می‌دهید؟')) return;
      b.disabled = true;
      try { await rpc('reg_unregister', { p_code: c }); codes.remove(c); await loadPublic(); }
      catch (err) { msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false; }
    } else if (b.dataset.forget) { codes.remove(b.dataset.forget); loadMine(); }
  }

  // ---------- مدیریت: دوره‌های ثبت‌نام ----------
  const token = () => (typeof adminToken === 'string' ? adminToken : '');
  let adminRounds = [], adminRegs = [], openRound = null, dbGroups = [];

  function buildAdmin() {
    const host = document.getElementById('adminControls'); if (!host || adminBlock) return;
    adminBlock = document.createElement('div'); adminBlock.className = 'admin-block';
    adminBlock.innerHTML = `<h3>ثبت‌نام دوره جدید</h3>
<div class="reg-grid"><label>پیام‌رسان<select id="regNewPlat"><option value="telegram">تلگرام</option><option value="bale">بله</option></select></label>
<label>عنوان دوره<input id="regNewTitle" maxlength="80" placeholder="مثلاً دوره جدید گروه تلگرام"></label></div>
<div class="reg-tools"><button type="button" id="regNewBtn">شروع ثبت‌نام جدید</button><button type="button" class="reg-light" id="regReload">تازه‌سازی</button></div>
<div class="reg-msg" id="regAdminMsg"></div><div id="regAdminRounds"></div>`;
    groupsBlock = document.createElement('div'); groupsBlock.className = 'admin-block';
    groupsBlock.innerHTML = `<h3>فهرست گروه‌ها</h3><p class="hint" id="grpSource"></p><div class="reg-msg" id="grpMsg"></div><div id="grpList"></div>
<div class="reg-tools"><button type="button" class="reg-light" id="grpAdd">افزودن گروه</button></div>`;
    host.append(adminBlock, groupsBlock);
    const syncTitle = () => { regNewTitle.placeholder = `مثلاً دوره جدید گروه ${PLATFORMS[regNewPlat.value]}`; };
    regNewPlat.onchange = syncTitle; syncTitle();
    regNewBtn.onclick = createRound;
    regReload.onclick = () => { loadAdmin(); loadGroups(); };
    adminBlock.addEventListener('click', onAdminClick);
    groupsBlock.addEventListener('click', onGroupsClick);
    grpAdd.onclick = () => addGroupForm();
  }
  const amsg = (t, ok) => { const m = document.getElementById('regAdminMsg'); m.className = 'reg-msg ' + (ok ? 'reg-ok' : 'reg-bad'); m.textContent = t; };

  async function createRound() {
    const platform = regNewPlat.value, title = regNewTitle.value.trim() || `دوره جدید گروه ${PLATFORMS[platform]}`;
    const busy = adminRounds.find(r => r.platform === platform && ['open', 'full', 'assigned'].includes(r.status));
    if (busy && !confirm(`ثبت‌نام «${busy.title}» برای ${PLATFORMS[platform]} هنوز در جریان است. دوره دیگری هم شروع شود؟`)) return;
    regNewBtn.disabled = true;
    try { await api('registration_rounds', { method: 'POST', body: { platform, title }, token: token(), prefer: 'return=minimal' }); regNewTitle.value = ''; amsg('ثبت‌نام جدید باز شد.', true); await loadAdmin(); loadPublic(); }
    catch (e) { amsg(e.message); }
    regNewBtn.disabled = false;
  }

  async function loadAdmin() {
    if (!token()) return;
    try {
      [adminRounds, adminRegs] = await Promise.all([
        api('registration_rounds?select=*&order=created_at.desc', { token: token() }),
        api('registrations?select=id,round_id,name,code,participant_id,created_at&order=created_at,id', { token: token() })
      ]);
    } catch (e) { amsg(e.message); return; }
    renderAdmin();
  }

  function regsOf(id) { return adminRegs.filter(x => x.round_id === id); }

  function renderAdmin() {
    const box = document.getElementById('regAdminRounds');
    const live = adminRounds.filter(r => r.status !== 'closed'), old = adminRounds.filter(r => r.status === 'closed');
    box.innerHTML = (live.length ? live.map(adminCard).join('') : '<p class="hint">ثبت‌نام فعالی وجود ندارد.</p>') +
      (old.length ? `<details class="hint"><summary>دوره‌های بسته‌شده (${fa(old.length)})</summary>${old.map(adminCard).join('')}</details>` : '');
  }

  function adminCard(r) {
    const regs = regsOf(r.id), n = regs.length, pct = Math.min(100, Math.round(n / CAPACITY * 100)), expanded = openRound === r.id;
    let s = `<div class="reg-round" data-round="${r.id}"><h3>${esc(r.title)}</h3><div class="reg-meta"><span class="reg-plat">${PLATFORMS[r.platform]}</span><span>${fa(n)} از ${fa(CAPACITY)} نفر</span><span>${STATUS[r.status]}</span>${r.start_date ? `<span>شروع: ${esc(dateFa(r.start_date))}</span>` : ''}</div><div class="reg-bar"><span style="width:${pct}%"></span></div>`;
    s += '<div class="reg-tools">';
    s += `<button type="button" class="reg-light" data-a="toggle">${expanded ? 'بستن فهرست' : 'نمایش ثبت‌نام‌ها'}</button>`;
    if (r.status === 'open') s += '<button type="button" class="reg-light" data-a="invite">کپی متن دعوت</button>';
    if (r.status === 'full' || r.status === 'assigned') s += `<button type="button" data-a="assign">${r.status === 'assigned' ? 'دادن دوباره شناسه‌ها' : 'دادن شناسه ۱ تا ۱۲۰'}</button>`;
    if (r.status === 'announced') s += '<button type="button" data-a="copyAnn">کپی متن اعلام</button><button type="button" class="reg-light" data-a="file">دانلود فایل گروه</button>';
    if (r.status !== 'closed') s += `<button type="button" class="reg-danger" data-a="close">${r.status === 'announced' ? 'بایگانی' : 'بستن ثبت‌نام'}</button>`;
    s += '</div>';
    if (r.status === 'assigned' || r.status === 'announced') {
      const next = Math.max(0, ...groups.map(g => g.number), ...dbGroups.map(g => g.number)) + 1;
      const gnum = r.group_number || next, same = dbGroups.find(g => g.number === gnum) || groups.find(g => g.number === gnum);
      const gname = same?.name || `گروه ${PLATFORMS[r.platform]} ${fa(gnum)}`;
      s += `<div class="reg-grid" style="margin-top:10px"><label>تاریخ شروع<input type="date" data-f="start" value="${esc(r.start_date || '')}"></label><label>شماره گروه<input type="number" min="1" data-f="num" value="${gnum}"></label><label>نام گروه در سایت<input data-f="gname" maxlength="80" value="${esc(gname)}"></label></div>`;
      s += `<p class="hint">با «اعلام»، این ۱۲۰ نام با شناسه‌ها و تاریخ شروع به‌عنوان یک گروه در «فهرست گروه‌ها» ذخیره می‌شود و هر ثبت‌نام‌کننده شناسه خود را در سایت می‌بیند.${same && r.status !== 'announced' ? ' <strong>توجه: گروهی با این شماره وجود دارد و جایگزین می‌شود.</strong>' : ''}</p>`;
      s += `<div class="reg-tools"><button type="button" data-a="announce">${r.status === 'announced' ? 'به‌روزرسانی اعلام' : 'اعلام شناسه‌ها و تاریخ شروع'}</button></div>`;
    }
    s += `<div class="reg-msg" data-msg></div>`;
    if (expanded) {
      if (r.status === 'open') s += `<div class="row" style="margin-top:8px"><input data-f="add" maxlength="60" placeholder="افزودن نام توسط مدیر"><button type="button" data-a="add">افزودن</button></div>`;
      const ordered = r.status === 'assigned' || r.status === 'announced' ? [...regs].sort((a, b) => a.participant_id - b.participant_id) : regs;
      s += `<div class="reg-list">${ordered.length ? ordered.map((x, i) => `<div><span class="reg-n">${fa(x.participant_id || i + 1)}</span><span>${esc(x.name)}</span>${r.status === 'announced' ? '' : `<button type="button" class="reg-light" data-a="rename" data-id="${x.id}">ویرایش</button><button type="button" class="reg-danger" data-a="remove" data-id="${x.id}">حذف</button>`}</div>`).join('') : '<div><span>هنوز کسی ثبت‌نام نکرده است.</span></div>'}</div>`;
      if (r.status !== 'assigned' && r.status !== 'announced') s += '<p class="hint">عدد کنار هر نام، ترتیب ثبت‌نام است و هنگام دادن شناسه، همان شناسه فرد می‌شود.</p>';
    }
    return s + '</div>';
  }

  function announcementText(r) {
    const regs = regsOf(r.id).filter(x => x.participant_id).sort((a, b) => a.participant_id - b.participant_id);
    const g = dbGroups.find(x => x.number === r.group_number);
    return `بسم الله الرحمن الرحیم\n\nثبت‌نام «${r.title}» کامل شد و گروه ${g?.name ? `«${g.name}» ` : ''}تشکیل شد.\nتاریخ شروع: ${dateFa(r.start_date)}\n\nشناسه هر نفر، عدد کنار نام اوست:\n` +
      regs.map(x => `${fa(x.participant_id)}. ${x.name}`).join('\n') +
      `\n\nسهم روزانه را با شناسه خود در سایت ببینید:\n${siteUrl()}`;
  }
  function inviteText(r) {
    return `بسم الله الرحمن الرحیم\n\nثبت‌نام «${r.title}» (${PLATFORMS[r.platform]}) آغاز شد.\nظرفیت: ${fa(CAPACITY)} نفر. برای ثبت‌نام، نام خود را در سایت وارد کنید:\n${siteUrl()}`;
  }
  async function copy(text, msgEl) {
    try { await navigator.clipboard.writeText(text); msgEl.className = 'reg-msg reg-ok'; msgEl.textContent = 'متن کپی شد؛ آن را در گروه بفرستید.'; }
    catch { msgEl.className = 'reg-msg'; msgEl.innerHTML = `<pre class="reg-text">${esc(text)}</pre>`; }
  }
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  async function onAdminClick(e) {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const card = b.closest('[data-round]'), id = +card.dataset.round, r = adminRounds.find(x => x.id === id), msg = card.querySelector('[data-msg]');
    const fail = err => { msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false; };
    const done = async () => { await loadAdmin(); loadPublic(); };
    const a = b.dataset.a;
    if (a === 'toggle') { openRound = openRound === id ? null : id; renderAdmin(); return; }
    if (a === 'invite') return copy(inviteText(r), msg);
    if (a === 'copyAnn') return copy(announcementText(r), msg);
    if (a === 'file') { const g = dbGroups.find(x => x.number === r.group_number); const regs = regsOf(id).sort((p, q) => p.participant_id - q.participant_id); return download(`group-${r.group_number}.txt`, [r.start_date, ...(g ? g.names : regs.map(x => x.name))].join('\n') + '\n'); }
    b.disabled = true;
    try {
      if (a === 'close') {
        if (!confirm(r.status === 'announced' ? 'این دوره بایگانی شود؟ (گروه ساخته‌شده در سایت می‌ماند.)' : 'ثبت‌نام این دوره بسته شود؟ ثبت‌نام‌کنندگان دیگر نمی‌توانند ثبت‌نام یا انصراف دهند.')) { b.disabled = false; return; }
        await api(`registration_rounds?id=eq.${id}`, { method: 'PATCH', body: { status: 'closed' }, token: token(), prefer: 'return=minimal' });
      } else if (a === 'assign') {
        if (r.status === 'assigned' && !confirm('شناسه‌ها دوباره به ترتیب ثبت‌نام داده شود؟')) { b.disabled = false; return; }
        await rpc('reg_assign_ids', { p_round: id }, token());
      } else if (a === 'announce') {
        const start = card.querySelector('[data-f=start]').value, num = +card.querySelector('[data-f=num]').value, gname = card.querySelector('[data-f=gname]').value.trim();
        if (!start || !(num >= 1)) { fail(Error(ERRORS.bad_input)); return; }
        if (!confirm(`گروه شماره ${fa(num)} با نام «${gname}» و تاریخ شروع ${dateFa(start)} ساخته شود و شناسه‌ها اعلام شود؟`)) { b.disabled = false; return; }
        await rpc('reg_announce', { p_round: id, p_start: start, p_group_number: num, p_group_name: gname }, token());
        await loadGroups();
      } else if (a === 'add') {
        const inp = card.querySelector('[data-f=add]'); if (inp.value.trim().length < 2) { fail(Error(ERRORS.bad_name)); return; }
        await rpc('reg_admin_add', { p_round: id, p_name: inp.value }, token());
      } else if (a === 'remove') {
        const x = adminRegs.find(y => y.id === +b.dataset.id);
        if (!confirm(`«${x.name}» از این دوره حذف شود؟${r.status === 'assigned' ? ' شناسه‌ها پاک می‌شوند و باید دوباره داده شوند.' : ''}`)) { b.disabled = false; return; }
        await rpc('reg_admin_remove', { p_id: x.id }, token());
      } else if (a === 'rename') {
        const x = adminRegs.find(y => y.id === +b.dataset.id), name = prompt('نام درست را بنویسید:', x.name);
        if (!name || name.trim() === x.name) { b.disabled = false; return; }
        if (name.trim().length < 2 || /[<>{}"\\`]/.test(name)) { fail(Error(ERRORS.bad_name)); return; }
        await api(`registrations?id=eq.${x.id}`, { method: 'PATCH', body: { name: name.replace(/\s+/g, ' ').trim() }, token: token(), prefer: 'return=minimal' });
      }
      await done();
    } catch (err) { fail(err); }
  }

  // ---------- مدیریت: فهرست گروه‌ها ----------
  async function loadGroups() {
    if (!token()) return;
    const src = document.getElementById('grpSource');
    try { dbGroups = await api('site_groups?select=*&order=number', { token: token() }); }
    catch (e) { src.textContent = e.message; return; }
    src.innerHTML = dbGroups.length
      ? `این فهرست در پایگاه داده است. ${window.groupsSource === 'db' ? 'این صفحه (پیش‌نمایش) گروه‌ها را از همین فهرست نشان می‌دهد.' : 'این صفحه هنوز از فایل‌ها خوانده شده است؛ صفحه را تازه کنید.'} بازدیدکنندگان عادی تا زمان انتشار، همچنان فایل‌های پوشه groups را می‌بینند.`
      : 'فهرست گروه‌ها هنوز در پایگاه داده نیست و سایت از فایل‌های پوشه groups می‌خواند. با دکمه زیر، گروه‌های فعلی سایت را یک‌بار به پایگاه داده منتقل کنید تا از همین‌جا قابل ویرایش شوند.';
    const list = document.getElementById('grpList');
    list.innerHTML = dbGroups.length ? dbGroups.map(g => groupForm(g)).join('') : `<div class="reg-tools"><button type="button" data-g="import">انتقال ${fa(groups.length)} گروه فعلی سایت به پایگاه داده</button></div>`;
    if (adminRounds.length) renderAdmin();
  }

  function groupForm(g, isNew) {
    return `<div class="reg-round" data-gnum="${isNew ? '' : g.number}"><div class="reg-grid">
<label>شماره<input type="number" min="1" data-f="number" value="${g.number}" ${isNew ? '' : 'disabled'}></label>
<label>نام گروه<input data-f="name" maxlength="80" value="${esc(g.name)}"></label>
<label>تاریخ شروع<input type="date" data-f="start" value="${esc(g.start_date || '')}"></label>
<label class="checkline" style="margin:auto 0 0"><input type="checkbox" data-f="visible" ${g.visible !== false ? 'checked' : ''}> در سایت نشان داده شود</label></div>
<label>نام‌ها (هر خط یک نام، به ترتیب شناسه ۱ تا ۱۲۰) · <span data-count></span></label>
<textarea class="reg-names" data-f="names">${esc((g.names || []).join('\n'))}</textarea>
<div class="reg-tools"><button type="button" data-g="save">ذخیره</button><button type="button" class="reg-light" data-g="file">دانلود فایل</button>${isNew ? '<button type="button" class="reg-light" data-g="cancel">انصراف</button>' : ''}</div><div class="reg-msg" data-msg></div></div>`;
  }
  const lines = t => t.split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  function countLines(form) { const n = lines(form.querySelector('[data-f=names]').value).length, c = form.querySelector('[data-count]'); c.textContent = `${fa(n)} نام`; c.style.color = n === 120 ? '' : '#9b2636'; }
  function addGroupForm() {
    const num = Math.max(0, ...dbGroups.map(g => g.number), ...groups.map(g => g.number)) + 1;
    const list = document.getElementById('grpList'); list.insertAdjacentHTML('beforeend', groupForm({ number: num, name: '', names: [], visible: true }, true));
    const f = list.lastElementChild; countLines(f); f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function onGroupsClick(e) {
    const b = e.target.closest('button[data-g]'); if (!b) return;
    const f = b.closest('[data-gnum]'), msg = f?.querySelector('[data-msg]') || document.getElementById('grpMsg');
    const fail = err => { msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false; };
    if (b.dataset.g === 'import') {
      if (!confirm(`${fa(groups.length)} گروه فعلی سایت به پایگاه داده منتقل شود؟`)) return;
      b.disabled = true;
      const iso = ms => new Date(ms).toISOString().slice(0, 10);
      try { await api('site_groups', { method: 'POST', body: groups.map(g => ({ number: g.number, name: g.name, start_date: iso(g.start), names: g.names, visible: true })), token: token(), prefer: 'resolution=ignore-duplicates,return=minimal' }); await loadGroups(); }
      catch (err) { fail(err); }
      return;
    }
    if (b.dataset.g === 'cancel') { f.remove(); return; }
    const val = k => f.querySelector(`[data-f=${k}]`);
    const names = lines(val('names').value), start = val('start').value, name = val('name').value.trim(), number = +val('number').value;
    if (b.dataset.g === 'file') return download(`group-${number}.txt`, [start, ...names].join('\n') + '\n');
    if (!(number >= 1) || !name || !start) return fail(Error('شماره، نام و تاریخ شروع را وارد کنید.'));
    if (names.length !== 120) return fail(Error(`باید دقیقاً ۱۲۰ نام باشد؛ اکنون ${fa(names.length)} نام است.`));
    const isNew = !f.dataset.gnum;
    if (isNew && dbGroups.some(g => g.number === number)) return fail(Error('گروهی با این شماره وجود دارد.'));
    b.disabled = true;
    try {
      const body = { name, start_date: start, names, visible: val('visible').checked, updated_at: new Date().toISOString() };
      if (isNew) await api('site_groups', { method: 'POST', body: { number, ...body }, token: token(), prefer: 'return=minimal' });
      else await api(`site_groups?number=eq.${number}`, { method: 'PATCH', body, token: token(), prefer: 'return=minimal' });
      await loadGroups();
      const nf = document.querySelector(`[data-gnum="${number}"] [data-msg]`); if (nf) { nf.className = 'reg-msg reg-ok'; nf.textContent = 'ذخیره شد. برای دیدن تغییر در بالای صفحه، صفحه را تازه کنید.'; }
    } catch (err) { fail(err); }
  }

  // ---------- راه‌اندازی ----------
  let started = false;
  function show() {
    if (!enabled()) { if (panel) panel.hidden = true; return; }
    if (!started) {
      started = true; buildPublic();
      const ctl = document.getElementById('adminControls');
      if (ctl) new MutationObserver(() => { if (!ctl.hidden && token()) { buildAdmin(); loadAdmin(); loadGroups(); } }).observe(ctl, { attributes: true, attributeFilter: ['hidden'] });
      document.addEventListener('input', e => { const f = e.target.closest?.('[data-gnum]'); if (f && e.target.matches('[data-f=names]')) countLines(f); });
    }
    panel.hidden = false; loadPublic();
  }
  // شمارش نام‌ها برای فرم‌های تازه ساخته‌شده
  new MutationObserver(() => document.querySelectorAll('#grpList [data-gnum]').forEach(f => { if (!f.dataset.counted) { f.dataset.counted = 1; countLines(f); } }))
    .observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', show);
  show();
})();
