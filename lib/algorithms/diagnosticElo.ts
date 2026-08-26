import { shuffle, weightedSampleWithoutReplacement } from './questionPool';
import type { QuestionRow } from './types';

/**
 * Adaptive diagnostic engine: an Elo/matchmaking-style computerized-adaptive-test (CAT).
 * Each question carries a difficulty rating; each user carries a per-KPI-area ability rating.
 * Both update after every answer via the standard Elo formula. This self-calibrates question
 * difficulty from real answer data over time, unlike a fixed/hand-tuned difficulty tag, and
 * needs no pre-collected large item bank to bootstrap (unlike full IRT/3PL) — important since
 * the question bank starts at ~18 items and grows from there. See implementation plan Part E.
 */

export const INITIAL_ABILITY = 1500;
export const INITIAL_RD = 350;
export const RD_FLOOR_MIN = 30;
const RD_DECAY_PER_ITEM = 0.75;

/**
 * The diagnostic is a fixed-form test: every KPI area contributes exactly this many items,
 * so a run is `areas x ITEMS_PER_AREA` questions long and each area finishes with a directly
 * comparable score. Areas the member misses items in are what the results page reports back
 * as weak areas, so the count is deliberately the same for every area -- an adaptive length
 * would make "2 wrong" mean different things in different areas.
 */
export const ITEMS_PER_AREA = 2;

/** Absolute safety bound so a malformed bank can't produce an unbounded run. */
export const HARD_CAP_ITEMS = 200;

const CANDIDATE_WINDOW = 5; // nearest-difficulty candidates to weight-sample from, avoids deterministic reuse of "the" closest item

/** An area with a thin pool contributes everything it has rather than blocking the run. */
export function targetItemsForArea(poolSize: number): number {
  return Math.min(ITEMS_PER_AREA, poolSize);
}

export function expectedScore(ability: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (difficulty - ability) / 400));
}

/** Fast early convergence per area, stable once enough lifetime data exists in it. */
export function kUserFactor(itemsAnsweredLifetimeInArea: number): number {
  if (itemsAnsweredLifetimeInArea < 5) return 64;
  if (itemsAnsweredLifetimeInArea < 15) return 32;
  return 16;
}

/** New/rarely-seen questions calibrate fast; well-established ones (60+ exposures) nearly freeze. */
export function kQuestionFactor(exposureCount: number): number {
  return Math.max(4, 16 - exposureCount / 5);
}

/**
 * Cold-start safety valve: an area backed by only 1-2 questions can never legitimately claim
 * high confidence, no matter how many times those same questions are re-asked. The floor
 * scales down automatically as more questions are added to an area — no algorithm change
 * needed as the bank grows.
 */
export function rdFloorForPoolSize(poolSize: number): number {
  return Math.max(RD_FLOOR_MIN, 350 / Math.sqrt(Math.max(poolSize, 1)));
}

export function masteryPct(ability: number): number {
  return Math.round(100 / (1 + Math.pow(10, (1500 - ability) / 400)));
}

export function confidencePct(rd: number): number {
  const pct = 100 * (1 - (rd - RD_FLOOR_MIN) / (INITIAL_RD - RD_FLOOR_MIN));
  return Math.round(Math.min(100, Math.max(0, pct)));
}

export interface EloUpdateInput {
  abilityBefore: number;
  rdBefore: number;
  itemsAnsweredLifetimeInArea: number; // count BEFORE this item, drives K_user tier
  poolSizeInArea: number;
  questionDifficultyBefore: number;
  questionExposureCountBefore: number;
  correct: boolean;
}

export interface EloUpdateResult {
  abilityAfter: number;
  rdAfter: number;
  difficultyAfter: number;
}

export function applyEloUpdate(input: EloUpdateInput): EloUpdateResult {
  const s = input.correct ? 1 : 0;
  const e = expectedScore(input.abilityBefore, input.questionDifficultyBefore);

  const kUser = kUserFactor(input.itemsAnsweredLifetimeInArea);
  const kQuestion = kQuestionFactor(input.questionExposureCountBefore);

  const abilityAfter = input.abilityBefore + kUser * (s - e);
  const difficultyAfter = input.questionDifficultyBefore - kQuestion * (s - e);

  const floor = rdFloorForPoolSize(input.poolSizeInArea);
  const rdAfter = Math.max(floor, input.rdBefore * RD_DECAY_PER_ITEM);

  return { abilityAfter, rdAfter, difficultyAfter };
}

