-- handle_new_user() (0001) reads the Postgres GUC app.allowed_email_domain, but nothing ever
-- set it -- it was silently always falling back to the hardcoded 'bergen.org' default no matter
-- what NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN was set to on the app side. Keep this value in sync with
-- that env var; if the chapter's school domain ever changes, update both.
--
-- Guarded: `alter database` needs privileges the SQL Editor role may not have on hosted
-- Supabase, and the whole setup script runs in one transaction -- an unguarded failure here
-- would roll back every other migration. If this is skipped, handle_new_user() still falls
-- back to the 'bergen.org' default baked into 0001, so signup restriction stays enforced.
do $$
begin
  execute format('alter database %I set app.allowed_email_domain = %L', current_database(), 'bergen.org');
exception
  when insufficient_privilege then
    raise notice 'could not set app.allowed_email_domain; falling back to the default in handle_new_user()';
end $$;
