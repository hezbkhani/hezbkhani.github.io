// منطق خالص اعلان‌ها (بدون شبکه) تا جدا آزمایش شود: کدام نوع اعلان الان وقتش است، و ساختن متن از قالب.
import { toFa } from './reminder.ts'

export type TypeDef = { group?: string; time?: string; event?: boolean; same?: string; azan?: 'dhuhr' | 'maghrib'; offset?: number; weekday?: number; khatm?: boolean; label?: string; title: string; body: string; on?: boolean }
// hijri: چند روز تاریخ قمری محاسبه‌شده (ام‌القری) جابه‌جا شود تا با تقویم رسمی ایران یکی شود (مدیر تنظیم می‌کند).
export type Settings = { public?: boolean; hijri?: number; quiet: { from: string; to: string }; types: Record<string, TypeDef> }

// پیش‌فرض‌ها (notifications.json) با تغییرات مدیر (site_settings.notify) ترکیب می‌شوند.
export function mergeSettings(defaults: Settings, saved: Partial<Settings> | null | undefined): Settings {
  const s = saved || {}, types: Record<string, TypeDef> = {}
  for (const [k, d] of Object.entries(defaults.types)) {
    const o = (s.types || {})[k] || {}
    types[k] = { ...d, on: o.on !== false, time: valid(o.time) ? o.time : d.time, offset: azanOffset(o.offset) ?? d.offset,
      title: typeof o.title === 'string' && o.title.trim() ? o.title : d.title,
      body: typeof o.body === 'string' && o.body.trim() ? o.body : d.body }
  }
  const q = s.quiet || {} as { from?: string; to?: string }
  return { public: !!s.public, hijri: hijriOffset(s.hijri), quiet: { from: valid(q.from) ? q.from! : defaults.quiet.from, to: valid(q.to) ? q.to! : defaults.quiet.to }, types }
}
// انتخاب خود کاربر روی گوشی‌اش (push_subscriptions.prefs): نوع‌هایی که خاموش کرده و ساعت دلخواهش.
// نوعی که مدیر خاموش کرده با این روشن نمی‌شود؛ ساعت فقط برای نوع‌های زمان‌دار (نه رویدادها و نه «روز اول» که ساعت «برنامه امروز» را دارد).
export type Prefs = { off?: unknown; times?: unknown }
export function forDevice(s: Settings, p: Prefs | null | undefined): Settings {
  const off = Array.isArray(p?.off) ? p!.off as unknown[] : []
  const times = p?.times && typeof p.times === 'object' ? p.times as Record<string, unknown> : {}
  if (!off.length && !Object.keys(times).length) return s
  const types: Record<string, TypeDef> = {}
  for (const [k, t] of Object.entries(s.types)) {
    const mine = times[k]
    types[k] = { ...t, on: !!t.on && !off.includes(k), time: !t.event && !t.same && valid(mine) ? mine : t.time }
  }
  return { ...s, types }
}
// چند دقیقه پیش (منفی) یا پس از اذان؛ مثلاً دعای سمات ۶۰ دقیقه پیش از مغرب جمعه.
const azanOffset = (x: unknown) => Number.isInteger(x) && Math.abs(x as number) <= 240 ? x as number : undefined
export const hijriOffset = (x: unknown) => Number.isInteger(x) && Math.abs(x as number) <= 2 ? x as number : 0
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
    date: dateFa(d.start), task: String(d.task ?? ''), night: ''
  }
  if (d.night != null) { v.night = NIGHTS[+(d.night as number) - 1] || ''; v.task = khatmTask(+(d.night as number)) }
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
  const url = t?.azan ? `${base}/?doa=${type}` : type.startsWith('hezb_') && items[0].data.group_number && items[0].data.id
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

