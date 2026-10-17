-- پیشنهادها و نظرها: منوی ☰ › «پیشنهادها و نظرها» (feedback.js) و ‎#admin‎ › زبانه «نظرها».
-- اجرا در Supabase SQL Editor (پس از registration.sql). اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند.
-- هر گوشی یک کد تصادفی (localStorage، کلید fbDevice) دارد؛ فقط هش آن ذخیره می‌شود و با همان کد، پیام‌ها و پاسخ‌های خودش را می‌بیند.
-- بازدیدکننده جدول را مستقیم نمی‌بیند؛ فقط با تابع‌های feedback_send و feedback_mine. مدیر همه را می‌خواند، پاسخ می‌دهد یا حذف می‌کند.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  device_hash text not null,
  name text,
  body text not null check (char_length(body) between 2 and 600),
  created_at timestamptz not null default now(),
  admin_seen boolean not null default false,
  reply text check (reply is null or char_length(reply) <= 1000),
  replied_at timestamptz
);
create index if not exists feedback_device_idx on public.feedback (device_hash, created_at desc);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon;
grant select, update, delete on public.feedback to authenticated;
drop policy if exists "admin reads feedback" on public.feedback;
create policy "admin reads feedback" on public.feedback for select to authenticated using (public.is_site_admin());
drop policy if exists "admin updates feedback" on public.feedback;
create policy "admin updates feedback" on public.feedback for update to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "admin deletes feedback" on public.feedback;
create policy "admin deletes feedback" on public.feedback for delete to authenticated using (public.is_site_admin());

create or replace function public.feedback_hash(p_device text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(p_device, 'UTF8')), 'hex')
$$;

-- فرستادن یک پیام: حداکثر ۶۰۰ نویسه، و از هر گوشی حداکثر ۵ پیام در ۲۴ ساعت.
create or replace function public.feedback_send(p_device text, p_body text, p_name text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare h text; b text := btrim(coalesce(p_body, '')); n text := nullif(btrim(coalesce(p_name, '')), ''); new_id bigint;
begin
  if p_device is null or char_length(p_device) not between 16 and 100 then raise exception 'bad_device'; end if;
  if char_length(b) < 2 then raise exception 'fb_empty'; end if;
  if char_length(b) > 600 then raise exception 'fb_long'; end if;
  if n is not null and char_length(n) > 60 then n := left(n, 60); end if;
  h := public.feedback_hash(p_device);
  if (select count(*) from public.feedback where device_hash = h and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'fb_limit';
  end if;
  insert into public.feedback (device_hash, name, body) values (h, n, b) returning id into new_id;
  return new_id;
end $$;

-- پیام‌های همین گوشی و پاسخ مدیر به هر کدام (۳۰ پیام آخر).
create or replace function public.feedback_mine(p_device text)
returns table (id bigint, body text, created_at timestamptz, reply text, replied_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, f.body, f.created_at, f.reply, f.replied_at from public.feedback f
  where p_device is not null and f.device_hash = public.feedback_hash(p_device)
  order by f.created_at desc limit 30
$$;

revoke all on function public.feedback_send(text, text, text) from public;
revoke all on function public.feedback_mine(text) from public;
grant execute on function public.feedback_send(text, text, text) to anon, authenticated;
grant execute on function public.feedback_mine(text) to anon, authenticated;
