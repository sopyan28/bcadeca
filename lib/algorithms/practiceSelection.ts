import { apportion, filterByCooldown, rollingAccuracy, weightedSampleWithoutReplacement } from './questionPool';
import type { AttemptRow, QuestionRow } from './types';

export type PracticeMode = 'quick' | 'cluster' | 'weakness';

export interface SelectPracticeSessionInput {
  mode: PracticeMode;
  sessionSize: number;
  clusterFilter?: string | null;
  questions: QuestionRow[];
  attempts: AttemptRow[]; // this user's full attempt history, used for cooldowns + weak-area detection
  now?: number;
}

export interface SelectPracticeSessionResult {
  questionIds: string[];
  degraded: boolean;
}

/**
 * Picks `sessionSize` questions for a practice session: stratifies slots across KPI areas
 * (proportional to bank composition, or toward weak areas in 'weakness' mode), then fills
 * each area's slots with an exposure-weighted sample so under-shown questions surface more
 * as the bank grows. See lib/algorithms/README-ish notes in the implementation plan, Part D.
 */
export function selectPracticeSession(input: SelectPracticeSessionInput): SelectPracticeSessionResult {
  const { mode, sessionSize, attempts } = input;
  const now = input.now ?? Date.now();

  let pool = input.questions;
  if (mode === 'cluster' && input.clusterFilter) {
    pool = pool.filter((q) => q.cluster === input.clusterFilter);
  }

  let areaWeight: (area: string) => number;
  if (mode === 'weakness') {
    const missedAreas = new Set(attempts.filter((a) => !a.is_correct).map((a) => a.kpi_area));
    pool = pool.filter((q) => missedAreas.has(q.kpi_area));
    areaWeight = (area) => 100 - rollingAccuracy(attempts, area) + 5;
  } else {
    const counts = new Map<string, number>();
    for (const q of pool) counts.set(q.kpi_area, (counts.get(q.kpi_area) ?? 0) + 1);
    areaWeight = (area) => counts.get(area) ?? 0;
  }

  if (pool.length === 0) return { questionIds: [], degraded: true };

  const byArea = new Map<string, QuestionRow[]>();
  for (const q of pool) {
    const list = byArea.get(q.kpi_area) ?? [];
    list.push(q);
    byArea.set(q.kpi_area, list);
  }

  const groups = Array.from(byArea.entries()).map(([area, qs]) => ({
    key: area,
    weight: areaWeight(area),
    capacity: qs.length,
  }));

  const slots = apportion(Math.min(sessionSize, pool.length), groups);

  let degraded = false;
  const selected: QuestionRow[] = [];
  for (const [area, k] of Object.entries(slots)) {
    if (k <= 0) continue;
    const candidates = byArea.get(area) ?? [];
    const { eligible, degraded: areaDegraded } = filterByCooldown(candidates, attempts, k, now);
    if (areaDegraded) degraded = true;
    const picked = weightedSampleWithoutReplacement(eligible, (q) => 1 / (1 + q.exposure_count), Math.min(k, eligible.length));
    selected.push(...picked);
  }

  return { questionIds: selected.map((q) => q.id), degraded };
}
