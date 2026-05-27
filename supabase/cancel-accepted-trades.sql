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

grant execute on function cancel_trade_proposal(uuid) to authenticated;