export interface DiagnosticAreaState {
  kpiArea: string;
  rating: number;
  rd: number;
  itemsAnsweredLifetime: number; // from user_kpi_ability.items_answered, persists across runs
  itemsThisRun: number;
}

/**
 * Picks the next item: the least-covered area that still owes items this run goes next, so
 * coverage fans out evenly instead of finishing one area before starting the next. Within the
 * chosen area, ranks unused questions by closeness to the current ability estimate and
 * weight-samples among the nearest few (rather than always asking the single closest item)
 * so a stable ability estimate doesn't keep drawing the exact same question every run.
 *
 * Returns null once every area has met its target -- that is what ends a fixed-form run.
 */
export function selectNextDiagnosticItem<Q extends QuestionRow>(
  areas: DiagnosticAreaState[],
  questionsByArea: Map<string, Q[]>,
  askedQuestionIds: Set<string>
): { kpiArea: string; question: Q } | null {
  const owing = areas.filter((a) => {
    const pool = questionsByArea.get(a.kpiArea) ?? [];
    const remaining = pool.filter((q) => !askedQuestionIds.has(q.id));
    return remaining.length > 0 && a.itemsThisRun < targetItemsForArea(pool.length);
  });
  if (owing.length === 0) return null;

  const candidatePool = shuffle(owing).sort((a, b) => a.itemsThisRun - b.itemsThisRun);

  const chosenArea = candidatePool[0]!;
  const remaining = (questionsByArea.get(chosenArea.kpiArea) ?? []).filter((q) => !askedQuestionIds.has(q.id));
  // Shuffle before the (stable) sort so questions tied on difficulty rotate fairly. Every
  // imported question starts at the same 1500 rating, so without this the "nearest" window
  // would just be the first CANDIDATE_WINDOW questions in array order every single run --
  // the rest of a 46-question area would never be drawn until ratings diverged.
  const byCloseness = shuffle(remaining).sort(
    (a, b) => Math.abs(a.difficulty_rating - chosenArea.rating) - Math.abs(b.difficulty_rating - chosenArea.rating)
  );
  const window = byCloseness.slice(0, CANDIDATE_WINDOW);
  const [picked] = weightedSampleWithoutReplacement(window, (q) => 1 / (1 + q.exposure_count), 1);

  return picked ? { kpiArea: chosenArea.kpiArea, question: picked } : null;
}

export type StopReason = 'complete' | 'hard_cap' | null;

/**
 * Stopping rule, checked before each item: the run ends when every area has been asked its
 * full target (`targetItemsForArea`), which for a healthy bank means exactly
 * `areas x ITEMS_PER_AREA` questions. The hard cap is a safety bound only -- it should never
 * fire in normal operation.
 */
export function checkStop<Q extends QuestionRow>(
  areas: DiagnosticAreaState[],
  questionsByArea: Map<string, Q[]>,
  totalItemsThisRun: number
): StopReason {
  if (totalItemsThisRun >= HARD_CAP_ITEMS) return 'hard_cap';

  const allAreasDone = areas.every((a) => {
    const poolSize = (questionsByArea.get(a.kpiArea) ?? []).length;
    return a.itemsThisRun >= targetItemsForArea(poolSize);
  });

  return allAreasDone ? 'complete' : null;
}

export type AreaTier = 'focus' | 'shaky' | 'solid';

/**
 * Buckets a finished area by raw score. Splitting "missed everything" from "missed one"
 * matters at this test length: scripts/sim-diagnostic.ts shows a capable member still misses
 * at least one of an area's two items ~66% of the time, so a flat "any miss = weak" would
 * mark most of their strong areas weak. Scoring 0 of 2 is the sharp signal -- it shows up for
 * ~88% of genuinely weak areas and only ~16% of strong ones.
 */
export function areaTier(r: { items_correct: number; items_in_area: number }): AreaTier {
  if (r.items_correct === 0) return 'focus';
  return r.items_correct < r.items_in_area ? 'shaky' : 'solid';
}

/** Total length of a fixed-form run over this bank -- drives the runner's progress display. */
export function plannedItemCount<Q extends QuestionRow>(questionsByArea: Map<string, Q[]>): number {
  let total = 0;
  for (const pool of questionsByArea.values()) total += targetItemsForArea(pool.length);
  return total;
}
