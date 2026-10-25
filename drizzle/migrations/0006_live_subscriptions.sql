-- Bascule test -> production : les abonnements et evenements webhook acceptent
-- l'environnement 'live' en plus de 'sandbox'. La regle d'acces reste identique ;
-- un abonnement valide dans l'un ou l'autre environnement donne acces (la meme
-- base sert l'apercu et l'application publiee).

alter table public.shop_subscriptions
  drop constraint if exists shop_subscriptions_environment_check;
alter table public.shop_subscriptions
  add constraint shop_subscriptions_environment_check
  check (environment in ('sandbox', 'live'));

alter table public.payment_webhook_events
  drop constraint if exists payment_webhook_events_environment_check;
alter table public.payment_webhook_events
  add constraint payment_webhook_events_environment_check
  check (environment in ('sandbox', 'live'));

-- Synchronisation idempotente des abonnements, parametree par environnement.
-- Remplace apply_test_subscription_event (sandbox en dur).
create or replace function public.apply_subscription_event(
  p_environment text,
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_subscription_id text,
  p_customer_id text,
  p_user_id uuid,
  p_shop_id uuid,
  p_status text,
  p_period_end timestamptz,
  p_cancel boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_environment not in ('sandbox', 'live') then
    raise exception 'Unknown environment';
  end if;
  if exists(
    select 1 from public.payment_webhook_events
    where environment = p_environment and event_id = p_event_id
  ) then
    return false;
  end if;
  if exists(
    select 1 from public.shop_subscriptions
    where environment = p_environment
      and stripe_subscription_id = p_subscription_id
      and (shop_id <> p_shop_id or user_id <> p_user_id or stripe_customer_id <> p_customer_id)
  ) then
    raise exception 'Subscription ownership mismatch';
  end if;
  insert into public.shop_subscriptions(
    shop_id, user_id, environment, stripe_subscription_id, stripe_customer_id,
    price_id, status, current_period_end, cancel_at_period_end, last_event_created
  ) values(
    p_shop_id, p_user_id, p_environment, p_subscription_id, p_customer_id,
    'trade_in_pro_monthly', p_status, p_period_end, p_cancel, p_event_created
  )
  on conflict(environment, stripe_subscription_id) do update set
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    last_event_created = excluded.last_event_created,
    updated_at = now()
  where public.shop_subscriptions.last_event_created <= excluded.last_event_created;
  insert into public.payment_webhook_events(environment, event_id, event_type)
  values(p_environment, p_event_id, p_event_type);
  return true;
end;
$$;

revoke all on function public.apply_subscription_event(text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean)
  from public, anon, authenticated;
grant execute on function public.apply_subscription_event(text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean)
  to service_role;

drop function if exists public.apply_test_subscription_event(text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean);

-- Acces boutique : un abonnement valide en test OU en reel donne acces.
-- Le reste de la regle (statuts, fin de periode, fenetre de transition) est inchange.
create or replace function public.shop_has_access(_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_subscriptions s
    where s.shop_id = _shop_id
      and s.environment in ('sandbox', 'live')
      and s.status in ('active', 'trialing', 'past_due', 'canceled')
      and s.current_period_end is not null
      and s.current_period_end > now()
  )
  or (
    now() < '2026-11-25T00:00:00+00'::timestamptz
    and exists (
      select 1 from public.shops sh
      where sh.id = _shop_id
        and sh.created_at < '2026-10-26T00:00:00+00'::timestamptz
    )
  );
$$;

grant execute on function public.shop_has_access(uuid) to authenticated;
