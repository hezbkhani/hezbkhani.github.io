-- ختم گروهی قرآن جزء به جزء (khatm.js و khatm-app.js، منوی ☰ › «ختم گروهی قرآن»، پیوند ?khatm=<شناسه>).
-- اجرا در Supabase SQL Editor (پس از registration.sql که is_site_admin و reg_clean_name را می‌سازد).
-- اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند (هیچ drop یا revoke ندارد).
--
-- هر ختم ۳۰ جزء دارد. جزءی که ردیفی در khatm_juz ندارد «باز» است. بازدیدکننده جزء را برمی‌دارد (ردیف با done=false)،
-- بعد «خواندم» می‌زند (done=true) یا پس می‌دهد (ردیف پاک می‌شود). جزء برداشته‌شده پس از hold_days روز بی‌خبر،
-- خودکار باز حساب می‌شود تا ختم گیر نکند.
-- برداشتن با کد تصادفی گوشی (localStorage: khDevice) است؛ فقط هش آن ذخیره می‌شود و به کسی برنمی‌گردد.
-- اگر کسی با حساب کاربری وارد شده باشد، auth.uid() هم کنار آن ذخیره می‌شود تا روی گوشی دیگرش هم جزءهایش را ببیند.
-- ختم‌هایی که مدیر می‌سازد «فهرست‌شده»اند و در منو برای همه دیده می‌شوند؛ ختمی که بازدیدکننده می‌سازد فقط با پیوندش باز می‌شود.
-- بازدیدکننده به جدول‌ها دسترسی مستقیم ندارد (RLS بدون سیاست برای anon)؛ همه از راه تابع‌های khatm_* با محدودیت.

create table if not exists public.khatms (
  id text primary key default substr(md5(gen_random_uuid()::text), 1, 10),  -- تصادفی، تا ختم‌های پیوندی حدس زده نشوند
  title text not null check (char_length(title) between 2 and 120),
  niyyat text not null default '' check (char_length(niyyat) <= 300),        -- نیت یا تقدیم، اختیاری
  hold_days integer not null default 3 check (hold_days between 1 and 30),
  listed boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed')),
  owner_hash text,                                                           -- هش کد گوشی سازنده (برای بستن ختم خودش)
  owner_user uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists khatms_listed_idx on public.khatms (listed, status, created_at desc);

create table if not exists public.khatm_juz (
  khatm_id text not null references public.khatms(id) on delete cascade,
  juz smallint not null check (juz between 1 and 30),
  done boolean not null default false,
  name text not null default '' check (char_length(name) <= 40),
  device_hash text not null,
  user_id uuid,
  taken_at timestamptz not null default now(),
  done_at timestamptz,
  primary key (khatm_id, juz)
);

-- شمارنده محدودیت (دقیقه‌ای و روزانه)؛ فقط تابع‌های پایین آن را می‌خوانند و می‌نویسند.
create table if not exists public.khatm_rate (
  bucket timestamptz not null,
  who text not null,
  n integer not null default 0,
  primary key (bucket, who)
);

alter table public.khatms enable row level security;
alter table public.khatm_juz enable row level security;
alter table public.khatm_rate enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'khatms' and policyname = 'admin manages khatms') then
    create policy "admin manages khatms" on public.khatms for all to authenticated
      using (public.is_site_admin()) with check (public.is_site_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'khatm_juz' and policyname = 'admin manages khatm juz') then
    create policy "admin manages khatm juz" on public.khatm_juz for all to authenticated
      using (public.is_site_admin()) with check (public.is_site_admin());
  end if;
end $$;
grant select, insert, update, delete on public.khatms, public.khatm_juz to authenticated;

-- ---------- کمکی‌ها ----------
-- در طرحواره جدا که از API در دسترس نیست (anon روی آن usage ندارد)، تا کسی نتواند مستقیم شمارنده محدودیتِ نشانی
-- اینترنتی دیگری را پر کند یا وضعیت ختم را با هش دلخواه بخواند.
create schema if not exists khatm_priv;
-- هش کد گوشی (کد خام هیچ‌جا ذخیره نمی‌شود).
create or replace function khatm_priv.dev(p_device text) returns text
language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_device is null or char_length(p_device) not between 16 and 100 then raise exception 'bad_device'; end if;
  return encode(sha256(convert_to(p_device, 'UTF8')), 'hex');
end $$;

-- یک واحد به شمارنده می‌افزاید و اگر از حد گذشت خطای khatm_limit می‌دهد.
-- per: 'minute' یا 'day'. who: 'd:<هش گوشی>' یا 'i:<نشانی اینترنتی>' با پیشوند کار.
create or replace function khatm_priv.hit(p_who text, p_per text, p_max integer) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare c integer; b timestamptz := date_trunc(p_per, now());
begin
  insert into khatm_rate as r (bucket, who, n) values (b, p_per || ':' || p_who, 1)
  on conflict (bucket, who) do update set n = r.n + 1 returning r.n into c;
  if c > p_max then raise exception 'khatm_limit'; end if;
  if random() < 0.01 then delete from khatm_rate where bucket < now() - interval '2 days'; end if;
