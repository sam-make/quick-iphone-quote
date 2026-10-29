-- Remove only subscription conditions; tenant and admin checks remain unchanged.
DO $$
DECLARE t text; noun text;
BEGIN
  FOR t, noun IN SELECT * FROM (VALUES ('deduction_rules','regles'),('repair_services','prestations'),('shop_prices','prix')) AS targets(t,noun)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), ''admin''::public.app_role))', 'Admin gere les ' || noun, t);
    EXECUTE format('ALTER POLICY %I ON public.%I USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), ''admin''::public.app_role))', 'Admin modifie les ' || noun, t);
    EXECUTE format('ALTER POLICY %I ON public.%I USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), ''admin''::public.app_role))', 'Admin supprime les ' || noun, t);
  END LOOP;
END $$;
ALTER POLICY "Members insert shop analyses" ON public.estimation_market_analyses WITH CHECK (shop_id = public.current_shop_id() AND EXISTS (SELECT 1 FROM public.estimations e WHERE e.id = estimation_market_analyses.estimation_id AND e.shop_id = public.current_shop_id()));
ALTER POLICY "Members update shop analyses" ON public.estimation_market_analyses USING (shop_id = public.current_shop_id()) WITH CHECK (shop_id = public.current_shop_id() AND EXISTS (SELECT 1 FROM public.estimations e WHERE e.id = estimation_market_analyses.estimation_id AND e.shop_id = public.current_shop_id()));
DROP FUNCTION IF EXISTS public.shop_has_access(uuid);
DROP FUNCTION IF EXISTS public.shop_has_access(uuid,text);
DROP FUNCTION IF EXISTS public.apply_subscription_event(text,text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean);
DROP FUNCTION IF EXISTS public.apply_test_subscription_event(text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean);
REVOKE ALL ON public.shop_subscriptions, public.payment_webhook_events FROM anon, authenticated;
COMMENT ON TABLE public.shop_subscriptions IS 'DEPRECATED: payment integration removed; historical rows retained, no application access.';
COMMENT ON TABLE public.payment_webhook_events IS 'DEPRECATED: payment integration removed; historical rows retained, no application access.';