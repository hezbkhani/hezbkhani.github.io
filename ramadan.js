// حالت رمضان (امکان ramadan در features.js): فقط وقتی روزِ روزه پیش رو در ماه قمری ۹ است، یک بلوک کوچک در کارت «امروز» (daily.js):
// پایان سحر (اذان صبح) و افطار (اذان مغرب) به افق شهر انتخابی با شمارش معکوس، دعای مخصوص همان روز (مفاتیح، books/mafatih/155.json)
// و در شب‌های نوزدهم، بیست‌ویکم و بیست‌وسوم پیوند اعمال شب قدر. تاریخ قمری همان daily.js است (ام‌القری با جابه‌جایی مدیر).
// «روزه پیش رو»: پس از اذان مغرب، روزه فردا؛ پس شب اول رمضان سحرش دیده می‌شود و پس از افطار روز آخر بلوک می‌رود.
(function () {
  const D = window.daily; if (!D) return;
  const { esc, toFa } = D, MIN = 6e4;
  // متن کامل دعاها فقط با لمس «دعای روز» گرفته می‌شود (۲۲ کیلوبایت)
  let open = false, duas = null, failed = false;
  // شماره‌های مفاتیح (books/mafatih/index.json): ۱۳۷ اعمال مشترک شب‌های قدر؛ ۱۳۸، ۱۳۹ و ۱۴۳ اعمال مخصوص هر شب
  const QADR = { 19: ['138', 'شب نوزدهم'], 21: ['139', 'شب بیست‌ویکم'], 23: ['143', 'شب بیست‌وسوم'] };
  const mf = () => !!window.mafatih?.openKey && !!window.features?.shown('mafatih');

  document.head.insertAdjacentHTML('beforeend', `<style>
#dlCard .dl-rm{margin:6px 0 0;padding:6px 10px 8px;background:var(--dl-soft);border:1px solid var(--dl-line);border-radius:var(--r)}
#dlCard .dl-rm-h{margin:0;text-align:center;font-weight:600;color:var(--dl-h);font-size:15px}
#dlCard .dl-rm-t{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 0;padding:0;list-style:none;text-align:center;line-height:1.5}
#dlCard .dl-rm-t li{padding:2px 4px;border-radius:var(--r)}
#dlCard .dl-rm-t li.on{box-shadow:inset 0 0 0 1px var(--gold);background:color-mix(in srgb,var(--dl-soft) 60%,#fff 40%)}
#dlCard .dl-rm-t span{display:block;font-size:13px;color:var(--dl-m)}
#dlCard .dl-rm-t b{display:block;font-size:18px;font-weight:600;color:var(--dl-h)}
#dlCard .dl-rm-cd{margin:4px 0 0;text-align:center;font-size:15px}
#dlCard .dl-rm-cd b{color:var(--dl-h)}
#dlCard .dl-rm .dl-act{margin-top:6px;background:transparent}
#dlCard .dl-rm-dua{margin:6px 0 0;padding:6px 4px 0;border-top:1px dashed var(--dl-line)}
#dlCard .dl-rm-dua p{margin:0 0 4px}
#dlCard .dl-rm-ar{font:normal 20px/2.1 ChlArabic,Vazirmatn,serif;direction:rtl;color:var(--dl-h)}
#dlCard .dl-rm-fa{font-size:14.5px;color:var(--dl-m)}
#dlCard .dl-rm-link{height:auto;min-height:44px;padding:0 4px;background:none;border:0;color:var(--dl-h);text-decoration:underline;font-weight:600;font-size:14.5px;cursor:pointer}
</style>`);

  function block({ L, iso, T, now }) {
    if (!window.features?.shown('ramadan')) return '';
    const eve = now >= D.round(T.mag), day = eve ? D.addDays(iso, 1) : iso, h = D.hijri(day);
    if (!h || h.m !== 9) return '';
    const F = eve ? D.times(day, L) : T, fajr = D.round(F.fajr), mag = D.round(F.mag);
    const suhoor = now < fajr; // تا اذان صبحِ روزه پیش رو، وقت سحر است
    // تا ۱۵ دقیقه پس از اذان مغرب «وقت افطار»، بعد شمارش تا پایان سحر فردا
    const cd = eve && now - D.round(T.mag) < 15 * MIN ? '<b>وقت افطار است</b>، قبول باشد'
      : suhoor ? `<b>${D.dur(fajr - now)}</b> تا پایان سحر` : `<b>${D.dur(mag - now)}</b> تا افطار`;
    const head = eve ? (h.d === 1 ? 'فردا اولین روز ماه مبارک رمضان' : `روزه فردا: روز ${toFa(h.d)} ماه رمضان`) : `ماه مبارک رمضان، روز ${toFa(h.d)}`;
    let html = `<div class="dl-rm"><p class="dl-rm-h">🌙 ${esc(head)}</p>
<ul class="dl-rm-t"><li${suhoor ? ' class="on"' : ''}><span>پایان سحر (اذان صبح)</span><b>${D.hm(fajr, L.tz)}</b></li><li${!suhoor ? ' class="on"' : ''}><span>افطار (اذان مغرب)</span><b>${D.hm(mag, L.tz)}</b></li></ul>
<p class="dl-rm-cd">${cd}</p>`;
    // شب قدر: از مغرب روز پیش تا اذان صبح همان روز
    const q = QADR[h.d];
    if (q && (eve || suhoor) && mf()) {
      html += `<button type="button" class="dl-act" data-go="mf:137"><span class="dl-ic" aria-hidden="true">✨</span><span><b>امشب ${q[1]}، شب قدر</b><small>اعمال شب‌های قدر در مفاتیح‌الجنان</small></span><span class="dl-go" aria-hidden="true">‹</span></button>
<button type="button" class="dl-rm-link" data-go="mf:${q[0]}">اعمال مخصوص ${q[1]}</button>`;
    }
    html += `<button type="button" class="dl-act dl-rm-btn" aria-expanded="${open}"><span class="dl-ic" aria-hidden="true">🤲</span><span><b>دعای روز ${toFa(h.d)} ماه رمضان</b><small>${open ? 'بستن' : 'متن کوتاه دعا و ترجمه'}</small></span><span class="dl-go" aria-hidden="true">${open ? '▴' : '▾'}</span></button>`;
    if (open) html += `<div class="dl-rm-dua">${duaHtml(h.d)}</div>`;
    return html + '</div>';
  }

  // متن مفاتیح «ی» و «ک» فارسی دارد که در قلم عربی سایت (ChlArabic) نیست و با دایره نقطه‌چین دیده می‌شود؛
  // مثل رسم‌الخط مصحف مدینه: «ی» میان کلمه «ي» و آخر کلمه «ى»، و «ک» → «ك».
  const arabic = t => String(t).replace(/ک/g, 'ك').replace(/ی(?=[\u064B-\u0652\u0670]*(?:[^\u0600-\u06FF]|$))/g, 'ى').replace(/ی/g, 'ي');
  function duaHtml(n) {
    if (failed) return '<p class="dl-rm-fa">متن دعا بارگذاری نشد. اینترنت را بررسی کنید.</p>';
    if (!duas) return '<p class="dl-rm-fa">لطفاً صبر کنید…</p>';
    // ساختار فایل: پیش از دعای هر روز یادداشت «روز …:» آمده؛ دعای روز n بخش ‎2n-1‎ است
    const s = duas[2 * n - 1], note = duas[2 * n - 2]?.note || '';
    if (!s?.ar || !/روز/.test(note)) return '<p class="dl-rm-fa">متن دعای امروز پیدا نشد.</p>';
    return `<p class="dl-rm-ar" lang="ar">${esc(arabic(s.ar))}</p>${s.fa ? `<p class="dl-rm-fa">${esc(s.fa)}</p>` : ''}${mf() ? '<button type="button" class="dl-rm-link" data-go="mf:155">دعاهای همه روزها، با صوت ‹</button>' : ''}`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('#dlCard .dl-rm-btn'); if (!b) return;
    open = !open; D.refresh();
    if (open && !duas && !failed) fetch('books/mafatih/155.json').then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then(j => { duas = Array.isArray(j.sections) ? j.sections : []; }).catch(() => { failed = true; }).finally(() => D.refresh());
  });
  D.block(block);
})();
