-- The questions_public view was reachable by anonymous (logged-out) visitors, so the whole
-- practice question bank -- text and answer choices -- could be scraped from the REST API
-- without an account. Verified against the live project: an anon-key GET on
-- /rest/v1/questions_public returned rows, while the raw questions table correctly returned
-- [] (so the answer key itself was never exposed).
--
-- Cause: the view is owned by postgres and is not security_invoker, so it runs with the
-- owner's privileges and bypasses RLS on public.questions; Supabase's default grants then
-- give `anon` SELECT on new objects in the public schema. 0005 granted it to `authenticated`
-- but never revoked the inherited anon grant.
--
-- security_invoker is deliberately NOT used here: 0005 restricted the base table to officers
-- only, so an invoker-rights view would return nothing for ordinary members either. Keeping
-- owner rights and gating by grant is what lets members read questions without the answer key.
--
-- Every reader of this view (prep/arena, prep/diagnostic) is behind the members auth guard,
-- so no public page regresses.
revoke all on public.questions_public from anon;

-- Same reasoning for the leaderboard view: it is members-only in the UI and exposes
-- per-member xp/level/streak, which shouldn't be public either.
revoke all on public.public_profiles from anon;

-- The public Home page's member count does NOT go through the view -- it uses the
-- member_count() security definer function, which stays granted to anon (0004).
