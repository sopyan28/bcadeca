-- Storage buckets: private conference docs (signed-URL read), public gallery photos.
insert into storage.buckets (id, name, public) values ('conference-docs', 'conference-docs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('gallery', 'gallery', true)
  on conflict (id) do nothing;

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
