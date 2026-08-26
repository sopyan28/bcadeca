/**
 * Verifies the fixed-form diagnostic (lib/algorithms/diagnosticElo.ts).
 *
 * The diagnostic is no longer adaptive-length: every KPI area contributes exactly
 * ITEMS_PER_AREA questions, so the acceptance criteria are about *coverage and fairness*
 * rather than ability convergence:
 *   - every area is asked exactly targetItemsForArea(pool) items, no more, no fewer
 *   - no question is repeated inside a run, and the run ends with stopReason='complete'
 *   - a genuinely weak area (low true ability) is actually flagged -- i.e. the member
 *     misses at least one of its two items often enough for the signal to be useful
 *   - across repeated runs the draw spreads over an area's whole pool rather than
 *     resurfacing the same few items (the tie-shuffle in selectNextDiagnosticItem)
 *   - a thin area still reports low_data and never claims near-100% confidence
 *
 * Each synthetic user has a hidden "true ability" per KPI area and each question a hidden
 * "true difficulty"; correctness is drawn from the real Elo curve over those TRUE values,
 * so the simulation can't cheat by reading its own estimates.
 *
 * Run with: npm run sim:diagnostic
 */
import {
  applyEloUpdate,
  checkStop,
  confidencePct,
  expectedScore,
  ITEMS_PER_AREA,
  INITIAL_ABILITY,
  INITIAL_RD,
  plannedItemCount,
  rdFloorForPoolSize,
  selectNextDiagnosticItem,
  targetItemsForArea,
  type DiagnosticAreaState,
} from '../lib/algorithms/diagnosticElo';
import type { QuestionRow } from '../lib/algorithms/types';

interface TrueQuestion extends QuestionRow {
  trueDifficulty: number;
}

/**
 * Mirrors the shipped bank: the four 2026 district exams (0010_question_bank_import.sql)
 * plus the 18 prototype seed questions, so the sim exercises the real area shape --
 * including the very thin areas (4 questions) and the very fat one (47).
 */
const BANK_SHAPE: Record<string, number> = {
  'Business Law': 18,
  'Channel Management': 6,
  'Communication Skills': 23,
  'Customer Relations': 17,
  Economics: 26,
  'Emotional Intelligence': 37,
  Entrepreneurship: 4,
  'Financial Analysis': 50,
  'Financial-Information Management': 9,
  'Human Resources Management': 5,
  'Information Management': 32,
  'Knowledge Management': 6,
  'Market Planning': 7,
  Marketing: 4,
  'Marketing-Information Management': 11,
  Operations: 47,
  Pricing: 6,
  'Product/Service Management': 17,
  'Professional Development': 33,
  'Project Management': 6,
  Promotion: 12,
  'Quality Management': 4,
  'Risk Management': 12,
  Selling: 13,
  'Strategic Management': 13,
};

function makeBank(): { areas: string[]; questions: TrueQuestion[] } {
  const questions: TrueQuestion[] = [];
  let id = 0;
  for (const [area, n] of Object.entries(BANK_SHAPE)) {
    for (let i = 0; i < n; i++) {
      questions.push({
        id: `q${id++}`,
        kpi_area: area,
        cluster: 'x',
        difficulty_rating: 1500, // every imported question starts here
        exposure_count: 0,
        trueDifficulty: 1300 + Math.random() * 500,
      });
    }
  }
  return { areas: Object.keys(BANK_SHAPE), questions };
}

function groupByArea(questions: TrueQuestion[]) {
  const m = new Map<string, TrueQuestion[]>();
  for (const q of questions) {
    const list = m.get(q.kpi_area) ?? [];
    list.push(q);
    m.set(q.kpi_area, list);
  }
  return m;
}

