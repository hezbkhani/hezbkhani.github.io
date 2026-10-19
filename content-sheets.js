// برگه‌های محتوای content-plus.js؛ فقط با اولین باز کردن یکی از آن‌ها بار می‌شود (window.contentSheets[نام](…)).
// masoomin: چهارده معصوم (داده در content-plus.js)؛ qduas: دعاهای قرآنی (books/quran-duas.json)؛ namaz: متن و ترجمه نماز (books/namaz.json)؛
// friday: سوره‌های شب جمعه (مفاتیح، ۰۱۹)؛ sajdah: ذکر سجده تلاوت، روی قرآن‌خوان.
// متن‌ها و ترجمه آیه‌ها را tools/content/build_content.py از فایل‌های quran/p می‌سازد.
(function () {
  const C = window.contentPlus, toFa = C.toFa;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = t => String(t).replace(/\*/g, ''); // ترجمه Tanzil واژه‌های افزوده را میان * گذاشته است
  const css = `
.cps-shade{position:fixed;inset:0;z-index:47;background:#000a;display:flex;align-items:flex-end;justify-content:center}
.cps-shade.top{z-index:61}
.cps-box{width:100%;max-width:600px;max-height:94vh;overflow-y:auto;overscroll-behavior:contain;background:#fffaf0;color:var(--ink);text-shadow:none;border:2px solid var(--gold);border-bottom:0;border-radius:var(--r-panel) var(--r-panel) 0 0;padding:10px 16px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px #0007;animation:cpsup .25s ease;line-height:1.8}
@keyframes cpsup{from{transform:translateY(40px);opacity:.4}}
.cps-x{float:left;width:44px;height:44px;padding:0;background:transparent;border:0;color:var(--muted);font-size:24px}
.cps-box h2{margin:8px 0 0;text-align:center;font:normal 32px/1.6 SiteFont,Tahoma,serif;color:var(--deep)}
.cps-sub{margin:0 0 10px;text-align:center;color:var(--muted);font-size:15px}
.cps-card{margin:8px 0;background:#fff;border:1px solid var(--gold);border-radius:var(--r-card);overflow:hidden}
.cps-card>summary{display:flex;align-items:center;gap:10px;min-height:54px;padding:8px 14px;cursor:pointer;list-style:none;color:var(--deep)}
.cps-card>summary::-webkit-details-marker{display:none}
.cps-card>summary b{display:block;font-size:16.5px}
.cps-card>summary small{display:block;color:var(--muted);font-size:13.5px;font-weight:400}
.cps-card>summary span{flex:1;min-width:0}
.cps-card>summary i{flex:none;font-style:normal;color:var(--muted);transition:transform .2s}
.cps-card[open]>summary i{transform:rotate(180deg)}
.cps-card[open]>summary{border-bottom:1px solid var(--line)}
.cps-in{padding:8px 14px 12px}
.cps-dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0}
.cps-dl dt{color:var(--muted);font-size:14px}
.cps-dl dd{margin:0;font-weight:500}
.cps-note{margin:8px 0 0;font-size:14px;color:var(--muted)}
.cps-btns{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}
.cps-btns button{flex:1 1 auto;height:auto;min-height:44px;padding:6px 12px;background:var(--mint);color:var(--deep);border:1px solid var(--line);border-radius:var(--r);font-weight:600;font-size:14.5px;white-space:normal;line-height:1.5}
.cps-btns button:hover{background:var(--hover)}
.cps-h3{margin:16px 0 4px;font-size:17px;color:var(--deep)}
.cps-ar{margin:6px 0 2px;font:normal 23px/2.1 ChlArabic,"KFGQPC Uthmanic Script HAFS",Vazirmatn,serif;direction:rtl;color:var(--deep)}
.cps-fa{margin:0 0 6px;font-size:15px;color:var(--ink)}
.cps-meta{font-size:13.5px;color:var(--muted)}
.cps-src{margin:14px 0 0;font-size:13px;color:var(--muted)}
.cps-tbl{width:100%;border-collapse:collapse;margin:6px 0 4px;font-size:15px;text-align:center}
.cps-tbl th,.cps-tbl td{padding:4px;border:1px solid var(--line)}
.cps-tbl th{background:var(--mint);color:var(--deep);font-weight:600}
.cps-step{margin:10px 0;padding:8px 12px;background:#fff;border:1px solid var(--line);border-right:4px solid var(--gold);border-radius:var(--r)}
.cps-step h3{margin:0;font-size:16px;color:var(--deep)}
.cps-step .cps-sn{margin:2px 0 4px;font-size:14.5px;color:var(--muted)}
.cps-sura{display:flex;align-items:flex-start;gap:10px;width:100%;height:auto;min-height:48px;margin:6px 0;padding:8px 12px;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:var(--r);text-align:right;white-space:normal;line-height:1.7;font-weight:400}
.cps-sura:hover{background:var(--hover)}
.cps-sura b{flex:none;min-width:64px;color:var(--deep);font-size:16px}
.cps-sura span{flex:1;font-size:14.5px;color:var(--muted)}
body.cps-lock{overflow:hidden}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  let shade = null;
  function open(title, sub, html, top) {
    close();
    shade = document.createElement('div'); shade.className = 'cps-shade' + (top ? ' top' : '');
    shade.innerHTML = `<div class="cps-box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button type="button" class="cps-x" aria-label="بستن">✕</button><h2>${esc(title)}</h2>${sub ? `<p class="cps-sub">${esc(sub)}</p>` : ''}<div class="cps-body">${html}</div></div>`;
    shade.addEventListener('click', onClick);
    document.body.appendChild(shade); document.body.classList.add('cps-lock');
    shade.querySelector('.cps-x').focus({ preventScroll: true });
    return shade;
  }
  function close() { if (shade) { shade.remove(); shade = null; } document.body.classList.remove('cps-lock'); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shade && !document.querySelector('.qr.show,.cr.show')) close(); });
  function onClick(e) {
    if (e.target === shade || e.target.closest('.cps-x')) return close();
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.go) { if (shade.classList.contains('top')) close(); C.go(b.dataset.go); }
    else if (b.dataset.ay) { const [s, a, z] = b.dataset.ay.split(',').map(Number); C.openAyahs(s, a, z, b.dataset.t, b.dataset.sub); }
  }
  const getJson = (() => { const memo = {}; return f => memo[f] || (memo[f] = fetch(f).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { delete memo[f]; throw e; })); })();
  const failed = () => '<p class="cps-note">متن دریافت نشد. اینترنت را بررسی کنید و دوباره باز کنید.</p>';

  // ---------- چهارده معصوم ----------
  function masoomin() {
    const h = window.daily?.hijri?.(window.dailyInfo?.today?.() || ''), mfOn = !!window.features?.shown('mafatih');
    const html = C.M.map((p, i) => {
      const today = h && [p.born, p.died].some(x => x && x[0] === h.m && x[1] === h.d);
      const z = p.z.filter(([g]) => g.startsWith('rd:') || mfOn);
      return `<details class="cps-card"${today ? ' open' : ''}><summary><span><b>${toFa(i + 1)}. ${esc(p.name)}</b><small>${esc(p.laqab.split('، ')[0])} · ${p.alive ? 'ولادت ' + esc(C.dayLabel(p.born)) : `${esc(C.dayLabel(p.born))} تا ${esc(C.dayLabel(p.died))}`}${today ? ' · مناسبت امروز' : ''}</small></span><i aria-hidden="true">▾</i></summary>
<div class="cps-in"><dl class="cps-dl">${p.nameNote ? `<dt>نام</dt><dd>${esc(p.nameNote)}</dd>` : ''}<dt>کنیه</dt><dd>${esc(p.kunya)}</dd><dt>لقب</dt><dd>${esc(p.laqab)}</dd><dt>پدر</dt><dd>${esc(p.father)}</dd><dt>مادر</dt><dd>${esc(p.mother)}</dd>
<dt>ولادت</dt><dd>${esc(C.dayLabel(p.born))}، ${esc(p.born[2])}</dd>${p.died ? `<dt>${esc(p.dk || 'شهادت')}</dt><dd>${esc(C.dayLabel(p.died))}، ${esc(p.died[2])}</dd>` : `<dt>امامت</dt><dd>${esc(p.alive)}</dd>`}<dt>آرامگاه</dt><dd>${esc(p.rest || 'ـ')}</dd></dl>
${p.note ? `<p class="cps-note">${esc(p.note)}</p>` : ''}
<div class="cps-btns"><button type="button" data-go="bk:muntaha-${p.b}-${p.bf}">📜 زندگی‌نامه در منتهی‌الآمال</button>${z.map(([g, t]) => `<button type="button" data-go="${esc(g)}">🕌 ${esc(t)}</button>`).join('')}${p.book ? `<button type="button" data-go="cp:book-${p.book[0]}">📕 ${esc(p.book[1])}</button>` : ''}</div></div></details>`;
    }).join('');
    open('چهارده معصوم', 'نام، لقب و تاریخ‌ها با زندگی‌نامه و زیارت هر معصوم', html + '<p class="cps-src">زندگی‌نامه: منتهی‌الآمال (شیخ عباس قمی)؛ زیارت‌ها: مفاتیح‌الجنان. تاریخ‌ها مطابق تقویم رسمی ایران است و جایی که منتهی‌الآمال قول دیگری دارد، زیر همان معصوم آمده است.</p>');
  }

  // ---------- دعاهای قرآنی ----------
  async function qduas() {
    const sh = open('دعاهای قرآنی', 'دعاهای «ربّنا» و دعای پیامبران در قرآن کریم', '<p class="cps-note">در حال بارگذاری…</p>');
    let d; try { d = await getJson('books/quran-duas.json'); } catch { if (shade === sh) sh.querySelector('.cps-body').innerHTML = failed(); return; }
    if (shade !== sh) return;
    const name = s => window.quranReader?.name?.(s) || '';
    sh.querySelector('.cps-body').innerHTML = d.groups.map(g => `<h3 class="cps-h3">${esc(g.title)}</h3>${g.items.map(it => {
      const ref = `${name(it.s) ? 'سوره ' + name(it.s) + '، ' : ''}${it.a === it.b ? 'آیه ' + toFa(it.a) : `آیه‌های ${toFa(it.a)} تا ${toFa(it.b)}`}`;
      return `<details class="cps-card"><summary><span><b>${esc(it.t)}</b><small>${esc(it.who)}</small></span><i aria-hidden="true">▾</i></summary><div class="cps-in">${it.ar.map((a, i) => `<p class="cps-ar">${esc(a)}</p><p class="cps-fa">${esc(clean(it.fa[i]))}</p>`).join('')}
<p class="cps-meta">${esc(ref)} (شماره سوره ${toFa(it.s)})</p><div class="cps-btns"><button type="button" data-ay="${it.s},${it.a},${it.b}" data-t="${esc(it.t)}" data-sub="دعاهای قرآنی">📖 خواندن و شنیدن در قرآن‌خوان</button></div></div></details>`;
    }).join('')}`).join('') + `<p class="cps-src">${esc(d.src)}</p>`;
  }

  // ---------- متن و ترجمه نماز ----------
  async function namaz() {
    const sh = open('متن و ترجمه نماز', 'اذکار نماز روزانه به ترتیب، با معنی', '<p class="cps-note">در حال بارگذاری…</p>');
    let d; try { d = await getJson('books/namaz.json'); } catch { if (shade === sh) sh.querySelector('.cps-body').innerHTML = failed(); return; }
    if (shade !== sh) return;
    const link = k => k === 'zekr' ? (window.zekr?.open ? '<button type="button" data-go="zekr:">📿 ذکرشمار برای تسبیح حضرت زهرا (س)</button>' : '')
      : (window.features?.shown('mafatih') ? `<button type="button" data-go="${esc(k)}">📚 تعقیبات نماز در مفاتیح‌الجنان</button>` : '');
    sh.querySelector('.cps-body').innerHTML = `<table class="cps-tbl"><thead><tr><th>نماز</th><th>رکعت</th><th>حمد و سوره (برای مردان)</th></tr></thead><tbody>${d.rakat.map(([n, r, j]) => `<tr><td>${esc(n)}</td><td>${toFa(r)}</td><td>${esc(j)}</td></tr>`).join('')}</tbody></table>
<p class="cps-note">بانوان حمد و سوره همه نمازها را آهسته می‌خوانند. اذکار رکوع، سجده، تشهد و سلام در همه نمازها یکی است.</p>
${d.steps.map((s, i) => `<section class="cps-step"><h3>${toFa(i + 1)}. ${esc(s.t)}</h3>${s.note ? `<p class="cps-sn">${esc(s.note)}</p>` : ''}${(s.z || []).map(([a, f]) => `<p class="cps-ar">${esc(a)}</p><p class="cps-fa">${esc(clean(f))}</p>`).join('')}${s.links ? `<div class="cps-btns">${s.links.map(link).join('')}</div>` : ''}</section>`).join('')}
<p class="cps-src">${esc(d.src)}</p>`;
  }

  // ---------- سوره‌های شب جمعه ----------
  function friday() {
    const name = s => window.quranReader?.name?.(s) || `سوره ${toFa(s)}`;
    const NAMES = { 17: 'اسراء', 18: 'کهف', 26: 'شعراء', 27: 'نمل', 28: 'قصص', 32: 'سجده', 36: 'یس', 38: 'ص', 41: 'فصلت (حم سجده)', 44: 'دخان', 46: 'احقاف', 52: 'طور', 54: 'قمر (اقتربت)', 56: 'واقعه', 62: 'جمعه' };
    const html = `<p class="cps-note">مفاتیح‌الجنان در اعمال شب جمعه سفارش کرده این سوره‌ها خوانده شود و برای هر کدام فواید و ثواب بسیار روایت شده است؛ و اگر فرصت نشد، واقعه و سوره‌های پیش از آن در این فهرست انتخاب شود.</p>
${C.FRI.map(([s, v]) => `<button type="button" class="cps-sura" data-ay="${s},0,0" data-t="سوره ${esc(NAMES[s] || name(s))}" data-sub="سوره‌های شب جمعه"><b>${esc(NAMES[s] || name(s))}</b><span>${v ? esc(v) : 'خواندن در قرآن‌خوان'}</span></button>`).join('')}
<div class="cps-btns">${window.features?.shown('mafatih') ? '<button type="button" data-go="mf:019">📚 همه اعمال شب جمعه در مفاتیح‌الجنان</button>' : ''}</div>
<p class="cps-src">منبع فهرست و روایت‌ها: مفاتیح‌الجنان، اعمال شب جمعه (ترجمه استاد حسین انصاریان)، که از امام صادق و امام باقر (ع) نقل کرده است.</p>`;
    open('سوره‌های شب جمعه', 'به سفارش مفاتیح‌الجنان', html);
  }

  // ---------- ذکر سجده تلاوت ----------
  function sajdah() {
    open('سجده آیه‌های قرآن', '', `<p class="cps-note">در قرآن پانزده آیه سجده دارد. بنا بر فقه شیعه سجده در چهار آیه واجب است: سجده ۱۵، فصلت ۳۷، نجم ۶۲ و علق ۱۹؛ هر کس یکی از این آیه‌ها را بخواند یا به آن گوش دهد، پس از پایان آیه باید بی‌درنگ سجده کند. در یازده آیه دیگر سجده مستحب است.</p>
<p class="cps-note">در این سجده ذکر واجب نیست و گفتن هر ذکری کافی است؛ مستحب است این ذکر گفته شود:</p>
<p class="cps-ar">لا إِلٰهَ إِلَّا اللهُ حَقّاً حَقّاً، لا إِلٰهَ إِلَّا اللهُ إيماناً وَتَصْديقاً، لا إِلٰهَ إِلَّا اللهُ عُبُودِيَّةً وَرِقّاً، سَجَدْتُ لَكَ يا رَبِّ تَعَبُّداً وَرِقّاً، لا مُسْتَنْكِفاً وَلا مُسْتَكْبِراً، بَلْ أَنَا عَبْدٌ ذَليلٌ ضَعيفٌ خائِفٌ مُسْتَجيرٌ</p>
<p class="cps-fa">معبودی جز خدا نیست، به حق و راستی؛ معبودی جز خدا نیست، از روی ایمان و باور؛ معبودی جز خدا نیست، از روی بندگی و فرمان‌برداری. پروردگارا! از روی بندگی و فرمان‌برداری برایت سجده کردم، نه با سرپیچی و نه با خودبزرگ‌بینی؛ بلکه من بنده‌ای خوار و ناتوان و ترسان و پناه‌جویم.</p>
<p class="cps-note">در مصحف مدینه نشان ۩ سوره فصلت روی آیه ۳۸ است (جای سجده نزد اهل سنت)؛ بنا بر فتوای مراجع شیعه سجده با پایان آیه ۳۷ واجب می‌شود.</p>
<p class="cps-src">بر پایه رساله‌های توضیح‌المسائل مراجع شیعه (احکام سجده‌های واجب قرآن). برای جزئیات به رساله مرجع تقلید خود مراجعه کنید.</p>`, true);
  }

  // پیوند کتاب از برگه چهارده معصوم (نهج‌البلاغه و صحیفه)
  const bookSheet = k => { close(); window.books?.open(k); };
  window.contentSheets = { masoomin, qduas, namaz, friday, sajdah, 'book-nahj': () => bookSheet('nahj'), 'book-sahifa': () => bookSheet('sahifa'), close };
})();
