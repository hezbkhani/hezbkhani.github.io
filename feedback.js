// پیشنهادها و نظرها: بخش آخر منوی ☰ (پس از «زمینه صفحه») برای نوشتن پیام کوتاه به مدیر و دیدن پاسخ او،
// و زبانه «نظرها» در ‎#admin‎ برای خواندن، پاسخ دادن و حذف. جدول و تابع‌ها در backend/supabase/feedback.sql.
// هر گوشی یک کد تصادفی دارد (localStorage، کلید fbDevice) که پیام‌ها و پاسخ‌های همان گوشی را پیدا می‌کند.
// به admin.js (sbApi و sbRpc) و menu.js نیاز دارد.
(function () {
  const MAX = 500;
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
  };
  const when = iso => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return ''; } };
  window.sbErrors = Object.assign(window.sbErrors || {}, {
    fb_empty: 'متن پیام خالی است.',
    fb_long: `متن پیام بلند است؛ حداکثر ${toFa(MAX)} نویسه.`,
    fb_limit: 'از این گوشی امروز پیام کافی رسیده است؛ لطفاً فردا دوباره بنویسید.',
    bad_device: 'پیام فرستاده نشد؛ صفحه را دوباره باز کنید.'
  });

  document.head.insertAdjacentHTML('beforeend', `<style>
.fb-form{padding:0 16px 10px}
.fb-form textarea{width:100%;min-height:96px!important;resize:vertical;font-size:16px}
.fb-form input{width:100%}
.fb-count{display:block;text-align:left;font-size:13px;color:var(--muted)}
.fb-mine{margin-top:10px;display:grid;gap:8px}
.fb-mine h4{margin:4px 0 0;font-size:14px;color:var(--muted)}
.fb-msg{background:#fff;border:1px solid #eadfca;border-radius:12px;padding:8px 10px;font-size:15px;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere}
.fb-msg small{display:block;color:var(--muted);font-size:12px;white-space:normal}
.fb-msg .fb-re{margin-top:6px;padding:6px 8px;border-radius:10px;background:var(--mint);color:var(--ink)}
.fb-msg .fb-re b{display:block;font-size:13px;color:var(--deep)}
.fb-msg .fb-wait{margin-top:4px;color:var(--muted);font-size:13px}
.sm-item .fb-new{flex:none;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--gold);color:#fff}
.fba-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.fba-bar label{margin:0;display:flex;gap:6px;align-items:center}
.fba-item{border-top:1px solid #f0e8d6;padding:10px 0}.fba-item:first-child{border-top:0}
.fba-item.new{background:#fffbea;margin:0 -14px;padding:10px 14px}
.fba-item .fba-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--muted)}
.fba-item .fba-body{margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8}
.fba-item textarea{width:100%;min-height:60px!important}
.fba-item .reg-tools button{height:36px;font-size:14px;padding:0 12px}
.fba-done{color:var(--deep);font-size:13px}
</style>`);

  // ---------- بازدیدکننده: منوی ☰ ----------
  const device = make => {
    let d = ls.get('fbDevice');
    if (!d && make) {
      const a = new Uint8Array(18); crypto.getRandomValues(a);
      d = 'fb' + [...a].map(x => x.toString(16).padStart(2, '0')).join('');
      ls.set('fbDevice', d);
    }
    return d;
  };
  let mine = null; // پیام‌های این گوشی، پس از اولین خواندن
  const newest = () => (mine || []).reduce((m, x) => x.replied_at && x.replied_at > m ? x.replied_at : m, '');
  const hasNew = () => { const n = newest(); return !!n && n > (ls.get('fbSeen') || ''); };
  const markDot = () => window.siteMenu?.dot(hasNew(), 'fb');
  async function loadMine() {
    const d = device(false); if (!d) { mine = []; return mine; }
    mine = await window.sbRpc('feedback_mine', { p_device: d });
    markDot();
    return mine;
  }
  const mineHtml = list => !list.length ? '' : `<h4>پیام‌های من</h4>${list.map(m => `<div class="fb-msg"><small>${esc(when(m.created_at))}</small>${esc(m.body)}
