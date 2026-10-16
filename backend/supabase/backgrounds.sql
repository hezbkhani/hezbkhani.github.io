-- زمینه‌های صفحه اول که مدیر در ‎#admin‎ › تنظیمات › «زمینه‌های صفحه اول» اضافه می‌کند.
-- اجرا در Supabase SQL Editor (پس از registration.sql). اجرای دوباره بی‌خطر است و چیزی را پاک نمی‌کند.
-- تصویرها در Storage، سطل عمومی backgrounds، می‌مانند؛ همه می‌توانند ببینند و فقط مدیر بارگذاری یا حذف می‌کند.
-- فهرست زمینه‌های روشن و تنظیم هر زمینه در site_settings با کلید backgrounds ذخیره می‌شود.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backgrounds', 'backgrounds', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin uploads backgrounds" on storage.objects;
create policy "admin uploads backgrounds" on storage.objects for insert to authenticated
  with check (bucket_id = 'backgrounds' and public.is_site_admin());
drop policy if exists "admin updates backgrounds" on storage.objects;
create policy "admin updates backgrounds" on storage.objects for update to authenticated
  using (bucket_id = 'backgrounds' and public.is_site_admin()) with check (bucket_id = 'backgrounds' and public.is_site_admin());
drop policy if exists "admin deletes backgrounds" on storage.objects;
create policy "admin deletes backgrounds" on storage.objects for delete to authenticated
  using (bucket_id = 'backgrounds' and public.is_site_admin());
-- delete از راه API سطر را پیش از حذف می‌خواند؛ پس مدیر باید بتواند بخواند (برای بقیه، نشانی عمومی کافی است).
drop policy if exists "admin reads backgrounds" on storage.objects;
create policy "admin reads backgrounds" on storage.objects for select to authenticated
  using (bucket_id = 'backgrounds' and public.is_site_admin());
