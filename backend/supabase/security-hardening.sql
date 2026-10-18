-- سخت‌گیری امنیتی (۱۴۰۵/۰۷/۲۶). یک بار در SQL Editor سوپابیس اجرا کنید؛ اجرای دوباره هم بی‌خطر است.
-- ۱) سیاست قدیمی گزارش‌ها که مدیر را فقط با متن ایمیل می‌شناخت حذف می‌شود؛
--    سیاست «site admins read reports» (is_site_admin، با ایمیل تأییدشده) همان کار را درست انجام می‌دهد.
drop policy if exists "administrator may read reports" on public.daily_reports;
drop policy if exists "authenticated admin reads reports" on public.daily_reports;

-- ۲) search_path ثابت برای توابع کمکی (هشدار 0011 در Security Advisor سوپابیس).
alter function public.acc_clean_username(text) set search_path = public, pg_temp;
alter function public.acc_email_proven(auth.users) set search_path = public, pg_temp;
alter function public.chl_clean_email(text) set search_path = public, pg_temp;
alter function public.chl_new_code() set search_path = public, pg_temp;
alter function public.chl_news_stamp() set search_path = public, pg_temp;
alter function public.push_check(text, text, text) set search_path = public, pg_temp;
alter function public.reading_day(timestamptz) set search_path = public, pg_temp;
alter function public.reg_clean_name(text) set search_path = public, pg_temp;
alter function public.tehran_fajr(date) set search_path = public, pg_temp;
