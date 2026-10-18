// کارت «آمار و نمودارها» در ‎#admin‎ › گزارش‌ها (dashboard.js این فایل را فقط هنگام باز شدن آن زبانه بارگذاری می‌کند).
// نمودارها با SVG ساده و بدون کتابخانه ساخته می‌شوند. داده فقط وقتی خوانده می‌شود که مدیر کارت را باز کند (یک بار در هر ۵ دقیقه).
(function () {
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OPEN = 'dashOpen';
  const isOpen = () => { try { return localStorage.getItem(OPEN) === '1'; } catch { return false; } };
  const dayFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long' });
  const dLabel = iso => dayFmt.format(new Date(iso + 'T12:00:00Z'));
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

  const css = `
#dashCard>summary{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;list-style:none;font-size:19px;font-weight:700;color:var(--deep)}
#dashCard>summary::-webkit-details-marker{display:none}
#dashCard>summary b{flex:1}
#dashCard>summary i{font-style:normal;color:var(--muted);font-size:14px;transition:transform .2s}
#dashCard[open]>summary i{transform:rotate(180deg)}
.db-sec{margin:14px 0 4px}
.db-sec h4{margin:0 0 2px;font-size:16px;color:var(--deep)}
.db-sec>p{margin:0 0 6px;font-size:14px;color:var(--muted)}
.db-chart{position:relative;color:var(--emerald)}
.db-chart svg{direction:ltr;display:block;width:100%;height:auto;overflow:visible}
.db-chart .ax{fill:var(--muted);font-size:11px;font-family:inherit}
.db-chart .gl{stroke:#e9dfcb;stroke-width:1}
.db-chart rect.b{fill:currentColor}
.db-chart rect.b.now{opacity:.45}
.db-chart g.c:hover rect.b,.db-chart g.c.on rect.b{fill:var(--deep)}
.db-tip{min-height:1.6em;margin-top:2px;font-size:14px;color:var(--ink);text-align:center}
.db-m{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;align-items:center;padding:6px 0;border-bottom:1px solid #f0e8d6;font-size:14.5px}
.db-m:last-child{border-bottom:0}
.db-m span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.db-m small{color:var(--muted);font-size:13.5px;white-space:nowrap}
.db-m .tr{grid-column:1/-1;height:8px;border-radius:999px;background:#ece3cf;overflow:hidden}
.db-m .tr i{display:block;height:100%;border-radius:999px;background:var(--emerald)}
.db-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.db-tile{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:#fffdf7}
.db-tile b{display:block;font-size:24px;color:var(--deep);line-height:1.4}
.db-tile small{color:var(--muted);font-size:13px}
.db-kpi{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px;color:var(--muted);margin:0 0 4px}
.db-kpi b{color:var(--ink)}
.db-tbl{margin-top:4px;font-size:13.5px}
.db-tbl summary{cursor:pointer;color:var(--muted);min-height:32px}
.db-tbl table{width:100%;border-collapse:collapse}
.db-tbl td,.db-tbl th{padding:2px 6px;border-bottom:1px solid #f0e8d6;text-align:right}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ستون‌های روزانه: series = [{d, n}] برای ۳۰ روز تا today (روزهای بی‌داده صفر).
  function columns(el, series, today, unit) {
    const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
    const map = Object.fromEntries((series || []).map(x => [x.d, x.n]));
    const vals = days.map(d => map[d] || 0), max = Math.max(1, ...vals);
    // گام‌های گرد برای خط‌های راهنما
    const step = (() => { const r = max / 3, p = 10 ** Math.floor(Math.log10(r)); return [1, 2, 5, 10].map(m => m * p).find(s => s >= r); })();
    const top = Math.ceil(max / step) * step;
    const W = Math.max(280, Math.round(el.clientWidth || 320)), H = 170, L = 6, R = 34, T = 8, B = 24, pw = W - L - R, ph = H - T - B, bw = pw / 30;
    const y = v => T + ph - v / top * ph;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(unit)} در ۳۰ روز گذشته؛ بیشترین ${fa(max)}">`;
    for (let v = 0; v <= top; v += step) s += `<line class="gl" x1="${L}" x2="${L + pw}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${W - 2}" y="${y(v) + 4}" text-anchor="end">${fa(v)}</text>`;
    // روز اول در سمت راست (مثل خواندن فارسی)، امروز در سمت چپ
    days.forEach((d, i) => {
      const x = L + pw - (i + 1) * bw, h = Math.max(vals[i] ? 2 : 0, y(0) - y(vals[i]));
      s += `<g class="c" data-i="${i}"><rect x="${x}" y="${T}" width="${bw}" height="${ph}" fill="transparent"/><rect class="b${i === 29 ? ' now' : ''}" x="${x + bw * .15}" y="${y(0) - h}" width="${bw * .7}" height="${h}" rx="${Math.min(3, bw * .3)}"><title>${esc(dLabel(d))}: ${fa(vals[i])}</title></rect></g>`;
      if (i % 7 === 1 || i === 29) s += `<text class="ax" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${i === 29 ? 'امروز' : esc(dLabel(d))}</text>`;
    });
    el.innerHTML = s + '</svg><div class="db-tip" aria-live="polite"></div>';
    const tip = el.querySelector('.db-tip');
    const show = g => { el.querySelectorAll('g.c.on').forEach(x => x.classList.remove('on')); if (!g) { tip.textContent = ''; return; } g.classList.add('on'); const i = +g.dataset.i; tip.textContent = `${i === 29 ? 'امروز (تا این لحظه)' : dLabel(days[i])}: ${fa(vals[i])} ${unit}`; };
    el.onpointerover = e => show(e.target.closest('g.c'));
    el.onclick = e => show(e.target.closest('g.c'));
    el.onpointerleave = e => { if (e.pointerType === 'mouse') show(null); };
    // جدول همان داده برای کسی که نمودار را نمی‌بیند
    el.insertAdjacentHTML('beforeend', `<details class="db-tbl"><summary>جدول اعداد</summary><table><tbody>${days.map((d, i) => `<tr><td>${esc(dLabel(d))}</td><td>${fa(vals[i])}</td></tr>`).reverse().join('')}</tbody></table></details>`);
    return vals;
  }
  const meters = rows => rows.length ? rows.map(r => { const p = r.total ? Math.round(r.active / r.total * 100) : 0; return `<div class="db-m"><span>${esc(r.name || r.title)}</span><small>${fa(r.active)} از ${fa(r.total)} (${fa(p)}٪)</small><div class="tr" role="img" aria-label="${fa(p)} درصد"><i style="width:${Math.min(100, p)}%"></i></div></div>`; }).join('') : '<p class="hint">موردی نیست.</p>';
  const avg = (vals, n) => { const a = vals.slice(-1 - n, -1); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0; };

  let card = null, data = null, at = 0, loading = false;
  async function fill() {
    const body = card.querySelector('.db-body');
    if (loading) return;
    if (data && Date.now() - at < 3e5) return draw(body);
    loading = true; if (!data) body.innerHTML = '<p class="hint">در حال بارگذاری…</p>';
    try { data = await window.sbRpc('dash_stats', {}, true); at = Date.now(); draw(body); }
    catch (e) { body.innerHTML = `<p class="adm-msg adm-bad">${esc(/راه‌اندازی نشده/.test(e.message) ? 'ابتدا dashboard.sql را در Supabase اجرا کنید (backend/supabase/dashboard.sql).' : e.message)}</p><div class="reg-tools"><button type="button" class="reg-light" data-db="retry">دوباره</button></div>`; }
    finally { loading = false; }
  }
  function draw(body) {
    const d = data, today = d.today;
    body.innerHTML = `<div class="db-sec"><h4>گزارش‌های روزانه حزب‌خوانی</h4><p>تعداد گزارش‌های ثبت‌شده هر روز در ۳۰ روز گذشته. روی هر ستون بزنید.</p><div class="db-kpi" data-k="r"></div><div class="db-chart" data-c="r"></div></div>
${d.marks ? '<div class="db-sec"><h4>علامت «خواندم» در چله‌ها و دوره‌های قرآن</h4><p>هر روز چند بار اعضا روزشان را علامت زده‌اند.</p><div class="db-kpi" data-k="m"></div><div class="db-chart" data-c="m"></div></div>' : ''}
<div class="db-sec"><h4>اعضای فعال گروه‌های حزب‌خوانی</h4><p>چند نفر از هر گروه در ۷ روز گذشته دست‌کم یک گزارش داده‌اند.</p>${meters(d.groups || [])}</div>
${d.rounds ? `<div class="db-sec"><h4>اعضای فعال دوره‌های باز چله</h4><p>چند نفر از اعضای هر دوره در ۷ روز گذشته علامت زده‌اند.</p>${meters(d.rounds)}</div>` : ''}
${d.push ? `<div class="db-sec"><h4>اعلان‌ها</h4><p>گوشی‌ها و مرورگرهایی که اعلان سایت را روشن کرده‌اند.</p><div class="db-tiles">
<div class="db-tile"><b>${fa(d.push.total)}</b><small>همه اشتراک‌ها</small></div><div class="db-tile"><b>${fa(d.push.hezb)}</b><small>با شناسه حزب‌خوانی</small></div>
<div class="db-tile"><b>${fa(d.push.courses)}</b><small>با کد چله یا دوره</small></div><div class="db-tile"><b>${fa(d.push.new30)}</b><small>تازه در ۳۰ روز اخیر</small></div></div></div>` : ''}
<div class="reg-tools"><button type="button" class="reg-light" data-db="reload">به‌روزرسانی آمار</button></div>`;
    const kpi = (k, vals, unit) => { body.querySelector(`[data-k="${k}"]`).innerHTML = `<span>جمع ۳۰ روز: <b>${fa(vals.reduce((a, b) => a + b, 0))}</b></span><span>میانگین روزانه هفته گذشته: <b>${fa(avg(vals, 7))}</b> ${unit}</span>`; };
    kpi('r', columns(body.querySelector('[data-c="r"]'), d.reports, today, 'گزارش'), 'گزارش');
    if (d.marks) kpi('m', columns(body.querySelector('[data-c="m"]'), d.marks, today, 'علامت'), 'علامت');
  }

  function mount(pane) {
    if (!card || !card.isConnected) {
      card = document.createElement('details'); card.className = 'adm-card'; card.id = 'dashCard';
      card.innerHTML = '<summary><span aria-hidden="true">📊</span><b>آمار و نمودارها</b><i>▾</i></summary><div class="db-body"></div>';
      card.open = isOpen();
      card.addEventListener('toggle', () => { try { localStorage.setItem(OPEN, card.open ? '1' : '0'); } catch {} if (card.open) fill(); });
      card.addEventListener('click', e => { const b = e.target.closest('[data-db]'); if (b) { at = 0; fill(); } });
      pane.prepend(card);
    }
    if (card.open) fill();
  }
  // اندازه نمودار با پهنای صفحه (چرخاندن گوشی)
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (card?.open && data && card.isConnected && !card.closest('[hidden]')) draw(card.querySelector('.db-body')); }, 250); });
  window.dashView = { mount };
})();
