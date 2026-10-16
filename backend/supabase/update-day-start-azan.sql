-- اجرا یک‌بار در Supabase SQL Editor.
-- روز گزارش از اذان صبح تهران (روش مؤسسه ژئوفیزیک دانشگاه تهران، زاویه ۱۷٫۷ درجه) شروع می‌شود.
-- این محاسبه با تابع fajrTehran در app.js یکسان است.
create or replace function public.tehran_fajr(d date) returns timestamptz
language plpgsql immutable as $$
declare
  r constant double precision := pi()/180;
  lat constant double precision := 35.6892*pi()/180;
  lng constant double precision := 51.389;
  ang constant double precision := 17.7*pi()/180;
  day0 constant double precision := (d - date '1970-01-01') + 2440587.5;
  h double precision := 1;
  dd double precision; g double precision; q double precision; l double precision;
  e double precision; ra double precision; dec double precision; noon double precision;
begin
  for i in 1..3 loop
    dd := day0 + h/24 - 2451545;
    g := (357.529 + 0.98560028*dd)*r;
    q := 280.459 + 0.98564736*dd; q := q - 360*floor(q/360);
    l := (q + 1.915*sin(g) + 0.02*sin(2*g))*r;
    e := (23.439 - 3.6e-7*dd)*r;
    ra := atan2(cos(e)*sin(l), cos(l))/r/15; ra := ra - 24*floor(ra/24);
    dec := asin(sin(e)*sin(l));
    noon := 12 - (q/15 - ra); noon := noon - 24*floor(noon/24) - lng/15;
    h := noon - acos((-sin(ang) - sin(dec)*sin(lat))/(cos(dec)*cos(lat)))/r/15;
  end loop;
  return (d::timestamp at time zone 'UTC') + h * interval '1 hour';
end $$;

-- تاریخ «روز قرائت» برای یک لحظه: پیش از اذان صبح، هنوز روز قبل است.
create or replace function public.reading_day(ts timestamptz default now()) returns date
language sql stable as $$
  select case when ts < public.tehran_fajr((ts at time zone 'Asia/Tehran')::date)
              then (ts at time zone 'Asia/Tehran')::date - 1
              else (ts at time zone 'Asia/Tehran')::date end
$$;

-- گزارش امروز، یا روزی که فراموش شده بود تا ۷ روز گذشته (همان LATE_DAYS در app.js).
drop policy if exists "public may report completion" on public.daily_reports;
create policy "public may report completion" on public.daily_reports for insert to anon
  with check (completed = true
              and report_date between public.reading_day(now()) - 7 and public.reading_day(now())
              and length(participant_name) <= 80 and length(portion) <= 120);

-- روزهایی از ۷ روز گذشته تا امروز که این شناسه گزارش داده است؛ فقط تاریخ‌ها برگردانده می‌شود، نه جزئیات گزارش‌ها.
-- صفحه با آن روزهای جامانده را نشان می‌دهد.
create or replace function public.hezb_reported_days(p_group integer, p_participant integer) returns date[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(report_date order by report_date), '{}')
    from daily_reports
   where group_number = p_group and participant_id = p_participant
     and report_date between public.reading_day() - 7 and public.reading_day()
$$;
revoke all on function public.hezb_reported_days(integer, integer) from public;
grant execute on function public.hezb_reported_days(integer, integer) to anon, authenticated;
