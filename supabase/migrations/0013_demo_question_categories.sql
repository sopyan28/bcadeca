-- ============================================================================
-- 0013: Demo-question categories.
--
-- The 18 original demo questions used a few category names the exam bank doesn't, which split
-- the diagnostic into 29 areas (some with a single question). Fold them into the exam taxonomy.
-- Already applied to the live database on 2026-09-13; kept so fresh setups match. Re-runnable.
-- ============================================================================

update public.questions set kpi_area = 'Communication Skills' where source_exam is null and kpi_area = 'Communication';
update public.questions set kpi_area = 'Business Law'         where source_exam is null and kpi_area = 'Ethics';
update public.questions set kpi_area = 'Financial Analysis'   where source_exam is null and kpi_area in ('Financial Management', 'Financial Statements');
update public.questions set cluster  = 'Business Management'  where source_exam is null and cluster = 'Entrepreneurship';
