// ارسال یادآوری روزانه با اعلان مرورگر. با Supabase Cron ساعت ۱۰ (slot=morning) و ۱۹ (slot=evening) به وقت ایران صدا زده می‌شود.
// Secrets لازم: VAPID_PUBLIC_KEY، VAPID_PRIVATE_KEY، CRON_SECRET. اختیاری: SITE_URL (پیش‌فرض https://hezbkhani.github.io).
// منبع گروه‌ها مثل خود سایت (app.js) است: تنظیم groups_source در site_settings؛ پایگاه داده مگر «files» انتخاب شده یا خالی باشد.
// SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY را خود Supabase می‌گذارد.
// این تابع باید با JWT verification خاموش deploy شود؛ اجازه با x-cron-secret بررسی می‌شود.
// slot=test فقط به یک دستگاهِ ازپیش‌مشترک (endpoint در بدنه) پیام سهم امروز را می‌فرستد؛ برای دکمه «ارسال آزمایشی» در سایت.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { type Group, type Slot, isoToUtc, message, parseGroupText, portionFor } from './reminder.ts'

const env = (k: string) => Deno.env.get(k) || ''
const SITE_URL = env('SITE_URL') || 'https://hezbkhani.github.io'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const makeDb = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

async function loadGroups(db: ReturnType<typeof makeDb>): Promise<Group[]> {
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

Deno.serve(req => handle(req).catch(e => { console.error(e); return json({ error: String((e as Error).message || e) }, 500) }))

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const slot = new URL(req.url).searchParams.get('slot') as Slot
  if (!['morning', 'evening', 'test'].includes(slot)) return json({ error: 'bad_slot' }, 400)
  if (slot !== 'test' && (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET'))) return json({ error: 'unauthorized' }, 401)

  webpush.setVapidDetails('https://hezbkhani.github.io', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
  const db = makeDb()

  // روز قرائت (از اذان صبح تهران)، همان تابع reading_day پایگاه داده.
  const rd = await db.rpc('reading_day')
  const day: string = rd.data || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())

  let q = db.from('push_subscriptions').select('*')
  if (slot === 'test') {
    const endpoint = (await req.json().catch(() => ({}))).endpoint
    if (typeof endpoint !== 'string') return json({ error: 'no_endpoint' }, 400)
    q = q.eq('endpoint', endpoint)
  }
  const { data: subs, error } = await q
  if (error) return json({ error: error.message }, 500)
  if (!subs.length) return json({ day, slot, sent: 0, note: slot === 'test' ? 'not_subscribed' : 'no_subscribers' }, slot === 'test' ? 404 : 200)

  const [groups, portions] = await Promise.all([loadGroups(db), fetch(`${SITE_URL}/portions.json`).then(r => r.json())])
  const byNumber = new Map(groups.map(g => [g.number, g]))

  // عصر: فقط کسانی که گزارش امروز را ثبت نکرده‌اند.
  const reported = new Set<string>()
  if (slot === 'evening') {
    const { data, error } = await db.from('daily_reports').select('group_number,participant_id').eq('report_date', day)
    if (error) return json({ error: error.message }, 500)
    data.forEach(r => reported.add(`${r.group_number}:${r.participant_id}`))
  }

  const stamp = slot === 'morning' ? 'last_morning' : 'last_evening'
  const stats = { day, slot, sent: 0, already: 0, reported: 0, not_started: 0, removed: 0, failed: 0 }
  const todo = subs.filter(s => {
    if (slot !== 'test' && s[stamp] === day) { stats.already++; return false }
    if (reported.has(`${s.group_number}:${s.participant_id}`)) { stats.reported++; return false }
    return true
  })

  for (let i = 0; i < todo.length; i += 25) {
    await Promise.all(todo.slice(i, i + 25).map(async s => {
      const g = byNumber.get(s.group_number), p = g && portionFor(g, s.participant_id, day, portions)
      if (!p) { stats.not_started++; return }
      const msg = message(slot, p, s.group_number, s.participant_id, SITE_URL)
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: slot === 'evening' ? 4 * 3600 : 8 * 3600, urgency: 'high' })
        stats.sent++
        if (slot !== 'test') await db.from('push_subscriptions').update({ [stamp]: day }).eq('endpoint', s.endpoint)
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        // اشتراک منقضی یا لغوشده در مرورگر: حذف.
        if (code === 404 || code === 410) { stats.removed++; await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint) }
        else { stats.failed++; console.error('push failed', code, (e as Error).message) }
      }
    }))
  }
  return json(stats)
}
