-- ENUMS
CREATE TYPE public.repair_status AS ENUM ('recu','diagnostic','attente_validation','attente_piece','en_reparation','tests','termine','restitue','annule');
CREATE TYPE public.photo_phase AS ENUM ('avant','pendant','apres');

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les clients" ON public.customers FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE POLICY "Membres creent des clients" ON public.customers FOR INSERT TO authenticated WITH CHECK (shop_id = public.current_shop_id());
CREATE POLICY "Membres modifient les clients" ON public.customers FOR UPDATE TO authenticated USING (shop_id = public.current_shop_id()) WITH CHECK (shop_id = public.current_shop_id());
CREATE POLICY "Admin supprime les clients" ON public.customers FOR DELETE TO authenticated USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_customers BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX customers_shop_idx ON public.customers(shop_id);

-- CUSTOMER DEVICES
CREATE TABLE public.customer_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT 'Apple',
  model text NOT NULL,
  color text,
  storage text,
  imei text,
  unlock_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_devices TO authenticated;
GRANT ALL ON public.customer_devices TO service_role;
ALTER TABLE public.customer_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les appareils" ON public.customer_devices FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE POLICY "Membres creent des appareils" ON public.customer_devices FOR INSERT TO authenticated WITH CHECK (shop_id = public.current_shop_id());
CREATE POLICY "Membres modifient les appareils" ON public.customer_devices FOR UPDATE TO authenticated USING (shop_id = public.current_shop_id()) WITH CHECK (shop_id = public.current_shop_id());
CREATE POLICY "Admin supprime les appareils" ON public.customer_devices FOR DELETE TO authenticated USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_customer_devices BEFORE UPDATE ON public.customer_devices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX customer_devices_customer_idx ON public.customer_devices(customer_id);

-- REPAIR SERVICES (catalogue configurable)
CREATE TABLE public.repair_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  category text NOT NULL DEFAULT 'reparation',
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_services TO authenticated;
GRANT ALL ON public.repair_services TO service_role;
ALTER TABLE public.repair_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les prestations" ON public.repair_services FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE POLICY "Admin gere les prestations" ON public.repair_services FOR ALL TO authenticated USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin')) WITH CHECK (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_repair_services BEFORE UPDATE ON public.repair_services FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- REPAIRS
CREATE TABLE public.repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  reference text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device_id uuid REFERENCES public.customer_devices(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT 'Apple',
  model text NOT NULL,
  color text,
  storage text,
  imei text,
  unlock_code text,
  condition text,
  issue text NOT NULL DEFAULT '',
  status public.repair_status NOT NULL DEFAULT 'recu',
  total_price numeric NOT NULL DEFAULT 0,
  total_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, reference)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repairs TO authenticated;
GRANT ALL ON public.repairs TO service_role;
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les reparations" ON public.repairs FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE POLICY "Membres creent des reparations" ON public.repairs FOR INSERT TO authenticated WITH CHECK (shop_id = public.current_shop_id() AND user_id = auth.uid());
CREATE POLICY "Membres modifient les reparations" ON public.repairs FOR UPDATE TO authenticated USING (shop_id = public.current_shop_id()) WITH CHECK (shop_id = public.current_shop_id());
CREATE POLICY "Admin supprime les reparations" ON public.repairs FOR DELETE TO authenticated USING (shop_id = public.current_shop_id() AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_repairs BEFORE UPDATE ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX repairs_shop_idx ON public.repairs(shop_id, created_at DESC);
CREATE INDEX repairs_customer_idx ON public.repairs(customer_id);

-- REPAIR ITEMS
CREATE TABLE public.repair_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.repair_services(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_items TO authenticated;
GRANT ALL ON public.repair_items TO service_role;
ALTER TABLE public.repair_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les lignes" ON public.repair_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_items.repair_id AND r.shop_id = public.current_shop_id()));
CREATE POLICY "Membres creent des lignes" ON public.repair_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_items.repair_id AND r.shop_id = public.current_shop_id()));
CREATE POLICY "Membres modifient les lignes" ON public.repair_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_items.repair_id AND r.shop_id = public.current_shop_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_items.repair_id AND r.shop_id = public.current_shop_id()));
CREATE POLICY "Membres suppriment des lignes" ON public.repair_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_items.repair_id AND r.shop_id = public.current_shop_id()));
CREATE INDEX repair_items_repair_idx ON public.repair_items(repair_id);

