-- نذر جمعی ذکر و صلوات: ذکرشمار (zekr.js، منوی ☰ › ذکرشمار) و کارت «نذر جمعی» در ‎#admin‎ › تنظیمات.
-- اجرا در Supabase SQL Editor (پس از registration.sql که is_site_admin را می‌سازد). اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند.
-- مدیر هدف می‌سازد (عنوان، متن ذکر، عدد هدف، تاریخ پایان اختیاری، روشن/خاموش). هدف‌های روشن را همه می‌بینند.
-- هر بازدیدکننده شمارش‌هایش را دسته‌دسته با تابع zekr_add می‌فرستد و ستون total همان لحظه (اتمی) بالا می‌رود.
-- بازدیدکننده نمی‌تواند total را مستقیم تغییر دهد؛ فقط از راه zekr_add و با محدودیت‌های پایین.

create table if not exists public.zekr_goals (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 2 and 120),
  zekr text not null check (char_length(zekr) between 1 and 300),
  target bigint not null check (target between 1 and 1000000000),
  total bigint not null default 0 check (total >= 0),
  ends_on date,                                   -- آخرین روز (به وقت تهران)؛ خالی یعنی بی‌پایان
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists zekr_goals_active_idx on public.zekr_goals (active, id desc);

alter table public.zekr_goals enable row level security;
drop policy if exists "anyone reads active zekr goals" on public.zekr_goals;
create policy "anyone reads active zekr goals" on public.zekr_goals for select to anon, authenticated
  using (active or public.is_site_admin());
drop policy if exists "admin manages zekr goals" on public.zekr_goals;
create policy "admin manages zekr goals" on public.zekr_goals for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
revoke all on public.zekr_goals from anon;
grant select on public.zekr_goals to anon, authenticated;
grant insert, update, delete on public.zekr_goals to authenticated;

-- شمارنده محدودیت: برای هر دقیقه، هم برای هر گوشی (d:هش کد گوشی) و هم برای هر نشانی اینترنتی (i:IP).
-- فقط تابع zekr_add آن را می‌خواند و می‌نویسد؛ ردیف‌های قدیمی‌تر از ۱۰ دقیقه گاه‌به‌گاه پاک می‌شوند.
create table if not exists public.zekr_rate (
  minute timestamptz not null,
  who text not null,
  calls integer not null default 0,
  taps integer not null default 0,
  primary key (minute, who)
);
alter table public.zekr_rate enable row level security;
revoke all on public.zekr_rate from anon, authenticated;

-- افزودن n ذکر به یک هدف و برگرداندن جمع تازه.
-- محدودیت‌ها: n بین ۱ و ۵۰۰ در هر بار؛ از هر گوشی حداکثر ۲۰ بار و ۹۰۰ ذکر در دقیقه (تند زدن آدم حدود ۱۰ در ثانیه است)؛
-- از هر نشانی اینترنتی (که در ایران گاهی میان صدها گوشی مشترک است) حداکثر ۶۰۰ بار و ۲۰٬۰۰۰ ذکر در دقیقه.
-- هدف باید روشن باشد و تاریخ پایانش (به وقت تهران) نگذشته باشد.
create or replace function public.zekr_add(p_goal bigint, p_n integer, p_device text) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare h json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
        v_ip text := left(coalesce(h ->> 'cf-connecting-ip', btrim(split_part(h ->> 'x-forwarded-for', ',', 1)), 'unknown'), 60);
        mn timestamptz := date_trunc('minute', now());
        today date := (now() at time zone 'Asia/Tehran')::date;
        c integer; t integer; tot bigint;
begin
  if p_n is null or p_n < 1 or p_n > 500 then raise exception 'zekr_bad_n'; end if;
  if p_device is null or char_length(p_device) not between 16 and 100 then raise exception 'bad_device'; end if;

  insert into zekr_rate as r (minute, who, calls, taps)
    values (mn, 'd:' || encode(sha256(convert_to(p_device, 'UTF8')), 'hex'), 1, p_n)
  on conflict (minute, who) do update set calls = r.calls + 1, taps = r.taps + excluded.taps
  returning r.calls, r.taps into c, t;
  if c > 20 or t > 900 then raise exception 'zekr_limit'; end if;

  insert into zekr_rate as r (minute, who, calls, taps) values (mn, 'i:' || v_ip, 1, p_n)
  on conflict (minute, who) do update set calls = r.calls + 1, taps = r.taps + excluded.taps
  returning r.calls, r.taps into c, t;
  if c > 600 or t > 20000 then raise exception 'zekr_limit'; end if;

  -- به‌روزرسانی تک‌دستوری: چند نفر هم‌زمان هم جمع را درست بالا می‌برند.
  update zekr_goals set total = total + p_n, updated_at = now()
   where id = p_goal and active and (ends_on is null or ends_on >= today)
  returning total into tot;
  if tot is null then raise exception 'zekr_closed'; end if;

  if random() < 0.02 then delete from zekr_rate where minute < mn - interval '10 minutes'; end if;
  return tot;
end $$;

revoke all on function public.zekr_add(bigint, integer, text) from public;
grant execute on function public.zekr_add(bigint, integer, text) to anon, authenticated;
