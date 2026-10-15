-- حساب کاربری: ثبت‌نام با ایمیل، نام کاربری و رمز؛ ورود با ایمیل یا نام کاربری؛ فراموشی رمز.
-- هر کس پس از ورود همه چله‌ها، ثبت‌نام‌های حزب‌خوانی و گروه حزب‌خوانی خود را روی هر گوشی می‌بیند، بدون به خاطر سپردن کد.
-- اجرا در Supabase SQL Editor پس از registration.sql و chelleh.sql (و reminders.sql اگر هست). اجرای دوباره بی‌خطر است.
--
-- چطور کار می‌کند: ورود و رمز با خود Supabase Auth است. کدهای ۸ رقمی مثل قبل می‌مانند و گزارش بدون حساب هم کار می‌کند؛
-- حساب فقط کدها را به یک نفر وصل می‌کند:
--   • هر کدی که روی گوشی هست، هنگام ورود به حساب وصل می‌شود (اگر به حساب دیگری وصل نباشد).
--   • چله‌هایی که با همان ایمیلِ حساب ثبت‌نام شده‌اند، پس از تأیید ایمیل خودکار به حساب وصل می‌شوند.
--   • روی گوشی تازه، پس از ورود، کدهای حساب روی گوشی برگردانده می‌شوند.
-- کسی که وارد شده فقط داده‌های خودش را می‌بیند (همه از تابع‌های acc_* با auth.uid()، جدول‌ها دسترسی مستقیم ندارند).

-- ---------- جدول‌ها ----------
alter table public.chelleh_members add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists chelleh_members_user on public.chelleh_members(user_id) where user_id is not null;
alter table public.registrations add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists registrations_user on public.registrations(user_id) where user_id is not null;

-- نام کاربری (برای ورود بدون ایمیل) و نام نمایشی.
create table if not exists public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or username ~ '^[a-z0-9_.]{3,30}$'),
  name text not null default '' check (length(name) <= 60),
  created_at timestamptz not null default now()
);
-- گروه و شناسه حزب‌خوانی (عمومی است، ولی برای اینکه روی گوشی تازه هم آماده باشد نگه داشته می‌شود).
create table if not exists public.account_hezb (
  user_id uuid primary key references auth.users(id) on delete cascade,
  group_number integer not null,
  participant_id integer not null check (participant_id between 1 and 120),
  updated_at timestamptz not null default now()
);
alter table public.account_profiles enable row level security;
alter table public.account_hezb enable row level security;
revoke all on public.account_profiles, public.account_hezb from anon, authenticated;
drop policy if exists "admin reads profiles" on public.account_profiles;
create policy "admin reads profiles" on public.account_profiles for select to authenticated using (public.is_site_admin());
grant select on public.account_profiles to authenticated;

-- ---------- مدیر فقط با ایمیل تأییدشده ----------
-- حالا که هر کسی می‌تواند حساب بسازد، مدیر بودن فقط برای حسابی است که ایمیلش در فهرست مدیران است و آن ایمیل تأیید شده.
-- (همین تعریف در registration.sql هم هست تا اجرای دوباره آن، این را برنگرداند.)
create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from site_admins a join auth.users u on lower(u.email) = a.email
                  where u.id = auth.uid() and u.email_confirmed_at is not null)
$$;

