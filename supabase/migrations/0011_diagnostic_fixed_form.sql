-- ============================================================================
-- Diagnostic becomes a fixed-form test: every KPI area contributes exactly
-- ITEMS_PER_AREA (2) questions, so a run is `areas x 2` items long and each
-- area finishes with a directly comparable raw score. See the rewritten
-- selectNextDiagnosticItem/checkStop in lib/algorithms/diagnosticElo.ts.
--
-- Two changes are needed here:
--   1. 'complete' becomes a valid stop_reason (the adaptive-only 'converged'
--      and 'soft_cap' can no longer be produced, but stay allowed so existing
--      completed runs still satisfy the constraint).
--   2. diagnostic_results gains items_correct, so the results page can report
--      "you missed 1 of 2 here" -- the weak-area signal the member acts on.
--      Mastery/confidence stay as they are and still feed the radar chart.
-- ============================================================================

alter table public.diagnostic_runs
  drop constraint if exists diagnostic_runs_stop_reason_check;

alter table public.diagnostic_runs
  add constraint diagnostic_runs_stop_reason_check
  check (stop_reason in ('complete', 'converged', 'soft_cap', 'hard_cap'));

alter table public.diagnostic_results
  add column if not exists items_correct integer not null default 0;

comment on column public.diagnostic_results.items_correct is
  'Items answered correctly in this area this run, out of items_in_area. items_correct < items_in_area marks the area weak.';

-- Backfill runs completed before this column existed. Without this they would all default to
-- 0 correct and the results page would report every one of their areas as weak.
update public.diagnostic_results dr
set items_correct = sub.correct_count
from (
  select run_id, kpi_area, count(*) filter (where is_correct) as correct_count
  from public.diagnostic_items
  group by run_id, kpi_area
) sub
where dr.run_id = sub.run_id and dr.kpi_area = sub.kpi_area;

-- Recreated from 0002_rpcs.sql with the items_correct rollup added.
create or replace function public.complete_diagnostic_run(p_run_id uuid, p_stop_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_area record;
  v_mastery numeric;
  v_confidence numeric;
  v_pool_size integer;
  v_rd_floor numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.diagnostic_runs where id = p_run_id and user_id = v_uid) then
    raise exception 'Run not found';
  end if;

  for v_area in
    select di.kpi_area, count(*) as items_in_area,
           count(*) filter (where di.is_correct) as items_correct,
           (array_agg(di.ability_after order by di.seq_index desc))[1] as final_ability,
           (array_agg(di.rd_after order by di.seq_index desc))[1] as final_rd
    from public.diagnostic_items di
    where di.run_id = p_run_id
    group by di.kpi_area
  loop
    select count(*) into v_pool_size from public.questions where kpi_area = v_area.kpi_area and active;
    v_rd_floor := greatest(30, 350 / sqrt(greatest(v_pool_size, 1)));
    v_mastery := round(100 / (1 + power(10, (1500 - v_area.final_ability) / 400)));
    v_confidence := round(greatest(0, least(100, 100 * (1 - (v_area.final_rd - 30) / (350 - 30)))));

    insert into public.diagnostic_results (run_id, kpi_area, mastery_pct, confidence_pct, ability_rating, rd, items_in_area, items_correct, low_data)
      values (p_run_id, v_area.kpi_area, v_mastery, v_confidence, v_area.final_ability, v_area.final_rd, v_area.items_in_area, v_area.items_correct, v_pool_size < 5)
      on conflict (run_id, kpi_area) do update
        set mastery_pct = excluded.mastery_pct, confidence_pct = excluded.confidence_pct,
            ability_rating = excluded.ability_rating, rd = excluded.rd,
            items_in_area = excluded.items_in_area, items_correct = excluded.items_correct,
            low_data = excluded.low_data;
  end loop;

  update public.diagnostic_runs
    set status = 'completed', stop_reason = p_stop_reason, completed_at = now()
    where id = p_run_id;
end;
$$;

grant execute on function public.complete_diagnostic_run(uuid, text) to authenticated;
