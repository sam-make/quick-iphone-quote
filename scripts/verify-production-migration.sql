-- Audit de migration Trade-In Pro — LECTURE SEULE
-- À exécuter UNIQUEMENT après restauration sur la destination Supabase choisie.
-- Aucun enregistrement personnel, hachage ou jeton n'est renvoyé.
SELECT
  (SELECT COUNT(*) FROM auth.users) AS auth_users,
  (SELECT COUNT(*) FROM auth.identities WHERE provider = 'email') AS email_identities,
  (SELECT COUNT(*) FROM public.shops) AS shops,
  (SELECT COUNT(*) FROM public.profiles) AS profiles,
  (SELECT COUNT(*) FROM public.user_roles) AS user_roles,
  (SELECT COUNT(*) FROM public.estimations) AS estimations,
  (SELECT COUNT(*) FROM public.customers) AS customers,
  (SELECT COUNT(*) FROM public.repairs) AS repairs,
  (SELECT COUNT(*) FROM public.invoices) AS invoices,
  (SELECT COUNT(*) FROM public.repair_photos) AS repair_photos,
  (SELECT COUNT(*) FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL) AS orphan_profiles,
  (SELECT COUNT(*) FROM public.user_roles r LEFT JOIN auth.users u ON u.id=r.user_id WHERE u.id IS NULL) AS orphan_user_roles,
  (SELECT COUNT(*) FROM public.global_user_roles r LEFT JOIN auth.users u ON u.id=r.user_id WHERE u.id IS NULL) AS orphan_owner_roles,
  (SELECT COUNT(*) FROM pg_tables t JOIN pg_class c ON c.relname=t.tablename
     JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
     WHERE t.schemaname='public' AND c.relrowsecurity) AS public_tables_with_rls;
-- Comparer les volumes à un inventaire FINAL de la source juste avant bascule.
-- Attendu après restauration complète : orphan_* = 0, RLS >= 24.

-- Sécurité du schéma restauré et du stockage privé
SELECT
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public') AS public_policies,
  (SELECT COUNT(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
     JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND NOT t.tgisinternal) AS application_triggers,
  (SELECT COUNT(*) FROM storage.buckets WHERE id='repair-photos' AND NOT public) AS private_photo_bucket,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects') AS photo_access_policies,
  has_function_privilege('anon', 'public.seed_default_rules(uuid)', 'EXECUTE') AS anonymous_can_seed_rules,
  has_function_privilege('authenticated', 'public.seed_default_services(uuid)', 'EXECUTE') AS shop_member_can_seed_services,
  has_function_privilege('service_role', 'public.seed_default_rules(uuid)', 'EXECUTE') AS server_can_seed_rules;
-- Attendu : 61 politiques publiques, 18 triggers, 1 bucket privé, 4 politiques Storage,
-- accès aux seeds : FALSE/FALSE/TRUE.
