-- Cron job: sync all user deposits every 5 minutes via cron-sync-deposits edge function
-- PREREQUISITE: Run once in SQL Editor before applying this migration:
--   ALTER DATABASE postgres SET app.cron_secret = '<your-secret-uuid>';
-- Also set the same value in Supabase Dashboard → Edge Functions → Secrets → CRON_SECRET

SELECT cron.schedule(
  'auto-sync-deposits',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://haoutnorvyywrdiirhmj.supabase.co/functions/v1/cron-sync-deposits',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
