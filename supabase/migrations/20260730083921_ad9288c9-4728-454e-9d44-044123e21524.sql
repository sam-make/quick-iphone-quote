CREATE OR REPLACE FUNCTION public.storage_step(_gb int)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _gb >= 1024 THEN 170
    WHEN _gb >= 512 THEN 90
    WHEN _gb >= 256 THEN 40
    ELSE 0 END::numeric;
$$;

REVOKE ALL ON FUNCTION public.seed_default_rules(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_rules(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_shop_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_shop_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;