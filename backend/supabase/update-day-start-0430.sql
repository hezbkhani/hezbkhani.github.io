-- اجرا یک‌بار در Supabase SQL Editor: روز گزارش از ساعت ۴:۳۰ صبح به وقت ایران شروع می‌شود.
drop policy if exists "public may report completion" on public.daily_reports;
create policy "public may report completion" on public.daily_reports for insert to anon with check (completed = true and report_date = ((now() at time zone 'Asia/Tehran') - interval '4 hours 30 minutes')::date);
