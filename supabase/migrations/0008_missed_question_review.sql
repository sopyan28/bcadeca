-- The prototype's missedList() shows, per missed question: the question text, the choice the
-- member picked, the correct choice, and the explanation (dc.html:570-583). Members can already
-- see all of that the moment they answer (record_attempt returns correct_index/explanation), so
-- resurfacing it later for review isn't a new leak -- but `questions` stays officer-only (see
-- 0005), so a plain join from `attempts` would be blocked by RLS. Expose it instead through a
-- security definer function scoped to the caller's own wrong attempts.

create or replace function public.get_missed_question_review(p_limit integer default 30)
returns table (
  attempt_id uuid,
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