-- STATUS HISTORY
CREATE TABLE public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  status public.repair_status NOT NULL,
  user_id uuid,
  employee_name text NOT NULL DEFAULT '',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.repair_status_history TO authenticated;
GRANT ALL ON public.repair_status_history TO service_role;
ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent l historique" ON public.repair_status_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_status_history.repair_id AND r.shop_id = public.current_shop_id()));
CREATE POLICY "Membres ajoutent a l historique" ON public.repair_status_history FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_status_history.repair_id AND r.shop_id = public.current_shop_id()));
CREATE INDEX repair_status_history_repair_idx ON public.repair_status_history(repair_id, created_at DESC);

-- PHOTOS
CREATE TABLE public.repair_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  phase public.photo_phase NOT NULL DEFAULT 'avant',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.repair_photos TO authenticated;
GRANT ALL ON public.repair_photos TO service_role;
ALTER TABLE public.repair_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les photos" ON public.repair_photos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_photos.repair_id AND r.shop_id = public.current_shop_id()));
CREATE POLICY "Membres ajoutent des photos" ON public.repair_photos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_photos.repair_id AND r.shop_id = public.current_shop_id()));
CREATE POLICY "Membres suppriment des photos" ON public.repair_photos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.repairs r WHERE r.id = repair_photos.repair_id AND r.shop_id = public.current_shop_id()));
CREATE INDEX repair_photos_repair_idx ON public.repair_photos(repair_id);

-- INVOICES
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  number text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  shop_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  device_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, number),
  UNIQUE (repair_id)
);
GRANT SELECT, INSERT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membres lisent les factures" ON public.invoices FOR SELECT TO authenticated USING (shop_id = public.current_shop_id());
CREATE POLICY "Membres creent des factures" ON public.invoices FOR INSERT TO authenticated WITH CHECK (shop_id = public.current_shop_id());
CREATE INDEX invoices_customer_idx ON public.invoices(customer_id);

-- Catalogue de prestations par defaut
CREATE OR REPLACE FUNCTION public.seed_default_services(_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.repair_services (shop_id, name, price, duration_minutes, category, sort_order)
  VALUES
    (_shop_id, 'Remplacement écran', 99, 45, 'ecran', 10),
    (_shop_id, 'Remplacement batterie', 59, 30, 'batterie', 20),
    (_shop_id, 'Connecteur de charge', 69, 60, 'connectique', 30),
    (_shop_id, 'Caméra avant', 59, 45, 'camera', 40),
    (_shop_id, 'Caméra arrière', 79, 60, 'camera', 50),
    (_shop_id, 'Écouteur interne', 49, 40, 'audio', 60),
    (_shop_id, 'Haut-parleur', 49, 40, 'audio', 70),
    (_shop_id, 'Micro', 49, 40, 'audio', 80),
    (_shop_id, 'Vibreur', 45, 40, 'autre', 90),
    (_shop_id, 'Vitre arrière', 89, 90, 'chassis', 100),
    (_shop_id, 'Châssis', 129, 120, 'chassis', 110),
    (_shop_id, 'Bouton Power', 49, 45, 'boutons', 120),
    (_shop_id, 'Boutons Volume', 49, 45, 'boutons', 130),
    (_shop_id, 'Bouton Home', 55, 50, 'boutons', 140),
    (_shop_id, 'Face ID', 119, 90, 'autre', 150),
    (_shop_id, 'Carte mère', 149, 180, 'carte_mere', 160),
    (_shop_id, 'Désoxydation', 79, 120, 'service', 170),
    (_shop_id, 'Diagnostic', 20, 20, 'service', 180),
    (_shop_id, 'Mise à jour logicielle', 25, 30, 'logiciel', 190),
    (_shop_id, 'Réinstallation iOS', 39, 60, 'logiciel', 200),
    (_shop_id, 'Transfert de données', 35, 45, 'logiciel', 210),
    (_shop_id, 'Nettoyage interne', 25, 30, 'service', 220)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Seed pour les boutiques existantes
DO $$
DECLARE s record;
BEGIN
  FOR s IN SELECT id FROM public.shops LOOP
    PERFORM public.seed_default_services(s.id);
  END LOOP;
END $$;