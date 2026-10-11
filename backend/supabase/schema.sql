create table if not exists public.daily_reports (
  id bigint generated always as identity primary key,
  report_date date not null,
  group_number integer not null check (group_number > 0),
  participant_id integer not null check (participant_id between 1 and 120),
  participant_name text not null,
  portion text not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(report_date, group_number, participant_id)
);
alter table public.daily_reports enable row level security;
create policy "public may report completion" on public.daily_reports for insert to anon with check (completed = true and report_date = (now() at time zone 'Asia/Tehran')::date);
create policy "authenticated admin reads reports" on public.daily_reports for select to authenticated using (auth.jwt() ->> 'email' = 'REPLACE_WITH_ADMIN_EMAIL');
