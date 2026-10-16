-- دوره‌های منوی ثبت‌نام سایت: چله‌ها (خواندن گروهی یک زیارت، دعا یا سوره به مدت ۴۰ روز)، جزءخوانی و روزی یک صفحه قرآن.
-- اجرا در Supabase SQL Editor پس از registration.sql و update-day-start-azan.sql. اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند؛
-- پس از هر به‌روزرسانی این فایل، کل آن را دوباره اجرا کنید.
-- روز هر چله مثل گزارش‌های حزب از اذان صبح تهران شروع می‌شود (تابع reading_day).
--
-- ساختار:
--   chelleh_types   دوره‌هایی که در منوی ثبت‌نام سایت دیده می‌شوند (مدیر اضافه یا ویرایش می‌کند).
--                   kind: text (چله؛ همه هر روز کل متن را می‌خوانند)، juz (جزءخوانی گردشی؛ نفر k روز d جزء k+d-1)،
--                         page (روزی یک صفحه قرآن؛ هر کس از صفحه ۱ و از جای خودش ادامه می‌دهد)، hezb (ثبت‌نام حزب‌خوانی در registration.sql).
--                   start_mode: self = همیشه باز، هر کس از روز پیوستن خودش شروع می‌کند؛
--                               date = همه با هم در تاریخ next_start؛ دوره بعد پشت سرش (هر days روز) خودکار باز می‌شود؛
--                               fill = با پر شدن ظرفیت (capacity) دوره خودکار شروع می‌شود و دوره بعد باز می‌شود.
--                   capacity در حالت date اختیاری است (با پر شدن، ثبت‌نام آن دوره بسته می‌شود).
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
-- صوت‌ها: [{"name": "علی فانی", "url": "https://…mp3"}, …]
alter table public.chelleh_texts add column if not exists audio jsonb not null default '[]';
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
alter table public.chelleh_types add column if not exists kind text not null default 'text';
alter table public.chelleh_types add column if not exists start_mode text;
alter table public.chelleh_types add column if not exists next_start date;
-- فهرست رزرو: پس از پر شدن ظرفیت، این تعداد نفر دیگر هم ثبت‌نام می‌کنند تا جای کسی که انصراف می‌دهد را بگیرند.
alter table public.chelleh_types add column if not exists reserve integer not null default 0 check (reserve between 0 and 50);
update public.chelleh_types set start_mode = case when capacity is null then 'self' else 'fill' end where start_mode is null;
alter table public.chelleh_types alter column start_mode set default 'self', alter column start_mode set not null;
alter table public.chelleh_types drop constraint if exists chelleh_types_kind_check,
  add constraint chelleh_types_kind_check check (kind in ('text', 'juz', 'page', 'hezb'));
alter table public.chelleh_types drop constraint if exists chelleh_types_start_mode_check,
  add constraint chelleh_types_start_mode_check check (start_mode in ('self', 'date', 'fill') and (start_mode <> 'fill' or capacity is not null));
alter table public.chelleh_types drop constraint if exists chelleh_types_days_check,
  add constraint chelleh_types_days_check check (days between 1 and 1000);
alter table public.chelleh_types enable row level security;
drop policy if exists "anyone reads chelleh types" on public.chelleh_types;
create policy "anyone reads chelleh types" on public.chelleh_types for select to anon, authenticated
  using (visible or public.is_site_admin());
drop policy if exists "admin manages chelleh types" on public.chelleh_types;
create policy "admin manages chelleh types" on public.chelleh_types for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
-- نسخه داده‌های پیش‌فرض: هر نسخه فقط یک بار اعمال می‌شود؛ اگر مدیر بعداً چیزی را تغییر داد یا حذف کرد، دوباره برنمی‌گردد.
create table if not exists public.chelleh_meta (key text primary key, value text not null default '', updated_at timestamptz not null default now());
alter table public.chelleh_meta enable row level security;

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
alter table public.chelleh_rounds add column if not exists kind text not null default 'text';
alter table public.chelleh_rounds drop constraint if exists chelleh_rounds_days_check,
  add constraint chelleh_rounds_days_check check (days between 1 and 1000);
alter table public.chelleh_rounds add column if not exists news text not null default '' check (length(news) <= 1000);
alter table public.chelleh_rounds add column if not exists reserve integer not null default 0 check (reserve between 0 and 50);
-- زمان آخرین تغییر خبر دوره، تا اعلان «خبر تازه» فقط یک بار برای هر خبر فرستاده شود.
alter table public.chelleh_rounds add column if not exists news_at timestamptz;
create or replace function public.chl_news_stamp() returns trigger language plpgsql as $$
begin
  if new.news is distinct from old.news then new.news_at := case when btrim(new.news) = '' then null else now() end; end if;
  return new;
