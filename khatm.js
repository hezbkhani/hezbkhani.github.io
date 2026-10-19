// ختم گروهی قرآن جزء به جزء (شناسه امکان: khatm). این فایل کوچک همیشه بارگذاری می‌شود و فقط گزینه منو، پیوند ?khatm=<شناسه>
// و فهرست ختم‌های باز را نگه می‌دارد؛ برگه ختم و کارت مدیر در khatm-app.js است که فقط با اولین استفاده بارگذاری می‌شود.
// شناسایی هر نفر با کد تصادفی گوشی (localStorage: khDevice، مثل ذکرشمار) و اگر وارد حساب شده باشد، با حسابش هم.
// جدول‌ها و تابع‌ها در backend/supabase/khatm.sql؛ تا اجرا نشده، چیزی در منو دیده نمی‌شود (جز در ‎#admin‎).
(function () {
  const cfg = window.APP_CONFIG || {};
  const ls = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const shown = () => !!window.features?.shown('khatm');
  const admin = () => location.hash === '#admin';
  const fa = n => Number(n).toLocaleString('fa-IR');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const device = () => {
    let d = ls.get('khDevice', '');
    if (!d) { const a = new Uint8Array(18); crypto.getRandomValues(a); d = 'kh' + [...a].map(x => x.toString(16).padStart(2, '0')).join(''); ls.set('khDevice', d); }
    return d;
  };
  // ختم‌هایی که این گوشی می‌شناسد (ساخته، باز کرده یا جزءی برداشته)، تا ختم‌های پیوندی هم در منو بمانند.
  const known = () => (ls.get('khatmIds', []) || []).filter(x => typeof x === 'string').slice(0, 20);
  const remember = id => { const k = known().filter(x => x !== id); k.unshift(id); ls.set('khatmIds', k.slice(0, 20)); };
  const forget = id => ls.set('khatmIds', known().filter(x => x !== id));

  // اگر وارد حساب کاربری شده، با همان نشست (تا جزءهایش روی گوشی دیگرش هم «مال من» باشد)؛ وگرنه ناشناس.
  const token = () => { const s = ls.get('userSession', null); return s && s.access_token && s.expires_at - Date.now() / 1000 > 60 ? s.access_token : cfg.SUPABASE_ANON_KEY; };
  async function rpc(fn, args) {
    if (!cfg.SUPABASE_URL) throw Object.assign(Error('net'), { code: 'net' });
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12000);
    let r;
    try { r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', cache: 'no-store', signal: ac.signal, headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ p_device: device() }, args)) }); }
    catch { throw Object.assign(Error('net'), { code: 'net' }); }
    finally { clearTimeout(t); }
    const d = await r.json().catch(() => null);
    if (r.ok) return d;
    const code = r.status === 404 || d?.code === 'PGRST202' ? 'nosql' : r.status === 401 ? 'auth' : d?.message || 'err';
    if (code === 'nosql') ls.set('khatmNoSql', Date.now());
    throw Object.assign(Error(code), { code });
  }

  // ---------- فهرست ختم‌ها (برای منو) ----------
  let rows = ls.get('khatmList', []) || [], loading = null;
  const open = () => rows.filter(k => k.status === 'open');
  function refresh() {
    if (!shown() || loading) return loading;
    // اگر تا یک ساعت پیش جدول نبود، دوباره پرسیده نمی‌شود (جز در ‎#admin‎).
    if (!admin() && Date.now() - (ls.get('khatmNoSql', 0) || 0) < 36e5) return Promise.resolve(rows);
    return (loading = rpc('khatm_list', { p_ids: known() })
      .then(d => { rows = Array.isArray(d) ? d : []; ls.set('khatmList', rows); ls.set('khatmNoSql', 0); window.siteMenu?.refresh(); return rows; })
      .catch(e => { if (e.code === 'nosql') { rows = []; ls.set('khatmList', []); window.siteMenu?.refresh(); } return rows; })
      .finally(() => { loading = null; }));
  }

  // ---------- بارگذاری برگه ختم (khatm-app.js) فقط هنگام نیاز ----------
  let app = null;
  const load = () => app || (app = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'khatm-app.js?v=2';
    s.onload = () => (window.khatmApp ? res(window.khatmApp) : rej(Error('load')));
    s.onerror = () => { app = null; rej(Error('load')); };
    document.body.appendChild(s);
  }));
  const openSheet = id => load().then(a => a.open(id), () => alert('بارگذاری ختم گروهی انجام نشد. اینترنت را بررسی کنید.'));

  // ---------- منوی ☰ ----------
  function sub() {
    const o = open();
    if (o.length === 1) { const k = o[0]; return k.done >= 30 ? `«${k.title}» کامل شد` : `«${k.title}»: ${fa(k.done)} از ۳۰ جزء خوانده شد`; }
    if (o.length > 1) return `${fa(o.length)} ختم باز؛ یک جزء بردارید`;
    return 'هر کس یک جزء برمی‌دارد تا قرآن با هم ختم شود';
  }
  window.siteMenu?.section({
    id: 'khatm', order: 2.2,
    render(box) {
      if (!shown() || (!open().length && !admin())) return;
      box.innerHTML = `<h3>ختم قرآن</h3><button type="button" class="sm-item" data-kh-open><span class="sm-ic">📗</span><span>ختم گروهی قرآن<small>${esc(sub())}</small></span><span class="sm-go">‹</span></button>`;
      box.querySelector('[data-kh-open]').onclick = () => { window.siteMenu.close(); setTimeout(() => openSheet(open().length === 1 ? open()[0].id : null), 280); };
    }
  });

  // ---------- پیوند ?khatm=<شناسه> ----------
  let linkId = (() => { try { return new URLSearchParams(location.search).get('khatm'); } catch { return null; } })();
  if (linkId && !/^[a-z0-9]{6,20}$/.test(linkId)) linkId = null;
  function fromLink() {
    if (!linkId || !shown()) return;
    const id = linkId; linkId = null;
    try { const u = new URL(location.href); u.searchParams.delete('khatm'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch {}
    remember(id); openSheet(id);
  }

  let booted = false;
  const boot = () => { if (shown() && !booted) { booted = true; setTimeout(refresh, 3000); } fromLink(); };
  document.addEventListener('features:changed', () => { boot(); window.siteMenu?.refresh(); if (!shown()) window.khatmApp?.close(); });
  boot();

  // کارت مدیر در زبانه تنظیمات (فقط در ‎#admin‎ بارگذاری می‌شود).
  document.addEventListener('admin:tab', e => { if (e.detail === 'settings') load().then(a => a.adminCard(), () => {}); });
  const p0 = document.getElementById('pane-settings'); if (p0 && !p0.hidden) load().then(a => a.adminCard(), () => {});

  window.khatm = { open: openSheet, rpc, device, known, remember, forget, refresh, get rows() { return rows; }, shown };
})();