${m.reply ? `<div class="fb-re"><b>پاسخ نوران${m.replied_at ? ` · ${esc(when(m.replied_at))}` : ''}</b>${esc(m.reply)}</div>` : '<div class="fb-wait">هنوز پاسخی داده نشده است.</div>'}</div>`).join('')}`;

  // منو گاهی از نو ساخته می‌شود (مثلاً پس از رسیدن تنظیمات)؛ فرم باز و متن نیمه‌کاره نگه داشته می‌شود.
  let formOpen = false, draft = '';
  function openForm(box, toggle) {
    if (toggle && formOpen) { formOpen = false; box.innerHTML = ''; return; } // زدن دوباره، می‌بندد
    formOpen = true;
    const name = window.account?.user?.name || ls.get('fbName') || '';
    box.innerHTML = `<div class="fb-form">
<p class="hint" style="margin:6px 0">پیشنهاد، نظر یا مشکلی که دیدید را در چند خط بنویسید. پاسخ ما همین‌جا، روی همین گوشی، نشان داده می‌شود.</p>
<textarea data-f="body" maxlength="${MAX}" rows="4" placeholder="متن پیام"></textarea><span class="fb-count" data-f="count"></span>
<input type="text" data-f="name" maxlength="60" placeholder="نام (اختیاری)" value="${esc(name)}">
<div class="reg-tools" style="margin-top:8px"><button type="button" data-f="send">فرستادن</button></div>
<div class="adm-msg" data-f="msg" aria-live="polite"></div><div class="fb-mine" data-f="mine"></div></div>`;
    const q = f => box.querySelector(`[data-f="${f}"]`);
    const msg = (t, ok) => { const e = q('msg'); e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
    const count = () => { q('count').textContent = `${toFa(q('body').value.length)} از ${toFa(MAX)}`; };
    const showMine = () => { q('mine').innerHTML = mineHtml(mine || []); const n = newest(); if (n) ls.set('fbSeen', n); markDot(); };
    q('body').value = draft;
    q('body').addEventListener('input', () => { draft = q('body').value; count(); }); count();
    if (mine) showMine();
    if (device(false)) loadMine().then(showMine, () => {});
    q('send').onclick = async () => {
      const body = q('body').value.trim(), nm = q('name').value.trim();
      if (body.length < 2) return msg('لطفاً متن پیام را بنویسید.');
      q('send').disabled = true; msg('در حال فرستادن…', true);
      try {
        await window.sbRpc('feedback_send', { p_device: device(true), p_body: body, p_name: nm || null });
        ls.set('fbName', nm || null);
        q('body').value = draft = ''; count();
        msg('ممنون؛ پیام شما رسید.', true);
        await loadMine().then(showMine, () => {});
      } catch (e) { msg(e.message); }
      finally { q('send').disabled = false; }
    };
    if (toggle) setTimeout(() => q('body').focus({ preventScroll: true }), 50);
  }

  // نمایش در منو با تنظیم site_settings › feedback.enabled (پیش‌فرض خاموش)؛ در ‎#admin‎ همیشه برای آزمایش دیده می‌شود.
  const shown = () => location.hash === '#admin' || window.siteSettings?.feedback?.enabled === true;
  window.siteMenu?.section({
    id: 'feedback', order: 95,
    render(box) {
      if (!shown()) return;
      box.innerHTML = `<h3>پیشنهادها و نظرها</h3><button type="button" class="sm-item" data-fb-open><span class="sm-ic">✉️</span><span>نوشتن پیشنهاد یا نظر<small>پیام کوتاه به ما؛ پاسخ همین‌جا دیده می‌شود</small></span>${hasNew() ? '<span class="fb-new">پاسخ تازه</span>' : '<span class="sm-go">‹</span>'}</button><div class="fb-box"></div>`;
      box.querySelector('[data-fb-open]').onclick = () => openForm(box.querySelector('.fb-box'), true);
      if (formOpen) openForm(box.querySelector('.fb-box'));
    }
  });
  // اگر این گوشی پیش‌تر پیامی فرستاده، پاسخ تازه با نقطه روی دکمه منو خبر داده می‌شود.
  if (device(false)) setTimeout(() => { if (shown()) loadMine().catch(() => {}); }, 4000);
  document.addEventListener('settings:changed', () => {
    if (!shown()) window.siteMenu?.dot(false, 'fb');
    window.siteMenu?.refresh();
    const c = $('fbaOn'); if (c) c.checked = window.siteSettings?.feedback?.enabled === true;
  });

  // ---------- مدیر: زبانه «نظرها» ----------
  let pane = null, filter = 'all';
  const amsg = (t, ok) => { const e = $('fbaMsg'); if (!e) return; e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
  function tabLabel(n) {
    const b = document.querySelector('#admTabs [data-tab="fb"]');
    if (b) b.textContent = n ? `نظرها (${toFa(n)})` : 'نظرها';
  }
  async function countNew() {
    try { const r = await window.sbApi('feedback?select=id&admin_seen=eq.false&limit=100', { auth: true }); tabLabel(r.length); } catch {}
  }
  function build(p) {
    pane = p;
    p.innerHTML = `<div class="adm-card"><h3>نمایش در منو</h3>
<label class="adm-opt"><input type="checkbox" id="fbaOn"> <span>نمایش بخش «پیشنهادها و نظرها» در منوی ☰ برای همه</span></label>
<p class="hint">پیش‌فرض خاموش است. وقتی خاموش باشد، این بخش فقط در ‎#admin‎ (برای آزمایش) دیده می‌شود.</p><div class="adm-msg" id="fbaOnMsg"></div></div>
<div class="adm-card"><h3>پیشنهادها و نظرها</h3><p class="hint">پیام‌هایی که بازدیدکنندگان از منوی ☰ › «پیشنهادها و نظرها» فرستاده‌اند. پاسخ شما همان‌جا روی گوشی فرستنده نشان داده می‌شود.</p>
<div class="fba-bar"><label><input type="radio" name="fbaF" value="all" checked> همه</label><label><input type="radio" name="fbaF" value="open"> بی‌پاسخ</label><button type="button" class="reg-light" id="fbaReload">تازه کردن</button></div>
<div class="adm-msg" id="fbaMsg"></div><div id="fbaList" class="hint">…</div></div>`;
    p.querySelectorAll('[name=fbaF]').forEach(r => r.onchange = () => { filter = r.value; list(); });
    $('fbaReload').onclick = list;
    $('fbaOn').checked = window.siteSettings?.feedback?.enabled === true;
    $('fbaOn').onchange = async e => {
      const on = e.target.checked, m = $('fbaOnMsg');
      try {
        await window.saveSiteSetting('feedback', { enabled: on });
        m.className = 'adm-msg adm-ok'; m.textContent = on ? 'روشن شد: همه بازدیدکنندگان این بخش را در منو می‌بینند.' : 'خاموش شد: فقط در ‎#admin‎ دیده می‌شود.';
        document.dispatchEvent(new Event('settings:changed'));
      } catch (err) { e.target.checked = !on; m.className = 'adm-msg adm-bad'; m.textContent = err.message; }
    };
    $('fbaList').addEventListener('click', act);
    list();
  }
  async function list() {
    const box = $('fbaList'); if (!box) return;
    box.textContent = '…';
    try {
      const rows = await window.sbApi(`feedback?select=id,name,body,created_at,admin_seen,reply,replied_at&order=created_at.desc&limit=200${filter === 'open' ? '&reply=is.null' : ''}`, { auth: true });
      box.className = '';
      box.innerHTML = rows.length ? rows.map(r => `<div class="fba-item${r.admin_seen ? '' : ' new'}" data-id="${r.id}">
<div class="fba-head"><span>${r.admin_seen ? '' : '🆕 '}${esc(r.name || 'بی‌نام')}</span><span>${esc(when(r.created_at))}</span></div>
<div class="fba-body">${esc(r.body)}</div>
<textarea data-f="reply" maxlength="1000" placeholder="پاسخ (فرستنده روی گوشی خودش می‌بیند)">${esc(r.reply || '')}</textarea>
${r.replied_at ? `<div class="fba-done">پاسخ داده شد · ${esc(when(r.replied_at))}</div>` : ''}
<div class="reg-tools"><button type="button" data-a="reply">${r.reply ? 'ذخیره پاسخ' : 'فرستادن پاسخ'}</button><button type="button" class="reg-light" data-a="del">حذف</button></div></div>`).join('') : `<p class="hint">${filter === 'open' ? 'پیام بی‌پاسخی نیست.' : 'هنوز پیامی نرسیده است.'}</p>`;
      const unseen = rows.filter(r => !r.admin_seen).map(r => r.id);
      if (unseen.length) await window.sbApi(`feedback?id=in.(${unseen.join(',')})`, { method: 'PATCH', body: { admin_seen: true }, auth: true, prefer: 'return=minimal' }).catch(() => {});
      countNew();
    } catch (e) { box.className = 'hint'; box.textContent = ''; amsg(e.message); }
  }
  async function act(e) {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const item = b.closest('.fba-item'), id = item.dataset.id;
    b.disabled = true;
    try {
      if (b.dataset.a === 'del') {
        if (!confirm('این پیام حذف شود؟')) return;
        await window.sbApi(`feedback?id=eq.${id}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
        item.remove(); amsg('حذف شد.', true);
      } else {
        const reply = item.querySelector('[data-f=reply]').value.trim();
        await window.sbApi(`feedback?id=eq.${id}`, { method: 'PATCH', body: { reply: reply || null, replied_at: reply ? new Date().toISOString() : null }, auth: true, prefer: 'return=minimal' });
        amsg(reply ? 'پاسخ ذخیره شد؛ فرستنده دفعه بعد که منو را باز کند می‌بیند.' : 'پاسخ پاک شد.', true);
        list();
      }
    } catch (err) { amsg(err.message); }
    finally { b.disabled = false; }
  }
  document.addEventListener('admin:tab', e => {
    if (e.detail !== 'fb') return;
    const p = $('pane-fb'); if (!p) return;
    if (pane !== p) build(p); else list();
  });
  document.addEventListener('admin:login', () => setTimeout(countNew, 800));
  // اگر زبانه «نظرها» پیش از بارگذاری این فایل باز شده بود
  const p0 = $('pane-fb'); if (p0 && !p0.hidden) build(p0);
  if (window.adminSession?.data && $('admTabs')) countNew();
})();
