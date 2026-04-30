
-- 1) Storage bucket'larını private yap
UPDATE storage.buckets SET public = false WHERE id IN ('avatars','banners','product-images');

-- 2) Storage RLS politikaları (giriş yapmış herkes okur, kullanıcı kendi klasörüne yazar)
DROP POLICY IF EXISTS "Authenticated users can view market images" ON storage.objects;
CREATE POLICY "Authenticated users can view market images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','banners','product-images'));

DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('avatars','banners','product-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
CREATE POLICY "Users update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('avatars','banners','product-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;
CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('avatars','banners','product-images')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Admin davet kodu tablosu
CREATE TABLE IF NOT EXISTS public.admin_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID,
  used_by UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage invite codes" ON public.admin_invite_codes;
CREATE POLICY "Admins manage invite codes"
ON public.admin_invite_codes FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4) Davet kodu ile admin rolü alma
CREATE OR REPLACE FUNCTION public.redeem_admin_invite(_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;
  SELECT * INTO _row FROM public.admin_invite_codes WHERE code = _code AND used_by IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid or used code');
  END IF;
  UPDATE public.admin_invite_codes SET used_by = auth.uid(), used_at = now() WHERE id = _row.id;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END $$;

-- 5) Bootstrap: hiç admin yoksa, çağıran ilk admin olur
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not authenticated');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin already exists');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END $$;
