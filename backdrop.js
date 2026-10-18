// زمینه صفحه اول (backdrop.css). سه کار:
// ۱) پنجره وسط: کادرها فقط داخل قاب وسط تصویر زمینه دیده می‌شوند (بالا و پایینش محو)، نه روی گل‌ها و گوشه‌ها.
//    خود صفحه مثل همیشه اسکرول می‌شود (با کشیدن هر جای صفحه، و کشیدن به پایین در بالای صفحه برای تازه کردن)؛
//    فقط محوشدن بالا و پایین همراه اسکرول جابه‌جا می‌شود تا ظاهر ثابت بماند. در ‎#admin‎ صفحه مثل قبل است.
// ۲) ورود کادرها: هر کادر وقتی به پنجره می‌رسد، یکی‌یکی و مرتب وارد می‌شود.
// ۳) انتخاب زمینه در منو: «هر بار یکی» (پیش‌فرض)، یکی از زمینه‌های روشن برای همیشه (کلید bgPick روی همین گوشی)،
//    «زمینه من» (bgPick=mine، تصویری که خود کاربر روی همین گوشی گذاشته؛ bg-mine.js)،
//    یا «ظاهر قبلی» (bgPick=classic): همان صفحه پیش از این زمینه‌ها، بی‌قاب و بی‌محوشدن؛ هرگز تصادفی انتخاب نمی‌شود.
// خود زمینه را اسکریپت کوچک داخل <head> در index.html انتخاب می‌کند (bgxList: زمینه‌های روشن، bgxSet: گذاشتن یکی).
// زمینه‌هایی که مدیر اضافه می‌کند (bg-admin.js) رنگ کادرهای یکی از چهار زمینه را می‌گیرند و قاب وسطشان را خود مدیر تعیین کرده است.
(function () {
  const root = document.documentElement;
  window.bgxReady = true;
  const themed = !!root.dataset.bg; // در «ظاهر قبلی سایت» زمینه‌ای نیست و فقط انتخاب در منو کار می‌کند
  const NAMES = window.bgxNames = { night: 'سبز شب', sage: 'سبز ملایم', blue: 'آبی و طلایی', garden: 'باغ گل', dark: 'تیره' };
  // جای قاب وسط در هر تصویر، نسبت به عرض و ارتفاع تصویر: چپ، بالا، راست، پایین
  const WIN = { night: [.06, .21, .94, .74], sage: [.13, .23, .88, .76], blue: [.19, .19, .82, .80], garden: [.08, .27, .92, .77] };
  const SIZE = { night: [1024, 1536], sage: [1024, 1536], blue: [864, 1221], garden: [941, 1672] };
  const main = document.querySelector('main'), foot = document.querySelector('.site-foot');
  if (foot && themed) main.append(foot); // تاریخ هم داخل همان پنجره، آخر صفحه

  // ---------- ۱) پنجره وسط ----------
  let win = null; // { T, B } به پیکسل از بالای صفحه نمایش
  function layout() {
    if (!themed) return;
    const e = window.bgxCur || { id: root.dataset.bg }, box = e.url ? e.win : WIN[e.id], size = e.url ? e.size : SIZE[e.id];
    const on = location.hash !== '#admin' && !!box && !!size;
    root.classList.toggle('bgx-win', on);
    if (!on) { win = null; root.style.scrollPaddingTop = root.style.scrollPaddingBottom = ''; return; }
    const vw = root.clientWidth, vh = innerHeight, [iw, ih] = size, [l, t, r, b] = box;
    // همان اندازه‌ای که backdrop.css به تصویر می‌دهد: صفحه باریک «cover»، صفحه پهن تصویر کامل به ارتفاع صفحه
    let w, h;
    if (vw / vh < 4 / 5) { const s = Math.max(vw / iw, vh / ih); w = iw * s; h = ih * s; } else { h = vh; w = iw / ih * vh; }
    const x0 = (vw - w) / 2;
    const L = Math.max(4, x0 + l * w), R = Math.min(vw - 4, x0 + r * w);
    const T = Math.round(Math.max(8, t * h)), B = Math.round(Math.min(vh - 8, b * h));
    win = { T, B };
    const st = main.style;
    st.setProperty('--win-l', `${Math.round(L)}px`); st.setProperty('--win-w', `${Math.round(R - L)}px`);
    st.setProperty('--win-t', `${T}px`); st.setProperty('--win-gap', `${vh - B}px`);
    // پرش به یک کادر (از منو و دکمه‌ها) آن را زیر محوشدن بالا و پایین پنجره نبرد
    root.style.scrollPaddingTop = `${T + 40}px`; root.style.scrollPaddingBottom = `${vh - B + 50}px`;
    fade();
  }
  // محوشدن بالا و پایین پنجره، به مختصات داخل main
  function fade() {
    if (!win) return;
    const top = main.getBoundingClientRect().top; // منفی وقتی صفحه پایین رفته
    main.style.setProperty('--m0', `${Math.round(win.T - top)}px`);
    main.style.setProperty('--m1', `${Math.round(win.B - top)}px`);
  }
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fade(); }); }, { passive: true });
  addEventListener('resize', layout); addEventListener('hashchange', layout);
  layout();

  // ---------- ۲) ورود کادرها ----------
  if (root.classList.contains('bgx-anim')) {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches || root.dataset.motion === 'reduce') root.classList.remove('bgx-anim');
    else {
      // فقط وقتی کادر به پنجره وسط رسید (نه زیر محوشدن پایین)
      const margin = win ? `-${win.T}px 0px -${innerHeight - win.B + 30}px 0px` : '0px 0px -6% 0px';
      const io = new IntersectionObserver(entries => {
        const shown = entries.filter(e => e.isIntersecting).map(e => e.target)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);
        shown.forEach((el, i) => {
          const delay = i * 140;
          el.style.setProperty('--bgx-d', `${delay}ms`);
          el.classList.add('bgx-in');
          io.unobserve(el);
          // پس از پایان حرکت، انیمیشن برداشته می‌شود تا روی بقیه چیزهای کادر (مثل پنجره‌های باز شونده) اثری نگذارد.
          setTimeout(() => { el.classList.add('bgx-done'); el.style.removeProperty('--bgx-d'); }, delay + 1200);
        });
      }, { rootMargin: margin });
      const watch = el => { if (!el.classList.contains('bgx-in')) io.observe(el); };
      document.querySelectorAll('main > header, main > .panel, main .bgx-frame').forEach(watch);
      // کادرهایی که فایل‌های دیگر بعداً اضافه می‌کنند (چله‌های من، ثبت‌نام، نصب برنامه)
      new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('panel')) watch(n); })))
        .observe(main, { childList: true });
    }
  }

  // ---------- ۳) انتخاب زمینه در منو ----------
  const css = `
.bgp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:8px;padding:4px 16px 8px}
.bgp-grid button{height:auto;min-height:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;color:var(--ink);font-size:12px;font-weight:500;line-height:1.5;white-space:normal}
.bgp-grid button:hover{background:none}
.bgp-grid i{display:block;width:100%;aspect-ratio:2/3;border-radius:8px;border:2px solid var(--line);background:center/cover no-repeat;box-shadow:0 2px 6px #0002}
.bgp-grid i.bgp-auto{display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;background:linear-gradient(135deg,#1f5a3a 0 25%,#6b8a66 25% 50%,#3e5f84 50% 75%,#3c7a66 75%);color:#fff}
.bgp-grid button.on i{border-color:var(--gold);box-shadow:0 0 0 2px var(--deep)}
.bgp-grid button.on{font-weight:700;color:var(--deep)}
.bgp-grid i.bgp-add{background:var(--mint);color:var(--deep);border-style:dashed;font-size:26px}`;
  { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getPick = () => { try { return localStorage.getItem('bgPick') || ''; } catch { return ''; } };
  const thumb = e => e.url || `bg/${e.id}.webp`;
  function apply(e) { window.bgxSet(e); layout(); }
  window.bgxApply = apply;
  window.siteMenu?.section({
    id: 'backdrop', order: 90,
    render(box) {
      const list = window.bgxList(), ids = list.map(e => e.id), mine = window.bgxMine?.(), pick = ids.includes(getPick()) || getPick() === 'classic' || (mine && getPick() === 'mine') ? getPick() : '';
      box.innerHTML = `<h3>زمینه صفحه</h3><div class="bgp-grid">
<button type="button" data-bgp=""${pick ? '' : ' class="on"'}><i class="bgp-auto">↻</i>هر بار یکی</button>
${list.map(e => `<button type="button" data-bgp="${esc(e.id)}"${pick === e.id ? ' class="on"' : ''}><i style="background-image:url('${esc(thumb(e))}')"></i>${esc(e.name || NAMES[e.id])}</button>`).join('')}
<button type="button" data-bgp="classic"${pick === 'classic' ? ' class="on"' : ''}><i style="background-image:url('background.jpg')"></i>ظاهر قبلی</button>
${mine ? `<button type="button" data-bgp="mine"${pick === 'mine' ? ' class="on"' : ''}><i style="background-image:url('${mine.url}')"></i>زمینه من</button>` : ''}
${window.bgxMineEdit ? `<button type="button" data-bgm><i class="bgp-auto bgp-add">${mine ? '✎' : '+'}</i>${mine ? 'تغییر زمینه من' : 'زمینه خودم'}</button>` : ''}</div><div class="bgp-mine"></div>`;
      box.querySelector('.bgp-grid').onclick = e => {
        if (e.target.closest('[data-bgm]')) return window.bgxMineEdit(box.querySelector('.bgp-mine'));
        const b = e.target.closest('[data-bgp]'); if (!b) return;
        const k = b.dataset.bgp;
        try { k ? localStorage.setItem('bgPick', k) : localStorage.removeItem('bgPick'); } catch {}
        box.querySelectorAll('[data-bgp]').forEach(x => x.classList.toggle('on', x === b));
        // رفتن به «ظاهر قبلی» یا برگشتن از آن، چیدمان صفحه اول را عوض می‌کند؛ پس صفحه از نو باز می‌شود.
        if (k === 'classic' || !themed) return location.reload();
        const pickE = k === 'mine' ? mine : list.find(x => x.id === k); if (pickE) apply(pickE);
      };
    }
  });
})();
