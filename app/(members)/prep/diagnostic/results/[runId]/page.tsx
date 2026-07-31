import Link from 'next/link';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { getDiagnosticResults } from '../../actions';
import { RadarChart } from '@/components/diagnostic/RadarChart';

export default async function DiagnosticResultsPage({ params }: { params: { runId: string } }) {
  const results = await getDiagnosticResults(params.runId);

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 26 }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy, marginBottom: 18 }}>
        Diagnostic results
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <RadarChart data={results} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {results.map((r) => (
          <div key={r.kpi_area}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>{r.kpi_area}</div>
              <div style={{ fontSize: 12.5, color: colors.textMuted }}>
                {r.items_in_area} item{r.items_in_area === 1 ? '' : 's'}
                {r.low_data && <span style={{ color: colors.goldText, fontWeight: 700 }}> &middot; low data</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Mastery {r.mastery_pct}%</div>
                <div style={{ height: 8, background: colors.borderFaint, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.mastery_pct}%`, background: colors.blue, borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Confidence {r.confidence_pct}%</div>
                <div style={{ height: 8, background: colors.borderFaint, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.confidence_pct}%`, background: colors.purple, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>
        ))}
        {results.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>No results yet.</div>}
      </div>

      <Link href="/prep/diagnostic" style={{ display: 'inline-block', marginTop: 22 }}>
        <span style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '10px 20px', display: 'inline-block' }}>
          Back to diagnostic
        </span>
      </Link>
    </div>
  );
}
