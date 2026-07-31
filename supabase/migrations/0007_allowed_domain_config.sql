-- handle_new_user() (0001) reads the Postgres GUC app.allowed_email_domain, but nothing ever
-- set it -- it was silently always falling back to the hardcoded 'bergen.org' default no matter
-- what NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN was set to on the app side. Keep this value in sync with
-- that env var; if the chapter's school domain ever changes, update both.
alter database postgres set app.allowed_email_domain = 'bergen.org';
