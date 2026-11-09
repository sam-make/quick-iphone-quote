CREATE TABLE public.shop_usage_days (shop_id uuid NOT NULL REFERENCES public.shops(id), day date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Paris')::date, first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(shop_id,day));
GRANT SELECT ON public.shop_usage_days TO authenticated;
GRANT ALL ON public.shop_usage_days TO service_role;
ALTER TABLE public.shop_usage_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_usage_read ON public.shop_usage_days FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE TABLE public.shop_activity_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), shop_id uuid NOT NULL REFERENCES public.shops(id), kind text NOT NULL, source_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,source_id));
GRANT SELECT ON public.shop_activity_events TO authenticated;
GRANT ALL ON public.shop_activity_events TO service_role;
ALTER TABLE public.shop_activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_activity_read ON public.shop_activity_events FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE INDEX shop_activity_time_idx ON public.shop_activity_events(shop_id,occurred_at);
CREATE FUNCTION public.capture_shop_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; k text; BEGIN
IF TG_TABLE_NAME='repair_status_history' THEN SELECT shop_id INTO sid FROM public.repairs WHERE id=NEW.repair_id; k:='repair_status'; ELSE sid:=NEW.shop_id; k:=CASE TG_TABLE_NAME WHEN 'estimations' THEN 'estimation' WHEN 'repairs' THEN 'repair' WHEN 'customers' THEN 'customer' END; END IF;
IF sid IS NOT NULL THEN INSERT INTO public.shop_activity_events(shop_id,kind,source_id,occurred_at) VALUES(sid,k,NEW.id,NEW.created_at) ON CONFLICT DO NOTHING; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.capture_shop_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER analytics_estimation AFTER INSERT ON public.estimations FOR EACH ROW EXECUTE FUNCTION public.capture_shop_activity();
CREATE TRIGGER analytics_repair AFTER INSERT ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.capture_shop_activity();
CREATE TRIGGER analytics_customer AFTER INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.capture_shop_activity();
CREATE TRIGGER analytics_repair_status AFTER INSERT ON public.repair_status_history FOR EACH ROW EXECUTE FUNCTION public.capture_shop_activity();
CREATE FUNCTION public.record_shop_presence() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid:=public.current_shop_id(); BEGIN
IF auth.uid() IS NULL OR sid IS NULL OR NOT public.business_access_allowed() OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND shop_id=sid) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
INSERT INTO public.shop_usage_days(shop_id,day) VALUES(sid,(now() AT TIME ZONE 'Europe/Paris')::date) ON CONFLICT(shop_id,day) DO UPDATE SET last_seen_at=now(); END $$;
REVOKE ALL ON FUNCTION public.record_shop_presence() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_shop_presence() TO authenticated;
CREATE FUNCTION public.owner_analytics(_days integer DEFAULT 30,_shop uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
IF _days NOT IN (7,30,90) THEN RAISE EXCEPTION 'Invalid period'; END IF;
WITH activity AS (
SELECT shop_id,kind,source_id,occurred_at FROM public.shop_activity_events
UNION ALL SELECT e.shop_id,'estimation',e.id,e.created_at FROM public.estimations e WHERE NOT EXISTS(SELECT 1 FROM public.shop_activity_events a WHERE a.kind='estimation' AND a.source_id=e.id)
UNION ALL SELECT r.shop_id,'repair',r.id,r.created_at FROM public.repairs r WHERE NOT EXISTS(SELECT 1 FROM public.shop_activity_events a WHERE a.kind='repair' AND a.source_id=r.id)
UNION ALL SELECT c.shop_id,'customer',c.id,c.created_at FROM public.customers c WHERE NOT EXISTS(SELECT 1 FROM public.shop_activity_events a WHERE a.kind='customer' AND a.source_id=c.id)
UNION ALL SELECT r.shop_id,'repair_status',h.id,h.created_at FROM public.repair_status_history h JOIN public.repairs r ON r.id=h.repair_id WHERE NOT EXISTS(SELECT 1 FROM public.shop_activity_events a WHERE a.kind='repair_status' AND a.source_id=h.id)
), dates AS (SELECT generate_series((now() AT TIME ZONE 'Europe/Paris')::date-(_days-1),(now() AT TIME ZONE 'Europe/Paris')::date,'1 day')::date AS day), metrics AS (
SELECT s.id,s.name,s.created_at,s.suspended_at,s.archived_at,
(SELECT max(u.last_sign_in_at) FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.shop_id=s.id) last_login,
GREATEST((SELECT max(a.occurred_at) FROM activity a WHERE a.shop_id=s.id),(SELECT max(last_seen_at) FROM public.shop_usage_days WHERE shop_id=s.id)) last_activity,
(SELECT count(*) FROM public.estimations WHERE shop_id=s.id) estimations,
(SELECT count(*) FROM public.repairs WHERE shop_id=s.id) repairs,
(SELECT count(*) FROM public.customers WHERE shop_id=s.id) customers,
(SELECT count(*) FROM public.estimations WHERE shop_id=s.id AND (created_at AT TIME ZONE 'Europe/Paris')::date=(now() AT TIME ZONE 'Europe/Paris')::date) estimates_today,
(SELECT count(*) FROM public.estimations WHERE shop_id=s.id AND (created_at AT TIME ZONE 'Europe/Paris')::date >= (now() AT TIME ZONE 'Europe/Paris')::date-6) estimates_week,
(SELECT count(*) FROM public.estimations WHERE shop_id=s.id AND (created_at AT TIME ZONE 'Europe/Paris')::date >= (now() AT TIME ZONE 'Europe/Paris')::date-29) estimates_month,
(SELECT count(*) FROM public.estimations WHERE shop_id=s.id AND (created_at AT TIME ZONE 'Europe/Paris')::date >= (now() AT TIME ZONE 'Europe/Paris')::date-(_days-1)) period_estimates,
(SELECT count(DISTINCT day) FROM (SELECT (occurred_at AT TIME ZONE 'Europe/Paris')::date AS day FROM activity WHERE shop_id=s.id UNION SELECT day FROM public.shop_usage_days WHERE shop_id=s.id) d WHERE day >= (now() AT TIME ZONE 'Europe/Paris')::date-(_days-1)) active_days,
(SELECT count(*) FROM public.shop_usage_days WHERE shop_id=s.id AND day >= (now() AT TIME ZONE 'Europe/Paris')::date-(_days-1)) presence_days
FROM public.shops s
) SELECT jsonb_build_object('now',now(),'tracking_since','2026-11-09T18:42:16Z','shops',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.period_estimates DESC,m.active_days DESC,m.name) FROM metrics m),'[]'::jsonb),
 'trend',coalesce((SELECT jsonb_agg(jsonb_build_object('date',d.day,'estimations',(SELECT count(*) FROM public.estimations WHERE (created_at AT TIME ZONE 'Europe/Paris')::date=d.day AND (_shop IS NULL OR shop_id=_shop)),'repairs',(SELECT count(*) FROM public.repairs WHERE (created_at AT TIME ZONE 'Europe/Paris')::date=d.day AND (_shop IS NULL OR shop_id=_shop)),'customers',(SELECT count(*) FROM public.customers WHERE (created_at AT TIME ZONE 'Europe/Paris')::date=d.day AND (_shop IS NULL OR shop_id=_shop))) ORDER BY d.day) FROM dates d),'[]'::jsonb),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM (SELECT shop_id,kind,occurred_at FROM activity WHERE (_shop IS NULL OR shop_id=_shop) AND (occurred_at AT TIME ZONE 'Europe/Paris')::date >= (now() AT TIME ZONE 'Europe/Paris')::date-(_days-1) UNION ALL SELECT shop_id,'presence',last_seen_at FROM public.shop_usage_days WHERE (_shop IS NULL OR shop_id=_shop) AND day >= (now() AT TIME ZONE 'Europe/Paris')::date-(_days-1) ORDER BY occurred_at DESC LIMIT 200) h),'[]'::jsonb)) INTO result; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.owner_analytics(integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.owner_analytics(integer,uuid) TO authenticated;
COMMENT ON TABLE public.shop_usage_days IS 'Daily server-validated presence; no historical presence backfill.';
COMMENT ON TABLE public.shop_activity_events IS 'Minimal future business events, no customer personal data; existing record dates are read separately.';