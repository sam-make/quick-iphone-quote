-- Server-side subscription gate: one shared rule for direct table writes.
-- Access = active/trialing/past_due/canceled subscription with a future period end
-- (failed payments keep access during the paid period; cancellation keeps it until
-- period end), OR a legacy shop (created before 2026-10-26) inside its 30-day
-- transition window ending 2026-11-25. Mirrors resolveShopAccess in src/lib/access.ts.

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
      and s.environment = 'sandbox'
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

-- Deduction rules: replace the ALL policy with write-only policies gated by access
-- (reads stay open through the existing "Membres lisent les regles" SELECT policy).
drop policy "Admin gere les regles" on public.deduction_rules;
create policy "Admin gere les regles" on public.deduction_rules for insert to authenticated
  with check (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));
create policy "Admin modifie les regles" on public.deduction_rules for update to authenticated
  using (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id))
  with check (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));
create policy "Admin supprime les regles" on public.deduction_rules for delete to authenticated
  using (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));

-- Repair services
drop policy "Admin gere les prestations" on public.repair_services;
create policy "Admin gere les prestations" on public.repair_services for insert to authenticated
  with check (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));
create policy "Admin modifie les prestations" on public.repair_services for update to authenticated
  using (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id))
  with check (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));
create policy "Admin supprime les prestations" on public.repair_services for delete to authenticated
  using (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));

-- Shop price overrides
drop policy "Admin gere les prix" on public.shop_prices;
create policy "Admin gere les prix" on public.shop_prices for insert to authenticated
  with check (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));
create policy "Admin modifie les prix" on public.shop_prices for update to authenticated
  using (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id))
  with check (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));
create policy "Admin supprime les prix" on public.shop_prices for delete to authenticated
  using (shop_id = current_shop_id() and has_role(auth.uid(), 'admin'::app_role) and public.shop_has_access(shop_id));

-- Market analyses (member writes)
drop policy "Members insert shop analyses" on public.estimation_market_analyses;
create policy "Members insert shop analyses" on public.estimation_market_analyses for insert to authenticated
  with check (shop_id = current_shop_id() and public.shop_has_access(shop_id) and exists (
    select 1 from public.estimations e
    where e.id = estimation_market_analyses.estimation_id and e.shop_id = current_shop_id()
  ));
drop policy "Members update shop analyses" on public.estimation_market_analyses;
create policy "Members update shop analyses" on public.estimation_market_analyses for update to authenticated
  using (shop_id = current_shop_id() and public.shop_has_access(shop_id))
  with check (shop_id = current_shop_id() and public.shop_has_access(shop_id) and exists (
    select 1 from public.estimations e
    where e.id = estimation_market_analyses.estimation_id and e.shop_id = current_shop_id()
  ));