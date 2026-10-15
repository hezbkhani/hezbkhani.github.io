-- اعلان‌های سایت (Web Push): سهم امروز حزب‌خوانی، برنامه امروز چله و دوره‌های قرآن، خبر شروع، یادآوری گزارش،
-- رسیدن جا از فهرست رزرو، خبر تازه دوره و پیام همگانی مدیر.
-- اجرا در Supabase SQL Editor (پس از schema.sql و update-day-start-azan.sql و registration.sql). اجرای دوباره بی‌خطر است.
-- زمان‌بندی ارسال در انتهای همین فایل است و جداگانه اجرا می‌شود. متن و ساعت هر نوع اعلان از «مدیریت › اعلان‌ها» تنظیم می‌شود.

-- هر مرورگر/گوشی یک اشتراک دارد (endpoint یکتا). group_number/participant_id: شناسه حزب‌خوانی (اختیاری)؛
-- chl_codes: کدهای چله و دوره‌های قرآن روی همین گوشی؛ reg_codes: کدهای پیگیری ثبت‌نام حزب‌خوانی.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  group_number integer check (group_number > 0),
  participant_id integer check (participant_id between 1 and 120),
  created_at timestamptz not null default now(),
  last_morning date,
  last_evening date
);
alter table public.push_subscriptions alter column group_number drop not null;
alter table public.push_subscriptions alter column participant_id drop not null;
alter table public.push_subscriptions add column if not exists chl_codes text[] not null default '{}';
alter table public.push_subscriptions add column if not exists reg_codes text[] not null default '{}';
-- انتخاب خود کاربر روی این گوشی: {"off": [نوع‌های خاموش], "times": {نوع: "HH:MM"}}. خالی = همان تنظیم مدیر.
alter table public.push_subscriptions add column if not exists prefs jsonb not null default '{}';
create index if not exists push_subscriptions_target on public.push_subscriptions (group_number, participant_id);
-- بازدیدکنندگان مستقیم به این جدول دسترسی ندارند؛ فقط از راه تابع‌های زیر اشتراک می‌سازند یا لغو می‌کنند.
alter table public.push_subscriptions enable row level security;

-- اعلان‌هایی که فرستاده شده (برای اینکه هیچ اعلانی دو بار نرسد). key مثل chl_daily:<عضو>:<روز>.
create table if not exists public.push_sent (
  endpoint text not null references public.push_subscriptions(endpoint) on delete cascade on update cascade,
  key text not null,
  at timestamptz not null default now(),
  primary key (endpoint, key)
);
alter table public.push_sent enable row level security;

-- گزارش هر بار ارسال، برای مدیر.
create table if not exists public.push_runs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  slot text not null,
  stats jsonb not null default '{}'
);
alter table public.push_runs enable row level security;
drop policy if exists "admin reads push runs" on public.push_runs;
create policy "admin reads push runs" on public.push_runs for select to authenticated using (public.is_site_admin());
revoke all on public.push_sent from anon, authenticated;
revoke insert, update, delete on public.push_runs from anon, authenticated;
grant select on public.push_runs to authenticated;

create or replace function public.push_check(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql immutable as $$
begin
  -- فقط سرویس‌های اعلان شناخته‌شده (گوگل، اپل، موزیلا، مایکروسافت) پذیرفته می‌شوند.
  if p_endpoint is null or length(p_endpoint) > 1000
     or p_endpoint !~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' then
    raise exception 'bad_endpoint';
  end if;
  if p_p256dh !~ '^[A-Za-z0-9_-]{80,100}=*$' or p_auth !~ '^[A-Za-z0-9_-]{16,32}=*$' then raise exception 'bad_keys'; end if;
end $$;

-- اشتراک این دستگاه برای سهم روزانه یک شناسه حزب‌خوانی (کدهای چله دست نمی‌خورد).
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_group integer, p_participant integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.push_check(p_endpoint, p_p256dh, p_auth);
  if p_group is null or p_group < 1 or p_participant is null or p_participant not between 1 and 120 then raise exception 'bad_participant'; end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, group_number, participant_id)
  values (p_endpoint, p_p256dh, p_auth, p_group, p_participant)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
    group_number = excluded.group_number, participant_id = excluded.participant_id;
end $$;

