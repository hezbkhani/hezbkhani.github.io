// منطق خالص اعلان‌ها (بدون شبکه) تا جدا آزمایش شود: کدام نوع اعلان الان وقتش است، و ساختن متن از قالب.
import { toFa } from './reminder.ts'

export type TypeDef = { group?: string; time?: string; event?: boolean; same?: string; label?: string; title: string; body: string; on?: boolean }
export type Settings = { public?: boolean; quiet: { from: string; to: string }; types: Record<string, TypeDef> }

// پیش‌فرض‌ها (notifications.json) با تغییرات مدیر (site_settings.notify) ترکیب می‌شوند.
export function mergeSettings(defaults: Settings, saved: Partial<Settings> | null | undefined): Settings {
  const s = saved || {}, types: Record<string, TypeDef> = {}
  for (const [k, d] of Object.entries(defaults.types)) {
    const o = (s.types || {})[k] || {}
    types[k] = { ...d, on: o.on !== false, time: valid(o.time) ? o.time : d.time,
      title: typeof o.title === 'string' && o.title.trim() ? o.title : d.title,
      body: typeof o.body === 'string' && o.body.trim() ? o.body : d.body }
  }
  const q = s.quiet || {} as { from?: string; to?: string }
  return { public: !!s.public, quiet: { from: valid(q.from) ? q.from! : defaults.quiet.from, to: valid(q.to) ? q.to! : defaults.quiet.to }, types }
}
const valid = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
export const minutes = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5)

// ساعت و دقیقه الان به وقت تهران (ایران از ۱۴۰۱ ساعت تابستانی ندارد).
export function tehranMinutes(now: Date) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  return +p.find(x => x.type === 'hour')!.value * 60 + +p.find(x => x.type === 'minute')!.value
}
const inRange = (m: number, from: number, to: number) => from <= to ? m >= from && m < to : m >= from || m < to

// نوع‌هایی که الان باید فرستاده شوند.
// زمان‌دار: از ساعت تنظیم‌شده تا ۳ ساعت بعد (اگر اجرایی جا بماند، اجرای بعدی می‌فرستد؛ دیرتر از آن یا در ساعت سکوت دیگر نه).
// رویدادها (شروع، رزرو، خبر): هر بار، جز در ساعت‌های سکوت شب.
// slot=morning/evening (زمان‌بندی قدیمی ۱۰ و ۱۹): همه نوع‌های زمان‌دارِ پیش و پس از ساعت ۱۵، بی‌توجه به ساعت دقیق.
export function dueTypes(s: Settings, slot: string, nowMin: number): string[] {
  const out: string[] = []
  const quiet = inRange(nowMin, minutes(s.quiet.from), minutes(s.quiet.to))
  for (const [k, t] of Object.entries(s.types)) {
    if (!t.on) continue
    const time = t.same ? s.types[t.same]?.time : t.time
    if (t.event) { if (slot === 'auto' ? !quiet : slot === 'morning') out.push(k); continue }
    if (!time) continue
    const at = minutes(time)
    // اجرای جامانده در ساعت سکوت شب نمی‌فرستد (مگر خود ساعت تنظیم‌شده در ساعت سکوت باشد).
    if (slot === 'auto' && quiet && !inRange(at, minutes(s.quiet.from), minutes(s.quiet.to))) continue
    if (slot === 'auto' ? inRange(nowMin, at, (at + 180) % 1440) : slot === 'morning' ? at < 900 : slot === 'evening' ? at >= 900 : false) out.push(k)
  }
  return out
}

export type Item = { type: string; data: Record<string, unknown> }

