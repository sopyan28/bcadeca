-- =====================================================================
-- BCA DECA Hub -- complete database setup
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query ->
-- paste this ENTIRE file -> Run.
--
-- NOTE: the SQL Editor runs this as ONE transaction, so if any statement
-- fails, everything rolls back and you get zero tables. The statements
-- that can fail on hosted Supabase (storage policies, realtime
-- publication, alter database) are wrapped in exception handlers so they
-- degrade to a NOTICE instead of killing the whole run.
--
-- When it succeeds the final SELECT prints a row count summary.
-- =====================================================================



-- ###################################################################
-- ## 0001_init.sql
-- ###################################################################

-- BCA DECA Hub -- core schema. See /README.md and the implementation plan for design rationale.
-- Extensions
create extension if not exists pgcrypto;

-- ============================================================================
-- Helper: officer check (security definer so it can be used inside RLS policies
-- without those policies needing direct select access to profiles.role themselves)
-- ============================================================================
create or replace function public.is_officer(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = uid and role = 'officer');
$$;

-- ============================================================================
-- Officer invite codes (created first: handle_new_user() below references it)
-- ============================================================================
create table public.officer_invite_codes (
  code text primary key,
  created_by uuid,
  max_uses integer not null default 1,
  uses integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true
);

-- Seed one bootstrap code so the founding co-president(s) can claim officer role
-- on first signup with no existing officer account and no dashboard/SQL access needed.
insert into public.officer_invite_codes (code, max_uses, expires_at)
values ('BCA-DECA-LAUNCH-2026', 2, now() + interval '60 days');

-- ============================================================================
-- Profiles
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'member' check (role in ('member', 'officer')),
  avatar_color text not null default '#3db4f2',
  xp integer not null default 0,
  level integer not null default 1,
  xp_in_level integer not null default 0,
  xp_next integer not null default 300,
  deca_balance integer not null default 0,
  streak_count integer not null default 0,
  streak_last_date date,
  created_at timestamptz not null default now()
);

create index idx_profiles_xp on public.profiles(xp desc);

-- Public leaderboard-safe view: never expose email.
create view public.public_profiles as
  select id, full_name, xp, level, avatar_color, streak_count, role
  from public.profiles;

alter table public.profiles enable row level security;

create policy "profiles_select_all_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Row-level UPDATE grants aren't enough to protect individual columns (xp, deca_balance,
-- role, level, streak) from a member editing their own profile client-side. A trigger
-- pins those columns back to their old values unless the caller is already an officer;
-- real changes to them only ever happen via the security-definer RPCs below.
create or replace function public.protect_privileged_profile_cols() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Trusted RPCs (record_attempt, purchase_item, diagnostic runners -- see 0002_rpcs.sql)
  -- set this session-local flag before touching profiles so they can legitimately award
  -- XP/DECA$/streak; anything else (a member's own direct .update() call) gets pinned back.
  if not (public.is_officer(auth.uid()) or coalesce(current_setting('app.trusted_write', true), '') = 'on') then
    new.xp := old.xp;
    new.level := old.level;
    new.xp_in_level := old.xp_in_level;
    new.xp_next := old.xp_next;
    new.deca_balance := old.deca_balance;
    new.streak_count := old.streak_count;
    new.streak_last_date := old.streak_last_date;
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_cols
  before update on public.profiles
  for each row execute function public.protect_privileged_profile_cols();

-- ============================================================================
-- Auth trigger: auto-create profile on signup, enforce school email domain,
-- redeem an officer invite code if one was supplied at signup.
-- ============================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  domain text := lower(split_part(new.email, '@', 2));
  allowed_domain text := coalesce(current_setting('app.allowed_email_domain', true), 'bergen.org');
  supplied_code text := new.raw_user_meta_data ->> 'officer_invite_code';
  redeemed_code text;
  assigned_role text := 'member';
begin
  if domain <> allowed_domain then
    raise exception 'Signups are restricted to @% email addresses.', allowed_domain;
  end if;

  if supplied_code is not null and length(trim(supplied_code)) > 0 then
    update public.officer_invite_codes
      set uses = uses + 1
      where code = supplied_code
        and active
        and uses < max_uses
        and (expires_at is null or expires_at > now())
      returning code into redeemed_code;

    if redeemed_code is null then
      raise exception 'Invalid or expired officer invite code.';
    end if;
    assigned_role := 'officer';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), assigned_role);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Question bank
