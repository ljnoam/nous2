-- Enable the pg_cron extension if not already enabled
create extension if not exists pg_cron;

-- Schedule the cleanup function to run every hour
-- This assumes you have a function named 'cleanup_expired_deletions' defined in your public schema.
select cron.schedule(
  'cleanup-deletions', -- name of the cron job
  '0 * * * *',         -- every hour
  'select public.cleanup_expired_deletions()'
);

-- To verify it's scheduled:
-- select * from cron.job;

-- To unschedule if needed:
-- select cron.unschedule('cleanup-deletions');
