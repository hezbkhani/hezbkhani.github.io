// دسترس‌پذیری برگه‌ها: هر پنجره‌ای که با role="dialog" باز می‌شود (چله، دعا، کتاب، تقویم، قبله‌نما و …)
// - اگر نام ندارد، عنوان خودش (اولین h2/h3) نامش می‌شود تا صفحه‌خوان بگوید چه برگه‌ای باز شد؛
// - اگر فوکوس بیرونش مانده، فوکوس به خود برگه می‌رود (بی‌جابه‌جایی صفحه و بی‌باز شدن صفحه‌کلید گوشی)؛
// - Tab و Shift+Tab فقط داخل بالاترین برگه باز می‌چرخند؛
// - وقتی برگه بسته شد، فوکوس به دکمه‌ای برمی‌گردد که آن را باز کرده بود.
// فقط صفحه‌کلید و صفحه‌خوان را تغییر می‌دهد؛ لمس و موس دست‌نخورده می‌مانند.
(function () {
  const st = document.createElement('style');
  st.textContent = '[data-a11y-f]:focus{outline:none}';
  document.head.appendChild(st);

  const vis = el => {
    if (!el.isConnected || el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none';
  };
  const FOCUSABLE = 'a[href],button,input,select,textarea,summary,audio[controls],video[controls],[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  const focusables = d => [...d.querySelectorAll(FOCUSABLE)].filter(e => !e.disabled && !e.closest('[inert]') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');

  // برگه‌های باز به ترتیب باز شدن؛ آخری بالاترین است.
  let stack = [];
  const openers = new WeakMap();
  // چند جابه‌جایی آخر فوکوس؛ اگر خود برگه فوکوس را به دکمه بستنش داده، از این‌جا معلوم می‌شود فوکوس پیش از آن کجا بود.
  const hist = [];
  document.addEventListener('focusin', e => { hist.push([e.target, e.relatedTarget]); if (hist.length > 12) hist.shift(); }, true);
  const cameFrom = d => { for (let i = hist.length - 1; i >= 0; i--) { const [t, from] = hist[i]; if (d.contains(t) && from && !d.contains(from)) return from; } return null; };

  function name(d) {
    if (d.getAttribute('aria-label') && !d.hasAttribute('data-a11y-n')) return;
    const by = d.getAttribute('aria-labelledby');
    if (by && document.getElementById(by)) return;
    const h = d.querySelector('h1,h2,h3');
    const t = h && h.textContent.trim();
    if (t && d.getAttribute('aria-label') !== t) { d.setAttribute('aria-label', t); d.setAttribute('data-a11y-n', ''); }
  }

  function scan() {
    const open = [...document.querySelectorAll('[role="dialog"]')].filter(vis);
    // بسته‌شده‌ها
    const closed = stack.filter(d => !open.includes(d));
    stack = stack.filter(d => open.includes(d));
    for (const d of open) if (!stack.includes(d)) {
      stack.push(d);
      const ae = document.activeElement;
      openers.set(d, ae && ae !== document.body && !d.contains(ae) ? ae : cameFrom(d));
    }
    open.forEach(name);
    const top = stack[stack.length - 1];
    const ae = document.activeElement;
    for (const d of closed) {
      const back = openers.get(d); openers.delete(d);
      // فقط اگر فوکوس داخل همان برگه بود یا گم شده بود؛ اگر کد خود برگه جای دیگری فوکوس داده، دست نمی‌زنیم.
      if (ae && ae !== document.body && document.contains(ae) && !d.contains(ae)) continue;
      if (top && !top.contains(back)) { focusIn(top); continue; }
      if (back && back.isConnected && back.getClientRects().length) try { back.focus({ preventScroll: true }); } catch {}
    }
    if (top && !top.contains(document.activeElement)) focusIn(top);
  }
  function focusIn(d) {
    if (!d.hasAttribute('tabindex')) { d.setAttribute('tabindex', '-1'); d.setAttribute('data-a11y-f', ''); }
    try { d.focus({ preventScroll: true }); } catch {}
  }

  // فقط تغییرهایی که می‌توانند برگه‌ای را باز یا بسته کنند (فرزندان مستقیم body یا خود برگه‌ها) بررسی می‌شوند.
  let queued = 0;
  const later = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; scan(); setTimeout(scan, 320); }); };
  const relevant = m => {
    const t = m.target;
    if (t === document.body || t.parentElement === document.body || t.getAttribute?.('role') === 'dialog' || t.querySelector?.(':scope > [role="dialog"]')) return true;
    // محتوای برگه‌ای که نامش از عنوانش می‌آید عوض شد (مثلاً برگه چله برای چله دیگری پر شد)
    return m.type === 'childList' && !!t.closest?.('[role="dialog"]:is([data-a11y-n],:not([aria-label]):not([aria-labelledby]))');
  };
  new MutationObserver(ms => { if (ms.some(relevant)) later(); })
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'open'] });
  addEventListener('resize', later);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    stack = stack.filter(vis);
    const top = stack[stack.length - 1];
    if (!top) return;
    const f = focusables(top), ae = document.activeElement;
    if (!f.length) { e.preventDefault(); focusIn(top); return; }
    const first = f[0], last = f[f.length - 1];
    if (!top.contains(ae)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && (ae === first || ae === top)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
  }, true);
})();