end $$;

create or replace function khatm_priv.ip() returns text
language sql stable set search_path = public, pg_temp as $$
  select left(coalesce((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json) ->> 'cf-connecting-ip',
                       btrim(split_part((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json) ->> 'x-forwarded-for', ',', 1)),
                       'unknown'), 60)
$$;

-- وضعیت کامل یک ختم برای این گوشی. جزءهای برداشته‌شده‌ای که مهلتشان گذشته، باز حساب می‌شوند.
-- name: نام نمایشی برداشت‌کننده (اختیاری)؛ mine: مال همین گوشی یا همین حساب است.
create or replace function khatm_priv.view(p_id text, p_dh text) returns json
language sql stable security definer set search_path = public, pg_temp as $$
  select json_build_object(
    'id', k.id, 'title', k.title, 'niyyat', k.niyyat, 'hold_days', k.hold_days, 'listed', k.listed,
    'status', k.status, 'completed_at', k.completed_at,
    'owner', (k.owner_hash = p_dh or (k.owner_user is not null and k.owner_user = auth.uid())),
    'juz', coalesce((select json_agg(json_build_object(
              'j', z.juz, 'done', z.done, 'name', z.name,
              'mine', (z.device_hash = p_dh or (z.user_id is not null and z.user_id = auth.uid())),
              'until', case when z.done then null else z.taken_at + make_interval(days => k.hold_days) end) order by z.juz)
            from khatm_juz z
           where z.khatm_id = k.id and (z.done or z.taken_at > now() - make_interval(days => k.hold_days))), '[]'::json))
  from khatms k where k.id = p_id
$$;

-- ---------- تابع‌های بازدیدکننده ----------
-- دیدن یک ختم (با پیوند یا از فهرست).
create or replace function public.khatm_get(p_id text, p_device text) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare dh text := khatm_priv.dev(p_device); res json;
begin
  perform khatm_priv.hit('d:' || dh, 'minute', 60);
  perform khatm_priv.hit('i:' || khatm_priv.ip(), 'minute', 1500);
  res := khatm_priv.view(left(coalesce(p_id, ''), 20), dh);
  if res is null then raise exception 'khatm_not_found'; end if;
  return res;
end $$;

-- ختم‌های فهرست‌شده باز، به‌علاوه ختم‌هایی که این گوشی می‌شناسد (p_ids، حداکثر ۲۰)، با خلاصه پیشرفت.
create or replace function public.khatm_list(p_device text, p_ids text[] default '{}') returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare dh text := khatm_priv.dev(p_device);
begin
  perform khatm_priv.hit('d:' || dh, 'minute', 30);
  perform khatm_priv.hit('i:' || khatm_priv.ip(), 'minute', 1500);
  return coalesce((select json_agg(x order by x.listed desc, x.created_at desc) from (
    select k.id, k.title, k.niyyat, k.listed, k.status, k.completed_at, k.created_at,
           (select count(*) from khatm_juz z where z.khatm_id = k.id and z.done)::integer as done,
           (select count(*) from khatm_juz z where z.khatm_id = k.id and not z.done
              and z.taken_at > now() - make_interval(days => k.hold_days))::integer as taken,
           (select count(*) from khatm_juz z where z.khatm_id = k.id
              and (z.device_hash = dh or (z.user_id is not null and z.user_id = auth.uid()))
              and (z.done or z.taken_at > now() - make_interval(days => k.hold_days)))::integer as mine
      from khatms k
     where (k.listed and k.status = 'open')
        or k.id = any ((coalesce(p_ids, '{}'::text[]))[1:20])
     order by k.created_at desc limit 40) x), '[]'::json);
end $$;

