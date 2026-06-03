-- Coca Cola bonus rollout for FiguritasApp.
-- Safe to run in production: it does not delete, truncate, or update album_stickers.
-- It adds catalog rows with on conflict and keeps the main edition total at 980.

begin;

insert into album_editions (id, name, total_stickers)
values ('fifa-world-cup-2026', 'FIFA World Cup 2026', 980)
on conflict (id) do update
set name = excluded.name,
    total_stickers = 980;

insert into sections (id, edition_id, name, sort_order)
values ('section-13', 'fifa-world-cup-2026', 'Coca Cola', 13)
on conflict (id) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into teams (code, edition_id, section_id, name, sort_order)
values ('CC', 'fifa-world-cup-2026', 'section-13', 'Coca Cola', 0)
on conflict (code) do update
set section_id = excluded.section_id,
    name = excluded.name,
    sort_order = excluded.sort_order;

insert into stickers (code, edition_id, section_id, team_code, team_name, name, sticker_type, is_foil, position)
values
  ('CC1', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Lamine Yamal', 'intro', false, 1),
  ('CC2', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Joshua Kimmich', 'intro', false, 2),
  ('CC3', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Harry Kane', 'intro', false, 3),
  ('CC4', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Santiago Gimenez', 'intro', false, 4),
  ('CC5', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Josko Gvardiol', 'intro', false, 5),
  ('CC6', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Federico Valverde', 'intro', false, 6),
  ('CC7', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Jefferson Lerma', 'intro', false, 7),
  ('CC8', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Enner Valencia', 'intro', false, 8),
  ('CC9', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Gabriel Magalhaes', 'intro', false, 9),
  ('CC10', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Virgil Van Dijk', 'intro', false, 10),
  ('CC11', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Alphonso Davies', 'intro', false, 11),
  ('CC12', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Emiliano Martinez', 'intro', false, 12),
  ('CC13', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Raul Gimenez', 'intro', false, 13),
  ('CC14', 'fifa-world-cup-2026', 'section-13', 'CC', 'Coca Cola', 'Lautaro Martinez', 'intro', false, 14)
on conflict (code) do update
set section_id = excluded.section_id,
    team_code = excluded.team_code,
    team_name = excluded.team_name,
    name = excluded.name,
    sticker_type = excluded.sticker_type,
    is_foil = excluded.is_foil,
    position = excluded.position;

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
        where s.album_id = fp.album_id
          and s.quantity > 0
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
      when fc.status = 'accepted' and fc.total_stickers > 0 then floor((fc.owned_total::numeric / fc.total_stickers::numeric) * 100)::integer
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

grant execute on function get_friend_summaries() to authenticated;
grant execute on function create_trade_proposal(text, jsonb, boolean, boolean, boolean) to authenticated;

commit;
