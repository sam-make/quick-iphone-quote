CREATE TABLE public.shop_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shop_id uuid NOT NULL REFERENCES public.shops(id), user_id uuid NOT NULL REFERENCES public.profiles(id), environment text NOT NULL CHECK (environment = 'sandbox'), stripe_subscription_id text NOT NULL, stripe_customer_id text NOT NULL, price_id text NOT NULL CHECK (price_id = 'trade_in_pro_monthly'), status text NOT NULL CHECK (status IN ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')), current_period_end timestamptz, cancel_at_period_end boolean NOT NULL DEFAULT false, last_event_created bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(environment,stripe_subscription_id)
);
GRANT SELECT ON public.shop_subscriptions TO authenticated;
GRANT ALL ON public.shop_subscriptions TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.shop_subscriptions FROM authenticated, anon;
ALTER TABLE public.shop_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY shop_subscription_read ON public.shop_subscriptions FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE TABLE public.payment_webhook_events (environment text NOT NULL CHECK(environment = 'sandbox'), event_id text NOT NULL, event_type text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(environment,event_id));
GRANT ALL ON public.payment_webhook_events TO service_role;
REVOKE ALL ON public.payment_webhook_events FROM authenticated, anon;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.apply_test_subscription_event(p_event_id text,p_event_type text,p_event_created bigint,p_subscription_id text,p_customer_id text,p_user_id uuid,p_shop_id uuid,p_status text,p_period_end timestamptz,p_cancel boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_subscription_id,0));
 IF EXISTS(SELECT 1 FROM public.payment_webhook_events WHERE environment='sandbox' AND event_id=p_event_id) THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id AND r.shop_id=p.shop_id WHERE p.id=p_user_id AND p.shop_id=p_shop_id AND r.role='admin') THEN RAISE EXCEPTION 'Invalid billing owner'; END IF;
 IF EXISTS(SELECT 1 FROM public.shop_subscriptions WHERE environment='sandbox' AND stripe_subscription_id=p_subscription_id AND (shop_id<>p_shop_id OR user_id<>p_user_id OR stripe_customer_id<>p_customer_id)) THEN RAISE EXCEPTION 'Subscription ownership mismatch'; END IF;
 INSERT INTO public.shop_subscriptions(shop_id,user_id,environment,stripe_subscription_id,stripe_customer_id,price_id,status,current_period_end,cancel_at_period_end,last_event_created) VALUES(p_shop_id,p_user_id,'sandbox',p_subscription_id,p_customer_id,'trade_in_pro_monthly',p_status,p_period_end,p_cancel,p_event_created)
 ON CONFLICT(environment,stripe_subscription_id) DO UPDATE SET status=excluded.status,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,last_event_created=excluded.last_event_created,updated_at=now() WHERE public.shop_subscriptions.last_event_created <= excluded.last_event_created;
 INSERT INTO public.payment_webhook_events(environment,event_id,event_type) VALUES('sandbox',p_event_id,p_event_type);
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_test_subscription_event(text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_test_subscription_event(text,text,bigint,text,text,uuid,uuid,text,timestamptz,boolean) TO service_role;