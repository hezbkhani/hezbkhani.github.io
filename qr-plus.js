// افزونه‌های قرآن‌خوان (quran-reader.js)، هر کدام پشت کلید امکانات (features.js):
//  saved: نشانه، رنگ و یادداشت روی آیه‌ها (localStorage با کلید qrSaved به شکل {"سوره:آیه": {b, c, note, t}}) و برگه «نشانه‌ها و یادداشت‌های من» در منو
//  audioplus: تکرار هر آیه، تکرار بازه، مکث میان آیه‌ها و زمان‌سنج خواب، در تنظیمات صوت قرآن‌خوان
//  hifz: حالت حفظ؛ متن آیه‌ها پنهان می‌شود و با زدن، کلمه به کلمه پیدا می‌شود
//  share: ساختن تصویر آیه یا فراز دعا (window.shareCard) برای فرستادن یا ذخیره
// همه از راه window.quranReader.hooks به قرآن‌خوان وصل‌اند تا تغییر خود quran-reader.js کم بماند.
(function () {
  const R = window.quranReader;
  const on = id => !!window.features?.shown(id);
  const fa = '۰۱۲۳۴۵۶۷۸۹', arD = '٠١٢٣٤٥٦٧٨٩';
  const toFa = x => String(x).replace(/\d/g, d => fa[d]), toAr = x => String(x).replace(/\d/g, d => arD[d]);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const sname = s => (R && R.name(s)) || window.quranFree?.names?.[s - 1] || toFa(s);
  // افزودن یک حالت به تاریخچه، تا دکمه برگشت گوشی همان برگه را ببندد (حالت‌های قبلی، مثل qr قرآن‌خوان، می‌مانند).
  const push = f => { try { history.pushState(Object.assign({}, history.state, { [f]: 1 }), ''); } catch {} };
  const back = f => { try { if (history.state?.[f]) history.back(); } catch {} };
  const COLORS = [['#f2c94c', 'زرد'], ['#6fbf8e', 'سبز'], ['#7fb2e5', 'آبی'], ['#e79ab4', 'صورتی']];

  const css = `
/* فهرست تنظیمات بلندتر از صفحه گوشی می‌شود؛ خودش جدا اسکرول می‌خورد و زیر نوار پخش نمی‌رود. */
.qr-menu.show{max-height:calc(100vh - 70px);max-height:calc(100dvh - 70px);overflow-y:auto;overscroll-behavior:contain}
.qr.x .qr-menu.show{max-height:calc(100vh - 150px - env(safe-area-inset-bottom));max-height:calc(100dvh - 150px - env(safe-area-inset-bottom))}
.qp-more{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;min-width:40px;height:40px;margin:-4px 6px 0 0;padding:0 8px;border:1px solid var(--line);background:transparent;color:var(--accent);font:700 18px/1 Vazirmatn,sans-serif;letter-spacing:1px}
.qp-more:hover{background:var(--line)}
${COLORS.map((c, i) => `.qr-ayah.qp-c${i + 1}:not(.playing){background:${c[0]}2e}.qr.flow .qr-ayah.qp-c${i + 1}:not(.playing){background:none}.qr.flow .qr-ayah.qp-c${i + 1} .qr-ar{background:${c[0]}40}`).join('')}
.qr-ayah.qp-b .qr-num::after{content:"";display:inline-block;width:9px;height:15px;margin:0 3px;vertical-align:middle;background:var(--gold);clip-path:polygon(0 0,100% 0,100% 100%,50% 72%,0 100%)}
.qp-nt{margin:6px 0 0;padding:4px 10px;border-right:3px solid var(--gold);color:var(--muted);font-size:14.5px;line-height:1.9;white-space:pre-wrap;cursor:pointer}
.qr.flow .qp-nt{display:none}
.qr.flow .qr-ayah.qp-n .qr-num::before{content:"✎";font:13px Vazirmatn,sans-serif;color:var(--gold);margin:0 2px}
.qp-sh{position:fixed;inset:0;z-index:4;display:none;align-items:flex-end;justify-content:center;background:#0006}
.qp-sh.show{display:flex}
.qp-box{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card);color:var(--text);border-top:3px solid var(--gold);box-shadow:0 -8px 30px #0004;padding:0 0 calc(12px + env(safe-area-inset-bottom));animation:qpup .2s ease}
@keyframes qpup{from{transform:translateY(30px);opacity:.5}}
.qp-q{margin:10px 16px 2px;font:normal 22px/1.9 QuranHafs,serif;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl}
.qp-acts{display:grid;grid-template-columns:repeat(auto-fit,minmax(62px,1fr));gap:6px;padding:10px 16px}
.qp-acts button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:68px;padding:4px;background:var(--bg);color:var(--text);border:1px solid var(--line);font:500 14px/1.4 Vazirmatn,sans-serif}
.qp-acts button span{font-size:21px;line-height:1.2;color:var(--accent)}
.qp-acts button.on{border-color:var(--gold);background:rgba(199,154,69,.16)}
.qp-cols{display:flex;align-items:center;gap:10px;padding:4px 16px 8px;font-size:15px}
.qp-cols b{font-weight:600;margin-left:auto}
.qp-cols button{width:44px;height:44px;padding:0;border-radius:50%;border:2px solid transparent;background-clip:padding-box;font-size:18px;color:var(--muted)}
.qp-cols button.on{border-color:var(--text);box-shadow:inset 0 0 0 3px var(--card)}
.qp-cols .qp-c0{background:var(--bg);border:1px dashed var(--line)}
.qp-ed{padding:4px 16px 8px}
.qp-ed textarea{width:100%;min-height:96px;padding:8px 10px;font:15px/1.9 Vazirmatn,sans-serif;color:var(--text);background:var(--bg);border:1px solid var(--line);resize:vertical;box-sizing:border-box}
.qp-ed div{display:flex;gap:8px;margin-top:6px}
.qp-ed button{flex:1;height:44px;border:1px solid var(--line);background:transparent;color:var(--text);font:600 15px Vazirmatn,sans-serif}
.qp-ed button.qp-ok{background:var(--accent);border-color:var(--accent);color:#fff}
.qr.night .qp-ed button.qp-ok{color:#10201a}
.qp-link{display:block;width:calc(100% - 32px);margin:4px 16px 0;height:44px;border:0;background:transparent;color:var(--accent);font:600 15px Vazirmatn,sans-serif;text-align:right}
/* زیر نوار بالای قرآن‌خوان می‌چسبد؛ --barh بلندی اندازه‌گیری‌شده آن نوار است (quran-reader.js). */
.qp-hzbar{position:sticky;top:var(--barh,58px);z-index:1;display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--card);border-bottom:1px solid var(--line);font-size:14px;color:var(--muted)}
.qp-hzbar[hidden]{display:none}
.qp-hzbar b{flex:1;color:var(--accent);font-weight:600}
.qp-hzbar button{height:40px;padding:0 12px;border:1px solid var(--line);background:transparent;color:var(--text);font:600 14px Vazirmatn,sans-serif}
.qp-hzbar .qp-x{width:40px;padding:0;font-size:16px}
.qr.qp-hz .qr-ar{cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.qr.qp-hz .qp-w:not(.on){color:transparent;background:var(--line);border-radius:6px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.qr.qp-hz.qp-hzfa .qr-ayah:not(.qp-fa) .qr-fa>span{filter:blur(6px);cursor:pointer;-webkit-user-select:none;user-select:none}
.qr-player .qp-ind{flex:none;display:none;align-items:center;gap:6px;width:auto;height:40px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--accent);font:600 12.5px Vazirmatn,sans-serif;white-space:nowrap}
.qr-player .qp-ind.show{display:inline-flex}
.qp-rng{flex-wrap:wrap}
.qp-rng label{display:flex;align-items:center;gap:6px}
.qp-rng select{max-width:none!important;width:auto;flex:none!important}
.qp-rng button{height:40px;padding:0 12px;background:var(--accent);color:#fff;border:0;font:600 14px Vazirmatn,sans-serif}
.qr.night .qp-rng button{color:#10201a}
.qp-hint{font-size:13px;color:var(--muted);line-height:1.8}
/* برگه نشانه‌ها و یادداشت‌ها و برگه اشتراک تصویری (بیرون از قرآن‌خوان) */
.qp-shade{position:fixed;inset:0;z-index:56;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.qp-shade.qp-top{z-index:70}
.qp-pbox{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:qpup .25s ease}
.qp-pbox h2{margin:10px 0 0;text-align:center;font:normal 32px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.qp-sub{margin:0 0 10px;text-align:center;color:var(--muted);font-size:14.5px}
.qp-px{float:left;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.qp-pbox h3{margin:14px 0 6px;font-size:15px;color:var(--deep)}
.qp-it{display:flex;align-items:flex-start;gap:10px;width:100%;height:auto;min-height:48px;margin:0 0 6px;padding:8px 12px;text-align:right;white-space:normal;line-height:1.8;background:#fff;color:var(--ink);border:1px solid var(--line);font-weight:500;font-size:15px}
.qp-it:hover{background:var(--hover)}
.qp-it i{flex:none;width:12px;height:12px;margin-top:9px;border-radius:50%}
.qp-it span{flex:1;min-width:0}
.qp-it small{display:block;color:var(--muted);font-size:14px;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.qp-it em{flex:none;font-style:normal;color:var(--gold)}
.qp-empty{text-align:center;color:var(--muted);line-height:2;padding:12px 0}
.qp-prev{display:flex;justify-content:center;margin:8px 0;background:#0000000d;border-radius:var(--r-card);padding:8px}
.qp-prev img{display:block;max-width:100%;max-height:52vh;height:auto;box-shadow:0 4px 18px #0003}
.qp-prev .qp-wait{padding:80px 0;color:var(--muted)}
.qp-opts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}
.qp-opts>span{color:var(--muted);font-size:14.5px}
.qp-seg{display:flex;flex:1;gap:6px}
.qp-seg button{flex:1;height:44px;padding:0 8px;background:#fff;color:var(--deep);border:1px solid var(--line);font-size:15px}
.qp-seg button.on{background:var(--deep);color:#fff;border-color:var(--deep)}
.qp-opts select{flex:1;height:44px}
.qp-go{display:flex;gap:8px;margin-top:10px}
.qp-go button{flex:1;height:50px;font-size:16px}
.qp-crs{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;margin:0 8px 0 0;padding:0;vertical-align:middle;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--accent);opacity:.75}
.qp-crs:hover{opacity:1;background:var(--line)}
.qp-crs svg{width:17px;height:17px}
body.qp-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // ================= نشانه‌ها، رنگ‌ها و یادداشت‌ها =================
  const SKEY = 'qrSaved';
  const saved = {
    all: () => { const v = read(SKEY, {}); return v && typeof v === 'object' ? v : {}; },
    get: k => saved.all()[k] || {},
    set(k, v) {
      const a = saved.all(), x = Object.assign({}, a[k], v);
      ['b', 'c', 'note'].forEach(f => { if (!x[f]) delete x[f]; });
      if (x.b || x.c || x.note) { x.t = Date.now(); a[k] = x; } else delete a[k];
      write(SKEY, a);
    }
  };
  const keyOf = it => `${it.s}:${it.n}`;

  // ================= تنظیمات افزونه‌ها =================
  const PKEY = 'qrPlus';
  const P = Object.assign({ rep: 1, gap: 0, hz: false, hzfa: false }, read(PKEY, {}));
  const saveP = () => write(PKEY, P);

  const el = R && R.el;
  if (R && R.hooks && el) initReader();

  function initReader() {
    const items = () => R.items();
    const $ = s => el.querySelector(s);

    // ---------- ساخت آیه‌ها ----------
    R.hooks.render = list => {
      // متن عربی اصلی هر آیه پیش از هر تغییری (برای تصویر و حالت حفظ)
      list.forEach(it => { const t = it.e.querySelector('.qr-ar').firstChild; it.ar = (t && t.nodeType === 3 ? t.textContent : '').replace(/ /g, ' ').trim(); });
      decorate(list);
      hifzApply(list);
      rangeSync();
    };

    function decorate(list = items()) {
      const S = on('saved'), more = S || on('share'), all = S ? saved.all() : {};
      list.forEach(it => {
        const e = it.e, v = all[keyOf(it)] || {};
        e.classList.toggle('qp-b', !!v.b);
        e.classList.toggle('qp-n', !!v.note);
        COLORS.forEach((_, i) => e.classList.toggle(`qp-c${i + 1}`, v.c === i + 1));
        let nt = e.querySelector('.qp-nt');
        if (v.note) { if (!nt) { nt = document.createElement('p'); nt.className = 'qp-nt'; nt.dataset.qp = 'note'; e.appendChild(nt); } nt.textContent = '✎ ' + v.note; }
        else if (nt) nt.remove();
        let b = e.querySelector('.qp-more');
        if (more && !b) e.querySelector('.qr-fa').insertAdjacentHTML('beforeend', '<button type="button" class="qp-more" data-qp="more" aria-label="نشانه، یادداشت و بیشتر">⋯</button>');
        else if (!more && b) b.remove();
      });
    }

    // ---------- برگه کارهای هر آیه ----------
    const sh = document.createElement('div');
    sh.className = 'qp-sh';
    sh.innerHTML = '<div class="qp-box" role="dialog" aria-modal="true" aria-labelledby="qpShT"></div>';
    el.appendChild(sh);
    let shIt = null, editing = false;
    function openSheet(i) {
      const it = items()[i]; if (!it) return;
      shIt = it; editing = false;
      renderSheet();
      sh.classList.add('show');
      push('qps');
      setTimeout(() => sh.querySelector('.qr-tfs-head button')?.focus(), 30);
    }
    // then: کاری که پس از بسته شدن برگه انجام می‌شود؛ تا برگشت تاریخچه تمام نشده صبر می‌کند تا برگه بعدی (مثلاً تصویر) را نبندد.
    let shThen = null;
    function closeSheet(fromHistory, then) {
      if (!sh.classList.contains('show')) { if (then) then(); return; }
      sh.classList.remove('show');
      if (!fromHistory && history.state?.qps) { shThen = then || null; history.back(); return; }
      if (then) then();
    }
    window.addEventListener('popstate', () => {
      if (!history.state?.qps) sh.classList.remove('show');
      const f = shThen; shThen = null;
      if (f) setTimeout(f, 30);
    });
    function renderSheet() {
      const it = shIt, v = on('saved') ? saved.get(keyOf(it)) : {}, S = on('saved');
      const acts = [];
      if (R.extras()) acts.push(['play', '▶', 'پخش از اینجا']);
      if (S) acts.push(['bm', '🔖', v.b ? 'نشانه دارد' : 'نشانه', v.b], ['ed', '✎', v.note ? 'ویرایش یادداشت' : 'یادداشت', !!v.note]);
      acts.push(['tf', '📖', 'تفسیر']);
      if (on('share')) acts.push(['img', '🖼', 'تصویر']);
      const count = Object.keys(saved.all()).length;
      sh.querySelector('.qp-box').innerHTML = `<div class="qr-tfs-head"><b id="qpShT">سوره ${esc(sname(it.s))} · آیه ${toFa(it.n)}</b><button type="button" data-qp="shx" aria-label="بستن">✕</button></div>
<p class="qp-q" lang="ar">${esc(it.ar)}</p>
<div class="qp-acts">${acts.map(([k, ic, t, o]) => `<button type="button" data-qp="${k}"${o ? ' class="on"' : ''}><span>${ic}</span>${t}</button>`).join('')}</div>
${S ? `<div class="qp-cols"><b>رنگ</b>${COLORS.map(([c, n], i) => `<button type="button" data-qp="c${i + 1}" style="background-color:${c}" aria-label="${n}"${v.c === i + 1 ? ' class="on"' : ''}></button>`).join('')}<button type="button" class="qp-c0${v.c ? '' : ' on'}" data-qp="c0" aria-label="بی‌رنگ">⊘</button></div>` : ''}
${S && editing ? `<div class="qp-ed"><textarea id="qpNote" maxlength="2000" placeholder="یادداشت شما برای این آیه (فقط روی همین گوشی می‌ماند)">${esc(v.note || '')}</textarea><div><button type="button" class="qp-ok" data-qp="nsave">ذخیره یادداشت</button>${v.note ? '<button type="button" data-qp="ndel">حذف یادداشت</button>' : ''}</div></div>` : ''}
${S ? `<button type="button" class="qp-link" data-qp="list">نشانه‌ها و یادداشت‌های من${count ? ` (${toFa(count)})` : ''} ‹</button>` : ''}`;
      if (editing) setTimeout(() => sh.querySelector('#qpNote')?.focus(), 50);
    }
    function sheetClick(a) {
      const it = shIt, k = keyOf(it), i = items().indexOf(it);
      if (a === 'shx') return closeSheet();
      if (a === 'play') return closeSheet(false, () => { startT = 0; R.playAt(i); });
      if (a === 'tf') return closeSheet(false, () => R.openTafsir(it.s, it.n));
      if (a === 'img') return closeSheet(false, () => shareVerse(i));
      if (a === 'list') return closeSheet(false, openList);
      if (a === 'bm') saved.set(k, { b: saved.get(k).b ? 0 : 1 });
      if (/^c\d$/.test(a)) saved.set(k, { c: +a[1] });
      if (a === 'ed') editing = !editing;
      if (a === 'nsave') { saved.set(k, { note: sh.querySelector('#qpNote').value.trim() }); editing = false; }
      if (a === 'ndel') { saved.set(k, { note: '' }); editing = false; }
      decorate([it]); renderSheet();
      window.siteMenu?.refresh();
    }
    sh.addEventListener('click', e => {
      if (e.target === sh) return closeSheet();
      const b = e.target.closest('[data-qp]'); if (b) sheetClick(b.dataset.qp);
    });

    // در حالت «فقط عربی» ترجمه و دکمه ⋯ نیست؛ زدن شماره آیه همین برگه را باز می‌کند (پخش هم در آن هست).
    el.addEventListener('click', e => {
      if (e.target.closest('[data-a="ayah"],[data-a="play"],[data-a="next"],[data-a="prev"]')) startT = 0;
      const num = e.target.closest('.qr-num');
      if (num && R.flow() && (on('saved') || on('share')) && !e.target.closest('.qp-sh')) {
        e.stopPropagation(); e.preventDefault();
        openSheet(items().findIndex(it => it.e === num.closest('.qr-ayah')));
      }
    }, true);
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !el.classList.contains('show') || !sh.classList.contains('show')) return;
      e.preventDefault(); e.stopImmediatePropagation(); closeSheet();
    }, true);

    el.addEventListener('click', e => {
      if (e.target.closest('.qp-sh')) return;
      const b = e.target.closest('[data-qp]');
      const i = () => items().findIndex(it => it.e === e.target.closest('.qr-ayah'));
      if (b && (b.dataset.qp === 'more' || b.dataset.qp === 'note')) { openSheet(i()); if (b.dataset.qp === 'note') { editing = true; renderSheet(); } return; }
      if (b) return;
      hifzClick(e);
    });

    // ================= حالت حفظ =================
    const bar = document.createElement('div');
    // qr-stick: قرآن‌خوان بلندی این نوار را هم در جابه‌جایی به آیه‌ها حساب می‌کند.
    bar.className = 'qp-hzbar qr-stick'; bar.hidden = true;
    bar.innerHTML = '<b>حالت حفظ</b><button type="button" data-hz="all">نمایش همه</button><button type="button" data-hz="none">پنهان همه</button><button type="button" class="qp-x" data-hz="off" aria-label="خروج از حالت حفظ">✕</button>';
    $('.qr-bar').after(bar);
    const hzOn = () => on('hifz') && P.hz;
    const MARK = /^[ؐ-ًؚ-ٰٟۖ-ۭ۞۩]+$/;
    function wrap(it) {
      const p = it.e.querySelector('.qr-ar');
      if (p.dataset.w) return;
      const t = p.firstChild; if (!t || t.nodeType !== 3) return;
      const words = [];
      t.textContent.replace(/ /g, ' ').trim().split(/\s+/).forEach(w => { if (words.length && MARK.test(w)) words[words.length - 1] += ' ' + w; else words.push(w); });
      const f = document.createDocumentFragment();
      words.forEach((w, k) => { const s = document.createElement('span'); s.className = 'qp-w'; s.textContent = w; f.append(s, k < words.length - 1 ? ' ' : ' '); });
      t.replaceWith(f);
      p.dataset.w = 1;
    }
    function hifzApply(list = items()) {
      const h = hzOn();
      el.classList.toggle('qp-hz', h);
      el.classList.toggle('qp-hzfa', h && P.hzfa);
      bar.hidden = !h;
      if (h) list.forEach(wrap);
      syncHzRow();
    }
    function reveal(it, all) {
      const ws = [...it.e.querySelectorAll('.qp-w')];
      if (all) { const full = ws.every(w => w.classList.contains('on')); ws.forEach(w => w.classList.toggle('on', !full)); it.e.classList.toggle('qp-fa', !full); return; }
      const next = ws.find(w => !w.classList.contains('on'));
      if (next) next.classList.add('on');
      else { ws.forEach(w => w.classList.remove('on')); it.e.classList.remove('qp-fa'); }
    }
    let pressT = 0, pressed = false;
    el.addEventListener('pointerdown', e => {
      pressed = false;
      if (!hzOn() || !e.target.closest('.qr-ar') || e.target.closest('.qr-num')) return;
      const ay = e.target.closest('.qr-ayah');
      clearTimeout(pressT);
      pressT = setTimeout(() => { pressed = true; const it = items().find(x => x.e === ay); if (it) { reveal(it, true); navigator.vibrate?.(30); } }, 480);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => clearTimeout(pressT)));
    el.addEventListener('scroll', () => clearTimeout(pressT), { passive: true });
    el.addEventListener('contextmenu', e => { if (hzOn() && e.target.closest('.qr-ar')) e.preventDefault(); });
    function hifzClick(e) {
      if (!hzOn()) return;
      if (pressed) { pressed = false; return; }
      const ay = e.target.closest('.qr-ayah'), it = ay && items().find(x => x.e === ay);
      if (!it) return;
      if (e.target.closest('.qr-ar') && !e.target.closest('.qr-num')) reveal(it);
      else if (P.hzfa && e.target.closest('.qr-fa>span')) ay.classList.add('qp-fa');
    }
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-hz]'); if (!b) return;
      const a = b.dataset.hz;
      if (a === 'off') { P.hz = false; saveP(); return hifzApply(); }
      items().forEach(it => { it.e.querySelectorAll('.qp-w').forEach(w => w.classList.toggle('on', a === 'all')); it.e.classList.toggle('qp-fa', a === 'all'); });
    });

    // ---------- ردیف‌های تنظیمات ----------
    const menu = $('#qrMenu');
    const chips = (k, list) => `<span class="ctl">${list.map(([v, t]) => `<button type="button" class="qr-chip" data-qpk="${k}" data-v="${v}">${t}</button>`).join('')}</span>`;
    const hzRows = document.createElement('div');
    hzRows.style.display = 'contents';
    hzRows.innerHTML = `<div class="qr-row"><span>حالت حفظ</span>${chips('hz', [[1, 'روشن'], [0, 'خاموش']])}</div>
<div class="qr-row" data-hzfa><span>ترجمه در حالت حفظ</span>${chips('hzfa', [[0, 'پیدا'], [1, 'پنهان']])}</div>
<div class="qp-hint" data-hzfa>با زدن روی آیه، کلمه بعدی پیدا می‌شود؛ با نگه داشتن انگشت، کل آیه.</div>`;
    const nightRow = menu.querySelector('[data-a="night"]')?.closest('.qr-row');
    if (nightRow) nightRow.after(hzRows); else menu.prepend(hzRows);
    function syncHzRow() {
      hzRows.hidden = !on('hifz');
      hzRows.style.display = on('hifz') ? 'contents' : 'none';
      hzRows.querySelectorAll('[data-hzfa]').forEach(r => { r.style.display = P.hz ? '' : 'none'; });
      hzRows.querySelectorAll('[data-qpk]').forEach(b => b.classList.toggle('on', +P[b.dataset.qpk] === +b.dataset.v));
    }

    // ================= تکرار، مکث و زمان‌سنج خواب =================
    const opt = (v, t, cur) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${t}</option>`;
    const auRows = document.createElement('div');
    auRows.style.display = 'contents';
    auRows.innerHTML = `<div class="qr-row qr-x qr-sec" id="qpAuSec">تکرار و زمان‌سنج</div>
<div class="qr-row qr-x"><span>تکرار هر آیه</span><select id="qpRep" aria-label="تکرار هر آیه">${[1, 2, 3, 5, 10].map(n => opt(n, n === 1 ? 'یک بار (بدون تکرار)' : `${toFa(n)} بار`, P.rep)).join('')}</select></div>
<div class="qr-row qr-x"><span>تکرار چند آیه</span><select id="qpRng" aria-label="تکرار چند آیه">${[[0, 'خاموش'], [2, '۲ بار'], [3, '۳ بار'], [5, '۵ بار'], [10, '۱۰ بار'], [-1, 'پشت سر هم، بی‌پایان']].map(([v, t]) => opt(v, t, 0)).join('')}</select></div>
<div class="qr-row qr-x qp-rng" id="qpRngBox"><label>از <select id="qpFrom" aria-label="از آیه"></select></label><label>تا <select id="qpTo" aria-label="تا آیه"></select></label><button type="button" data-qpa="rplay">▶ پخش</button></div>
<div class="qr-row qr-x"><span>مکث میان آیه‌ها</span><select id="qpGap" aria-label="مکث میان آیه‌ها">${[[0, 'بدون مکث'], [2, '۲ ثانیه'], [5, '۵ ثانیه'], [-1, 'هم‌اندازه آیه (تکرار پس از قاری)']].map(([v, t]) => opt(v, t, P.gap)).join('')}</select></div>
<div class="qr-row qr-x"><span>زمان‌سنج خواب</span><select id="qpSleep" aria-label="زمان‌سنج خواب">${[[0, 'خاموش'], [15, '۱۵ دقیقه'], [30, '۳۰ دقیقه'], [60, '۶۰ دقیقه'], ['end', 'پایان همین سوره یا صفحه']].map(([v, t]) => opt(v, t, 0)).join('')}</select></div>`;
    menu.querySelector('.qr-apply').before(auRows);
    const range = { n: 0, from: '', to: '', done: 0 };
    const idx = k => items().findIndex(it => keyOf(it) === k);
    function rangeSync() {
      const list = items(), many = new Set(list.map(it => it.s)).size > 1;
      const opts = list.map(it => `<option value="${keyOf(it)}">${many ? `${esc(sname(it.s))} ` : 'آیه '}${toFa(it.n)}</option>`).join('');
      // در صفحه تازه (مثلاً صفحه بعدِ قرآن آزاد) بازه قبلی دیگر نیست.
      if (range.n && (idx(range.from) < 0 || idx(range.to) < 0)) { range.n = 0; $('#qpRng').value = 0; }
      const f = $('#qpFrom'), t = $('#qpTo');
      f.innerHTML = opts; t.innerHTML = opts;
      if (list.length) {
        if (idx(range.from) < 0) range.from = keyOf(list[0]);
        if (idx(range.to) < 0) range.to = keyOf(list[Math.min(list.length - 1, idx(range.from) + 4)]);
        f.value = range.from; t.value = range.to;
      }
      $('#qpRngBox').style.display = range.n ? '' : 'none';
      indicator();
    }
    menu.addEventListener('change', e => {
      const id = e.target.id;
      if (id === 'qpRep') { P.rep = +e.target.value; saveP(); repKey = null; }
      if (id === 'qpGap') { P.gap = +e.target.value; saveP(); }
      if (id === 'qpRng') { range.n = +e.target.value; range.done = 0; $('#qpRngBox').style.display = range.n ? '' : 'none'; }
      if (id === 'qpFrom' || id === 'qpTo') {
        range[id === 'qpFrom' ? 'from' : 'to'] = e.target.value;
        if (idx(range.from) > idx(range.to)) { const x = range.from; range.from = range.to; range.to = x; $('#qpFrom').value = range.from; $('#qpTo').value = range.to; }
        range.done = 0;
      }
      if (id === 'qpSleep') setSleep(e.target.value);
      indicator();
    });
    menu.addEventListener('click', e => {
      const c = e.target.closest('[data-qpk]');
      if (c) { P[c.dataset.qpk] = !!+c.dataset.v; saveP(); hifzApply(); return; }
      if (e.target.closest('[data-qpa="rplay"]')) {
        range.done = 0; repKey = null; startT = 0;
        menu.classList.remove('show'); $('[data-a="menu"]').setAttribute('aria-expanded', false);
        R.playAt(idx(range.from));
      }
    });

    // نشانگر کوچک روی نوار پخش، وقتی تکرار یا زمان‌سنج روشن است؛ با زدنش تنظیمات صوت باز می‌شود.
    const ind = document.createElement('button');
    ind.type = 'button'; ind.className = 'qp-ind';
    $('#qrPlayer .qr-now').after(ind);
    ind.addEventListener('click', () => {
      if (!menu.classList.contains('show')) $('[data-a="menu"]').click();
      setTimeout(() => menu.scrollTo({ top: $('#qpAuSec').offsetTop - 10, behavior: 'smooth' }), 30);
    });
    function indicator() {
      const A = on('audioplus'), parts = [];
      if (A && (P.rep > 1 || range.n)) parts.push(`↻${P.rep > 1 ? toFa(P.rep) : ''}`);
      if (A && sleep.mode === 'end') parts.push('☾ پایان');
      else if (A && sleep.end) parts.push(`☾ ${toFa(Math.max(1, Math.ceil((sleep.end - Date.now()) / 6e4)))}′`);
      ind.innerHTML = parts.map(x => `<span>${x}</span>`).join('');
      ind.classList.toggle('show', !!parts.length);
      ind.setAttribute('aria-label', [P.rep > 1 || range.n ? 'تکرار روشن است' : '', sleep.mode ? 'زمان‌سنج خواب روشن است' : ''].filter(Boolean).join('، '));
    }

    // ---------- منطق پخش ----------
    let repKey = null, repDone = 0, gapT = 0, startT = 0;
    R.audio.addEventListener('playing', () => { if (!startT) startT = Date.now(); });
    const gapMs = () => P.gap > 0 ? P.gap * 1000 : P.gap < 0 && startT ? Math.min(60000, Date.now() - startT) : 0;
    R.hooks.hold = () => on('audioplus') && (P.rep > 1 || P.gap !== 0 || !!range.n || sleep.mode === 'end');
    R.hooks.next = pos => {
      if (!on('audioplus')) return false;
      const list = items(), it = list[pos];
      if (!it) return false;
      const k = keyOf(it);
      if (repKey !== k) { repKey = k; repDone = 1; }
      if (repDone < P.rep) { repDone++; return go(pos, pos, `تکرار ${toFa(repDone)} از ${toFa(P.rep)}`); }
      repKey = null;
      if (sleep.mode === 'end' && (it.n === R.ayahs(it.s) || pos === list.length - 1)) {
        R.pause(); clearSleep(); R.setNow('زمان‌سنج خواب', 'پخش در پایان سوره متوقف شد'); return true;
      }
      if (range.n && pos === idx(range.to)) {
        range.done++;
        if (range.n < 0 || range.done < range.n) return go(pos, idx(range.from), range.n > 0 ? `دور ${toFa(range.done + 1)} از ${toFa(range.n)}` : 'تکرار از اول بازه');
        range.done = 0; R.pause(); R.setNow('پایان تکرار', `بازه ${toFa(range.n)} بار خوانده شد`); return true;
      }
      if (P.gap && pos + 1 < list.length) return go(pos, pos + 1);
      startT = 0;
      return false;
    };
    function go(pos, i, why) {
      const ms = gapMs(); startT = 0;
      clearTimeout(gapT);
      if (!ms) { R.playAt(i); return true; }
      const want = R.task();
      R.setNow(P.gap < 0 ? 'نوبت شما؛ تکرار کنید' : 'مکث', why || `${toFa(Math.round(ms / 1000))} ثانیه`);
      gapT = setTimeout(() => { const st = R.state(); if (st.playing && R.task() === want && st.pos === pos) R.playAt(i); }, ms);
      return true;
    }

    // زمان‌سنج خواب: در پایان زمان، صدا آرام کم می‌شود و پخش می‌ایستد.
    const sleep = { mode: 0, end: 0, t: 0, tick: 0, fade: 0 };
    function clearSleep() {
      clearTimeout(sleep.t); clearInterval(sleep.tick); clearInterval(sleep.fade);
      if (sleep.fade) R.audio.volume = 1;
      Object.assign(sleep, { mode: 0, end: 0, t: 0, tick: 0, fade: 0 });
      const s = $('#qpSleep'); if (s) s.value = 0;
      indicator();
    }
    function setSleep(v) {
      clearSleep();
      $('#qpSleep').value = v;
      if (v === 'end') sleep.mode = 'end';
      else if (+v > 0) {
        sleep.mode = 'time'; sleep.end = Date.now() + v * 6e4;
        sleep.t = setTimeout(fadeStop, v * 6e4);
        sleep.tick = setInterval(indicator, 20000);
      }
      indicator();
    }
    function fadeStop() {
      clearInterval(sleep.tick);
      if (!R.state().playing) return clearSleep();
      const a = R.audio; let v = a.volume;
      sleep.fade = setInterval(() => {
        v -= 0.05;
        if (v > 0) { try { a.volume = v; } catch {} return; }
        clearTimeout(gapT); R.pause(); clearSleep();
        R.setNow('زمان‌سنج خواب', 'پخش متوقف شد. شب خوش');
      }, 400);
    }

    // ---------- اشتراک تصویری یک آیه (یا چند آیه پشت سر هم از همان سوره) ----------
    function shareVerse(i) {
      const list = items(), it = list[i]; if (!it) return;
      const run = [it];
      for (let j = i + 1; j < list.length && run.length < 10 && list[j].s === it.s; j++) run.push(list[j]);
      const [lk, , dir] = R.lang();
      const tr = x => x.e.querySelector('.qr-fa>span')?.textContent || '';
      const build = n => {
        const sel = run.slice(0, n), last = sel[sel.length - 1];
        return {
          ar: sel.map(x => `${x.ar} ${toAr(x.n)}`).join(' '),
          fa: sel.map(x => (n > 1 ? `(${dir === 'rtl' ? toFa(x.n) : x.n}) ` : '') + tr(x)).join(' '),
          title: `سوره ${sname(it.s)}`,
          sub: n > 1 ? `آیه‌های ${toFa(it.n)} تا ${toFa(last.n)}` : `آیه ${toFa(it.n)}`,
          credit: `ترجمه: ${R.trName()}`, dir, lang: lk,
          file: `nooran-${it.s}-${it.n}${n > 1 ? '-' + last.n : ''}`
        };
      };
      openShare(build(1), run.length > 1 ? { label: 'تا آیه', options: run.map((x, k) => [k + 1, toFa(x.n)]), build: v => build(+v) } : null);
    }

    function refresh() {
      decorate(); hifzApply();
      auRows.style.display = on('audioplus') ? 'contents' : 'none';
      if (!on('audioplus')) { clearSleep(); clearTimeout(gapT); }
      if (!on('saved') && !on('share')) closeSheet();
      indicator();
    }
    document.addEventListener('features:changed', refresh);
    refresh();
  }

  // ================= برگه «نشانه‌ها و یادداشت‌های من» =================
  let list = null, listThen = null;
  function openList() {
    if (list && list.isConnected) return;
    list = document.createElement('div'); list.className = 'qp-shade';
    list.innerHTML = '<div class="qp-pbox" role="dialog" aria-modal="true" aria-label="نشانه‌ها و یادداشت‌های من"></div>';
    list.addEventListener('click', e => {
      if (e.target === list || e.target.closest('.qp-px')) return closeList();
      const b = e.target.closest('[data-qp-go]'); if (!b) return;
      const [s, n] = b.dataset.qpGo.split(':').map(Number);
      closeList(false, () => goVerse(s, n));
    });
    renderList();
    document.body.appendChild(list); document.body.classList.add('qp-lock');
    push('qpl');
    setTimeout(() => list.querySelector('.qp-px')?.focus(), 50);
  }
  function renderList() {
    const all = saved.all(), keys = Object.keys(all).map(k => k.split(':').map(Number)).filter(([s, n]) => s >= 1 && s <= 114 && n >= 1).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const groups = [];
    keys.forEach(([s, n]) => { let g = groups[groups.length - 1]; if (!g || g.s !== s) groups.push(g = { s, list: [] }); g.list.push([n, all[`${s}:${n}`]]); });
    const notes = keys.filter(([s, n]) => all[`${s}:${n}`].note).length;
    list.querySelector('.qp-pbox').innerHTML = `<button type="button" class="qp-px" aria-label="بستن">✕</button><h2>نشانه‌ها و یادداشت‌ها</h2>
<p class="qp-sub">${keys.length ? `${toFa(keys.length)} آیه${notes ? `، ${toFa(notes)} یادداشت` : ''} · فقط روی همین گوشی` : 'فقط روی همین گوشی ذخیره می‌شود'}</p>
${groups.length ? groups.map(g => `<h3>سوره ${esc(sname(g.s))}</h3>${g.list.map(([n, v]) => `<button type="button" class="qp-it" data-qp-go="${g.s}:${n}"><i style="background:${v.c ? COLORS[v.c - 1]?.[0] || 'transparent' : 'transparent'}"></i><span>آیه ${toFa(n)}${v.note ? `<small>${esc(v.note)}</small>` : ''}</span>${v.b ? '<em aria-label="نشانه">🔖</em>' : ''}</button>`).join('')}`).join('')
    : '<p class="qp-empty">هنوز آیه‌ای نشانه نگذاشته‌اید.<br>در قرآن‌خوان، روی ⋯ کنار ترجمه هر آیه (یا در حالت «فقط عربی» روی شماره آیه) بزنید تا نشانه، رنگ یا یادداشت بگذارید.</p>'}`;
  }
  function closeList(fromHistory, then) {
    if (!list || !list.isConnected) { if (then) then(); return; }
    list.remove(); document.body.classList.remove('qp-lock');
    if (!fromHistory && history.state?.qpl) { listThen = then || null; history.back(); return; }
    if (then) then();
  }
  window.addEventListener('popstate', () => {
    if (list && list.isConnected && !history.state?.qpl) closeList(true);
    const f = listThen; listThen = null;
    if (f) setTimeout(f, 30);
  });
  async function goVerse(s, n) {
    if (window.quranFree?.openAt && R) return window.quranFree.openAt(R.g(s, n));
    if (!R) return;
    const ix = await R.index(), from = ix.surah[s - 1], to = s < 114 ? ix.surah[s] : ix.total;
    R.openRange({ title: `سوره ${sname(s)}`, from, to, focus: from + n - 1 });
  }

  // در منو، کنار «قرآن آزاد»
  const menuItem = () => {
    const all = saved.all(), n = Object.keys(all).length, notes = Object.values(all).filter(v => v.note).length;
    return `<button type="button" class="sm-item" data-qp-saved><span class="sm-ic">🔖</span><span>نشانه‌ها و یادداشت‌های من<small>${n ? `${toFa(n)} آیه${notes ? `، ${toFa(notes)} یادداشت` : ''}` : 'نشانه، رنگ و یادداشت روی آیه‌ها'}</small></span><span class="sm-go">‹</span></button>`;
  };
  window.siteMenu?.section({
    id: 'qrSaved', order: 3,
    render(box) {
      if (!on('saved')) return;
      const qf = document.querySelector('.sm [data-qf-open]');
      if (qf) qf.insertAdjacentHTML('afterend', menuItem());
      else box.innerHTML = `<h3>قرآن</h3>${menuItem()}`;
    }
  });
  window.qpSaved = { open: openList }; // برای «نوران من» (mine-sheet.js)
  document.addEventListener('click', e => { if (e.target.closest('.sm [data-qp-saved]')) { window.siteMenu.close(); setTimeout(openList, 280); } });
  document.addEventListener('features:changed', () => { if (!on('saved')) closeList(); window.siteMenu?.refresh(); });

  // ================= اشتراک تصویری =================
  const SIZES = { square: [1080, 1080], story: [1080, 1920] };
  const SITE = /^(localhost|127\.|0\.0\.0\.0|\[)/.test(location.hostname) || !location.hostname ? 'hezbkhani.github.io' : location.hostname;
  const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  async function fontsReady(c) {
    if (!document.fonts) return;
    await timeout(Promise.all([
      document.fonts.load('60px QuranHafs', c.ar || 'بسم'),
      document.fonts.load('700 40px Vazirmatn', 'سوره'), document.fonts.load('400 40px Vazirmatn', c.fa || 'ترجمه'),
      document.fonts.load('60px SiteFont', 'نوران')
    ]).catch(() => {}), 6000);
  }
  // شکستن متن به سطرهایی که در پهنا جا شوند (کلمه به کلمه، راست به چپ)
  function wrapLines(x, text, w) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
    const lines = []; let line = '';
    for (const word of words) {
      const t = line ? line + ' ' + word : word;
      if (line && x.measureText(t).width > w) { lines.push(line); line = word; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  function star(x, cx, cy, r, fill, stroke) {
    x.beginPath();
    for (let i = 0; i < 16; i++) { const a = Math.PI / 8 * i - Math.PI / 2, rr = i % 2 ? r * .62 : r; x.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.stroke(); }
  }
  function diamond(x, cx, cy, r, c) { x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath(); x.fillStyle = c; x.fill(); }
  async function drawCard(c, size) {
    await fontsReady(c);
    const [W, H] = SIZES[size] || SIZES.square, story = H > W;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.dir = 'rtl';
    const x = cv.getContext('2d');
    const GREEN = '#0b6b50', GOLD = '#c79a45', INK = '#1f1a14', TR = '#4b4036', MUTED = '#7a6d60', CREAM = '#fbf6ea';
    try { x.direction = 'rtl'; } catch {}
    // زمینه کرم با نقش ستاره‌های کم‌رنگ
    const g = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#f1e4c6');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalAlpha = .07;
    for (let yy = 60; yy < H; yy += 120) for (let xx = (yy / 120) % 2 ? 0 : 60; xx < W + 60; xx += 120) star(x, xx, yy, 20, GOLD);
    x.globalAlpha = 1;
    // قاب: خط طلایی پهن، خط نازک طلایی و خط سبز، با گل‌های هشت‌پر در گوشه‌ها
    const m = 56;
    x.lineWidth = 8; x.strokeStyle = GOLD; x.strokeRect(m, m, W - 2 * m, H - 2 * m);
    x.lineWidth = 2; x.strokeRect(m + 18, m + 18, W - 2 * m - 36, H - 2 * m - 36);
    x.lineWidth = 1.5; x.strokeStyle = GREEN; x.globalAlpha = .55; x.strokeRect(m + 28, m + 28, W - 2 * m - 56, H - 2 * m - 56); x.globalAlpha = 1;
    x.lineWidth = 3;
    [[m, m], [W - m, m], [m, H - m], [W - m, H - m]].forEach(([cx, cy]) => { star(x, cx, cy, 36, CREAM, GOLD); star(x, cx, cy, 16, GREEN); });
    [[W / 2, m], [W / 2, H - m]].forEach(([cx, cy]) => { diamond(x, cx, cy, 16, CREAM); x.strokeStyle = GOLD; x.stroke(); diamond(x, cx, cy, 7, GOLD); });
    x.textAlign = 'center'; x.textBaseline = 'middle';
    // سربرگ: نام سوره یا دعا در یک قاب کشیده
    const top = m + (story ? 150 : 100);
    x.font = '700 46px Vazirmatn, Tahoma, sans-serif';
    const tw = Math.min(W - 2 * m - 160, x.measureText(c.title || '').width + 90), th = 82;
    x.beginPath(); x.roundRect ? x.roundRect(W / 2 - tw / 2, top - th / 2, tw, th, th / 2) : x.rect(W / 2 - tw / 2, top - th / 2, tw, th);
    x.fillStyle = '#fffdf7'; x.fill(); x.lineWidth = 2.5; x.strokeStyle = GOLD; x.stroke();
    diamond(x, W / 2 - tw / 2, top, 9, GOLD); diamond(x, W / 2 + tw / 2, top, 9, GOLD);
    x.fillStyle = GREEN; x.fillText(c.title || '', W / 2, top + 3, tw - 50);
    let y0 = top + th / 2 + 18;
    if (c.sub) { x.font = '500 32px Vazirmatn, Tahoma, sans-serif'; x.fillStyle = MUTED; x.fillText(c.sub, W / 2, y0 + 22); y0 += 50; }
    // پانویس: «نوران» و نشانی سایت
    const footH = 150, y1 = H - m - footH - (story ? 70 : 10);
    x.font = 'normal 64px SiteFont, Vazirmatn, serif'; x.fillStyle = GREEN; x.fillText('نوران', W / 2, H - m - (story ? 170 : 104));
    const nw = x.measureText('نوران').width;
    diamond(x, W / 2 - nw / 2 - 30, H - m - (story ? 166 : 100), 7, GOLD); diamond(x, W / 2 + nw / 2 + 30, H - m - (story ? 166 : 100), 7, GOLD);
    x.font = '500 26px Vazirmatn, Tahoma, sans-serif'; x.fillStyle = MUTED;
    x.save(); try { x.direction = 'ltr'; } catch {} x.fillText(SITE, W / 2, H - m - (story ? 110 : 52)); x.restore();
    // متن: عربی و ترجمه؛ اندازه قلم آن‌قدر کم می‌شود تا هر دو در فضای میانی جا شوند.
    const boxW = W - 2 * m - 150, boxTop = y0 + 30, boxH = y1 - boxTop;
    const credit = c.credit ? 44 : 0, gap = c.fa ? 70 : 0;
    let arS = story ? 88 : 80, faS = story ? 42 : 38, arL = [], faL = [];
    for (let k = 0; k < 40; k++) {
      x.font = `normal ${arS}px QuranHafs, Vazirmatn, serif`; arL = c.ar ? wrapLines(x, c.ar, boxW) : [];
      x.font = `400 ${faS}px Vazirmatn, Tahoma, sans-serif`; faL = c.fa ? wrapLines(x, c.fa, boxW) : [];
      const h = arL.length * arS * 1.95 + gap + faL.length * faS * 1.8 + credit;
      if (h <= boxH || arS <= 30) break;
      arS = Math.max(30, Math.round(arS * .94)); faS = Math.max(22, Math.round(faS * .94));
    }
    // اگر با کوچک‌ترین قلم هم جا نشد، ترجمه کوتاه می‌شود.
    const room = Math.floor((boxH - arL.length * arS * 1.95 - gap - credit) / (faS * 1.8));
    if (c.fa && faL.length > room) { faL = faL.slice(0, Math.max(1, room)); faL[faL.length - 1] += ' …'; }
    const total = arL.length * arS * 1.95 + gap + faL.length * faS * 1.8 + credit;
    let y = boxTop + Math.max(0, (boxH - total) / 2);
    x.fillStyle = INK; x.font = `normal ${arS}px QuranHafs, Vazirmatn, serif`;
    arL.forEach(l => { x.fillText(l, W / 2, y + arS * .95); y += arS * 1.95; });
    if (c.fa) {
      y += gap / 2;
      x.strokeStyle = GOLD; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 120, y); x.lineTo(W / 2 - 18, y); x.moveTo(W / 2 + 18, y); x.lineTo(W / 2 + 120, y); x.stroke();
      diamond(x, W / 2, y, 9, GOLD);
      y += gap / 2;
      x.fillStyle = TR; x.font = `400 ${faS}px Vazirmatn, Tahoma, sans-serif`;
      x.save(); if (c.dir === 'ltr') try { x.direction = 'ltr'; } catch {}
      faL.forEach(l => { x.fillText(l, W / 2, y + faS * .9); y += faS * 1.8; });
      x.restore();
    }
    if (c.credit) { x.font = '400 24px Vazirmatn, Tahoma, sans-serif'; x.fillStyle = MUTED; x.fillText(c.credit, W / 2, y + 26); }
    return cv;
  }

  let cs = null, csState = null;
  function openShare(card, pick) {
    closeShare(true);
    csState = { card, pick, size: 'square', blob: null, url: '' };
    cs = document.createElement('div'); cs.className = 'qp-shade qp-top';
    const canFiles = !!(navigator.canShare && navigator.share);
    cs.innerHTML = `<div class="qp-pbox" role="dialog" aria-modal="true" aria-label="اشتراک تصویری"><button type="button" class="qp-px" aria-label="بستن">✕</button><h2>اشتراک تصویری</h2>
<div class="qp-prev"><div class="qp-wait">در حال ساختن تصویر…</div></div>
<div class="qp-opts"><span>اندازه</span><div class="qp-seg"><button type="button" data-sz="square" class="on">مربع</button><button type="button" data-sz="story">استوری</button></div></div>
${pick ? `<div class="qp-opts"><span>${esc(pick.label)}</span><select aria-label="${esc(pick.label)}">${pick.options.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></div>` : ''}
<div class="qp-go">${canFiles ? '<button type="button" data-cs="share">اشتراک‌گذاری</button>' : ''}<button type="button" data-cs="save"${canFiles ? ' class="rm-ghost"' : ''}>ذخیره تصویر</button></div></div>`;
    cs.addEventListener('click', e => {
      if (e.target === cs || e.target.closest('.qp-px')) return closeShare();
      const sz = e.target.closest('[data-sz]');
      if (sz) { csState.size = sz.dataset.sz; cs.querySelectorAll('[data-sz]').forEach(b => b.classList.toggle('on', b === sz)); return draw(); }
      const a = e.target.closest('[data-cs]')?.dataset.cs;
      if (a) act(a);
    });
    cs.addEventListener('change', e => { if (e.target.matches('select') && pick) { csState.card = pick.build(e.target.value); draw(); } });
    document.body.appendChild(cs); document.body.classList.add('qp-lock');
    push('qpc');
    draw();
  }
  async function draw() {
    const st = csState, prev = cs.querySelector('.qp-prev');
    st.blob = null;
    prev.innerHTML = '<div class="qp-wait">در حال ساختن تصویر…</div>';
    const key = st.size + JSON.stringify(st.card); st.key = key;
    const cv = await drawCard(st.card, st.size);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (st !== csState || st.key !== key || !blob) return;
    if (st.url) URL.revokeObjectURL(st.url);
    st.blob = blob; st.url = URL.createObjectURL(blob);
    prev.innerHTML = `<img src="${st.url}" alt="${esc(st.card.title)} ${esc(st.card.sub || '')}">`;
  }
  async function act(a) {
    const st = csState; if (!st || !st.blob) return;
    const name = `${st.card.file || 'nooran'}${st.size === 'story' ? '-story' : ''}.png`;
    if (a === 'share') {
      const file = new File([st.blob], name, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: st.card.title, text: `${st.card.title}${st.card.sub ? ' · ' + st.card.sub : ''}\nنوران · ${SITE}` }); } catch {}
        return;
      }
    }
    const link = document.createElement('a'); link.href = st.url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
  }
  function closeShare(fromHistory) {
    if (!cs || !cs.isConnected) return;
    if (csState?.url) setTimeout(() => URL.revokeObjectURL(csState.url), 1000);
    cs.remove(); cs = null;
    if (!document.querySelector('.qp-shade')) document.body.classList.remove('qp-lock');
    if (!fromHistory) back('qpc');
  }
  window.addEventListener('popstate', () => { if (cs && !history.state?.qpc) closeShare(true); });
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (cs) { e.preventDefault(); e.stopImmediatePropagation(); return closeShare(); }
    if (list && list.isConnected) { e.preventDefault(); e.stopImmediatePropagation(); closeList(); }
  }, true);
  // برای بخش‌های دیگر (مثلاً خواننده دعاها): shareCard({ ar, fa, title, sub })
  window.shareCard = c => openShare({ ar: c.ar || '', fa: c.fa || '', title: c.title || '', sub: c.sub || '', credit: c.credit || '', dir: c.dir || 'rtl', file: c.file || 'nooran' });

  // ---------- دکمه تصویر در خواننده دعاها و چله‌ها (chelleh.js) ----------
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/></svg>';
  function crButtons(cr) {
    const show = on('share');
    cr.querySelectorAll('.cr-sec').forEach((s, i) => {
      const ar = s.querySelector('.cr-ar'); if (!ar) return;
      const b = ar.querySelector('.qp-crs');
      if (show && !b) ar.insertAdjacentHTML('beforeend', `<button type="button" class="qp-crs" data-crs="${i}" aria-label="ساختن تصویر از این فراز">${ICON}</button>`);
      else if (!show && b) b.remove();
    });
  }
  function hookCr(cr) {
    if (cr.dataset.qp) return; cr.dataset.qp = 1;
    const body = cr.querySelector('.cr-body');
    new MutationObserver(() => crButtons(cr)).observe(body, { childList: true });
    crButtons(cr);
    cr.addEventListener('click', e => {
      const b = e.target.closest('.qp-crs'); if (!b) return;
      e.stopPropagation();
      const s = b.closest('.cr-sec'), title = cr.querySelector('.cr-head h3')?.textContent || cr.querySelector('.cr-title b')?.textContent || '';
      const ar = s.querySelector('.cr-ar').textContent.trim(), tr = s.querySelector('.cr-fa')?.textContent.trim() || '';
      window.shareCard({ ar, fa: tr, title, file: 'nooran-doa' });
    }, true);
  }
  const findCr = () => { const cr = document.querySelector('body > .cr'); if (cr) hookCr(cr); return cr; };
  if (!findCr()) {
    const mo = new MutationObserver(() => { if (findCr()) mo.disconnect(); });
    mo.observe(document.body, { childList: true });
  }
  document.addEventListener('features:changed', () => { const cr = document.querySelector('body > .cr'); if (cr) crButtons(cr); if (!on('share')) closeShare(); });
})();
