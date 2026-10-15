-- ثبت‌نام دوره جدید، فهرست گروه‌ها، تنظیمات سایت و فهرست مدیران در پایگاه داده.
-- اجرا در Supabase SQL Editor (پس از schema.sql). اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند؛
-- پس از هر به‌روزرسانی این فایل، کل آن را دوباره اجرا کنید.
-- ایمیل مدیر خودکار از سیاست گزارش‌ها (schema.sql) برداشته می‌شود. اگر schema.sql را اجرا نکرده‌اید،
-- در خط «insert into public.site_admins» پایین، REPLACE_WITH_ADMIN_EMAIL را با ایمیل مدیر عوض کنید.

create table if not exists public.site_admins (
  email text primary key check (email = lower(email) and email like '%@%'),
  added_at timestamptz not null default now()
);
alter table public.site_admins enable row level security;

do $$
declare src text; m text[];
begin
  select qual into src from pg_policies where schemaname = 'public' and tablename = 'daily_reports'
     and policyname = 'authenticated admin reads reports';
  m := regexp_match(coalesce(src, ''), '''([^'']+@[^'']+)''');
  if m is null then
    select prosrc into src from pg_proc where proname = 'is_site_admin' and pronamespace = 'public'::regnamespace;
    m := regexp_match(coalesce(src, ''), '''([^'']+@[^'']+)''');
  end if;
  if m is not null then insert into public.site_admins (email) values (lower(m[1])) on conflict do nothing; end if;
end $$;
insert into public.site_admins (email) select lower('REPLACE_WITH_ADMIN_EMAIL')
 where 'REPLACE_WITH_ADMIN_EMAIL' like '%@%' on conflict do nothing;

-- مدیر: حسابی که ایمیلش در این فهرست است و آن ایمیل تأیید شده (چون هر کسی می‌تواند حساب کاربری بسازد؛ accounts.sql).
create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from site_admins a join auth.users u on lower(u.email) = a.email
                  where u.id = auth.uid() and u.email_confirmed_at is not null)
$$;
drop policy if exists "admins manage admins" on public.site_admins;
create policy "admins manage admins" on public.site_admins for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
grant select, insert, delete on public.site_admins to authenticated;

