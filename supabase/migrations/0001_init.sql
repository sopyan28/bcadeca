-- BCA DECA Hub -- core schema. See /README.md and the implementation plan for design rationale.
-- Extensions
create extension if not exists pgcrypto;

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

-- ============================================================================
-- Helper: officer check (security definer so it can be used inside RLS policies
-- without those policies needing direct select access to profiles.role themselves).
--
-- Must be declared AFTER public.profiles exists: this is `language sql`, whose body
-- Postgres parses and validates at CREATE time (unlike plpgsql, which is checked
-- lazily). Declaring it before the table aborts with 42P01 relation does not exist.
-- Its first actual use is handle_new_user() below.
-- ============================================================================
create or replace function public.is_officer(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = uid and role = 'officer');
$$;

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
