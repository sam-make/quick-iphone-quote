CREATE TABLE public.estimation_market_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  estimation_id uuid NOT NULL UNIQUE REFERENCES public.estimations(id) ON DELETE CASCADE,
  repair_costs numeric(10,2),
  other_costs numeric(10,2),
  target_margin_pct numeric(5,2),
  pro_price numeric(10,2),
  pro_source text,
  pro_checked_at date,
  pro_confidence text CHECK (pro_confidence IN ('faible','moyenne','elevee')),
  private_price numeric(10,2),
  private_source text,
  private_checked_at date,
  private_confidence text CHECK (private_confidence IN ('faible','moyenne','elevee')),
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (coalesce(repair_costs,0) >= 0 AND coalesce(other_costs,0) >= 0 AND coalesce(pro_price,0) >= 0 AND coalesce(private_price,0) >= 0),
  CHECK (target_margin_pct IS NULL OR (target_margin_pct >= 0 AND target_margin_pct < 100))
);
GRANT SELECT, INSERT, UPDATE ON public.estimation_market_analyses TO authenticated;
GRANT ALL ON public.estimation_market_analyses TO service_role;
ALTER TABLE public.estimation_market_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read shop analyses" ON public.estimation_market_analyses FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE POLICY "Members insert shop analyses" ON public.estimation_market_analyses FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.current_shop_id() AND EXISTS (SELECT 1 FROM public.estimations e WHERE e.id = estimation_id AND e.shop_id = public.current_shop_id()));
CREATE POLICY "Members update shop analyses" ON public.estimation_market_analyses FOR UPDATE TO authenticated
  USING (shop_id = public.current_shop_id())
  WITH CHECK (shop_id = public.current_shop_id() AND EXISTS (SELECT 1 FROM public.estimations e WHERE e.id = estimation_id AND e.shop_id = public.current_shop_id()));
CREATE TRIGGER touch_market_analyses BEFORE UPDATE ON public.estimation_market_analyses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();