-- اشتراک این دستگاه با کدهای چله و ثبت‌نام آن (شناسه حزب‌خوانی دست نمی‌خورد). کدهای ناموجود کنار گذاشته می‌شوند؛
-- کد نادرستِ زیاد مثل جستجوی کد در محافظ حدس زدن (code_guard) شمرده می‌شود.
create or replace function public.push_join(p_endpoint text, p_p256dh text, p_auth text, p_chl text[], p_reg text[])
returns void language plpgsql security definer set search_path = public as $$
declare c text[]; r text[]; miss integer;
begin
  perform public.code_guard();
  perform public.push_check(p_endpoint, p_p256dh, p_auth);
  select coalesce(array_agg(distinct x), '{}') into c from unnest(coalesce(p_chl, '{}')) x
   where x ~ '^\d{8}$' and exists (select 1 from chelleh_members m where m.code = x);
  select coalesce(array_agg(distinct x), '{}') into r from unnest(coalesce(p_reg, '{}')) x
   where x ~ '^\d{8}$' and exists (select 1 from registrations g where g.code = x);
  miss := cardinality(array(select distinct x from unnest(coalesce(p_chl, '{}') || coalesce(p_reg, '{}')) x)) - cardinality(c) - cardinality(r);
  -- گوشی عادی گاهی یکی دو کد قدیمیِ حذف‌شده دارد؛ بیش از آن یعنی حدس زدن.
  if miss > 2 then perform public.code_guard(miss); end if;
  if cardinality(c) > 40 or cardinality(r) > 40 then raise exception 'too_many_codes'; end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, chl_codes, reg_codes)
  values (p_endpoint, p_p256dh, p_auth, c, r)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth,
    chl_codes = excluded.chl_codes, reg_codes = excluded.reg_codes;
end $$;

