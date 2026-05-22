create table if not exists user_announcements (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_key text not null check (announcement_key <> ''),
  seen_at timestamptz not null default now(),
  primary key (user_id, announcement_key)
);

create index if not exists user_announcements_user_idx on user_announcements(user_id);

alter table user_announcements enable row level security;

drop policy if exists "user announcements can be read by owner" on user_announcements;
drop policy if exists "user announcements can be inserted by owner" on user_announcements;

create policy "user announcements can be read by owner" on user_announcements
  for select to authenticated
  using (user_id = auth.uid());

create policy "user announcements can be inserted by owner" on user_announcements
  for insert to authenticated
  with check (user_id = auth.uid());
