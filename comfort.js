// راحتی خواندن (امکان comfort): اندازه متن کل سایت، فاصله خطوط، حالت تاریک (روشن / تیره / مثل گوشی) و حرکت کمتر، یک‌جا.
// از «منوی ☰ › تنظیمات» و از تنظیمات قرآن‌خوان و خواننده دعا باز می‌شود. فقط روی همین گوشی (localStorage، کلید comfort).
// - حالت تاریک: ویژگی data-theme="dark" روی <html> (اسکریپت کوچک اول <head> در index.html پیش از نمایش صفحه می‌گذاردش تا صفحه سفید نپرد)
//   و متغیرهای رنگ (‎--ink، ‎--mint، ‎--cream …) برای آن بازتعریف می‌شوند. چون بیشتر برگه‌ها رنگ روشن را مستقیم نوشته‌اند (#fff، #fffaf0 …)
//   و هر بخش تازه هم سبک خودش را می‌آورد، رنگ‌های روشن زمینه و رنگ‌های تیره نوشته در همه سبک‌های صفحه (و هر سبکی که بعداً اضافه شود)
//   همان‌جا به معادل تاریکشان برگردانده می‌شوند و با برگشتن به روشن، دقیقاً همان مقدار قبلی برمی‌گردد. قرآن‌خوان و خواننده دعا حالت شب خودشان را می‌گیرند.
// - اندازه متن و فاصله خطوط: هر font-size و line-height در سبک‌ها در ‎var(--fs-k)‎ و ‎var(--lh-k)‎ ضرب می‌شود؛ پس همه جا، از جمله متن عربی و ترجمه
//   قرآن‌خوان، با هم بزرگ می‌شوند و دکمه‌های +/− خود قرآن‌خوان و خواننده دعا همچنان روی همین اندازه کار می‌کنند. عنوان‌های خیلی درشت (بالای ۳۰px) دست نمی‌خورند.
// - حرکت کمتر: data-motion="reduce" روی <html>؛ حرکت ورود کادرهای صفحه اول (bgx-anim در backdrop.js) و بقیه جلوه‌ها خاموش می‌شود.
//   اگر گوشی خودش «کاهش حرکت» را خواسته باشد، همان رعایت می‌شود (backdrop.css و backdrop.js).
(function () {
  const KEY = 'comfort';
  const SIZES = [[0.9, 'کوچک'], [1, 'معمولی'], [1.12, 'بزرگ'], [1.25, 'درشت'], [1.4, 'خیلی درشت']];
  const THEMES = [['light', 'روشن'], ['dark', 'تیره'], ['auto', 'مثل گوشی']];
  // امکان sunset: گزینه «غروب تا طلوع» (تیره از غروب آفتاب تا طلوع، به افق شهر کارت «امروز»)؛ امکان contrast: hc، نوشته پررنگ‌تر.
  const SUN = ['sun', 'غروب تا طلوع'];
  const themes = () => window.features?.shown('sunset') ? [...THEMES, SUN] : THEMES;
  const DEF = { size: 1, lh: 0, theme: 'light', motion: false, hc: false };
  const get = () => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY))); } catch { return { ...DEF }; } };
  const put = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const root = document.documentElement;
  const shown = () => !!window.features?.shown('comfort');
  const osDark = matchMedia('(prefers-color-scheme: dark)');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const css = `
html[data-theme=dark]{color-scheme:dark;--paper:#1d1915;--ink:#ece3d3;--muted:#bdb1a2;--mint:#1d2d27;--cream:#2a241b;--line:#3d342a;--hover:#2e271f;
  --deep-t:#8fd6b9;--emerald-t:#7fd0b0;--danger-t:#f3a0a8;--ok-t:#8fd6b9}
html[data-theme=dark][data-bg]{--t-paper:#1d1916;--t-ink:#eadfc8;--t-ink2:#c4b69b;--t-line:#4a3d2c;--t-veil:#1d1916d9;--t-head:#e0bf7a;--emerald:var(--t-frame);--mint:color-mix(in srgb,var(--t-frame) 22%,#1d1916)}
html[data-theme=dark][data-bg=sage]{--t-frame:#536f4e}
html[data-theme=dark] body{background-color:#14110f}
html[data-theme=dark][data-bg] .sm-btn:hover{background:var(--t-frame);filter:brightness(1.2)}
html[data-theme=dark] :is(.qr-row:has([data-a=day]),.cr-row:has([data-x=day])){display:none}
html[data-theme=dark] ::placeholder{color:#a89c8e}
html[data-motion=reduce] *,html[data-motion=reduce] *::before,html[data-motion=reduce] *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
html[data-motion=reduce].bgx-anim .shell>.panel,html[data-motion=reduce].bgx-anim header,html[data-motion=reduce].bgx-anim .bgx-frame{opacity:1!important}
.cf-shade{position:fixed;inset:0;z-index:64;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.cf-box{width:100%;max-width:560px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:14px 18px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007}
.cf-box h2{margin:4px 0 2px;font:normal 30px/1.6 SiteFont,Tahoma,serif;color:var(--deep);text-align:center}
.cf-box>p{margin:0 0 8px;text-align:center;color:var(--muted);font-size:15px}
.cf-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.cf-sec{margin:12px 0 0;padding:10px 0 4px;border-top:1px solid var(--line)}
.cf-sec h3{margin:0 0 8px;font-size:16px;color:var(--deep)}
.cf-sec h3 small{font-weight:400;color:var(--muted);font-size:14px;margin-inline-start:6px}
.cf-seg{display:flex;gap:6px}
.cf-seg button{flex:1 1 0;min-width:0;height:48px;padding:0 6px;background:#fff;color:var(--deep);border:1px solid var(--line);font-weight:600;font-size:15px;white-space:normal;line-height:1.3}
.cf-seg button:hover{background:var(--hover)}
.cf-seg button.on{background:var(--emerald);border-color:var(--emerald);color:#fff;box-shadow:inset 0 0 0 2px var(--gold)}
.cf-sizes button{font-family:Vazirmatn,Tahoma,sans-serif;padding:0}
.cf-sample{margin:10px 0 0;padding:10px 12px;background:#fff;border:1px solid var(--line);border-radius:var(--r-card);line-height:1.9}
.cf-sample b{display:block;font-weight:500;color:var(--deep)}
.cf-row{display:flex;align-items:center;gap:12px;padding:6px 0;margin:0;font-weight:500;cursor:pointer}
.cf-row span{flex:1;min-width:0;line-height:1.6}
.cf-row small{display:block;color:var(--muted);font-size:13px;font-weight:400}
.cf-hint{margin:6px 0 0;font-size:13.5px;color:var(--muted)}
html[data-contrast]{--muted:#463c33;--line:#b5a283;--ink:#120e0a}
html[data-contrast][data-bg]{--t-ink2:#3a3128;--t-line:#9c8a6c}
html[data-contrast][data-theme=dark]{--muted:#dccfbe;--line:#6b5b48;--ink:#fffaf0}
html[data-contrast][data-theme=dark][data-bg]{--t-ink2:#e4d7c2}
html[data-contrast] body{font-weight:500}
html[data-contrast] :is(.cr,.qr){--tr:#241d16;--muted:#463c33}
html[data-contrast] :is(.cr,.qr).night{--tr:#f1e8d9;--muted:#d0c4b3}
.cf-reset{display:block;margin:14px auto 0;height:44px;background:transparent;border:0;color:var(--deep);text-decoration:underline;font-weight:600;font-size:15px}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ---------- رنگ‌ها ----------
  // هر رنگ CSS (هگز، نام، rgb، hsl) با کمک canvas به [r, g, b, a] تبدیل می‌شود.
  const ctx = document.createElement('canvas').getContext('2d');
  const memo = new Map();
  function parse(v) {
    if (memo.has(v)) return memo.get(v);
    let out = null;
    if (ctx && !/var\(|currentcolor|transparent|inherit|initial|unset|none/i.test(v)) {
      ctx.fillStyle = '#010203'; ctx.fillStyle = v;
      const s = ctx.fillStyle;
      if (s !== '#010203' || /^#010203$/i.test(v)) {
        if (s[0] === '#') out = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
        else { const m = s.match(/[\d.]+/g); if (m && m.length >= 3) out = [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1]; }
      }
    }
    memo.set(v, out); return out;
  }
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  function hsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  }
  const out = (h, s, l, a) => `hsla(${h.toFixed(1)},${(Math.min(1, s) * 100).toFixed(1)}%,${(l * 100).toFixed(1)}%,${a})`;
  // زمینه روشن ← تیره (هرچه روشن‌تر، تیره‌تر؛ رنگ‌مایه همان می‌ماند ولی کم‌رنگ‌تر)
  const darkBg = c => { const [h, s, l] = hsl(c); return out(h, s * 0.45, 0.1 + (1 - l) * 0.55, c[3]); };
  const darkLine = c => { const [h, s, l] = hsl(c); return out(h, s * 0.4, 0.24 + (1 - l) * 0.5, c[3]); };
  // نوشته تیره ← روشن
  const lightText = c => { const [h, s, l] = hsl(c); return out(h, s * 0.7, 0.92 - l * 0.45, c[3]); };
  const isLightBg = c => c && c[3] > 0.15 && lum(c) > 0.45;
  // زمینه‌هایی که با متغیر داده شده‌اند و خودشان در حالت تاریک تیره می‌شوند؛ نوشته تیره روی بقیه (طلایی، سبز …) دست نمی‌خورد.
  const DARKENED_VARS = /^var\(--(paper|mint|cream|hover|line|bg|card|t-paper|t-veil)\)$/;
  const COLOR_VARS = /var\(--(deep|emerald|danger|ok)\)/g;
  const BORDERS = ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color'];

  const saved = new WeakMap(); // قانون ← مقدارهای اصلی رنگ‌هایی که عوض شد
  const scaled = new WeakSet();
  function setP(st, p, v) { st.setProperty(p, v, st.getPropertyPriority(p)); }
  function darken(rule) {
    if (saved.has(rule)) return;
    const st = rule.style, sel = rule.selectorText || '';
    // قانون‌هایی که خودشان برای حالت شب نوشته شده‌اند
    // و نقش‌های کوچک ::before/::after (مثل دستگیره سفید کلیدهای روشن/خاموش) که روی زمینه رنگی‌اند
    if (/\.night\b|data-bg=dark|data-theme|::?(before|after)/.test(sel)) return;
    const orig = [];
    const change = (p, v) => { orig.push([p, st.getPropertyValue(p), st.getPropertyPriority(p)]); setP(st, p, v); };
    const bgv = st.getPropertyValue('background-color').trim();
    let bgDark = false, bgKeep = false;
    if (bgv) {
      const c = parse(bgv);
      if (isLightBg(c)) { change('background-color', darkBg(c)); bgDark = true; }
      else if (c && c[3] > 0.15 && lum(c) > 0.18) bgKeep = true; // زمینه رنگی میانه (طلایی و …)
      else if (/^var\(/.test(bgv) && !DARKENED_VARS.test(bgv)) bgKeep = true;
    }
    const img = st.getPropertyValue('background-image');
    if (img && /gradient/.test(img) && !/url\(/.test(img)) {
      const v = img.replace(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi, m => { const c = parse(m); return isLightBg(c) ? darkBg(c) : m; });
      if (v !== img) change('background-image', v);
    }
    const col = st.getPropertyValue('color').trim();
    if (col) {
      if (COLOR_VARS.test(col)) { COLOR_VARS.lastIndex = 0; if (!bgKeep) change('color', col.replace(COLOR_VARS, (m, n) => `var(--${n}-t, var(--${n}))`)); }
      else { const c = parse(col); if (c && lum(c) < 0.3 && !bgKeep) change('color', lightText(c)); }
      COLOR_VARS.lastIndex = 0;
    }
    BORDERS.forEach(p => { const v = st.getPropertyValue(p).trim(); const c = v && parse(v); if (c && c[3] > 0.15 && lum(c) > 0.5) change(p, darkLine(c)); });
    if (orig.length || bgDark) saved.set(rule, orig);
  }
  function undark(rule) {
    const o = saved.get(rule); if (!o) return;
    for (let i = o.length - 1; i >= 0; i--) { const [p, v, pr] = o[i]; v ? rule.style.setProperty(p, v, pr) : rule.style.removeProperty(p); }
    saved.delete(rule);
  }
  // اندازه متن و فاصله خطوط: ضرب در متغیرهای ‎--fs-k‎ و ‎--lh-k‎ (بار اول که لازم شد، برای همیشه همین صفحه).
  const bigPx = v => (v.match(/([\d.]+)px/g) || []).some(x => parseFloat(x) > 30) || /vw|vh/.test(v);
  function scale(rule) {
    if (scaled.has(rule)) return; scaled.add(rule);
    const st = rule.style;
    const font = st.getPropertyValue('font');
    if (font && /var\(/.test(font) && !/--fs-k/.test(font)) {
      // font کوتاه‌نویسی که متغیر دارد (مثل ‎normal var(--qs)/2.15 QuranHafs‎) خوانا نیست؛ همان رشته بازنویسی می‌شود.
      const v = font.replace(/(^|\s)(var\([^)]*\)|calc\([^)]*\)|[\d.]+px)(?:\s*\/\s*([\d.]+))?(?=\s)/, (m, a, sz, lh) => `${a}calc(${sz} * var(--fs-k, 1))${lh ? `/calc(${lh} * var(--lh-k, 1))` : ''}`);
      if (v !== font) setP(st, 'font', v);
      return;
    }
    const fs = st.getPropertyValue('font-size').trim();
    if (fs && /px|var\(/.test(fs) && !/--fs-k/.test(fs) && !bigPx(fs)) setP(st, 'font-size', `calc(${fs} * var(--fs-k, 1))`);
    const lh = st.getPropertyValue('line-height').trim();
    if (lh && !/--lh-k|var\(/.test(lh) && (/^[\d.]+$/.test(lh) ? +lh >= 1.5 : /^[\d.]+px$/.test(lh))) setP(st, 'line-height', `calc(${lh} * var(--lh-k, 1))`);
  }

  let wantScale = false, dark = false;
  function walk(rules) {
    for (const r of rules) {
      if (r.type === 7) continue; // keyframes
      if (r.style && r.selectorText) {
        if (wantScale) scale(r);
        dark ? darken(r) : undark(r);
      }
      if (r.cssRules && r.cssRules.length) walk(r.cssRules);
    }
  }
  function sweep() {
    if (!wantScale && !dark && !anyDark) return;
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      walk(rules);
    }
    anyDark = dark;
  }
  let anyDark = false;
  // هر سبک تازه‌ای که بخش‌های دیگر اضافه کنند هم همان‌جا تنظیم می‌شود.
  new MutationObserver(ms => { if ((wantScale || dark) && ms.some(m => [...m.addedNodes].some(n => n.nodeName === 'STYLE' || n.nodeName === 'LINK'))) sweep(); })
    .observe(document.head, { childList: true });
  addEventListener('load', () => sweep());

  // قرآن‌خوان و خواننده دعا در حالت تاریک همیشه حالت شب خودشان را دارند (دکمه روز/شب خودشان آن وقت پنهان است).
  const readerObs = new MutationObserver(ms => ms.forEach(m => fixReader(m.target)));
  const watched = new WeakSet();
  function fixReader(el) {
    if (dark && !el.classList.contains('night')) { el.dataset.cfNight = '1'; el.classList.add('night'); }
    else if (!dark && el.dataset.cfNight) { delete el.dataset.cfNight; el.classList.remove('night'); }
  }
  function readers() {
    document.querySelectorAll('body > .qr, body > .cr').forEach(el => {
      if (!watched.has(el)) { watched.add(el); readerObs.observe(el, { attributes: true, attributeFilter: ['class'] }); }
      // ردیف «اندازه متن و رنگ کل سایت» در تنظیمات هر خواننده
      const menu = el.querySelector('.qr-menu, .cr-menu'), row = menu && menu.querySelector('[data-cf-row]');
      if (menu && shown() && !row) {
        const qr = el.classList.contains('qr');
        menu.insertAdjacentHTML('beforeend', qr ? '<div class="qr-row" data-cf-row><span>اندازه متن و حالت تاریک کل سایت</span><span class="ctl"><button type="button" class="qr-chip" data-cf-open>تنظیم</button></span></div>'
          : '<div class="cr-row" data-cf-row><span>اندازه متن و حالت تاریک کل سایت</span><div><button type="button" data-cf-open>تنظیم</button></div></div>');
      } else if (row && !shown()) row.remove();
      fixReader(el);
    });
  }
  new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && typeof n.className === 'string' && /^(qr|cr)$/.test(n.className.split(' ')[0])))) readers(); })
    .observe(document.body, { childList: true });

  // ---------- اعمال ----------
  const meta = document.querySelector('meta[name=theme-color]');
  let metaLight = null;
  function apply() {
    const p = shown() ? get() : DEF;
    dark = p.theme === 'dark' || (p.theme === 'auto' && osDark.matches) || (p.theme === 'sun' && sunDark());
    if (p.hc && window.features?.shown('contrast')) root.setAttribute('data-contrast', ''); else root.removeAttribute('data-contrast');
    const k = SIZES[p.size] ? SIZES[p.size][0] : 1, lk = p.lh ? 1.2 : 1;
    root.style.setProperty('--fs-k', k); root.style.setProperty('--lh-k', lk);
    if (k !== 1 || lk !== 1) wantScale = true;
    if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    if (p.motion) root.setAttribute('data-motion', 'reduce'); else root.removeAttribute('data-motion');
    if (meta) {
      if (dark) { if (metaLight == null) metaLight = meta.content; meta.content = '#14110f'; }
      else if (metaLight != null) { meta.content = metaLight; metaLight = null; }
    }
    sweep(); readers();
  }
  osDark.addEventListener?.('change', apply);
  // تیره بودن «غروب تا طلوع» همین حالا؛ برای اسکریپت اول index.html هم (کلید sunNext: { dark, until }) نگه داشته می‌شود تا صفحه سفید نپرد.
  function sunDark() {
    const D = window.daily; if (!D || !window.features?.shown('sunset')) return false;
    const L = D.loc(), now = Date.now(), iso = D.ymd(now, L.tz), T = D.times(iso, L), Tn = D.times(D.addDays(iso, 1), L);
    const dk = now < T.rise || now >= T.set, until = now < T.rise ? T.rise : now < T.set ? T.set : Tn.rise;
    try { localStorage.setItem('sunNext', JSON.stringify({ dark: dk, until: Math.round(until) })); } catch {}
    return dk;
  }
  setInterval(() => { if (!document.hidden && shown() && get().theme === 'sun' && sunDark() !== dark) apply(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && shown() && get().theme === 'sun' && sunDark() !== dark) apply(); });
  document.addEventListener('features:changed', () => { apply(); if (shade?.isConnected && !shown()) close(); });

  // ---------- برگه تنظیمات ----------
  let shade = null;
  function summary() {
    const p = get();
    return `متن ${SIZES[p.size]?.[1] || 'معمولی'} · ${[...THEMES, SUN].find(t => t[0] === p.theme)?.[1] || 'روشن'}${p.lh ? ' · فاصله بیشتر' : ''}`;
  }
  function render() {
    const p = get(), seg = (k, list, cur) => `<div class="cf-seg${k === 'size' ? ' cf-sizes' : ''}" role="group">${list.map(([v, t], i) => `<button type="button" data-cf="${k}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}" aria-pressed="${String(cur) === String(v)}"${k === 'size' ? ` aria-label="${esc(t)}" style="font-size:${Math.round(13 + i * 3)}px"` : ''}>${k === 'size' ? 'آ' : esc(t)}</button>`).join('')}</div>`;
    shade.querySelector('.cf-box').innerHTML = `<button type="button" class="cf-x" aria-label="بستن">✕</button><h2>اندازه متن و رنگ</h2><p>برای همه بخش‌های سایت، فقط روی همین گوشی.</p>
