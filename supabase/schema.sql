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

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
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
create index if not exists friendships_requester_idx on friendships(requester_id);
create index if not exists friendships_addressee_idx on friendships(addressee_id);
create unique index if not exists friendships_unique_pair_idx on friendships (
  (case when requester_id < addressee_id then requester_id else addressee_id end),
  (case when requester_id < addressee_id then addressee_id else requester_id end)
);

alter table albums enable row level security;
alter table profiles enable row level security;
alter table friendships enable row level security;
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
drop policy if exists "friendships can be read by participants" on friendships;
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

create policy "friendships can be read by participants" on friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

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

create or replace function get_friend_summaries()
returns table(
  friendship_id uuid,
  username text,
  status text,
  direction text,
  owned_count integer,
  missing_count integer,
  total_count integer,
  percent integer,
  last_updated_at timestamptz,
  requested_at timestamptz,
  responded_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with visible_friendships as (
    select
      f.*,
      case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_user_id,
      case
        when f.status = 'pending' and f.addressee_id = auth.uid() then 'incoming'
        when f.status = 'pending' and f.requester_id = auth.uid() then 'outgoing'
        when f.status = 'accepted' then 'accepted'
        else 'declined'
      end as friendship_direction
    from friendships f
    where auth.uid() is not null
      and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  ),
  friend_profiles as (
    select
      vf.*,
      p.username,
      p.album_id,
      a.created_at as album_created_at,
      e.total_stickers
    from visible_friendships vf
    join profiles p on p.user_id = vf.friend_user_id
    join albums a on a.id = p.album_id
    join album_editions e on e.id = a.edition_id
  ),
  friend_counts as (
    select
      fp.*,
      coalesce((
        select count(*)::integer
        from album_stickers s
        where s.album_id = fp.album_id and s.quantity > 0
      ), 0) as owned_total,
      coalesce((
        select max(l.created_at)
        from activity_log l
        where l.album_id = fp.album_id
      ), (
        select max(s.updated_at)
        from album_stickers s
        where s.album_id = fp.album_id
      ), fp.album_created_at) as album_last_updated_at
    from friend_profiles fp
  )
  select
    fc.id as friendship_id,
    fc.username,
    fc.status,
    fc.friendship_direction as direction,
    case when fc.status = 'accepted' then fc.owned_total else null end as owned_count,
    case when fc.status = 'accepted' then greatest(0, fc.total_stickers - fc.owned_total) else null end as missing_count,
    case when fc.status = 'accepted' then fc.total_stickers else null end as total_count,
    case
      when fc.status = 'accepted' and fc.total_stickers > 0 then round((fc.owned_total::numeric / fc.total_stickers::numeric) * 100)::integer
      else null
    end as percent,
    case when fc.status = 'accepted' then fc.album_last_updated_at else null end as last_updated_at,
    fc.created_at as requested_at,
    fc.responded_at,
    fc.updated_at
  from friend_counts fc
  order by
    case fc.friendship_direction when 'incoming' then 0 when 'accepted' then 1 when 'outgoing' then 2 else 3 end,
    fc.updated_at desc;
$$;

create or replace function send_friend_request(p_username text)
returns table(
  friendship_id uuid,
  username text,
  status text,
  direction text,
  owned_count integer,
  missing_count integer,
  total_count integer,
  percent integer,
  last_updated_at timestamptz,
  requested_at timestamptz,
  responded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_user_id uuid;
  v_friendship_id uuid;
  v_existing_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.user_id into v_target_user_id
  from profiles p
  where p.username = lower(trim(p_username));

  if v_target_user_id is null then
    raise exception 'No encontramos ese usuario.';
  end if;

  if v_target_user_id = auth.uid() then
    raise exception 'No podes agregarte a vos mismo.';
  end if;

  select f.id, f.status into v_friendship_id, v_existing_status
  from friendships f
  where (f.requester_id = auth.uid() and f.addressee_id = v_target_user_id)
     or (f.requester_id = v_target_user_id and f.addressee_id = auth.uid())
  limit 1;

  if v_friendship_id is null then
    insert into friendships (requester_id, addressee_id, status)
    values (auth.uid(), v_target_user_id, 'pending')
    returning id into v_friendship_id;
  elsif v_existing_status = 'declined' then
    update friendships
    set requester_id = auth.uid(),
        addressee_id = v_target_user_id,
        status = 'pending',
        responded_at = null,
        updated_at = now()
    where id = v_friendship_id;
  end if;

  return query
    select s.*
    from get_friend_summaries() s
    where s.friendship_id = v_friendship_id;
end;
$$;

create or replace function respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns table(
  friendship_id uuid,
  username text,
  status text,
  direction text,
  owned_count integer,
  missing_count integer,
  total_count integer,
  percent integer,
  last_updated_at timestamptz,
  requested_at timestamptz,
  responded_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friendship_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update friendships f
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now(),
      updated_at = now()
  where f.id = p_friendship_id
    and f.addressee_id = auth.uid()
    and f.status = 'pending'
  returning f.id into v_friendship_id;

  if v_friendship_id is null then
    raise exception 'No encontramos una solicitud pendiente para responder.';
  end if;

  return query
    select s.*
    from get_friend_summaries() s
    where s.friendship_id = v_friendship_id;
end;
$$;

create or replace function remove_friend(p_friendship_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from friendships f
  where f.id = p_friendship_id
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid());
end;
$$;

create or replace function get_friend_album(p_username text)
returns table(
  username text,
  sticker_code text,
  quantity integer,
  updated_at timestamptz,
  last_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friend_user_id uuid;
  v_album_id uuid;
  v_edition_id text;
  v_username text;
  v_last_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.user_id, p.album_id, a.edition_id, p.username
    into v_friend_user_id, v_album_id, v_edition_id, v_username
  from profiles p
  join albums a on a.id = p.album_id
  where p.username = lower(trim(p_username));

  if v_friend_user_id is null then
    raise exception 'No encontramos ese usuario.';
  end if;

  if v_friend_user_id = auth.uid() then
    raise exception 'Esta seccion es solo para ver amigos.';
  end if;

  if not exists (
    select 1
    from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = v_friend_user_id)
        or (f.requester_id = v_friend_user_id and f.addressee_id = auth.uid()))
  ) then
    raise exception 'Todavia no son amigos.';
  end if;

  select coalesce((
    select max(l.created_at)
    from activity_log l
    where l.album_id = v_album_id
  ), (
    select max(s.updated_at)
    from album_stickers s
    where s.album_id = v_album_id
  ), (
    select a.created_at
    from albums a
    where a.id = v_album_id
  )) into v_last_updated_at;

  return query
    select
      v_username as username,
      st.code as sticker_code,
      coalesce(s.quantity, 0)::integer as quantity,
      s.updated_at,
      v_last_updated_at as last_updated_at
    from stickers st
    left join album_stickers s on s.album_id = v_album_id and s.sticker_code = st.code
    where st.edition_id = v_edition_id
    order by st.section_id, st.team_code, st.position;
end;
$$;

grant execute on function get_friend_summaries() to authenticated;
grant execute on function send_friend_request(text) to authenticated;
grant execute on function respond_friend_request(uuid, boolean) to authenticated;
grant execute on function remove_friend(uuid) to authenticated;
grant execute on function get_friend_album(text) to authenticated;

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
