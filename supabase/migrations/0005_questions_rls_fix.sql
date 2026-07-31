-- 0001 granted `select to authenticated using (true)` on the raw `questions` table, which lets
-- any signed-in member read correct_index/explanation directly via the REST API/PostgREST,
-- bypassing the whole point of the questions_public view. Members should only ever read
-- questions through that view; the base table stays officer-only (needed for the officer
-- authoring UI). Grading (record_attempt/record_diagnostic_item) is unaffected -- those are
-- security definer functions that read the base table as the function owner, not the caller.

drop policy "questions_select_authenticated" on public.questions;

create policy "questions_select_officer" on public.questions
  for select to authenticated using (public.is_officer(auth.uid()));

create or replace view public.questions_public as
  select id, question_text, choices, kpi_area, cluster, difficulty_rating, exposure_count
  from public.questions
  where active;

grant select on public.questions_public to authenticated;
grant select on public.public_profiles to authenticated;
