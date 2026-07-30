-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');
CREATE TYPE public.rule_category AS ENUM ('esthetique', 'technique', 'blocage', 'autre');

-- ============ SHOPS ============
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_shop_id_idx ON public.profiles(shop_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============ DEVICE CATALOG (global reference data) ============
CREATE TABLE public.device_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL DEFAULT 'Apple',
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  colors text[] NOT NULL DEFAULT '{}',
  storages int[] NOT NULL DEFAULT '{}',
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.device_models TO authenticated;
GRANT ALL ON public.device_models TO service_role;
ALTER TABLE public.device_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catalogue lisible par les utilisateurs connectes"
  ON public.device_models FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.storage_step(_gb int)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _gb >= 1024 THEN 170
    WHEN _gb >= 512 THEN 90
    WHEN _gb >= 256 THEN 40
    ELSE 0 END::numeric;
$$;

-- ============ SHOP PRICES (per model + color + storage) ============
CREATE TABLE public.shop_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.device_models(id) ON DELETE CASCADE,
  color text NOT NULL DEFAULT '*',
  storage_gb int NOT NULL,
  base_price numeric(10,2) NOT NULL CHECK (base_price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, model_id, color, storage_gb)
);
CREATE INDEX shop_prices_shop_idx ON public.shop_prices(shop_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_prices TO authenticated;
GRANT ALL ON public.shop_prices TO service_role;
ALTER TABLE public.shop_prices ENABLE ROW LEVEL SECURITY;

-- ============ DEDUCTION RULES ============
CREATE TABLE public.deduction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category public.rule_category NOT NULL DEFAULT 'technique',
  name text NOT NULL,
  deduction numeric(10,2) NOT NULL DEFAULT 0,
  is_blocking boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deduction_rules_shop_idx ON public.deduction_rules(shop_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deduction_rules TO authenticated;
GRANT ALL ON public.deduction_rules TO service_role;
ALTER TABLE public.deduction_rules ENABLE ROW LEVEL SECURITY;

-- ============ ESTIMATIONS ============
CREATE TABLE public.estimations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  model_id uuid REFERENCES public.device_models(id) ON DELETE SET NULL,
  model_name text NOT NULL,
  color text NOT NULL,
  storage_gb int NOT NULL,
  imei text,
  base_price numeric(10,2) NOT NULL DEFAULT 0,
  total_deduction numeric(10,2) NOT NULL DEFAULT 0,
  final_price numeric(10,2) NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX estimations_shop_created_idx ON public.estimations(shop_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimations TO authenticated;
GRANT ALL ON public.estimations TO service_role;
ALTER TABLE public.estimations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.estimation_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id uuid NOT NULL REFERENCES public.estimations(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.deduction_rules(id) ON DELETE SET NULL,
  rule_name text NOT NULL,
  category public.rule_category NOT NULL DEFAULT 'technique',
  deduction numeric(10,2) NOT NULL DEFAULT 0,
  is_blocking boolean NOT NULL DEFAULT false
);
CREATE INDEX estimation_defects_est_idx ON public.estimation_defects(estimation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimation_defects TO authenticated;
GRANT ALL ON public.estimation_defects TO service_role;
ALTER TABLE public.estimation_defects ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
CREATE POLICY "Membres voient leur boutique" ON public.shops FOR SELECT TO authenticated
  USING (id = public.current_shop_id());
CREATE POLICY "Admin modifie sa boutique" ON public.shops FOR UPDATE TO authenticated
  USING (id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Membres voient les profils de la boutique" ON public.profiles FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());
CREATE POLICY "Chacun modifie son profil" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Membres voient les roles de la boutique" ON public.user_roles FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());

CREATE POLICY "Membres lisent les prix" ON public.shop_prices FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());
CREATE POLICY "Admin gere les prix" ON public.shop_prices FOR ALL TO authenticated
  USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Membres lisent les regles" ON public.deduction_rules FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());
CREATE POLICY "Admin gere les regles" ON public.deduction_rules FOR ALL TO authenticated
  USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Membres lisent les estimations" ON public.estimations FOR SELECT TO authenticated
  USING (shop_id = public.current_shop_id());
CREATE POLICY "Membres creent des estimations" ON public.estimations FOR INSERT TO authenticated
  WITH CHECK (shop_id = public.current_shop_id() AND user_id = auth.uid());
CREATE POLICY "Admin supprime des estimations" ON public.estimations FOR DELETE TO authenticated
  USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Membres lisent les defauts" ON public.estimation_defects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.estimations e WHERE e.id = estimation_id AND e.shop_id = public.current_shop_id()));
CREATE POLICY "Membres creent des defauts" ON public.estimation_defects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.estimations e WHERE e.id = estimation_id AND e.shop_id = public.current_shop_id()));

-- ============ DEFAULT RULES SEEDER ============
CREATE OR REPLACE FUNCTION public.seed_default_rules(_shop_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.deduction_rules (shop_id, category, name, deduction, is_blocking, sort_order)
  VALUES
    (_shop_id, 'esthetique', 'Écran rayé', 20, false, 10),
    (_shop_id, 'esthetique', 'Écran fissuré', 80, false, 11),
    (_shop_id, 'esthetique', 'Vitre arrière rayée', 15, false, 12),
    (_shop_id, 'esthetique', 'Vitre arrière cassée', 70, false, 13),
    (_shop_id, 'esthetique', 'Châssis marqué', 20, false, 14),
    (_shop_id, 'esthetique', 'Châssis tordu', 60, false, 15),
    (_shop_id, 'technique', 'Batterie faible (< 85%)', 30, false, 20),
    (_shop_id, 'technique', 'Face ID HS', 100, false, 21),
    (_shop_id, 'technique', 'True Tone absent', 15, false, 22),
    (_shop_id, 'technique', 'Caméra avant HS', 40, false, 23),
    (_shop_id, 'technique', 'Caméra arrière HS', 60, false, 24),
    (_shop_id, 'technique', 'Flash HS', 15, false, 25),
    (_shop_id, 'technique', 'Micro HS', 20, false, 26),
    (_shop_id, 'technique', 'Haut-parleur HS', 25, false, 27),
    (_shop_id, 'technique', 'Écouteur HS', 25, false, 28),
    (_shop_id, 'technique', 'Charge défectueuse', 35, false, 29),
    (_shop_id, 'technique', 'Wi-Fi HS', 50, false, 30),
    (_shop_id, 'technique', 'Bluetooth HS', 40, false, 31),
    (_shop_id, 'technique', 'NFC HS', 25, false, 32),
    (_shop_id, 'technique', 'Réseau HS', 90, false, 33),
    (_shop_id, 'technique', 'Boutons défectueux', 20, false, 34),
    (_shop_id, 'technique', 'Vibreur HS', 15, false, 35),
    (_shop_id, 'blocage', 'iPhone bloqué iCloud', 0, true, 40),
    (_shop_id, 'blocage', 'Activation Lock actif', 0, true, 41),
    (_shop_id, 'blocage', 'Compte Apple toujours présent', 0, true, 42),
    (_shop_id, 'blocage', 'SS06 détecté', 0, true, 43);
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER shops_touch BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER rules_touch BEFORE UPDATE ON public.deduction_rules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER prices_touch BEFORE UPDATE ON public.shop_prices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CATALOG SEED ============
INSERT INTO public.device_models (brand, name, slug, sort_order, colors, storages, base_price) VALUES
('Apple', 'iPhone X', 'iphone-x', 0, ARRAY['Argent','Gris sidéral']::text[], ARRAY[64,256]::int[], 90),
('Apple', 'iPhone XS', 'iphone-xs', 1, ARRAY['Argent','Gris sidéral','Or']::text[], ARRAY[64,256,512]::int[], 110),
('Apple', 'iPhone XS Max', 'iphone-xs-max', 2, ARRAY['Argent','Gris sidéral','Or']::text[], ARRAY[64,256,512]::int[], 140),
('Apple', 'iPhone XR', 'iphone-xr', 3, ARRAY['Noir','Blanc','Bleu','Jaune','Corail','(PRODUCT)RED']::text[], ARRAY[64,128,256]::int[], 120),
('Apple', 'iPhone 11', 'iphone-11', 4, ARRAY['Noir','Blanc','Vert','Jaune','Mauve','(PRODUCT)RED']::text[], ARRAY[64,128,256]::int[], 170),
('Apple', 'iPhone 11 Pro', 'iphone-11-pro', 5, ARRAY['Vert nuit','Gris sidéral','Argent','Or']::text[], ARRAY[64,256,512]::int[], 210),
('Apple', 'iPhone 11 Pro Max', 'iphone-11-pro-max', 6, ARRAY['Vert nuit','Gris sidéral','Argent','Or']::text[], ARRAY[64,256,512]::int[], 250),
('Apple', 'iPhone SE (2020)', 'iphone-se-2020', 7, ARRAY['Noir','Blanc','(PRODUCT)RED']::text[], ARRAY[64,128,256]::int[], 90),
('Apple', 'iPhone 12 mini', 'iphone-12-mini', 8, ARRAY['Noir','Blanc','(PRODUCT)RED','Vert','Bleu','Mauve']::text[], ARRAY[64,128,256]::int[], 180),
('Apple', 'iPhone 12', 'iphone-12', 9, ARRAY['Noir','Blanc','(PRODUCT)RED','Vert','Bleu','Mauve']::text[], ARRAY[64,128,256]::int[], 240),
('Apple', 'iPhone 12 Pro', 'iphone-12-pro', 10, ARRAY['Graphite','Argent','Or','Bleu Pacifique']::text[], ARRAY[128,256,512]::int[], 300),
('Apple', 'iPhone 12 Pro Max', 'iphone-12-pro-max', 11, ARRAY['Graphite','Argent','Or','Bleu Pacifique']::text[], ARRAY[128,256,512]::int[], 350),
('Apple', 'iPhone 13 mini', 'iphone-13-mini', 12, ARRAY['Minuit','Lumière stellaire','Rose','Bleu','Vert','(PRODUCT)RED']::text[], ARRAY[128,256,512]::int[], 250),
('Apple', 'iPhone 13', 'iphone-13', 13, ARRAY['Minuit','Lumière stellaire','Rose','Bleu','Vert','(PRODUCT)RED']::text[], ARRAY[128,256,512]::int[], 320),
('Apple', 'iPhone 13 Pro', 'iphone-13-pro', 14, ARRAY['Graphite','Or','Argent','Bleu Alpin','Vert Alpin']::text[], ARRAY[128,256,512,1024]::int[], 400),
('Apple', 'iPhone 13 Pro Max', 'iphone-13-pro-max', 15, ARRAY['Graphite','Or','Argent','Bleu Alpin','Vert Alpin']::text[], ARRAY[128,256,512,1024]::int[], 460),
('Apple', 'iPhone SE (2022)', 'iphone-se-2022', 16, ARRAY['Minuit','Lumière stellaire','(PRODUCT)RED']::text[], ARRAY[64,128,256]::int[], 130),
('Apple', 'iPhone 14', 'iphone-14', 17, ARRAY['Minuit','Lumière stellaire','Mauve','Bleu','Jaune','(PRODUCT)RED']::text[], ARRAY[128,256,512]::int[], 400),
('Apple', 'iPhone 14 Plus', 'iphone-14-plus', 18, ARRAY['Minuit','Lumière stellaire','Mauve','Bleu','Jaune','(PRODUCT)RED']::text[], ARRAY[128,256,512]::int[], 450),
('Apple', 'iPhone 14 Pro', 'iphone-14-pro', 19, ARRAY['Noir sidéral','Argent','Or','Mauve intense']::text[], ARRAY[128,256,512,1024]::int[], 550),
('Apple', 'iPhone 14 Pro Max', 'iphone-14-pro-max', 20, ARRAY['Noir sidéral','Argent','Or','Mauve intense']::text[], ARRAY[128,256,512,1024]::int[], 620),
('Apple', 'iPhone 15', 'iphone-15', 21, ARRAY['Noir','Bleu','Vert','Jaune','Rose']::text[], ARRAY[128,256,512]::int[], 520),
('Apple', 'iPhone 15 Plus', 'iphone-15-plus', 22, ARRAY['Noir','Bleu','Vert','Jaune','Rose']::text[], ARRAY[128,256,512]::int[], 580),
('Apple', 'iPhone 15 Pro', 'iphone-15-pro', 23, ARRAY['Titane noir','Titane blanc','Titane bleu','Titane naturel']::text[], ARRAY[128,256,512,1024]::int[], 680),
('Apple', 'iPhone 15 Pro Max', 'iphone-15-pro-max', 24, ARRAY['Titane noir','Titane blanc','Titane bleu','Titane naturel']::text[], ARRAY[256,512,1024]::int[], 800),
('Apple', 'iPhone 16e', 'iphone-16e', 25, ARRAY['Noir','Blanc']::text[], ARRAY[128,256,512]::int[], 450),
('Apple', 'iPhone 16', 'iphone-16', 26, ARRAY['Noir','Blanc','Rose','Sarcelle','Outremer']::text[], ARRAY[128,256,512]::int[], 650),
('Apple', 'iPhone 16 Plus', 'iphone-16-plus', 27, ARRAY['Noir','Blanc','Rose','Sarcelle','Outremer']::text[], ARRAY[128,256,512]::int[], 720),
('Apple', 'iPhone 16 Pro', 'iphone-16-pro', 28, ARRAY['Titane noir','Titane blanc','Titane naturel','Titane sable']::text[], ARRAY[128,256,512,1024]::int[], 850),
('Apple', 'iPhone 16 Pro Max', 'iphone-16-pro-max', 29, ARRAY['Titane noir','Titane blanc','Titane naturel','Titane sable']::text[], ARRAY[256,512,1024]::int[], 980)
ON CONFLICT (slug) DO NOTHING;