-- ============================================================================
-- 0015: Real blazer sizes, and Regionals as a conference.
-- Re-runnable.
-- ============================================================================

-- Blazers come in women's (0R-12T) and men's (36S-46R) tag sizes, keyed "W 0R" / "M 36S".
-- The app owns the size list (lib/blazers.ts), so drop the old XS-XXL check instead of
-- swapping in another list that would need a migration every time the closet changes.
alter table public.blazer_inventory drop constraint if exists blazer_inventory_size_check;
delete from public.blazer_inventory where size in ('XS', 'S', 'M', 'L', 'XL', 'XXL');

-- Current closet, fall 2026. "04R" tags are counted as 4R. Existing rows are left alone on a
-- re-run so counts the board has since edited aren't reset.
insert into public.blazer_inventory (size, count) values
  ('W 0R', 2), ('W 2R', 1), ('W 4R', 3), ('W 6R', 1), ('W 6', 2), ('W 8', 2), ('W 12', 1), ('W 12T', 1),
  ('M 36S', 1), ('M 38R', 1), ('M 40R', 1), ('M 42S', 1), ('M 42R', 1), ('M 44R', 1), ('M 46R', 1)
on conflict (size) do nothing;

-- Regionals needs permission slips too, but no packing list or rooming form.
alter table public.conference_documents drop constraint if exists conference_documents_conference_check;
alter table public.conference_documents add constraint conference_documents_conference_check
  check (conference in ('REGIONALS', 'SCDC', 'ICDC'));

alter table public.conference_documents drop constraint if exists conference_documents_regionals_docs_check;
alter table public.conference_documents add constraint conference_documents_regionals_docs_check
  check (conference <> 'REGIONALS' or doc_type = 'permission_slip');
