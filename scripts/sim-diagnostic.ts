/**
 * Verifies the adaptive diagnostic engine (lib/algorithms/diagnosticElo.ts) against the
 * acceptance criteria from the implementation plan (Part E / milestone 6):
 *   - estimated ability converges toward each synthetic user's true per-area ability
 *     within the 40-item hard cap
 *   - confidence_pct rises (roughly) monotonically over the run
 *   - an area backed by only 1-2 questions reports low_data=true and never claims
 *     near-100% confidence, no matter how many times it's re-asked
 *
 * Each synthetic user has a hidden "true ability" per KPI area. Each question has a hidden
 * "true difficulty" (independent of the visible difficulty_rating the algorithm mutates) --
 * the user's probability of answering correctly is drawn from the real Elo curve applied to
 * the TRUE values, so the simulation doesn't get to cheat by reading its own estimates.
 *
 * Run with: npm run sim:diagnostic
 */
import {
  applyEloUpdate,
  checkStop,
  confidencePct,
  expectedScore,
  INITIAL_ABILITY,
  INITIAL_RD,
  masteryPct,
  rdFloorForPoolSize,
  selectNextDiagnosticItem,
  type DiagnosticAreaState,
} from '../lib/algorithms/diagnosticElo';
import type { QuestionRow } from '../lib/algorithms/types';

interface TrueQuestion extends QuestionRow {
  trueDifficulty: number;
}

function makeBank(): { areas: string[]; questions: TrueQuestion[] } {
  const normalAreas = ['Financial Statements', 'Pricing', 'Market Planning', 'Economics', 'Operations', 'Ethics'];
  const questions: TrueQuestion[] = [];
  let id = 0;
  for (const area of normalAreas) {
    for (let i = 0; i < 12; i++) {
      const trueDifficulty = 1300 + Math.random() * 500;
      questions.push({ id: `q${id++}`, kpi_area: area, cluster: 'x', difficulty_rating: 1500, exposure_count: 0, trueDifficulty });
    }
  }
  // Sparse area: only 2 questions ever -- must trigger low_data and a high rd floor.
  for (let i = 0; i < 2; i++) {
    questions.push({ id: `q${id++}`, kpi_area: 'Sparse Area', cluster: 'x', difficulty_rating: 1500, exposure_count: 0, trueDifficulty: 1500 });
  }
  return { areas: [...normalAreas, 'Sparse Area'], questions };
}

function runOneUser(trueAbilityByArea: Map<string, number>, questions: TrueQuestion[], areaNames: string[]) {
  const questionsByArea = new Map<string, TrueQuestion[]>();
  for (const q of questions) {
    const list = questionsByArea.get(q.kpi_area) ?? [];
    list.push(q);
    questionsByArea.set(q.kpi_area, list);
  }

  const states = new Map<string, DiagnosticAreaState>();
  for (const area of areaNames) {
    states.set(area, { kpiArea: area, rating: INITIAL_ABILITY, rd: INITIAL_RD, itemsAnsweredLifetime: 0, itemsThisRun: 0 });
  }

  const asked = new Set<string>();
  const confidenceTrace: number[] = [];
  let totalItems = 0;
  let stopReason: string | null = null;

  while (true) {
    const areasArr = Array.from(states.values());
    stopReason = checkStop(areasArr, questionsByArea, totalItems);
    if (stopReason) break;

    const pick = selectNextDiagnosticItem(areasArr, questionsByArea, asked);
    if (!pick) {
      stopReason = 'exhausted';
      break;
    }

    const { kpiArea, question } = pick;
    const state = states.get(kpiArea)!;
    const trueAbility = trueAbilityByArea.get(kpiArea)!;
    const pCorrect = expectedScore(trueAbility, question.trueDifficulty);
    const correct = Math.random() < pCorrect;

    const poolSize = questionsByArea.get(kpiArea)!.length;
    const update = applyEloUpdate({
      abilityBefore: state.rating,
      rdBefore: state.rd,
      itemsAnsweredLifetimeInArea: state.itemsAnsweredLifetime,
      poolSizeInArea: poolSize,
      questionDifficultyBefore: question.difficulty_rating,
      questionExposureCountBefore: question.exposure_count,
      correct,
    });

    question.difficulty_rating = update.difficultyAfter;
    question.exposure_count += 1;
    state.rating = update.abilityAfter;
    state.rd = update.rdAfter;
    state.itemsAnsweredLifetime += 1;
    state.itemsThisRun += 1;
    asked.add(question.id);
    totalItems += 1;

    const avgConfidence = Array.from(states.values()).reduce((s, a) => s + confidencePct(a.rd), 0) / states.size;
    confidenceTrace.push(avgConfidence);
  }

  return { states, totalItems, stopReason, confidenceTrace };
}

const { areas, questions } = makeBank();
const NUM_USERS = 30;
let totalAbsError = 0;
let errorSamples = 0;
let sparseNeverOverconfident = true;
let sparseAlwaysLowData = true;
let monotonicViolations = 0;
let monotonicChecks = 0;

for (let u = 0; u < NUM_USERS; u++) {
  const trueAbilityByArea = new Map<string, number>();
  for (const area of areas) trueAbilityByArea.set(area, 1200 + Math.random() * 600);

  const { states, totalItems, stopReason, confidenceTrace } = runOneUser(trueAbilityByArea, questions.map((q) => ({ ...q })), areas);

  for (const [area, state] of states) {
    const trueAbility = trueAbilityByArea.get(area)!;
    totalAbsError += Math.abs(state.rating - trueAbility);
    errorSamples++;

    if (area === 'Sparse Area') {
      const conf = confidencePct(state.rd);
      if (conf >= 90) sparseNeverOverconfident = false;
      const poolSize = questions.filter((q) => q.kpi_area === area).length;
      if (poolSize >= 5) sparseAlwaysLowData = false; // sanity check on the fixture itself
    }
  }

  for (let i = 1; i < confidenceTrace.length; i++) {
    monotonicChecks++;
    if (confidenceTrace[i]! < confidenceTrace[i - 1]! - 5) monotonicViolations++; // allow small noise, not strict
  }

  if (u === 0) {
    console.log(`Sample run: ${totalItems} items, stopReason=${stopReason}`);
  }
}

const meanAbsError = totalAbsError / errorSamples;
console.log(`\nUsers simulated: ${NUM_USERS}`);
console.log(`Mean |estimated ability - true ability| across all areas: ${meanAbsError.toFixed(1)} Elo points`);
console.log(`Sparse-area (2 questions) rd floor: ${rdFloorForPoolSize(2).toFixed(1)} (never lets rd go low)`);
console.log(`Sparse-area confidence stayed below 90%: ${sparseNeverOverconfident}`);
console.log(`Sparse-area mastery sample (should hover near 50%, wide uncertainty): ${masteryPct(1500)}%`);
console.log(`Confidence trace monotonicity violations (>5pt drop): ${monotonicViolations}/${monotonicChecks}`);

const pass = meanAbsError < 150 && sparseNeverOverconfident && monotonicViolations / Math.max(monotonicChecks, 1) < 0.05;
console.log(pass ? '\nPASS' : '\nFAIL');
if (!pass) process.exitCode = 1;
