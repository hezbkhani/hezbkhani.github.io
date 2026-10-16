// ثبت‌نام دوره جدید (تلگرام یا بله): بخش عمومی برای ثبت‌نام و انصراف، و زبانه «ثبت‌نام» در بخش مدیریت.
// در صفحه اول فقط «ثبت‌نام‌های من» دیده می‌شود؛ دوره‌های باز با زدن «ثبت‌نام دوره حزب‌خوانی» در منو (window.regOpenPublic) نشان داده می‌شوند.
// اگر مدیر در «تنظیمات» بخش ثبت‌نام را پنهان کرده باشد، دوره‌ها اصلاً نشان داده نمی‌شوند.
// داده‌ها در Supabase هستند؛ جدول‌ها و تابع‌ها در backend/supabase/registration.sql. به admin.js نیاز دارد.
(function () {
  const CAPACITY = 120;
  const PLATFORMS = { telegram: 'تلگرام', bale: 'بله' };
  const STATUS = { open: 'در حال ثبت‌نام', full: 'ظرفیت تکمیل شد', assigned: 'شناسه‌ها داده شد، هنوز اعلام نشده', announced: 'اعلام شد', closed: 'بسته شد' };
  Object.assign(window.sbErrors, {
    round_not_open: 'ثبت‌نام این دوره بسته است یا ظرفیت آن تکمیل شده است.',
    round_not_found: 'این دوره پیدا نشد.',
    duplicate_name: 'این نام قبلاً در این دوره ثبت شده است. اگر شخص دیگری هستید، نام خانوادگی یا نام پدر را هم بنویسید.',
    bad_name: 'نام باید بین ۲ تا ۶۰ حرف باشد و نشانه‌هایی مثل < > نداشته باشد.',
    ids_already_assigned: 'شناسه‌ها داده شده است و انصراف از سایت دیگر ممکن نیست؛ لطفاً به مدیر گروه پیام دهید.',
    round_closed: 'این دوره بسته شده است؛ برای انصراف به مدیر گروه پیام دهید.',
    round_not_full: 'دوره هنوز به ۱۲۰ نفر نرسیده است.',
    ids_not_assigned: 'ابتدا شناسه‌ها را بدهید.',
    already_announced: 'این دوره اعلام شده است؛ برای تغییر نام‌ها از زبانه «گروه‌ها» استفاده کنید.',
    bad_input: 'تاریخ شروع و شماره گروه را وارد کنید.',
    too_many_attempts: 'تعداد کدهای نادرست از این اینترنت زیاد بوده است. لطفاً یک ساعت دیگر دوباره امتحان کنید.'
  });
  const api = window.sbApi, rpc = window.sbRpc;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => toFa(x);
  const dateFa = iso => (iso ? J.label(iso) : '');
  const siteUrl = () => location.origin + location.pathname;
  const isAdminView = () => location.hash === '#admin';

  // کدهای پیگیری این دستگاه
  const KEY = 'regCodes';
  const codes = {
    all() { try { const a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch { return []; } },
    save(a) { try { localStorage.setItem(KEY, JSON.stringify([...new Set(a)])); } catch {} },
    add(c) { this.save([c, ...this.all()]); },
    remove(c) { this.save(this.all().filter(x => x !== c)); }
  };

  const css = `
.reg-round{background:#fff;color:#000;text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:12px 14px;margin:12px 0}
.reg-round h3{margin:0 0 4px;font-size:19px;color:var(--deep)}
.reg-round .hint,.reg-round label{color:var(--muted);text-shadow:none}
.reg-round label{color:var(--ink);font-weight:600;font-size:15px;margin:10px 0 4px}
.reg-meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:15px;color:var(--muted)}
.reg-plat{display:inline-block;padding:0 12px;border-radius:var(--pill);background:var(--mint);border:1px solid var(--gold);color:var(--deep);font-weight:600}
.reg-bar{height:8px;background:#eee4cf;margin:8px 0 10px;overflow:hidden;border-radius:var(--pill)}
.reg-bar span{display:block;height:100%;background:var(--emerald)}
.reg-round .row{margin-top:6px}
.reg-msg{min-height:22px;margin-top:6px;font-weight:700}
.reg-note{background:var(--mint);color:var(--deep);text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:12px 0;font-weight:600}
.reg-ok{color:var(--ok)}.reg-bad{color:var(--danger)}
.reg-code{display:inline-block;direction:ltr;font-size:24px;letter-spacing:2px;font-weight:700;color:var(--deep);background:var(--cream);padding:0 10px;border:1px dashed var(--gold);border-radius:6px}
.reg-id{font-size:30px;font-weight:800;color:var(--deep)}
.reg-sub{margin:16px 0 4px;font-size:18px}
button.reg-danger{background:var(--danger)}
.reg-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.reg-tools button{flex:1 1 auto}
.reg-list{max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:var(--r);margin-top:8px}
.reg-list div{display:flex;gap:8px;align-items:center;padding:4px 8px;border-bottom:1px solid #f0e8d6}
.reg-list div span{flex:1;min-width:0;overflow-wrap:anywhere}
.reg-list button{height:34px;padding:0 10px;font-size:14px}
.reg-n{flex:0 0 auto!important;min-width:2.4em;color:var(--muted)}
.reg-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}
.reg-step{margin:12px 0 0;padding-top:10px;border-top:1px dashed var(--gold)}
.reg-step b{color:var(--deep)}
pre.reg-text{white-space:pre-wrap;max-height:220px;overflow:auto;background:#fffaf0;border:1px solid var(--line);border-radius:var(--r);padding:8px;font:inherit;font-size:15px;margin:8px 0}
@media(max-width:600px){.reg-grid{grid-template-columns:1fr}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
  window.regDownload = function (name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // ---------- بخش عمومی ----------
  const panel = document.createElement('section');
  panel.className = 'panel'; panel.id = 'registerPanel'; panel.hidden = true;
  panel.innerHTML = `<h2>ثبت‌نام دوره جدید</h2>
<div id="regRounds"></div>
<div id="regMine"></div>
<details class="hint"><summary>کد پیگیری دارید؟ (برای دیدن شناسه یا انصراف از دستگاه دیگر)</summary>
<div class="row" style="margin-top:8px"><input id="regCodeIn" inputmode="numeric" placeholder="کد ۸ رقمی"><button type="button" id="regCodeBtn">پیگیری</button></div>
<div class="reg-msg" id="regCodeMsg"></div></details>`;
  const groupsPanel = document.getElementById('groupsNav')?.closest('.panel');
  document.querySelector('main').insertBefore(panel, groupsPanel || null);
  const $p = s => panel.querySelector(s);

  $p('#regCodeBtn').onclick = async () => {
    const c = norm($p('#regCodeIn').value).replace(/\D/g, ''), msg = $p('#regCodeMsg');
    if (c.length !== 8) { msg.className = 'reg-msg reg-bad'; msg.textContent = 'کد پیگیری ۸ رقم است.'; return; }
    try {
      const a = await rpc('reg_lookup', { p_code: c });
      if (!a?.length) { msg.className = 'reg-msg reg-bad'; msg.textContent = 'ثبت‌نامی با این کد پیدا نشد.'; return; }
      codes.add(c); $p('#regCodeIn').value = ''; msg.textContent = ''; loadPublic(); window.account?.sync();
    } catch (e) { msg.className = 'reg-msg reg-bad'; msg.textContent = e.message; }
  };
  panel.addEventListener('click', onPublicClick);

  let expanded = false; // دوره‌های باز از منو خواسته شده
  async function loadPublic() {
    const box = $p('#regRounds');
    let rounds = null, error = '';
    try { rounds = await rpc('reg_rounds'); } catch (e) { error = e.message; }
    const live = (rounds || []).filter(r => r.status !== 'closed');
    const hidden = (window.siteSettings?.registration?.mode || 'auto') === 'hidden';
    const mine = error ? [] : await lookupMine();
    window.regHasOpen = !hidden && !error && live.length > 0; window.siteMenu?.refresh();
    // بازدیدکنندگان عادی: ثبت‌نام‌های خودشان، و دوره‌های باز فقط وقتی از منو خواسته باشند (و مدیر پنهانش نکرده باشد).
    const showRounds = isAdminView() || (expanded && !hidden);
    panel.hidden = !isAdminView() && (hidden || !showRounds && !mine.length);
    panel.querySelector('h2').textContent = showRounds ? 'ثبت‌نام دوره جدید' : 'ثبت‌نام‌های حزب‌خوانی من';
    if (panel.hidden) return;
    if (!showRounds) { box.innerHTML = ''; renderMine(mine, false); return; }
    let note = '';
    if (isAdminView() && hidden) note = '<p class="reg-note">این بخش اکنون برای بازدیدکنندگان پنهان است (تنظیمات › بخش ثبت‌نام).</p>';
    if (error) box.innerHTML = note + `<p class="reg-msg reg-bad">${esc(error)}</p>`;
    else box.innerHTML = note + (live.length ? live.map(roundCard).join('') : '<p class="hint">در حال حاضر ثبت‌نامی باز نیست. زمان ثبت‌نام دوره بعد در گروه‌ها اعلام می‌شود.</p>');
    renderMine(mine, true);
  }
  window.regReloadPublic = loadPublic;
  window.regOpenPublic = async () => {
    expanded = true; await loadPublic();
    if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function roundCard(r) {
    const pct = Math.min(100, Math.round(r.registered / CAPACITY * 100));
    const start = r.start_date ? `<p class="hint">${r.status === 'announced' ? 'تاریخ شروع' : 'تاریخ شروع (پیش‌بینی)'}: <strong>${esc(dateFa(r.start_date))}</strong></p>` : '';
    const slots = r.reserve_slots ?? 0, res = r.reserved ?? 0, mainFull = r.registered >= CAPACITY;
    const form = label => `<label for="regName${r.id}">نام و نام خانوادگی</label><div class="row"><input id="regName${r.id}" maxlength="60" autocomplete="name" placeholder="مثلاً فاطمه رضایی"><button type="button" data-reg="${r.id}">${label}</button></div><div class="reg-msg" id="regMsg${r.id}"></div>`;
    let body = '';
    if (!mainFull) body = (r.status === 'open' ? '' : '<p class="hint">یک جای خالی در گروه هست؛ با ثبت‌نام، همان شناسه به شما داده می‌شود.</p>') + form('ثبت‌نام');
    else if (res < slots) body = `<p class="hint">ظرفیت ${fa(CAPACITY)} نفر تکمیل شد. ${fa(slots - res)} جا در فهرست رزرو مانده است؛ اگر کسی انصراف دهد، نفرات رزرو به ترتیب جای او و شناسه‌اش را می‌گیرند.</p>` + form('ثبت در فهرست رزرو');
    else if (r.status === 'announced') body = '<p class="hint">گروه تشکیل شد. اگر ثبت‌نام کرده‌اید، شناسه شما در «ثبت‌نام‌های من» یا با کد پیگیری دیده می‌شود.</p>';
    else body = '<p class="hint">ظرفیت تکمیل شد. شناسه‌ها به‌زودی اعلام می‌شود.</p>';
    return `<div class="reg-round"><h3>${esc(r.title)}</h3><div class="reg-meta"><span class="reg-plat">${PLATFORMS[r.platform] || esc(r.platform)}</span><span>${fa(r.registered)} از ${fa(CAPACITY)} نفر</span>${mainFull && slots ? `<span>رزرو: ${fa(res)} از ${fa(slots)}</span>` : ''}<span>${STATUS[r.status]}</span></div><div class="reg-bar"><span style="width:${pct}%"></span></div>${start}${body}</div>`;
  }

  // ثبت‌نام‌های این دستگاه؛ کدِ دوره‌های حذف‌شده یا بسته‌شده خودکار فراموش می‌شود.
  async function lookupMine() {
    const items = await Promise.all(codes.all().map(async c => { try { const a = await rpc('reg_lookup', { p_code: c }); return { c, r: a?.[0] || null }; } catch { return { c, r: undefined }; } }));
    items.filter(x => x.r === null || x.r?.status === 'closed').forEach(x => codes.remove(x.c));
    return items.filter(x => x.r !== null && x.r?.status !== 'closed');
  }
  function renderMine(items, withTitle) {
    const box = $p('#regMine');
    if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = (withTitle ? '<h3 class="reg-sub">ثبت‌نام‌های من</h3>' : '') + items.map(({ c, r }) => {
      if (r === undefined) return `<div class="reg-round"><span class="hint">کد ${fa(c)}: دریافت وضعیت انجام نشد.</span></div>`;
      let s = `<div class="reg-round"><h3>${esc(r.name)}</h3><div class="reg-meta"><span class="reg-plat">${PLATFORMS[r.platform] || esc(r.platform)}</span><span>${esc(r.title)}</span><span>${STATUS[r.status]}</span></div>`;
      if (r.promoted) s += '<p class="reg-note">یک نفر انصراف داد و شما از فهرست رزرو به گروه اضافه شدید.</p>';
      s += `<p class="hint">کد پیگیری: <span class="reg-code">${fa(c)}</span></p>`;
      if (r.reserve) s += `<p class="hint">شما نفر ${fa(r.reserve_place)} فهرست رزرو هستید. اگر یکی از ${fa(CAPACITY)} نفر انصراف دهد، نفرات رزرو به ترتیب جای او را می‌گیرند و شناسه شما همین‌جا نشان داده می‌شود.</p>`;
      else if (r.status === 'announced' && r.participant_id) s += `<p>شناسه شما: <span class="reg-id">${fa(r.participant_id)}</span><br>تاریخ شروع: <strong>${esc(dateFa(r.start_date))}</strong></p><p class="hint">از روز شروع، با همین شناسه در بخش «شناسه و سهم روزانه» سهم خود را ببینید.</p>`;
      else if (r.status === 'open' || r.status === 'full') s += `<p class="hint">شما نفر ${fa(r.place)} از ${fa(r.registered)} ثبت‌نام‌کننده هستید.${r.start_date ? ` شروع دوره (پیش‌بینی): ${esc(dateFa(r.start_date))}.` : ''} پس از تکمیل ظرفیت، شناسه شما همین‌جا نشان داده می‌شود.</p>`;
      else if (r.status === 'assigned') s += '<p class="hint">شناسه‌ها داده شده و به‌زودی اعلام می‌شود.</p>';
      const inGroup = !r.reserve && (r.status === 'assigned' || r.status === 'announced');
      s += `<button type="button" class="reg-danger" data-unreg="${c}" data-ingroup="${inGroup ? 1 : ''}">${r.reserve ? 'انصراف از فهرست رزرو' : inGroup ? 'انصراف از گروه' : 'انصراف از ثبت‌نام'}</button><div class="reg-msg" id="regUn${c}"></div>`;
      return s + '</div>';
    }).join('');
    // کارت اعلان (reminders.js)
    document.dispatchEvent(new Event('reg:mine'));
  }

  async function onPublicClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.reg) {
      const id = +b.dataset.reg, input = $p('#regName' + id), msg = $p('#regMsg' + id);
      const name = input.value.replace(/\s+/g, ' ').trim();
      if (name.length < 2) { msg.className = 'reg-msg reg-bad'; msg.textContent = 'نام خود را کامل بنویسید.'; return; }
      b.disabled = true; msg.className = 'reg-msg'; msg.textContent = 'در حال ثبت…';
      try {
        const a = await rpc('reg_register', { p_round: id, p_name: name });
        codes.add(a[0].code);
        await loadPublic();
        window.account?.sync();
        const m = $p('#regMine');
        m.insertAdjacentHTML('afterbegin', `<p class="reg-note">ثبت‌نام «${esc(name)}» انجام شد. کد پیگیری <span class="reg-code">${fa(a[0].code)}</span> را یادداشت کنید؛ برای انصراف یا دیدن شناسه از دستگاه دیگر لازم است.</p>${window.sitePush?.hint() || ''}`);
        m.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.regAdminReload) window.regAdminReload();
      } catch (err) {
        msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false;
        // نام تکراری: شاید خود او قبلاً ثبت‌نام کرده؛ با ورود به حساب یا «کد پیگیری دارید؟» پایین همین بخش پیدا می‌شود.
        if (err.message === window.sbErrors.duplicate_name && window.account?.enabled && !window.account.user) msg.insertAdjacentHTML('beforeend', ' <button type="button" class="reg-light" data-acc-open>اگر خودتان هستید، وارد حساب شوید</button>');
      }
    } else if (b.hasAttribute('data-acc-open')) { window.account?.open('login');
    } else if (b.dataset.unreg) {
      const c = b.dataset.unreg, msg = $p('#regUn' + c);
      if (!confirm(b.dataset.ingroup ? 'از گروه انصراف می‌دهید؟ شناسه شما به نفر اول فهرست رزرو داده می‌شود و این کار برگشت ندارد.' : 'از ثبت‌نام در این دوره انصراف می‌دهید؟')) return;
      b.disabled = true;
      try { await rpc('reg_unregister', { p_code: c }); codes.remove(c); await loadPublic(); if (window.regAdminReload) window.regAdminReload(); }
      catch (err) { msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false; }
    }
  }

  // ---------- مدیریت: زبانه «ثبت‌نام» ----------
  let pane = null, adminRounds = [], adminRegs = [], openRound = null, editRound = null;

  function buildAdmin() {
    pane = document.getElementById('pane-reg'); if (!pane || pane.dataset.built) return;
    pane.dataset.built = 1;
    pane.innerHTML = `<div class="reg-round"><h3>شروع ثبت‌نام جدید</h3>
<p class="hint">ثبت‌نام بلافاصله باز می‌شود و با رسیدن به ۱۲۰ نفر تکمیل می‌شود؛ پس از آن ۵ نفر دیگر در فهرست رزرو ثبت می‌شوند و اگر کسی انصراف دهد، نفر اول رزرو خودکار جای او و شناسه‌اش را می‌گیرد. با گزینه «خودکار»، بقیه کارها (شناسه، ساختن گروه، اعلام و حتی باز کردن دوره بعد) هم خودکار انجام می‌شود.</p>
<div class="reg-grid"><div><label for="regNewPlat">پیام‌رسان</label><select id="regNewPlat"><option value="telegram">تلگرام</option><option value="bale">بله</option></select></div>
<div><label for="regNewTitle">عنوان دوره</label><input id="regNewTitle" maxlength="80"></div></div>
<label class="adm-opt"><input type="checkbox" id="regNewHasStart"> تاریخ شروع دوره را الان مشخص می‌کنم</label>
<div id="regNewStartBox" hidden><input id="regNewStart"></div>
<div id="regNewAuto">${autoOpts()}</div>
<div class="reg-tools"><button type="button" id="regNewBtn">شروع ثبت‌نام</button></div><div class="reg-msg" id="regAdminMsg"></div></div>
<div class="adm-bar"><strong>دوره‌ها</strong><button type="button" class="reg-light" id="regReload">تازه‌سازی</button></div>
<div id="regAdminRounds"><p class="hint">در حال دریافت…</p></div>`;
    const $ = s => pane.querySelector(s);
    JDate($('#regNewStart')); $('#regNewStart').value = J.addDays(J.todayIso(), 1);
    const syncTitle = () => { $('#regNewTitle').value = `دوره جدید گروه ${PLATFORMS[$('#regNewPlat').value]}`; };
    $('#regNewPlat').onchange = syncTitle; syncTitle();
    $('#regNewHasStart').onchange = e => { $('#regNewStartBox').hidden = !e.target.checked; };
    $('#regNewBtn').onclick = createRound;
    pane.addEventListener('change', e => { if (e.target.matches('[data-o=auto]')) { const box = e.target.closest('.reg-round').querySelector('[data-o-box]'); if (box) box.hidden = !e.target.checked; } });
    $('#regReload').onclick = loadAdmin;
    pane.addEventListener('click', onAdminClick);
  }
  // گزینه‌های «ثبت‌نام خودکار» (برای ساختن دوره و ویرایش آن)
  const DAYS = [1, 2, 3, 7];
  function autoOpts(r) {
    const on = r ? r.auto_announce : true, next = r ? r.auto_next : true, days = r ? r.start_after_days : 1;
    return `<label class="adm-opt"><input type="checkbox" data-o="auto" ${on ? 'checked' : ''}> <span><b>خودکار:</b> با رسیدن به ۱۲۰ نفر، شناسه‌ها داده شود و گروه ساخته و اعلام شود (بدون نیاز به مدیر)</span></label>
<div data-o-box ${on ? '' : 'hidden'}><label>اگر تاریخ شروع مشخص نشده باشد، دوره شروع شود:</label><select data-o="days">${DAYS.map(d => `<option value="${d}" ${d === days ? 'selected' : ''}>${d === 1 ? 'فردای روزی که ظرفیت کامل شد' : `${fa(d)} روز پس از تکمیل ظرفیت`}</option>`).join('')}</select>
<label class="adm-opt"><input type="checkbox" data-o="next" ${next ? 'checked' : ''}> سپس ثبت‌نام دوره بعدِ همین پیام‌رسان خودکار باز شود</label></div>`;
  }
  const readAuto = el => { const on = el.querySelector('[data-o=auto]').checked; return { auto_announce: on, auto_next: on && el.querySelector('[data-o=next]').checked, start_after_days: +el.querySelector('[data-o=days]').value }; };
  const autoText = r => r.auto_announce ? `خودکار: با رسیدن به ${fa(CAPACITY)} نفر، شناسه‌ها و گروه ساخته و اعلام می‌شود؛ شروع ${r.start_date ? esc(dateFa(r.start_date)) : (r.start_after_days === 1 ? 'فردای تکمیل ظرفیت' : `${fa(r.start_after_days)} روز پس از تکمیل ظرفیت`)}${r.auto_next ? '، و ثبت‌نام دوره بعد خودکار باز می‌شود' : ''}.` : '';
  const amsg = (t, ok) => { const m = pane.querySelector('#regAdminMsg'); m.className = 'reg-msg ' + (ok ? 'reg-ok' : 'reg-bad'); m.textContent = t; };

  async function createRound() {
    const $ = s => pane.querySelector(s);
    const platform = $('#regNewPlat').value, title = $('#regNewTitle').value.trim() || `دوره جدید گروه ${PLATFORMS[platform]}`;
    const start_date = $('#regNewHasStart').checked ? $('#regNewStart').value || null : null;
    const busy = adminRounds.find(r => r.platform === platform && ['open', 'full', 'assigned'].includes(r.status));
    if (busy && !confirm(`ثبت‌نام «${busy.title}» برای ${PLATFORMS[platform]} هنوز در جریان است. دوره دیگری هم شروع شود؟`)) return;
    $('#regNewBtn').disabled = true;
    try {
      await api('registration_rounds', { method: 'POST', body: { platform, title, start_date, ...readAuto($('#regNewAuto')) }, auth: true, prefer: 'return=minimal' });
      amsg('ثبت‌نام جدید باز شد. «کپی متن دعوت» را بزنید و در گروه بفرستید.', true); await loadAdmin(); loadPublic();
    } catch (e) { amsg(e.message); }
    $('#regNewBtn').disabled = false;
  }

  async function loadAdmin() {
    if (!pane || !adminToken) return;
    try {
      [adminRounds, adminRegs] = await Promise.all([
        api('registration_rounds?select=*&order=created_at.desc', { auth: true }),
        api('registrations?select=id,round_id,name,code,participant_id,created_at,promoted_at&order=created_at,id', { auth: true })
      ]);
    } catch (e) { pane.querySelector('#regAdminRounds').innerHTML = `<p class="reg-msg reg-bad">${esc(e.message)}</p>`; return; }
    renderAdmin();
  }
  window.regAdminReload = loadAdmin;
  const regsOf = id => adminRegs.filter(x => x.round_id === id);
  const allGroups = () => (window.adminDbGroups && window.adminDbGroups.length ? window.adminDbGroups : groups.map(g => ({ number: g.number, name: g.name })));

  function renderAdmin() {
    const box = pane.querySelector('#regAdminRounds');
    const live = adminRounds.filter(r => r.status !== 'closed'), old = adminRounds.filter(r => r.status === 'closed');
    box.innerHTML = (live.length ? live.map(adminCard).join('') : '<p class="hint">ثبت‌نام فعالی وجود ندارد.</p>') +
      (old.length ? `<details class="hint"><summary>دوره‌های بسته‌شده (${fa(old.length)})</summary>${old.map(adminCard).join('')}</details>` : '');
    box.querySelectorAll('input[data-f=start]').forEach(i => JDate(i, { empty: true }));
  }

  function adminCard(r) {
    const regs = regsOf(r.id), ided = r.status === 'assigned' || r.status === 'announced';
    const mains = ided ? regs.filter(x => x.participant_id).sort((a, b) => a.participant_id - b.participant_id) : regs.slice(0, CAPACITY);
    const reserves = ided ? regs.filter(x => !x.participant_id) : regs.slice(CAPACITY);
    const n = mains.length, pct = Math.min(100, Math.round(n / CAPACITY * 100)), expanded = openRound === r.id;
    const step = (k, t) => `<div class="reg-step"><b>${fa(k)}.</b> ${t}</div>`;
    let s = `<div class="reg-round" data-round="${r.id}"><h3>${esc(r.title)}</h3><div class="reg-meta"><span class="reg-plat">${PLATFORMS[r.platform]}</span><span>${fa(n)} از ${fa(CAPACITY)} نفر</span>${n >= CAPACITY || reserves.length ? `<span>رزرو: ${fa(reserves.length)} از ${fa(r.reserve_slots ?? 0)}</span>` : ''}<span>${STATUS[r.status]}</span>${r.auto_announce && ['open', 'full'].includes(r.status) ? '<span class="reg-plat">خودکار</span>' : ''}${r.start_date ? `<span>شروع: ${esc(dateFa(r.start_date))}</span>` : ''}</div><div class="reg-bar"><span style="width:${pct}%"></span></div>`;
    if (editRound === r.id) {
      s += `<label>عنوان دوره</label><input data-f="title" maxlength="80" value="${esc(r.title)}"><label>تاریخ شروع دوره</label><input data-f="start" value="${esc(r.start_date || '')}">
${['open', 'full'].includes(r.status) ? autoOpts(r) : ''}
<div class="reg-tools"><button type="button" data-a="saveEdit">ذخیره</button><button type="button" class="reg-light" data-a="cancelEdit">انصراف</button></div>`;
    } else {
      s += '<div class="reg-tools">';
      s += `<button type="button" class="reg-light" data-a="toggle">${expanded ? 'بستن فهرست نام‌ها' : `نام‌ها (${fa(regs.length)})`}</button>`;
      if (r.status !== 'announced' && r.status !== 'closed') s += '<button type="button" class="reg-light" data-a="edit">ویرایش دوره</button>';
      if (r.status === 'open') s += '<button type="button" class="reg-light" data-a="invite">کپی متن دعوت</button>';
      if (r.status === 'announced') s += '<button type="button" data-a="copyAnn">کپی متن اعلام</button>';
      s += '</div>';
      if (r.status === 'open') s += step(1, r.auto_announce ? autoText(r) : `ثبت‌نام باز است. با رسیدن به ${fa(CAPACITY)} نفر خودکار بسته می‌شود.`);
      if (r.status === 'full' || r.status === 'assigned') s += step(2, `${r.status === 'assigned' ? 'شناسه‌ها به ترتیب ثبت‌نام داده شد.' : 'ظرفیت کامل شد. شناسه‌ها را به ترتیب ثبت‌نام بدهید.'}`) + `<div class="reg-tools"><button type="button" data-a="assign">${r.status === 'assigned' ? 'دادن دوباره شناسه‌ها' : 'دادن شناسه ۱ تا ۱۲۰'}</button></div>`;
      if (r.status === 'assigned' || r.status === 'announced') {
        const gs = allGroups(), next = Math.max(0, ...gs.map(g => g.number)) + 1;
        const gnum = r.group_number || next, same = gs.find(g => g.number === gnum);
        const gname = (r.status === 'announced' && same?.name) || `گروه ${PLATFORMS[r.platform]} ${fa(gnum)}`;
        s += step(3, r.status === 'announced' ? `اعلام شد${r.auto_announce ? ' (خودکار)' : ''}. گروه در زبانه «گروه‌ها» ساخته شد و هر نفر شناسه‌اش را در سایت می‌بیند. «کپی متن اعلام» را در گروه بفرستید. برای تغییر، تاریخ یا نام را عوض کنید و «به‌روزرسانی اعلام» را بزنید.` : 'تاریخ شروع و گروه را مشخص و اعلام کنید. گروه با همین ۱۲۰ نام در زبانه «گروه‌ها» ساخته می‌شود و هر نفر شناسه‌اش را در سایت می‌بیند.');
        s += `<label>تاریخ شروع دوره</label><input data-f="start" value="${esc(r.start_date || J.addDays(J.todayIso(), 1))}">
<div class="reg-grid"><div><label>شماره گروه</label><input type="number" min="1" data-f="num" value="${gnum}"></div><div><label>نام گروه در سایت</label><input data-f="gname" maxlength="80" value="${esc(gname)}"></div></div>`;
        if (same && r.status !== 'announced') s += `<p class="reg-bad">گروه شماره ${fa(gnum)} («${esc(same.name)}») وجود دارد و جایگزین می‌شود. اگر نمی‌خواهید، شماره دیگری بگذارید.</p>`;
        s += `<div class="reg-tools"><button type="button" data-a="announce">${r.status === 'announced' ? 'به‌روزرسانی اعلام' : 'اعلام شناسه‌ها و تاریخ شروع'}</button></div>`;
      }
      const moved = regs.filter(x => x.promoted_at && (ided ? x.participant_id : regs.indexOf(x) < CAPACITY));
      if (moved.length) s += `<p class="hint">جایگزین‌شده از رزرو: ${moved.map(x => `${esc(x.name)}${x.participant_id ? ` (شناسه ${fa(x.participant_id)})` : ''}`).join('، ')}</p>`;
      s += '<div class="reg-tools">' + (r.status !== 'closed' ? `<button type="button" class="reg-light" data-a="close">${r.status === 'announced' ? 'بایگانی دوره' : 'بستن این ثبت‌نام'}</button>` : '') + '<button type="button" class="reg-danger" data-a="delete">حذف کامل دوره</button></div>';
    }
    s += '<div class="reg-msg" data-msg></div>';
    if (expanded) {
      if (r.status !== 'closed' && (n < CAPACITY || reserves.length < (r.reserve_slots ?? 0))) s += `<div class="row" style="margin-top:8px"><input data-f="add" maxlength="60" placeholder="${n < CAPACITY ? 'افزودن نام توسط مدیر' : 'افزودن به فهرست رزرو'}"><button type="button" data-a="add">افزودن</button></div>`;
      const row = (x, label) => `<div><span class="reg-n">${label}</span><span>${esc(x.name)}${x.promoted_at ? ' <small class="reg-ok">(جایگزین)</small>' : ''}</span>${r.status === 'closed' ? '' : `${r.status === 'announced' ? '' : `<button type="button" class="reg-light" data-a="rename" data-id="${x.id}">ویرایش</button>`}<button type="button" class="reg-danger" data-a="remove" data-id="${x.id}">حذف</button>`}</div>`;
      s += `<div class="reg-list">${regs.length ? mains.map((x, i) => row(x, fa(x.participant_id || i + 1))).join('') + reserves.map((x, i) => row(x, 'رزرو ' + fa(i + 1))).join('') : '<div><span>هنوز کسی ثبت‌نام نکرده است.</span></div>'}</div>`;
      if (regs.length) s += '<div class="reg-tools"><button type="button" class="reg-light" data-a="copyNames">کپی فهرست نام‌ها</button></div>';
    }
    return s + '</div>';
  }

  function announcementText(r) {
    const regs = regsOf(r.id).filter(x => x.participant_id).sort((a, b) => a.participant_id - b.participant_id);
    const g = allGroups().find(x => x.number === r.group_number);
    return `بسم الله الرحمن الرحیم\n\nثبت‌نام «${r.title}» کامل شد و ${g?.name ? `«${g.name}»` : 'گروه'} تشکیل شد.\nتاریخ شروع: ${dateFa(r.start_date)}\n\nشناسه هر نفر، عدد کنار نام اوست:\n` +
      regs.map(x => `${fa(x.participant_id)}. ${x.name}`).join('\n') +
      `\n\nسهم روزانه را با شناسه خود در سایت ببینید:\n${siteUrl()}`;
  }
  function inviteText(r) {
    return `بسم الله الرحمن الرحیم\n\nثبت‌نام «${r.title}» (${PLATFORMS[r.platform]}) آغاز شد.\nظرفیت: ${fa(CAPACITY)} نفر.${r.start_date ? `\nتاریخ شروع دوره: ${dateFa(r.start_date)}` : ''}\nبرای ثبت‌نام، نام خود را در سایت وارد کنید:\n${siteUrl()}`;
  }
  async function copy(text, msgEl) {
    try { await navigator.clipboard.writeText(text); msgEl.className = 'reg-msg reg-ok'; msgEl.textContent = 'متن کپی شد؛ آن را در گروه بفرستید.'; }
    catch { msgEl.className = 'reg-msg'; msgEl.innerHTML = `<pre class="reg-text">${esc(text)}</pre>`; }
  }

  async function onAdminClick(e) {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const card = b.closest('[data-round]'); if (!card) return;
    const id = +card.dataset.round, r = adminRounds.find(x => x.id === id), msg = card.querySelector('[data-msg]');
    const fail = err => { msg.className = 'reg-msg reg-bad'; msg.textContent = err.message; b.disabled = false; };
    const f = k => card.querySelector(`[data-f=${k}]`);
    const a = b.dataset.a;
    if (a === 'toggle') { openRound = openRound === id ? null : id; renderAdmin(); return; }
    if (a === 'edit') { editRound = id; renderAdmin(); return; }
    if (a === 'cancelEdit') { editRound = null; renderAdmin(); return; }
    if (a === 'invite') return copy(inviteText(r), msg);
    if (a === 'copyAnn') return copy(announcementText(r), msg);
    if (a === 'copyNames') { const regs = [...regsOf(id)].sort((p, q) => (p.participant_id || 0) - (q.participant_id || 0) || 0); return copy(regs.map((x, i) => `${fa(x.participant_id || i + 1)}. ${x.name}`).join('\n'), msg); }
    b.disabled = true;
    try {
      if (a === 'saveEdit') {
        const title = f('title').value.trim(); if (!title) return fail(Error('عنوان را بنویسید.'));
        await api(`registration_rounds?id=eq.${id}`, { method: 'PATCH', body: { title, start_date: f('start').value || null, ...(card.querySelector('[data-o=auto]') ? readAuto(card) : {}) }, auth: true, prefer: 'return=minimal' });
        editRound = null;
      } else if (a === 'close') {
        if (!confirm(r.status === 'announced' ? 'این دوره بایگانی شود؟ (گروه ساخته‌شده در سایت می‌ماند.)' : 'ثبت‌نام این دوره بسته شود؟ ثبت‌نام‌کنندگان دیگر نمی‌توانند ثبت‌نام یا انصراف دهند.')) { b.disabled = false; return; }
        await api(`registration_rounds?id=eq.${id}`, { method: 'PATCH', body: { status: 'closed' }, auth: true, prefer: 'return=minimal' });
      } else if (a === 'delete') {
        if (!confirm(`«${r.title}» و ${fa(regsOf(id).length)} ثبت‌نام آن برای همیشه حذف شود؟ (اگر گروهی از این دوره ساخته شده، در زبانه «گروه‌ها» می‌ماند.)`)) { b.disabled = false; return; }
        await api(`registration_rounds?id=eq.${id}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
        if (openRound === id) openRound = null;
      } else if (a === 'assign') {
        if (r.status === 'assigned' && !confirm('شناسه‌ها دوباره به ترتیب ثبت‌نام داده شود؟')) { b.disabled = false; return; }
        await rpc('reg_assign_ids', { p_round: id }, true);
      } else if (a === 'announce') {
        const start = f('start').value, num = +f('num').value, gname = f('gname').value.trim();
        if (!start || !(num >= 1)) return fail(Error(window.sbErrors.bad_input));
        if (!confirm(`گروه شماره ${fa(num)} با نام «${gname}» و تاریخ شروع ${dateFa(start)} ساخته شود و شناسه‌ها اعلام شود؟`)) { b.disabled = false; return; }
        await rpc('reg_announce', { p_round: id, p_start: start, p_group_number: num, p_group_name: gname }, true);
        document.dispatchEvent(new Event('groups:changed'));
      } else if (a === 'add') {
        if (f('add').value.trim().length < 2) return fail(Error(window.sbErrors.bad_name));
        await rpc('reg_admin_add', { p_round: id, p_name: f('add').value }, true);
      } else if (a === 'remove') {
        const x = adminRegs.find(y => y.id === +b.dataset.id);
        if (!confirm(`«${x.name}» از این دوره حذف شود؟${x.participant_id || (!['assigned', 'announced'].includes(r.status) && regsOf(id).indexOf(x) < CAPACITY) ? ' اگر کسی در فهرست رزرو باشد، نفر اول رزرو جای او را می‌گیرد.' : ''}`)) { b.disabled = false; return; }
        await rpc('reg_admin_remove', { p_id: x.id }, true);
      } else if (a === 'rename') {
        const x = adminRegs.find(y => y.id === +b.dataset.id), name = prompt('نام درست را بنویسید:', x.name);
        if (!name || name.trim() === x.name) { b.disabled = false; return; }
        if (name.trim().length < 2 || /[<>{}"\\`]/.test(name)) return fail(Error(window.sbErrors.bad_name));
        await api(`registrations?id=eq.${x.id}`, { method: 'PATCH', body: { name: name.replace(/\s+/g, ' ').trim() }, auth: true, prefer: 'return=minimal' });
      }
      await loadAdmin(); loadPublic();
    } catch (err) { fail(err); }
  }

  // ---------- راه‌اندازی ----------
  document.addEventListener('admin:login', () => { buildAdmin(); loadAdmin(); });
  document.addEventListener('admin:tab', e => { if (e.detail === 'reg') loadAdmin(); });
  document.addEventListener('settings:changed', loadPublic);
  window.addEventListener('hashchange', loadPublic);
  loadPublic();
})();
