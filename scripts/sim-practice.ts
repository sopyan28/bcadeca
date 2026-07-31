/**
 * Verifies the practice-session randomization algorithm (lib/algorithms/practiceSelection.ts)
 * against the acceptance criteria from the implementation plan (Part D / milestone 5):
 *   - a correctly-answered question never reappears within the 14-day cooldown, EXCEPT in
 *     sessions explicitly flagged `degraded` (the documented escape hatch for a bank too thin
 *     to fill a session -- see filterByCooldown's 14d -> 3d -> none relaxation ladder)
 *   - area distribution tracks bank composition in 'quick' mode
 *   - 'weakness' mode only ever pulls from areas the user has actually missed
 *
 * Two banks are exercised:
 *   A) the prototype's real 18-question bank, which is far too thin to satisfy the cooldown
 *      (50 sessions x 5 questions = 250 draws; any 14-day window needs 70 distinct questions
 *      from a pool of 18). Here we assert the relaxation is *correctly attributed* -- every
 *      violation must occur inside a degraded session, never a clean one.
 *   B) a realistically-sized bank (20 questions/area), where the cooldown must hold outright
 *      and the area distribution must track bank composition.
 *
 * Run with: npm run sim:practice
 */
import { selectPracticeSession } from '../lib/algorithms/practiceSelection';
import type { AttemptRow, QuestionRow } from '../lib/algorithms/types';

const AREAS: Record<string, number> = {
  'Financial Statements': 3,
  Pricing: 2,
  'Market Planning': 2,
  'Channel Management': 1,
  Promotion: 1,
  Communication: 1,
  'Financial Management': 1,
  'Risk Management': 1,
  Ethics: 1,
  Economics: 2,
  Operations: 1,
  'Financial Analysis': 1,
  'Emotional Intelligence': 1,
};

const DAY = 24 * 60 * 60 * 1000;
const SESSIONS = 50;
const SESSION_SIZE = 5;

function buildBank(perArea: (bankCount: number) => number): QuestionRow[] {
  const questions: QuestionRow[] = [];
  let qid = 0;
  for (const [area, count] of Object.entries(AREAS)) {
    for (let i = 0; i < perArea(count); i++) {
      questions.push({ id: `q${qid++}`, kpi_area: area, cluster: 'x', difficulty_rating: 1500, exposure_count: 0 });
    }
  }
  return questions;
}

interface RunResult {
  areaHits: Record<string, number>;
  violationsInCleanSessions: number;
  violationsInDegradedSessions: number;
  degradedCount: number;
  attempts: AttemptRow[];
  questions: QuestionRow[];
}

