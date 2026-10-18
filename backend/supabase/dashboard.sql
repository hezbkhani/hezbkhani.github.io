-- نمودارهای مدیریت (dashboard.js، ‎#admin‎ › گزارش‌ها › «آمار و نمودارها»).
-- اجرا در Supabase SQL Editor پس از schema.sql، registration.sql و update-day-start-azan.sql (و chelleh.sql و reminders.sql اگر هستند).
-- اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند. فقط می‌خواند؛ فقط مدیر (is_site_admin) نتیجه می‌گیرد.
--
-- خروجی یک json:
--   today: روز قرائت امروز (تاریخ میلادی)
--   reports: [{d, n}]   تعداد گزارش‌های حزب‌خوانی هر روز در ۳۰ روز گذشته (روز قرائت، از اذان صبح تهران)
--   marks:   [{d, n}]   تعداد علامت‌های «خواندم» چله‌ها و دوره‌های قرآن هر روز در ۳۰ روز گذشته
--   groups:  [{name, total, active}]  هر گروه حزب‌خوانی: active = چند نفر از ۱۲۰ نفر در ۷ روز گذشته دست‌کم یک گزارش داده‌اند
--   rounds:  [{title, total, active}] هر دوره باز چله: total = اعضای اصلی (بدون رزرو)، active = چند نفر در ۷ روز گذشته علامت زده‌اند
--   push:    {total, hezb, courses, new30} اشتراک‌های اعلان (کل، با شناسه حزب‌خوانی، با کد دوره، تازه در ۳۰ روز)
-- هر بخشی که جدولش هنوز ساخته نشده، خالی (null) برمی‌گردد.

create or replace function public.dash_stats() returns json
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare today date := public.reading_day(now()); res jsonb := '{}'; x json;
begin
  if not public.is_site_admin() then raise exception 'not_admin'; end if;
  res := jsonb_build_object('today', today);

  select coalesce(json_agg(json_build_object('d', d, 'n', n) order by d), '[]') into x from (
    select report_date as d, count(*)::integer as n from daily_reports
     where report_date between today - 29 and today and completed group by report_date) t;
  res := res || jsonb_build_object('reports', x);

  select coalesce(json_agg(json_build_object('name', g.name, 'number', g.number, 'total', 120, 'active',
           (select count(distinct r.participant_id) from daily_reports r
             where r.group_number = g.number and r.completed and r.report_date between today - 6 and today)) order by g.number), '[]')
    into x from site_groups g where g.visible;
  res := res || jsonb_build_object('groups', x);

  begin
    select coalesce(json_agg(json_build_object('d', d, 'n', n) order by d), '[]') into x from (
      select day as d, count(*)::integer as n from chelleh_marks where day between today - 29 and today group by day) t;
    res := res || jsonb_build_object('marks', x);
    select coalesce(json_agg(json_build_object('title', title, 'total', total, 'active', active) order by created_at desc), '[]') into x from (
      select r.title, r.created_at,
             (select count(*) from chelleh_members m where m.round_id = r.id and not m.reserve)::integer as total,
             (select count(distinct m.id) from chelleh_members m join chelleh_marks k on k.member_id = m.id
               where m.round_id = r.id and k.day between today - 6 and today)::integer as active
        from chelleh_rounds r where r.status = 'open' order by r.created_at desc limit 20) t;
    res := res || jsonb_build_object('rounds', x);
  exception when undefined_table or undefined_column then null;
  end;

  begin
    select json_build_object('total', count(*), 'hezb', count(*) filter (where group_number is not null),
             'courses', count(*) filter (where cardinality(chl_codes) > 0),
             'new30', count(*) filter (where created_at > now() - interval '30 days')) into x
      from push_subscriptions;
    res := res || jsonb_build_object('push', x);
  exception when undefined_table or undefined_column then null;
  end;

  return res::json;
end $$;

grant execute on function public.dash_stats() to authenticated;
