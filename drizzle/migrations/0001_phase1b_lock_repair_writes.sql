-- Repairs, repair lines and status history are written only by server functions
-- (service role) after tenant checks; members keep read access to their shop.
DROP POLICY IF EXISTS "Membres creent des reparations" ON public.repairs;
DROP POLICY IF EXISTS "Membres modifient les reparations" ON public.repairs;
DROP POLICY IF EXISTS "Membres creent des lignes" ON public.repair_items;
DROP POLICY IF EXISTS "Membres modifient les lignes" ON public.repair_items;
DROP POLICY IF EXISTS "Membres suppriment des lignes" ON public.repair_items;
DROP POLICY IF EXISTS "Membres ajoutent a l historique" ON public.repair_status_history;
REVOKE INSERT, UPDATE ON public.repairs FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.repair_items FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.repair_status_history FROM authenticated, anon;
GRANT ALL ON public.repairs, public.repair_items, public.repair_status_history TO service_role;