-- تنظیمات سایت (اطلاعیه بالای صفحه، نمایش بخش ثبت‌نام، منبع فهرست گروه‌ها). همه می‌خوانند، فقط مدیر تغییر می‌دهد.
create table if not exists public.site_settings (
  key text primary key check (length(key) between 1 and 40),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "anyone reads settings" on public.site_settings;
create policy "anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admin manages settings" on public.site_settings;
create policy "admin manages settings" on public.site_settings for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

-- گزارش‌ها: مدیرانِ فهرست بالا هم بتوانند بخوانند (سیاست قبلی schema.sql هم می‌ماند).
drop policy if exists "site admins read reports" on public.daily_reports;
create policy "site admins read reports" on public.daily_reports for select to authenticated using (public.is_site_admin());

-- فهرست گروه‌ها (جایگزین groups/index.json و groups/group-N.txt). نام‌ها عمومی‌اند، همان‌طور که فایل‌ها عمومی بودند.
create table if not exists public.site_groups (
  number integer primary key check (number > 0),
  name text not null check (length(name) between 1 and 80),
  start_date date not null,
  names text[] not null check (cardinality(names) = 120),
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.site_groups enable row level security;
drop policy if exists "anyone reads visible groups" on public.site_groups;
create policy "anyone reads visible groups" on public.site_groups for select to anon, authenticated
  using (visible or public.is_site_admin());
drop policy if exists "admin manages groups" on public.site_groups;
create policy "admin manages groups" on public.site_groups for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

-- دوره‌های ثبت‌نام. وضعیت: open (باز) → full (۱۲۰ نفر، خودکار) → assigned (شناسه داده شد) → announced (اعلام شد)؛ closed یعنی بسته/بایگانی.
create table if not exists public.registration_rounds (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('telegram', 'bale')),
  title text not null check (length(title) between 1 and 80),
  status text not null default 'open' check (status in ('open', 'full', 'assigned', 'announced', 'closed')),
  start_date date,
  group_number integer,
  created_at timestamptz not null default now(),
  announced_at timestamptz
);
alter table public.registration_rounds add column if not exists auto_announce boolean not null default false;
alter table public.registration_rounds add column if not exists auto_next boolean not null default false;
alter table public.registration_rounds add column if not exists start_after_days integer not null default 1;
-- فهرست رزرو: پس از ۱۲۰ نفر، تا این تعداد نفر دیگر هم ثبت‌نام می‌کنند تا جای انصراف‌دهندگان را بگیرند.
alter table public.registration_rounds add column if not exists reserve_slots integer not null default 5;
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  round_id bigint not null references public.registration_rounds(id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  code text not null unique,
  participant_id integer check (participant_id between 1 and 120),
  created_at timestamptz not null default now(),
  unique (round_id, participant_id)
);
-- promoted_at: زمانی که این نفر از فهرست رزرو جای کسی را گرفت (برای نشان دادن پیام به او).
alter table public.registrations add column if not exists promoted_at timestamptz;
create index if not exists registrations_round on public.registrations(round_id, created_at);
alter table public.registration_rounds enable row level security;
alter table public.registrations enable row level security;
-- بازدیدکنندگان مستقیم به جدول‌ها دسترسی ندارند؛ فقط از تابع‌های reg_* پایین استفاده می‌کنند.
drop policy if exists "admin manages rounds" on public.registration_rounds;
create policy "admin manages rounds" on public.registration_rounds for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "admin manages registrations" on public.registrations;
create policy "admin manages registrations" on public.registrations for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

create or replace function public.reg_clean_name(n text) returns text
language sql immutable as $$
  -- نویسه‌های نامرئی و جهت‌دهنده (جز نیم‌فاصله) حذف می‌شوند تا نام تکراری یا گمراه‌کننده ساخته نشود.
  select btrim(regexp_replace(regexp_replace(translate(coalesce(n, ''), 'يىك', 'ییک'),
           '[\u200B\u200D\u200E\u200F\u202A-\u202E\u2060-\u2069\uFEFF[:cntrl:]]', '', 'g'), '\s+', ' ', 'g'))
$$;
-- این تابع در فهرست یکتای نام چله‌ها به کار رفته؛ پس از تغییرش فهرست دوباره ساخته می‌شود.
do $$ begin
  if to_regclass('public.chelleh_members_name') is not null then reindex index public.chelleh_members_name; end if;
end $$;

-- محافظ حدس زدن کد: کدهای ۸ رقمی (پیگیری ثبت‌نام و چله) کلید دسترسی به نام و ایمیل هر نفرند. هر کدِ ناموجود یک «خطا» است؛
-- بیش از ۳۰ خطا در ساعت از یک نشانی اینترنتی، یا ۱۵۰۰ خطا در ساعت از همه، تا پایان آن ساعت جستجوی کد را می‌بندد.
-- کاربر عادی کد خودش را دارد و تقریباً هیچ‌وقت به این حد نمی‌رسد؛ کسی که کدها را حدس می‌زند خیلی زود متوقف می‌شود.
create table if not exists public.code_misses (
  hour timestamptz not null,
  ip text not null,
  misses integer not null default 0,
  primary key (hour, ip)
);
alter table public.code_misses enable row level security;
revoke all on public.code_misses from anon, authenticated;

create or replace function public.code_guard(p_misses integer default 0) returns void
language plpgsql security definer set search_path = public as $$
declare h json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
        v_ip text := left(coalesce(h ->> 'cf-connecting-ip', btrim(split_part(h ->> 'x-forwarded-for', ',', 1)), 'unknown'), 60);
        hr timestamptz := date_trunc('hour', now());
begin
  if public.is_site_admin() then return; end if;
  if p_misses > 0 then
    insert into code_misses (hour, ip, misses) values (hr, v_ip, p_misses)
    on conflict (hour, ip) do update set misses = code_misses.misses + excluded.misses;
    delete from code_misses where hour < hr - interval '1 day';
  elsif coalesce((select misses from code_misses where hour = hr and code_misses.ip = v_ip), 0) >= 30
     or coalesce((select sum(misses) from code_misses where hour = hr), 0) >= 1500 then
    raise exception 'too_many_attempts';
  end if;
end $$;
revoke all on function public.code_guard(integer) from public, anon, authenticated;

-- وقتی شمار ثبت‌نام‌ها به ۱۲۰ برسد دوره خودکار «تکمیل» می‌شود و اگر کسی انصراف دهد دوباره باز می‌شود.
create or replace function public.reg_refresh_status(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from registrations where round_id = p_round;
  update registration_rounds set status = case when n >= 120 then 'full' else 'open' end
   where id = p_round and status in ('open', 'full');
end $$;

-- شمار اعضای اصلی و رزرو یک دوره. پیش از دادن شناسه، ۱۲۰ نفر اول اصلی‌اند و بقیه رزرو؛ پس از آن، هر که شناسه ندارد رزرو است.
create or replace function public.reg_counts(p_round bigint, out main integer, out reserve integer)
language sql stable security definer set search_path = public as $$
  select case when r.status in ('assigned', 'announced') then count(g.participant_id)::integer else least(count(g.id), 120)::integer end,
         case when r.status in ('assigned', 'announced') then (count(g.id) - count(g.participant_id))::integer else greatest(count(g.id) - 120, 0)::integer end
    from registration_rounds r left join registrations g on g.round_id = r.id
   where r.id = p_round group by r.status
$$;

-- دوره‌های جاری برای صفحه عمومی (بدون نام افراد).
drop function if exists public.reg_rounds();
create or replace function public.reg_rounds()
returns table (id bigint, platform text, title text, status text, registered integer, start_date date, group_number integer,
               reserved integer, reserve_slots integer)
language sql stable security definer set search_path = public as $$
  select r.id, r.platform, r.title, r.status, c.main, r.start_date, r.group_number, c.reserve, r.reserve_slots
    from registration_rounds r cross join lateral public.reg_counts(r.id) c
   where r.status <> 'closed'
   order by r.created_at desc
$$;

-- ثبت‌نام: یک کد پیگیری ۸ رقمی برمی‌گرداند که برای دیدن شناسه یا انصراف لازم است.
-- پس از ۱۲۰ نفر (حتی پس از اعلام گروه) تا reserve_slots نفر در فهرست رزرو ثبت می‌شوند.
create or replace function public.reg_register(p_round bigint, p_name text)
returns table (code text, place integer)
language plpgsql security definer set search_path = public as $$
declare st text; slots integer; nm text := public.reg_clean_name(p_name); c text; m integer; rs integer;
begin
  select status, reserve_slots into st, slots from registration_rounds where id = p_round for update;
  if st is null then raise exception 'round_not_found'; end if;
  if st = 'closed' then raise exception 'round_not_open'; end if;
  if length(nm) < 2 or length(nm) > 60 or nm ~ '[<>{}"\\`]' then raise exception 'bad_name'; end if;
  if exists (select 1 from registrations where round_id = p_round and public.reg_clean_name(name) = nm) then
    raise exception 'duplicate_name';
  end if;
  select x.main, x.reserve into m, rs from public.reg_counts(p_round) x;
  if m >= 120 and rs >= slots then raise exception 'round_not_open'; end if;
  loop
    c := lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 15))::bit(60)::bigint) % 100000000)::text, 8, '0');
    exit when not exists (select 1 from registrations r where r.code = c);
  end loop;
  insert into registrations (round_id, name, code) values (p_round, nm, c);
  perform public.reg_refresh_status(p_round);
  perform public.reg_auto_complete(p_round);
  perform public.reg_fill_slots(p_round, false);
  return query select c, m + rs + 1;
