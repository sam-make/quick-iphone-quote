CREATE POLICY "Photos reparation lecture boutique" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'repair-photos' AND (storage.foldername(name))[1] = public.current_shop_id()::text);
CREATE POLICY "Photos reparation ajout boutique" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repair-photos' AND (storage.foldername(name))[1] = public.current_shop_id()::text);
CREATE POLICY "Photos reparation suppression boutique" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'repair-photos' AND (storage.foldername(name))[1] = public.current_shop_id()::text);