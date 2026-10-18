// بهبودهای کاربری: به خاطر سپردن گروه و شناسه، ثبت گزارش با یک دکمه، پیشرفت شخصی، شمارش معکوس تا اذان صبح،
// چیدمان خواناتر، پیام بارگذاری و خطای شبکه، و در بخش مدیریت: کپی فهرست ثبت‌نشده‌ها و دریافت فایل CSV.
// فعلاً فقط در پیش‌نمایش مدیر (آدرس با ‎#admin‎)؛ برای نمایش به همه، PREVIEW_ONLY را false کنید.
(function () {
  const PREVIEW_ONLY = true;
  const enabled = () => !PREVIEW_ONLY || location.hash === '#admin';
  const ME = 'me', DONE = 'reportedDays';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const del = k => { try { localStorage.removeItem(k); } catch {} };
  const fmtTime = d => new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

  const css = `
body.v2 .panel{background:rgba(24,15,9,.66);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(215,170,91,.35);text-shadow:0 1px 2px #000}
body.v2 .hint,body.v2 .lead{color:#f4ead8}
.x-load{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:6px 2px}
.x-spin{width:20px;height:20px;border:3px solid rgba(255,255,255,.35);border-top-color:var(--gold);border-radius:50%;animation:xs 0.9s linear infinite}
@keyframes xs{to{transform:rotate(360deg)}}
.x-net{grid-column:1/-1;background:var(--cream);color:#5a1b1b;text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px}
.x-net button{margin-top:8px;height:42px}
.x-offline{position:fixed;inset:auto 10px 10px 10px;z-index:40;max-width:660px;margin:0 auto;background:#5a1b1b;color:#fff;text-shadow:none;padding:8px 14px;text-align:center;border:1px solid var(--gold);border-radius:var(--r-card)}
.x-me{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 6px;font-size:15px}
.x-link{background:none;border:0;height:auto;padding:0;color:#ffe2a8;text-decoration:underline;font-weight:500;font-size:15px;cursor:pointer;text-shadow:inherit}
.x-link:hover{background:none}
.x-prog{margin:12px 0 0;color:#fff}
.x-bar{height:8px;background:rgba(255,255,255,.25);margin:4px 0 2px;overflow:hidden;border-radius:var(--pill)}
.x-bar i{display:block;height:100%;background:var(--gold)}
.x-prog small{font-size:14px}
.x-deadline{margin:10px 0 0;font-size:15px}
.x-report{margin-top:12px}
.x-report button{width:100%;height:52px}
.x-report .x-done{display:block;background:var(--mint);color:var(--deep);text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;font-weight:700;text-align:center}
.x-report .x-link{width:auto;height:auto;display:inline-block;margin-top:8px}
.x-report .x-msg{min-height:22px;margin-top:6px;font-weight:700}
.x-hidden{display:none!important}
.x-tools{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 10px}
.x-tools button{height:42px;font-size:15px}
@media(max-width:600px){.x-tools button{flex:1 1 100%}}
`;

  let started = false;
  function start() {
    if (started || !enabled()) return;
    started = true;
    { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
    document.body.classList.add('v2');
    loading();
    offline();
    collapseSearch();
    adminTools();
  }

  // ---------- ۸. پیام بارگذاری و خطای شبکه ----------
  function loading() {
    if (!groupsNav.children.length) groupsNav.innerHTML = '<div class="x-load"><span class="x-spin"></span>در حال بارگذاری گروه‌ها…</div>';
    const fail = () => {
      if (groups.length) return;
      groupsNav.innerHTML = `<div class="x-net">${navigator.onLine ? 'بارگذاری اطلاعات سایت انجام نشد.' : 'اینترنت گوشی شما قطع است.'} لطفاً اتصال را بررسی کنید و دوباره تلاش کنید.<br><button type="button">تلاش دوباره</button></div>`;
      groupsNav.querySelector('button').onclick = () => location.reload();
    };
    (window.initPromise || Promise.resolve()).catch(fail);
    setTimeout(() => { if (!groups.length && groupsNav.querySelector('.x-load')) fail(); }, 20000);
  }
  function offline() {
    const bar = document.createElement('div'); bar.className = 'x-offline'; bar.setAttribute('role', 'status');
    bar.textContent = 'اتصال اینترنت قطع است؛ ثبت گزارش تا وصل شدن دوباره ممکن نیست.';
    const upd = () => { if (navigator.onLine) bar.remove(); else document.body.appendChild(bar); };
    window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();
  }

  // ---------- ۵. «فراموشی شناسه» پشت یک پیوند ----------
  function collapseSearch() {
    const panel = nameSearch.closest('.panel'), hint = pid.closest('.panel').querySelector('.hint');
    panel.classList.add('x-hidden');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'x-link'; b.textContent = 'شناسه خود را فراموش کرده‌اید؟';
    b.onclick = () => { panel.classList.remove('x-hidden'); panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); nameSearch.focus(); };
    hint.append(' ', b);
  }

  // ---------- ۱. به خاطر سپردن گروه و شناسه ----------
  document.addEventListener('groups:loaded', () => {
    start();
    if (!enabled()) return;
    const me = read(ME, null);
    if (!me || pid.value || window.groupTouched) return;
    const btn = groupsNav.querySelector(`button[data-n="${me.g}"]`);
    if (!btn || !(me.id >= 1 && me.id <= 120)) return;
    selectGroup(me.g, btn);
    pid.value = toFa(me.id);
    showTask.click();
  });

  function forget() {
    del(ME); pid.value = ''; result.classList.remove('show'); result.innerHTML = '';
    clearInterval(timer); pid.focus();
  }

  // ---------- ۲، ۳ و ۷: پس از نمایش سهم ----------
  let timer = 0;
  const doneKey = (g, id) => `${g}:${id}`;
  const doneDays = (g, id) => read(DONE, {})[doneKey(g, id)] || [];
  function markDone(g, id, iso) {
    const all = read(DONE, {}), k = doneKey(g, id), a = all[k] || [];
    if (!a.includes(iso)) a.push(iso);
    all[k] = a.slice(-400); write(DONE, all);
  }
  function streak(days) {
    const set = new Set(days); let n = 0, d = isoIran();
    if (!set.has(d)) d = J.addDays(d, -1);
    while (set.has(d)) { n++; d = J.addDays(d, -1); }
    return n;
  }

  document.addEventListener('task:shown', e => {
    if (!enabled() || !selected) return;
    const { id } = e.detail, g = selected, gNum = g.number, today = isoIran();
    write(ME, { g: gNum, id });
    const t = taskFor(g, id), round = Math.floor(t.days / 120), dayIn = t.days % 120 + 1;

    const me = document.createElement('div'); me.className = 'x-me';
    me.innerHTML = '<span>گروه و شناسه شما روی این گوشی ذخیره شد.</span>';
    const change = document.createElement('button'); change.type = 'button'; change.className = 'x-link'; change.textContent = 'تغییر شناسه'; change.onclick = forget;
    me.appendChild(change);
    result.prepend(me);

    const prog = document.createElement('div'); prog.className = 'x-prog';
    const renderProg = () => {
      const days = doneDays(gNum, id), s = streak(days);
      prog.innerHTML = `روز ${toFa(dayIn)} از ۱۲۰${round ? ` · دور ${toFa(round + 1)}` : ''}<div class="x-bar"><i style="width:${(dayIn / 120 * 100).toFixed(1)}%"></i></div><small>${days.length ? `${toFa(days.length)} روز گزارش ثبت کرده‌اید${s > 1 ? ` · ${toFa(s)} روز پشت سر هم` : ''} (روی این گوشی)` : 'هنوز از این گوشی گزارشی ثبت نکرده‌اید.'}</small>`;
    };
    renderProg();
    result.querySelector('.task').after(prog);

    const dl = document.createElement('p'); dl.className = 'x-deadline';
    prog.after(dl);
    const tick = () => {
      const now = new Date(), p = iranParts(now);
      let f = fajrTehran(p.year, p.month, p.day);
      if (now >= f) f = fajrTehran(p.year, p.month, p.day + 1);
      const mins = Math.max(0, Math.round((f - now) / 60000)), h = Math.floor(mins / 60), m = mins % 60;
      dl.textContent = `مهلت قرائت این سهم: ${h ? `${toFa(h)} ساعت و ` : ''}${toFa(m)} دقیقه دیگر (تا اذان صبح، ساعت ${fmtTime(f)})`;
      if (isoIran() !== today) { clearInterval(timer); dl.textContent = 'سهم روز جدید آماده است؛ دوباره «نمایش سهم امروز» را بزنید.'; }
    };
    clearInterval(timer); tick(); timer = setInterval(tick, 30000);

    const box = document.createElement('div'); box.className = 'x-report';
    const renderBox = () => {
      // روزهای گذشته (تا LATE_DAYS روز) در بخش «گزارش» ثبت می‌شوند؛ این پیوند همان‌جا را با شناسه پرشده باز می‌کند.
      const late = t.days > 0 ? '<button type="button" class="x-link" data-late>ثبت گزارش روزهای گذشته</button>' : '';
      const wireLate = () => { const l = box.querySelector('[data-late]'); if (l) l.onclick = () => { reportId.value = toFa(id); verifyReportIdentity(); reportId.closest('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }; };
      if (doneDays(gNum, id).includes(today)) { box.innerHTML = `<span class="x-done">✓ گزارش امروز شما ثبت شده است</span> ${late}`; wireLate(); return; }
      box.innerHTML = `<button type="button">قرائت کردم، ثبت گزارش امروز</button> ${late}<div class="x-msg" aria-live="polite"></div>`;
      wireLate();
      const b = box.querySelector('button'), msg = box.querySelector('.x-msg');
      b.onclick = () => {
        if (!selected || selected.number !== gNum) { msg.textContent = 'گروه تغییر کرده است؛ دوباره «نمایش سهم امروز» را بزنید.'; return; }
        reportId.value = toFa(id); verifyReportIdentity();
        if (!verifiedReport) { msg.textContent = reportMessage.textContent; return; }
        if (submitReport.disabled) { msg.textContent = reportMessage.textContent; if (/قبلاً ثبت شده/.test(msg.textContent)) { markDone(gNum, id, today); renderProg(); setTimeout(renderBox, 1200); } return; }
        readCheck.checked = true; b.disabled = true;
        const obs = new MutationObserver(() => {
          const txt = reportMessage.textContent;
          msg.textContent = txt; msg.style.color = reportMessage.style.color;
          if (/با موفقیت ثبت شد|قبلاً ثبت شده/.test(txt)) { obs.disconnect(); markDone(gNum, id, today); renderProg(); setTimeout(renderBox, 1200); }
          else if (!/در حال ثبت/.test(txt)) { obs.disconnect(); b.disabled = false; }
        });
        obs.observe(reportMessage, { childList: true, characterData: true, subtree: true });
        submitReport.click();
      };
    };
    renderBox();
    dl.after(box);
  });

  // ثبت از بخش اصلی گزارش هم در پیشرفت شخصی شمرده شود.
  new MutationObserver(() => {
    if (!enabled() || !/با موفقیت ثبت شد|قبلاً ثبت شده/.test(reportMessage.textContent)) return;
    const id = +norm(reportId.value); if (selected && id >= 1 && id <= 120) markDone(selected.number, id, verifiedReport?.reportDate || isoIran());
  }).observe(reportMessage, { childList: true, characterData: true, subtree: true });

  // ---------- ۶. مدیریت: کپی فهرست ثبت‌نشده‌ها و فایل CSV ----------
  function adminTools() {
    const bar = document.createElement('div'); bar.className = 'x-tools x-hidden';
    bar.innerHTML = '<button type="button" data-a="copy">کپی فهرست گزارش‌نداده‌ها</button><button type="button" data-a="csv">دریافت فایل CSV (اکسل)</button>';
    adminSummary.after(bar);
    const note = m => { adminMessage.textContent = m; adminMessage.style.color = ''; };
    new MutationObserver(() => bar.classList.toggle('x-hidden', !window.lastReport || !adminResults.children.length)).observe(adminResults, { childList: true });
    bar.onclick = async e => {
      const a = e.target.closest('[data-a]')?.dataset.a, r = window.lastReport; if (!a || !r) return;
      const rows = r.g.names.map((name, i) => {
        const id = i + 1, task = taskForDate(r.g, id, r.date), rep = r.byId.get(id);
        return { id, name, portion: portions[task.index], hizb: task.index + 1, rep };
      });
      if (a === 'copy') {
        const miss = rows.filter(x => !x.rep);
        const text = `${r.g.name}\n${dateLabelFromIso(r.date)}\nگزارش ثبت‌نشده: ${toFa(miss.length)} نفر از ${toFa(rows.length)}\n\n` + miss.map(x => `${toFa(x.id)}. ${x.name}`).join('\n');
        try { await navigator.clipboard.writeText(text); note(`فهرست ${toFa(miss.length)} نفر کپی شد؛ اکنون می‌توانید آن را در گروه بچسبانید.`); }
        catch { prompt('متن را کپی کنید:', text); }
      } else {
        const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [['شناسه', 'نام', 'سهم', 'حزب', 'وضعیت', 'زمان ثبت'].map(q).join(',')].concat(rows.map(x => [x.id, x.name, x.portion, x.hizb, x.rep ? (reportLate(x.rep, r.date) ? 'ثبت‌شده با تأخیر' : 'ثبت‌شده') : 'ثبت‌نشده',
          x.rep?.created_at ? new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date(x.rep.created_at)) : ''].map(q).join(',')));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `report-group${r.g.number}-${r.date}.csv`;
        document.body.appendChild(link); link.click(); setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
      }
    };
  }

  if (enabled()) document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  window.addEventListener('hashchange', start);
})();
