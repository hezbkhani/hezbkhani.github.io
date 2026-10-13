-- چله‌ها: خواندن گروهی یک زیارت یا دعا (مثلاً زیارت عاشورا، حدیث کسا، آل یاسین) به مدت ۴۰ روز.
-- اجرا در Supabase SQL Editor پس از registration.sql و update-day-start-azan.sql. اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند.
-- روز هر چله مثل گزارش‌های حزب از اذان صبح تهران شروع می‌شود (تابع reading_day).

-- متن‌ها: سه متن آماده در پوشه chelleh سایت هستند. ردیفی با همان key در این جدول، متن آماده را جایگزین می‌کند؛
-- مدیر متن‌های دیگر (مثلاً دعای توسل) را هم از زبانه «چله‌ها» اضافه می‌کند.
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

-- هر چله: یک متن، تاریخ شروع و تعداد روز (پیش‌فرض ۴۰). status: open (در جریان) یا closed (بایگانی و پنهان).
-- joinable: آیا هنوز می‌شود به آن پیوست.
create table if not exists public.chelleh_rounds (
  id bigint generated always as identity primary key,
  title text not null check (length(title) between 1 and 80),
  text_key text not null check (text_key ~ '^[a-z0-9_-]{1,30}$'),
  description text not null default '' check (length(description) <= 1000),
  start_date date not null,
  days integer not null default 40 check (days between 1 and 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  joinable boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.chl_new_code() returns text
language sql volatile as $$
  select lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 15))::bit(60)::bigint) % 100000000)::text, 8, '0')
$$;

-- شرکت‌کنندگان. کد ۸ رقمی مثل کد پیگیری ثبت‌نام است و روی گوشی شخص نگه داشته می‌شود.
create table if not exists public.chelleh_members (
  id bigint generated always as identity primary key,
  round_id bigint not null references public.chelleh_rounds(id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  code text not null unique default public.chl_new_code(),
  created_at timestamptz not null default now()
);
create unique index if not exists chelleh_members_name on public.chelleh_members(round_id, public.reg_clean_name(name));

-- هر ردیف یعنی این شخص متن را در این روز خوانده است.
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

-- چله‌های جاری برای صفحه عمومی (بدون نام افراد).
create or replace function public.chl_rounds()
returns table (id bigint, title text, text_key text, description text, start_date date, days integer,
               joinable boolean, members integer, done_today integer, today date)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.text_key, r.description, r.start_date, r.days,
         r.joinable and public.reading_day() <= r.start_date + r.days - 1,
         (select count(*)::integer from chelleh_members m where m.round_id = r.id),
         (select count(*)::integer from chelleh_members m join chelleh_marks k on k.member_id = m.id
           where m.round_id = r.id and k.day = public.reading_day()),
         public.reading_day()
    from chelleh_rounds r
   where r.status = 'open'
   order by r.start_date desc, r.id desc
$$;

-- پیوستن به چله: کد ۸ رقمی برمی‌گرداند.
create or replace function public.chl_join(p_round bigint, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; nm text := public.reg_clean_name(p_name); c text;
begin
  select * into r from chelleh_rounds where id = p_round;
  if r.id is null or r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if not r.joinable or public.reading_day() > r.start_date + r.days - 1 then raise exception 'chl_not_joinable'; end if;
  if length(nm) < 2 or length(nm) > 60 or nm ~ '[<>{}"\\`]' then raise exception 'bad_name'; end if;
  if exists (select 1 from chelleh_members where round_id = p_round and public.reg_clean_name(name) = nm) then
    raise exception 'chl_duplicate_name';
  end if;
  loop
    c := public.chl_new_code();
    exit when not exists (select 1 from chelleh_members m where m.code = c);
  end loop;
  insert into chelleh_members (round_id, name, code) values (p_round, nm, c);
  return c;
end $$;

-- وضعیت چله‌های این دستگاه (با کدها): روزهای خوانده‌شده هر نفر.
create or replace function public.chl_lookup(p_codes text[])
returns table (code text, name text, round_id bigint, title text, text_key text, description text, start_date date,
               days integer, status text, members integer, done_today integer, today date, marked date[])
language sql stable security definer set search_path = public as $$
  select m.code, m.name, r.id, r.title, r.text_key, r.description, r.start_date, r.days, r.status,
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
declare m chelleh_members; r chelleh_rounds; t date := public.reading_day(); res date[];
begin
  select * into m from chelleh_members where code = btrim(p_code);
  if m.id is null then raise exception 'chl_member_not_found'; end if;
  select * into r from chelleh_rounds where id = m.round_id;
  if r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if p_day is null or p_day not in (t, t - 1) or p_day < r.start_date or p_day > r.start_date + r.days - 1 then
    raise exception 'chl_bad_day';
  end if;
  if p_done then insert into chelleh_marks (member_id, day) values (m.id, p_day) on conflict do nothing;
  else delete from chelleh_marks where member_id = m.id and day = p_day; end if;
  select coalesce(array_agg(day order by day), '{}') into res from chelleh_marks where member_id = m.id;
  return res;
end $$;

-- انصراف از چله (روزهای ثبت‌شده هم پاک می‌شود).
create or replace function public.chl_leave(p_code text) returns boolean
language sql security definer set search_path = public as $$
  with d as (delete from chelleh_members where code = btrim(p_code) returning 1) select exists (select 1 from d)
$$;

revoke all on function public.chl_new_code() from public, anon;
grant execute on function public.chl_new_code() to authenticated;
grant execute on function public.chl_rounds(), public.chl_join(bigint, text), public.chl_lookup(text[]),
  public.chl_mark(text, date, boolean), public.chl_leave(text) to anon, authenticated;
grant select on public.chelleh_texts to anon, authenticated;
grant select, insert, update, delete on public.chelleh_texts, public.chelleh_rounds, public.chelleh_members,
  public.chelleh_marks to authenticated;