<div class="cf-sec"><h3>اندازه متن<small>${esc(SIZES[p.size]?.[1] || '')}</small></h3>${seg('size', SIZES.map(([, t], i) => [i, t]), p.size)}
<div class="cf-sample"><b>نمونه متن</b>سهم امروز را بخوانید و پس از قرائت، گزارش آن را ثبت کنید.</div></div>
<div class="cf-sec"><h3>فاصله خطوط</h3>${seg('lh', [[0, 'معمولی'], [1, 'بیشتر']], p.lh ? 1 : 0)}</div>
<div class="cf-sec"><h3>رنگ صفحه</h3>${seg('theme', themes(), p.theme)}${p.theme === 'sun' ? '<p class="cf-hint">از غروب آفتاب تا طلوع، به افق شهری که در کارت «امروز» انتخاب کرده‌اید.</p>' : ''}</div>
${window.features?.shown('contrast') ? `<div class="cf-sec"><label class="cf-row"><span>متن پررنگ و خوانا<small>نوشته‌های کم‌رنگ تیره‌تر و همه نوشته‌ها کمی ضخیم‌تر، برای چشم خسته یا نور زیاد</small></span><input type="checkbox" class="ft-sw" data-cf="hc"${p.hc ? ' checked' : ''} aria-label="متن پررنگ و خوانا"></label></div>` : ''}
<div class="cf-sec"><label class="cf-row"><span>حرکت کمتر<small>بدون حرکت ورود کادرهای صفحه اول و جلوه‌های جابه‌جایی${matchMedia('(prefers-reduced-motion: reduce)').matches ? '؛ گوشی شما هم حرکت کمتر را خواسته است' : ''}</small></span><input type="checkbox" class="ft-sw" data-cf="motion"${p.motion ? ' checked' : ''} aria-label="حرکت کمتر"></label></div>
${JSON.stringify(p) !== JSON.stringify(DEF) ? '<button type="button" class="cf-reset" data-cf="reset">برگشت به حالت عادی</button>' : ''}`;
  }
  function open() {
    if (!shown()) return;
    if (!shade) {
      shade = document.createElement('div'); shade.className = 'cf-shade';
      shade.innerHTML = '<div class="cf-box" role="dialog" aria-modal="true" aria-label="اندازه متن و رنگ"></div>';
      shade.addEventListener('click', e => {
        if (e.target === shade || e.target.closest('.cf-x')) return close();
        const b = e.target.closest('button[data-cf]'); if (!b) return;
        const p = get(), k = b.dataset.cf;
        if (k === 'reset') Object.assign(p, DEF);
        else p[k] = k === 'theme' ? b.dataset.v : +b.dataset.v;
        put(p); apply(); render(); window.siteMenu?.refresh();
        shade.querySelector(`[data-cf="${k}"].on`)?.focus();
      });
      shade.addEventListener('change', e => { const k = e.target.dataset.cf; if (k === 'motion' || k === 'hc') { const p = get(); p[k] = e.target.checked; put(p); apply(); render(); shade.querySelector(`[data-cf="${k}"]`)?.focus(); } });
    }
    render();
    document.body.appendChild(shade); document.body.classList.add('ib-lock');
    try { if (!history.state?.cf) history.pushState({ cf: 1 }, ''); } catch {}
    setTimeout(() => shade.querySelector('.cf-x')?.focus(), 50);
  }
  function close(fromHistory) {
    if (!shade || !shade.isConnected) return;
    shade.remove();
    // اگر خواننده‌ای زیر این برگه باز است، قفل اسکرول صفحه را نگه می‌دارد.
    if (!document.querySelector('.ib-shade,.ft-shade,.qf-shade')) document.body.classList.remove('ib-lock');
    if (!fromHistory) { try { if (history.state?.cf) history.back(); } catch {} }
  }
  window.addEventListener('popstate', () => { if (!history.state?.cf) close(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade?.isConnected) { e.stopImmediatePropagation(); close(); } }, true);
  document.addEventListener('click', e => {
    if (e.target.closest('[data-cf-menu]')) { window.siteMenu?.close(); setTimeout(open, 280); }
    else if (e.target.closest('[data-cf-open]')) open();
  });

  window.comfort = {
    open, apply,
    // دکمه منو برای بخش «تنظیمات» (reminders.js)، کنار «نمایش امکانات»
    menuItem() {
      if (!shown()) return '';
      return `<button type="button" class="sm-item" data-cf-menu><span class="sm-ic">🔠</span><span>اندازه متن و حالت تاریک<small>${esc(summary())}</small></span><span class="sm-go">‹</span></button>`;
    }
  };
  apply();
})();
