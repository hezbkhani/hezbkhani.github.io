// «زمینه خودم» در منو › زمینه صفحه: هر کس یک تصویر برای خودش می‌گذارد که فقط روی همین گوشی (localStorage، کلید bgMine) می‌ماند
// و به کسی دیگر نشان داده نمی‌شود. شکل ذخیره: { name, style, url: data:image/…, size: [w, h], win: [چپ، بالا، راست، پایین] }.
// اسکریپت <head> در index.html آن را با bgxMine() می‌خواند (bgPick=mine). کوچک کردن تصویر: bgxShrink در bg-admin.js.
(function () {
  const KEY = 'bgMine';
  const STYLES = ['night', 'sage', 'blue', 'garden', 'dark'];
  const BOX = { night: '#1f5a3a', sage: '#6b8a66', blue: '#3e5f84', garden: '#3c7a66', dark: '#c9a35a' };
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const label = k => k === 'dark' ? 'تیره (برای تصویرهای تیره)' : `مثل «${(window.bgxNames || {})[k] || k}»`;
  const toData = blob => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(Error('تصویر خوانده نشد.')); r.readAsDataURL(blob); });

  window.bgxMineEdit = function (box) {
    if (!box || !window.bgxShrink) return;
    if (box.firstChild) { box.innerHTML = ''; return; } // زدن دوباره، می‌بندد
    const cur = window.bgxMine?.();
    let img = cur ? { url: cur.url, size: cur.size } : null;
    box.innerHTML = `<div class="bga-form" style="padding:0 16px 10px">
<p class="hint" style="margin:6px 0">تصویری که این‌جا می‌گذارید فقط روی همین گوشی و فقط برای خودتان نشان داده می‌شود.</p>
<label>تصویر (ایستاده، مثل صفحه گوشی)</label><input type="file" accept="image/*" data-f="file">
<div data-f="edit"${img ? '' : ' hidden'}>
<label>رنگ و نقش کادرها</label><select data-f="style">${STYLES.map(k => `<option value="${k}">${label(k)}</option>`).join('')}</select>
<p class="hint" style="margin:6px 0">کادرها فقط داخل مستطیل خط‌چین دیده می‌شوند.</p>
<div class="bga-edit"><div class="bga-prev"><b></b></div><div class="bga-rng">
<label>فاصله از بالا <span data-v="t"></span></label><input type="range" data-f="t" min="0" max="45">
<label>فاصله از پایین <span data-v="b"></span></label><input type="range" data-f="b" min="0" max="45">
<label>فاصله از دو طرف <span data-v="s"></span></label><input type="range" data-f="s" min="0" max="30">
</div></div></div>
<div class="reg-tools" style="margin-top:8px"><button type="button" data-f="save"${img ? '' : ' hidden'}>ذخیره و نمایش</button>${cur ? '<button type="button" class="reg-light" data-f="del">حذف زمینه من</button>' : ''}</div>
<div class="adm-msg" data-f="msg"></div></div>`;
    const q = f => box.querySelector(`[data-f="${f}"]`);
    const msg = (t, ok) => { const e = q('msg'); e.className = 'adm-msg ' + (ok ? 'adm-ok' : 'adm-bad'); e.textContent = t; };
    const [l, t, , b] = cur?.win || [.08, .16, .92, .88];
    q('style').value = cur?.style || 'night';
    q('t').value = Math.round(t * 100); q('b').value = Math.round((1 - b) * 100); q('s').value = Math.round(l * 100);
    function preview() {
      if (!img) return;
      const p = box.querySelector('.bga-prev'), r = p.querySelector('b');
      p.style.aspectRatio = `${img.size[0]}/${img.size[1]}`; p.style.backgroundImage = `url("${img.url}")`;
      ['t', 'b', 's'].forEach(k => { box.querySelector(`[data-v="${k}"]`).textContent = toFa(q(k).value) + '٪'; });
      Object.assign(r.style, { top: q('t').value + '%', bottom: q('b').value + '%', left: q('s').value + '%', right: q('s').value + '%', borderColor: BOX[q('style').value] });
    }
    box.addEventListener('input', preview);
    q('file').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        let s = await window.bgxShrink(file, 1440, .8), url = await toData(s.blob);
        if (url.length > 1.6e6) { s = await window.bgxShrink(file, 1200, .6); url = await toData(s.blob); }
        img = { url, size: [s.w, s.h] };
        q('edit').hidden = false; q('save').hidden = false; msg(''); preview();
      } catch (err) { msg(err.message); }
    };
    q('save').onclick = () => {
      const tt = +q('t').value / 100, bb = +q('b').value / 100, ss = +q('s').value / 100;
      if (1 - bb - tt < .25) return msg('قاب وسط خیلی کوتاه است؛ فاصله بالا یا پایین را کم کنید.');
      const m = { name: 'زمینه من', style: q('style').value, url: img.url, size: img.size, win: [ss, tt, 1 - ss, 1 - bb].map(v => Math.round(v * 1000) / 1000) };
      try { localStorage.setItem(KEY, JSON.stringify(m)); localStorage.setItem('bgPick', 'mine'); }
      catch { return msg('جای ذخیره روی این گوشی کافی نیست؛ تصویر کوچک‌تری انتخاب کنید.'); }
      location.reload();
    };
    if (cur) q('del').onclick = () => {
      try { localStorage.removeItem(KEY); if (localStorage.getItem('bgPick') === 'mine') localStorage.removeItem('bgPick'); } catch {}
      location.reload();
    };
    preview();
  };
})();
