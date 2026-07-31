-- Realtime subscriptions (components/leaderboard/Leaderboard.tsx) only fire for tables
-- explicitly added to the supabase_realtime publication -- it's empty by default.
alter publication supabase_realtime add table public.profiles;
