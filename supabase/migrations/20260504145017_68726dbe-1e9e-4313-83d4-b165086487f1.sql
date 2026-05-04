CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eski jobu sil (varsa)
DO $$
BEGIN
  PERFORM cron.unschedule('cron-sync-deposits-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cron-sync-deposits-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://haoutnorvyywrdiirhmj.supabase.co/functions/v1/cron-sync-deposits',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhb3V0bm9ydnl5d3JkaWlyaG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njk5NTAsImV4cCI6MjA5MzA0NTk1MH0.FJTzDnEjbf7X6C2MtJQZDsdL95rRAsgOsl6zMx8GTpE"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);