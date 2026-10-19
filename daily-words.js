// کارت «آیه و سخن روز» در صفحه اول، زیر کارت «امروز» (daily.js). دو امکان جدا در features.js:
//  ayahday: هر روز یکی از آیه‌های فهرست AYAT (آیه‌های کوتاه و پرکاربرد، از جمله آیه‌های ولایت، مودت و صلوات) با ترجمه آیت‌الله مکارم شیرازی.
//           متن از همان فایل‌های قرآن‌خوان (quran/p/<حزب>.json) خوانده می‌شود؛ «خواندن در قرآن» صفحه همان آیه را باز می‌کند.
//  hadithday: هر روز یکی از ۶۰۰ سخن گزیده غررالحکم (books/ghurar/h/<بخش>.json، ترجمه دارالحدیث)؛ «بیشتر» همان بخش کتاب را باز می‌کند.
// روز به وقت شهر انتخابی کارت «امروز» حساب می‌شود؛ پس همه در یک روز همان آیه و سخن را می‌بینند. ✕ کارت در hide-x.js است.
(function () {
  const shown = id => !!window.features?.shown(id);
  const fa = '۰۱۲۳۴۵۶۷۸۹', toFa = x => String(x).replace(/\d/g, d => fa[d]);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AYAT = ('2:45 2:152 2:153 2:156 2:186 2:201 3:8 3:31 3:92 3:104 3:139 3:173 3:200 5:55 6:162 7:23 7:56 9:51 10:62 12:87 13:11 13:28 13:29 '
    + '14:7 14:41 15:49 16:97 16:128 17:9 17:23 17:80 17:82 18:46 20:132 21:87 21:107 23:118 25:63 25:74 28:24 29:2 29:45 29:69 31:17 33:41 33:56 '
    + '35:15 39:10 39:53 40:60 42:23 47:7 49:10 49:13 50:16 51:56 55:13 55:60 57:16 59:18 64:16 65:3 67:2 76:8 89:27 93:5 93:11 94:5 97:3 2:110 '
    + '3:159 4:58 7:204 11:115 8:46 16:90 39:9').split(' ').map(r => r.split(':').map(Number));
  // تعداد سخن‌های هر بخش غررالحکم (books/ghurar/h/001…014.json)؛ جمع ۶۰۰
  const GH = [93, 102, 37, 25, 6, 18, 26, 26, 26, 16, 54, 104, 6, 61];
  const GH_ALL = GH.reduce((a, b) => a + b, 0);

  const css = `
#dwCard{display:block;margin:6px 0 16px;padding:10px 14px;background:var(--cream);color:var(--ink);text-shadow:none;border:1px solid var(--gold);border-radius:var(--r-card);line-height:1.8;font-size:16px}
html[data-bg] #dwCard{background:var(--t-paper);color:var(--t-ink);padding:12px 34px;margin:30px 24px}
#dwCard[hidden]{display:none}
#dwCard .dw-it+.dw-it{margin-top:10px;padding-top:10px;border-top:1px dashed var(--t-line,var(--line))}
#dwCard h3{margin:0 0 4px;font-size:14.5px;font-weight:700;color:var(--t-head,var(--deep));text-align:center}
#dwCard .dw-ar{margin:0;font:400 22px/2 QuranHafs,'Traditional Arabic',serif;text-align:center;color:var(--t-head,var(--deep))}
#dwCard .dw-ar.h{font:500 19px/2 Vazirmatn,Tahoma,sans-serif}
#dwCard .dw-fa{margin:4px 0 0;font-size:15.5px;text-align:center}
#dwCard .dw-src{display:block;margin-top:2px;font-size:13px;color:var(--t-ink2,var(--muted));text-align:center}
#dwCard .dw-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin-top:6px}
#dwCard .dw-btns button{height:auto;min-height:40px;padding:2px 12px;background:transparent!important;color:var(--t-head,var(--deep))!important;filter:none!important;border:1px solid var(--t-line,var(--line));border-radius:var(--pill);font-size:14px;font-weight:600}
#dwCard .dw-btns button:hover{background:var(--hover)!important}
#dwCard .dw-wait{margin:0;text-align:center;font-size:14px;color:var(--t-ink2,var(--muted))}
@media(max-width:600px){html[data-bg] #dwCard{margin:26px 18px;padding:10px 20px}#dwCard .dw-ar{font-size:20px}}`;
  { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }

  // روز امروز (به وقت شهر کارت «امروز»)، و شماره روز از ۱۹۷۰ برای چرخش
  const today = () => { try { return window.dailyInfo?.today() || new Date().toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); } };
  const dayNo = iso => Math.floor(Date.parse(iso + 'T00:00:00Z') / 864e5);

  const cache = {};
  const getJson = u => cache[u] || (cache[u] = fetch(u).then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).catch(e => { delete cache[u]; throw e; }));
  const lastLE = (a, g) => { let i = 0; while (i + 1 < a.length && a[i + 1] <= g) i++; return i; };

  async function ayah(n) {
    const [s, v] = AYAT[n % AYAT.length], ix = await getJson('quran/index.json');
    const g = ix.surah[s - 1] + v - 1, p = lastLE(ix.portion, g);
    const d = await getJson(`quran/p/${String(p + 1).padStart(3, '0')}.json`);
    const seg = d.segments.find(x => x.s === s && x.from <= v && v < x.from + x.ayahs.length);
    if (!seg) throw Error('no ayah');
    const [ar, tr] = seg.ayahs[v - seg.from];
    return { s, v, g, ar, tr, name: seg.fa, page: lastLE(ix.page, g) + 1, ix };
  }
  async function hadith(n) {
    let k = (n * 7) % GH_ALL, part = 0; // گام ۷: هر روز از بخشی دیگر، و پس از ۶۰۰ روز همه دیده شده‌اند
    while (k >= GH[part]) k -= GH[part++];
    const d = await getJson(`books/ghurar/h/${String(part + 1).padStart(3, '0')}.json`);
    const x = d.sections.filter(s => s.ar)[k] || d.sections[0];
    return { part: part + 1, ar: String(x.ar).replace(/\s*[؛;]\s*$/, ''), tr: x.tr?.dh || x.fa || '', note: x.note || 'غررالحکم' };
  }

  let card = null, data = {}, dayKey = '';
  function place() {
    if (card?.isConnected) return card;
    const intro = document.getElementById('introPanel'); if (!intro) return null;
    card = document.createElement('section'); card.id = 'dwCard'; card.setAttribute('aria-label', 'آیه و سخن روز');
    const after = document.getElementById('dlCard') || intro.querySelector('.intro-head') || intro.querySelector(':scope > .tagline') || intro.querySelector(':scope > h2');
    if (intro.querySelector('.intro-head')) { card.className = 'bgx-frame bgx-in'; setTimeout(() => card.classList.add('bgx-done'), 1300); }
    after?.after(card);
    card.addEventListener('click', onClick);
    return card;
  }
  async function render() {
    const A = shown('ayahday'), H = shown('hadithday');
    if (!A && !H) { card?.remove(); return; }
    if (!place()) return;
    // کارت «امروز» گاهی بعد از این کارت دوباره ساخته می‌شود؛ این کارت همیشه زیر آن می‌ماند.
    const dl = document.getElementById('dlCard'); if (dl && dl.nextElementSibling !== card) dl.after(card);
    const iso = today(), n = dayNo(iso);
    if (dayKey !== iso) { dayKey = iso; data = {}; }
    if (A && !data.a) data.a = ayah(n).catch(() => null);
    if (H && !data.h) data.h = hadith(n).catch(() => null);
    if (!card.innerHTML) card.innerHTML = '<p class="dw-wait">…</p>';
    const [a, h] = await Promise.all([A ? data.a : null, H ? data.h : null]);
    if (!card.isConnected) return;
    const share = shown('share') && window.shareCard, copy = shown('copy');
    let html = '';
    if (a) html += `<div class="dw-it"><h3>📖 آیه روز</h3><p class="dw-ar" lang="ar" dir="rtl">${esc(a.ar)}</p><p class="dw-fa">${esc(a.tr)}</p><small class="dw-src">سوره ${esc(a.name)}، آیه ${toFa(a.v)} · ترجمه آیت‌الله مکارم شیرازی</small>
<div class="dw-btns"><button type="button" data-dw="read">خواندن در قرآن</button>${share ? '<button type="button" data-dw="img-a">🖼️ تصویر</button>' : ''}${copy ? '<button type="button" data-dw="cp-a">📋 کپی</button>' : ''}</div></div>`;
    if (h) html += `<div class="dw-it"><h3>💬 سخن روز</h3><p class="dw-ar h" lang="ar" dir="rtl">${esc(h.ar)}</p><p class="dw-fa">${esc(h.tr)}</p><small class="dw-src">امیرالمؤمنین علی (ع)، ${esc(h.note)}</small>
<div class="dw-btns">${window.books?.read ? '<button type="button" data-dw="more">سخنان بیشتر</button>' : ''}${share ? '<button type="button" data-dw="img-h">🖼️ تصویر</button>' : ''}${copy ? '<button type="button" data-dw="cp-h">📋 کپی</button>' : ''}</div></div>`;
    if (!html) { card.remove(); return; }
    if (card.innerHTML !== html) card.innerHTML = html;
  }
  function toast(t) {
    const d = document.createElement('div'); d.className = 'ft-toast'; d.setAttribute('role', 'status'); d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
  }
  async function copy(t) {
    try { await navigator.clipboard.writeText(t); toast('📋 متن کپی شد'); } catch { toast('کپی انجام نشد'); }
  }
  async function onClick(e) {
    const b = e.target.closest('[data-dw]'); if (!b) return;
    const x = b.dataset.dw, a = await data.a, h = await data.h;
    if (x === 'read' && a && window.quranReader) {
      const ix = a.ix, p = a.page, from = ix.page[p - 1], to = p < 604 ? ix.page[p] : ix.total;
      window.quranReader.openRange({ title: `سوره ${a.name}، آیه ${toFa(a.v)}`, sub: `آیه روز · صفحه ${toFa(p)} قرآن`, from, to, focus: a.g, endText: `پایان صفحه ${toFa(p)}` });
    }
    if (x === 'more' && h) window.books.read('ghurar', 'h', h.part);
    if (x === 'img-a' && a) window.shareCard({ ar: a.ar, fa: a.tr, title: `سوره ${a.name}، آیه ${toFa(a.v)}`, file: 'nooran-ayah' });
    if (x === 'img-h' && h) window.shareCard({ ar: h.ar, fa: h.tr, title: `امیرالمؤمنین علی (ع)، ${h.note}`, file: 'nooran-hadith' });
    if (x === 'cp-a' && a) copy(`${a.ar}\n\n${a.tr}\n\n(سوره ${a.name}، آیه ${toFa(a.v)}) · نوران`);
    if (x === 'cp-h' && h) copy(`${h.ar}\n\n${h.tr}\n\n(امیرالمؤمنین علی (ع)، ${h.note}) · نوران`);
  }
  ['features:changed', 'settings:changed'].forEach(ev => document.addEventListener(ev, render));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && dayKey && dayKey !== today()) render(); });
  // کارت «امروز» با هر بار ساختن دوباره ممکن است جابه‌جا شود؛ پس از بار شدن صفحه یک بار دیگر جای کارت درست می‌شود.
  render(); setTimeout(render, 1500);
})();