-- ---------- کمکی ----------
create or replace function public.acc_clean_username(p text) returns text
language sql immutable as $$
  select nullif(lower(btrim(translate(coalesce(p, ''), '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))), '')
$$;
-- آیا صاحب حساب واقعاً ایمیلش را با لینک تأیید کرده است؟ (اگر «Confirm email» خاموش باشد Supabase بی‌لینک تأیید می‌کند؛
-- آن حالت اینجا حساب نمی‌شود تا کسی با ایمیل دیگری حساب نسازد و چله‌های او را بردارد.)
create or replace function public.acc_email_proven(u auth.users) returns boolean
language sql stable as $$
  select u.email_confirmed_at is not null and u.confirmation_sent_at is not null
     and u.email_confirmed_at > u.confirmation_sent_at + interval '3 seconds'
$$;

-- ---------- برای بازدیدکنندگان ----------
-- پیش از ساختن حساب: آیا این نام کاربری آزاد است؟
create or replace function public.acc_username_free(p_username text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare u text := public.acc_clean_username(p_username);
begin
  if u is null or u !~ '^[a-z0-9_.]{3,30}$' then raise exception 'acc_bad_username'; end if;
  return not exists (select 1 from account_profiles where username = u);
end $$;

-- همگام‌سازی پس از ورود (و هر بار که سایت باز می‌شود یا ثبت‌نام تازه‌ای انجام می‌شود):
-- کدهای این گوشی به حساب وصل می‌شوند و همه کدهای حساب برگردانده می‌شوند تا روی گوشی ذخیره شوند.
-- p_hezb: {"g": شماره گروه, "id": شناسه} وقتی روی این گوشی تازه انتخاب شده؛ وگرنه null.
create or replace function public.acc_sync(p_chl text[] default '{}', p_reg text[] default '{}', p_hezb jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid(); u auth.users; p account_profiles; nm text; un text; n_email integer := 0; miss integer;
        chl text[] := coalesce(p_chl, '{}'); reg text[] := coalesce(p_reg, '{}'); g integer; pid integer;
begin
  if uid is null then raise exception 'acc_login_needed'; end if;
  select * into u from auth.users where id = uid;
  if u.id is null then raise exception 'acc_login_needed'; end if;
  chl := array(select distinct btrim(c) from unnest(chl[1:50]) c where btrim(c) ~ '^\d{8}$');
  reg := array(select distinct btrim(c) from unnest(reg[1:50]) c where btrim(c) ~ '^\d{8}$');

  -- نمایه: نام و نام کاربری‌ای که هنگام ساختن حساب انتخاب شد.
  nm := left(btrim(regexp_replace(coalesce(u.raw_user_meta_data ->> 'name', ''), '[<>{}"\\`]', '', 'g')), 60);
  insert into account_profiles (user_id, name) values (uid, nm) on conflict (user_id) do nothing;
  un := public.acc_clean_username(u.raw_user_meta_data ->> 'username');
  if un ~ '^[a-z0-9_.]{3,30}$' and not exists (select 1 from account_profiles where username = un) then
    update account_profiles set username = un where user_id = uid and username is null;
  end if;

  -- کدهای این گوشی (فقط کدهایی که هنوز به حسابی وصل نیستند). کدهای نادرست مثل جاهای دیگر شمرده می‌شوند.
  if array_length(chl, 1) > 0 or array_length(reg, 1) > 0 then
    perform public.code_guard();
    update chelleh_members set user_id = uid where code = any (chl) and user_id is null;
    update registrations set user_id = uid where code = any (reg) and user_id is null;
    select (select count(*) from unnest(chl) c where not exists (select 1 from chelleh_members x where x.code = c))
         + (select count(*) from unnest(reg) c where not exists (select 1 from registrations x where x.code = c)) into miss;
    if miss > 0 then perform public.code_guard(miss); end if;
  end if;

  -- چله‌هایی که با ایمیل همین حساب ثبت شده‌اند (فقط اگر ایمیل با لینک تأیید شده باشد).
  if public.acc_email_proven(u) then
    update chelleh_members set user_id = uid where user_id is null and email = lower(u.email);
    get diagnostics n_email = row_count;
  end if;

  -- گروه حزب‌خوانی
  if p_hezb is not null and jsonb_typeof(p_hezb) = 'object' then
    g := nullif(p_hezb ->> 'g', '')::integer; pid := nullif(p_hezb ->> 'id', '')::integer;
    if g > 0 and pid between 1 and 120 then
      insert into account_hezb (user_id, group_number, participant_id) values (uid, g, pid)
      on conflict (user_id) do update set group_number = excluded.group_number, participant_id = excluded.participant_id, updated_at = now();
    end if;
  end if;

  select * into p from account_profiles where user_id = uid;
  return jsonb_build_object(
    'email', u.email, 'name', p.name, 'username', p.username, 'email_proven', public.acc_email_proven(u), 'email_linked', n_email,
    'chl', coalesce((select jsonb_agg(m.code order by m.created_at desc) from chelleh_members m join chelleh_rounds r on r.id = m.round_id
                      where m.user_id = uid and r.status = 'open'), '[]'::jsonb),
    'reg', coalesce((select jsonb_agg(x.code order by x.created_at desc) from registrations x join registration_rounds r on r.id = x.round_id
                      where x.user_id = uid and r.status <> 'closed'), '[]'::jsonb),
    'hezb', (select jsonb_build_object('g', h.group_number, 'id', h.participant_id) from account_hezb h where h.user_id = uid));
end $$;

-- برداشتن یک مورد از حساب (مثلاً «فراموش کردن» چله‌ای روی گوشی، یا تغییر گروه حزب‌خوانی).
-- p_kind: 'chl' یا 'reg' (با کد)، یا 'hezb'.
create or replace function public.acc_unlink(p_kind text, p_code text default null) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'acc_login_needed'; end if;
  if p_kind = 'chl' then update chelleh_members set user_id = null where code = btrim(p_code) and user_id = uid;
  elsif p_kind = 'reg' then update registrations set user_id = null where code = btrim(p_code) and user_id = uid;
  elsif p_kind = 'hezb' then delete from account_hezb where user_id = uid;
  end if;
end $$;

-- تغییر نام یا نام کاربری از «حساب من».
create or replace function public.acc_profile_save(p_name text, p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); un text := public.acc_clean_username(p_username);
        nm text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 60);
begin
  if uid is null then raise exception 'acc_login_needed'; end if;
  if nm ~ '[<>{}"\\`]' then raise exception 'bad_name'; end if;
  if un is not null and un !~ '^[a-z0-9_.]{3,30}$' then raise exception 'acc_bad_username'; end if;
  if un is not null and exists (select 1 from account_profiles where username = un and user_id <> uid) then raise exception 'acc_username_taken'; end if;
  insert into account_profiles (user_id, name, username) values (uid, nm, un)
  on conflict (user_id) do update set name = excluded.name, username = excluded.username;
  return jsonb_build_object('name', nm, 'username', un);
end $$;

-- فقط برای تابع account-login (ورود با نام کاربری): ایمیلِ یک نام کاربری. به بازدیدکنندگان داده نمی‌شود تا ایمیل‌ها پیدا نشوند.
create or replace function public.acc_login_email(p_username text) returns text
language sql stable security definer set search_path = public as $$
  select u.email from account_profiles p join auth.users u on u.id = p.user_id where p.username = public.acc_clean_username(p_username)
$$;

revoke all on function public.acc_clean_username(text), public.acc_email_proven(auth.users), public.acc_login_email(text)
  from public, anon, authenticated;
grant execute on function public.acc_login_email(text) to service_role;
revoke all on function public.acc_sync(text[], text[], jsonb), public.acc_unlink(text, text), public.acc_profile_save(text, text),
  public.acc_username_free(text) from public, anon;
grant execute on function public.acc_username_free(text) to anon, authenticated;
grant execute on function public.acc_sync(text[], text[], jsonb), public.acc_unlink(text, text), public.acc_profile_save(text, text)
  to authenticated;
