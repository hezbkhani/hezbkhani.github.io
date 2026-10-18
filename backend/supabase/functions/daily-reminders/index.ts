// اعلان‌های سایت (Web Push). Supabase Cron هر ۱۵ دقیقه با slot=auto صدا می‌زند و این تابع بر اساس ساعت‌ها و متن‌هایی که مدیر
// در «مدیریت › اعلان‌ها» گذاشته (site_settings.notify، با پیش‌فرض‌های notifications.json سایت) تصمیم می‌گیرد چه بفرستد:
// سهم امروز و یادآوری گزارش حزب‌خوانی، برنامه امروز و یادآوری چله و دوره‌های قرآن، شروع از فردا، رسیدن جا از فهرست رزرو،
// اعلام شناسه، خبر تازه دوره، و با اذان: نماز امام جواد (ع) چهارشنبه‌ها، ختم یاسین حضرت ام‌البنین (س) شب‌های جمعه و ادعیه (سمات، کمیل، توسل). هیچ اعلانی دو بار نمی‌رود (جدول push_sent).
// slot=morning و slot=evening (زمان‌بندی قدیمی ساعت ۱۰ و ۱۹) هم کار می‌کند.
// اعلان اذان شخصی (push_azan، azan.ts): با slot=auto، و با slot=azan (زمان‌بندی سبک هر دقیقه، فقط همین) دقیق‌تر.
// slot=test: «ارسال آزمایشی» از سایت؛ برنامه امروزِ همان یک دستگاه (endpoint در بدنه) را همین حالا می‌فرستد.
// slot=sample و slot=broadcast: فقط مدیر (با توکن ورود مدیر): نمونه یک نوع اعلان به گوشی خودش، یا پیام همگانی.
// Secrets لازم: VAPID_PUBLIC_KEY، VAPID_PRIVATE_KEY، CRON_SECRET. اختیاری: SITE_URL (پیش‌فرض https://hezbkhani.github.io).
// SUPABASE_URL، SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY را خود Supabase می‌گذارد.
// این تابع باید با JWT verification خاموش deploy شود؛ اجازه با x-cron-secret یا توکن مدیر بررسی می‌شود.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { type Group, isoToUtc, parseGroupText, portionFor, toFa } from './reminder.ts'
import { type AzanRow, LATE_MIN, azanMsg, azanPersonalDue } from './azan.ts'
import { type Item, type Msg, type Prefs, type Settings, azanDue, compose, dueTypes, forDevice, mergeSettings, tehranMinutes } from './notify.ts'

const env = (k: string) => Deno.env.get(k) || ''
const SITE_URL = (env('SITE_URL') || 'https://hezbkhani.github.io').replace(/\/$/, '')
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const makeDb = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
type Db = ReturnType<typeof makeDb>
type Sub = { endpoint: string; p256dh: string; auth: string; group_number: number | null; participant_id: number | null }

// همه ردیف‌ها، هر بار ۱۰۰۰ تا (سقف هر درخواست Supabase).
// deno-lint-ignore no-explicit-any
async function all<T>(q: () => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q().range(from, from + 999)
    if (error) throw Error(error.message)
    out.push(...data)
    if (data.length < 1000) return out
  }
}

async function loadGroups(db: Db): Promise<Group[]> {
  const setting = await db.from('site_settings').select('value').eq('key', 'groups_source').maybeSingle()
  if ((setting.data?.value?.source || 'db') !== 'files') {
    const { data, error } = await db.from('site_groups').select('number,name,start_date,names').eq('visible', true)
    const list = (error ? [] : data || []).filter(g => g.names?.length === 120)
    if (list.length) return list.map(g => ({ number: g.number, name: g.name, start: isoToUtc(g.start_date), names: g.names }))
  }
  const list = await fetch(`${SITE_URL}/groups/index.json`, { cache: 'no-store' }).then(r => r.json())
  const out = await Promise.all(list.map(async (e: { number?: number; name?: string } | number) => {
    const n = +((e as { number?: number }).number ?? e), label = (e as { name?: string }).name
    const r = await fetch(`${SITE_URL}/groups/group-${n}.txt`, { cache: 'no-store' })
    return r.ok ? parseGroupText(await r.text(), n, label) : null
  }))
  return out.filter(Boolean) as Group[]
}

