-- Run this file first in the Supabase SQL Editor. Then run supabase/seed.sql.

create extension if not exists pgcrypto;

create table if not exists album_editions (
  id text primary key,
  name text not null,
  total_stickers integer not null check (total_stickers > 0),
  created_at timestamptz not null default now()
);

create table if not exists sections (
  id text primary key,
  edition_id text not null references album_editions(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists teams (
  code text primary key,
  edition_id text not null references album_editions(id) on delete cascade,
  section_id text not null references sections(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists stickers (
  code text primary key,
  edition_id text not null references album_editions(id) on delete cascade,
  section_id text not null references sections(id) on delete cascade,
  team_code text not null references teams(code) on delete cascade,
  team_name text not null,
  name text not null,
  sticker_type text not null check (sticker_type in ('logo', 'photo', 'player', 'intro')),
  is_foil boolean not null default false,
  position integer not null check (position >= 0)
);

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  edition_id text not null references album_editions(id) default 'fifa-world-cup-2026',
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  album_id uuid not null references albums(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists album_stickers (
  album_id uuid not null references albums(id) on delete cascade,
  sticker_code text not null references stickers(code) on delete cascade,
  quantity integer not null check (quantity between 0 and 99),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (album_id, sticker_code)
);

create table if not exists activity_log (
  id bigserial primary key,
  album_id uuid not null references albums(id) on delete cascade,
  sticker_code text not null references stickers(code) on delete cascade,
  sticker_name text not null,
  sticker_team text not null,
  user_name text not null,
  action text not null,
  quantity integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists album_stickers_album_idx on album_stickers(album_id);
create index if not exists activity_log_album_created_idx on activity_log(album_id, created_at desc);
create index if not exists stickers_search_idx on stickers(team_code, code);

alter table albums enable row level security;
alter table profiles enable row level security;
alter table album_stickers enable row level security;
alter table activity_log enable row level security;
alter table album_editions enable row level security;
alter table sections enable row level security;
alter table teams enable row level security;
alter table stickers enable row level security;

drop policy if exists "catalog is readable by authenticated users" on album_editions;
drop policy if exists "sections are readable by authenticated users" on sections;
drop policy if exists "teams are readable by authenticated users" on teams;
drop policy if exists "stickers are readable by authenticated users" on stickers;
drop policy if exists "profiles can read own profile" on profiles;
drop policy if exists "albums can be read by their profile user" on albums;
drop policy if exists "album stickers can be read by their profile user" on album_stickers;
drop policy if exists "activity can be read by their profile user" on activity_log;

create policy "catalog is readable by authenticated users" on album_editions for select to authenticated using (true);
create policy "sections are readable by authenticated users" on sections for select to authenticated using (true);
create policy "teams are readable by authenticated users" on teams for select to authenticated using (true);
create policy "stickers are readable by authenticated users" on stickers for select to authenticated using (true);

create policy "profiles can read own profile" on profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy "albums can be read by their profile user" on albums
  for select to authenticated
  using (id in (select album_id from profiles where user_id = auth.uid()));

create policy "album stickers can be read by their profile user" on album_stickers
  for select to authenticated
  using (album_id in (select album_id from profiles where user_id = auth.uid()));

create policy "activity can be read by their profile user" on activity_log
  for select to authenticated
  using (album_id in (select album_id from profiles where user_id = auth.uid()));

create or replace function ensure_album_for_user(p_username text)
returns table(user_id uuid, username text, album_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_username text := lower(trim(p_username));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.album_id into v_album_id
  from profiles p
  where p.user_id = auth.uid();

  if v_album_id is null then
    insert into albums (owner_id, edition_id, name)
    values (auth.uid(), 'fifa-world-cup-2026', 'Album ' || v_username)
    returning id into v_album_id;

    insert into profiles (user_id, username, album_id)
    values (auth.uid(), v_username, v_album_id);
  end if;

  return query
    select p.user_id, p.username, p.album_id
    from profiles p
    where p.user_id = auth.uid();
end;
$$;

create or replace function set_sticker_quantity(p_sticker_code text, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_username text;
  v_sticker stickers%rowtype;
  v_previous integer := 0;
  v_quantity integer := greatest(0, least(99, p_quantity));
  v_action text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.album_id, p.username into v_album_id, v_username
  from profiles p
  where p.user_id = auth.uid();

  if v_album_id is null then
    raise exception 'No album found for user';
  end if;

  select * into v_sticker
  from stickers
  where code = upper(trim(p_sticker_code));

  if v_sticker.code is null then
    raise exception 'Sticker not found: %', p_sticker_code;
  end if;

  select coalesce(s.quantity, 0) into v_previous
  from album_stickers s
  where s.album_id = v_album_id and s.sticker_code = v_sticker.code;

  if v_quantity = 0 then
    delete from album_stickers
    where album_id = v_album_id and sticker_code = v_sticker.code;
    v_action := v_username || ' desmarco ' || v_sticker.code || ' - ' || v_sticker.name;
  else
    insert into album_stickers (album_id, sticker_code, quantity, updated_by, updated_at)
    values (v_album_id, v_sticker.code, v_quantity, auth.uid(), now())
    on conflict (album_id, sticker_code)
    do update set quantity = excluded.quantity, updated_by = excluded.updated_by, updated_at = excluded.updated_at;

    if v_previous = 0 then
      v_action := v_username || ' marco ' || v_sticker.code || ' - ' || v_sticker.name;
    elsif v_quantity > v_previous then
      v_action := v_username || ' sumo repetida de ' || v_sticker.code || ' - ' || v_sticker.name;
    elsif v_quantity < v_previous then
      v_action := v_username || ' resto una copia de ' || v_sticker.code || ' - ' || v_sticker.name;
    else
      v_action := v_username || ' actualizo ' || v_sticker.code || ' - ' || v_sticker.name;
    end if;
  end if;

  insert into activity_log (album_id, sticker_code, sticker_name, sticker_team, user_name, action, quantity)
  values (v_album_id, v_sticker.code, v_sticker.name, v_sticker.team_name, v_username, v_action, v_quantity);
end;
$$;

create or replace function increment_sticker_quantity(p_sticker_code text, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_current integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.album_id into v_album_id
  from profiles p
  where p.user_id = auth.uid();

  select coalesce(s.quantity, 0) into v_current
  from album_stickers s
  where s.album_id = v_album_id and s.sticker_code = upper(trim(p_sticker_code));

  perform set_sticker_quantity(p_sticker_code, greatest(0, v_current + p_delta));
end;
$$;

grant execute on function ensure_album_for_user(text) to authenticated;
grant execute on function set_sticker_quantity(text, integer) to authenticated;
grant execute on function increment_sticker_quantity(text, integer) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table album_stickers;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table activity_log;
  exception when duplicate_object then null;
  end;
end;
$$;
