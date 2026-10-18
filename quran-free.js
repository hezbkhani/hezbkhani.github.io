// قرآن آزاد: خواندن قرآن از هر سوره، آیه، صفحه یا جزء، صفحه به صفحه با همان قرآن‌خوان سایت (quran-reader.js: ترجمه‌ها، صوت و تفسیر).
// جای خواندن (آیه بالای صفحه یا آیه در حال پخش) فقط روی همین دستگاه در localStorage با کلید quranFree ذخیره می‌شود
// و دفعه بعد پیشنهاد می‌شود از همان‌جا ادامه دهند. در منو هست؛ پیوند ?quran=free هم همین برگه را باز می‌کند.
(function () {
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const NAMES = ['حمد', 'بقره', 'آل‌عمران', 'نساء', 'مائده', 'انعام', 'اعراف', 'انفال', 'توبه', 'یونس', 'هود', 'یوسف', 'رعد', 'ابراهیم', 'حجر', 'نحل', 'اسراء', 'کهف', 'مریم', 'طه', 'انبیاء', 'حج', 'مؤمنون', 'نور', 'فرقان', 'شعراء', 'نمل', 'قصص', 'عنکبوت', 'روم', 'لقمان', 'سجده', 'احزاب', 'سبأ', 'فاطر', 'یس', 'صافات', 'ص', 'زمر', 'غافر', 'فصلت', 'شوری', 'زخرف', 'دخان', 'جاثیه', 'احقاف', 'محمد', 'فتح', 'حجرات', 'ق', 'ذاریات', 'طور', 'نجم', 'قمر', 'الرحمن', 'واقعه', 'حدید', 'مجادله', 'حشر', 'ممتحنه', 'صف', 'جمعه', 'منافقون', 'تغابن', 'طلاق', 'تحریم', 'ملک', 'قلم', 'حاقه', 'معارج', 'نوح', 'جن', 'مزمل', 'مدثر', 'قیامت', 'انسان', 'مرسلات', 'نبأ', 'نازعات', 'عبس', 'تکویر', 'انفطار', 'مطففین', 'انشقاق', 'بروج', 'طارق', 'اعلی', 'غاشیه', 'فجر', 'بلد', 'شمس', 'لیل', 'ضحی', 'انشراح', 'تین', 'علق', 'قدر', 'بینه', 'زلزله', 'عادیات', 'قارعه', 'تکاثر', 'عصر', 'همزه', 'فیل', 'قریش', 'ماعون', 'کوثر', 'کافرون', 'نصر', 'مسد', 'اخلاص', 'فلق', 'ناس'];
  // نام‌های دیگری که برای بعضی سوره‌ها به کار می‌رود (برای جستجو)
  const ALIAS = { 1: ['فاتحه', 'فاتحه‌الکتاب'], 17: ['بنی‌اسرائیل', 'اسری'], 40: ['مؤمن'], 41: ['حم سجده'], 47: ['قتال'], 76: ['دهر', 'هل اتی'], 94: ['شرح', 'الم نشرح'], 111: ['تبت', 'لهب'], 112: ['توحید'], 9: ['برائت'] };
  const KEY = 'quranFree';
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.g >= 0 && v.g < 6236 ? v : null; } catch { return null; } };
  const saveAt = g => { try { localStorage.setItem(KEY, JSON.stringify({ g, t: Date.now() })); } catch {} };

  // حروف عربی و فارسی یکسان، بدون اعراب و فاصله و نیم‌فاصله، ارقام لاتین
  const norm = s => String(s).replace(/[۰-۹]/g, d => fa.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[يىئ]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه')
    .replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ء/g, '').replace(/[\s‌]+/g, ' ').trim().toLowerCase();
  const tight = s => norm(s).replace(/ /g, '');
  const KEYS = NAMES.map((n, i) => [n, ...(ALIAS[i + 1] || [])].map(x => tight(x).replace(/^ال(?=..)/, '')));

  let ix = null;
  const getIx = async () => ix || (ix = await window.quranReader.index());
  const lastLE = (arr, g) => { let i = 0; while (i + 1 < arr.length && arr[i + 1] <= g) i++; return i; };
  const where = g => { const s = lastLE(ix.surah, g); return { s: s + 1, n: g - ix.surah[s] + 1, page: lastLE(ix.page, g) + 1, juz: lastLE(ix.juz, g) + 1 }; };
  const ayahCount = s => (s < 114 ? ix.surah[s] : ix.total) - ix.surah[s - 1];
  const placeText = g => { const w = where(g); return `سوره ${NAMES[w.s - 1]}، آیه ${toFa(w.n)}`; };
  const ago = t => { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'امروز' : d === 1 ? 'دیروز' : `${toFa(d)} روز پیش`; };

  // ---------- باز کردن یک صفحه در قرآن‌خوان ----------
  async function openPage(p, focus, opts) {
    await getIx();
    p = Math.max(1, Math.min(604, p));
    const from = ix.page[p - 1], to = p < 604 ? ix.page[p] : ix.total, w = where(from), we = where(to - 1);
    window.quranReader.openRange({
      title: `صفحه ${p} قرآن`,
      sub: `جزء ${toFa(w.juz)} · سوره ${w.s === we.s ? NAMES[w.s - 1] : `${NAMES[w.s - 1]} و ${NAMES[we.s - 1]}`}`,
      from, to, focus, autoplay: !!(opts && opts.autoplay),
      endText: p < 604 ? `پایان صفحه ${toFa(p)}` : 'پایان قرآن کریم. قبول باشد.',
      nav: { prev: p > 1 ? 'صفحه قبل' : '', next: p < 604 ? 'صفحه بعد' : '', menu: 'انتخاب صفحه',
        onPrev: () => openPage(p - 1), onNext: o => openPage(p + 1, null, o), onMenu: () => openSheet() },
      onView: g => { saveAt(g); window.siteMenu?.refresh(); }
    });
  }
  const openAt = g => openPage(where(g).page, g);

  // ---------- برگه انتخاب ----------
  const css = `
.qf-shade{position:fixed;inset:0;z-index:48;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.qf-box{width:100%;max-width:560px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:qfup .25s ease}
@keyframes qfup{from{transform:translateY(40px);opacity:.4}}
.qf-x{float:left;width:42px;height:42px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.qf-box h2{margin:10px 0 0;text-align:center;font:normal 34px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.qf-sub{margin:0 0 10px;text-align:center;color:var(--muted);font-size:15px}
.qf-card{background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);padding:10px 14px;margin:10px 0}
.qf-card h3{margin:0 0 6px;font-size:16px;color:var(--deep)}
.qf-resume{background:var(--mint);border-right:5px solid var(--deep)}
.qf-resume p{margin:0;font-size:18px;font-weight:700;color:var(--deep)}
.qf-resume small{display:block;color:var(--muted);font-size:14px}
.qf-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.qf-row button{flex:1 1 auto}
.qf-row input,.qf-row select{flex:1 1 120px;width:auto}
.qf-tabs{display:flex;gap:6px;margin:0 0 8px}
.qf-tabs button{flex:1;height:40px;padding:0 8px;background:#fff;color:var(--deep);border:1px solid var(--line);font-size:15px}
.qf-tabs button.on{background:var(--deep);color:#fff;border-color:var(--deep)}
.qf-juz{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.qf-juz button{height:42px;padding:0;background:#fff;color:var(--deep);border:1px solid var(--line);font-size:16px}
.qf-juz button:hover,.qf-res button:hover{background:var(--hover)}
.qf-juz button.cur{border:2px solid var(--emerald);background:var(--mint)}
.qf-res{display:grid;gap:6px;margin-top:8px}
.qf-res:empty{display:none}
.qf-res button{display:block;width:100%;height:auto;min-height:44px;padding:6px 12px;text-align:right;white-space:normal;line-height:1.7;background:#fff;color:var(--ink);border:1px solid var(--line);font-weight:500;font-size:15px}
.qf-res button b{color:var(--deep)}
.qf-res button small{display:block;color:var(--muted);font-size:14px}
.qf-res mark{background:#fde9a8;color:inherit}
.qf-res .qf-more{background:var(--cream);color:var(--deep);font-weight:600;text-align:center}
.qf-note{margin:6px 0 0;font-size:14px;color:var(--muted)}
body.qf-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let shade = null, tab = 'surah', thenAfter = null;
  async function openSheet() {
    if (shade && shade.isConnected) return;
    // قلم عربی قرآن‌خوان از همین حالا گرفته می‌شود تا با باز شدن صفحه، متن عربی منتظر قلم نماند.
    try { document.fonts?.load('1em QuranHafs').catch(() => {}); } catch {}
    try { await getIx(); } catch { return toast('بارگذاری فهرست قرآن انجام نشد. اینترنت را بررسی کنید.'); }
    shade = document.createElement('div'); shade.className = 'qf-shade';
    shade.innerHTML = `<div class="qf-box" role="dialog" aria-modal="true" aria-label="قرآن آزاد"></div>`;
    shade.addEventListener('click', onClick);
    shade.addEventListener('input', e => { if (e.target.id === 'qfQ') search(e.target.value); });
    shade.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); (e.target.id === 'qfQ' ? shade.querySelector('.qf-res button') : e.target.closest('.qf-card').querySelector('[data-qf=go]'))?.click(); } });
    document.body.appendChild(shade); document.body.classList.add('qf-lock');
    render();
    try { if (!history.state?.qf) history.pushState({ qf: 1 }, ''); } catch {}
  }
  function closeSheet(fromHistory, then) {
    if (!shade || !shade.isConnected) { if (then) then(); return; }
    shade.remove(); document.body.classList.remove('qf-lock');
    if (!fromHistory) { try { if (history.state?.qf) { thenAfter = then || null; history.back(); return; } } catch {} }
    if (then) then();
  }
  window.addEventListener('popstate', () => {
    if (shade && shade.isConnected && !history.state?.qf) closeSheet(true);
    const f = thenAfter; thenAfter = null;
    if (f) setTimeout(f, 30);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade && shade.isConnected) closeSheet(); });
  const go = g => closeSheet(false, () => openAt(g));

  function render() {
    const box = shade.querySelector('.qf-box'), last = load(), w = last && where(last.g);
    const opts = NAMES.map((n, i) => `<option value="${i + 1}">${toFa(i + 1)}. ${n}</option>`).join('');
    box.innerHTML = `<button type="button" class="qf-x" data-qf="close" aria-label="بستن">✕</button>