async function loadSettings(db: Db): Promise<Settings> {
  const [defaults, saved] = await Promise.all([
    fetch(`${SITE_URL}/notifications.json`, { cache: 'no-store' }).then(r => r.json()),
    db.from('site_settings').select('value').eq('key', 'notify').maybeSingle()
  ])
  return mergeSettings(defaults, saved.data?.value)
}

// مدیر بودنِ فرستنده با توکن ورود خودش بررسی می‌شود (همان is_site_admin سایت).
async function isAdmin(req: Request) {
  const auth = req.headers.get('authorization') || ''
  if (!/^Bearer .{20,}/.test(auth)) return false
  const user = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false }, global: { headers: { Authorization: auth } } })
  const { data } = await user.rpc('is_site_admin')
  return data === true
}

type Stats = Record<string, number | string>
async function sendPush(db: Db, stats: Stats, s: Sub, msg: Msg, ttl: number) {
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: ttl, urgency: 'high' })
    stats.sent = +stats.sent + 1
    return true
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode
    // اشتراک منقضی یا لغوشده در مرورگر: حذف.
    if (code === 404 || code === 410) { stats.removed = +stats.removed + 1; await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint) }
    else { stats.failed = +stats.failed + 1; console.error('push failed', code, (e as Error).message) }
    return false
  }
}

// اذان شخصی: هر گوشی به افق شهر خودش (azan.ts). کلید هر اذان پیش از ارسال در push_sent ثبت می‌شود (ignoreDuplicates)
// تا دو اجرای هم‌زمان (auto و azan) آن را دو بار نفرستند؛ اگر ارسال نشد (جز اشتراک منقضی)، کلید برداشته می‌شود تا اجرای بعد بفرستد.
async function personalAzan(db: Db, stats: Stats) {
  type Row = AzanRow & { push_subscriptions: { p256dh: string; auth: string } | null }
  let rows: Row[]
  try { rows = await all<Row>(() => db.from('push_azan').select('endpoint,lat,lng,tz,prayers,push_subscriptions(p256dh,auth)').order('endpoint')) }
  catch (e) { console.error('push_azan', (e as Error).message); return } // azan.sql هنوز اجرا نشده
  const now = Date.now(), due = azanPersonalDue(rows, now)
  if (!due.length) return
  const keysOf = new Map(rows.map(r => [r.endpoint, r.push_subscriptions]))
  const claimed = new Set<string>()
  for (let i = 0; i < due.length; i += 500) {
    const { data, error } = await db.from('push_sent').upsert(due.slice(i, i + 500).map(d => ({ endpoint: d.endpoint, key: d.key })), { onConflict: 'endpoint,key', ignoreDuplicates: true }).select('endpoint,key')
    if (error) { console.error('push_sent', error.message); return }
    for (const r of data || []) claimed.add(r.endpoint + ' ' + r.key)
  }
  const jobs = due.filter(d => claimed.has(d.endpoint + ' ' + d.key) && keysOf.get(d.endpoint)).map(d => async () => {
    const k = keysOf.get(d.endpoint)!, ttl = Math.max(60, Math.round((d.at + LATE_MIN * 6e4 - now) / 1000))
    const ok = await sendPush(db, stats, { endpoint: d.endpoint, p256dh: k.p256dh, auth: k.auth, group_number: null, participant_id: null }, azanMsg(d, SITE_URL), ttl)
    if (!ok) await db.from('push_sent').delete().eq('endpoint', d.endpoint).eq('key', d.key)
  })
  for (let i = 0; i < jobs.length; i += 25) await Promise.all(jobs.slice(i, i + 25).map(f => f()))
  stats.azan_personal = jobs.length
}