function runOneUser(trueAbilityByArea: Map<string, number>, questions: TrueQuestion[], areaNames: string[]) {
  const questionsByArea = groupByArea(questions);

  const states = new Map<string, DiagnosticAreaState>();
  for (const area of areaNames) {
    states.set(area, { kpiArea: area, rating: INITIAL_ABILITY, rd: INITIAL_RD, itemsAnsweredLifetime: 0, itemsThisRun: 0 });
  }

  const asked = new Set<string>();
  const correctByArea = new Map<string, number>();
  const askedOrder: string[] = [];
  let totalItems = 0;
  let stopReason: string | null = null;
  let repeats = 0;

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
    if (asked.has(question.id)) repeats++;

    const state = states.get(kpiArea)!;
    const trueAbility = trueAbilityByArea.get(kpiArea)!;
    const correct = Math.random() < expectedScore(trueAbility, question.trueDifficulty);

    const update = applyEloUpdate({
      abilityBefore: state.rating,
      rdBefore: state.rd,
      itemsAnsweredLifetimeInArea: state.itemsAnsweredLifetime,
      poolSizeInArea: questionsByArea.get(kpiArea)!.length,
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
    if (correct) correctByArea.set(kpiArea, (correctByArea.get(kpiArea) ?? 0) + 1);
    asked.add(question.id);
    askedOrder.push(question.id);
    totalItems += 1;
  }

  return { states, totalItems, stopReason, repeats, correctByArea, askedOrder };
}

const { areas, questions } = makeBank();
const expectedLength = plannedItemCount(groupByArea(questions));
const NUM_USERS = 40;

let lengthViolations = 0;
let perAreaViolations = 0;
let repeatViolations = 0;
let wrongStopReason = 0;

// Weak-area detection: users are given one deliberately weak area; how often is it caught?
let weakFlagged = 0;
let strongFalseFlags = 0;
let strongChecked = 0;
let weakZeroed = 0;
let strongZeroed = 0;

const drawCounts = new Map<string, number>(); // question id -> times drawn across all runs

for (let u = 0; u < NUM_USERS; u++) {
  const trueAbilityByArea = new Map<string, number>();
  for (const area of areas) trueAbilityByArea.set(area, 1550 + Math.random() * 150); // generally capable
  const weakArea = areas[u % areas.length]!;
  trueAbilityByArea.set(weakArea, 1050); // clearly below the 1300-1800 question band

  const { states, totalItems, stopReason, repeats, correctByArea, askedOrder } = runOneUser(
    trueAbilityByArea,
    questions.map((q) => ({ ...q })),
    areas
  );

  if (totalItems !== expectedLength) lengthViolations++;
  if (stopReason !== 'complete') wrongStopReason++;
  if (repeats > 0) repeatViolations++;
  for (const [area, state] of states) {
    const target = targetItemsForArea(BANK_SHAPE[area]!);
    if (state.itemsThisRun !== target) perAreaViolations++;
  }
  for (const id of askedOrder) drawCounts.set(id, (drawCounts.get(id) ?? 0) + 1);

  // Did the weak area actually surface as weak (missed at least one of its items)?
  if ((correctByArea.get(weakArea) ?? 0) < targetItemsForArea(BANK_SHAPE[weakArea]!)) weakFlagged++;
  if ((correctByArea.get(weakArea) ?? 0) === 0) weakZeroed++;
  for (const area of areas) {
    if (area === weakArea) continue;
    strongChecked++;
    if ((correctByArea.get(area) ?? 0) < targetItemsForArea(BANK_SHAPE[area]!)) strongFalseFlags++;
    if ((correctByArea.get(area) ?? 0) === 0) strongZeroed++;
  }

  if (u === 0) console.log(`Sample run: ${totalItems} items, stopReason=${stopReason}`);
}

// Spread: within the fattest area, how much of the pool did repeated runs actually reach?
const opsIds = questions.filter((q) => q.kpi_area === 'Operations').map((q) => q.id);
const opsTouched = opsIds.filter((id) => (drawCounts.get(id) ?? 0) > 0).length;

const thinArea = 'Quality Management';
const thinConfidence = confidencePct(rdFloorForPoolSize(BANK_SHAPE[thinArea]!));

console.log(`\nUsers simulated: ${NUM_USERS}`);
console.log(`Areas: ${areas.length} · planned run length: ${expectedLength} items (${ITEMS_PER_AREA} per area)`);
console.log(`Runs with wrong total length: ${lengthViolations}/${NUM_USERS}`);
console.log(`Runs not ending in stopReason='complete': ${wrongStopReason}/${NUM_USERS}`);
console.log(`Runs containing a repeated question: ${repeatViolations}/${NUM_USERS}`);
console.log(`Per-area item-count violations: ${perAreaViolations}/${NUM_USERS * areas.length}`);
console.log(`\nWeak area correctly flagged: ${weakFlagged}/${NUM_USERS} (${((100 * weakFlagged) / NUM_USERS).toFixed(0)}%)`);
console.log(
  `Strong areas false-flagged as weak: ${strongFalseFlags}/${strongChecked} (${((100 * strongFalseFlags) / strongChecked).toFixed(0)}%)`
);
console.log(
  `  -- "missed at least one of 2" is a noisy signal at this test length; the sharper tier:`
);
console.log(`  weak area scoring 0 of 2:   ${((100 * weakZeroed) / NUM_USERS).toFixed(0)}%`);
console.log(`  strong area scoring 0 of 2: ${((100 * strongZeroed) / strongChecked).toFixed(0)}%`);
console.log(`\nOperations pool reached over ${NUM_USERS} runs: ${opsTouched}/${opsIds.length} distinct questions`);
console.log(`Thin area "${thinArea}" (${BANK_SHAPE[thinArea]} questions) confidence ceiling: ${thinConfidence}%`);

// Spread gate: without the tie-shuffle in selectNextDiagnosticItem every run would draw from
// the same CANDIDATE_WINDOW=5 head of the array, so this would sit near 5/47 (11%).
const SPREAD_FLOOR = 0.6;

const pass =
  lengthViolations === 0 &&
  wrongStopReason === 0 &&
  repeatViolations === 0 &&
  perAreaViolations === 0 &&
  weakZeroed / NUM_USERS >= 0.7 && // a real weakness shows up as 0 of 2
  strongZeroed / strongChecked <= 0.3 && // and a strong area rarely does
  opsTouched >= opsIds.length * SPREAD_FLOOR &&
  thinConfidence < 90;

console.log(pass ? '\nPASS' : '\nFAIL');
if (!pass) process.exitCode = 1;
