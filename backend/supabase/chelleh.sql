-- چله‌ها: خواندن گروهی یک زیارت یا دعا (مثلاً زیارت عاشورا، حدیث کسا، آل یاسین) به مدت ۴۰ روز.
-- اجرا در Supabase SQL Editor پس از registration.sql و update-day-start-azan.sql. اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند؛
-- پس از هر به‌روزرسانی این فایل، کل آن را دوباره اجرا کنید.
-- روز هر چله مثل گزارش‌های حزب از اذان صبح تهران شروع می‌شود (تابع reading_day).
--
-- ساختار:
--   chelleh_types   نوع‌های چله که در منوی ثبت‌نام سایت دیده می‌شوند (مدیر اضافه یا ویرایش می‌کند).
--                   capacity خالی = بدون محدودیت و همیشه باز: هر کس از روز پیوستن چله خودش را شروع می‌کند.
--                   capacity عدد (مثلاً ۳۰ یا ۱۲۰) = دوره‌ای: با پر شدن ظرفیت دوره خودکار شروع می‌شود و دوره بعد باز می‌شود.
--   chelleh_rounds  دوره‌های هر نوع. start_date خالی یعنی «در حال ثبت‌نام، هنوز شروع نشده».
--                   personal یعنی دوره همیشه‌باز که شروع هر نفر جداست (chelleh_members.start_date).
--   chelleh_members شرکت‌کنندگان با کد ۸ رقمی که روی گوشی‌شان نگه داشته می‌شود.
--   chelleh_marks   هر ردیف یعنی این شخص در این روز خوانده است.

-- ---------- متن‌ها ----------
-- سه متن آماده در پوشه chelleh سایت هستند. ردیفی با همان key در این جدول، متن آماده را جایگزین می‌کند.
create table if not exists public.chelleh_texts (
  key text primary key check (key ~ '^[a-z0-9_-]{1,30}$'),
  title text not null check (length(title) between 1 and 80),
  about text not null default '' check (length(about) <= 500),
  sections jsonb not null check (jsonb_typeof(sections) = 'array'),
  updated_at timestamptz not null default now()
);
alter table public.chelleh_texts enable row level security;
drop policy if exists "anyone reads chelleh texts" on public.chelleh_texts;
create policy "anyone reads chelleh texts" on public.chelleh_texts for select to anon, authenticated using (true);
drop policy if exists "admin manages chelleh texts" on public.chelleh_texts;
create policy "admin manages chelleh texts" on public.chelleh_texts for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

-- ---------- نوع‌ها (منوی ثبت‌نام) ----------
create table if not exists public.chelleh_types (
  key text primary key check (key ~ '^[a-z0-9_-]{1,30}$'),
  title text not null check (length(title) between 1 and 80),
  text_key text not null check (text_key ~ '^[a-z0-9_-]{1,30}$'),
  description text not null default '' check (length(description) <= 1000),
  days integer not null default 40 check (days between 1 and 120),
  capacity integer check (capacity is null or capacity between 2 and 1000),
  start_after_days integer not null default 0 check (start_after_days between 0 and 30),
  times_per_day integer not null default 1 check (times_per_day between 1 and 100),
  auto_next boolean not null default true,
  visible boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.chelleh_types enable row level security;
drop policy if exists "anyone reads chelleh types" on public.chelleh_types;
create policy "anyone reads chelleh types" on public.chelleh_types for select to anon, authenticated
  using (visible or public.is_site_admin());
drop policy if exists "admin manages chelleh types" on public.chelleh_types;
create policy "admin manages chelleh types" on public.chelleh_types for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
-- سه نوع پیش‌فرض: بدون محدودیت و همیشه باز. اگر مدیر تغییرشان داده یا حذفشان کرده باشد، دوباره ساخته نمی‌شوند.
do $$
begin
  if not exists (select 1 from public.chelleh_types) then
    insert into public.chelleh_types (key, title, text_key, sort) values
      ('ashura', 'چله زیارت عاشورا', 'ashura', 1),
      ('kisa', 'چله حدیث کسا', 'kisa', 2),
      ('alyasin', 'چله زیارت آل یاسین', 'alyasin', 3);
  end if;
end $$;

-- ---------- دوره‌ها ----------
create table if not exists public.chelleh_rounds (
  id bigint generated always as identity primary key,
  title text not null check (length(title) between 1 and 80),
  text_key text not null check (text_key ~ '^[a-z0-9_-]{1,30}$'),
  description text not null default '' check (length(description) <= 1000),
  start_date date,
  days integer not null default 40 check (days between 1 and 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  joinable boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.chelleh_rounds alter column start_date drop not null;
alter table public.chelleh_rounds add column if not exists type_key text references public.chelleh_types(key) on delete set null;
alter table public.chelleh_rounds add column if not exists number integer not null default 1;
alter table public.chelleh_rounds add column if not exists capacity integer check (capacity is null or capacity between 2 and 1000);
alter table public.chelleh_rounds add column if not exists personal boolean not null default false;
alter table public.chelleh_rounds add column if not exists start_after_days integer not null default 0;
alter table public.chelleh_rounds add column if not exists times_per_day integer not null default 1;
create index if not exists chelleh_rounds_type on public.chelleh_rounds(type_key, status);

create or replace function public.chl_new_code() returns text
language sql volatile as $$
  select lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 15))::bit(60)::bigint) % 100000000)::text, 8, '0')
