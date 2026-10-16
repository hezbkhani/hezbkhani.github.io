// ورود با نام کاربری (به‌جای ایمیل) برای حساب‌های کاربری سایت (account.js).
// نام کاربری به ایمیل تبدیل می‌شود و همین‌جا با Supabase Auth وارد می‌شود؛ ایمیل هیچ‌وقت به مرورگر فرستاده نمی‌شود.
// اگر نام کاربری یا رمز درست نباشد، همان پیام «ورود ناموفق» برمی‌گردد تا معلوم نشود کدام نام کاربری وجود دارد.
// این تابع باید با JWT verification خاموش deploy شود (مثل daily-reminders). Secret تازه‌ای لازم ندارد.
const env = (k: string) => Deno.env.get(k) || ''
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const BAD = { error: 'invalid_grant', error_description: 'Invalid login credentials' }

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const url = env('SUPABASE_URL'), service = env('SUPABASE_SERVICE_ROLE_KEY')
  // کلید عمومی همان است که سایت فرستاده (config.js)؛ اگر نبود، کلید anon خود پروژه.
  const apikey = req.headers.get('apikey') || env('SUPABASE_ANON_KEY')
  let body: { username?: string; password?: string } = {}
  try { body = await req.json() } catch { /* بدنه خالی */ }
  const username = String(body.username || '').trim(), password = String(body.password || '')
  if (!username || !password || username.length > 60 || password.length > 200) return json(BAD, 400)

  const r = await fetch(`${url}/rest/v1/rpc/acc_login_email`, {
    method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_username: username })
  })
  if (!r.ok) return json({ error: 'setup' }, 500)
  const email = await r.json()
  if (typeof email !== 'string' || !email) return json(BAD, 400)

  // آدرس IP بازدیدکننده فرستاده می‌شود تا محدودیت تعداد تلاش Supabase برای هر نفر جدا حساب شود.
  const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const t = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey, 'Content-Type': 'application/json', ...(ip ? { 'X-Forwarded-For': ip } : {}) },
    body: JSON.stringify({ email, password })
  })
  const d = await t.json().catch(() => ({}))
  return json(d, t.status)
})
