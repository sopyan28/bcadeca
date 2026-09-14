-- ============================================================================
-- 0013: Active-member count for the leaderboard, and demo-question categories.
-- Re-runnable.
-- ============================================================================

-- Active members: everyone who signed in, practiced, or started a diagnostic in the last
-- p_days days. Shown on the arena leaderboard next to the total member count; the page just
-- omits it until this function exists.
create or replace function public.active_member_count(p_days integer default 7) returns bigint
language sql stable security definer set search_path = public as $$
  select count(*)
  from public.profiles p
  where exists (select 1 from auth.users u
                where u.id = p.id and u.last_sign_in_at > now() - make_interval(days => p_days))
     or exists (select 1 from public.sessions s
                where s.user_id = p.id and s.started_at > now() - make_interval(days => p_days))
     or exists (select 1 from public.diagnostic_runs d
                where d.user_id = p.id and d.started_at > now() - make_interval(days => p_days));
$$;

grant execute on function public.active_member_count(integer) to authenticated;

-- The 18 original demo questions used a few category names the exam bank doesn't, which split
-- the diagnostic into 29 areas (some with a single question). Fold them into the exam taxonomy.
-- Already applied to the live database on 2026-09-13; kept so fresh setups match.
update public.questions set kpi_area = 'Communication Skills' where source_exam is null and kpi_area = 'Communication';
update public.questions set kpi_area = 'Business Law'         where source_exam is null and kpi_area = 'Ethics';
update public.questions set kpi_area = 'Financial Analysis'   where source_exam is null and kpi_area in ('Financial Management', 'Financial Statements');
update public.questions set cluster  = 'Business Management'  where source_exam is null and cluster = 'Entrepreneurship';
