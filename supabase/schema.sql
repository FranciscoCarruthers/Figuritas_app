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

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  notify_trades boolean not null default true,
  notify_sticker_updates boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create table if not exists user_announcements (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_key text not null check (announcement_key <> ''),
  seen_at timestamptz not null default now(),
  primary key (user_id, announcement_key)
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

create table if not exists trade_proposals (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  same_quantity boolean not null default true,
  same_foils boolean not null default false,
  same_formations boolean not null default false,
  requester_applied_at timestamptz,
  addressee_applied_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create table if not exists trade_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references trade_proposals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  sticker_code text not null references stickers(code) on delete cascade,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  created_at timestamptz not null default now(),
  check (owner_id <> receiver_id)
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
create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id, enabled);
create index if not exists user_announcements_user_idx on user_announcements(user_id);
create index if not exists friendships_requester_idx on friendships(requester_id);
create index if not exists friendships_addressee_idx on friendships(addressee_id);
create index if not exists trade_proposals_requester_idx on trade_proposals(requester_id);
create index if not exists trade_proposals_addressee_idx on trade_proposals(addressee_id);
create index if not exists trade_items_proposal_idx on trade_items(proposal_id);
create unique index if not exists friendships_unique_pair_idx on friendships (
  (case when requester_id < addressee_id then requester_id else addressee_id end),
  (case when requester_id < addressee_id then addressee_id else requester_id end)
);

alter table albums enable row level security;
alter table profiles enable row level security;
alter table push_subscriptions enable row level security;
alter table user_announcements enable row level security;
alter table friendships enable row level security;
alter table trade_proposals enable row level security;
alter table trade_items enable row level security;
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
drop policy if exists "push subscriptions can be read by owner" on push_subscriptions;
drop policy if exists "push subscriptions can be inserted by owner" on push_subscriptions;
drop policy if exists "push subscriptions can be updated by owner" on push_subscriptions;
drop policy if exists "push subscriptions can be deleted by owner" on push_subscriptions;
drop policy if exists "user announcements can be read by owner" on user_announcements;
drop policy if exists "user announcements can be inserted by owner" on user_announcements;
drop policy if exists "friendships can be read by participants" on friendships;
drop policy if exists "trade proposals can be read by participants" on trade_proposals;
drop policy if exists "trade items can be read by participants" on trade_items;
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

create policy "push subscriptions can be read by owner" on push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy "push subscriptions can be inserted by owner" on push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "push subscriptions can be updated by owner" on push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push subscriptions can be deleted by owner" on push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

create policy "user announcements can be read by owner" on user_announcements
  for select to authenticated
  using (user_id = auth.uid());

create policy "user announcements can be inserted by owner" on user_announcements
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "friendships can be read by participants" on friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "trade proposals can be read by participants" on trade_proposals
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "trade items can be read by participants" on trade_items
  for select to authenticated
  using (
    proposal_id in (
      select id
      from trade_proposals
      where requester_id = auth.uid() or addressee_id = auth.uid()
    )
  );

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
        join stickers st on st.code = s.sticker_code
        where s.album_id = fp.album_id and s.quantity > 0
          and st.team_code <> 'CC'
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

create or replace function validate_trade_proposal_availability(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_album_id uuid;
  v_quantity integer;
begin
  for v_item in
    select ti.*
    from trade_items ti
    where ti.proposal_id = p_proposal_id
  loop
    select p.album_id into v_album_id
    from profiles p
    where p.user_id = v_item.owner_id;

    select coalesce(s.quantity, 0) into v_quantity
    from album_stickers s
    where s.album_id = v_album_id and s.sticker_code = v_item.sticker_code;

    if greatest(0, coalesce(v_quantity, 0) - 1) < v_item.quantity then
      raise exception 'Ya no hay repetidas suficientes para %.', v_item.sticker_code;
    end if;
  end loop;
end;
$$;

create or replace function create_trade_proposal(
  p_friend_username text,
  p_items jsonb,
  p_same_quantity boolean default true,
  p_same_foils boolean default false,
  p_same_formations boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friend_user_id uuid;
  v_proposal_id uuid;
  v_item jsonb;
  v_side text;
  v_code text;
  v_quantity integer;
  v_owner_id uuid;
  v_receiver_id uuid;
  v_owner_album_id uuid;
  v_owner_quantity integer;
  v_my_total integer := 0;
  v_their_total integer := 0;
  v_my_foils integer := 0;
  v_their_foils integer := 0;
  v_my_formations integer := 0;
  v_their_formations integer := 0;
  v_is_foil boolean;
  v_is_formation boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.user_id into v_friend_user_id
  from profiles p
  where p.username = lower(trim(p_friend_username));

  if v_friend_user_id is null then
    raise exception 'No encontramos ese usuario.';
  end if;

  if v_friend_user_id = auth.uid() then
    raise exception 'No podes proponerte un intercambio a vos mismo.';
  end if;

  if not exists (
    select 1
    from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = v_friend_user_id)
        or (f.requester_id = v_friend_user_id and f.addressee_id = auth.uid()))
  ) then
    raise exception 'Solo podes intercambiar con amigos aceptados.';
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'La propuesta no tiene items validos.';
  end if;

  insert into trade_proposals (requester_id, addressee_id, same_quantity, same_foils, same_formations)
  values (auth.uid(), v_friend_user_id, coalesce(p_same_quantity, true), coalesce(p_same_foils, false), coalesce(p_same_formations, false))
  returning id into v_proposal_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_side := lower(coalesce(v_item->>'side', ''));
    v_code := upper(regexp_replace(coalesce(v_item->>'code', ''), '\s+', '', 'g'));
    v_quantity := greatest(1, least(99, coalesce((v_item->>'quantity')::integer, 1)));

    if v_side = 'mine' then
      v_owner_id := auth.uid();
      v_receiver_id := v_friend_user_id;
    elsif v_side in ('theirs', 'friend') then
      v_owner_id := v_friend_user_id;
      v_receiver_id := auth.uid();
    else
      raise exception 'Cada item tiene que indicar side mine o theirs.';
    end if;

    select s.is_foil, (s.team_code <> 'FWC' and s.team_code <> 'CC' and s.position = 13)
      into v_is_foil, v_is_formation
    from stickers s
    where s.code = v_code;

    if v_is_foil is null then
      raise exception 'Sticker no encontrada: %', v_code;
    end if;

    select p.album_id into v_owner_album_id
    from profiles p
    where p.user_id = v_owner_id;

    select coalesce(s.quantity, 0) into v_owner_quantity
    from album_stickers s
    where s.album_id = v_owner_album_id and s.sticker_code = v_code;

    if greatest(0, coalesce(v_owner_quantity, 0) - 1) < v_quantity then
      raise exception 'No hay repetidas suficientes de %.', v_code;
    end if;

    insert into trade_items (proposal_id, owner_id, receiver_id, sticker_code, quantity)
    values (v_proposal_id, v_owner_id, v_receiver_id, v_code, v_quantity);

    if v_owner_id = auth.uid() then
      v_my_total := v_my_total + v_quantity;
      if v_is_foil then v_my_foils := v_my_foils + v_quantity; end if;
      if v_is_formation then v_my_formations := v_my_formations + v_quantity; end if;
    else
      v_their_total := v_their_total + v_quantity;
      if v_is_foil then v_their_foils := v_their_foils + v_quantity; end if;
      if v_is_formation then v_their_formations := v_their_formations + v_quantity; end if;
    end if;
  end loop;

  if v_my_total = 0 or v_their_total = 0 then
    raise exception 'Elegi al menos una figurita de cada lado.';
  end if;

  if coalesce(p_same_quantity, true) and v_my_total <> v_their_total then
    raise exception 'La cantidad total de figuritas tiene que coincidir.';
  end if;

  if coalesce(p_same_foils, false) and v_my_foils <> v_their_foils then
    raise exception 'La cantidad de brillantes tiene que coincidir.';
  end if;

  if coalesce(p_same_formations, false) and v_my_formations <> v_their_formations then
    raise exception 'La cantidad de formaciones tiene que coincidir.';
  end if;

  return v_proposal_id;
end;
$$;

create or replace function respond_trade_proposal(p_proposal_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal trade_proposals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_proposal
  from trade_proposals
  where id = p_proposal_id
    and addressee_id = auth.uid()
    and status = 'pending';

  if v_proposal.id is null then
    raise exception 'No encontramos una propuesta pendiente para responder.';
  end if;

  if p_accept then
    perform validate_trade_proposal_availability(p_proposal_id);
  end if;

  update trade_proposals
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now(),
      updated_at = now()
  where id = p_proposal_id;
end;
$$;

create or replace function cancel_trade_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update trade_proposals
  set status = 'cancelled',
      updated_at = now()
  where id = p_proposal_id
    and (
      (status = 'pending' and requester_id = auth.uid())
      or (
        status = 'accepted'
        and (requester_id = auth.uid() or addressee_id = auth.uid())
        and requester_applied_at is null
        and addressee_applied_at is null
      )
    );

  if not found then
    raise exception 'No se pudo cancelar esta propuesta.';
  end if;
end;
$$;

create or replace function apply_trade_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal trade_proposals%rowtype;
  v_item record;
  v_album_id uuid;
  v_current integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_proposal
  from trade_proposals
  where id = p_proposal_id
    and status = 'accepted'
    and (requester_id = auth.uid() or addressee_id = auth.uid());

  if v_proposal.id is null then
    raise exception 'El intercambio no esta aceptado o no existe.';
  end if;

  if (v_proposal.requester_id = auth.uid() and v_proposal.requester_applied_at is not null)
    or (v_proposal.addressee_id = auth.uid() and v_proposal.addressee_applied_at is not null) then
    raise exception 'Ya anotaste este intercambio en tu album.';
  end if;

  select p.album_id into v_album_id
  from profiles p
  where p.user_id = auth.uid();

  for v_item in
    select ti.*
    from trade_items ti
    where ti.proposal_id = p_proposal_id
      and (ti.owner_id = auth.uid() or ti.receiver_id = auth.uid())
  loop
    select coalesce(s.quantity, 0) into v_current
    from album_stickers s
    where s.album_id = v_album_id and s.sticker_code = v_item.sticker_code;

    if v_item.owner_id = auth.uid() then
      if greatest(0, coalesce(v_current, 0) - v_item.quantity) < 1 then
        raise exception 'No podes entregar %, no quedaria tu copia propia.', v_item.sticker_code;
      end if;
      perform set_sticker_quantity(v_item.sticker_code, v_current - v_item.quantity);
    else
      perform set_sticker_quantity(v_item.sticker_code, least(99, coalesce(v_current, 0) + v_item.quantity));
    end if;
  end loop;

  update trade_proposals
  set requester_applied_at = case when requester_id = auth.uid() then now() else requester_applied_at end,
      addressee_applied_at = case when addressee_id = auth.uid() then now() else addressee_applied_at end,
      updated_at = now()
  where id = p_proposal_id;

  update trade_proposals
  set status = 'completed',
      updated_at = now()
  where id = p_proposal_id
    and requester_applied_at is not null
    and addressee_applied_at is not null;
end;
$$;

create or replace function get_trade_proposals()
returns table(
  id uuid,
  friend_username text,
  direction text,
  status text,
  same_quantity boolean,
  same_foils boolean,
  same_formations boolean,
  my_applied boolean,
  friend_applied boolean,
  created_at timestamptz,
  updated_at timestamptz,
  responded_at timestamptz,
  items jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    tp.id,
    fp.username as friend_username,
    case when tp.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction,
    tp.status,
    tp.same_quantity,
    tp.same_foils,
    tp.same_formations,
    case
      when tp.requester_id = auth.uid() then tp.requester_applied_at is not null
      else tp.addressee_applied_at is not null
    end as my_applied,
    case
      when tp.requester_id = auth.uid() then tp.addressee_applied_at is not null
      else tp.requester_applied_at is not null
    end as friend_applied,
    tp.created_at,
    tp.updated_at,
    tp.responded_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'sticker_code', ti.sticker_code,
          'sticker_name', st.name,
          'sticker_team', st.team_name,
          'is_foil', st.is_foil,
          'position', st.position,
          'quantity', ti.quantity,
          'owner_is_me', ti.owner_id = auth.uid(),
          'receiver_is_me', ti.receiver_id = auth.uid()
        )
        order by ti.created_at, ti.sticker_code
      ) filter (where ti.id is not null),
      '[]'::jsonb
    ) as items
  from trade_proposals tp
  join profiles fp on fp.user_id = case when tp.requester_id = auth.uid() then tp.addressee_id else tp.requester_id end
  left join trade_items ti on ti.proposal_id = tp.id
  left join stickers st on st.code = ti.sticker_code
  where auth.uid() is not null
    and (tp.requester_id = auth.uid() or tp.addressee_id = auth.uid())
  group by tp.id, fp.username
  order by tp.updated_at desc;
$$;

grant execute on function get_friend_summaries() to authenticated;
grant execute on function send_friend_request(text) to authenticated;
grant execute on function respond_friend_request(uuid, boolean) to authenticated;
grant execute on function remove_friend(uuid) to authenticated;
grant execute on function get_friend_album(text) to authenticated;
grant execute on function create_trade_proposal(text, jsonb, boolean, boolean, boolean) to authenticated;
grant execute on function respond_trade_proposal(uuid, boolean) to authenticated;
grant execute on function apply_trade_proposal(uuid) to authenticated;
grant execute on function cancel_trade_proposal(uuid) to authenticated;
grant execute on function get_trade_proposals() to authenticated;

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
