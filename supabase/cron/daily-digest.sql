-- HireFlow — schedule the daily job-alert digest.
-- Run this in the Supabase SQL Editor AFTER deploying the daily-digest function.
-- Requires pg_cron + pg_net (already enabled on this project).

-- 1) Store the service_role key in Vault, once. Get it from:
--    Dashboard → Project Settings → API → service_role (secret).
--    Replace the placeholder below, run this line, then delete it from your editor.
-- select vault.create_secret('PASTE_SERVICE_ROLE_KEY_HERE', 'service_role_key');

-- 2) Schedule the digest. Default: 13:00 UTC daily. Adjust the cron as you like.
select cron.schedule(
  'hireflow-daily-digest',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://cgiptreesxeyxvrxfzgg.supabase.co/functions/v1/daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To change the schedule later: select cron.unschedule('hireflow-daily-digest'); then re-run step 2.
-- To see runs: select * from cron.job_run_details order by start_time desc limit 10;
