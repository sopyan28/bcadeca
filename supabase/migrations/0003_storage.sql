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
