import { colors } from '@/lib/ui/tokens';

export interface MissedRow {
  attempt_id: number;
  kpi_area: string;
  question_text: string;
  chosen_text: string;
  correct_text: string;
  explanation: string;
}

/** Wrong-answer review from the design prototype's missedList(). */
export function MissedList({ rows }: { rows: MissedRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '34px 14px', color: colors.textFaint }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: colors.textSecondary }}>No misses yet!</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>Run a practice session to find your weak spots</div>
      </div>
    );
  }

  return (
    <div>
      {rows.map((w) => (
        <div key={w.attempt_id} style={{ background: '#fff4f3', border: '1.5px solid #f6d4d1', borderRadius: 6, padding: 12, marginBottom: 9 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', color: colors.redDark, marginBottom: 5 }}>
            {w.kpi_area}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3f4a55', lineHeight: 1.4, marginBottom: 7 }}>{w.question_text}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: colors.redDark, marginBottom: 2 }}>✗ You: {w.chosen_text}</div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#3a9d5d', marginBottom: 6 }}>✓ Correct: {w.correct_text}</div>
          {w.explanation && (
            <div style={{ fontSize: 11, fontWeight: 600, color: '#7c8a98', lineHeight: 1.4, borderTop: '1px solid #f0dcda', paddingTop: 6 }}>
              {w.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
