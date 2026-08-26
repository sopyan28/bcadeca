import Link from 'next/link';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { getDiagnosticResults, type DiagnosticResultRow } from '../../actions';
import { areaTier, type AreaTier } from '@/lib/algorithms/diagnosticElo';
import { RadarChart } from '@/components/diagnostic/RadarChart';

const TIER_COLOR: Record<AreaTier, string> = {
  focus: colors.red,
  shaky: colors.gold,
  solid: colors.green,
};

function AreaRow({ r, tier }: { r: DiagnosticResultRow; tier: AreaTier }) {
  const accent = TIER_COLOR[tier];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        background: tier === 'solid' ? colors.borderFaint : '#fff',
        border: `2px solid ${tier === 'solid' ? colors.border : accent}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: colors.navy }}>{r.kpi_area}</div>
        <div style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
          Mastery {r.mastery_pct}%
          {r.low_data && <span style={{ color: colors.goldText, fontWeight: 700 }}> &middot; thin question pool</span>}
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 14, color: accent, whiteSpace: 'nowrap' }}>
        {r.items_correct} / {r.items_in_area}
      </div>
    </div>
  );
}

function Section({
  title,
  blurb,
  rows,
  tier,
}: {
  title: string;
  blurb: string;
  rows: DiagnosticResultRow[];
  tier: AreaTier;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: colors.navy, margin: '24px 0 2px' }}>
        {title} ({rows.length})
      </div>
      <div style={{ fontSize: 12.5, color: colors.textMuted, marginBottom: 10 }}>{blurb}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => (
          <AreaRow key={r.kpi_area} r={r} tier={tier} />
        ))}
      </div>
    </>
  );
}

export default async function DiagnosticResultsPage({ params }: { params: { runId: string } }) {
  const results = await getDiagnosticResults(params.runId);

  const byName = (a: DiagnosticResultRow, b: DiagnosticResultRow) => a.kpi_area.localeCompare(b.kpi_area);
  const focus = results.filter((r) => areaTier(r) === 'focus').sort(byName);
  const shaky = results.filter((r) => areaTier(r) === 'shaky').sort(byName);
  const solid = results.filter((r) => areaTier(r) === 'solid').sort(byName);

  const totalCorrect = results.reduce((s, r) => s + r.items_correct, 0);
  const totalItems = results.reduce((s, r) => s + r.items_in_area, 0);

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 26 }}>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 19, color: colors.navy }}>Diagnostic results</div>
      {totalItems > 0 && (
        <div style={{ fontSize: 13.5, color: colors.textSecondary, marginTop: 4 }}>
          You scored <strong style={{ color: colors.navy }}>{totalCorrect} of {totalItems}</strong> across {results.length}{' '}
          instructional area{results.length === 1 ? '' : 's'}.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <RadarChart data={results} />
      </div>

      {results.length > 0 && focus.length === 0 && shaky.length === 0 && (
        <div style={{ fontSize: 13.5, color: colors.textSecondary }}>
          You answered every area cleanly — nothing to flag as weak.
        </div>
      )}

      <Section
        title="Focus areas"
        blurb="You missed both questions here. Start with these."
        rows={focus}
        tier="focus"
      />
      <Section
        title="Shaky"
        blurb="You missed one of two here — worth a review, but a single miss is a weaker signal than a clean zero."
        rows={shaky}
        tier="shaky"
      />

      {(focus.length > 0 || shaky.length > 0) && (
        <Link href="/prep/arena" style={{ display: 'inline-block', marginTop: 16 }}>
          <span style={{ ...pressedButton(colors.green, colors.greenShadow), padding: '10px 20px', display: 'inline-block' }}>
            Practice these in the Arena →
          </span>
        </Link>
      )}

      <Section title="Solid" blurb="Both questions correct." rows={solid} tier="solid" />

      {results.length === 0 && <div style={{ color: colors.textMuted, fontSize: 14 }}>No results yet.</div>}

      <Link href="/prep/diagnostic" style={{ display: 'inline-block', marginTop: 22 }}>
        <span style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '10px 20px', display: 'inline-block' }}>
          Back to diagnostic
        </span>
      </Link>
    </div>
  );
}