end $$;
drop trigger if exists chelleh_rounds_news_at on public.chelleh_rounds;
create trigger chelleh_rounds_news_at before update of news on public.chelleh_rounds
  for each row execute function public.chl_news_stamp();
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
-- ایمیل اختیاری برای اخبار دوره؛ فقط مدیر و خود شخص (با کدش) آن را می‌بینند.
alter table public.chelleh_members add column if not exists email text check (email is null or length(email) <= 120);

create or replace function public.chl_clean_email(p text) returns text
language plpgsql immutable as $$
declare e text := lower(btrim(coalesce(p, '')));
begin
  if e = '' then return null; end if;
  if length(e) > 120 or e !~ '^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$' then raise exception 'chl_bad_email'; end if;
  return e;
end $$;
-- جایگاه ثابت هر نفر در دوره (۱ تا ظرفیت؛ در جزءخوانی جزء شروع را تعیین می‌کند). نفر رزرو جایگاه ندارد
-- تا وقتی که جای کسی را بگیرد؛ promoted_at و replaced_name همان لحظه پر می‌شوند.
alter table public.chelleh_members add column if not exists slot integer;
alter table public.chelleh_members add column if not exists reserve boolean not null default false;
alter table public.chelleh_members add column if not exists promoted_at timestamptz;
alter table public.chelleh_members add column if not exists replaced_name text;
-- اعضای قبلی به ترتیب ثبت‌نام جایگاه می‌گیرند (فقط دوره‌هایی که هنوز هیچ جایگاهی ندارند).
update public.chelleh_members m set slot = o.n
  from (select x.id, row_number() over (partition by x.round_id order by x.created_at, x.id)::integer n
          from public.chelleh_members x join public.chelleh_rounds r on r.id = x.round_id
         where not r.personal and not x.reserve
           and not exists (select 1 from public.chelleh_members y where y.round_id = x.round_id and y.slot is not null)) o
 where o.id = m.id;
create unique index if not exists chelleh_members_slot on public.chelleh_members(round_id, slot) where slot is not null;
create unique index if not exists chelleh_members_name on public.chelleh_members(round_id, public.reg_clean_name(name));

create table if not exists public.chelleh_marks (
  member_id bigint not null references public.chelleh_members(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (member_id, day)
);

-- انصراف‌ها (از طرف خود شخص یا حذف به دست مدیر) و کسی که از فهرست رزرو جایش را گرفت.
create table if not exists public.chelleh_leaves (
  id bigint generated always as identity primary key,
  round_id bigint not null references public.chelleh_rounds(id) on delete cascade,
  name text not null,
  email text,
  slot integer,
  was_reserve boolean not null default false,
  by_admin boolean not null default false,
  replaced_by_id bigint,
  replaced_by_name text,
  replaced_by_email text,
  left_at timestamptz not null default now()
);
create index if not exists chelleh_leaves_round on public.chelleh_leaves(round_id);
alter table public.chelleh_leaves enable row level security;
drop policy if exists "admin manages chelleh leaves" on public.chelleh_leaves;
create policy "admin manages chelleh leaves" on public.chelleh_leaves for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

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
                              start_after_days, times_per_day, kind, reserve)
  values (t.title, t.text_key, t.description, case when p_personal then null else p_start end, t.days, t.key,
          (select coalesce(max(number), 0) + 1 from chelleh_rounds where type_key = t.key),
          case when p_personal then null else t.capacity end, p_personal, t.start_after_days, t.times_per_day, t.kind,
          case when p_personal or t.capacity is null then 0 else t.reserve end)
  returning id into rid;
  return rid;
end $$;

