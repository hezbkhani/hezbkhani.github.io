// کارت «گزارش استفاده از سایت» در ‎#admin‎ › گزارش‌ها (usage.js این فایل را فقط هنگام باز شدن آن زبانه بارگذاری می‌کند).
// داده از تابع usage_report (backend/supabase/usage.sql)؛ فقط وقتی مدیر کارت را باز کند خوانده می‌شود.
(function () {
  const fa = n => Number(n || 0).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OPEN = 'usageOpen', DAYS = 'usageDays';
  const ls = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const dayFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long' });
  const dLabel = iso => dayFmt.format(new Date(iso + 'T12:00:00Z'));
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

  // نام بخش‌ها: کلید ردیف تاریخچه‌ای که هر برگه هنگام باز شدن می‌سازد (usage.js)
  const SECTIONS = {
    qr: ['📖', 'قرآن‌خوان (سهم امروز و متن قرآن)'],
    qf: ['📗', 'قرآن آزاد'],
    mf: ['📚', 'مفاتیح‌الجنان'],
    chl: ['🕯️', 'خواندن متن چله‌ها و دعاها'],
    chs: ['📝', 'ثبت‌نام چله‌ها و دوره‌ها'],
    ib: ['🤲', 'اعمال و ختم‌ها'],
    kh: ['📗', 'ختم گروهی جزء به جزء'],
    zk: ['📿', 'ذکرشمار'],
    nrm: ['🏠', 'نوران من'],
    bks: ['📚', 'کتاب‌ها'],
    bkr: ['📘', 'خواندن کتاب'],
    cal: ['📅', 'تقویم مناسبت‌ها'],
    qb: ['🧭', 'قبله‌نما'],
    srch: ['🔎', 'جستجو'],
    qps: ['☰', 'کارهای آیه (نشانه، تفسیر، پخش)'],
    qpl: ['🔖', 'نشانه‌ها و یادداشت‌های من'],
    qpc: ['🖼️', 'ساختن تصویر آیه'],
    ns: ['🔔', 'تنظیمات اعلان‌ها'],
    cf: ['🔠', 'اندازه متن و حالت تاریک'],
    ft: ['⚙️', 'نمایش امکانات'],
    acs: ['👤', 'حساب کاربری']
  };

  const css = `
#usageCard>summary{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;list-style:none;font-size:19px;font-weight:700;color:var(--deep)}
#usageCard>summary::-webkit-details-marker{display:none}
#usageCard>summary b{flex:1}
#usageCard>summary i{font-style:normal;color:var(--muted);font-size:14px;transition:transform .2s}
#usageCard[open]>summary i{transform:rotate(180deg)}
.us-per{display:flex;gap:6px;margin:8px 0}
.us-per button{flex:1;height:38px;padding:0 6px;font-size:14.5px}
.us-per button.on{background:var(--deep);color:#fff;border-color:var(--deep)}
.us-sec{margin:16px 0 4px}
.us-sec h4{margin:0 0 2px;font-size:16px;color:var(--deep)}
.us-sec>p{margin:0 0 6px;font-size:14px;color:var(--muted)}
.us-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.us-tile{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:#fffdf7}
.us-tile b{display:block;font-size:24px;color:var(--deep);line-height:1.4}
.us-tile small{color:var(--muted);font-size:13px}
.us-tile em{font-style:normal;font-size:13px;margin-inline-start:4px}
.us-up{color:#1d7a3e}.us-down{color:#a3412b}
.us-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;padding:6px 0;border-bottom:1px solid #f0e8d6;font-size:14.5px}
.us-row:last-child{border-bottom:0}
.us-row span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.us-row small{color:var(--muted);font-size:13.5px;white-space:nowrap}
.us-row .tr{grid-column:1/-1;height:8px;border-radius:999px;background:#ece3cf;overflow:hidden}
.us-row .tr i{display:block;margin-left:auto;height:100%;border-radius:999px;background:var(--emerald)}
.us-more summary{cursor:pointer;color:var(--muted);min-height:36px;font-size:14px}
.us-chart{color:var(--emerald)}
.us-chart svg{direction:ltr;display:block;width:100%;height:auto}
.us-chart rect{fill:currentColor}
.us-chart rect.now{opacity:.45}
.us-chart text{fill:var(--muted);font-size:11px;font-family:inherit}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ستون‌های ساده بازدیدکننده هر روز؛ روز اول سمت راست، امروز سمت چپ.
  function chart(series, today, days) {
    const n = Math.min(days, 90), list = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
    const map = Object.fromEntries((series || []).map(x => [x.d, x.n])), vals = list.map(d => map[d] || 0), max = Math.max(1, ...vals);
    const W = 320, H = 120, B = 18, bw = W / n;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="بازدیدکننده هر روز؛ بیشترین ${fa(max)}">`;
    list.forEach((d, i) => {
      const h = vals[i] ? Math.max(2, vals[i] / max * (H - B - 14)) : 0, x = W - (i + 1) * bw;
      s += `<rect class="${i === n - 1 ? 'now' : ''}" x="${x + bw * .15}" y="${H - B - h}" width="${bw * .7}" height="${h}" rx="${Math.min(2, bw * .3)}"><title>${esc(i === n - 1 ? 'امروز' : dLabel(d))}: ${fa(vals[i])} نفر</title></rect>`;
    });
    s += `<text x="${W - 2}" y="${H - 4}" text-anchor="end">${esc(dLabel(list[0]))}</text><text x="2" y="${H - 4}">امروز</text><text x="${W - 2}" y="10" text-anchor="end">${fa(max)}</text>`;
    return s + '</svg>';
  }
  const change = (now, prev) => {
    if (!prev) return '';
    const p = Math.round((now - prev) / prev * 100);
    return p ? `<em class="${p > 0 ? 'us-up' : 'us-down'}">${p > 0 ? '▲' : '▼'} ${fa(Math.abs(p))}٪</em>` : '';
  };
  // فهرست رتبه‌ای با نوار؛ پس از ۱۰ ردیف، بقیه زیر «بیشتر» جمع می‌شوند.
  function bars(rows, name, unit) {
    if (!rows.length) return '<p class="hint">هنوز چیزی شمرده نشده است.</p>';
    const max = Math.max(1, ...rows.map(r => r.n));
    const row = r => `<div class="us-row"><span>${name(r)}</span><small>${fa(r.n)} ${unit}${r.prev != null ? ' ' + change(r.n, r.prev) : ''}</small><div class="tr"><i style="width:${Math.round(r.n / max * 100)}%"></i></div></div>`;
    const head = rows.slice(0, 10).map(row).join(''), rest = rows.slice(10);
    return head + (rest.length ? `<details class="us-more"><summary>${fa(rest.length)} مورد دیگر</summary>${rest.map(row).join('')}</details>` : '');
  }

  let card = null, data = null, at = 0, loading = false;
  const days = () => +ls.get(DAYS, 30) || 30;
  async function fill(force) {
    const body = card.querySelector('.us-body');
    if (loading) return;
    if (!force && data && data.days === days() && Date.now() - at < 3e5) return draw(body);
    loading = true; if (!data) body.innerHTML = '<p class="hint">در حال بارگذاری…</p>';
    try { data = await window.sbRpc('usage_report', { p_days: days() }, true); at = Date.now(); draw(body); }
    catch (e) { body.innerHTML = `<p class="adm-msg adm-bad">${esc(/راه‌اندازی نشده/.test(e.message) ? 'ابتدا usage.sql را در Supabase اجرا کنید (backend/supabase/usage.sql).' : e.message)}</p><div class="reg-tools"><button type="button" class="reg-light" data-us="reload">دوباره</button></div>`; }
    finally { loading = false; }
  }
  function draw(body) {
    const d = data, t = d.totals || {}, n = d.days, visits = t['visit:all'] || 0;
    const todayN = (d.visits || []).find(x => x.d === d.today)?.n || 0;
    const pct = (a, b) => (a + b ? Math.round(a / (a + b) * 100) : 0);
    const on = window.siteSettings?.usage?.enabled === true;
    const num = k => esc(/^\d+$/.test(k) ? fa(k) : k), grp = r => r.name ? `${esc(r.name)} (شماره ${num(r.key)})` : `گروه ${num(r.key)}`;
    const sec = r => { const s = SECTIONS[r.key]; return s ? `${s[0]} ${esc(s[1])}` : esc(r.key); };
    body.innerHTML = `<label class="adm-opt"><input type="checkbox" data-us="on"${on ? ' checked' : ''}> <span>شمارش استفاده از سایت روشن باشد</span></label>
<p class="hint">بدون ابزار بیرونی و بدون اطلاعات شخصی: فقط شمارنده روزانه ذخیره می‌شود (نه نام، نه شناسه، نه نشانی). هر گوشی هر بخش را روزی یک بار شمرده می‌شود، پس هر عدد یعنی «چند نفر در چند روز». در ‎#admin‎ چیزی شمرده نمی‌شود.</p><div class="adm-msg" data-us-msg></div>
${!d.first ? `<p class="hint">${on ? 'شمارش روشن است؛ از اولین بازدید بعدی، اعداد اینجا دیده می‌شوند.' : 'برای شروع، شمارش را روشن کنید. اعداد از همان لحظه جمع می‌شوند.'}</p>` : `
<div class="us-per">${[7, 30, 90].map(k => `<button type="button" class="reg-light${k === n ? ' on' : ''}" data-us-days="${k}">${fa(k)} روز</button>`).join('')}</div>
${d.first > addDays(d.today, 1 - n) ? `<p class="hint">شمارش از ${esc(dLabel(d.first))} شروع شده است.</p>` : ''}
<div class="us-tiles">
<div class="us-tile"><b>${fa(todayN)}</b><small>بازدیدکننده امروز</small></div>
<div class="us-tile"><b>${fa(Math.round(visits / n))}${change(visits, d.prev)}</b><small>میانگین روزانه، ${fa(n)} روز گذشته</small></div>
<div class="us-tile"><b>${fa(t['visit:new'])}</b><small>گوشی یا رایانه تازه</small></div>
<div class="us-tile"><b>${fa(pct(t['env:app'] || 0, t['env:browser'] || 0))}٪</b><small>با برنامه نصب‌شده (بقیه با مرورگر)</small></div>
<div class="us-tile"><b>${fa(pct(t['env:phone'] || 0, t['env:desktop'] || 0))}٪</b><small>با گوشی (بقیه با رایانه)</small></div>
</div>
<div class="us-sec"><h4>بازدیدکننده هر روز</h4><div class="us-chart">${chart(d.visits, d.today, n)}</div></div>
<div class="us-sec"><h4>بخش‌هایی که بیشتر استفاده می‌شوند</h4><p>چند بار (نفر در روز) هر بخش باز شده است؛ پیکان، تغییر نسبت به ${fa(n)} روز قبل از آن است.</p>${bars(d.sections || [], sec, 'بار')}</div>
<div class="us-sec"><h4>گروه‌های حزب‌خوانی</h4><p>بازدید اعضای هر گروه (کسانی که شناسه حزب‌خوانی را روی گوشی‌شان وارد کرده‌اند).</p>${bars(d.groups || [], grp, 'بار')}</div>
<div class="us-sec"><h4>گزینه‌های منوی ☰</h4><p>چه گزینه‌هایی در منو زده شده‌اند.</p>${bars(d.menu || [], r => esc(r.key), 'بار')}</div>`}
<div class="reg-tools"><button type="button" class="reg-light" data-us="reload">به‌روزرسانی</button></div>`;
  }

  async function toggle(box) {
    const m = card.querySelector('[data-us-msg]'), want = box.checked;
    box.disabled = true;
    try {
      await window.saveSiteSetting('usage', { enabled: want });
      document.dispatchEvent(new Event('settings:changed'));
      m.className = 'adm-msg adm-ok';
      m.textContent = want ? 'روشن شد؛ از بازدیدهای بعدی شمرده می‌شود.' : 'خاموش شد؛ چیزی شمرده نمی‌شود. اعداد قبلی می‌مانند.';
    } catch (e) { box.checked = !want; m.className = 'adm-msg adm-bad'; m.textContent = e.message; }
    finally { box.disabled = false; }
  }

  function mount(pane) {
    if (!card || !card.isConnected) {
      card = document.createElement('details'); card.className = 'adm-card'; card.id = 'usageCard';
      card.innerHTML = '<summary><span aria-hidden="true">📈</span><b>گزارش استفاده از سایت</b><i>▾</i></summary><div class="us-body"></div>';
      card.open = ls.get(OPEN) === '1';
      card.addEventListener('toggle', () => { ls.set(OPEN, card.open ? '1' : '0'); if (card.open) fill(); });
      card.addEventListener('click', e => {
        const p = e.target.closest('[data-us-days]');
        if (p) { ls.set(DAYS, p.dataset.usDays); fill(true); return; }
        if (e.target.closest('[data-us="reload"]')) fill(true);
      });
      card.addEventListener('change', e => { if (e.target.matches('[data-us="on"]')) toggle(e.target); });
      // پس از کارت «آمار و نمودارها» اگر هست، وگرنه بالای زبانه
      const dash = pane.querySelector('#dashCard');
      if (dash) dash.after(card); else pane.prepend(card);
    }
    if (card.open) fill();
  }
  window.usageView = { mount };
})();
