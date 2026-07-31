-- Trusted mutation RPCs. All of them run security definer and set app.trusted_write
-- locally so protect_privileged_profile_cols() (0001) permits the profiles writes they
-- make on behalf of the calling user -- but every one of them still reads auth.uid()
-- to scope the write to the caller, so a member can never award XP/DECA$ to someone else
-- or spend someone else's balance.

-- ============================================================================
-- record_attempt: grade an answer, log it, and award XP/DECA$.
-- XP/DECA$ formulas ported from the prototype's pick()/finishSession() (12 XP + 2 DECA$
-- per correct answer, doubled by a double-points power-up; level-up curve xp_next *= 1.18).
-- ============================================================================
create or replace function public.record_attempt(
  p_question_id uuid,
  p_session_id uuid,
  p_chosen_index smallint,
  p_hint_used boolean default false,
  p_double_points boolean default false
) returns table (is_correct boolean, xp_awarded integer, dd_awarded integer, correct_index smallint, explanation text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_question public.questions%rowtype;
  v_correct boolean;
  v_xp integer := 0;
  v_dd integer := 0;
  v_mult integer := case when p_double_points then 2 else 1 end;
  v_profile public.profiles%rowtype;
  v_xp_in_level integer;
  v_level integer;
  v_xp_next integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_question from public.questions where id = p_question_id;
  if not found then
    raise exception 'Unknown question';
  end if;

  v_correct := (p_chosen_index = v_question.correct_index);
  if v_correct then
    v_xp := 12 * v_mult;
    v_dd := 2 * v_mult;
  end if;

  insert into public.attempts (user_id, question_id, session_id, kpi_area, cluster, is_correct, chosen_index, hint_used, double_points)
  values (v_uid, p_question_id, p_session_id, v_question.kpi_area, v_question.cluster, v_correct, p_chosen_index, p_hint_used, p_double_points);

  update public.questions set exposure_count = exposure_count + 1 where id = p_question_id;

  if p_session_id is not null then
    update public.sessions
      set correct_count = correct_count + (case when v_correct then 1 else 0 end),
          xp_earned = xp_earned + v_xp,
          dd_earned = dd_earned + v_dd
      where id = p_session_id and user_id = v_uid;
  end if;

  if v_xp > 0 or v_dd > 0 then
    select * into v_profile from public.profiles where id = v_uid;
    v_xp_in_level := v_profile.xp_in_level + v_xp;
    v_level := v_profile.level;
    v_xp_next := v_profile.xp_next;
    while v_xp_in_level >= v_xp_next loop
      v_xp_in_level := v_xp_in_level - v_xp_next;
      v_level := v_level + 1;
      v_xp_next := round(v_xp_next * 1.18);
    end loop;

    perform set_config('app.trusted_write', 'on', true);
    update public.profiles
      set xp = xp + v_xp,
          deca_balance = deca_balance + v_dd,
          xp_in_level = v_xp_in_level,
          level = v_level,
          xp_next = v_xp_next
      where id = v_uid;
  end if;

  return query select v_correct, v_xp, v_dd, v_question.correct_index, v_question.explanation;
end;
$$;

grant execute on function public.record_attempt(uuid, uuid, smallint, boolean, boolean) to authenticated;

-- ============================================================================
-- complete_session: finalize a session, apply the "perfect run" bonus
-- (+30% of the session's base XP reward, +5 DECA$), ported from finishSession().
-- ============================================================================
create or replace function public.complete_session(
  p_session_id uuid,
  p_base_xp_reward integer,
  p_question_count integer
) returns table (bonus_xp integer, bonus_dd integer)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_bonus_xp integer := 0;
  v_bonus_dd integer := 0;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_session from public.sessions where id = p_session_id and user_id = v_uid;
  if not found then raise exception 'Unknown session'; end if;
  if v_session.status = 'completed' then
    return query select 0, 0; return;
  end if;

  if v_session.correct_count = p_question_count then
    v_bonus_xp := round(p_base_xp_reward * 0.3);
    v_bonus_dd := 5;
  end if;

  update public.sessions
    set status = 'completed', completed_at = now(),
        xp_earned = xp_earned + v_bonus_xp, dd_earned = dd_earned + v_bonus_dd
    where id = p_session_id;

  if v_bonus_xp > 0 or v_bonus_dd > 0 then
    perform set_config('app.trusted_write', 'on', true);
    update public.profiles set xp = xp + v_bonus_xp, deca_balance = deca_balance + v_bonus_dd where id = v_uid;
  end if;

  return query select v_bonus_xp, v_bonus_dd;
end;
$$;

grant execute on function public.complete_session(uuid, integer, integer) to authenticated;

-- ============================================================================
-- purchase_item: atomic balance check + deduct + grant, no double-spend races.
-- ============================================================================
create or replace function public.purchase_item(p_item_id text) returns table (ok boolean, message text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items%rowtype;
  v_balance integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_item from public.shop_items where id = p_item_id and active;
  if not found then
    return query select false, 'Item not found'; return;
  end if;

  if v_item.kind <> 'power' and exists(select 1 from public.user_inventory where user_id = v_uid and item_id = p_item_id) then
    return query select false, 'Already owned'; return;
  end if;

  -- Row lock prevents two concurrent purchases from both reading a stale balance.
  select deca_balance into v_balance from public.profiles where id = v_uid for update;
  if v_balance < v_item.price then
    return query select false, 'Not enough DECA$'; return;
  end if;

  perform set_config('app.trusted_write', 'on', true);
  update public.profiles set deca_balance = deca_balance - v_item.price where id = v_uid;

  insert into public.shop_purchases (user_id, item_id, price_paid) values (v_uid, p_item_id, v_item.price);

  if v_item.kind = 'power' then
    insert into public.user_powerups (user_id, power_up_type, count)
      values (v_uid, v_item.power_up_type, coalesce(v_item.power_up_amount, 1))
      on conflict (user_id, power_up_type) do update set count = public.user_powerups.count + excluded.count;
  else
    insert into public.user_inventory (user_id, item_id) values (v_uid, p_item_id);
  end if;

  return query select true, 'ok';
end;
$$;

grant execute on function public.purchase_item(text) to authenticated;

-- ============================================================================
-- Diagnostic run lifecycle. The item-selection/Elo math itself lives in
-- lib/algorithms/diagnosticElo.ts (application layer) -- these RPCs just persist
-- the run/item/ability state transactionally so a dropped connection mid-run
-- can't leave ability ratings and the item log out of sync.
-- ============================================================================
create or replace function public.start_diagnostic_run() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_run_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  insert into public.diagnostic_runs (user_id) values (v_uid) returning id into v_run_id;
  return v_run_id;
end;
$$;

grant execute on function public.start_diagnostic_run() to authenticated;

-- Grades the item AND performs the Elo update in one atomic, server-trusted step. The
-- caller (app/(members)/prep/diagnostic Server Actions, mirroring lib/algorithms/diagnosticElo.ts)
-- only supplies the pre-answer ability/rd/lifetime-count context it already has read access to
-- via user_kpi_ability -- it never sees correct_index, so is_correct/ability_after can't be
-- forged client-side. Keep these formulas in exact lockstep with lib/algorithms/diagnosticElo.ts.
create or replace function public.record_diagnostic_item(
  p_run_id uuid,
  p_question_id uuid,
  p_chosen_index smallint,
  p_seq_index integer,
  p_ability_before numeric,
  p_rd_before numeric,
  p_items_answered_lifetime_in_area integer
) returns table (
  is_correct boolean, correct_index smallint, explanation text,
  ability_after numeric, rd_after numeric
)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_question public.questions%rowtype;
  v_correct boolean;
  v_s numeric;
  v_e numeric;
  v_k_user numeric;
  v_k_question numeric;
  v_ability_after numeric;
  v_difficulty_after numeric;
  v_pool_size integer;
  v_rd_floor numeric;
  v_rd_after numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.diagnostic_runs where id = p_run_id and user_id = v_uid and status = 'in_progress') then
    raise exception 'Run not found or already completed';
  end if;

  select * into v_question from public.questions where id = p_question_id;
  v_correct := (p_chosen_index = v_question.correct_index);
  v_s := case when v_correct then 1 else 0 end;

  v_e := 1 / (1 + power(10, (v_question.difficulty_rating - p_ability_before) / 400));
  v_k_user := case
    when p_items_answered_lifetime_in_area < 5 then 64
    when p_items_answered_lifetime_in_area < 15 then 32
    else 16
  end;
  v_k_question := greatest(4, 16 - v_question.exposure_count / 5.0);

  v_ability_after := p_ability_before + v_k_user * (v_s - v_e);
  v_difficulty_after := v_question.difficulty_rating - v_k_question * (v_s - v_e);

  select count(*) into v_pool_size from public.questions where kpi_area = v_question.kpi_area and active;
  v_rd_floor := greatest(30, 350 / sqrt(greatest(v_pool_size, 1)));
  v_rd_after := greatest(v_rd_floor, p_rd_before * 0.75);

  insert into public.diagnostic_items (
    run_id, question_id, kpi_area, seq_index, presented_difficulty,
    is_correct, ability_before, ability_after, rd_before, rd_after
  ) values (
    p_run_id, p_question_id, v_question.kpi_area, p_seq_index, v_question.difficulty_rating,
    v_correct, p_ability_before, v_ability_after, p_rd_before, v_rd_after
  );

  update public.questions set difficulty_rating = v_difficulty_after, exposure_count = exposure_count + 1
    where id = p_question_id;

  insert into public.user_kpi_ability (user_id, kpi_area, rating, rd, items_answered, updated_at)
    values (v_uid, v_question.kpi_area, v_ability_after, v_rd_after, 1, now())
    on conflict (user_id, kpi_area) do update
      set rating = v_ability_after, rd = v_rd_after,
          items_answered = public.user_kpi_ability.items_answered + 1, updated_at = now();

  update public.diagnostic_runs set item_count = item_count + 1 where id = p_run_id;

  -- Diagnostic items also feed the regular attempt log / missed-questions list.
  insert into public.attempts (user_id, question_id, session_id, kpi_area, cluster, is_correct, chosen_index)
    values (v_uid, p_question_id, null, v_question.kpi_area, v_question.cluster, v_correct, p_chosen_index);

  return query select v_correct, v_question.correct_index, v_question.explanation, v_ability_after, v_rd_after;
end;
$$;

grant execute on function public.record_diagnostic_item(uuid, uuid, smallint, integer, numeric, numeric, integer) to authenticated;

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

    insert into public.diagnostic_results (run_id, kpi_area, mastery_pct, confidence_pct, ability_rating, rd, items_in_area, low_data)
      values (p_run_id, v_area.kpi_area, v_mastery, v_confidence, v_area.final_ability, v_area.final_rd, v_area.items_in_area, v_pool_size < 5)
      on conflict (run_id, kpi_area) do update
        set mastery_pct = excluded.mastery_pct, confidence_pct = excluded.confidence_pct,
            ability_rating = excluded.ability_rating, rd = excluded.rd,
            items_in_area = excluded.items_in_area, low_data = excluded.low_data;
  end loop;

  update public.diagnostic_runs
    set status = 'completed', stop_reason = p_stop_reason, completed_at = now()
    where id = p_run_id;
end;
$$;

grant execute on function public.complete_diagnostic_run(uuid, text) to authenticated;