-- پس از هر پیوستن: اگر ظرفیت اصلی دوره پر شد، دوره‌ای که هنوز شروع نشده خودکار شروع می‌شود؛ وقتی فهرست رزرو هم
-- پر شد، پیوستن بسته می‌شود و اگر auto_next روشن باشد دوره بعد باز می‌شود.
create or replace function public.chl_fill_check(p_round bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; n integer; nr integer; t chelleh_types;
begin
  select * into r from chelleh_rounds where id = p_round for update;
  if r.id is null or r.personal or r.capacity is null or r.status <> 'open' then return; end if;
  select count(*) filter (where not reserve), count(*) filter (where reserve) into n, nr from chelleh_members where round_id = r.id;
  if n < r.capacity then return; end if;
  update chelleh_rounds set start_date = coalesce(start_date, public.reading_day() + start_after_days) where id = r.id;
  if n + nr < r.capacity + r.reserve then return; end if;
  update chelleh_rounds set joinable = false where id = r.id;
  select * into t from chelleh_types where key = r.type_key;
  if t.key is not null and t.auto_next and t.start_mode = 'fill' and not exists (
       select 1 from chelleh_rounds x where x.type_key = t.key and x.status = 'open' and x.joinable and not x.personal
          and x.id <> r.id) then
    perform public.chl_new_round(t.key, false);
  end if;
end $$;

-- آیا الان می‌شود به این دوره گروهی پیوست؟ تا روز سوم دوره هم (برای کسانی که دیر رسیده‌اند) باز است.
create or replace function public.chl_can_join(x chelleh_rounds) returns boolean
language sql stable security definer set search_path = public as $$
  select x.status = 'open' and x.joinable and not x.personal
     and (x.capacity is null or (select count(*) from chelleh_members m where m.round_id = x.id) < x.capacity + x.reserve)
     and (x.start_date is null or public.reading_day() <= x.start_date + least(2, x.days - 1))
$$;

-- حالت «تاریخ مشخص»: همیشه یک دوره آینده برای ثبت‌نام آماده باشد. دوره‌ها پشت سر هم می‌آیند
-- (شروع دوره بعد = شروع قبلی + days)؛ اولین دوره از next_start نوع شروع می‌شود.
create or replace function public.chl_ensure(p_type text) returns void
language plpgsql security definer set search_path = public as $$
declare t chelleh_types; d date := public.reading_day(); base date; last date;
begin
  select * into t from chelleh_types where key = p_type;
  if t.key is null or t.start_mode <> 'date' or t.kind = 'hezb' then return; end if;
  -- دوره آینده‌ای که هنوز جا دارد هست؟
  if exists (select 1 from chelleh_rounds x where x.type_key = t.key and x.start_date > d and public.chl_can_join(x)) then return; end if;
  perform pg_advisory_xact_lock(hashtext('chl_ensure:' || t.key));
  if exists (select 1 from chelleh_rounds x where x.type_key = t.key and x.start_date > d and public.chl_can_join(x)) then return; end if;
  select max(start_date) into last from chelleh_rounds where type_key = t.key and not personal and start_date is not null;
  if last is not null and not t.auto_next then return; end if;
  base := case when last is null then coalesce(t.next_start, d + 1) else greatest(last + t.days, coalesce(t.next_start, last + t.days)) end;
  if base <= d then base := base + ceil((d + 1 - base)::numeric / t.days)::integer * t.days; end if;
  perform public.chl_new_round(t.key, false, base);
end $$;

-- دوره‌ای که پیوستن به آن الان ممکن است: اول دوره‌های گروهی باز (قدیمی‌ترین)، وگرنه دوره همیشه‌باز، وگرنه دوره تازه.
create or replace function public.chl_round_for(p_type text) returns bigint
language plpgsql security definer set search_path = public as $$
declare t chelleh_types; rid bigint;
begin
  select * into t from chelleh_types where key = p_type for update;
  if t.key is null or t.kind = 'hezb' then raise exception 'chl_not_found'; end if;
  -- همیشه‌باز: دوره همیشه‌باز (دوره‌های تاریخ‌دار را شخص خودش از فهرست انتخاب می‌کند).
  if t.start_mode = 'self' then
    select x.id into rid from chelleh_rounds x
     where x.type_key = t.key and x.status = 'open' and x.joinable and x.personal order by x.id limit 1;
    return coalesce(rid, public.chl_new_round(t.key, true));
  end if;
  if t.start_mode = 'date' then perform public.chl_ensure(t.key); end if;
  select x.id into rid from chelleh_rounds x
   where x.type_key = t.key and public.chl_can_join(x)
   order by x.start_date nulls last, x.id limit 1;
  if rid is not null then return rid; end if;
  if t.start_mode = 'date' then raise exception 'chl_not_joinable'; end if;
  return public.chl_new_round(t.key, false);
end $$;

-- ---------- برای بازدیدکنندگان ----------
-- منوی ثبت‌نام: نوع‌های قابل نمایش با وضعیت دوره‌ای که الان ثبت‌نام می‌پذیرد.
drop function if exists public.chl_types();
create or replace function public.chl_types()
returns table (key text, title text, text_key text, description text, days integer, capacity integer,
               start_after_days integer, times_per_day integer, kind text, start_mode text,
               round_id bigint, round_number integer, round_start date, waiting integer, active integer, today date,
               reserve integer, reserved integer)
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  for k in select x.key from chelleh_types x where x.visible and x.start_mode = 'date' loop perform public.chl_ensure(k); end loop;
  return query
  select t.key, t.title, t.text_key, t.description, t.days, t.capacity, t.start_after_days, t.times_per_day, t.kind, t.start_mode,
         o.id, o.number, o.start_date,
         (select count(*)::integer from chelleh_members m where m.round_id = o.id and not m.reserve),
         (select count(*)::integer from chelleh_members m join chelleh_rounds r on r.id = m.round_id
           where r.type_key = t.key and r.status = 'open' and not m.reserve
             and coalesce(m.start_date, r.start_date) <= public.reading_day()
             and public.reading_day() <= coalesce(m.start_date, r.start_date) + r.days - 1),
         public.reading_day(),
         coalesce(o.reserve, case when t.capacity is null then 0 else t.reserve end),
         (select count(*)::integer from chelleh_members m where m.round_id = o.id and m.reserve)
    from chelleh_types t
    left join lateral (
      select x.id, x.number, x.start_date, x.reserve from chelleh_rounds x
       where x.type_key = t.key and public.chl_can_join(x)
       order by x.start_date nulls last, x.id limit 1) o on true
   where t.visible
   order by t.sort, t.created_at;
end $$;

create or replace function public.chl_add_member(p_round bigint, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; nm text := public.reg_clean_name(p_name); c text; n integer; nr integer;
        sl integer; res boolean := false;
begin
  select * into r from chelleh_rounds where id = p_round for update;
  if r.id is null or r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if length(nm) < 2 or length(nm) > 60 or nm ~ '[<>{}"\\`]' then raise exception 'bad_name'; end if;
  if exists (select 1 from chelleh_members where round_id = p_round and public.reg_clean_name(name) = nm) then
    raise exception 'chl_duplicate_name';
  end if;
  if not r.personal then
    -- ظرفیت اصلی پر است؟ پس فهرست رزرو (اگر جا دارد).
    select count(*) filter (where not reserve), count(*) filter (where reserve) into n, nr from chelleh_members where round_id = p_round;
    if r.capacity is not null and n >= r.capacity then
      if nr >= r.reserve then raise exception 'chl_not_joinable'; end if;
      res := true;
    else
      select min(g) into sl from generate_series(1, coalesce(r.capacity, n + 1)) g
       where not exists (select 1 from chelleh_members x where x.round_id = p_round and x.slot = g);
    end if;
  end if;
  loop
    c := public.chl_new_code();
    exit when not exists (select 1 from chelleh_members m where m.code = c);
  end loop;
  insert into chelleh_members (round_id, name, code, start_date, slot, reserve)
  values (p_round, nm, c, case when r.personal then public.reading_day() + r.start_after_days end, sl, res);
  perform public.chl_fill_check(p_round);
  return c;
end $$;

-- ثبت‌نام از منو: کد ۸ رقمی برمی‌گرداند.
drop function if exists public.chl_join_type(text, text);
create or replace function public.chl_join_type(p_type text, p_name text, p_email text default null) returns text
language plpgsql security definer set search_path = public as $$
declare e text := public.chl_clean_email(p_email); c text;
begin
  if not exists (select 1 from chelleh_types where key = p_type and visible) then raise exception 'chl_not_found'; end if;
  c := public.chl_add_member(public.chl_round_for(p_type), p_name);
  if e is not null then update chelleh_members set email = e where code = c; end if;
  return c;
end $$;

-- دوره‌های گروهی که الان ثبت‌نام دارند (وقتی مدیر چند دوره هم‌زمان باز کرده، شخص خودش انتخاب می‌کند).
drop function if exists public.chl_type_rounds(text);
create or replace function public.chl_type_rounds(p_type text)
returns table (id bigint, number integer, start_date date, capacity integer, members integer, news text, today date,
               reserve integer, reserved integer)
language plpgsql security definer set search_path = public as $$
begin
  perform public.chl_ensure(p_type);
  return query
  select x.id, x.number, x.start_date, x.capacity,
         (select count(*)::integer from chelleh_members m where m.round_id = x.id and not m.reserve), x.news, public.reading_day(),
         x.reserve, (select count(*)::integer from chelleh_members m where m.round_id = x.id and m.reserve)
    from chelleh_rounds x join chelleh_types t on t.key = x.type_key and t.visible
   where x.type_key = p_type and public.chl_can_join(x)
   order by x.start_date nulls last, x.id;
end $$;

-- ثبت یا تغییر ایمیل اخبار با کد چله (خالی یعنی حذف).
create or replace function public.chl_set_email(p_code text, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare e text := public.chl_clean_email(p_email);
begin
  perform public.code_guard();
  update chelleh_members set email = e where code = btrim(p_code);
  -- کد ناموجود: به‌جای خطا (که ثبتِ تلاش را برمی‌گرداند) شمرده می‌شود و null برمی‌گردد.
  if not found then perform public.code_guard(1); return null; end if;
  return e;
end $$;

-- پیوستن به یک دوره مشخص (دوره‌ای که شخص از فهرست انتخاب کرده، یا دوره‌های قدیمی بدون نوع).
drop function if exists public.chl_join(bigint, text);
create or replace function public.chl_join(p_round bigint, p_name text, p_email text default null) returns text
language plpgsql security definer set search_path = public as $$
declare r chelleh_rounds; e text := public.chl_clean_email(p_email); c text;
begin
  select * into r from chelleh_rounds where id = p_round;
  if r.id is null or r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if r.type_key is not null then
    -- مثل ثبت‌نام از منو، پیوستن‌های هم‌زمان به یک نوع پشت سر هم انجام می‌شوند تا از ظرفیت بیشتر نشود.
    perform 1 from chelleh_types where key = r.type_key and visible for update;
    if not found then raise exception 'chl_not_joinable'; end if;
    select * into r from chelleh_rounds where id = p_round;
    if not public.chl_can_join(r) then raise exception 'chl_not_joinable'; end if;
  elsif not r.joinable or (r.start_date is not null and public.reading_day() > r.start_date + r.days - 1)
     or (r.capacity is not null and (select count(*) from chelleh_members where round_id = r.id) >= r.capacity) then
    raise exception 'chl_not_joinable';
  end if;
  c := public.chl_add_member(p_round, p_name);
  if e is not null then update chelleh_members set email = e where code = c; end if;
  return c;
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
               times_per_day integer, members integer, done_today integer, today date, marked date[], email text, news text,
               kind text, slot integer, reserve boolean, reserve_pos integer, reserved integer, reserve_max integer,
               promoted_at timestamptz, replaced_name text, promoted_day date)
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.code_guard();
  return query
  select m.code, m.name, r.id, r.type_key, r.number, r.title, r.text_key, r.description,
         coalesce(m.start_date, r.start_date), r.days, r.status, r.capacity, r.personal, r.times_per_day,
         (select count(*)::integer from chelleh_members x where x.round_id = r.id and not x.reserve),
         (select count(*)::integer from chelleh_members x join chelleh_marks k on k.member_id = x.id
           where x.round_id = r.id and k.day = public.reading_day()),
         public.reading_day(),
         coalesce((select array_agg(k.day order by k.day) from chelleh_marks k where k.member_id = m.id), '{}'),
         m.email, r.news, r.kind,
         -- جایگاه این شخص در دوره (برای جزءخوانی: نفر اول جزء ۱ را شروع می‌کند، نفر دوم جزء ۲ و…).
         case when not m.reserve then coalesce(m.slot, (select count(*)::integer from chelleh_members x
           where x.round_id = r.id and not x.reserve and (x.created_at, x.id) <= (m.created_at, m.id))) end,
         m.reserve,
         case when m.reserve then (select count(*)::integer from chelleh_members x where x.round_id = r.id and x.reserve
                                    and (x.created_at, x.id) <= (m.created_at, m.id)) end,
         (select count(*)::integer from chelleh_members x where x.round_id = r.id and x.reserve),
         r.reserve, m.promoted_at, m.replaced_name, (m.promoted_at at time zone 'Asia/Tehran')::date
    from chelleh_members m join chelleh_rounds r on r.id = m.round_id
   where m.code = any (p_codes[1:20]);
  perform public.code_guard((select count(*)::integer from unnest(p_codes[1:20]) c
                              where not exists (select 1 from chelleh_members x where x.code = c)));
end $$;

-- ثبت یا برداشتن «خواندم» برای امروز، یا روزی تا ۷ روز گذشته اگر فراموش شده بود (همان LATE_DAYS در app.js).
create or replace function public.chl_mark(p_code text, p_day date, p_done boolean) returns date[]
language plpgsql security definer set search_path = public as $$
declare m chelleh_members; r chelleh_rounds; s date; t date := public.reading_day(); res date[];
begin
  perform public.code_guard();
  select * into m from chelleh_members where code = btrim(p_code);
  if m.id is null then perform public.code_guard(1); return null; end if;
  select * into r from chelleh_rounds where id = m.round_id;
  if r.status <> 'open' then raise exception 'chl_not_found'; end if;
  if m.reserve then raise exception 'chl_reserve'; end if;
  s := coalesce(m.start_date, r.start_date);
  if s is null or s > t then raise exception 'chl_not_started'; end if;
  -- روزی یک صفحه: تاریخ پایان ندارد؛ هر روزی که خوانده شود صفحه بعد است.
  if p_day is null or p_day > t or p_day < t - 7 or p_day < s or (r.kind <> 'page' and p_day > s + r.days - 1) then
    raise exception 'chl_bad_day';
  end if;
  if p_done then insert into chelleh_marks (member_id, day) values (m.id, p_day) on conflict do nothing;
  else delete from chelleh_marks where member_id = m.id and day = p_day; end if;
  select coalesce(array_agg(day order by day), '{}') into res from chelleh_marks where member_id = m.id;
  return res;
end $$;

-- انصراف از چله (روزهای ثبت‌شده هم پاک می‌شود) و ثبت آن برای مدیر. اگر از گروه اصلی بود و دوره تمام نشده،
-- نفر اول فهرست رزرو همان جایگاه را می‌گیرد (در جزءخوانی از همان جزء ادامه می‌دهد) و دفعه بعد که سایت را باز کند خبردار می‌شود.
create or replace function public.chl_remove(p_member bigint, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m chelleh_members; r chelleh_rounds; p chelleh_members; lid bigint; d date := public.reading_day();
begin
  select * into m from chelleh_members where id = p_member;
  if m.id is null then return; end if;
  select * into r from chelleh_rounds where id = m.round_id for update;
  select * into m from chelleh_members where id = p_member;
  if m.id is null then return; end if;
  insert into chelleh_leaves (round_id, name, email, slot, was_reserve, by_admin)
  values (r.id, m.name, m.email, m.slot, m.reserve, p_admin) returning id into lid;
  delete from chelleh_members where id = m.id;
  if not m.reserve and not r.personal and r.status = 'open'
     and (r.start_date is null or d <= r.start_date + r.days - 1) then
    select * into p from chelleh_members where round_id = r.id and reserve order by created_at, id limit 1 for update;
    if p.id is not null then
      update chelleh_members set reserve = false, slot = m.slot, promoted_at = now(), replaced_name = m.name where id = p.id;
      update chelleh_leaves set replaced_by_id = p.id, replaced_by_name = p.name, replaced_by_email = p.email where id = lid;
    end if;
  end if;
  -- جای خالی (در گروه یا فهرست رزرو) تا روز سوم دوره دوباره ثبت‌نام می‌پذیرد.
  if not r.personal and r.status = 'open' and (r.start_date is null or d <= r.start_date + least(2, r.days - 1)) then
    update chelleh_rounds set joinable = true where id = r.id;
  end if;
end $$;

create or replace function public.chl_leave(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare mid bigint;
begin
  perform public.code_guard();
  select id into mid from chelleh_members where code = btrim(p_code);
  if mid is null then perform public.code_guard(1); return false; end if;
  perform public.chl_remove(mid, false);
  return true;
end $$;

-- مدیر: حذف یک نفر از دوره؛ مثل انصراف ثبت می‌شود و نفر اول رزرو جایش را می‌گیرد.
create or replace function public.chl_admin_remove(p_member bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  perform public.chl_remove(p_member, true);
end $$;

-- ---------- برای مدیر ----------
-- پس از ویرایش یک نوع: دوره‌هایی که هنوز شروع نشده‌اند و دوره همیشه‌باز با تنظیمات تازه هماهنگ می‌شوند.
-- دوره‌های در جریان دست نمی‌خورند.
create or replace function public.chl_admin_sync_type(p_type text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  perform public.chl_sync_type(p_type);
end $$;

create or replace function public.chl_sync_type(p_type text) returns void
language plpgsql security definer set search_path = public as $$
declare t chelleh_types; x record; d date := public.reading_day(); first_id bigint;
begin
  select * into t from chelleh_types where key = p_type;
  if t.key is null then raise exception 'chl_not_found'; end if;
  if t.kind = 'hezb' then return; end if;
  -- دوره‌هایی که هنوز شروع نشده‌اند (و دوره همیشه‌باز) تنظیمات تازه را می‌گیرند؛ دوره‌های در جریان همان‌طور ادامه می‌دهند.
  update chelleh_rounds set title = t.title, text_key = t.text_key, description = t.description, days = t.days,
         times_per_day = t.times_per_day, start_after_days = t.start_after_days, kind = t.kind,
         reserve = case when personal or t.capacity is null then 0 else t.reserve end
   where type_key = t.key and status = 'open' and (personal or start_date is null or start_date > d);
  if t.start_mode <> 'self' then
    -- دوره همیشه‌باز دیگر عضو تازه نمی‌گیرد (اعضای فعلی ادامه می‌دهند).
    update chelleh_rounds set joinable = false where type_key = t.key and status = 'open' and personal;
  end if;
  if t.start_mode <> 'date' then
    -- دوره‌های تاریخ‌دارِ آینده که هنوز کسی ندارند دیگر لازم نیستند.
    delete from chelleh_rounds r where r.type_key = t.key and r.status = 'open' and not r.personal and r.start_date > d
       and not exists (select 1 from chelleh_members m where m.round_id = r.id);
  end if;
  if t.start_mode = 'self' then
    -- همیشه باز: دوره‌های در انتظار، همیشه‌باز می‌شوند و اعضایشان از روز شروع خودشان می‌خوانند.
    update chelleh_members m set start_date = d + t.start_after_days
      from chelleh_rounds r
     where r.id = m.round_id and r.type_key = t.key and r.status = 'open' and not r.personal and r.start_date is null;
    update chelleh_rounds set personal = true, capacity = null
     where type_key = t.key and status = 'open' and not personal and start_date is null;
    -- فقط یک دوره همیشه‌باز عضو تازه می‌گیرد؛ دوره‌های همیشه‌باز خالیِ اضافه پاک می‌شوند.
    select min(id) into first_id from chelleh_rounds where type_key = t.key and status = 'open' and personal;
    delete from chelleh_rounds r where r.type_key = t.key and r.status = 'open' and r.personal and r.id <> first_id
       and not exists (select 1 from chelleh_members m where m.round_id = r.id);
    update chelleh_rounds set joinable = (id = first_id) where type_key = t.key and status = 'open' and personal;
  elsif t.start_mode = 'fill' then
    update chelleh_rounds set capacity = t.capacity
     where type_key = t.key and status = 'open' and not personal and start_date is null;
    for x in select id from chelleh_rounds where type_key = t.key and status = 'open' and not personal and start_date is null loop
      perform public.chl_fill_check(x.id);
    end loop;
  else
    -- تاریخ مشخص: دوره‌های در انتظارِ تکمیل ظرفیت، تاریخ می‌گیرند؛ نزدیک‌ترین دوره آینده با تاریخ تازه شروع می‌شود.
    update chelleh_rounds set start_date = case when t.next_start > d then t.next_start else d + 1 end
     where type_key = t.key and status = 'open' and not personal and start_date is null;
    update chelleh_rounds set capacity = t.capacity
     where type_key = t.key and status = 'open' and not personal and start_date > d;
    if t.next_start > d then
      select id into first_id from chelleh_rounds where type_key = t.key and status = 'open' and not personal and start_date > d
       order by start_date, id limit 1;
      if first_id is not null then update chelleh_rounds set start_date = t.next_start where id = first_id; end if;
    end if;
    perform public.chl_ensure(t.key);
  end if;
end $$;

-- مدیر: باز کردن دوره تازه (با تاریخ شروع مشخص، یا بی‌تاریخ تا با پر شدن ظرفیت شروع شود).
create or replace function public.chl_admin_new_round(p_type text, p_start date) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  if p_start is null and (select start_mode from chelleh_types where key = p_type) is distinct from 'fill' then raise exception 'chl_need_start'; end if;
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
  if t.key is not null and t.auto_next and t.start_mode = 'fill' and not exists (
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

revoke all on function public.chl_clean_email(text), public.chl_can_join(chelleh_rounds), public.chl_ensure(text), public.chl_sync_type(text),
  public.chl_remove(bigint, boolean) from public, anon, authenticated;
revoke all on function public.chl_new_code(), public.chl_new_round(text, boolean, date), public.chl_fill_check(bigint),
  public.chl_round_for(text), public.chl_add_member(bigint, text) from public, anon, authenticated;
grant execute on function public.chl_new_code() to authenticated;
revoke all on function public.chl_admin_sync_type(text), public.chl_admin_new_round(text, date),
  public.chl_admin_start(bigint), public.chl_admin_add(bigint, text), public.chl_admin_remove(bigint) from public, anon;
grant execute on function public.chl_types(), public.chl_join_type(text, text, text), public.chl_rounds(), public.chl_join(bigint, text, text),
  public.chl_type_rounds(text), public.chl_set_email(text, text),
  public.chl_lookup(text[]), public.chl_mark(text, date, boolean), public.chl_leave(text) to anon, authenticated;
grant execute on function public.chl_admin_sync_type(text), public.chl_admin_new_round(text, date),
  public.chl_admin_start(bigint), public.chl_admin_add(bigint, text), public.chl_admin_remove(bigint) to authenticated;
grant select on public.chelleh_texts, public.chelleh_types to anon, authenticated;
grant select, insert, update, delete on public.chelleh_texts, public.chelleh_types, public.chelleh_rounds,
  public.chelleh_members, public.chelleh_marks, public.chelleh_leaves to authenticated;

-- ---------- دوره‌های پیش‌فرض منو ----------
-- هر نسخه فقط یک بار اعمال می‌شود (chelleh_meta)؛ تغییر یا حذفی که مدیر بعداً انجام دهد سر جایش می‌ماند.
-- چله‌ها: ۴۰ روزه، همه با هم از شنبه آینده (تاریخ در تنظیمات عوض می‌شود)، دوره‌ها پشت سر هم.
do $$
declare sat date := public.reading_day() + (6 - extract(dow from public.reading_day())::integer + 7) % 7;
begin
  if sat = public.reading_day() then sat := sat + 7; end if;
  if not exists (select 1 from public.chelleh_meta where key = 'seed_v2') then
    insert into public.chelleh_types (key, title, text_key, kind, start_mode, capacity, days, start_after_days, next_start, sort, description) values
      ('hezb', 'قرآن حزب‌خوانی', 'quran', 'hezb', 'fill', 120, 120, 0, null, 1, 'هر نفر شناسه‌ای از ۱ تا ۱۲۰ می‌گیرد و هر روز یک حزب می‌خواند؛ گروه ۱۲۰ نفره هر روز یک ختم کامل قرآن دارد.'),
      ('juz', 'قرآن جزءخوانی', 'quran', 'juz', 'fill', 30, 30, 1, null, 2, 'سی نفر، سی روز: نفر اول از جزء ۱ شروع می‌کند، نفر دوم از جزء ۲ و…؛ هر روز هر نفر یک جزء جلو می‌رود. هر روز یک ختم کامل و در پایان هر نفر یک ختم.'),
      ('page', 'قرآن روزی یک صفحه', 'quran', 'page', 'self', null, 604, 0, null, 3, 'هر روز یک صفحه قرآن، از صفحه اول؛ هر کس از روز ثبت‌نام خودش شروع می‌کند و هر روز از همان جایی که مانده ادامه می‌دهد.'),
      ('ashura', 'چله زیارت عاشورا', 'ashura', 'text', 'date', null, 40, 0, sat, 10, ''),
      ('alyasin', 'چله زیارت آل یاسین', 'alyasin', 'text', 'date', null, 40, 0, sat, 11, ''),
      ('kisa', 'چله حدیث کسا', 'kisa', 'text', 'date', null, 40, 0, sat, 12, ''),
      ('waqia', 'چله سوره واقعه', 'waqia', 'text', 'date', null, 40, 0, sat, 13, ''),
      ('dhariyat', 'چله سوره ذاریات', 'dhariyat', 'text', 'date', null, 40, 0, sat, 14, ''),
      ('muzzammil', 'چله سوره مزمل', 'muzzammil', 'text', 'date', null, 40, 0, sat, 15, ''),
      ('mashlool', 'چله دعای مشلول', 'mashlool', 'text', 'date', null, 40, 0, sat, 16, ''),
      ('ahd', 'چله دعای عهد', 'ahd', 'text', 'date', null, 40, 0, sat, 17, '')
    on conflict (key) do nothing;
    -- سه چله نسخه قبل (همیشه باز) به حالت «همه با هم از تاریخ مشخص» درمی‌آیند، اگر مدیر تغییرشان نداده باشد.
    update public.chelleh_types set start_mode = 'date', next_start = sat, sort = case key when 'ashura' then 10 when 'alyasin' then 11 else 12 end
     where key in ('ashura', 'kisa', 'alyasin') and start_mode = 'self' and capacity is null and kind = 'text';
    perform public.chl_sync_type(k) from unnest(array['ashura', 'kisa', 'alyasin']) k;
    insert into public.chelleh_meta (key, value) values ('seed_v2', now()::text);
  end if;
end $$;

-- نسخه ۳: فهرست رزرو ۵ نفره برای جزءخوانی.
do $$
begin
  if not exists (select 1 from public.chelleh_meta where key = 'seed_v3') then
    update public.chelleh_types set reserve = 5 where key = 'juz' and kind = 'juz' and reserve = 0;
    if found then perform public.chl_sync_type('juz'); end if;
    insert into public.chelleh_meta (key, value) values ('seed_v3', now()::text);
  end if;
end $$;

-- نسخه ۴: چله سوره فتح (متن از مصحف خود سایت، سوره ۴۸).
do $$
declare sat date := public.reading_day() + (6 - extract(dow from public.reading_day())::integer + 7) % 7;
begin
  if sat = public.reading_day() then sat := sat + 7; end if;
  if not exists (select 1 from public.chelleh_meta where key = 'seed_v4') then
    insert into public.chelleh_types (key, title, text_key, kind, start_mode, capacity, days, start_after_days, next_start, sort, description) values
      ('fath', 'چله سوره فتح', 'fath', 'text', 'date', null, 40, 0, sat, 18, '')
    on conflict (key) do nothing;
    if found then perform public.chl_sync_type('fath'); end if;
    insert into public.chelleh_meta (key, value) values ('seed_v4', now()::text);
  end if;
end $$;