-- ============================================================================
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  choices text[] not null check (array_length(choices, 1) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null default '',
  kpi_area text not null,
  cluster text not null,
  difficulty_rating numeric not null default 1500,
  exposure_count integer not null default 0,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_questions_area on public.questions(kpi_area) where active;
create index idx_questions_cluster on public.questions(cluster) where active;

-- Client-safe view: never expose the answer key or explanation before grading.
create view public.questions_public as
  select id, question_text, choices, kpi_area, cluster, difficulty_rating
  from public.questions
  where active;

alter table public.questions enable row level security;

create policy "questions_select_authenticated" on public.questions
  for select to authenticated using (true);

create policy "questions_officer_write" on public.questions
  for all to authenticated using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

-- ============================================================================
-- Sessions + attempts
-- ============================================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('quick', 'cluster', 'diagnostic', 'weakness')),
  cluster_filter text,
  question_ids uuid[] not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  correct_count integer not null default 0,
  xp_earned integer not null default 0,
  dd_earned integer not null default 0,
  degraded boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.attempts (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  session_id uuid references public.sessions(id) on delete set null,
  kpi_area text not null,
  cluster text not null,
  is_correct boolean not null,
  chosen_index smallint not null,
  hint_used boolean not null default false,
  double_points boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_attempts_user_time on public.attempts(user_id, created_at desc);
create index idx_attempts_user_area on public.attempts(user_id, kpi_area);
create index idx_attempts_user_question_time on public.attempts(user_id, question_id, created_at desc);

alter table public.sessions enable row level security;
alter table public.attempts enable row level security;

create policy "own_sessions" on public.sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_attempts_select" on public.attempts
  for select to authenticated using (user_id = auth.uid());

-- Direct inserts are blocked in practice (grading/XP goes through record_attempt()),
-- but keep a matching-own-row policy so the RPC (running as the calling user, not
-- the service role) is permitted to insert.
create policy "own_attempts_insert" on public.attempts
  for insert to authenticated with check (user_id = auth.uid());

-- ============================================================================
-- Per-user, per-KPI-area Elo ability (diagnostic engine state)
-- ============================================================================
create table public.user_kpi_ability (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kpi_area text not null,
  rating numeric not null default 1500,
  rd numeric not null default 350,
  items_answered integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, kpi_area)
);

alter table public.user_kpi_ability enable row level security;

create policy "own_ability_select" on public.user_kpi_ability
  for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- Diagnostic runs