end $$;

-- وضعیت یک ثبت‌نام با کد پیگیری؛ شناسه فقط پس از اعلام نشان داده می‌شود.
-- reserve: در فهرست رزرو است (reserve_place: نوبت او در این فهرست)؛ promoted: از رزرو جای کسی را گرفته است.
drop function if exists public.reg_lookup_raw(text);
create or replace function public.reg_lookup_raw(p_code text)
returns table (round_id bigint, platform text, title text, status text, name text, place integer,
               registered integer, participant_id integer, start_date date, group_number integer,
               reserve boolean, reserve_place integer, promoted boolean)
language sql stable security definer set search_path = public as $$
  with b as (
    select g.*, r.platform, r.title, r.status, r.start_date, r.group_number, r.status in ('assigned', 'announced') as ided,
           (select count(*)::integer from registrations x where x.round_id = g.round_id
               and (x.created_at, x.id) <= (g.created_at, g.id)) as pos,
           (select count(*)::integer from registrations x where x.round_id = g.round_id and x.participant_id is null
               and (x.created_at, x.id) <= (g.created_at, g.id)) as npos
      from registrations g join registration_rounds r on r.id = g.round_id
     where g.code = btrim(p_code)
  ), c as (select b.*, case when ided then participant_id is null else pos > 120 end as res from b)
  select c.round_id, c.platform, c.title, c.status, c.name, c.pos, (select x.main from public.reg_counts(c.round_id) x),
         case when c.status = 'announced' then c.participant_id end, c.start_date,
         case when c.status = 'announced' then c.group_number end,
         c.res, case when not c.res then null when c.ided then c.npos else c.pos - 120 end,
         c.promoted_at is not null and not c.res
    from c