// ---------- اعلان‌های همراه اذان: نماز امام جواد (ع) چهارشنبه‌ها، ختم یاسین حضرت ام‌البنین (س) شب‌های جمعه، ----------
// ---------- و ادعیه (سمات پیش از مغرب جمعه، کمیل شب جمعه، توسل شب چهارشنبه) با چند دقیقه فاصله از اذان (offset) ----------
// اوقات شرعی تهران به روش مؤسسه ژئوفیزیک دانشگاه تهران (همان محاسبه tehran_fajr و fajrTehran سایت):
// ظهر = گذر خورشید از نصف‌النهار؛ مغرب = ۴٫۵ درجه پایین‌تر از افق.
export function tehranAzan(iso: string, kind: 'dhuhr' | 'maghrib'): Date {
  const r = Math.PI / 180, lat = 35.6892 * r, lng = 51.389, fix = (a: number, b: number) => (a % b + b) % b
  const day = isoToUtcMs(iso)
  let h = kind === 'dhuhr' ? 8.5 : 14
  for (let i = 0; i < 3; i++) {
    const D = day / 864e5 + 2440587.5 + h / 24 - 2451545, g = (357.529 + 0.98560028 * D) * r, q = fix(280.459 + 0.98564736 * D, 360)
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r, e = (23.439 - 3.6e-7 * D) * r
    const ra = fix(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / r / 15, 24), dec = Math.asin(Math.sin(e) * Math.sin(L))
    const noon = fix(12 - (q / 15 - ra), 24) - lng / 15
    h = kind === 'dhuhr' ? noon : noon + Math.acos((-Math.sin(4.5 * r) - Math.sin(dec) * Math.sin(lat)) / (Math.cos(dec) * Math.cos(lat))) / r / 15
  }
  return new Date(day + h * 36e5)
}
const isoToUtcMs = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const tehranDate = (now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(now)

// روز ماه قمری (تقویم ام‌القری، با جابه‌جایی مدیر).
const HIJRI = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric' })
export const hijriDay = (iso: string, offset = 0) => +HIJRI.formatToParts(new Date(isoToUtcMs(iso) + offset * 864e5 + 432e5)).find(p => p.type === 'day')!.value

// ختم یاسین: در هر ماه قمری از نزدیک‌ترین پنجشنبه به نیمه ماه (۱۵ام) شروع می‌شود و ۴ پنجشنبه شب ادامه دارد.
// خروجی: این پنجشنبه شبِ چندم ختم است (۱ تا ۴)، یا ۰ اگر شب ختم نیست. نیمه ماه حداکثر ۳ روز با نزدیک‌ترین پنجشنبه فاصله دارد.
export function khatmNight(iso: string, offset = 0): number {
  const t = isoToUtcMs(iso)
  if (new Date(t).getUTCDay() !== 4) return 0
  for (let k = 0; k < 4; k++) {
    const start = t - k * 7 * 864e5
    for (let j = -3; j <= 3; j++) if (hijriDay(isoOf(start + j * 864e5), offset) === 15) return k + 1
  }
  return 0
}
export const NIGHTS = ['اول', 'دوم', 'سوم', 'چهارم']
const TIMES = ['یک بار', 'دو بار', 'سه بار', 'چهار بار']
export const khatmTask = (n: number) => n >= 1 && n <= 4
  ? `${TIMES[n - 1]} سوره یاسین، ${n < 4 ? 'هدیه به حضرت ابوالفضل العباس (ع)' : 'به نیابت از حضرت عباس (ع) هدیه به مادرشان حضرت ام‌البنین (س)'}` : ''

// اعلان‌های اذانی که الان وقتشان است (برای همه گوشی‌ها). از ۷ دقیقه پیش از وقتش (اذان + offset؛ اجراها هر ۱۵ دقیقه است) تا ۳ ساعت بعد.
export function azanDue(s: Settings, now: Date): Item[] {
  const out: Item[] = [], iso = tehranDate(now), wd = new Date(isoToUtcMs(iso)).getUTCDay()
  for (const [k, t] of Object.entries(s.types)) {
    if (!t.azan || !t.on || (t.weekday != null && t.weekday !== wd)) continue
    const at = tehranAzan(iso, t.azan).getTime() + (t.offset || 0) * 6e4, m = now.getTime()
    // دعای سمات پیش از مغرب است؛ دیرتر از اذان دیگر فرستاده نمی‌شود.
    if (m < at - 7 * 6e4 || m > at + (t.offset && t.offset < 0 ? -t.offset * 6e4 : 3 * 36e5)) continue
    const night = t.khatm ? khatmNight(iso, s.hijri || 0) : 0
    if (t.khatm && !night) continue
    out.push({ type: k, data: { key: `${k}:${iso}`, ...(night ? { night } : {}) } })
  }
  return out
}