const JUZ = (d: Record<string, unknown>) => ((Math.max(1, +(d.slot as number) || 1) - 1) + (Math.max(1, +(d.day as number) || 1) - 1)) % 30 + 1
// کار امروز برای چله و دوره‌های قرآن (همان todaySpec در chelleh.js).
export function chlTask(d: Record<string, unknown>) {
  if (d.kind === 'juz') return `جزء ${toFa(JUZ(d))} قرآن`
  if (d.kind === 'page') return `صفحه ${toFa(d.page)} قرآن`
  const t = String(d.course || '').replace(/^چله\s+/, '')
  return +(d.times as number) > 1 ? `${t}، ${toFa(d.times)} بار` : t
}

export function dateFa(iso: unknown) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T00:00:00Z')) } catch { return iso }
}

// مقدارهای جای‌نگهدارها برای یک اعلان.
export function vars(type: string, d: Record<string, unknown>): Record<string, string> {
  const v: Record<string, string> = {
    name: String(d.name ?? ''), course: String(d.course ?? ''), group: String(d.group ?? ''), news: String(d.news ?? ''),
    id: d.id != null ? toFa(d.id) : '', day: d.day != null ? toFa(d.day) : '', days: d.days != null ? toFa(d.days) : '',
    left: d.days != null && d.day != null ? toFa(Math.max(0, +(d.days as number) - +(d.day as number))) : '',
    date: dateFa(d.start), task: String(d.task ?? '')
  }
  if (type.startsWith('chl_')) {
    // روز اول برای «فردا شروع می‌شود»
    const dd = type === 'chl_tomorrow' ? { ...d, day: 1, page: 1 } : d
    v.task = chlTask(dd)
    if (type === 'chl_promoted') v.task = +(d.day as number) >= 1 ? `از امروز همراه گروه بخوانید: ${chlTask(d)}.` : d.start ? `با شروع دوره در ${dateFa(d.start)} همراه گروه می‌خوانید.` : 'با شروع دوره همراه گروه می‌خوانید.'
  }
  return v
}

export const fill = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)).replace(/\s+([.،])/g, '$1').trim()

export type Msg = { title: string; body: string; url: string; tag: string }

// یک یا چند اعلانِ هم‌نوع برای یک دستگاه. چند چله/دوره روی یک گوشی (مثلاً برای خانواده) در یک اعلان جمع می‌شوند.
export function compose(s: Settings, type: string, items: Item[], siteUrl: string): Msg {
  const base = siteUrl.replace(/\/$/, '')
  const t = s.types[type]
  const url = type.startsWith('hezb_') && items[0].data.group_number && items[0].data.id
    ? `${base}/?g=${items[0].data.group_number}&id=${items[0].data.id}` : type.startsWith('chl_') ? `${base}/?mine=1` : `${base}/`
  if (items.length === 1) {
    const it = items[0], tt = s.types[it.type] || t, v = vars(it.type, it.data)
    return { title: fill(tt.title, v), body: fill(tt.body, v), url, tag: `${it.type}:${it.data.key ?? ''}` }
  }
  const names = new Set(items.map(i => i.data.name))
  const lines = items.map(i => {
    const v = vars(i.type, i.data), who = names.size > 1 ? v.name + '، ' : ''
    if (i.type === 'chl_news') return `• ${v.course}: ${v.news}`
    // چله متنی: نام چله خودش کار امروز است؛ روزشمار به جایش می‌آید.
    const what = i.data.kind === 'text' ? `${v.course}${i.type === 'chl_tomorrow' ? '' : `، روز ${v.day} از ${v.days}`}${+(i.data.times as number) > 1 ? `، ${toFa(i.data.times)} بار` : ''}` : `${v.course}: ${v.task}`
    return `• ${who}${what}${i.type === 'chl_start' ? ' (روز اول)' : ''}`
  })
  const head = type === 'chl_evening' ? 'یادآوری: خواندن امروز هنوز ثبت نشده' : type === 'chl_tomorrow' ? 'شروع از فردا' : type === 'chl_news' ? 'خبر تازه دوره‌ها' : type === 'chl_promoted' ? 'از فهرست رزرو به گروه آمدید' : 'برنامه امروز شما'
  return { title: head, body: lines.join('\n'), url, tag: type }
}
