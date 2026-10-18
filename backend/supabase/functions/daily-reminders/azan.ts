// اعلان اذان شخصی (جدول push_azan، azan.sql): اذان صبح، ظهر و مغرب به افق شهری که هر گوشی انتخاب کرده.
// منطق خالص (بدون شبکه) تا جدا آزمایش شود. محاسبه اوقات همان daily.js سایت است (روش مؤسسه ژئوفیزیک دانشگاه تهران:
// صبح ۱۷٫۷ درجه، مغرب ۴٫۵ درجه زیر افق، طلوع و غروب ۰٫۸۳۳ درجه؛ عرض‌های بالا با سهمی از شب). هر تغییری در یکی، در دیگری هم.
import { toFa } from './reminder.ts'

const DAY = 864e5, MIN = 6e4, R = Math.PI / 180

// زمان (به میلی‌ثانیه UTC) که خورشید ang درجه زیر افق است؛ dir منفی پیش از ظهر، مثبت پس از ظهر، صفر خود ظهر. (sunTime در daily.js)
function sunTime(day: number, lat: number, lng: number, ang: number, dir: number): number {
  let h = 12 - lng / 15
  for (let i = 0; i < 4; i++) {
    const D = day / DAY + 2440587.5 + h / 24 - 2451545, fix = (a: number, b: number) => (a % b + b) % b
    const g = (357.529 + 0.98560028 * D) * R, q = fix(280.459 + 0.98564736 * D, 360)
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R, e = (23.439 - 3.6e-7 * D) * R
    const ra = fix(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / R / 15, 24), dec = Math.asin(Math.sin(e) * Math.sin(L))
    let noon = 12 - (q / 15 - ra); noon = noon - 24 * Math.round((noon - 12) / 24); noon -= lng / 15
    if (!dir) { h = noon; continue }
    const c = (-Math.sin(ang * R) - Math.sin(dec) * Math.sin(lat * R)) / (Math.cos(dec) * Math.cos(lat * R))
    if (c < -1 || c > 1) return NaN
    h = noon + dir * Math.acos(c) / R / 15
  }
  return day + h * 36e5
}

const isoMs = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
export const localDate = (t: number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))

// اوقات یک روز (تاریخ محلی iso) برای یک مکان؛ گرد به دقیقه، همان که کارت «امروز» نشان می‌دهد.
export function prayerTimes(iso: string, lat: number, lng: number) {
  const d = isoMs(iso)
  const rise = sunTime(d, lat, lng, 0.833, -1), set = sunTime(d, lat, lng, 0.833, 1)
  let fajr = sunTime(d, lat, lng, 17.7, -1), mag = sunTime(d, lat, lng, 4.5, 1)
  const night = DAY - (set - rise)
  if (!(rise - fajr <= 17.7 / 60 * night)) fajr = rise - 17.7 / 60 * night
  if (!(mag - set <= 4.5 / 60 * night)) mag = set + 4.5 / 60 * night
  const round = (t: number) => Math.round(t / MIN) * MIN
  return { fajr: round(fajr), dhuhr: round(sunTime(d, lat, lng, 0, 0)), maghrib: round(mag) }
}

export type AzanRow = { endpoint: string; lat: number; lng: number; tz: string; prayers: string[] }
export type AzanDue = { endpoint: string; prayer: 'fajr' | 'dhuhr' | 'maghrib'; at: number; key: string; tz: string }

// تا چند دقیقه پس از اذان هنوز فرستاده می‌شود (اجرای جامانده). زودتر از اذان هرگز: کسی با اعلان پیش از وقت نماز نخواند
// (۳۰ ثانیه فقط برای گرد شدن دقیقه). با زمان‌بندی هر ۱۵ دقیقه، اعلان تا ۱۵ دقیقه دیرتر می‌رسد؛ با slot=azan هر دقیقه، حداکثر یک دقیقه.
export const LATE_MIN = 20
export function azanPersonalDue(rows: AzanRow[], now: number): AzanDue[] {
  const out: AzanDue[] = []
  for (const r of rows) {
    const lat = +r.lat, lng = +r.lng
    if (!isFinite(lat) || !isFinite(lng) || !Array.isArray(r.prayers)) continue
    let iso: string
    try { iso = localDate(now, r.tz) } catch { continue }
    // اذانِ همین روز محلی؛ اذانی که دیروز (محلی) بوده ولی هنوز در بازه است، مثلاً مغرب نزدیک نیمه‌شب در عرض‌های بالا، هم دیده شود
    for (const day of [iso, localDate(now - DAY, r.tz)]) {
      const t = prayerTimes(day, lat, lng)
      for (const p of ['fajr', 'dhuhr', 'maghrib'] as const) {
        if (!r.prayers.includes(p) || !isFinite(t[p])) continue
        if (now >= t[p] - 30e3 && now <= t[p] + LATE_MIN * MIN) out.push({ endpoint: r.endpoint, prayer: p, at: t[p], key: `azan_${p}:${day}`, tz: r.tz })
      }
    }
  }
  return out
}

const NAMES = { fajr: 'اذان صبح', dhuhr: 'اذان ظهر', maghrib: 'اذان مغرب' }
export function azanMsg(d: AzanDue, siteUrl: string) {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: d.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d.at))
  return { title: `🕌 ${NAMES[d.prayer]}`, body: `وقت ${NAMES[d.prayer]} است (ساعت ${toFa(hm)}).`, url: `${siteUrl.replace(/\/$/, '')}/`, tag: d.key }
}
