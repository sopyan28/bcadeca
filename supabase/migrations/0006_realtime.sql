-- Realtime subscriptions (components/leaderboard/Leaderboard.tsx) only fire for tables
-- explicitly added to the supabase_realtime publication -- it's empty by default.
--
-- Guarded: on hosted Supabase the publication may already include the table (re-running
-- this then raises duplicate_object), and the whole setup script runs in one transaction,
-- so an unguarded failure here would roll back every other migration too.
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication not found; enable Realtime for public.profiles in the dashboard';
  when insufficient_privilege then
    raise notice 'insufficient privilege to alter supabase_realtime; enable Realtime for public.profiles in the dashboard';
end $$;