-- لغو یادآوری حزب‌خوانی این دستگاه. اگر اعلان دیگری (چله) نمانده باشد، اشتراک کامل حذف می‌شود. خروجی: هنوز اشتراک هست؟
create or replace function public.push_untarget(p_endpoint text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update push_subscriptions set group_number = null, participant_id = null where endpoint = p_endpoint;
  delete from push_subscriptions where endpoint = p_endpoint and chl_codes = '{}' and reg_codes = '{}';
  return exists (select 1 from push_subscriptions where endpoint = p_endpoint);
end $$;

-- لغو همه اعلان‌ها. endpoint را فقط خود دستگاه می‌داند.
create or replace function public.push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint
$$;

-- وضعیت اشتراک این دستگاه (برای نشان دادن «فعال است» در سایت).
create or replace function public.push_status(p_endpoint text)
returns table (group_number integer, participant_id integer, chl integer, reg integer)
language sql security definer set search_path = public as $$
  select s.group_number, s.participant_id, cardinality(s.chl_codes), cardinality(s.reg_codes)
    from public.push_subscriptions s where s.endpoint = p_endpoint
$$;

-- تنظیم اعلان‌های این گوشی به انتخاب خود کاربر (کدام نوع خاموش، و ساعت دلخواه). p_prefs = null فقط می‌خواند.
-- خروجی: تنظیم ذخیره‌شده، یا null اگر این گوشی اشتراک ندارد.
create or replace function public.push_prefs(p_endpoint text, p_prefs jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb; off jsonb; times jsonb;
begin
  if p_prefs is null then return (select prefs from push_subscriptions where endpoint = p_endpoint); end if;
  select coalesce(jsonb_agg(distinct x), '[]') into off
    from jsonb_array_elements_text(case when jsonb_typeof(p_prefs->'off') = 'array' then p_prefs->'off' else '[]' end) x
   where x ~ '^[a-z_]{3,30}$';
  select coalesce(jsonb_object_agg(k, t), '{}') into times
    from jsonb_each_text(case when jsonb_typeof(p_prefs->'times') = 'object' then p_prefs->'times' else '{}' end) e(k, t)
   where k ~ '^[a-z_]{3,30}$' and t ~ '^([01]\d|2[0-3]):[0-5]\d$';
  if jsonb_array_length(off) > 30 or (select count(*) from jsonb_object_keys(times)) > 30 then raise exception 'too_many'; end if;
  v := case when off = '[]' and times = '{}' then '{}' else jsonb_build_object('off', off, 'times', times) end;
  update push_subscriptions set prefs = v where endpoint = p_endpoint;
  return case when found then v else null end;
end $$;

-- کسی که از گروه حزب‌خوانی انصراف داده: یادآوری شناسه‌اش (که حالا مال نفر دیگری است) از گوشی او برداشته می‌شود.
create or replace function public.push_drop_target(p_group integer, p_participant integer) returns void
language sql security definer set search_path = public as $$
  update public.push_subscriptions set group_number = null, participant_id = null
   where group_number = p_group and participant_id = p_participant;
  delete from public.push_subscriptions
   where group_number is null and chl_codes = '{}' and reg_codes = '{}';
$$;

-- گوشی‌ای که با کد ثبت‌نام مشترک شده و هنوز شناسه حزب‌خوانی ندارد، با اعلام گروه خودکار به همان شناسه وصل می‌شود.
create or replace function public.push_autofollow() returns integer
language sql security definer set search_path = public as $$
  with x as (
    update public.push_subscriptions s set group_number = g.group_number, participant_id = g.participant_id
      from (select distinct on (s2.endpoint) s2.endpoint, r.group_number, x.participant_id
              from public.push_subscriptions s2
              join public.registrations x on x.code = any (s2.reg_codes)
              join public.registration_rounds r on r.id = x.round_id
             where s2.group_number is null and r.status = 'announced' and x.participant_id is not null
             order by s2.endpoint, r.start_date desc) g
     where s.endpoint = g.endpoint
    returning 1)
  select count(*)::integer from x
$$;

-- اعلان‌های چله، دوره‌های قرآن و ثبت‌نام که امروز (p_day، روز قرائت) نوبتشان است و هنوز فرستاده نشده‌اند.
-- p_types: نوع‌هایی که الان باید فرستاده شوند (تابع daily-reminders بر اساس ساعت‌های تنظیم‌شده انتخاب می‌کند).
-- p_endpoint: فقط یک دستگاه؛ p_force: بدون توجه به ارسال قبلی (برای «ارسال آزمایشی»).
-- متن اعلان را تابع daily-reminders از روی data می‌سازد.
create or replace function public.push_due(p_types text[], p_day date default public.reading_day(now()),
                                           p_endpoint text default null, p_force boolean default false)
returns table (endpoint text, p256dh text, auth text, type text, key text, data jsonb)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  with subs as (
    select * from push_subscriptions s where p_endpoint is null or s.endpoint = p_endpoint
  ), mem as (
    select s.endpoint, s.p256dh, s.auth, m.id as mid, m.name, m.reserve, m.promoted_at, m.replaced_name,
           r.id as rid, r.title, r.kind, r.days, r.times_per_day, r.news, r.news_at, r.text_key,
           coalesce(m.start_date, r.start_date) as s,
           coalesce(m.slot, (select count(*)::integer from chelleh_members x where x.round_id = r.id and not x.reserve
                               and (x.created_at, x.id) <= (m.created_at, m.id))) as slot,
           exists (select 1 from chelleh_marks k where k.member_id = m.id and k.day = p_day) as marked,
           (select count(*)::integer from chelleh_marks k where k.member_id = m.id and k.day < p_day) as before
      from subs s
      join chelleh_members m on m.code = any (s.chl_codes)
      join chelleh_rounds r on r.id = m.round_id
     where r.status = 'open'
  ), chl as (
    select mem.*, p_day - mem.s + 1 as n from mem
  ), ev as (
    -- برنامه امروز (روز اول: chl_start) و یادآوری عصر
    select t.type, t.type || ':' || c.mid || ':' || p_day as key, c.*
      from chl c cross join lateral (values (case when c.n = 1 then 'chl_start' else 'chl_daily' end), ('chl_evening')) t(type)
     where not c.reserve and c.s is not null and c.n >= 1 and not c.marked
       and (case when c.kind = 'page' then c.before < c.days else c.n <= c.days end)
    union all
    -- شروع از فردا
    select 'chl_tomorrow', 'chl_tomorrow:' || c.mid || ':' || c.s, c.*
      from chl c where not c.reserve and c.s = p_day + 1
    union all
    -- از فهرست رزرو به گروه اصلی آمد
    select 'chl_promoted', 'chl_promoted:' || c.mid, c.*
      from chl c where not c.reserve and c.promoted_at > now() - interval '2 days'
    union all
    -- خبر تازه دوره
    select 'chl_news', 'chl_news:' || c.rid || ':' || floor(extract(epoch from c.news_at))::bigint, c.*
      from chl c where c.news_at > now() - interval '2 days' and btrim(c.news) <> ''
  ), chl_out as (
    select ev.endpoint, ev.p256dh, ev.auth, ev.type, ev.key,
           jsonb_build_object('name', ev.name, 'course', ev.title, 'kind', ev.kind, 'day', ev.n, 'days', ev.days,
             'start', ev.s, 'slot', ev.slot, 'page', least(ev.days, ev.before + 1), 'times', ev.times_per_day,
             'text_key', ev.text_key, 'news', ev.news, 'replaced', ev.replaced_name) as data
      from ev
  ), reg as (
    select s.endpoint, s.p256dh, s.auth, x.id as xid, x.name, x.participant_id, x.promoted_at, r.id as rid,
           r.platform, r.start_date, r.group_number, r.announced_at, g.name as group_name
      from subs s
      join registrations x on x.code = any (s.reg_codes)
      join registration_rounds r on r.id = x.round_id
      left join site_groups g on g.number = r.group_number
     where r.status = 'announced' and x.participant_id is not null
  ), reg_out as (
    select reg.endpoint, reg.p256dh, reg.auth,
           case when reg.promoted_at > reg.announced_at then 'hezb_promoted' else 'hezb_ready' end,
           case when reg.promoted_at > reg.announced_at then 'hezb_promoted:' || reg.xid else 'hezb_ready:' || reg.xid || ':' || reg.rid end,
           jsonb_build_object('name', reg.name, 'id', reg.participant_id, 'group', coalesce(reg.group_name, 'گروه ' || reg.group_number),
             'group_number', reg.group_number, 'start', reg.start_date, 'platform', reg.platform)
      from reg
     where greatest(reg.announced_at, reg.promoted_at) > now() - interval '2 days'
  ), all_out as (select * from chl_out union all select * from reg_out)
  select a.* from all_out a
   where a.type = any (p_types)
     and (p_force or not exists (select 1 from push_sent p where p.endpoint = a.endpoint and p.key = a.key))
   order by a.endpoint, a.type, a.key;
end $$;

-- آمار برای مدیر (بدون endpoint).
drop function if exists public.push_stats();
create or replace function public.push_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not public.is_site_admin() then null else jsonb_build_object(
    'devices', (select count(*) from push_subscriptions),
    'hezb', (select count(*) from push_subscriptions where group_number is not null),
    'chl', (select count(*) from push_subscriptions where chl_codes <> '{}'),
    'reg', (select count(*) from push_subscriptions where reg_codes <> '{}'),
    'custom', (select count(*) from push_subscriptions where prefs <> '{}'),
    'groups', (select coalesce(jsonb_agg(jsonb_build_object('group', group_number, 'devices', n) order by group_number), '[]')
                 from (select group_number, count(*) n from push_subscriptions where group_number is not null group by 1) g),
    'sent_today', (select count(*) from push_sent where at >= date_trunc('day', now() at time zone 'Asia/Tehran') at time zone 'Asia/Tehran'),
    'runs', (select coalesce(jsonb_agg(jsonb_build_object('at', at, 'slot', slot, 'stats', stats) order by at desc), '[]')
               from (select * from push_runs order by at desc limit 15) r)
  ) end
$$;

-- پاکسازی سوابق قدیمی (تابع daily-reminders هر بار صدا می‌زند).
create or replace function public.push_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.push_sent where at < now() - interval '60 days';
  delete from public.push_runs where at < now() - interval '30 days';
$$;

revoke all on function public.push_check(text, text, text), public.push_drop_target(integer, integer), public.push_autofollow(),
  public.push_due(text[], date, text, boolean), public.push_cleanup() from public, anon, authenticated;
revoke all on function public.push_subscribe(text, text, text, integer, integer), public.push_join(text, text, text, text[], text[]),
  public.push_untarget(text), public.push_unsubscribe(text), public.push_status(text), public.push_prefs(text, jsonb), public.push_stats() from public;
revoke all on function public.push_stats() from anon;
grant execute on function public.push_subscribe(text, text, text, integer, integer), public.push_join(text, text, text, text[], text[]),
  public.push_untarget(text), public.push_unsubscribe(text), public.push_status(text), public.push_prefs(text, jsonb) to anon, authenticated;
grant execute on function public.push_stats() to authenticated;
grant execute on function public.push_due(text[], date, text, boolean), public.push_autofollow(), public.push_cleanup() to service_role;

-- ─────────────────────────────────────────────────────────────
-- زمان‌بندی (پس از deploy تابع daily-reminders اجرا شود):
-- ۱) در Supabase: Integrations → Cron و pg_net را فعال کنید (یا Database → Extensions → pg_cron و pg_net).
-- ۲) REPLACE_WITH_CRON_SECRET را با همان CRON_SECRET که در Secrets تابع گذاشتید عوض کنید.
-- ۳) فقط این بخش را انتخاب و اجرا کنید. هر ۱۵ دقیقه یک بار اجرا می‌شود و تابع خودش بر اساس ساعت‌هایی که
--    در «مدیریت › اعلان‌ها» گذاشته‌اید تصمیم می‌گیرد چه اعلانی را بفرستد (هیچ اعلانی دو بار نمی‌رود).
--    اگر قبلاً دو زمان‌بندی quran-reminder-morning و quran-reminder-evening را ساخته‌اید، اول آن‌ها را بردارید:
--    select cron.unschedule('quran-reminder-morning'); select cron.unschedule('quran-reminder-evening');
--
-- select cron.schedule('site-notifications', '*/15 * * * *', $$
--   select net.http_post(url := 'https://wnswskzgfaywpmjhdgnx.supabase.co/functions/v1/daily-reminders?slot=auto',
--     headers := '{"Content-Type":"application/json","x-cron-secret":"REPLACE_WITH_CRON_SECRET"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000)
-- $$);
--
-- برای توقف: select cron.unschedule('site-notifications');
