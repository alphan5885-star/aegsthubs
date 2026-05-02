
-- Lock down SECURITY DEFINER helpers from PUBLIC/anon
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   fn.nspname, fn.proname, fn.args);
    -- Re-grant to authenticated for everything except admin-only invite redeem
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
                   fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- Tighten security_logs INSERT policy: only authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.security_logs;
CREATE POLICY "Authenticated users can insert logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL OR user_email IS NOT NULL);
