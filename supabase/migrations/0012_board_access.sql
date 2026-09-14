-- ============================================================================
-- 0012: DECA Board access.
--
--   * board_emails lists everyone who should have board ('officer') access.
--   * Adding an email promotes that account right away if it already exists.
--   * Anyone who signs up later with a listed email starts on the board automatically
--     (handle_new_user below) -- no invite code needed.
--   * Deleting an email demotes that account back to member.
--
-- Manage the list from Supabase -> Table Editor -> board_emails. Emails match case-insensitively.
-- Signups aren't email-verified, so glance at new board accounts to make sure they're real.
--
-- Re-runnable.
-- ============================================================================

create table if not exists public.board_emails (
  email    text primary key,
  added_at timestamptz not null default now()
);

-- No policies on purpose: only the SQL editor, Table Editor, and service role can see or edit it.
alter table public.board_emails enable row level security;

create or replace function public.sync_board_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  prev_trusted text := current_setting('app.trusted_write', true);
begin
  -- protect_privileged_profile_cols() (0001) pins role back unless this flag is on.
  perform set_config('app.trusted_write', 'on', true);

  if tg_op in ('DELETE', 'UPDATE') then
    update public.profiles set role = 'member'
      where lower(email) = lower(trim(old.email)) and role = 'officer';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.profiles set role = 'officer'
      where lower(email) = lower(trim(new.email));
  end if;

  perform set_config('app.trusted_write', coalesce(prev_trusted, ''), true);
  return null;
end;
$$;

drop trigger if exists trg_sync_board_role on public.board_emails;
create trigger trg_sync_board_role
  after insert or update or delete on public.board_emails
  for each row execute function public.sync_board_role();

-- Recreated from 0001 with the board-list check added ahead of the invite code.
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

  if exists (select 1 from public.board_emails where lower(trim(email)) = lower(new.email)) then
    -- Listed board members don't need (or use up) an invite code.
    assigned_role := 'officer';
  elsif supplied_code is not null and length(trim(supplied_code)) > 0 then
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

-- The 2026-27 board. Existing accounts are promoted by the trigger above as these land.
insert into public.board_emails (email) values
  ('sopyan28@bergen.org'),
  ('ryamat28@bergen.org'),
  ('praara28@bergen.org'),
  ('ravroy28@bergen.org'),
  ('josgut@bergen.org'),
  ('acukym@bergen.org'),
  ('jercha28@bergen.org')
on conflict (email) do nothing;

-- ravroy28 signed up on 2026-09-08 but never clicked the verification email, so the account
-- can't log in. Mark it verified so its board access is usable right away.
update auth.users set email_confirmed_at = now()
where email = 'ravroy28@bergen.org' and email_confirmed_at is null;
