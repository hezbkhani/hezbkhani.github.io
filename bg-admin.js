// مدیریت › تنظیمات › «زمینه‌های صفحه اول»: روشن و خاموش کردن زمینه‌ها، افزودن تصویر تازه و حذف آن.
// تنظیمات در site_settings با کلید backgrounds ذخیره می‌شود: { off: [زمینه‌های خاموشِ همیشگی], custom: [{ id, name, style, url, size, win, on }] }.
// style رنگ و نقش کادرها را از یکی از چهار زمینه همیشگی می‌گیرد؛ win جای قاب وسط است (کسری از عرض و ارتفاع تصویر: چپ، بالا، راست، پایین).
// تصویرها در Storage، سطل backgrounds (backend/supabase/backgrounds.sql). به admin.js و backdrop.js نیاز دارد.
(function () {
  const cfg = window.APP_CONFIG || {};
  const BUILT = ['night', 'sage', 'blue', 'garden'];
  const BOX = { night: '#1f5a3a', sage: '#6b8a66', blue: '#3e5f84', garden: '#3c7a66', dark: '#c9a35a' };
  const STYLES = [...BUILT, 'dark']; // «تیره» فقط سبک کادر است، برای تصویرهای تیره
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const $ = id => document.getElementById(id);
  const names = () => window.bgxNames || {};
  const conf = () => { const s = window.siteSettings?.backgrounds || {}; return { off: [...(s.off || [])], custom: (s.custom || []).map(c => ({ ...c })) }; };
  const SETUP = 'بارگذاری تصویر هنوز راه‌اندازی نشده است: فایل backend/supabase/backgrounds.sql را در SQL Editor اجرا کنید.';

  document.head.insertAdjacentHTML('beforeend', `<style>
.bga-list{display:grid;gap:8px;margin:8px 0}
.bga-row{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid #f0e8d6}
.bga-row i{width:44px;aspect-ratio:2/3;border-radius:6px;border:1px solid var(--gold);background:center/cover no-repeat}
.bga-row label{margin:0!important;display:flex;gap:8px;align-items:center}
.bga-row input[type=checkbox]{width:20px;height:20px;margin:0;flex:none}
.bga-row small{display:block;color:var(--muted);font-weight:400}
.bga-row .bga-btn{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.bga-row button{height:32px;font-size:13px;padding:0 8px}
.bga-form{border-top:1px dashed var(--gold);margin-top:10px;padding-top:6px}
.bga-form select,.bga-form input[type=text]{width:100%}
.bga-edit{display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:12px;align-items:start;margin-top:8px}
.bga-prev{position:relative;border:1px solid var(--gold);border-radius:8px;overflow:hidden;background:#eee center/100% 100% no-repeat}
.bga-prev b{position:absolute;border:2px dashed;border-radius:6px;background:#fff6}
.bga-rng label{display:flex;justify-content:space-between;margin:8px 0 2px!important}
.bga-rng input{width:100%;accent-color:var(--deep)}
@media(max-width:480px){.bga-edit{grid-template-columns:1fr}.bga-prev{width:100%;max-width:220px;margin:auto}}
</style>`);

  const token = async () => { await window.adminSession?.fresh(); return window.adminSession?.data?.access_token || ''; };
  async function storage(method, name, body, type) {
    const h = { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + await token() };
    if (type) { h['Content-Type'] = type; h['x-upsert'] = 'true'; }
    let r;
    try { r = await fetch(`${cfg.SUPABASE_URL}/storage/v1/object/backgrounds/${name}`, { method, headers: h, body }); }
    catch { throw Error('ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'); }
    if (r.ok) return;
    const d = await r.json().catch(() => ({})), m = `${d.error || ''} ${d.message || ''}`;
    if (/bucket not found/i.test(m)) throw Error(SETUP);
    if (/row-level security|unauthorized|403/i.test(m) || r.status === 403) throw Error((window.sbErrors || {}).not_admin || 'این حساب دسترسی مدیر ندارد.');
    if (/payload too large|exceeded/i.test(m) || r.status === 413) throw Error('تصویر بیش از اندازه بزرگ است.');
    throw Error('بارگذاری انجام نشد (' + (d.message || r.status) + ').');
  }
  const publicUrl = name => `${cfg.SUPABASE_URL}/storage/v1/object/public/backgrounds/${name}`;

  // تصویر را کوچک می‌کند (بلندترین ضلع ۱۹۲۰) و webp یا jpeg می‌سازد
  function shrink(file, max = 1920, q = .85) {
    return new Promise((ok, bad) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(u);
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(b => b && b.type === 'image/webp' ? ok({ blob: b, ext: 'webp', w, h })
          : c.toBlob(j => j ? ok({ blob: j, ext: 'jpg', w, h }) : bad(Error('تصویر خوانده نشد.')), 'image/jpeg', q), 'image/webp', q);
      };
      img.onerror = () => { URL.revokeObjectURL(u); bad(Error('این فایل تصویر نیست یا خوانده نشد.')); };
      img.src = u;
    });
  }

  window.bgxShrink = shrink; // زمینه خود کاربر هم (bg-mine.js)

  let pane = null, form = null; // form: { id?, url?, size, src, blob?, ext? }
  const msg = (t, ok) => { const e = $('bgaMsg'); if (e) { e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; } };

  async function save(c, okText) {
    await window.saveSiteSetting('backgrounds', c);
    msg(okText, true);
    window.siteMenu?.refresh();
    list();
  }

  function list() {
    const c = conf(), all = [...BUILT.map(id => ({ id, style: id, on: !c.off.includes(id) })), ...c.custom.map(x => ({ ...x, on: x.on !== false }))];
    $('bgaList').innerHTML = all.map(e => `<div class="bga-row" data-id="${esc(e.id)}"><i style="background-image:url('${esc(e.url || `bg/${e.id}.webp`)}')"></i>
<label><input type="checkbox" data-on${e.on ? ' checked' : ''}><span>${esc(e.name || names()[e.id])}${e.url ? `<small>رنگ کادرها: ${esc(names()[e.style])}</small>` : '<small>زمینه همیشگی سایت</small>'}</span></label>
<span class="bga-btn"><button type="button" class="reg-light" data-see>دیدن</button>${e.url ? '<button type="button" class="reg-light" data-edit>ویرایش</button><button type="button" class="reg-light" data-del>حذف</button>' : ''}</span></div>`).join('');
  }

  function preview() {
    if (!form) return;
    const p = $('bgaPrev'), [w, h] = form.size, st = $('bgaStyle').value;
    const t = +$('bgaTop').value, b = +$('bgaBottom').value, s = +$('bgaSide').value;
    $('bgaTopV').textContent = toFa(t) + '٪'; $('bgaBottomV').textContent = toFa(b) + '٪'; $('bgaSideV').textContent = toFa(s) + '٪';
    p.style.aspectRatio = `${w}/${h}`; p.style.backgroundImage = `url("${form.src}")`;
    const q = p.querySelector('b');
    Object.assign(q.style, { top: t + '%', bottom: b + '%', left: s + '%', right: s + '%', borderColor: BOX[st] });
  }
  function openForm(f, e) {
    form = f;
    $('bgaEdit').hidden = false;
    $('bgaName').value = e?.name || '';
    $('bgaStyle').value = e?.style || 'night';
    const [l, t, , b] = e?.win || [.08, .16, .92, .88];
    $('bgaTop').value = Math.round(t * 100); $('bgaBottom').value = Math.round((1 - b) * 100); $('bgaSide').value = Math.round(l * 100);
    $('bgaAdd').textContent = e ? 'ذخیره تغییرات' : 'افزودن این زمینه';
    preview();
  }
  function closeForm() { if (form?.src?.startsWith('blob:')) URL.revokeObjectURL(form.src); form = null; $('bgaEdit').hidden = true; $('bgaFile').value = ''; }

  function build(p) {
    pane = p;
    const card = document.createElement('div'); card.className = 'adm-card'; card.id = 'bgaCard';
    card.innerHTML = `<h3>زمینه‌های صفحه اول</h3>
<p class="hint">هر بار که کسی سایت را باز می‌کند، یکی از زمینه‌های روشن نشان داده می‌شود و هر کس در منو می‌تواند یکی را برای خودش انتخاب کند. دست‌کم یکی باید روشن بماند.</p>
<div class="bga-list" id="bgaList"></div><div class="adm-msg" id="bgaMsg"></div>
<div class="bga-form"><label for="bgaFile">افزودن زمینه تازه (تصویر ایستاده، مثل صفحه گوشی)</label><input type="file" id="bgaFile" accept="image/*">
<div id="bgaEdit" hidden>
<label for="bgaName">نام</label><input type="text" id="bgaName" maxlength="30" placeholder="مثلاً گل‌های بهاری">
<label for="bgaStyle">رنگ و نقش کادرها</label><select id="bgaStyle">${STYLES.map(k => `<option value="${k}">${k === 'dark' ? 'تیره (برای تصویرهای تیره)' : `مثل «${esc(names()[k])}»`}</option>`).join('')}</select>
<p class="hint">کادرها فقط داخل مستطیل خط‌چین دیده می‌شوند. آن را روی بخش ساده و خلوت تصویر بگذارید.</p>
<div class="bga-edit"><div class="bga-prev" id="bgaPrev"><b></b></div><div class="bga-rng">
<label for="bgaTop">فاصله از بالا <span id="bgaTopV"></span></label><input type="range" id="bgaTop" min="0" max="45">
<label for="bgaBottom">فاصله از پایین <span id="bgaBottomV"></span></label><input type="range" id="bgaBottom" min="0" max="45">
<label for="bgaSide">فاصله از دو طرف <span id="bgaSideV"></span></label><input type="range" id="bgaSide" min="0" max="30">
</div></div>
<div class="reg-tools"><button type="button" id="bgaAdd">افزودن این زمینه</button><button type="button" class="reg-light" id="bgaCancel">انصراف</button></div>
</div></div>`;
    p.appendChild(card);
    list();

    card.addEventListener('input', e => { if (e.target.closest('.bga-edit') || e.target.id === 'bgaStyle') preview(); });
    card.addEventListener('change', async e => {
      if (e.target.id === 'bgaStyle') return preview();
      if (e.target.id === 'bgaFile') {
        const f = e.target.files[0]; if (!f) return;
        try { const s = await shrink(f); openForm({ blob: s.blob, ext: s.ext, size: [s.w, s.h], src: URL.createObjectURL(s.blob) }); msg(''); }
        catch (err) { msg(err.message); }
        return;
      }
      if (!e.target.matches('[data-on]')) return;
      const id = e.target.closest('[data-id]').dataset.id, on = e.target.checked, c = conf();
      if (BUILT.includes(id)) c.off = on ? c.off.filter(x => x !== id) : [...new Set([...c.off, id])];
      else c.custom.forEach(x => { if (x.id === id) x.on = on; });
      const left = BUILT.filter(x => !c.off.includes(x)).length + c.custom.filter(x => x.on !== false).length;
      if (!left) { e.target.checked = true; return msg('دست‌کم یک زمینه باید روشن بماند.'); }
      try { await save(c, on ? 'روشن شد.' : 'خاموش شد؛ دیگر به کسی نشان داده نمی‌شود.'); } catch (err) { e.target.checked = !on; msg(err.message); }
    });
    card.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'bgaCancel') return closeForm();
      if (b.id === 'bgaAdd') return submit(b);
      const row = b.closest('[data-id]'); if (!row) return;
      const id = row.dataset.id, c = conf(), x = c.custom.find(y => y.id === id);
      if (b.hasAttribute('data-see')) return window.open('./?bg=' + encodeURIComponent(id), '_blank');
      if (b.hasAttribute('data-edit') && x) { openForm({ id, url: x.url, size: x.size, src: x.url }, x); $('bgaEdit').scrollIntoView({ block: 'nearest' }); return; }
      if (b.hasAttribute('data-del') && x) {
        if (!confirm(`زمینه «${x.name}» برای همیشه حذف شود؟`)) return;
        c.custom = c.custom.filter(y => y.id !== id);
        if (!BUILT.some(k => !c.off.includes(k)) && !c.custom.some(y => y.on !== false)) return msg('دست‌کم یک زمینه باید روشن بماند؛ اول زمینه دیگری را روشن کنید.');
        try {
          await save(c, 'حذف شد.');
          storage('DELETE', x.url.split('/').pop()).catch(() => {}); // اگر فایل پاک نشد، فقط در Storage می‌ماند
        } catch (err) { msg(err.message); }
      }
    });
  }

  async function submit(b) {
    if (!form) return;
    const name = $('bgaName').value.trim(); if (!name) { $('bgaName').focus(); return msg('یک نام برای زمینه بنویسید.'); }
    const t = +$('bgaTop').value / 100, bo = +$('bgaBottom').value / 100, s = +$('bgaSide').value / 100;
    if (1 - bo - t < .25) return msg('قاب وسط خیلی کوتاه است؛ فاصله بالا یا پایین را کم کنید.');
    const entry = { name, style: $('bgaStyle').value, size: form.size, win: [s, t, 1 - s, 1 - bo].map(v => Math.round(v * 1000) / 1000) };
    b.disabled = true; msg('در حال ذخیره…', true);
    try {
      const c = conf();
      if (form.id) Object.assign(c.custom.find(y => y.id === form.id) || {}, entry);
      else {
        const id = 'c' + Date.now().toString(36), file = `${id}.${form.ext}`;
        await storage('POST', file, form.blob, form.blob.type);
        c.custom.push({ id, ...entry, url: publicUrl(file), on: true });
      }
      await save(c, form.id ? 'ذخیره شد.' : 'اضافه شد و از همین حالا بین زمینه‌ها نشان داده می‌شود.');
      closeForm();
    } catch (err) { msg(err.message); }
    finally { b.disabled = false; }
  }

  document.addEventListener('admin:tab', e => {
    if (e.detail !== 'settings') return;
    const p = $('pane-settings');
    if (p && !$('bgaCard')) build(p); else if (pane) list();
  });
  // اگر زبانه تنظیمات پیش از بارگذاری این فایل باز شده بود
  const p0 = $('pane-settings'); if (p0 && !p0.hidden) build(p0);
})();
