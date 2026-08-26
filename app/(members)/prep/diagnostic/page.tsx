import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { startDiagnosticRun } from './actions';
import { ITEMS_PER_AREA, targetItemsForArea } from '@/lib/algorithms/diagnosticElo';

export default async function DiagnosticIntroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: pastRuns }, { data: bankAreas }] = await Promise.all([
    supabase
      .from('diagnostic_runs')
      .select('id, completed_at, stop_reason, item_count')
      .eq('user_id', user!.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5),
    supabase.from('questions_public').select('kpi_area'),
  ]);

  // Show the real length up front rather than a hardcoded range, so the copy stays true as
  // the bank grows into new instructional areas.
  const poolByArea = new Map<string, number>();
  for (const q of bankAreas ?? []) poolByArea.set(q.kpi_area, (poolByArea.get(q.kpi_area) ?? 0) + 1);
  const areaCount = poolByArea.size;
  const plannedItems = Array.from(poolByArea.values()).reduce((s, n) => s + targetItemsForArea(n), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 26 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy, marginBottom: 8 }}>
          🎯 Diagnostic
        </div>
        <p style={{ fontSize: 14.5, color: colors.textSecondary, lineHeight: 1.6, maxWidth: 560 }}>
          {plannedItems > 0 ? (
            <>
              {ITEMS_PER_AREA} questions from each of the {areaCount} instructional areas —{' '}
              <strong style={{ color: colors.navy }}>{plannedItems} questions</strong> in total. Every area is scored the same
              way, so at the end you get a straight read on which areas you missed questions in. Those are your weak areas.
            </>
          ) : (
            <>The question bank is empty, so there is nothing to diagnose yet.</>
          )}
        </p>
        <form action={startDiagnosticRun}>
          <button type="submit" style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '12px 22px', marginTop: 18 }}>
            Start diagnostic
          </button>
        </form>
      </div>

      {pastRuns && pastRuns.length > 0 && (
        <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
          <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy, marginBottom: 12 }}>
            Past runs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastRuns.map((run) => (
              <Link
                key={run.id}
                href={`/prep/diagnostic/results/${run.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: `1px solid ${colors.borderFaint}`,
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: colors.navy,
                }}
              >
                <span>{new Date(run.completed_at!).toLocaleDateString()}</span>
                <span style={{ color: colors.textMuted }}>
                  {run.item_count} items &middot; {run.stop_reason}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