-- ============================================================================
create table public.diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  stop_reason text check (stop_reason in ('converged', 'soft_cap', 'hard_cap')),
  item_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.diagnostic_items (
  id bigserial primary key,
  run_id uuid not null references public.diagnostic_runs(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  kpi_area text not null,
  seq_index integer not null,
  presented_difficulty numeric not null,
  is_correct boolean not null,
  ability_before numeric not null,
  ability_after numeric not null,
  rd_before numeric not null,
  rd_after numeric not null,
  answered_at timestamptz not null default now()
);

create table public.diagnostic_results (
  run_id uuid not null references public.diagnostic_runs(id) on delete cascade,
  kpi_area text not null,
  mastery_pct numeric not null,
  confidence_pct numeric not null,
  ability_rating numeric not null,
  rd numeric not null,
  items_in_area integer not null,
  low_data boolean not null default false,
  primary key (run_id, kpi_area)
);

alter table public.diagnostic_runs enable row level security;
alter table public.diagnostic_items enable row level security;
alter table public.diagnostic_results enable row level security;

create policy "own_diag_runs" on public.diagnostic_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own_diag_items" on public.diagnostic_items
  for select to authenticated using (
    exists(select 1 from public.diagnostic_runs r where r.id = run_id and r.user_id = auth.uid())
  );

create policy "own_diag_results" on public.diagnostic_results
  for select to authenticated using (
    exists(select 1 from public.diagnostic_runs r where r.id = run_id and r.user_id = auth.uid())
  );

-- ============================================================================
-- Shop
-- ============================================================================
create table public.shop_items (
  id text primary key,
  name text not null,
  icon text not null,
  kind text not null check (kind in ('outfit', 'emote', 'power')),
  slot text check (slot in ('hat', 'eyes', 'neck', 'hand', 'emote', 'power')),
  price integer not null,
  anim text,
  power_up_type text check (power_up_type in ('hint', 'double', 'freeze')),
  power_up_amount integer,
  active boolean not null default true
);

create table public.user_inventory (
  user_id uuid references public.profiles(id) on delete cascade,
  item_id text references public.shop_items(id),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.user_equipped (
  user_id uuid references public.profiles(id) on delete cascade,
  slot text not null check (slot in ('hat', 'eyes', 'neck', 'hand', 'emote')),
  item_id text references public.shop_items(id),
  primary key (user_id, slot)
);

create table public.user_powerups (
  user_id uuid references public.profiles(id) on delete cascade,
  power_up_type text not null check (power_up_type in ('hint', 'double', 'freeze')),
  count integer not null default 0,
  primary key (user_id, power_up_type)
);

create table public.shop_purchases (
  id bigserial primary key,
  user_id uuid references public.profiles(id),
  item_id text references public.shop_items(id),
  price_paid integer not null,
  purchased_at timestamptz not null default now()
);

alter table public.shop_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.user_equipped enable row level security;
alter table public.user_powerups enable row level security;
alter table public.shop_purchases enable row level security;

create policy "shop_items_select_all" on public.shop_items for select to authenticated using (true);
create policy "shop_items_officer_write" on public.shop_items for all to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

create policy "own_inventory_select" on public.user_inventory for select to authenticated using (user_id = auth.uid());
create policy "own_equipped_all" on public.user_equipped for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_powerups_select" on public.user_powerups for select to authenticated using (user_id = auth.uid());
create policy "own_purchases_select" on public.shop_purchases for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- Members-area content
-- ============================================================================
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  kind text not null default 'general' check (kind in ('general', 'pinned', 'fundraiser')),
  pinned boolean not null default false,
  room_assignments jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;
create policy "announcements_read" on public.announcements for select to authenticated using (true);
create policy "announcements_officer_write" on public.announcements for all to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

create table public.conference_documents (
  id uuid primary key default gen_random_uuid(),
  conference text not null check (conference in ('SCDC', 'ICDC')),
  doc_type text not null check (doc_type in ('permission_slip', 'packing_list', 'rooming_form')),
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table public.conference_documents enable row level security;
create policy "conf_docs_read" on public.conference_documents for select to authenticated using (true);
create policy "conf_docs_officer_write" on public.conference_documents for all to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

create table public.blazer_inventory (
  size text primary key check (size in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  count integer not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.blazer_inventory enable row level security;
create policy "blazers_read" on public.blazer_inventory for select to authenticated using (true);
create policy "blazers_officer_write" on public.blazer_inventory for all to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

create table public.trifold_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id),
  event_name text not null,
  event_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'fulfilled')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.trifold_requests enable row level security;
create policy "trifold_insert_own" on public.trifold_requests for insert to authenticated with check (requested_by = auth.uid());
create policy "trifold_select_own_or_officer" on public.trifold_requests for select to authenticated
  using (requested_by = auth.uid() or public.is_officer(auth.uid()));
create policy "trifold_officer_update" on public.trifold_requests for update to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  location text,
  caption text,
  storage_path text not null,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table public.gallery_photos enable row level security;
create policy "gallery_read" on public.gallery_photos for select to authenticated using (true);
create policy "gallery_officer_write" on public.gallery_photos for all to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));

alter table public.officer_invite_codes enable row level security;
create policy "invite_codes_officer_only" on public.officer_invite_codes for all to authenticated
  using (public.is_officer(auth.uid())) with check (public.is_officer(auth.uid()));


-- ###################################################################
-- ## 0002_rpcs.sql
-- ###################################################################

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


-- ###################################################################
-- ## 0003_storage.sql
-- ###################################################################

-- Storage buckets: private conference docs (signed-URL read), public gallery photos.
insert into storage.buckets (id, name, public) values ('conference-docs', 'conference-docs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true)
  on conflict (id) do nothing;

-- Guarded: `create policy` has no IF NOT EXISTS, and storage.objects is owned by
-- supabase_storage_admin on hosted projects. Since the whole setup script runs in one
-- transaction, an unguarded failure here would roll back every other migration too.
-- Dropping first makes re-runs idempotent.
do $$
begin
  drop policy if exists "conference_docs_read_authenticated" on storage.objects;
  drop policy if exists "conference_docs_officer_write" on storage.objects;
  drop policy if exists "gallery_public_read" on storage.objects;
  drop policy if exists "gallery_officer_write" on storage.objects;

  create policy "conference_docs_read_authenticated" on storage.objects
    for select to authenticated using (bucket_id = 'conference-docs');

  create policy "conference_docs_officer_write" on storage.objects
    for all to authenticated
    using (bucket_id = 'conference-docs' and public.is_officer(auth.uid()))
    with check (bucket_id = 'conference-docs' and public.is_officer(auth.uid()));

  create policy "gallery_public_read" on storage.objects
    for select using (bucket_id = 'gallery');

  create policy "gallery_officer_write" on storage.objects
    for all to authenticated
    using (bucket_id = 'gallery' and public.is_officer(auth.uid()))
    with check (bucket_id = 'gallery' and public.is_officer(auth.uid()));
exception
  when insufficient_privilege then
    raise notice 'insufficient privilege on storage.objects; add the storage policies via the dashboard';
end $$;


-- ###################################################################
-- ## 0004_public_home.sql
-- ###################################################################

-- Public Home page needs a live member count, and Past Conferences needs a public gallery,
-- without exposing full profile rows (email, xp, etc.) or officer-only content to anon visitors.

create or replace function public.member_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.profiles;
$$;

grant execute on function public.member_count() to anon, authenticated;

create policy "gallery_read_public" on public.gallery_photos
  for select to anon using (true);


-- ###################################################################
-- ## 0005_questions_rls_fix.sql
-- ###################################################################

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


-- ###################################################################
-- ## 0006_realtime.sql
-- ###################################################################

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


-- ###################################################################
-- ## 0007_allowed_domain_config.sql
-- ###################################################################

-- handle_new_user() (0001) reads the Postgres GUC app.allowed_email_domain, but nothing ever
-- set it -- it was silently always falling back to the hardcoded 'bergen.org' default no matter
-- what NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN was set to on the app side. Keep this value in sync with
-- that env var; if the chapter's school domain ever changes, update both.
--
-- Guarded: `alter database` needs privileges the SQL Editor role may not have on hosted
-- Supabase, and the whole setup script runs in one transaction -- an unguarded failure here
-- would roll back every other migration. If this is skipped, handle_new_user() still falls
-- back to the 'bergen.org' default baked into 0001, so signup restriction stays enforced.
do $$
begin
  execute format('alter database %I set app.allowed_email_domain = %L', current_database(), 'bergen.org');
exception
  when insufficient_privilege then
    raise notice 'could not set app.allowed_email_domain; falling back to the default in handle_new_user()';
end $$;


-- ###################################################################
-- ## 0008_missed_question_review.sql
-- ###################################################################

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


-- ###################################################################
-- ## seed.sql (question bank, shop catalog, blazers, announcements)
-- ###################################################################

-- Local/dev seed data, ported from the bca-deca-site.dc.html prototype.
-- Real member profiles are created by real signups (auth.users -> handle_new_user trigger),
-- not seeded here -- this file only seeds content that has no "owner" user: the question
-- bank, shop catalog, blazer inventory, and starter announcements.

-- ============================================================================
-- Question bank (ported verbatim from this.QB in the prototype, ~line 210-229)
-- ============================================================================
insert into public.questions (question_text, choices, correct_index, explanation, kpi_area, cluster, difficulty_rating) values
('A balance sheet shows a company''s financial condition by listing what it owns, owes, and its net worth — as of', array['A full fiscal year','A specific point in time','The next quarter','A 5-year average'], 1, 'A balance sheet is a snapshot at one moment; the income statement covers a period.', 'Financial Statements', 'Finance', 1500),
('Revenue is $850,000, COGS is $510,000, operating expenses are $180,000. Net profit is', array['$160,000','$340,000','$180,000','$670,000'], 0, '$850k − $510k = $340k gross; $340k − $180k = $160k net.', 'Financial Statements', 'Finance', 1550),
('Reviewing each income-statement line item as a percentage of total revenue is', array['Horizontal analysis','Vertical analysis','SWOT analysis','Break-even analysis'], 1, 'Vertical analysis expresses each item as a proportion of revenue.', 'Financial Statements', 'Finance', 1500),
('Penetration pricing — a low launch price to grab market share — is used during which product life-cycle stage?', array['Growth','Maturity','Introduction','Decline'], 2, 'Low introductory pricing drives rapid adoption at launch.', 'Pricing', 'Marketing', 1450),
('A software firm sells its word processor, spreadsheet, and slides together for less than buying each. This is', array['Price skimming','Penetration pricing','Product bundling','Loss-leader pricing'], 2, 'Bundling packages multiple products at a combined discount.', 'Pricing', 'Marketing', 1500),
('Segmenting a sports-drink market into casual exercisers, athletes, and weekend warriors is', array['Demographic','Geographic','Psychographic','Behavioral'], 3, 'Behavioral segmentation divides by usage and behavior patterns.', 'Market Planning', 'Marketing', 1550),
('A situational analysis in a marketing plan primarily identifies', array['The promotional budget','Strengths, weaknesses, opportunities, threats','Channel partners','Sales forecasts'], 1, 'Situational analysis is essentially a SWOT of the firm''s position.', 'Market Planning', 'Marketing', 1450),
('The most common distribution channel for consumer goods is', array['Producer→agent→consumer','Producer→wholesaler→retailer→consumer','Retailer→wholesaler→producer','Producer→retailer→agent'], 1, 'Producer → wholesaler → retailer → consumer is the standard path.', 'Channel Management', 'Marketing', 1450),
('The primary goal of institutional (corporate) promotion is to', array['Sell a specific product','Build a favorable company image','Explain a service''s features','Respond to bad press'], 1, 'Institutional promotion builds image and goodwill, not a single sale.', 'Promotion', 'Marketing', 1500),
('Mirroring a client''s communication pace and tone to make them comfortable is', array['Deceptive communication','Building rapport','Passive-aggression','Aggressive style'], 1, 'Matching style builds rapport and trust.', 'Communication', 'Business Management', 1400),
('Working capital management focuses primarily on', array['Long-term equity','Short-term assets and liabilities','Issuing stock','Acquisitions'], 1, 'It manages current assets/liabilities — cash, receivables, payables, inventory.', 'Financial Management', 'Finance', 1550),
('A company''s roof collapses in a storm, halting operations for weeks. This is', array['Financial risk','Strategic risk','Operational risk','Legal risk'], 2, 'Operational risk threatens day-to-day activities.', 'Risk Management', 'Business Management', 1450),
('Trading securities on material non-public information is', array['Affinity fraud','Insider trading','Phishing','A pump and dump'], 1, 'Insider trading uses confidential, market-moving information.', 'Ethics', 'Business Management', 1400),
('When an economy enters expansion, businesses typically', array['Cut inventory','Reduce capital investment','Invest in plants & equipment','Slash prices'], 2, 'Producer confidence rises, driving investment in capacity.', 'Economics', 'Entrepreneurship', 1500),
('A government restricting imports to protect domestic industry is practicing', array['Free trade','Protectionism','Arbitration','Monetary policy'], 1, 'Protectionism uses tariffs and quotas to shield domestic firms.', 'Economics', 'Entrepreneurship', 1450),
('Separation of duties — so no one person both authorizes and records a transaction — is a(n)', array['External control','Regulatory control','Internal control','Market control'], 2, 'It''s an internal control that reduces fraud risk.', 'Operations', 'Business Management', 1550),
('Future value of money requires three inputs:', array['Revenue, expenses, margin','Present value, interest rate, time','Net income, dividends, equity','Price, book value, yield'], 1, 'FV = PV × (1+i)^n needs PV, rate, and periods.', 'Financial Analysis', 'Finance', 1600),
('An employee who takes on extra work to help a teammate without being asked shows', array['Conformity','Initiative','Herd mentality','Passivity'], 1, 'Initiative is acting proactively without being told.', 'Emotional Intelligence', 'Hospitality & Tourism', 1400);

-- ============================================================================
-- Shop catalog (ported verbatim from this.SHOP)
-- ============================================================================
insert into public.shop_items (id, name, icon, kind, slot, price, anim) values
('beanie', 'Beanie', '🧢', 'outfit', 'hat', 30, null),
('tophat', 'Top Hat', '🎩', 'outfit', 'hat', 45, null),
('crown', 'Gold Crown', '👑', 'outfit', 'hat', 90, null),
('grad', 'Grad Cap', '🎓', 'outfit', 'hat', 60, null),
('shades', 'Sunglasses', '🕶️', 'outfit', 'eyes', 35, null),
('scarfR', 'Red Scarf', '🧣', 'outfit', 'neck', 25, null),
('bowtie', 'Bow Tie', '🎀', 'outfit', 'neck', 40, null),
('briefcase', 'Briefcase', '💼', 'outfit', 'hand', 50, null),
('diamond', 'DECA Diamond', '💎', 'outfit', 'hand', 110, null),
('e-waddle', 'Waddle', '🐧', 'emote', 'emote', 55, 'pwaddle .55s ease-in-out infinite alternate'),
('e-party', 'Party', '🎉', 'emote', 'emote', 95, 'pparty .4s ease-in-out infinite alternate'),
('e-celebrate', 'Celebrate', '🥳', 'emote', 'emote', 130, 'pcelebrate .6s ease-in-out infinite'),
('e-star', 'Starpower', '⭐', 'emote', 'emote', 170, 'pstar .7s ease-in-out infinite');

insert into public.shop_items (id, name, icon, kind, slot, price, power_up_type, power_up_amount) values
('pu-hint', 'Hint Pack ×3', '💡', 'power', 'power', 40, 'hint', 3),
('pu-double', 'Double Points', '✖️2', 'power', 'power', 70, 'double', 1),
('pu-freeze', 'Streak Freeze', '❄️', 'power', 'power', 50, 'freeze', 1);

-- ============================================================================
-- Blazer inventory (ported from the borrowNode() blazers array)
-- ============================================================================
insert into public.blazer_inventory (size, count) values
('XS', 2), ('S', 5), ('M', 8), ('L', 6), ('XL', 3), ('XXL', 1);

-- ============================================================================
-- Starter announcement (the pinned room-assignments card + one fundraiser)
-- ============================================================================
insert into public.announcements (title, body, kind, pinned, room_assignments) values
('Wednesday Club Room Assignments', 'Weekly club room assignments by last name.', 'pinned', true,
  '{"A–I": "Room 179", "J–R": "Room 180", "S–Z": "Room 181"}'::jsonb);

insert into public.announcements (title, body, kind) values
('Spring Bakesale — Main Lobby', 'Fri Apr 17 · proceeds fund ICDC travel. Sign up to bring an item or staff a shift.', 'fundraiser'),
('Krispy Kreme Pre-Sale', 'Orders due Mar 6. $12/dozen, pickup before the State send-off.', 'fundraiser');


-- ###################################################################
-- ## Post-setup: refresh the API schema cache, then verify
-- ###################################################################

notify pgrst, 'reload schema';

select
  (select count(*) from public.questions)            as questions,
  (select count(*) from public.shop_items)           as shop_items,
  (select count(*) from public.announcements)        as announcements,
  (select count(*) from public.blazer_inventory)     as blazer_sizes,
  (select count(*) from public.officer_invite_codes) as invite_codes;