-- برداشتن، خواندم، پس دادن و برگرداندن یک جزء. p_action: take | done | release | undo
create or replace function public.khatm_act(p_id text, p_juz integer, p_device text, p_action text, p_name text default '')
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare dh text := khatm_priv.dev(p_device); k khatms; n integer; nm text;
begin
  if p_juz is null or p_juz not between 1 and 30 then raise exception 'khatm_bad_juz'; end if;
  if p_action not in ('take', 'done', 'release', 'undo') then raise exception 'khatm_bad_action'; end if;
  perform khatm_priv.hit('d:' || dh, 'minute', 30);
  perform khatm_priv.hit('i:' || khatm_priv.ip(), 'minute', 600);

  -- قفل ردیف ختم: دو نفر هم‌زمان یک جزء را برندارند و تکمیل ختم درست ثبت شود.
  select * into k from khatms where id = p_id for update;
  if not found then raise exception 'khatm_not_found'; end if;
  if k.status <> 'open' then raise exception 'khatm_closed'; end if;
  -- برداشتی که مهلتش گذشته، همین‌جا آزاد می‌شود.
  delete from khatm_juz where khatm_id = k.id and juz = p_juz and not done
     and taken_at <= now() - make_interval(days => k.hold_days);

  if p_action = 'take' then
    -- از هر گوشی حداکثر ۱۰ جزءِ نخوانده در یک ختم، تا یک نفر همه را نگیرد.
    select count(*) into n from khatm_juz where khatm_id = k.id and not done and device_hash = dh
       and taken_at > now() - make_interval(days => k.hold_days);
    if n >= 10 then raise exception 'khatm_too_many'; end if;
    nm := left(public.reg_clean_name(p_name), 40);
    insert into khatm_juz (khatm_id, juz, name, device_hash, user_id) values (k.id, p_juz, coalesce(nm, ''), dh, auth.uid())
    on conflict do nothing;
    get diagnostics n = row_count;
    if n = 0 then raise exception 'khatm_taken'; end if;
  elsif p_action = 'done' then
    update khatm_juz set done = true, done_at = now() where khatm_id = k.id and juz = p_juz and not done
       and (device_hash = dh or (user_id is not null and user_id = auth.uid()));
    get diagnostics n = row_count;
    if n = 0 then raise exception 'khatm_not_mine'; end if;
  elsif p_action = 'release' then
    delete from khatm_juz where khatm_id = k.id and juz = p_juz and not done
       and (device_hash = dh or (user_id is not null and user_id = auth.uid()));
    get diagnostics n = row_count;
    if n = 0 then raise exception 'khatm_not_mine'; end if;
  else -- undo: «خواندم» اشتباهی؛ دوباره برداشته‌شده با مهلت تازه
    update khatm_juz set done = false, done_at = null, taken_at = now() where khatm_id = k.id and juz = p_juz and done
       and (device_hash = dh or (user_id is not null and user_id = auth.uid()));
    get diagnostics n = row_count;
    if n = 0 then raise exception 'khatm_not_mine'; end if;
  end if;

  select count(*) into n from khatm_juz where khatm_id = k.id and done;
  update khatms set completed_at = case when n = 30 then coalesce(completed_at, now()) else null end, updated_at = now()
   where id = k.id;
  return khatm_priv.view(k.id, dh);
end $$;

-- ساختن ختم. ختم مدیر (با ورود مدیر) فهرست‌شده است؛ ختم بازدیدکننده فقط با پیوندش باز می‌شود.
-- محدودیت بازدیدکننده: از هر گوشی ۳ ختم و از هر نشانی اینترنتی ۳۰ ختم در روز.
create or replace function public.khatm_create(p_title text, p_niyyat text, p_hold integer, p_device text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare dh text := khatm_priv.dev(p_device); adm boolean := public.is_site_admin(); t text; v text; nid text;
begin
  t := public.reg_clean_name(p_title); v := btrim(coalesce(p_niyyat, ''));
  if char_length(t) not between 2 and 120 then raise exception 'khatm_bad_title'; end if;
  if char_length(v) > 300 then raise exception 'khatm_bad_niyyat'; end if;
  if p_hold is null or p_hold not between 1 and 30 then raise exception 'khatm_bad_hold'; end if;
  if not adm then
    perform khatm_priv.hit('c:' || dh, 'day', 3);
    perform khatm_priv.hit('ci:' || khatm_priv.ip(), 'day', 30);
  end if;
  insert into khatms (title, niyyat, hold_days, listed, owner_hash, owner_user)
  values (t, v, p_hold, adm, dh, auth.uid()) returning id into nid;
  return nid;
end $$;

-- بستن یا باز کردن دوباره ختم به دست سازنده‌اش (مدیر از جدول با RLS این کار را می‌کند).
create or replace function public.khatm_owner_set(p_id text, p_device text, p_open boolean) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare dh text := khatm_priv.dev(p_device); n integer;
begin
  perform khatm_priv.hit('d:' || dh, 'minute', 30);
  update khatms set status = case when p_open then 'open' else 'closed' end, updated_at = now()
   where id = p_id and (owner_hash = dh or (owner_user is not null and owner_user = auth.uid()) or public.is_site_admin());
  get diagnostics n = row_count;
  if n = 0 then raise exception 'khatm_not_mine'; end if;
  return khatm_priv.view(p_id, dh);
end $$;

grant execute on function public.khatm_get(text, text), public.khatm_list(text, text[]),
  public.khatm_act(text, integer, text, text, text), public.khatm_create(text, text, integer, text),
  public.khatm_owner_set(text, text, boolean) to anon, authenticated;
