'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import {
  getNextDiagnosticItem,
  answerDiagnosticItem,
  type NextItemResult,
  type DiagnosticAnswerResult,
} from '@/app/(members)/prep/diagnostic/actions';

export function DiagnosticRunner({ runId }: { runId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<NextItemResult | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<DiagnosticAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadNext() {
    setLoading(true);
    setChosen(null);
    setResult(null);
    try {
      const next = await getNextDiagnosticItem(runId);
      if (next.done) {
        router.push(`/prep/diagnostic/results/${runId}`);
        return;
      }
      setItem(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  async function answer(choiceIndex: number) {
    if (!item?.question || chosen !== null) return;
    setChosen(choiceIndex);
    try {
      const r = await answerDiagnosticItem(runId, item.question.id, choiceIndex);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not grade answer');
    }
  }

  if (error) {
    return <div style={{ color: colors.redDark, fontWeight: 700, padding: 20 }}>{error}</div>;
  }

  if (loading || !item?.question) {
    return (
      <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 40, textAlign: 'center', color: colors.textMuted }}>
        Loading next question…
      </div>
    );
  }

  const { question } = item;

  return (
    <div style={{ background: '#fff', border: `2px solid ${colors.border}`, borderRadius: 10, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: colors.textMuted, marginBottom: 10 }}>
        <span>{question.kpi_area}</span>
        <span>
          Item {(item.totalItemsThisRun ?? 0) + 1} &nbsp;·&nbsp; {item.areasCovered}/{item.totalAreas} areas covered
        </span>
      </div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 16, color: colors.navy, marginBottom: 16 }}>
        {question.question_text}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.choices.map((choice, i) => {
          let bg: string = colors.bg;
          let border: string = colors.border;
          if (result) {
            if (i === result.correctIndex) {
              bg = '#e7f8ee';
              border = colors.green;
            } else if (i === chosen && !result.isCorrect) {
              bg = '#fdecec';
              border = colors.red;
            }
          } else if (i === chosen) {
            border = colors.blue;
          }
          return (
            <button
              key={i}
              disabled={chosen !== null}
              onClick={() => answer(i)}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: 8,
                border: `2px solid ${border}`,
                background: bg,
                cursor: chosen === null ? 'pointer' : 'default',
                fontFamily: fonts.body,
                fontSize: 14.5,
                color: colors.navy,
              }}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13.5, color: colors.textSecondary, lineHeight: 1.5 }}>{result.explanation}</div>
          <button onClick={loadNext} style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '10px 20px', marginTop: 12 }}>
            Next question →
          </button>
        </div>
      )}
    </div>
  );
}