$$;

create table if not exists public.chelleh_members (
  id bigint generated always as identity primary key,
  round_id bigint not null references public.chelleh_rounds(id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  code text not null unique default public.chl_new_code(),
  created_at timestamptz not null default now()
);
-- شروع شخصی (فقط در دوره‌های همیشه‌باز)؛ در دوره‌های گروهی خالی است و شروع دوره ملاک است.
alter table public.chelleh_members add column if not exists start_date date;
create unique index if not exists chelleh_members_name on public.chelleh_members(round_id, public.reg_clean_name(name));

create table if not exists public.chelleh_marks (
  member_id bigint not null references public.chelleh_members(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (member_id, day)
);

alter table public.chelleh_rounds enable row level security;
alter table public.chelleh_members enable row level security;
alter table public.chelleh_marks enable row level security;
-- بازدیدکنندگان مستقیم به این جدول‌ها دسترسی ندارند؛ فقط از تابع‌های chl_* پایین استفاده می‌کنند.
drop policy if exists "admin manages chelleh rounds" on public.chelleh_rounds;
create policy "admin manages chelleh rounds" on public.chelleh_rounds for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "admin manages chelleh members" on public.chelleh_members;
create policy "admin manages chelleh members" on public.chelleh_members for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "admin manages chelleh marks" on public.chelleh_marks;
create policy "admin manages chelleh marks" on public.chelleh_marks for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

-- ---------- منطق داخلی ----------
-- ساختن دوره تازه برای یک نوع، با تنظیمات همان نوع.
create or replace function public.chl_new_round(p_type text, p_personal boolean, p_start date default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare t chelleh_types; rid bigint;
begin
  select * into t from chelleh_types where key = p_type;
  if t.key is null then raise exception 'chl_not_found'; end if;
  insert into chelleh_rounds (title, text_key, description, start_date, days, type_key, number, capacity, personal,
                              start_after_days, times_per_day)
  values (t.title, t.text_key, t.description, case when p_personal then null else p_start end, t.days, t.key,
          (select coalesce(max(number), 0) + 1 from chelleh_rounds where type_key = t.key),
          case when p_personal then null else t.capacity end, p_personal, t.start_after_days, t.times_per_day)
  returning id into rid;
  return rid;
end $$;

-- پس از هر پیوستن: اگر ظرفیت دوره پر شد، پیوستن بسته می‌شود؛ دوره‌ای که هنوز شروع نشده خودکار شروع می‌شود
-- و اگر auto_next روشن باشد دوره بعد باز می‌شود.
create or replace function public.chl_fill_check(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; n integer; t chelleh_types;
begin
  select * into r from chelleh_rounds where id = p_round for update;
  if r.id is null or r.personal or r.capacity is null or r.status <> 'open' then return; end if;
  select count(*) into n from chelleh_members where round_id = r.id;
  if n < r.capacity then return; end if;
  update chelleh_rounds set joinable = false,
         start_date = coalesce(start_date, public.reading_day() + start_after_days)
   where id = r.id;
  select * into t from chelleh_types where key = r.type_key;
  if t.key is not null and t.auto_next and t.capacity is not null and not exists (
       select 1 from chelleh_rounds x where x.type_key = t.key and x.status = 'open' and x.joinable and not x.personal
          and x.id <> r.id) then
    perform public.chl_new_round(t.key, false);
  end if;
end $$;

-- دوره‌ای که پیوستن به آن الان ممکن است: اول دوره‌های گروهی باز (قدیمی‌ترین)، وگرنه دوره همیشه‌باز، وگرنه دوره تازه.
create or replace function public.chl_round_for(p_type text) returns bigint
language plpgsql security definer set search_path = public as $$
declare t chelleh_types; rid bigint;
begin
  select * into t from chelleh_types where key = p_type for update;
  if t.key is null then raise exception 'chl_not_found'; end if;
  select x.id into rid from chelleh_rounds x
   where x.type_key = t.key and x.status = 'open' and x.joinable and not x.personal
     and (x.capacity is null or (select count(*) from chelleh_members m where m.round_id = x.id) < x.capacity)
     and (x.start_date is null or public.reading_day() <= x.start_date + x.days - 1)
   order by x.id limit 1;
  if rid is not null then return rid; end if;
  if t.capacity is null then
    select x.id into rid from chelleh_rounds x
     where x.type_key = t.key and x.status = 'open' and x.joinable and x.personal order by x.id limit 1;
    return coalesce(rid, public.chl_new_round(t.key, true));
  end if;
  return public.chl_new_round(t.key, false);
end $$;

-- ---------- برای بازدیدکنندگان ----------
-- منوی ثبت‌نام: نوع‌های قابل نمایش با وضعیت دوره‌ای که الان ثبت‌نام می‌پذیرد.
drop function if exists public.chl_types();
create or replace function public.chl_types()
returns table (key text, title text, text_key text, description text, days integer, capacity integer,
               start_after_days integer, times_per_day integer, round_id bigint, round_number integer,
               round_start date, waiting integer, active integer, today date)
language sql stable security definer set search_path = public as $$
  select t.key, t.title, t.text_key, t.description, t.days, t.capacity, t.start_after_days, t.times_per_day,
         o.id, o.number, o.start_date,
         (select count(*)::integer from chelleh_members m where m.round_id = o.id),
         (select count(*)::integer from chelleh_members m join chelleh_rounds r on r.id = m.round_id
           where r.type_key = t.key and r.status = 'open'
             and coalesce(m.start_date, r.start_date) <= public.reading_day()
             and public.reading_day() <= coalesce(m.start_date, r.start_date) + r.days - 1),
         public.reading_day()
    from chelleh_types t
    left join lateral (
      select x.id, x.number, x.start_date from chelleh_rounds x
       where x.type_key = t.key and x.status = 'open' and x.joinable and not x.personal
         and (x.capacity is null or (select count(*) from chelleh_members m where m.round_id = x.id) < x.capacity)
         and (x.start_date is null or public.reading_day() <= x.start_date + x.days - 1)
       order by x.id limit 1) o on true
   where t.visible
   order by t.sort, t.created_at
$$;

create or replace function public.chl_add_member(p_round bigint, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; nm text := public.reg_clean_name(p_name); c text;
begin
  select * into r from chelleh_rounds where id = p_round for update;
  if r.id is null or r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if length(nm) < 2 or length(nm) > 60 or nm ~ '[<>{}"\\`]' then raise exception 'bad_name'; end if;
  if exists (select 1 from chelleh_members where round_id = p_round and public.reg_clean_name(name) = nm) then
    raise exception 'chl_duplicate_name';
  end if;
  loop
    c := public.chl_new_code();
    exit when not exists (select 1 from chelleh_members m where m.code = c);
  end loop;
  insert into chelleh_members (round_id, name, code, start_date)
  values (p_round, nm, c, case when r.personal then public.reading_day() + r.start_after_days end);
  perform public.chl_fill_check(p_round);
  return c;
end $$;

-- ثبت‌نام از منو: کد ۸ رقمی برمی‌گرداند.
create or replace function public.chl_join_type(p_type text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from chelleh_types where key = p_type and visible) then raise exception 'chl_not_found'; end if;
  return public.chl_add_member(public.chl_round_for(p_type), p_name);
end $$;

-- پیوستن به یک دوره مشخص (برای دوره‌های قدیمی بدون نوع).
create or replace function public.chl_join(p_round bigint, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds;
begin
  select * into r from chelleh_rounds where id = p_round;
  if r.id is null or r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if not r.joinable or (r.start_date is not null and public.reading_day() > r.start_date + r.days - 1)
     or (r.capacity is not null and (select count(*) from chelleh_members where round_id = r.id) >= r.capacity) then
    raise exception 'chl_not_joinable';
  end if;
  return public.chl_add_member(p_round, p_name);
end $$;

-- دوره‌های قدیمی (بدون نوع)؛ نسخه اول سایت از آن استفاده می‌کرد.
create or replace function public.chl_rounds()
returns table (id bigint, title text, text_key text, description text, start_date date, days integer,
               joinable boolean, members integer, done_today integer, today date)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.text_key, r.description, r.start_date, r.days,
         r.joinable and (r.start_date is null or public.reading_day() <= r.start_date + r.days - 1),
         (select count(*)::integer from chelleh_members m where m.round_id = r.id),
         (select count(*)::integer from chelleh_members m join chelleh_marks k on k.member_id = m.id
           where m.round_id = r.id and k.day = public.reading_day()),
         public.reading_day()
    from chelleh_rounds r
   where r.status = 'open' and r.type_key is null
   order by r.start_date desc nulls first, r.id desc
$$;

-- وضعیت چله‌های این دستگاه (با کدها). start_date شروع خود این شخص است (خالی یعنی دوره هنوز پر نشده).
drop function if exists public.chl_lookup(text[]);
create or replace function public.chl_lookup(p_codes text[])
returns table (code text, name text, round_id bigint, type_key text, number integer, title text, text_key text,
               description text, start_date date, days integer, status text, capacity integer, personal boolean,
               times_per_day integer, members integer, done_today integer, today date, marked date[])
language sql stable security definer set search_path = public as $$
  select m.code, m.name, r.id, r.type_key, r.number, r.title, r.text_key, r.description,
         coalesce(m.start_date, r.start_date), r.days, r.status, r.capacity, r.personal, r.times_per_day,
         (select count(*)::integer from chelleh_members x where x.round_id = r.id),
         (select count(*)::integer from chelleh_members x join chelleh_marks k on k.member_id = x.id
           where x.round_id = r.id and k.day = public.reading_day()),
         public.reading_day(),
         coalesce((select array_agg(k.day order by k.day) from chelleh_marks k where k.member_id = m.id), '{}')
    from chelleh_members m join chelleh_rounds r on r.id = m.round_id
   where m.code = any (p_codes[1:20])
$$;

-- ثبت یا برداشتن «خواندم» برای امروز، یا دیروز اگر فراموش شده بود.
create or replace function public.chl_mark(p_code text, p_day date, p_done boolean) returns date[]
language plpgsql security definer set search_path = public as $$
declare m chelleh_members; r chelleh_rounds; s date; t date := public.reading_day(); res date[];
begin
  select * into m from chelleh_members where code = btrim(p_code);
  if m.id is null then raise exception 'chl_member_not_found'; end if;
  select * into r from chelleh_rounds where id = m.round_id;
  if r.status <> 'open' then raise exception 'chl_not_found'; end if;
  s := coalesce(m.start_date, r.start_date);
  if s is null or s > t then raise exception 'chl_not_started'; end if;
  if p_day is null or p_day not in (t, t - 1) or p_day < s or p_day > s + r.days - 1 then
    raise exception 'chl_bad_day';
  end if;
  if p_done then insert into chelleh_marks (member_id, day) values (m.id, p_day) on conflict do nothing;
  else delete from chelleh_marks where member_id = m.id and day = p_day; end if;
  select coalesce(array_agg(day order by day), '{}') into res from chelleh_marks where member_id = m.id;
  return res;
end $$;

-- انصراف از چله (روزهای ثبت‌شده هم پاک می‌شود). اگر دوره هنوز شروع نشده بود، جای خالی دوباره باز می‌شود.
create or replace function public.chl_leave(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m chelleh_members; r chelleh_rounds;
begin
  select * into m from chelleh_members where code = btrim(p_code);
  if m.id is null then return false; end if;
  select * into r from chelleh_rounds where id = m.round_id for update;
  delete from chelleh_members where id = m.id;
  if r.start_date is null and not r.personal and r.status = 'open' then
    update chelleh_rounds set joinable = true where id = r.id;
  end if;
  return true;
end $$;

-- ---------- برای مدیر ----------
-- پس از ویرایش یک نوع: دوره‌هایی که هنوز شروع نشده‌اند و دوره همیشه‌باز با تنظیمات تازه هماهنگ می‌شوند.
-- دوره‌های در جریان دست نمی‌خورند.
create or replace function public.chl_admin_sync_type(p_type text) returns void
language plpgsql security definer set search_path = public as $$
declare t chelleh_types; x record;
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  select * into t from chelleh_types where key = p_type;
  if t.key is null then raise exception 'chl_not_found'; end if;
  update chelleh_rounds set title = t.title, text_key = t.text_key, description = t.description, days = t.days,
         times_per_day = t.times_per_day, start_after_days = t.start_after_days
   where type_key = t.key and status = 'open' and (personal or start_date is null);
  if t.capacity is null then
    -- بدون محدودیت: دوره‌های در انتظار، همیشه‌باز می‌شوند و اعضایشان از روز شروع خودشان می‌خوانند.
    update chelleh_members m set start_date = public.reading_day() + t.start_after_days
      from chelleh_rounds r
     where r.id = m.round_id and r.type_key = t.key and r.status = 'open' and not r.personal and r.start_date is null;
    update chelleh_rounds set personal = true, capacity = null
     where type_key = t.key and status = 'open' and not personal and start_date is null;
    -- فقط یک دوره همیشه‌باز عضو تازه می‌گیرد؛ دوره‌های همیشه‌باز خالیِ اضافه پاک می‌شوند.
    select min(id) into x from chelleh_rounds where type_key = t.key and status = 'open' and personal;
    delete from chelleh_rounds r where r.type_key = t.key and r.status = 'open' and r.personal and r.id <> x.min
       and not exists (select 1 from chelleh_members m where m.round_id = r.id);
    update chelleh_rounds set joinable = (id = x.min) where type_key = t.key and status = 'open' and personal;
  else
    -- دوره‌ای: دوره همیشه‌باز دیگر عضو تازه نمی‌گیرد (اعضای فعلی ادامه می‌دهند).
    update chelleh_rounds set joinable = false where type_key = t.key and status = 'open' and personal;
    update chelleh_rounds set capacity = t.capacity
     where type_key = t.key and status = 'open' and not personal and start_date is null;
    for x in select id from chelleh_rounds where type_key = t.key and status = 'open' and not personal and start_date is null loop
      perform public.chl_fill_check(x.id);
    end loop;
  end if;
end $$;

-- مدیر: باز کردن دوره تازه (با تاریخ شروع مشخص، یا بی‌تاریخ تا با پر شدن ظرفیت شروع شود).
create or replace function public.chl_admin_new_round(p_type text, p_start date) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  if p_start is null and (select capacity from chelleh_types where key = p_type) is null then raise exception 'chl_need_start'; end if;
  return public.chl_new_round(p_type, false, p_start);
end $$;

-- مدیر: شروع همین امروز، حتی اگر ظرفیت پر نشده باشد.
create or replace function public.chl_admin_start(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; t chelleh_types;
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  select * into r from chelleh_rounds where id = p_round for update;
  if r.id is null or r.personal or r.start_date is not null then return; end if;
  if not exists (select 1 from chelleh_members where round_id = r.id) then raise exception 'chl_empty'; end if;
  update chelleh_rounds set start_date = public.reading_day(), joinable = false where id = r.id;
  select * into t from chelleh_types where key = r.type_key;
  if t.key is not null and t.auto_next and t.capacity is not null and not exists (
       select 1 from chelleh_rounds x where x.type_key = t.key and x.status = 'open' and x.joinable and not x.personal) then
    perform public.chl_new_round(t.key, false);
  end if;
end $$;

-- مدیر: افزودن نام به یک دوره (مثلاً کسی که در پیام‌رسان اعلام کرده)؛ مثل ثبت‌نام عادی، ظرفیت را هم بررسی می‌کند.
create or replace function public.chl_admin_add(p_round bigint, p_name text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  return public.chl_add_member(p_round, p_name);
end $$;

revoke all on function public.chl_new_code(), public.chl_new_round(text, boolean, date), public.chl_fill_check(bigint),
  public.chl_round_for(text), public.chl_add_member(bigint, text) from public, anon, authenticated;
grant execute on function public.chl_new_code() to authenticated;
revoke all on function public.chl_admin_sync_type(text), public.chl_admin_new_round(text, date),
  public.chl_admin_start(bigint), public.chl_admin_add(bigint, text) from public, anon;
grant execute on function public.chl_types(), public.chl_join_type(text, text), public.chl_rounds(), public.chl_join(bigint, text),
  public.chl_lookup(text[]), public.chl_mark(text, date, boolean), public.chl_leave(text) to anon, authenticated;
grant execute on function public.chl_admin_sync_type(text), public.chl_admin_new_round(text, date),
  public.chl_admin_start(bigint), public.chl_admin_add(bigint, text) to authenticated;
grant select on public.chelleh_texts, public.chelleh_types to anon, authenticated;
grant select, insert, update, delete on public.chelleh_texts, public.chelleh_types, public.chelleh_rounds,
  public.chelleh_members, public.chelleh_marks to authenticated;