<h2>قرآن آزاد</h2><p class="qf-sub">از هر سوره، آیه، صفحه یا جزء که بخواهید بخوانید.</p>
${last ? `<div class="qf-card qf-resume"><h3>دفعه قبل تا اینجا خوانده‌اید</h3><p>${placeText(last.g)}</p><small>صفحه ${toFa(w.page)} · جزء ${toFa(w.juz)} · ${ago(last.t)}</small>
<div class="qf-row"><button type="button" data-qf="resume">ادامه از همین‌جا</button><button type="button" class="rm-ghost" data-qf="elsewhere">شروع از جای دیگر</button></div></div>` : ''}
<div class="qf-card"><h3>جستجو</h3><input id="qfQ" type="search" autocomplete="off" placeholder="نام سوره، صفحه، جزء یا کلمه‌ای از آیه" aria-label="جستجو در قرآن"><p class="qf-note">مثلاً: یس، بقره ۲۵۵، ۲:۲۵۵، صفحه ۵۰، جزء ۳۰، صبر</p><div class="qf-res" id="qfRes"></div></div>
<div class="qf-card"><div class="qf-tabs">${[['surah', 'سوره و آیه'], ['page', 'صفحه'], ['juz', 'جزء']].map(([k, t]) => `<button type="button" data-qf-tab="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>
<div data-pane="surah"${tab === 'surah' ? '' : ' hidden'}><div class="qf-row"><select id="qfSurah" aria-label="سوره">${opts}</select><input id="qfAyah" inputmode="numeric" placeholder="آیه (اختیاری)" aria-label="شماره آیه"></div><p class="qf-note" id="qfAyahNote"></p><div class="qf-row"><button type="button" data-qf="go">بخوان</button></div></div>
<div data-pane="page"${tab === 'page' ? '' : ' hidden'}><div class="qf-row"><input id="qfPage" inputmode="numeric" placeholder="شماره صفحه، ۱ تا ۶۰۴" aria-label="شماره صفحه"><button type="button" data-qf="go">بخوان</button></div><p class="qf-note">صفحه‌ها مطابق قرآن‌های رایج ۶۰۴ صفحه‌ای (مصحف مدینه) است.</p></div>
<div data-pane="juz"${tab === 'juz' ? '' : ' hidden'}><div class="qf-juz">${Array.from({ length: 30 }, (_, i) => `<button type="button" data-qf-juz="${i + 1}"${w && w.juz === i + 1 ? ' class="cur"' : ''}>${toFa(i + 1)}</button>`).join('')}</div></div></div>`;
    const sel = box.querySelector('#qfSurah'), ay = box.querySelector('#qfAyah'), note = box.querySelector('#qfAyahNote');
    if (w) { sel.value = w.s; }
    const upd = () => { note.textContent = `سوره ${NAMES[sel.value - 1]}: ${toFa(ayahCount(+sel.value))} آیه`; };
    sel.onchange = () => { ay.value = ''; upd(); }; upd();
    if (!last) setTimeout(() => box.querySelector('#qfQ').focus({ preventScroll: true }), 300);
  }

  const num = v => { const n = parseInt(norm(v), 10); return Number.isFinite(n) ? n : NaN; };
  function onClick(e) {
    if (e.target === shade) return closeSheet();
    const box = shade.querySelector('.qf-box');
    const t = e.target.closest('[data-qf-tab]');
    if (t) { tab = t.dataset.qfTab; box.querySelectorAll('[data-qf-tab]').forEach(b => b.classList.toggle('on', b === t)); box.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; }); return; }
    const j = e.target.closest('[data-qf-juz]');
    if (j) return go(ix.juz[j.dataset.qfJuz - 1]);
    const r = e.target.closest('[data-qf-g]');
    if (r) return go(+r.dataset.qfG);
    const b = e.target.closest('[data-qf]'); if (!b) return;
    const a = b.dataset.qf;
    if (a === 'close') return closeSheet();
    if (a === 'resume') return go(load().g);
    if (a === 'elsewhere') { const q = box.querySelector('#qfQ'); q.scrollIntoView({ behavior: 'smooth', block: 'center' }); return q.focus({ preventScroll: true }); }
    if (a === 'text') return textSearch(b.dataset.q);
    if (a === 'go') {
      if (tab === 'page') {
        const p = num(box.querySelector('#qfPage').value);
        if (!(p >= 1 && p <= 604)) return toast('شماره صفحه باید از ۱ تا ۶۰۴ باشد.');
        return go(ix.page[p - 1]);
      }
      const s = +box.querySelector('#qfSurah').value, raw = box.querySelector('#qfAyah').value.trim(), n = raw ? num(raw) : 1;
      if (!(n >= 1 && n <= ayahCount(s))) return toast(`سوره ${NAMES[s - 1]} ${toFa(ayahCount(s))} آیه دارد.`);
      return go(ix.surah[s - 1] + n - 1);
    }
  }

  // ---------- جستجو ----------
  const hit = (g, title, small) => `<button type="button" data-qf-g="${g}"><b>${title}</b>${small ? `<small>${small}</small>` : ''}</button>`;
  const surahHit = (s, n) => n ? hit(ix.surah[s - 1] + n - 1, `سوره ${NAMES[s - 1]}، آیه ${toFa(n)}`, `صفحه ${toFa(where(ix.surah[s - 1] + n - 1).page)}`)
    : hit(ix.surah[s - 1], `سوره ${NAMES[s - 1]}`, `سوره ${toFa(s)} · ${toFa(ayahCount(s))} آیه · صفحه ${toFa(where(ix.surah[s - 1]).page)}`);
  function search(v) {
    const res = shade.querySelector('#qfRes'), q = norm(v);
    if (!q) { res.innerHTML = ''; return; }
    const out = [];
    let m;
    if ((m = q.match(/^(\d+)\s*[:：/\-.،,]\s*(\d+)$/))) { const s = +m[1], n = +m[2]; if (s >= 1 && s <= 114 && n >= 1 && n <= ayahCount(s)) out.push(surahHit(s, n)); }
    else if ((m = q.match(/^(?:صفحه|صفحۀ)\s*(\d+)$/))) { const p = +m[1]; if (p >= 1 && p <= 604) out.push(hit(ix.page[p - 1], `صفحه ${toFa(p)}`, placeText(ix.page[p - 1]))); }
    else if ((m = q.match(/^(?:جزء|جز|جزو)\s*(\d+)$/))) { const z = +m[1]; if (z >= 1 && z <= 30) out.push(hit(ix.juz[z - 1], `جزء ${toFa(z)}`, placeText(ix.juz[z - 1]))); }
    else if ((m = q.match(/^(\d+)$/))) {
      const n = +m[1];
      if (n >= 1 && n <= 114) out.push(surahHit(n));
      if (n >= 1 && n <= 604) out.push(hit(ix.page[n - 1], `صفحه ${toFa(n)}`, placeText(ix.page[n - 1])));
      if (n >= 1 && n <= 30) out.push(hit(ix.juz[n - 1], `جزء ${toFa(n)}`, placeText(ix.juz[n - 1])));
    } else {
      // نام سوره، و اگر عددی پس از آن آمده، شماره آیه
      m = q.match(/^(?:سوره\s*)?(.*?)\s*(\d+)?$/);
      const name = tight(m[1]).replace(/^ال(?=..)/, ''), n = m[2] ? +m[2] : 0;
      if (name) {
        const found = [];
        KEYS.forEach((ks, i) => { const r = ks.some(k => k === name) ? 0 : ks.some(k => k.startsWith(name)) ? 1 : name.length > 1 && ks.some(k => k.includes(name)) ? 2 : -1; if (r >= 0) found.push([r, i + 1]); });
        found.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 8).forEach(([, s]) => { if (!n) out.push(surahHit(s)); else if (n <= ayahCount(s)) out.push(surahHit(s, n)); });
      }
      if (q.length >= 2) out.push(`<button type="button" class="qf-more" data-qf="text" data-q="${esc(v.trim())}">جستجوی «${esc(v.trim())}» در متن و ترجمه آیه‌ها</button>`);
    }
    res.innerHTML = out.join('') || '<p class="qf-note">چیزی پیدا نشد. نام سوره، شماره صفحه یا جزء، یا «سوره:آیه» مثل ۲:۲۵۵ را بنویسید.</p>';
  }

  // متن عربی (از پیش با norm یکسان‌شده) و ترجمه مکارم همه آیه‌ها در یک فایل quran/search.json (ساخت با tools/search/build.js)،
  // به‌جای ۱۲۰ فایل quran/p؛ فقط بار اول جستجوی متن گرفته می‌شود.
  let all = null;
  async function allAyahs() {
    if (all) return all;
    const d = await fetch('quran/search.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); });
    if (d.ayahs.length !== ix.total) throw Error('search.json');
    let s = 0;
    return (all = d.ayahs.map(([ar, tr], g) => { while (s + 1 < ix.surah.length && ix.surah[s + 1] <= g) s++; return { g, s: s + 1, n: g - ix.surah[s] + 1, ar, tr, trn: norm(tr) }; }));
  }
  async function textSearch(v) {
    const res = shade.querySelector('#qfRes'), q = norm(v);
    res.innerHTML = '<p class="qf-note">در حال دریافت متن قرآن برای جستجو…</p>';
    let list;
    try { list = await allAyahs(); }
    catch { if (res.isConnected) res.innerHTML = '<p class="qf-note">دریافت متن انجام نشد. اینترنت را بررسی کنید.</p>'; return; }
    if (!res.isConnected) return;
    const found = list.filter(a => a.trn.includes(q) || a.ar.includes(q));
    // برجسته کردن کلمه در ترجمه؛ اگر عین کلمه (با نیم‌فاصله یا «ي» عربی و مانند آن) پیدا نشد، ابتدای ترجمه نشان داده می‌شود.
    const raw = v.trim();
    const snip = ({ tr }) => {
      const i = tr.indexOf(raw), n = raw.length;
      if (i < 0) return esc(tr.length > 140 ? tr.slice(0, 140) + '…' : tr);
      return (i > 50 ? '…' : '') + esc(tr.slice(Math.max(0, i - 50), i)) + '<mark>' + esc(tr.slice(i, i + n)) + '</mark>' + esc(tr.slice(i + n, i + n + 80)) + (i + n + 80 < tr.length ? '…' : '');
    };
    res.innerHTML = found.length ? `<p class="qf-note">${toFa(found.length)} آیه${found.length > 60 ? '؛ ۶۰ آیه اول' : ''}:</p>` + found.slice(0, 60).map(a => hit(a.g, `سوره ${NAMES[a.s - 1]}، آیه ${toFa(a.n)}`, snip(a))).join('')
      : `<p class="qf-note">آیه‌ای با «${esc(v)}» پیدا نشد.</p>`;
  }

  let toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;max-width:90vw;background:#1f1a14;color:#fff;padding:10px 18px;border:1px solid var(--gold);text-shadow:none;font-size:15px;text-align:center'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.display = 'block';
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.display = 'none'; }, 3500);
  }

  // ---------- منو ----------
  // در منو کنار دوره‌های قرآن (حزب‌خوانی، جزءخوانی، روزی یک صفحه) در chelleh.js؛
  // اگر آن فهرست نیامد (مثلاً بدون اینترنت)، همین‌جا جداگانه.
  function menuItem() {
    const last = load();
    const sub = last && ix ? `ادامه از ${placeText(last.g)}` : last ? 'ادامه از جایی که خواندید' : 'از هر سوره، آیه، صفحه یا جزء';
    return `<button type="button" class="sm-item" data-qf-open><span class="sm-ic">📖</span><span>قرآن آزاد<small>${esc(sub)}</small></span><span class="sm-go">‹</span></button>`;
  }
  window.siteMenu?.section({
    id: 'quranFree', order: 2,
    render(box) { if (!document.querySelector('.sm [data-qf-open]')) box.innerHTML = `<h3>قرآن</h3>${menuItem()}`; }
  });
  // فهرست قرآن همان لحظه زدن گرفته می‌شود؛ برگه پس از برگشت تاریخچه منو باز می‌شود (وگرنه history.back منو، برگه را هم می‌بست).
  document.addEventListener('click', e => {
    if (!e.target.closest('.sm [data-qf-open]')) return;
    getIx().catch(() => {});
    let done = false, t = 0;
    const go = () => { if (done) return; done = true; clearTimeout(t); removeEventListener('popstate', go); setTimeout(openSheet); };
    const wait = !!history.state?.sm;
    if (wait) addEventListener('popstate', go);
    window.siteMenu.close();
    t = setTimeout(go, wait ? 400 : 0);
  });
  if (load()) getIx().catch(() => {});
  // openAt(اندیس سراسری آیه): برای جستجوی سایت (search.js)
  window.quranFree = { open: openSheet, menuItem, names: NAMES, alias: ALIAS, openAt: async g => { await getIx(); openAt(g); } };

  // پیوند ?quran=free
  if (new URLSearchParams(location.search).get('quran') === 'free') {
    try { const u = new URL(location.href); u.searchParams.delete('quran'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    openSheet();
  }
})();
