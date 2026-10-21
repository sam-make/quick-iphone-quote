-- 1) Sensitive writes go through the server only (service role after tenant checks)
DROP POLICY IF EXISTS "Membres creent des estimations" ON public.estimations;
DROP POLICY IF EXISTS "Membres creent des defauts" ON public.estimation_defects;
DROP POLICY IF EXISTS "Membres creent des factures" ON public.invoices;
REVOKE INSERT, UPDATE, DELETE ON public.estimations FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.estimation_defects FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM authenticated, anon;
GRANT DELETE ON public.estimations TO authenticated;
GRANT ALL ON public.estimations, public.estimation_defects, public.invoices TO service_role;

-- 2) Atomic per-shop yearly counters
CREATE TABLE IF NOT EXISTS public.shop_sequences (
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('REP','FA')),
  year integer NOT NULL,
  value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_id, kind, year)
);
GRANT ALL ON public.shop_sequences TO service_role;
REVOKE ALL ON public.shop_sequences FROM authenticated, anon;
ALTER TABLE public.shop_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_shop_reference(_kind text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shop uuid := public.current_shop_id();
  _year integer := extract(year from (now() at time zone 'utc'))::integer;
  _seed integer;
  _value integer;
BEGIN
  IF _shop IS NULL THEN RAISE EXCEPTION 'Boutique introuvable'; END IF;
  IF _kind NOT IN ('REP','FA') THEN RAISE EXCEPTION 'Type de référence invalide'; END IF;

  IF _kind = 'REP' THEN
    SELECT coalesce(max(split_part(reference, '-', 3)::integer), 0) INTO _seed
    FROM public.repairs WHERE shop_id = _shop AND reference ~ ('^REP-' || _year || '-[0-9]+$');
  ELSE
    SELECT coalesce(max(split_part(number, '-', 3)::integer), 0) INTO _seed
    FROM public.invoices WHERE shop_id = _shop AND number ~ ('^FA-' || _year || '-[0-9]+$');
  END IF;

  INSERT INTO public.shop_sequences AS s (shop_id, kind, year, value)
  VALUES (_shop, _kind, _year, _seed + 1)
  ON CONFLICT (shop_id, kind, year)
  DO UPDATE SET value = greatest(s.value, _seed) + 1
  RETURNING value INTO _value;

  RETURN _kind || '-' || _year || '-' || lpad(_value::text, greatest(4, length(_value::text)), '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_shop_reference(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_shop_reference(text) TO authenticated;