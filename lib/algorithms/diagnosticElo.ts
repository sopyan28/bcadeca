import { weightedSampleWithoutReplacement } from './questionPool';
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

export const HARD_CAP_ITEMS = 40;
export const SOFT_CAP_ITEMS = 30;
const MIN_ITEMS_OVERALL_FOR_CONVERGENCE = 20;
const MIN_ITEMS_PER_AREA_FLOOR = 2;
const CONVERGENCE_RD_THRESHOLD = 80;
const CANDIDATE_WINDOW = 5; // nearest-difficulty candidates to weight-sample from, avoids deterministic reuse of "the" closest item

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
 * Picks the next item: any area under the 2-item-this-run floor takes absolute priority
 * (guarantees every KPI area gets covered even in a short run); otherwise the least-precise
 * area (highest rd) goes next. Within the chosen area, ranks unused questions by closeness
 * to the current ability estimate and weight-samples among the nearest few (rather than
 * always asking the single closest item) so a stable ability estimate doesn't keep drawing
 * the exact same question every run.
 */
export function selectNextDiagnosticItem<Q extends QuestionRow>(
  areas: DiagnosticAreaState[],
  questionsByArea: Map<string, Q[]>,
  askedQuestionIds: Set<string>
): { kpiArea: string; question: Q } | null {
  const eligibleAreas = areas.filter((a) => {
    const remaining = (questionsByArea.get(a.kpiArea) ?? []).filter((q) => !askedQuestionIds.has(q.id));
    return remaining.length > 0;
  });
  if (eligibleAreas.length === 0) return null;

  const underFloor = eligibleAreas.filter((a) => a.itemsThisRun < MIN_ITEMS_PER_AREA_FLOOR);
  const candidatePool = underFloor.length > 0 ? underFloor : eligibleAreas;

  candidatePool.sort((a, b) => {
    if (underFloor.length > 0) {
      if (a.itemsThisRun !== b.itemsThisRun) return a.itemsThisRun - b.itemsThisRun;
    } else if (a.rd !== b.rd) {
      return b.rd - a.rd; // highest rd (least precise) first
    }
    return Math.random() - 0.5;
  });

  const chosenArea = candidatePool[0]!;
  const remaining = (questionsByArea.get(chosenArea.kpiArea) ?? []).filter((q) => !askedQuestionIds.has(q.id));
  const byCloseness = remaining
    .slice()
    .sort((a, b) => Math.abs(a.difficulty_rating - chosenArea.rating) - Math.abs(b.difficulty_rating - chosenArea.rating));
  const window = byCloseness.slice(0, CANDIDATE_WINDOW);
  const [picked] = weightedSampleWithoutReplacement(window, (q) => 1 / (1 + q.exposure_count), 1);

  return picked ? { kpiArea: chosenArea.kpiArea, question: picked } : null;
}

export type StopReason = 'converged' | 'soft_cap' | 'hard_cap' | null;

/**
 * Stopping rule, checked after every answer: hard cap always wins (bounds worst-case test
 * length); otherwise stop once every area has hit the 2-item floor and is either precise
 * enough (rd <= 80) or fully exhausted (no more distinct questions left), and at least 20
 * items have been asked overall; otherwise a 30-item soft cap fires regardless so one
 * stubborn area can never hold the whole test hostage.
 */
export function checkStop<Q extends QuestionRow>(
  areas: DiagnosticAreaState[],
  questionsByArea: Map<string, Q[]>,
  totalItemsThisRun: number
): StopReason {
  if (totalItemsThisRun >= HARD_CAP_ITEMS) return 'hard_cap';

  const allAreasReady = areas.every((a) => {
    if (a.itemsThisRun < MIN_ITEMS_PER_AREA_FLOOR) return false;
    const poolSize = (questionsByArea.get(a.kpiArea) ?? []).length;
    const exhausted = a.itemsThisRun >= poolSize;
    return a.rd <= CONVERGENCE_RD_THRESHOLD || exhausted;
  });

  if (allAreasReady && totalItemsThisRun >= MIN_ITEMS_OVERALL_FOR_CONVERGENCE) return 'converged';
  if (totalItemsThisRun >= SOFT_CAP_ITEMS) return 'soft_cap';
  return null;
}
