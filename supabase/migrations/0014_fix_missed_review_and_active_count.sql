-- ============================================================================
-- 0014: Fix the missed-question review, and add the active-member count.
-- Re-runnable.
-- ============================================================================

-- get_missed_question_review (0008) declared attempt_id as uuid, but attempts.id is a bigint.
-- Postgres rejects that mismatch as soon as the function has a row to return, so the arena's
-- Missed tab and the profile page showed "no misses" to everyone who had actually missed one.
-- A function's return type can't be changed in place, so drop and recreate it.
drop function if exists public.get_missed_question_review(integer);

create function public.get_missed_question_review(p_limit integer default 30)
returns table (
  attempt_id bigint,
  kpi_area text,
  question_text text,
  chosen_text text,
  correct_text text,
  explanation text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  return query
    select
      a.id,
      a.kpi_area,
      q.question_text,
      q.choices[a.chosen_index + 1],
      q.choices[q.correct_index + 1],
      q.explanation,
      a.created_at
    from public.attempts a
    join public.questions q on q.id = a.question_id
    where a.user_id = v_uid and a.is_correct = false
    order by a.created_at desc
    limit p_limit;
end;
$$;

grant execute on function public.get_missed_question_review(integer) to authenticated;

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
