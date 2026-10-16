// زبانه «گروه‌ها» در بخش مدیریت: ساخت گروه، تغییر نام، تاریخ شروع، نمایش/پنهان، ویرایش ۱۲۰ نام و حذف.
// داده‌ها در جدول site_groups (Supabase) هستند؛ به admin.js نیاز دارد.
(function () {
  const api = window.sbApi;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = x => toFa(x);
  const css = `
.grp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.grp-head h3{margin:0}
.grp-meta{font-size:15px;color:var(--muted)}
.grp-badge{display:inline-block;padding:0 8px;margin-inline-start:6px;background:#f6e3e5;color:var(--danger);border:1px solid #e3b5bb;border-radius:var(--pill);font-size:14px}
.grp-names{max-height:380px;overflow:auto;border:1px solid var(--line);border-radius:var(--r);margin-top:6px}
.grp-names div{display:flex;align-items:center;gap:6px;padding:2px 6px;border-bottom:1px solid #f3ecdc}
.grp-names span{flex:0 0 2.6em;color:var(--muted);font-size:15px}
.grp-names input{height:40px;font-size:16px;border-color:#e6dcc6}
.grp-names div.hit input{border-color:var(--emerald);background:#f0faf6}
.grp-count{font-weight:700}
textarea.grp-text{width:100%;min-height:240px;font:inherit;font-size:16px;line-height:1.8;padding:8px;border:1px solid var(--gold);color:var(--ink);background:#fff}
.grp-mode{display:flex;gap:6px;margin:6px 0}
.grp-mode button{height:36px;font-size:14px;padding:0 10px;background:#fff;color:var(--deep);border-color:var(--emerald)}
.grp-mode button.on{background:var(--deep);color:#fff}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let pane = null, list = [], open = null, isNew = false;
  const lines = t => t.split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const cleanName = x => x.replace(/\s+/g, ' ').trim();
  const nextNumber = () => Math.max(0, ...list.map(g => g.number), ...groups.map(g => g.number)) + 1;
  function dayInfo(iso) {
    const [y, m, d] = iso.split('-').map(Number), p = iranParts(), days = Math.floor((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(y, m - 1, d)) / 86400000);
    return days < 0 ? `${fa(-days)} روز تا شروع` : `روز ${fa(days + 1)} دوره`;
  }

  function build() {
    pane = document.getElementById('pane-groups'); if (!pane || pane.dataset.built) return;
    pane.dataset.built = 1;
    pane.innerHTML = `<div id="grpInfo"></div>
<div class="reg-tools"><button type="button" id="grpAdd">افزودن گروه جدید</button><button type="button" class="reg-light" id="grpReload">تازه‌سازی</button></div>
<div class="reg-msg" id="grpMsg"></div><div id="grpList"><p class="hint">در حال دریافت…</p></div>`;
    pane.querySelector('#grpAdd').onclick = () => { isNew = true; open = 'new'; render(); pane.querySelector('[data-g="new"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    pane.querySelector('#grpReload').onclick = load;
    pane.addEventListener('click', onClick);
    pane.addEventListener('input', onInput);
  }

  async function load() {
    if (!pane || !adminToken) return;
    const msg = pane.querySelector('#grpMsg');
    try { list = await api('site_groups?select=*&order=number', { auth: true }); msg.textContent = ''; }
    catch (e) { msg.className = 'reg-msg reg-bad'; msg.textContent = e.message; pane.querySelector('#grpList').innerHTML = ''; return; }
    window.adminDbGroups = list;
    render();
  }

  // گروه‌های بالای صفحه را بدون تازه‌سازی، با فهرست پایگاه داده هماهنگ می‌کند.
  function syncPage() {
    if ((window.siteSettings?.groups_source?.source || 'db') === 'files') return;
    const vis = list.filter(g => g.visible && g.names.length === 120);
    if (!vis.length) return;
    groups.length = 0;
    vis.forEach(g => { const [y, m, d] = g.start_date.split('-').map(Number); groups.push({ number: g.number, name: g.name, start: Date.UTC(y, m - 1, d), names: g.names }); });
    window.groupsSource = 'db';
    renderGroups();
  }

  function render() {
    const info = pane.querySelector('#grpInfo'), src = window.siteSettings?.groups_source?.source || 'db';
    if (!list.length) info.innerHTML = `<div class="reg-round"><h3>شروع کار با فهرست گروه‌ها</h3><p class="hint">گروه‌ها هنوز از فایل‌های گیت‌هاب خوانده می‌شوند. یک‌بار گروه‌های فعلی سایت (${fa(groups.length)} گروه) را منتقل کنید تا از همین‌جا قابل ویرایش شوند.</p><div class="reg-tools"><button type="button" data-g-act="import">انتقال گروه‌های فعلی به اینجا</button></div></div>`;
    else if (src === 'files') info.innerHTML = '<p class="reg-note">در «تنظیمات»، منبع فهرست گروه‌ها روی «فایل‌ها» است؛ تغییرات این زبانه تا وقتی آن را روی «پایگاه داده» نگذارید در سایت دیده نمی‌شود.</p>';
    else info.innerHTML = `<p class="hint">${fa(list.length)} گروه. تغییرات بلافاصله برای همه بازدیدکنندگان اعمال می‌شود.</p>`;
    const cards = list.map(card);
    if (open === 'new') cards.push(editor({ number: nextNumber(), name: '', start_date: J.addDays(J.todayIso(), 1), names: [], visible: true }, true));
    pane.querySelector('#grpList').innerHTML = cards.join('') || '';
    pane.querySelectorAll('input[data-f=start]').forEach(i => JDate(i));
    pane.querySelectorAll('[data-g]').forEach(countNames);
  }

  function card(g) {
    if (open === g.number) return editor(g, false);
    return `<div class="reg-round" data-g="${g.number}"><div class="grp-head"><div><h3>${esc(g.name)}${g.visible ? '' : '<span class="grp-badge">پنهان</span>'}</h3>
<div class="grp-meta">شماره ${fa(g.number)} · شروع: ${esc(J.label(g.start_date))} · ${dayInfo(g.start_date)}</div></div></div>
<div class="reg-tools"><button type="button" class="reg-light" data-g-act="rename">تغییر نام</button><button type="button" data-g-act="edit">ویرایش تاریخ و نام‌ها</button></div><div class="reg-msg" data-msg></div></div>`;
  }

  function editor(g, fresh) {
    const names = Array.from({ length: 120 }, (_, i) => g.names[i] || '');
    return `<div class="reg-round" data-g="${fresh ? 'new' : g.number}"><h3>${fresh ? 'گروه جدید' : esc(g.name)}</h3>
<div class="reg-grid"><div><label>نام گروه</label><input data-f="name" maxlength="80" value="${esc(g.name)}" placeholder="مثلاً گروه تلگرام ۲"></div>
<div><label>شماره گروه</label><input type="number" min="1" data-f="number" value="${g.number}" ${fresh ? '' : 'disabled'}></div></div>
<label>تاریخ شروع دوره (روز اولِ قرائت)</label><input data-f="start" value="${esc(g.start_date || '')}">
<label class="adm-opt"><input type="checkbox" data-f="visible" ${g.visible !== false ? 'checked' : ''}> در سایت نشان داده شود</label>
<label>نام‌ها به ترتیب شناسه ۱ تا ۱۲۰ · <span class="grp-count" data-count></span></label>
<div class="grp-mode"><button type="button" data-mode="list" class="${fresh ? '' : 'on'}">فهرست شماره‌دار</button><button type="button" data-mode="text" class="${fresh ? 'on' : ''}">چسباندن متن (هر خط یک نام)</button></div>
<div data-view="list" ${fresh ? 'hidden' : ''}><input data-f="find" placeholder="جستجوی نام در این گروه"><div class="grp-names">${names.map((n, i) => `<div><span>${fa(i + 1)}</span><input data-i="${i}" value="${esc(n)}" maxlength="60"></div>`).join('')}</div></div>
<div data-view="text" ${fresh ? '' : 'hidden'}><textarea class="grp-text" data-f="text" placeholder="۱۲۰ نام را اینجا بچسبانید؛ هر خط یک نام">${esc(g.names.join('\n'))}</textarea></div>
<div class="reg-tools"><button type="button" data-g-act="save">${fresh ? 'ساختن گروه' : 'ذخیره تغییرات'}</button><button type="button" class="reg-light" data-g-act="cancel">انصراف</button></div>
${fresh ? '' : '<div class="reg-tools"><button type="button" class="reg-light" data-g-act="file">دانلود فایل گروه</button><button type="button" class="reg-danger" data-g-act="delete">حذف گروه</button></div>'}
<div class="reg-msg" data-msg></div></div>`;
  }

  const getNames = el => {
    const textMode = !el.querySelector('[data-view=text]').hidden;
    return textMode ? lines(el.querySelector('[data-f=text]').value) : [...el.querySelectorAll('[data-i]')].map(i => cleanName(i.value)).filter(Boolean);
  };
  function countNames(el) {
    const c = el.querySelector('[data-count]'); if (!c) return;
    const n = getNames(el).length; c.textContent = `${fa(n)} از ۱۲۰ نام`; c.style.color = n === 120 ? 'var(--ok)' : 'var(--danger)';
  }

  function onInput(e) {
    const el = e.target.closest('[data-g]'); if (!el) return;
    if (e.target.matches('[data-f=find]')) {
      const q = e.target.value.replace(/\u200c/g, '').trim();
      let first = null;
      el.querySelectorAll('.grp-names div').forEach(d => { const hit = q && d.querySelector('input').value.replace(/\u200c/g, '').includes(q); d.classList.toggle('hit', !!hit); if (hit && !first) first = d; });
      if (first) first.scrollIntoView({ block: 'nearest' });
      return;
    }
    countNames(el);
  }

  async function onClick(e) {
    const mode = e.target.closest('[data-mode]');
    if (mode) {
      const el = mode.closest('[data-g]'), names = getNames(el), toText = mode.dataset.mode === 'text';
      if (toText) el.querySelector('[data-f=text]').value = names.join('\n');
      else el.querySelectorAll('[data-i]').forEach((i, k) => { i.value = names[k] || ''; });
      el.querySelector('[data-view=text]').hidden = !toText; el.querySelector('[data-view=list]').hidden = toText;
      el.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b === mode));
      countNames(el); return;
    }
    const b = e.target.closest('[data-g-act]'); if (!b) return;
    const act = b.dataset.gAct, el = b.closest('[data-g]'), msg = el?.querySelector('[data-msg]') || pane.querySelector('#grpMsg');
    const num = el && el.dataset.g !== 'new' ? +el.dataset.g : null, g = list.find(x => x.number === num);
    const say = (t, ok) => { msg.className = 'reg-msg ' + (ok ? 'reg-ok' : 'reg-bad'); msg.textContent = t; };
    const fail = err => { say(err.message); b.disabled = false; };
    if (act === 'edit') { open = num; isNew = false; render(); return; }
    if (act === 'cancel') { open = null; render(); return; }
    if (act === 'file') { const names = getNames(el); return window.regDownload(`group-${num}.txt`, [el.querySelector('[data-f=start]').value, ...names].join('\n') + '\n'); }
    b.disabled = true;
    try {
      if (act === 'import') {
        if (!confirm(`${fa(groups.length)} گروه فعلی سایت به اینجا منتقل شود؟`)) { b.disabled = false; return; }
        const iso = ms => new Date(ms).toISOString().slice(0, 10);
        await api('site_groups', { method: 'POST', body: groups.map(x => ({ number: x.number, name: x.name, start_date: iso(x.start), names: x.names, visible: true })), auth: true, prefer: 'resolution=ignore-duplicates,return=minimal' });
        await load(); syncPage(); return;
      }
      if (act === 'rename') {
        const name = prompt('نام تازه گروه:', g.name);
        if (!name || cleanName(name) === g.name) { b.disabled = false; return; }
        await api(`site_groups?number=eq.${num}`, { method: 'PATCH', body: { name: cleanName(name).slice(0, 80), updated_at: new Date().toISOString() }, auth: true, prefer: 'return=minimal' });
        await load(); syncPage();
        pane.querySelector(`[data-g="${num}"] [data-msg]`).className = 'reg-msg reg-ok';
        pane.querySelector(`[data-g="${num}"] [data-msg]`).textContent = 'نام گروه تغییر کرد.';
        return;
      }
      if (act === 'delete') {
        const ans = prompt(`برای حذف همیشگی «${g.name}»، شماره گروه (${fa(num)}) را بنویسید. (برای پنهان کردن موقت، به‌جای حذف، تیک «در سایت نشان داده شود» را بردارید.)`);
        if (norm(ans || '') !== String(num)) { b.disabled = false; if (ans !== null) say('شماره درست وارد نشد؛ گروه حذف نشد.'); return; }
        await api(`site_groups?number=eq.${num}`, { method: 'DELETE', auth: true, prefer: 'return=minimal' });
        open = null; await load(); syncPage(); return;
      }
      if (act === 'save') {
        const name = cleanName(el.querySelector('[data-f=name]').value), start = el.querySelector('[data-f=start]').value;
        const number = +el.querySelector('[data-f=number]').value, visible = el.querySelector('[data-f=visible]').checked, names = getNames(el);
        if (!name) return fail(Error('نام گروه را بنویسید.'));
        if (!start) return fail(Error('تاریخ شروع را انتخاب کنید.'));
        if (!(number >= 1)) return fail(Error('شماره گروه را وارد کنید.'));
        if (names.length !== 120) return fail(Error(`باید دقیقاً ۱۲۰ نام باشد؛ اکنون ${fa(names.length)} نام است.`));
        if (names.some(n => /[<>{}"\\`]/.test(n))) return fail(Error('نام‌ها نباید نشانه‌هایی مثل < > داشته باشند.'));
        const body = { name: name.slice(0, 80), start_date: start, names, visible, updated_at: new Date().toISOString() };
        if (el.dataset.g === 'new') {
          if (list.some(x => x.number === number)) return fail(Error('گروهی با این شماره وجود دارد؛ شماره دیگری بگذارید.'));
          await api('site_groups', { method: 'POST', body: { number, ...body }, auth: true, prefer: 'return=minimal' });
        } else await api(`site_groups?number=eq.${num}`, { method: 'PATCH', body, auth: true, prefer: 'return=minimal' });
        open = null; await load(); syncPage();
        const m = pane.querySelector(`[data-g="${number}"] [data-msg]`); if (m) { m.className = 'reg-msg reg-ok'; m.textContent = 'ذخیره شد و در سایت اعمال شد.'; }
      }
    } catch (err) { fail(err); }
  }

  document.addEventListener('admin:login', () => { build(); load(); });
  document.addEventListener('admin:tab', e => { if (e.detail === 'groups') load(); });
  document.addEventListener('groups:changed', () => load().then(syncPage));
})();
