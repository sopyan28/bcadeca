'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { colors, fonts, pressedButton } from '@/lib/ui/tokens';
import { startPracticeSession, submitAnswer, finishPracticeSession, type StartSessionResult, type AnswerResult } from '@/app/(members)/prep/arena/actions';
import type { PracticeMode } from '@/lib/algorithms/practiceSelection';

type Phase = 'idle' | 'loading' | 'running' | 'summary';

const MODES: { mode: PracticeMode; label: string; desc: string }[] = [
  { mode: 'quick', label: 'Quick Practice', desc: '8 questions across all areas' },
  { mode: 'cluster', label: 'Cluster Focus', desc: 'Pick one DECA cluster to drill' },
  { mode: 'weakness', label: 'Weak Spots', desc: 'Focus on areas you’ve missed' },
];

export function PracticeRunner({ clusters }: { clusters: string[] }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [pickingCluster, setPickingCluster] = useState(false);
  const [session, setSession] = useState<StartSessionResult | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [ddEarned, setDdEarned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function launch(mode: PracticeMode, clusterFilter?: string) {
    setError(null);
    setPickingCluster(false);
    setPhase('loading');
    startTransition(async () => {
      try {
        const s = await startPracticeSession(mode, clusterFilter);
        setSession(s);
        setIndex(0);
        setChosen(null);
        setResult(null);
        setCorrectCount(0);
        setXpEarned(0);
        setDdEarned(0);
        setPhase('running');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start session');
        setPhase('idle');
      }
    });
  }

  function answer(choiceIndex: number) {
    if (!session || chosen !== null) return;
    const question = session.questions[index]!;
    setChosen(choiceIndex);
    startTransition(async () => {
      const r = await submitAnswer(session.sessionId, question.id, choiceIndex);
      setResult(r);
      if (r.isCorrect) setCorrectCount((c) => c + 1);
      setXpEarned((x) => x + r.xpAwarded);
      setDdEarned((d) => d + r.ddAwarded);
    });
  }

  function next() {
    if (!session) return;
    if (index + 1 >= session.questions.length) {
      startTransition(async () => {
        await finishPracticeSession(session.sessionId, session.questions.length);
        setPhase('summary');
        router.refresh();
      });
    } else {
      setIndex((i) => i + 1);
      setChosen(null);
      setResult(null);
    }
  }

  if (phase === 'idle' || phase === 'loading') {
    return (
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: colors.textFaint, marginBottom: 9 }}>
          Earn XP &amp; DECA$
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {MODES.map((m) => (
            <button
              key={m.mode}
              disabled={phase === 'loading'}
              onClick={() => (m.mode === 'cluster' ? setPickingCluster(true) : launch(m.mode))}
              style={{
                width: '100%',
                textAlign: 'left',
                border: `2px solid ${pickingCluster && m.mode === 'cluster' ? colors.blue : colors.border}`,
                borderRadius: 7,
                padding: '13px 14px',
                cursor: 'pointer',
                background: colors.bg,
              }}
            >
              <div style={{ fontFamily: fonts.body, fontWeight: 800, fontSize: 14.5, color: colors.navy }}>{m.label}</div>
              <div style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 3 }}>{m.desc}</div>
            </button>
          ))}
        </div>
        {pickingCluster && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {clusters.length === 0 && <div style={{ fontSize: 13, color: colors.textMuted }}>No clusters available yet.</div>}
            {clusters.map((c) => (
              <button
                key={c}
                onClick={() => launch('cluster', c)}
                style={{
                  border: `1.5px solid ${colors.borderLight}`,
                  background: '#fff',
                  color: '#5d7894',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  fontWeight: 800,
                  fontSize: 12.5,
                  borderRadius: 20,
                  padding: '7px 13px',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {phase === 'loading' && <div style={{ marginTop: 12, fontSize: 13, color: colors.textMuted }}>Building your session…</div>}
        {error && <div style={{ marginTop: 12, fontSize: 13, color: colors.redDark, fontWeight: 700 }}>{error}</div>}
      </div>
    );
  }

  if (phase === 'summary' && session) {
    return (
      <Modal>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>{correctCount === session.questions.length ? '🎉' : '✅'}</div>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 18, color: colors.navy, marginTop: 8 }}>
          {correctCount}/{session.questions.length} correct
        </div>
        <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
          +{xpEarned} XP &nbsp;·&nbsp; +{ddEarned} DECA$
        </div>
        <button
          onClick={() => setPhase('idle')}
          style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '10px 22px', marginTop: 18 }}
        >
          Practice again
        </button>
      </div>
      </Modal>
    );
  }

  if (phase === 'running' && session) {
    const question = session.questions[index]!;
    return (
      <Modal>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: colors.textMuted, marginBottom: 10 }}>
          <span>{question.kpi_area}</span>
          <span>
            {index + 1} / {session.questions.length}
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
                disabled={chosen !== null || isPending}
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
            <button onClick={next} style={{ ...pressedButton(colors.blue, colors.blueShadow), padding: '10px 20px', marginTop: 12 }}>
              {index + 1 >= session.questions.length ? 'Finish' : 'Next question →'}
            </button>
          </div>
        )}
      </div>
      </Modal>
    );
  }

  return null;
}

/**
 * A running session takes over the screen rather than rendering inside the 300px arena
 * sidebar, matching the design prototype's question modal -- four answer choices and an
 * explanation don't fit in a sidebar column.
 */
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(14,58,99,.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 560,
          padding: 24,
          boxShadow: '0 30px 70px rgba(10,40,80,.35)',
          animation: 'pop .25s ease',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
