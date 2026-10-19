-- گزارش استفاده از سایت (usage.js و usage-view.js، ‎#admin‎ › گزارش‌ها › «گزارش استفاده از سایت»).
-- اجرا در Supabase SQL Editor پس از registration.sql. اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند.
--
-- حریم خصوصی: هیچ نام، شناسه، نشانی IP یا کد گوشی ذخیره نمی‌شود. فقط شمارنده‌های روزانه نگه داشته می‌شود
-- (مثلاً «امروز ۱۲ نفر قرآن‌خوان را باز کردند»). هر گوشی هر مورد را روزی یک بار می‌فرستد، پس هر عدد یعنی «چند نفر در آن روز».
-- تا مدیر در کارت گزارش، شمارش را روشن نکند (site_settings › usage.enabled)، usage_hit هیچ چیزی ذخیره نمی‌کند.
--
-- انواع (kind):
--   visit:   all = بازدیدکننده آن روز، new = گوشی که بار اول آمده
--   env:     app / browser (برنامه نصب‌شده یا مرورگر)، phone / desktop
--   group:   شماره گروه حزب‌خوانی بازدیدکننده (اگر شناسه حزب‌خوانی دارد)
--   section: بخشی که باز شده (qr = قرآن‌خوان، mf = مفاتیح و …؛ نام فارسی در usage-view.js)
--   menu:    عنوان گزینه‌ای که در منوی ☰ زده شده

create table if not exists public.usage_daily (
  day date not null,
  kind text not null check (kind in ('visit', 'env', 'group', 'section', 'menu')),
  key text not null check (char_length(key) between 1 and 60),
  n integer not null default 0,
  primary key (day, kind, key)
);
alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from anon, authenticated;
grant select on public.usage_daily to authenticated;
drop policy if exists "admin reads usage" on public.usage_daily;
create policy "admin reads usage" on public.usage_daily for select to authenticated using (public.is_site_admin());

-- p_hits: [["section","qr"], ["visit","all"], …]؛ حداکثر ۴۰ مورد در هر درخواست.
create or replace function public.usage_hit(p_hits jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare today date := (now() at time zone 'Asia/Tehran')::date;
begin
  if coalesce((select (value->>'enabled')::boolean from site_settings where key = 'usage'), false) is not true then return; end if;
  if jsonb_typeof(p_hits) <> 'array' or jsonb_array_length(p_hits) > 40 then return; end if;
  insert into usage_daily as u (day, kind, key, n)
  select today, k, v, 1 from (
    select distinct h->>0 as k, btrim(h->>1) as v from jsonb_array_elements(p_hits) h
     where jsonb_typeof(h) = 'array') t
   where k in ('visit', 'env', 'group', 'section', 'menu') and char_length(v) between 1 and 60
  on conflict (day, kind, key) do update set n = u.n + 1;
end $$;

-- گزارش مدیر برای p_days روز گذشته (۷ تا ۳۶۵) و همان مدت پیش از آن برای مقایسه.
create or replace function public.usage_report(p_days integer default 30) returns json
language plpgsql security definer set search_path = public, pg_temp as $$
declare today date := (now() at time zone 'Asia/Tehran')::date; d integer := least(365, greatest(1, coalesce(p_days, 30)));
  since date; res json;
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  since := today - d + 1;
  select json_build_object(
    'today', today, 'days', d,
    'enabled', coalesce((select (value->>'enabled')::boolean from site_settings where key = 'usage'), false),
    'first', (select min(day) from usage_daily),
    'visits', (select coalesce(json_agg(json_build_object('d', day, 'n', n) order by day), '[]') from usage_daily
                where kind = 'visit' and key = 'all' and day >= since),
    'totals', (select coalesce(json_object_agg(kind || ':' || key, n), '{}') from (
                select kind, key, sum(n)::integer as n from usage_daily where kind in ('visit', 'env') and day >= since group by kind, key) t),
    'prev', (select coalesce(sum(n), 0)::integer from usage_daily where kind = 'visit' and key = 'all' and day between since - d and since - 1),
    'sections', (select coalesce(json_agg(json_build_object('key', key, 'n', n, 'prev', p) order by n desc), '[]') from (
                select key, sum(n) filter (where day >= since)::integer as n, coalesce(sum(n) filter (where day < since), 0)::integer as p
                  from usage_daily where kind = 'section' and day >= since - d group by key) t where n > 0),
    'menu', (select coalesce(json_agg(json_build_object('key', key, 'n', n) order by n desc), '[]') from (
                select key, sum(n)::integer as n from usage_daily where kind = 'menu' and day >= since group by key order by 2 desc limit 40) t),
    'groups', (select coalesce(json_agg(json_build_object('key', t.key, 'n', t.n, 'name', g.name) order by t.n desc), '[]') from (
                select key, sum(n)::integer as n from usage_daily where kind = 'group' and day >= since group by key) t
                left join site_groups g on g.number::text = t.key)
  ) into res;
  return res;
end $$;

revoke all on function public.usage_hit(jsonb) from public;
revoke all on function public.usage_report(integer) from public;
grant execute on function public.usage_hit(jsonb) to anon, authenticated;
grant execute on function public.usage_report(integer) to authenticated;
