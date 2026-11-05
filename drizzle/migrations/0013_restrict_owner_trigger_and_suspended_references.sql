REVOKE ALL ON FUNCTION public.guard_member_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_global_owner_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_access_state() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.current_shop_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.shop_id FROM public.profiles p JOIN public.shops s ON s.id=p.shop_id WHERE p.id=auth.uid() AND p.suspended_at IS NULL AND s.suspended_at IS NULL AND s.archived_at IS NULL; $$;