$$;

-- همان جستجو، با محافظ حدس زدن کد (code_guard).
drop function if exists public.reg_lookup(text);
create or replace function public.reg_lookup(p_code text)
returns table (round_id bigint, platform text, title text, status text, name text, place integer,
               registered integer, participant_id integer, start_date date, group_number integer,
               reserve boolean, reserve_place integer, promoted boolean)
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.code_guard();
  return query select * from public.reg_lookup_raw(p_code);
  if not found then perform public.code_guard(1); end if;
end $$;
revoke all on function public.reg_lookup_raw(text) from public, anon, authenticated;

-- پر کردن شناسه‌های خالیِ دوره‌ای که شناسه گرفته، از فهرست رزرو به ترتیب ثبت‌نام. اگر گروه اعلام شده، نام در گروه هم عوض می‌شود.
-- p_mark: این نفر از رزرو بالا آمده (پیام «جایگزین شدید» برایش نشان داده می‌شود).
create or replace function public.reg_fill_slots(p_round bigint, p_mark boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r registration_rounds; pid integer; x registrations;
begin
  select * into r from registration_rounds where id = p_round;
  if r.status not in ('assigned', 'announced') then return; end if;
  for pid in select s from generate_series(1, 120) s
              where not exists (select 1 from registrations g where g.round_id = p_round and g.participant_id = s) order by s loop
    select * into x from registrations where round_id = p_round and participant_id is null order by created_at, id limit 1;
    exit when x.id is null;
    update registrations set participant_id = pid, promoted_at = case when p_mark then now() else promoted_at end where id = x.id;
    if r.status = 'announced' then
      update site_groups set names[pid] = x.name, updated_at = now() where number = r.group_number;
    end if;
  end loop;
end $$;

-- بیرون رفتن یک نفر (انصراف یا حذف توسط مدیر). اگر عضو اصلی باشد، نفر اول رزرو خودکار جای او را می‌گیرد:
-- پیش از دادن شناسه به ترتیب ثبت‌نام، و پس از آن با همان شناسه (و در گروه اعلام‌شده، با همان شماره).
create or replace function public.reg_leave(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare g registrations; r registration_rounds; pos integer;
begin
  select * into g from registrations where id = p_id;
  if g.id is null then return; end if;
  select * into r from registration_rounds where id = g.round_id for update;
  -- پس از گرفتن قفل دوره دوباره خوانده می‌شود: اگر همزمان دو بار انصراف زده شده باشد، بار دوم کاری نمی‌کند.
  select * into g from registrations where id = p_id;
  if g.id is null then return; end if;
  if r.status = 'closed' then raise exception 'round_closed'; end if;
  select count(*) into pos from registrations x where x.round_id = g.round_id and (x.created_at, x.id) <= (g.created_at, g.id);
  delete from registrations where id = p_id;
  if r.status in ('open', 'full') then
    if pos <= 120 then
      update registrations set promoted_at = now()
       where id = (select id from registrations where round_id = g.round_id order by created_at, id offset 119 limit 1);
    end if;
    perform public.reg_refresh_status(g.round_id);
  else
    if g.participant_id is not null and r.status = 'announced' then
      update site_groups set names[g.participant_id] = 'جای خالی', updated_at = now() where number = r.group_number;
      -- یادآوری روزانه‌ای که برای این شناسه فعال بود به گوشی کسی که رفته است؛ برداشته می‌شود تا سهم نفر جایگزین برای او نرود.
      if to_regprocedure('public.push_drop_target(integer,integer)') is not null then
        execute 'select public.push_drop_target($1, $2)' using r.group_number, g.participant_id;
      elsif to_regclass('public.push_subscriptions') is not null then
        execute 'delete from public.push_subscriptions where group_number = $1 and participant_id = $2' using r.group_number, g.participant_id;
      end if;
    end if;
    perform public.reg_fill_slots(g.round_id, true);
  end if;
end $$;

-- انصراف با کد پیگیری، در هر مرحله تا وقتی دوره بسته نشده است.
create or replace function public.reg_unregister(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  perform public.code_guard();
  select id into rid from registrations where code = btrim(p_code);
  if rid is null then perform public.code_guard(1); return false; end if;
  perform public.reg_leave(rid);
  return true;
end $$;

-- مدیر: افزودن نام (مثلاً کسی که در پیام‌رسان ثبت‌نام کرده).
create or replace function public.reg_admin_add(p_round bigint, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  select r.code into c from public.reg_register(p_round, p_name) r;
  return c;
end $$;

-- مدیر: حذف یک نفر؛ مثل انصراف، نفر اول رزرو جای او را می‌گیرد.
create or replace function public.reg_admin_remove(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  perform public.reg_leave(p_id);
end $$;

-- مدیر: دادن شناسه ۱ تا ۱۲۰ به ترتیب ثبت‌نام (فقط وقتی دوره کامل است).
create or replace function public.reg_do_assign(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select status into st from registration_rounds where id = p_round for update;
  if st not in ('full', 'assigned') then raise exception 'round_not_full'; end if;
  -- اگر شناسه‌ها قبلاً داده شده، شناسه کسی عوض نمی‌شود (مثلاً جایگزینِ رزرو)؛ فقط جای خالی‌ها پر می‌شود.
  if st = 'assigned' then perform public.reg_fill_slots(p_round, false); return; end if;
  update registrations set participant_id = null where round_id = p_round;
  update registrations g set participant_id = o.rn
    from (select id, row_number() over (order by created_at, id) as rn from registrations where round_id = p_round) o
   where g.id = o.id and o.rn <= 120;
  update registration_rounds set status = 'assigned' where id = p_round;
end $$;

-- مدیر: اعلام دوره. گروه را با همین ۱۲۰ نام و تاریخ شروع در site_groups می‌سازد (یا شماره موجود را جایگزین می‌کند).
create or replace function public.reg_do_announce(p_round bigint, p_start date, p_group_number integer, p_group_name text) returns void
language plpgsql security definer set search_path = public as $$
declare st text; arr text[];
begin
  select status into st from registration_rounds where id = p_round for update;
  if st not in ('assigned', 'announced') then raise exception 'ids_not_assigned'; end if;
  if p_start is null or p_group_number is null or p_group_number < 1 then raise exception 'bad_input'; end if;
  -- شناسه‌ای که کسی ندارد (انصراف بدون رزرو) در گروه «جای خالی» نوشته می‌شود و با ثبت‌نام بعدی پر می‌شود.
  select array_agg(coalesce(g.name, 'جای خالی') order by s) into arr
    from generate_series(1, 120) s left join registrations g on g.round_id = p_round and g.participant_id = s;
  insert into site_groups (number, name, start_date, names, visible, updated_at)
  values (p_group_number, coalesce(nullif(btrim(p_group_name), ''), 'گروه ' || p_group_number), p_start, arr, true, now())
  on conflict (number) do update set name = excluded.name, start_date = excluded.start_date, names = excluded.names,
         visible = true, updated_at = now();
  update registration_rounds set status = 'announced', start_date = p_start, group_number = p_group_number,
         announced_at = coalesce(announced_at, now()) where id = p_round;
end $$;

-- مدیر (یا خودکار): دادن شناسه و اعلام. نسخه‌های reg_do_* بررسی مدیر ندارند و فقط از داخل پایگاه داده صدا زده می‌شوند.
create or replace function public.reg_assign_ids(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  perform public.reg_do_assign(p_round);
end $$;
create or replace function public.reg_announce(p_round bigint, p_start date, p_group_number integer, p_group_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  perform public.reg_do_announce(p_round, p_start, p_group_number, p_group_name);
end $$;

-- ثبت‌نام خودکار: وقتی دوره‌ای با auto_announce به ۱۲۰ نفر برسد، شناسه‌ها داده می‌شود، گروه ساخته و اعلام می‌شود
-- (تاریخ شروع: تاریخی که مدیر گذاشته، یا اگر نگذاشته/گذشته باشد، start_after_days روز بعد از امروز به وقت تهران)،
-- و اگر auto_next روشن باشد، ثبت‌نام دوره بعدِ همان پیام‌رسان خودکار باز می‌شود.
create or replace function public.reg_auto_complete(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r registration_rounds; d date; num integer; today date := (now() at time zone 'Asia/Tehran')::date;
begin
  select * into r from registration_rounds where id = p_round;
  if r.id is null or r.status <> 'full' or not r.auto_announce then return; end if;
  perform public.reg_do_assign(p_round);
  d := case when r.start_date is not null and r.start_date > today then r.start_date else today + greatest(r.start_after_days, 1) end;
  -- دو دوره که همزمان پر شوند نباید یک شماره گروه بگیرند.
  perform pg_advisory_xact_lock(hashtext('site_groups_number'));
  select coalesce(max(number), 0) + 1 into num from site_groups;
  perform public.reg_do_announce(p_round, d, num,
    'گروه ' || case r.platform when 'bale' then 'بله' else 'تلگرام' end || ' ' || translate(num::text, '0123456789', '۰۱۲۳۴۵۶۷۸۹'));
  if r.auto_next then
    insert into registration_rounds (platform, title, auto_announce, auto_next, start_after_days)
    values (r.platform, r.title, true, true, r.start_after_days);
  end if;
end $$;

revoke all on function public.reg_refresh_status(bigint), public.reg_do_assign(bigint), public.reg_do_announce(bigint, date, integer, text),
  public.reg_auto_complete(bigint), public.reg_fill_slots(bigint, boolean), public.reg_leave(bigint), public.reg_counts(bigint)
  from public, anon, authenticated;
revoke all on function public.reg_admin_add(bigint, text), public.reg_admin_remove(bigint), public.reg_assign_ids(bigint),
  public.reg_announce(bigint, date, integer, text) from public, anon;
grant execute on function public.reg_rounds(), public.reg_register(bigint, text), public.reg_lookup(text),
  public.reg_unregister(text) to anon, authenticated;
grant execute on function public.reg_admin_add(bigint, text), public.reg_admin_remove(bigint), public.reg_assign_ids(bigint),
  public.reg_announce(bigint, date, integer, text) to authenticated;
grant select on public.site_groups to anon, authenticated;
grant select, insert, update, delete on public.site_groups, public.registration_rounds, public.registrations to authenticated;
