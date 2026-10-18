// دسته «بیشتر» در ته منوی سه‌خط: جای بخش‌های جانبی سایت (فعلاً اذان و اقامه).
// بخش تازه: window.siteMore.add({ id, icon, title, sub, open }) ؛ گزینه‌ها به همان ترتیب اضافه شدن می‌آیند.
// اذان در همان خواننده متن چله‌ها باز می‌شود (window.chlRead در chelleh.js، متن chelleh/azan.json): عربی، ترجمه فارسی و زبان‌های دیگر، و صوت مؤذن‌های مختلف.
// پیوند ?azan=1 هم اذان را باز می‌کند.
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const items = [];
  function add(it) { const i = items.findIndex(x => x.id === it.id); if (i >= 0) items[i] = it; else items.push(it); window.siteMenu?.refresh(); }

  window.siteMenu?.section({
    id: 'more', order: 99,
    render(box) {
      if (!items.length) return;
      box.innerHTML = '<h3>بیشتر</h3>' + items.map(it => `<button type="button" class="sm-item" data-more="${esc(it.id)}"><span class="sm-ic">${it.icon}</span><span>${esc(it.title)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span><span class="sm-go">‹</span></button>`).join('');
      box.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { const it = items.find(x => x.id === b.dataset.more); window.siteMenu.close(); if (it) setTimeout(it.open, 280); });
    }
  });
  window.siteMore = { add };

  const openAzan = () => window.chlRead?.('azan');
  add({ id: 'azan', icon: '🕌', title: 'اذان و اقامه', sub: 'صوت مؤذن‌های مختلف، متن عربی و ترجمه', open: openAzan });

  const q = new URLSearchParams(location.search);
  if (q.get('azan')) {
    try { const u = new URL(location.href); u.searchParams.delete('azan'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    openAzan();
  }
})();
