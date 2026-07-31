-- Public Home page needs a live member count, and Past Conferences needs a public gallery,
-- without exposing full profile rows (email, xp, etc.) or officer-only content to anon visitors.

create or replace function public.member_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from public.profiles;
$$;

grant execute on function public.member_count() to anon, authenticated;

create policy "gallery_read_public" on public.gallery_photos
  for select to anon using (true);