Deno.serve(req => handle(req).catch(e => { console.error(e); return json({ error: String((e as Error).message || e) }, 500) }))

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const slot = new URL(req.url).searchParams.get('slot') || ''
  if (!['auto', 'azan', 'morning', 'evening', 'test', 'sample', 'broadcast'].includes(slot)) return json({ error: 'bad_slot' }, 400)
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  if (['auto', 'azan', 'morning', 'evening'].includes(slot) && (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET'))) return json({ error: 'unauthorized' }, 401)
  if (['sample', 'broadcast'].includes(slot) && !(await isAdmin(req))) return json({ error: 'not_admin' }, 403)

  webpush.setVapidDetails('https://hezbkhani.github.io', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
  const db = makeDb()
  const stats: Stats = { slot, sent: 0, removed: 0, failed: 0 }
  // ---------- اذان شخصی: فقط همین، بی‌نیاز به تنظیمات و بقیه اعلان‌ها ----------
  if (slot === 'azan') {
    await personalAzan(db, stats)
    if (+stats.sent || +stats.failed || +stats.removed) await db.from('push_runs').insert({ slot, stats })
    return json(stats)
  }
  const settings = await loadSettings(db)
  const send = (s: Sub, msg: Msg, ttl: number) => sendPush(db, stats, s, msg, ttl)
  if (slot === 'auto') await personalAzan(db, stats)

  // ---------- پیام همگانی مدیر ----------
  if (slot === 'broadcast') {
    const title = String(body.title || '').trim().slice(0, 80), text = String(body.body || '').trim().slice(0, 500)
    if (!title || !text) return json({ error: 'empty' }, 400)
    let q = db.from('push_subscriptions').select('endpoint,p256dh,auth,group_number,participant_id,chl_codes,reg_codes')
    if (body.audience === 'hezb') q = q.not('group_number', 'is', null)
    if (body.audience === 'chl') q = q.neq('chl_codes', '{}')
    const { data: subs, error } = await q
    if (error) return json({ error: error.message }, 500)
    const msg = { title, body: text, url: `${SITE_URL}/`, tag: 'broadcast:' + Date.now() }
    for (let i = 0; i < subs.length; i += 25) await Promise.all(subs.slice(i, i + 25).map(s => send(s, msg, 24 * 3600)))
    stats.devices = subs.length
    await db.from('push_runs').insert({ slot, stats: { ...stats, title } })
    return json(stats)
  }

  // ---------- نمونه یک نوع اعلان برای گوشی مدیر ----------
  if (slot === 'sample') {
    const t = settings.types[body.type]
    const { data: s } = await db.from('push_subscriptions').select('*').eq('endpoint', String(body.endpoint || '')).maybeSingle()
    if (!t || !s) return json({ error: !t ? 'bad_type' : 'not_subscribed' }, 404)
    const sample: Record<string, Record<string, unknown>> = {
      hezb: { name: 'علی محمدی', group: 'گروه تلگرام ۳', id: 17, group_number: 3, start: new Date(Date.now() + 864e5).toISOString().slice(0, 10), task: 'سوره بقره، آیه ۷۵ تا ۹۲ (حزب ۳)' },
      chl: { name: 'علی محمدی', course: 'چله زیارت عاشورا', kind: 'text', day: 5, days: 40, slot: 1, page: 1, times: 1, start: new Date().toISOString().slice(0, 10), news: 'متن نمونه خبر دوره.' }
    }
    const data = t.azan ? { night: 1 } : sample[body.type.startsWith('hezb_') ? 'hezb' : 'chl']
    const msg = compose(settings, body.type, [{ type: body.type, data }], SITE_URL)
    await send(s, { ...msg, tag: 'sample' }, 600)
    return json(stats)
  }

  // ---------- اعلان‌های زمان‌دار و رویدادها ----------
  const rd = await db.rpc('reading_day')
  const day: string = rd.data || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())
  stats.day = day
  const test = slot === 'test'
  let endpoint: string | null = null
  if (test) {
    endpoint = typeof body.endpoint === 'string' ? body.endpoint : null
    if (!endpoint) return json({ error: 'no_endpoint' }, 400)
  } else {
    await db.rpc('push_autofollow')
  }
  // آزمایش: برنامه امروز (یا «از فردا شروع می‌شود») همین دستگاه، بی‌توجه به ساعت؛ بدون یادآوری‌های عصر و رویدادها.
  const nowMin = tehranMinutes(new Date())
  const typesOf = (s: Settings) => {
    let t = test ? Object.entries(s.types).filter(([k, d]) => (d.on || k === 'chl_start') && !d.event && !d.azan && !k.endsWith('_evening')).map(([k]) => k) : dueTypes(s, slot, nowMin)
    if (t.includes('chl_daily') || t.includes('chl_start')) t = [...new Set([...t, 'chl_daily', 'chl_start'])]
    return t
  }
  // هر گوشی می‌تواند نوعی را خاموش کند یا ساعت دیگری بگذارد؛ بقیه همان تنظیم مدیر را دارند.
  const custom = new Map<string, { s: Settings; types: string[] }>()
  {
    let q = db.from('push_subscriptions').select('endpoint,prefs').neq('prefs', '{}')
    if (endpoint) q = q.eq('endpoint', endpoint)
    const { data } = await q
    for (const r of (data || []) as { endpoint: string; prefs: Prefs }[]) { const s = forDevice(settings, r.prefs); custom.set(r.endpoint, { s, types: typesOf(s) }) }
  }
  const general = { s: settings, types: typesOf(settings) }
  const dev = (ep: string) => custom.get(ep) || general
  const types = [...new Set([...general.types, ...[...custom.values()].flatMap(c => c.types)])]
  stats.types = types.join(',')
  if (custom.size) stats.custom = custom.size

  // دستگاه → نوع → فهرست
  const out = new Map<string, { sub: Sub; byType: Map<string, (Item & { key: string })[]> }>()
  // bucket: «روز اول» و «برنامه امروز» یک اعلان می‌شوند.
  const add = (sub: Sub, type: string, key: string, data: Record<string, unknown>, bucket = type) => {
    if (!out.has(sub.endpoint)) out.set(sub.endpoint, { sub, byType: new Map() })
    const m = out.get(sub.endpoint)!.byType
    if (!m.has(bucket)) m.set(bucket, [])
    m.get(bucket)!.push({ type, key, data: { ...data, key } })
  }

  // چله، دوره‌های قرآن و اعلام شناسه (پایگاه داده حساب می‌کند)
  const chl = types.filter(t => !['hezb_tomorrow', 'hezb_morning', 'hezb_evening'].includes(t))
  if (chl.length) {
    const { data, error } = await db.rpc('push_due', { p_types: chl, p_day: day, p_endpoint: endpoint, p_force: test })
    if (error) return json({ error: error.message }, 500)
    for (const r of data as { endpoint: string; p256dh: string; auth: string; type: string; key: string; data: Record<string, unknown> }[]) {
      // «روز اول» خاموش باشد: همان «برنامه امروز».
      const d = dev(r.endpoint)
      let type = r.type
      if (type === 'chl_start' && !d.s.types.chl_start.on) type = 'chl_daily'
      if (!d.types.includes(type) || !d.s.types[type]?.on) continue
      add({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, group_number: null, participant_id: null }, type, r.key, r.data,
        type === 'chl_start' ? 'chl_daily' : type)
    }
  }

  // حزب‌خوانی: سهم امروز، یادآوری عصر (اگر گزارش ثبت نشده)، و «از فردا شروع می‌شود»
  const hz = types.filter(t => ['hezb_tomorrow', 'hezb_morning', 'hezb_evening'].includes(t))
  if (hz.length) {
    let q = db.from('push_subscriptions').select('endpoint,p256dh,auth,group_number,participant_id').not('group_number', 'is', null)
    if (endpoint) q = q.eq('endpoint', endpoint)
    const { data: subs, error } = await q
    if (error) return json({ error: error.message }, 500)
    if (subs.length) {
      const [groups, portions] = await Promise.all([loadGroups(db), fetch(`${SITE_URL}/portions.json`).then(r => r.json())])
      const byNumber = new Map(groups.map(g => [g.number, g]))
      const reported = new Set<string>(), sent = new Set<string>()
      if (hz.includes('hezb_evening')) {
        const { data, error } = await db.from('daily_reports').select('group_number,participant_id').eq('report_date', day)
        if (error) return json({ error: error.message }, 500)
        data.forEach(r => reported.add(`${r.group_number}:${r.participant_id}`))
      }
      if (!test) {
        const { data } = await db.from('push_sent').select('endpoint,key').gte('at', new Date(Date.now() - 2 * 864e5).toISOString()).like('key', 'hezb_%')
        ;(data || []).forEach(r => sent.add(r.endpoint + ' ' + r.key))
      }
      const tomorrow = new Date(isoToUtc(day) + 864e5).toISOString().slice(0, 10)
      for (const s of subs as Sub[]) {
        const g = byNumber.get(s.group_number!)
        if (!g) continue
        const base = { name: g.names[s.participant_id! - 1], group: g.name, group_number: s.group_number, id: s.participant_id }
        const task = (p: { portion: string; hizb: number }) => `${toFa(p.portion)} (حزب ${toFa(p.hizb)})`
        const mine = dev(s.endpoint).types
        for (const type of hz) {
          if (!mine.includes(type)) continue
          const d = type === 'hezb_tomorrow' ? tomorrow : day
          if (type === 'hezb_tomorrow' && isoToUtc(tomorrow) !== g.start) continue
          if (type === 'hezb_evening' && reported.has(`${s.group_number}:${s.participant_id}`)) continue
          const p = portionFor(g, s.participant_id!, d, portions)
          if (!p) continue
          const key = `${type}:${s.group_number}:${s.participant_id}:${d}`
          if (sent.has(s.endpoint + ' ' + key)) continue
          add(s, type, key, { ...base, name: p.name, task: task(p), start: tomorrow })
        }
      }
    }
  }

  // با اذان (نماز امام جواد، ختم یاسین): برای همه گوشی‌هایی که اعلان دارند، مگر کسی این نوع را روی گوشی خودش خاموش کرده باشد.
  const azan = slot === 'auto' ? azanDue(settings, new Date()) : []
  if (azan.length) {
    stats.azan = azan.map(a => a.type).join(',')
    const subs = await all<Sub>(() => db.from('push_subscriptions').select('endpoint,p256dh,auth,group_number,participant_id').order('endpoint'))
    const done = await all<{ endpoint: string; key: string }>(() => db.from('push_sent').select('endpoint,key').in('key', azan.map(a => a.data.key as string)).order('endpoint'))
    const sent = new Set(done.map(r => r.endpoint + ' ' + r.key))
    for (const s of subs) for (const a of azan) {
      if (sent.has(s.endpoint + ' ' + a.data.key) || !dev(s.endpoint).s.types[a.type]?.on) continue
      add(s, a.type, a.data.key as string, a.data)
    }
  }

  // ارسال: هر دستگاه، هر نوع یک اعلان (چند چله در یک اعلان جمع می‌شود).
  const jobs: (() => Promise<void>)[] = []
  for (const { sub, byType } of out.values()) for (const [type, items] of byType) jobs.push(async () => {
    const msg = compose(settings, type, items, SITE_URL)
    const ttl = settings.types[type]?.event ? 24 * 3600 : 6 * 3600
    if (await send(sub, msg, ttl) && !test) {
      await db.from('push_sent').upsert(items.map(i => ({ endpoint: sub.endpoint, key: i.key })), { onConflict: 'endpoint,key', ignoreDuplicates: true })
    }
  })
  if (test && !jobs.length) {
    // چیزی برای امروز نیست: فقط اعلانی که نشان دهد اعلان‌ها روی این دستگاه کار می‌کند.
    const { data: s } = await db.from('push_subscriptions').select('*').eq('endpoint', endpoint!).maybeSingle()
    if (!s) return json({ ...stats, note: 'not_subscribed' }, 404)
    await send(s, { title: 'اعلان‌ها فعال است', body: 'برنامه امروز شما ثبت شده یا هنوز دوره‌تان شروع نشده است. یادآوری‌ها در ساعت‌های خودشان می‌رسد.', url: `${SITE_URL}/`, tag: 'test' }, 600)
    return json(stats)
  }
  for (let i = 0; i < jobs.length; i += 25) await Promise.all(jobs.slice(i, i + 25).map(f => f()))
  if (!test) {
    if (+stats.sent || +stats.failed || +stats.removed) await db.from('push_runs').insert({ slot, stats })
    await db.rpc('push_cleanup')
  }
  return json(stats)
}
