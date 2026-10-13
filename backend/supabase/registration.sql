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

create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from site_admins where email = lower(coalesce(auth.jwt() ->> 'email', '')))
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
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  round_id bigint not null references public.registration_rounds(id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  code text not null unique,
  participant_id integer check (participant_id between 1 and 120),
  created_at timestamptz not null default now(),
  unique (round_id, participant_id)
);
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
  select btrim(regexp_replace(translate(coalesce(n, ''), 'يىك', 'ییک'), '\s+', ' ', 'g'))
$$;

-- وقتی شمار ثبت‌نام‌ها به ۱۲۰ برسد دوره خودکار «تکمیل» می‌شود و اگر کسی انصراف دهد دوباره باز می‌شود.
create or replace function public.reg_refresh_status(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from registrations where round_id = p_round;
  update registration_rounds set status = case when n >= 120 then 'full' else 'open' end
   where id = p_round and status in ('open', 'full');
end $$;

-- دوره‌های جاری برای صفحه عمومی (بدون نام افراد).
create or replace function public.reg_rounds()
returns table (id bigint, platform text, title text, status text, registered integer, start_date date, group_number integer)
language sql stable security definer set search_path = public as $$
  select r.id, r.platform, r.title, r.status,
         (select count(*)::integer from registrations g where g.round_id = r.id),
         r.start_date, r.group_number
    from registration_rounds r
   where r.status <> 'closed'
   order by r.created_at desc
$$;

-- ثبت‌نام: یک کد پیگیری ۸ رقمی برمی‌گرداند که برای دیدن شناسه یا انصراف لازم است.
create or replace function public.reg_register(p_round bigint, p_name text)
returns table (code text, place integer)
language plpgsql security definer set search_path = public as $$
declare st text; nm text := public.reg_clean_name(p_name); c text; n integer;
begin
  select status into st from registration_rounds where id = p_round for update;
  if st is null then raise exception 'round_not_found'; end if;
  if st <> 'open' then raise exception 'round_not_open'; end if;
  if length(nm) < 2 or length(nm) > 60 or nm ~ '[<>{}"\\`]' then raise exception 'bad_name'; end if;
  if exists (select 1 from registrations where round_id = p_round and public.reg_clean_name(name) = nm) then
    raise exception 'duplicate_name';
  end if;
  select count(*) into n from registrations where round_id = p_round;
  if n >= 120 then raise exception 'round_not_open'; end if;
  loop
    c := lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 15))::bit(60)::bigint) % 100000000)::text, 8, '0');
    exit when not exists (select 1 from registrations r where r.code = c);
  end loop;
  insert into registrations (round_id, name, code) values (p_round, nm, c);
  perform public.reg_refresh_status(p_round);
  perform public.reg_auto_complete(p_round);
  return query select c, n + 1;
end $$;

-- وضعیت یک ثبت‌نام با کد پیگیری؛ شناسه فقط پس از اعلام نشان داده می‌شود.
create or replace function public.reg_lookup(p_code text)
returns table (round_id bigint, platform text, title text, status text, name text, place integer,
               registered integer, participant_id integer, start_date date, group_number integer)
language sql stable security definer set search_path = public as $$
  select r.id, r.platform, r.title, r.status, g.name,
         (select count(*)::integer from registrations x where x.round_id = g.round_id
             and (x.created_at, x.id) <= (g.created_at, g.id)),
         (select count(*)::integer from registrations x where x.round_id = g.round_id),
         case when r.status = 'announced' then g.participant_id end,
         r.start_date,
         case when r.status = 'announced' then r.group_number end
    from registrations g join registration_rounds r on r.id = g.round_id
   where g.code = btrim(p_code)
$$;

-- انصراف: تا پیش از دادن شناسه‌ها ممکن است.
create or replace function public.reg_unregister(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare rid bigint; st text;
begin
  select round_id into rid from registrations where code = btrim(p_code);
  if rid is null then return false; end if;
  select status into st from registration_rounds where id = rid for update;
  if st not in ('open', 'full') then raise exception 'ids_already_assigned'; end if;
  delete from registrations where code = btrim(p_code);
  perform public.reg_refresh_status(rid);
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

-- مدیر: حذف یک نفر (در هر وضعیتی پیش از اعلام). اگر شناسه‌ها داده شده بود، دوره به حالت پیش از شناسه برمی‌گردد.
create or replace function public.reg_admin_remove(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  select round_id into rid from registrations where id = p_id;
  if rid is null then return; end if;
  perform 1 from registration_rounds where id = rid for update;
  if (select status from registration_rounds where id = rid) = 'announced' then raise exception 'already_announced'; end if;
  delete from registrations where id = p_id;
  update registrations set participant_id = null where round_id = rid;
  update registration_rounds set status = 'open' where id = rid and status = 'assigned';
  perform public.reg_refresh_status(rid);
end $$;

-- مدیر: دادن شناسه ۱ تا ۱۲۰ به ترتیب ثبت‌نام (فقط وقتی دوره کامل است).
create or replace function public.reg_do_assign(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select status into st from registration_rounds where id = p_round for update;
  if st not in ('full', 'assigned') then raise exception 'round_not_full'; end if;
  update registrations set participant_id = null where round_id = p_round;
  update registrations g set participant_id = o.rn
    from (select id, row_number() over (order by created_at, id) as rn from registrations where round_id = p_round) o
   where g.id = o.id;
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
  select array_agg(name order by participant_id) into arr from registrations where round_id = p_round and participant_id is not null;
  if cardinality(arr) <> 120 then raise exception 'ids_not_assigned'; end if;
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
  select coalesce(max(number), 0) + 1 into num from site_groups;
  perform public.reg_do_announce(p_round, d, num,
    'گروه ' || case r.platform when 'bale' then 'بله' else 'تلگرام' end || ' ' || translate(num::text, '0123456789', '۰۱۲۳۴۵۶۷۸۹'));
  if r.auto_next then
    insert into registration_rounds (platform, title, auto_announce, auto_next, start_after_days)
    values (r.platform, r.title, true, true, r.start_after_days);
  end if;
end $$;

revoke all on function public.reg_refresh_status(bigint), public.reg_do_assign(bigint), public.reg_do_announce(bigint, date, integer, text),
  public.reg_auto_complete(bigint) from public, anon, authenticated;
revoke all on function public.reg_admin_add(bigint, text), public.reg_admin_remove(bigint), public.reg_assign_ids(bigint),
  public.reg_announce(bigint, date, integer, text) from public, anon;
grant execute on function public.reg_rounds(), public.reg_register(bigint, text), public.reg_lookup(text),
  public.reg_unregister(text) to anon, authenticated;
grant execute on function public.reg_admin_add(bigint, text), public.reg_admin_remove(bigint), public.reg_assign_ids(bigint),
  public.reg_announce(bigint, date, integer, text) to authenticated;
grant select on public.site_groups to anon, authenticated;
grant select, insert, update, delete on public.site_groups, public.registration_rounds, public.registrations to authenticated;
