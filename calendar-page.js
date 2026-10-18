// برگه تقویم مناسبت‌ها؛ calendar.js این فایل را با اولین باز کردن بار می‌کند.
// جدول ماه شمسی (از شنبه، راست به چپ)، زیر هر روز روز قمری؛ نقطه یعنی مناسبت دارد. با زدن هر روز، مناسبت و اعمال آن روز
// با پیوند به متن‌ها می‌آید. مناسبت‌ها، تاریخ قمری (با همان جابه‌جایی مدیر) و اعمال همه از daily.js (window.dailyInfo) است.
// تاریخ شمسی از تقویم persian مرورگر است (همان که daily.js به کار می‌برد)؛ با الگوریتم jalaali برای سال‌های ۱۳۰۰ تا ۱۵۰۰ سنجیده شد.
(function () {
  const DAY = 864e5, fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `
.cal-shade{position:fixed;inset:0;z-index:60;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.cal-box{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:calup .25s ease}
@keyframes calup{from{transform:translateY(40px);opacity:.4}}
.cal-top{display:flex;align-items:center;gap:6px}
.cal-top .cal-t{flex:1;min-width:0;text-align:center;line-height:1.5}
.cal-t b{display:block;font:normal 28px/1.5 SiteFont,Tahoma,serif;color:var(--deep)}
.cal-t small{display:block;font-size:13.5px;color:var(--muted)}
.cal-box .cal-nav,.cal-box .cal-x{flex:none;width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid var(--line);border-radius:var(--r);color:var(--deep)}
.cal-box .cal-x{border:0;color:var(--muted);font-size:22px}
.cal-nav svg{width:22px;height:22px}
.cal-box .cal-today{display:block;margin:2px auto 0;height:36px;padding:0 14px;background:var(--mint);color:var(--deep);border:1px solid var(--line);border-radius:var(--pill);font-size:14px;font-weight:600}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin:8px 0 0}
.cal-wd{text-align:center;font-size:13px;font-weight:600;color:var(--muted);padding:2px 0}
.cal-wd.fri{color:#9b2636}
.cal-box .cal-d{position:relative;height:auto;min-height:52px;padding:4px 0 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:var(--r);font-weight:600;font-size:17px;line-height:1.3;white-space:normal}
.cal-d small{font-size:11.5px;font-weight:500;color:var(--muted)}
.cal-d.h1 small{color:var(--deep);font-weight:700}
.cal-d.fri{color:#9b2636}
.cal-d i{position:absolute;bottom:3px;left:50%;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:var(--gold)}
.cal-box .cal-d.now{box-shadow:inset 0 0 0 2px var(--emerald);background:var(--mint)}
.cal-box .cal-d[aria-pressed=true]{background:var(--deep);color:#fff;border-color:var(--deep)}
.cal-d[aria-pressed=true] small{color:#e8f3ee}
.cal-d[aria-pressed=true] i{background:#fff}
.cal-box .cal-d:focus-visible{outline:2px solid var(--deep);outline-offset:2px}
.cal-day{margin:12px 0 0;padding:10px 12px;background:#fff;border:1px solid var(--gold);border-radius:var(--r-card)}
.cal-day h3{margin:0;font-size:16.5px;color:var(--deep)}
.cal-day h3 small{display:block;font-size:13.5px;font-weight:500;color:var(--muted)}
.cal-day ul{margin:6px 0 0;padding:0;list-style:none}
.cal-day li{padding:3px 0;font-weight:600;line-height:1.7}
.cal-day li.soft{font-weight:500;color:var(--muted)}
.cal-day .hol{display:inline-block;margin-inline-start:6px;padding:0 7px;border-radius:var(--pill);font-size:12px;font-weight:600;line-height:1.7;color:#9b2636;border:1px solid #d9a3a3;vertical-align:middle}
.cal-day .cal-none{margin:6px 0 0;color:var(--muted);font-size:14.5px}
.cal-acts{display:grid;gap:4px;margin-top:8px}
.cal-box .cal-act{display:flex;align-items:center;gap:10px;width:100%;height:auto;min-height:46px;padding:2px 10px;background:transparent;color:inherit;border:1px solid var(--line);border-radius:var(--r);white-space:normal;text-align:right;font-weight:500;line-height:1.5}
.cal-act:hover{background:var(--hover)}
.cal-act span:nth-child(2){flex:1;min-width:0}
.cal-act b{color:var(--deep);font-weight:600}
.cal-act small{display:block;font-size:13px;color:var(--muted)}
.cal-note{margin:10px 0 0;font-size:13px;color:var(--muted);text-align:center}
@media(min-width:600px){.cal-shade{align-items:center}.cal-box{border-radius:var(--r-panel);border-bottom:2px solid var(--gold)}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  const isoMs = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const SH = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  const MN = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', month: 'long' });
  const sh = t => { const p = SH.formatToParts(new Date(t + 432e5)), g = k => +p.find(x => x.type === k).value; return { y: g('year'), m: g('month'), d: g('day') }; };
  // روز اول ماه شمسی (y، m) به میلی‌ثانیه؛ از برآورد نزدیک (نوروز حدود ۲۱ مارس) روز به روز تا رسیدن به همان ماه.
  function first(y, m) {
    let t = Date.UTC(y + 621, 2, 21) + ((m - 1) * 31 - Math.max(0, m - 7)) * DAY;
    for (let i = 0; i < 6; i++) { const p = sh(t), c = (p.y - y) * 12 + p.m - m; if (!c) return t - (p.d - 1) * DAY; t += (c < 0 ? 1 : -1) * DAY; }
    return t;
  }
  const hl = s => window.ibadat?.hijriLabel?.(s) || '';
  const hMonth = s => hl(s).replace(/^[۰-۹\d]+\s*/, '');
  // «ربیع‌الثانی – جمادی‌الاول ۱۴۴۸»؛ اگر سال قمری در میانه ماه عوض شود، سال هر دو نوشته می‌شود.
  const hRange = (a, b) => { if (a === b) return a; const y = x => x.split(' ').pop(); return `${y(a) === y(b) ? a.slice(0, -y(a).length).trim() : a} – ${b}`; };

  let shade = null, cur = null, sel = '';
  function grid() {
    const info = window.dailyInfo, today = info.today(), t0 = first(cur.y, cur.m);
    let n = 0; while (n < 31 && sh(t0 + n * DAY).m === cur.m) n++;
    const lastIso = iso(t0 + (n - 1) * DAY), h1 = hMonth(iso(t0)), h2 = hMonth(lastIso);
    const lead = (new Date(t0).getUTCDay() + 1) % 7; // شنبه ستون اول
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span aria-hidden="true"></span>';
    for (let i = 0; i < n; i++) {
      const s = iso(t0 + i * DAY), d = info(s), fri = new Date(t0 + i * DAY).getUTCDay() === 5;
      const lab = `${toFa(i + 1)} ${MN.format(new Date(t0 + 432e5))}${d.occ.length ? '، ' + d.occ.map(o => o.t).join('، ') : ''}`;
      cells += `<button type="button" class="cal-d${s === today ? ' now' : ''}${fri ? ' fri' : ''}${d.hijri?.d === 1 ? ' h1' : ''}" data-d="${s}" aria-pressed="${s === sel}" aria-label="${esc(lab)}"${s === today ? ' aria-current="date"' : ''}>${toFa(i + 1)}${d.hijri ? `<small>${toFa(d.hijri.d)}</small>` : ''}${d.occ.length ? '<i></i>' : ''}</button>`;
    }
    const arrow = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
    const inMonth = today >= iso(t0) && today <= lastIso;
    return `<div class="cal-top"><button type="button" class="cal-nav" data-cal="prev" aria-label="ماه قبل">${arrow('M9 6l6 6-6 6')}</button>
<div class="cal-t" aria-live="polite"><b>${esc(MN.format(new Date(t0 + 432e5)))} ${toFa(cur.y)}</b>${h1 ? `<small>${esc(hRange(h1, h2))}</small>` : ''}</div>
<button type="button" class="cal-nav" data-cal="next" aria-label="ماه بعد">${arrow('M15 6l-6 6 6 6')}</button><button type="button" class="cal-x" data-cal="close" aria-label="بستن">✕</button></div>
${inMonth ? '' : '<button type="button" class="cal-today" data-cal="today">برگشت به امروز</button>'}
<div class="cal-grid">${['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w, i) => `<span class="cal-wd${i === 6 ? ' fri' : ''}" aria-hidden="true">${w}</span>`).join('')}${cells}</div>
<div class="cal-day" aria-live="polite">${dayHtml(sel)}</div>
<p class="cal-note">نقطه زیر روز یعنی مناسبت دارد. تاریخ قمری ممکن است با رؤیت هلال یک روز جابه‌جا شود.</p>`;
  }
  function dayHtml(s) {
    if (!s) return '<p class="cal-none">روزی را بزنید تا مناسبت و اعمال آن را ببینید.</p>';
    const d = window.dailyInfo(s, true);
    const occ = d.occ.map(o => `<li${o.soft ? ' class="soft"' : ''}>${esc(o.t)}${o.hol ? '<span class="hol">تعطیل</span>' : ''}</li>`).join('') + d.nights.map(t => `<li>از غروب: ${esc(t)}</li>`).join('');
    return `<h3>${esc(d.date)}${d.hl ? `<small>${esc(d.hl)}</small>` : ''}</h3>${occ ? `<ul>${occ}</ul>` : (d.acts.length ? '' : '<p class="cal-none">مناسبت خاصی ثبت نشده است.</p>')}${d.acts.length ? `<div class="cal-acts">${d.acts.map(a => `<button type="button" class="cal-act" data-go="${esc(a.go)}"><span aria-hidden="true">${a.ic}</span><span><b>${esc(a.t)}</b><small>${esc(a.s)}</small></span><span aria-hidden="true">‹</span></button>`).join('')}</div>` : ''}`;
  }
  function paint(focus) {
    const box = shade.querySelector('.cal-box'), y = box.scrollTop;
    box.innerHTML = grid(); box.scrollTop = y;
    if (focus) box.querySelector(focus)?.focus({ preventScroll: true });
  }
  function show(s) { const p = sh(isoMs(s)); cur = { y: p.y, m: p.m }; sel = s; }
  function open(s) {
    if (!window.dailyInfo) return;
    show(s || window.dailyInfo.today());
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'cal-shade';
      shade.innerHTML = '<div class="cal-box" role="dialog" aria-modal="true" aria-label="تقویم مناسبت‌ها"></div>';
      shade.addEventListener('click', onClick);
    }
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    paint('.cal-x');
    try { if (!history.state?.cal) history.pushState({ cal: 1 }, ''); } catch {}
  }
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    shade.remove(); document.body.classList.remove('ib-lock');
    if (!fromHistory) { try { if (history.state?.cal) history.back(); } catch {} }
  }
  function onClick(e) {
    if (e.target === shade) return close();
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.cal;
    if (a === 'close') return close();
    if (a === 'prev' || a === 'next') {
      const k = cur.y * 12 + cur.m - 1 + (a === 'next' ? 1 : -1); cur = { y: Math.floor(k / 12), m: k % 12 + 1 };
      const today = window.dailyInfo.today(), p = sh(isoMs(today));
      sel = p.y === cur.y && p.m === cur.m ? today : iso(first(cur.y, cur.m));
      return paint(`[data-cal=${a}]`);
    }
    if (a === 'today') { show(window.dailyInfo.today()); return paint('.cal-d.now'); }
    if (b.dataset.d) {
      sel = b.dataset.d;
      shade.querySelectorAll('.cal-d').forEach(x => x.setAttribute('aria-pressed', x === b));
      const day = shade.querySelector('.cal-day'); day.innerHTML = dayHtml(sel);
      const r = day.getBoundingClientRect(); if (r.bottom > innerHeight) day.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (b.dataset.go) {
      // تقویم بسته می‌شود و متن جای آن در تاریخچه می‌نشیند (مثل برگه‌های ibadat.js).
      close(true); try { if (history.state?.cal) history.replaceState(null, ''); } catch {}
      window.dailyInfo.go(b.dataset.go);
    }
  }
  window.addEventListener('popstate', () => { if (!history.state?.cal) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.calPage = { open, close };
})();
