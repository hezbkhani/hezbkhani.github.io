-- اعلان اذان (امکان azan سایت، azan.js): اذان صبح، ظهر و مغرب به افق شهری که هر گوشی انتخاب کرده.
-- اجرا در Supabase SQL Editor پس از reminders.sql. اجرای دوباره بی‌خطر است.
-- وقت اذان را تابع daily-reminders (azan.ts، همان محاسبه daily.js) برای هر ردیف حساب می‌کند و با کلید
-- azan_<نماز>:<تاریخ محلی> در push_sent ثبت می‌کند تا هر اذان روزی یک بار برسد.
-- زمان‌بندی پیشنهادی (اجرای جداگانه، مثل انتهای reminders.sql) در انتهای همین فایل است.

-- هر گوشی (endpoint) یک ردیف؛ با حذف اشتراک خودش هم حذف می‌شود. مختصات گرد شده تا دو رقم اعشار (حدود ۱ کیلومتر)
-- که برای وقت اذان کافی است (کمتر از چند ثانیه اختلاف) و موقعیت دقیق کسی را نگه نمی‌دارد.
create table if not exists public.push_azan (
  endpoint text primary key references public.push_subscriptions(endpoint) on delete cascade on update cascade,
  lat numeric(5,2) not null check (lat between -90 and 90),
  lng numeric(6,2) not null check (lng between -180 and 180),
  tz text not null check (length(tz) <= 64),
  prayers text[] not null check (cardinality(prayers) between 1 and 3 and prayers <@ array['fajr', 'dhuhr', 'maghrib']),
  updated_at timestamptz not null default now()
);
-- بازدیدکنندگان مستقیم به این جدول دسترسی ندارند؛ فقط از راه push_azan_set.
alter table public.push_azan enable row level security;

-- push_azan_set: ثبت یا تغییر اعلان اذان این گوشی. p_prayers خالی: اعلان اذان خاموش (ردیف حذف می‌شود، اشتراک می‌ماند).
-- اگر این گوشی هنوز اشتراک ندارد (فقط اذان می‌خواهد)، اشتراک بی‌کد ساخته می‌شود؛ همان بررسی push_check برای endpoint و کلیدها.
-- محدودیت سوءاستفاده: فقط سرویس‌های اعلان شناخته‌شده (push_check)، منطقه زمانی واقعی، حداکثر ۳ نماز؛ هر گوشی فقط یک ردیف دارد.
create or replace function public.push_azan_set(p_endpoint text, p_p256dh text, p_auth text, p_lat double precision, p_lng double precision,
                                            p_tz text, p_prayers text[]) returns boolean
language plpgsql security definer set search_path = public as $$
declare pr text[];
begin
  perform public.push_check(p_endpoint, p_p256dh, p_auth);
  select coalesce(array_agg(distinct x), '{}') into pr from unnest(coalesce(p_prayers, '{}')) x where x in ('fajr', 'dhuhr', 'maghrib');
  if cardinality(pr) = 0 then
    delete from push_azan where endpoint = p_endpoint;
    return false;
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'bad_location'; end if;
  if p_tz is null or length(p_tz) > 64 or not exists (select 1 from pg_timezone_names where name = p_tz) then raise exception 'bad_tz'; end if;
  insert into push_subscriptions (endpoint, p256dh, auth) values (p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  insert into push_azan (endpoint, lat, lng, tz, prayers) values (p_endpoint, round(p_lat::numeric, 2), round(p_lng::numeric, 2), p_tz, pr)
  on conflict (endpoint) do update set lat = excluded.lat, lng = excluded.lng, tz = excluded.tz, prayers = excluded.prayers, updated_at = now();
  return true;
end $$;

-- این دو تابع (از reminders.sql) اشتراکِ بی‌کد را حذف می‌کردند؛ گوشی‌ای که اعلان اذان دارد باید بماند.
-- (اگر reminders.sql دوباره اجرا شد، این فایل را هم دوباره اجرا کنید.)
create or replace function public.push_untarget(p_endpoint text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update push_subscriptions set group_number = null, participant_id = null where endpoint = p_endpoint;
  delete from push_subscriptions s where s.endpoint = p_endpoint and s.chl_codes = '{}' and s.reg_codes = '{}'
     and not exists (select 1 from push_azan a where a.endpoint = s.endpoint);
  return exists (select 1 from push_subscriptions where endpoint = p_endpoint);
end $$;

create or replace function public.push_drop_target(p_group integer, p_participant integer) returns void
language sql security definer set search_path = public as $$
  update public.push_subscriptions set group_number = null, participant_id = null
   where group_number = p_group and participant_id = p_participant;
  delete from public.push_subscriptions s
   where s.group_number is null and s.chl_codes = '{}' and s.reg_codes = '{}'
     and not exists (select 1 from public.push_azan a where a.endpoint = s.endpoint);
$$;

grant execute on function public.push_azan_set(text, text, text, double precision, double precision, text, text[]) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- زمان‌بندی (پیشنهادی، پس از deploy تابع daily-reminders؛ جدا اجرا شود):
-- زمان‌بندی فعلی site-notifications هر ۱۵ دقیقه است و اذان را هم می‌فرستد، ولی تا ۱۵ دقیقه دیرتر از اذان.
-- برای اینکه اعلان حداکثر یک دقیقه پس از اذان برسد، یک زمان‌بندی سبک فقط برای اذان (slot=azan) هر دقیقه
-- (یا '*/5 * * * *' برای حداکثر ۵ دقیقه تأخیر). REPLACE_WITH_CRON_SECRET همان CRON_SECRET تابع است.
--
-- select cron.schedule('azan-notifications', '* * * * *', $$
--   select net.http_post(url := 'https://wnswskzgfaywpmjhdgnx.supabase.co/functions/v1/daily-reminders?slot=azan',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"REPLACE_WITH_CRON_SECRET"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 30000)
-- $$);
--
-- برای توقف: select cron.unschedule('azan-notifications');
