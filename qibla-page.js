// برگه قبله‌نما؛ qibla.js این فایل را با اولین باز کردن بار می‌کند. با امکان shrines جهت کربلا، نجف، مشهد و دیگر حرم‌ها هم هست.
// جهت قبله: سمت اولیه دایره عظیمه (great-circle) از جای کاربر تا کعبه (۲۱٫۴۲۲۵ شمالی، ۳۹٫۸۲۶۲ شرقی)، به درجه ساعتگرد از شمال جغرافیایی.
// جای کاربر همان شهر کارت اوقات شرعی است (daily.js، کلید prayerLoc) یا «موقعیت من» که همان‌جا هم ذخیره می‌شود.
// گوشی‌هایی که حسگر جهت دارند قطب‌نمای زنده می‌بینند: آیفون با webkitCompassHeading (پس از اجازه با requestPermission)،
// اندروید با deviceorientationabsolute (alpha نسبت به شمال). اگر تا چند ثانیه داده‌ای نیامد (رایانه)، صفحه ثابت با شمال در بالا.
// قطب‌نمای گوشی شمال مغناطیسی را نشان می‌دهد؛ انحراف مغناطیسی در ایران زیر ۶ درجه است و برای قبله‌یابی چشمی ناچیز است.
(function () {
  const R = Math.PI / 180, KA = [21.4225, 39.8262], fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // امکان shrines: همین صفحه جهت حرم‌ها را هم برای زیارت از راه دور نشان می‌دهد (کلید qbTarget روی همین گوشی).
  // [شناسه، نام، نشان، [عرض، طول] حرم، زیارت (go در content-plus.js)]
  const TARGETS = [['kaaba', 'کعبه', '🕋', KA], ['karbala', 'کربلا', '🏴', [32.6165, 44.0324], 'rd:ashura', 'زیارت عاشورا'], ['najaf', 'نجف', '🕌', [31.9961, 44.3148], 'mf:238', 'زیارت امین‌الله'],
    ['mashhad', 'مشهد', '🕌', [36.2880, 59.6158], 'mf:317', 'زیارت امام رضا (ع)'], ['madina', 'مدینه', '🕌', [24.4672, 39.6112], 'mf:217', 'زیارت پیامبر (ص) از راه دور'],
    ['kazimain', 'کاظمین', '🕌', [33.3800, 44.3378], 'mf:304', 'زیارت امام موسی کاظم (ع)'], ['samarra', 'سامرا', '🕌', [34.1989, 43.8737], 'mf:327', 'زیارت امام علی النقی (ع)'],
    ['qom', 'قم', '🕌', [34.6418, 50.8790], 'mf:352', 'زیارت حضرت معصومه (س)']];
  const multi = () => !!window.features?.shown('shrines');
  let tgt = (() => { try { return localStorage.getItem('qbTarget') || 'kaaba'; } catch { return 'kaaba'; } })();
  const T = () => (multi() && TARGETS.find(t => t[0] === tgt)) || TARGETS[0];
  function bearing(lat, lng, to = KA) {
    const p1 = lat * R, p2 = to[0] * R, d = (to[1] - lng) * R;
    return (Math.atan2(Math.sin(d) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(d)) / R + 360) % 360;
  }
  const km = (lat, lng, to = KA) => { const a = Math.sin((to[0] - lat) * R / 2) ** 2 + Math.cos(lat * R) * Math.cos(to[0] * R) * Math.sin((to[1] - lng) * R / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(a)); };
  const DIRS = ['شمال', 'شمال شرقی', 'شرق', 'جنوب شرقی', 'جنوب', 'جنوب غربی', 'غرب', 'شمال غربی'];
  const css = `
.qb-shade{position:fixed;inset:0;z-index:60;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.qb-box{width:100%;max-width:480px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;text-align:center;animation:qbup .25s ease}
@keyframes qbup{from{transform:translateY(40px);opacity:.4}}
.qb-box .qb-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:22px}
.qb-box h2{margin:4px 0 0;font:normal 30px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.qb-where{margin:0;color:var(--muted);font-size:14.5px}
.qb-deg{margin:2px 0 0;font-size:17px}.qb-deg b{font-size:24px;color:var(--deep)}
.qb-dial{position:relative;width:min(76vw,290px);margin:10px auto 4px}
.qb-dial svg{display:block;width:100%;height:auto}
.qb-rot{transition:transform .2s linear;transform-origin:0 0}
.qb-dial text{font:600 13px Vazirmatn,Tahoma,sans-serif;fill:var(--muted)}
.qb-dial .qb-n{fill:#b3261e;font-size:16px}
.qb-dial.ok .qb-face{fill:var(--mint)}
.qb-msg{min-height:1.7em;margin:4px 0 0;font-weight:600;color:var(--deep)}
.qb-dial.ok + .qb-msg{color:var(--emerald)}
.qb-hint{margin:6px 0 0;font-size:13.5px;color:var(--muted);line-height:1.8}
.qb-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}
.qb-btns button{flex:1 1 160px;min-height:46px;height:auto;font-size:15px}
.qb-box .qb-sec{background:#fff;color:var(--deep);border:1px solid var(--gold)}
.qb-tg{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0 2px}
.qb-tg button{height:38px;min-height:0;padding:0 12px;background:#fff;color:var(--deep);border:1px solid var(--line);border-radius:999px;font-size:14.5px;font-weight:600}
.qb-tg button.on{background:var(--emerald);border-color:var(--emerald);color:#fff}
@media(min-width:600px){.qb-shade{align-items:center}.qb-box{border-radius:var(--r-panel);border-bottom:2px solid var(--gold)}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // صفحه مدرج: N بالا؛ پیکان قبله با زاویه b. کل صفحه در حالت زنده به اندازه -heading می‌چرخد.
  function dial(b) {
    let ticks = '';
    for (let a = 0; a < 360; a += 10) { const big = a % 90 === 0, r1 = big ? 98 : a % 30 ? 104 : 100; ticks += `<line x1="0" y1="-${r1}" x2="0" y2="-110" stroke="${big ? '#5d524b' : '#b9ab92'}" stroke-width="${big ? 2.5 : 1.3}" transform="rotate(${a})"/>`; }
    const lab = (a, t, c) => { const x = Math.sin(a * R) * 84, y = -Math.cos(a * R) * 84 + 5; return `<text class="qb-l${c ? ' ' + c : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" data-c="${x.toFixed(1)} ${(y - 5).toFixed(1)}" text-anchor="middle">${t}</text>`; };
    return `<svg viewBox="-125 -125 250 250" role="img" aria-label="صفحه قبله‌نما"><circle class="qb-face" r="114" fill="#fff" stroke="#d7aa5b" stroke-width="3"/>
<g class="qb-rot">${ticks}${lab(0, 'شمال', 'qb-n')}${lab(90, 'شرق')}${lab(180, 'جنوب')}${lab(270, 'غرب')}
<g transform="rotate(${b.toFixed(1)})"><line x1="0" y1="18" x2="0" y2="-66" stroke="#006b50" stroke-width="6" stroke-linecap="round"/><path d="M0 -80 L-11 -60 L11 -60 Z" fill="#006b50"/><text x="0" y="-92" text-anchor="middle" style="font-size:20px" transform="rotate(${(-b).toFixed(1)} 0 -98)">${T()[2]}</text></g></g>
<circle r="7" fill="#d7aa5b"/><path class="qb-me" d="M0 -124 L-9 -110 L9 -110 Z" fill="#b3261e" display="none"/></svg>`;
  }

  let shade = null, mode = 'wait', b = 0, head = null, acc = null, rot = 0, raf = 0, timer = 0, wasOk = false, note = '';
  const L = () => window.dailyInfo?.loc?.() || { name: 'تهران', lat: 35.6892, lng: 51.389 };
  const chosen = () => { try { return !!localStorage.getItem('prayerLoc'); } catch { return false; } };

  function paint() {
    const l = L(), t = T(), kaaba = t[0] === 'kaaba', name = kaaba ? 'قبله' : `جهت ${t[1]}`; b = bearing(l.lat, l.lng, t[3]);
    const dir = DIRS[Math.round(b / 45) % 8], ios = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    const dist = Math.round(km(l.lat, l.lng, t[3]));
    const where = `${chosen() ? 'برای' : 'برای شهر پیش‌فرض'} ${esc(l.short || l.name)} · ${dist < 20 ? `در ${esc(t[1])} هستید` : `${dist.toLocaleString('fa-IR')} کیلومتر تا ${kaaba ? 'مکه' : esc(t[1])}`}`;
    const pick = multi() ? `<div class="qb-tg" role="group" aria-label="مقصد">${TARGETS.map(x => `<button type="button" data-qb-t="${x[0]}" class="${x[0] === t[0] ? 'on' : ''}" aria-pressed="${x[0] === t[0]}">${x[2]} ${x[1]}</button>`).join('')}</div>` : '';
    const zy = !kaaba && t[4] && window.contentPlus ? `<button type="button" class="qb-sec" data-qb="zy">📖 ${esc(t[5])}</button>` : '';
    const hint = mode === 'live'
      ? `گوشی را صاف و افقی در دست بگیرید و بچرخید تا علامت قرمز بالا روی ${kaaba ? 'کعبه' : 'نشان حرم'} بیفتد. اگر جهت درست نیست، گوشی را چند بار به شکل عدد ۸ در هوا بچرخانید و از وسایل فلزی و آهن‌ربا (مثل قاب مغناطیسی) دور شوید.`
      : mode === 'ask' ? 'برای قطب‌نمای زنده، دکمه زیر را بزنید و اجازه دسترسی به حسگر حرکت را بدهید.'
      : mode === 'wait' ? 'در حال پیدا کردن قطب‌نمای گوشی…'
      : `این دستگاه قطب‌نما ندارد یا اجازه داده نشد. «شمال» صفحه را رو به شمال واقعی بگیرید (با قطب‌نما یا نقشه)؛ ${name} ${toFa(Math.round(b))} درجه ساعتگرد از شمال است.`;
    shade.querySelector('.qb-box').innerHTML = `<button type="button" class="qb-x" data-qb="close" aria-label="بستن">✕</button><h2>${multi() ? 'قبله و حرم‌ها' : 'قبله‌نما'}</h2>${pick}
<p class="qb-where">${where}</p><p class="qb-deg">${name}: <b>${toFa(Math.round(b))}</b> درجه از شمال، رو به ${dir}</p>
<div class="qb-dial">${dial(b)}</div><p class="qb-msg" aria-live="polite"></p><p class="qb-hint">${hint}</p>
${note ? `<p class="qb-hint" role="status">${esc(note)}</p>` : ''}
${!kaaba ? '<p class="qb-hint">برای زیارت از راه دور، رو به حرم بایستید و زیارت را بخوانید.</p>' : ''}
<div class="qb-btns">${zy}${mode === 'ask' || (mode === 'none' && ios) ? '<button type="button" data-qb="perm">🧭 روشن کردن قطب‌نما</button>' : ''}${navigator.geolocation ? '<button type="button" class="qb-sec" data-qb="gps">📍 موقعیت دقیق من</button>' : ''}</div>`;
    rot = 0; update();
  }

  // چرخش صفحه؛ زاویه پیوسته نگه داشته می‌شود تا گذر از ۳۵۹ به ۰ درجه چرخش کامل نسازد.
  function update() {
    raf = 0; if (!shade?.isConnected) return;
    const g = shade.querySelector('.qb-rot'), me = shade.querySelector('.qb-me'), msg = shade.querySelector('.qb-msg'), box = shade.querySelector('.qb-dial');
    if (mode !== 'live' || head == null) { g.style.transform = ''; me.setAttribute('display', 'none'); box.classList.remove('ok'); msg.textContent = ''; return; }
    const want = -head; rot += ((want - rot) % 360 + 540) % 360 - 180;
    g.style.transform = `rotate(${rot}deg)`; me.removeAttribute('display');
    // نام جهت‌ها با چرخش صفحه وارونه نشوند
    g.querySelectorAll('.qb-l').forEach(t => t.setAttribute('transform', `rotate(${-rot} ${t.dataset.c})`));
    const diff = ((b - head) % 360 + 540) % 360 - 180, ok = Math.abs(diff) <= 5;
    box.classList.toggle('ok', ok);
    msg.textContent = ok ? (T()[0] === 'kaaba' ? 'رو به قبله هستید ✓' : `رو به ${T()[1]} هستید ✓`) : `${toFa(Math.round(Math.abs(diff)))} درجه به ${diff > 0 ? 'راست' : 'چپ'} بچرخید`;
    if (ok && !wasOk) navigator.vibrate?.(60);
    wasOk = ok;
    if (acc != null && (acc < 0 || acc > 25)) msg.textContent += ' (قطب‌نما دقیق نیست؛ گوشی را به شکل ۸ بچرخانید)';
  }
  const scr = () => screen.orientation?.angle ?? window.orientation ?? 0;
  function onOri(e) {
    let h = null;
    if (e.webkitCompassHeading != null && e.webkitCompassHeading >= 0) { h = e.webkitCompassHeading; acc = e.webkitCompassAccuracy; }
    else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
    if (h == null) return;
    head = (h + scr() + 360) % 360;
    if (mode !== 'live') { clearTimeout(timer); mode = 'live'; paint(); return; }
    if (!raf) raf = requestAnimationFrame(update);
  }
  const EV = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  function listen() {
    removeEventListener(EV, onOri); addEventListener(EV, onOri);
    clearTimeout(timer); timer = setTimeout(() => { if (mode !== 'live') { mode = 'none'; paint(); } }, 2500);
  }
  function stop() { removeEventListener(EV, onOri); clearTimeout(timer); cancelAnimationFrame(raf); raf = 0; head = null; }

  function open() {
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'qb-shade';
      shade.innerHTML = '<div class="qb-box" role="dialog" aria-modal="true" aria-label="قبله‌نما"></div>';
      shade.addEventListener('click', onClick);
    }
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    note = ''; head = null; wasOk = false;
    const ios = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    if (typeof DeviceOrientationEvent === 'undefined') mode = 'none';
    else if (ios) mode = 'ask';
    else { mode = 'wait'; listen(); }
    paint();
    try { if (!history.state?.qb) history.pushState({ qb: 1 }, ''); } catch {}
    setTimeout(() => shade.querySelector('.qb-x')?.focus(), 50);
  }
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    stop(); shade.remove(); document.body.classList.remove('ib-lock');
    if (!fromHistory) { try { if (history.state?.qb) history.back(); } catch {} }
  }
  async function onClick(e) {
    if (e.target === shade) return close();
    const tb = e.target.closest('[data-qb-t]');
    if (tb) { tgt = tb.dataset.qbT; try { localStorage.setItem('qbTarget', tgt); } catch {} wasOk = false; const y = shade.querySelector('.qb-box').scrollTop; paint(); shade.querySelector('.qb-box').scrollTop = y; shade.querySelector(`[data-qb-t="${tgt}"]`)?.focus(); return; }
    const t = e.target.closest('[data-qb]'); if (!t) return;
    const a = t.dataset.qb;
    if (a === 'close') return close();
    if (a === 'zy') { const g = T()[4]; close(); return setTimeout(() => window.contentPlus?.go(g), 300); }
    if (a === 'perm') {
      try { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw 0; mode = 'wait'; listen(); }
      catch { mode = 'none'; note = 'اجازه دسترسی به حسگر داده نشد. در تنظیمات Safari › «حرکت و جهت» را روشن کنید و دوباره بیازمایید.'; }
      return paint();
    }
    if (a === 'gps') {
      note = 'در حال پیدا کردن موقعیت…'; paint();
      navigator.geolocation.getCurrentPosition(p => {
        let tz = 'Asia/Tehran'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch {}
        // همان قالب daily.js تا اوقات شرعی هم برای همین جا حساب شود.
        try { localStorage.setItem('prayerLoc', JSON.stringify({ id: 'gps', lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), tz })); } catch {}
        note = ''; paint();
      }, err => { note = err.code === 1 ? 'اجازه دسترسی به موقعیت داده نشد؛ جهت برای شهر انتخاب‌شده نشان داده می‌شود.' : 'موقعیت پیدا نشد؛ جهت برای شهر انتخاب‌شده نشان داده می‌شود.'; paint(); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 6 * 36e5 });
    }
  }
  window.addEventListener('popstate', () => { if (!history.state?.qb) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.qiblaPage = { open, close, bearing };
})();