function run(questions: QuestionRow[]): RunResult {
  let now = Date.now();
  const attempts: AttemptRow[] = [];
  const areaHits: Record<string, number> = {};
  let violationsInCleanSessions = 0;
  let violationsInDegradedSessions = 0;
  let degradedCount = 0;

  for (let s = 0; s < SESSIONS; s++) {
    const result = selectPracticeSession({ mode: 'quick', sessionSize: SESSION_SIZE, questions, attempts, now });
    if (result.degraded) degradedCount++;

    for (const qid of result.questionIds) {
      const q = questions.find((x) => x.id === qid)!;
      q.exposure_count++;
      areaHits[q.kpi_area] = (areaHits[q.kpi_area] ?? 0) + 1;

      const recentCorrect = attempts.find(
        (a) => a.question_id === qid && a.is_correct && now - new Date(a.created_at).getTime() < 14 * DAY
      );
      if (recentCorrect) {
        if (result.degraded) violationsInDegradedSessions++;
        else violationsInCleanSessions++;
      }

      const correct = Math.random() > 0.4;
      attempts.push({ question_id: qid, kpi_area: q.kpi_area, is_correct: correct, created_at: new Date(now).toISOString() });
    }

    now += DAY; // one session per day
  }

  return { areaHits, violationsInCleanSessions, violationsInDegradedSessions, degradedCount, attempts, questions };
}

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${detail}`);
  if (!ok) failures++;
}

// ---------------------------------------------------------------------------
// A) The real 18-question bank -- too thin; relaxation is expected but must be
//    correctly attributed to degraded sessions.
// ---------------------------------------------------------------------------
console.log('\n=== A) Thin bank (18 questions, the prototype\'s real bank) ===');
const thin = run(buildBank((n) => n));
console.log(`Sessions: ${SESSIONS} x ${SESSION_SIZE} questions = ${SESSIONS * SESSION_SIZE} draws from ${thin.questions.length} questions`);
console.log(`Degraded sessions: ${thin.degradedCount}/${SESSIONS} (expected: most -- bank cannot satisfy a 14d cooldown)`);
check(
  'cooldown violations confined to degraded sessions',
  thin.violationsInCleanSessions === 0,
  `${thin.violationsInCleanSessions} in clean sessions (expect 0), ${thin.violationsInDegradedSessions} in degraded`
);
const thinAreasUsed = Object.values(thin.areaHits).filter((h) => h > 0).length;
check(
  'every area gets drawn at least once',
  thinAreasUsed === Object.keys(AREAS).length,
  `${thinAreasUsed}/${Object.keys(AREAS).length} areas drawn`
);

// ---------------------------------------------------------------------------
// B) A realistically-sized bank -- cooldown must hold outright, distribution
//    must track bank composition.
// ---------------------------------------------------------------------------
console.log('\n=== B) Realistic bank (20 questions per area) ===');
const big = run(buildBank(() => 20));
console.log(`Sessions: ${SESSIONS} x ${SESSION_SIZE} = ${SESSIONS * SESSION_SIZE} draws from ${big.questions.length} questions`);
check('no degraded sessions', big.degradedCount === 0, `${big.degradedCount} degraded (expect 0)`);
check(
  'zero cooldown violations',
  big.violationsInCleanSessions + big.violationsInDegradedSessions === 0,
  `${big.violationsInCleanSessions + big.violationsInDegradedSessions} violations (expect 0)`
);

// With a uniform bank every area is equally weighted, so each of the 13 areas should get
// roughly 1/13 of the draws. Allow generous slack for sampling noise over 250 draws.
const areaCount = Object.keys(AREAS).length;
const expectedShare = 100 / areaCount;
let worstDeviation = 0;
let worstArea = '';
for (const area of Object.keys(AREAS)) {
  const share = ((big.areaHits[area] ?? 0) / (SESSIONS * SESSION_SIZE)) * 100;
  const deviation = Math.abs(share - expectedShare);
  if (deviation > worstDeviation) {
    worstDeviation = deviation;
    worstArea = area;
  }
}
check(
  'area distribution tracks bank composition',
  worstDeviation <= 5,
  `worst deviation ${worstDeviation.toFixed(1)}pp on "${worstArea}" (expected ~${expectedShare.toFixed(1)}% each, tolerance 5pp)`
);

console.log('\n  Distribution:');
for (const area of Object.keys(AREAS)) {
  const hits = big.areaHits[area] ?? 0;
  const share = ((hits / (SESSIONS * SESSION_SIZE)) * 100).toFixed(1);
  console.log(`    ${area.padEnd(24)} ${share.padStart(5)}%  (${hits} hits)`);
}

// ---------------------------------------------------------------------------
// C) Weakness mode must never pull from an area the user has never missed.
// ---------------------------------------------------------------------------
console.log('\n=== C) Weakness mode ===');
const missedAreas = new Set(big.attempts.filter((a) => !a.is_correct).map((a) => a.kpi_area));
let weaknessLeaks = 0;
for (let s = 0; s < 20; s++) {
  const result = selectPracticeSession({ mode: 'weakness', sessionSize: 5, questions: big.questions, attempts: big.attempts, now: Date.now() });
  for (const qid of result.questionIds) {
    const q = big.questions.find((x) => x.id === qid)!;
    if (!missedAreas.has(q.kpi_area)) weaknessLeaks++;
  }
}
check('no leaks from never-missed areas', weaknessLeaks === 0, `${weaknessLeaks} leaks (expect 0)`);

console.log(failures === 0 ? '\nPASS\n' : `\nFAIL (${failures} check${failures === 1 ? '' : 's'})\n`);
if (failures > 0) process.exitCode = 1;
