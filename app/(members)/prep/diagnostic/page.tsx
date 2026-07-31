import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { startDiagnosticRun } from './actions';

export default async function DiagnosticIntroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pastRuns } = await supabase
    .from('diagnostic_runs')
    .select('id, completed_at, stop_reason, item_count')
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 26 }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy, marginBottom: 8 }}>
          🎯 Adaptive Diagnostic
        </div>
        <p style={{ fontSize: 14.5, color: colors.textSecondary, lineHeight: 1.6, maxWidth: 560 }}>
          A short, adaptive test that estimates your mastery in every KPI area. Questions get harder or easier as you
          answer, so it converges on an accurate read of your ability fast -- usually 20-30 questions, never more than 40.
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
