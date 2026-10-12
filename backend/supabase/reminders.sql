-- یادآوری روزانه با اعلان مرورگر (Web Push).
-- اجرا یک‌بار در Supabase SQL Editor (پس از schema.sql و update-day-start-azan.sql). اجرای دوباره بی‌خطر است.
-- زمان‌بندی ارسال (ساعت ۱۰ و ۱۹ به وقت ایران) در انتهای همین فایل است و جداگانه اجرا می‌شود.

-- هر مرورگر/گوشی یک اشتراک دارد (endpoint یکتا) که به یک گروه و شناسه وصل است.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  group_number integer not null check (group_number > 0),
  participant_id integer not null check (participant_id between 1 and 120),
  created_at timestamptz not null default now(),
  last_morning date,
  last_evening date
);
-- بازدیدکنندگان مستقیم به این جدول دسترسی ندارند؛ فقط از راه دو تابع زیر اشتراک می‌سازند یا لغو می‌کنند.
alter table public.push_subscriptions enable row level security;

-- ساخت یا جایگزینی اشتراک این دستگاه. فقط سرویس‌های اعلان شناخته‌شده (گوگل، اپل، موزیلا، مایکروسافت) پذیرفته می‌شوند.
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_group integer, p_participant integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_endpoint is null or length(p_endpoint) > 1000
     or p_endpoint !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' then
    raise exception 'bad_endpoint';
  end if;
  if p_p256dh !~ '^[A-Za-z0-9_-]{80,100}=*$' or p_auth !~ '^[A-Za-z0-9_-]{16,32}=*$' then raise exception 'bad_keys'; end if;
  if p_group is null or p_group < 1 or p_participant is null or p_participant not between 1 and 120 then raise exception 'bad_participant'; end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, group_number, participant_id)
  values (p_endpoint, p_p256dh, p_auth, p_group, p_participant)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
    group_number = excluded.group_number, participant_id = excluded.participant_id,
    created_at = now(), last_morning = null, last_evening = null;
end $$;

-- لغو اشتراک. endpoint را فقط خود دستگاه می‌داند.
create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint
$$;

revoke all on function public.push_subscribe(text, text, text, integer, integer) from public;
revoke all on function public.push_unsubscribe(text) from public;
grant execute on function public.push_subscribe(text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.push_unsubscribe(text) to anon, authenticated;

-- مدیر تعداد مشترکان را می‌بیند (بدون endpoint).
create or replace function public.push_stats()
returns table (group_number integer, subscribers bigint) language sql security definer set search_path = public as $$
  select group_number, count(*) from public.push_subscriptions where public.is_site_admin() group by group_number order by group_number
$$;
grant execute on function public.push_stats() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- زمان‌بندی (پس از deploy تابع daily-reminders اجرا شود):
-- ۱) در Supabase: Integrations → Cron و pg_net را فعال کنید (یا Database → Extensions → pg_cron و pg_net).
-- ۲) REPLACE_WITH_CRON_SECRET را در هر دو خط با همان CRON_SECRET که در Secrets تابع گذاشتید عوض کنید.
-- ۳) فقط این بخش را انتخاب و اجرا کنید. ایران از ۱۴۰۱ ساعت تابستانی ندارد: ۱۰:۰۰ تهران = ۰۶:۳۰ UTC و ۱۹:۰۰ تهران = ۱۵:۳۰ UTC.
--
-- select cron.schedule('quran-reminder-morning', '30 6 * * *', $$
--   select net.http_post(url := 'https://wnswskzgfaywpmjhdgnx.supabase.co/functions/v1/daily-reminders?slot=morning',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"REPLACE_WITH_CRON_SECRET"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000)
-- $$);
-- select cron.schedule('quran-reminder-evening', '30 15 * * *', $$
--   select net.http_post(url := 'https://wnswskzgfaywpmjhdgnx.supabase.co/functions/v1/daily-reminders?slot=evening',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"REPLACE_WITH_CRON_SECRET"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000)
-- $$);
--
-- برای توقف: select cron.unschedule('quran-reminder-morning'); select cron.unschedule('quran-reminder-evening');
