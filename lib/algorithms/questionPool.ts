import type { AttemptRow, QuestionRow } from './types';

const CORRECT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const CORRECT_COOLDOWN_RELAXED_MS = 3 * 24 * 60 * 60 * 1000; // 3 days, fallback when a pool is too thin
const WRONG_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h — misses resurface fast for reinforcement

/**
 * Efraimidis-Spirakis weighted sampling without replacement: give every candidate a key of
 * -ln(U)/weight (U ~ Uniform(0,1)), then take the k smallest keys. This is equivalent to
 * running k independent weighted races and is O(n log n) instead of the O(n*k) naive
 * "pick, remove, renormalize, repeat" approach. Zero/negative weights are floored to a tiny
 * epsilon so every candidate still has a chance rather than a division/log error.
 */
export function weightedSampleWithoutReplacement<T>(items: T[], weightFn: (item: T) => number, k: number): T[] {
  if (k >= items.length) return shuffle(items.slice());
  const keyed = items.map((item) => {
    const w = Math.max(weightFn(item), 1e-9);
    const u = Math.max(Math.random(), 1e-12);
    return { item, key: -Math.log(u) / w };
  });
  keyed.sort((a, b) => a.key - b.key);
  return keyed.slice(0, k).map((x) => x.item);
}

export function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export interface ApportionGroup {
  key: string;
  weight: number;
  capacity: number;
}

/**
 * Largest-remainder (Hamilton) apportionment of `total` slots across groups proportional to
 * weight, capped by each group's capacity. Capped groups are removed and the remainder is
 * re-apportioned across the rest so no slots are silently dropped when one area's pool is thin.
 */
export function apportion(total: number, groups: ApportionGroup[]): Record<string, number> {
  const result: Record<string, number> = {};
  let remaining = total;
  let pool = groups.filter((g) => g.capacity > 0 && g.weight > 0);
  for (const g of groups) result[g.key] = 0;

  while (remaining > 0 && pool.length > 0) {
    const weightSum = pool.reduce((s, g) => s + g.weight, 0);
    if (weightSum <= 0) break;

    const raw = pool.map((g) => ({ g, raw: (remaining * g.weight) / weightSum }));
    let used = 0;
    for (const { g, raw: r } of raw) {
      const floor = Math.min(Math.floor(r), g.capacity - result[g.key]!);
      result[g.key]! += floor;
      used += floor;
    }

    let leftover = remaining - used;
    // Shuffle before the (stable) sort so groups tied on the same remainder fraction rotate
    // fairly. Without this, ties resolve by array order every call, so with more groups than
    // slots the same few areas win every session and the rest are never drawn at all.
    const remainders = shuffle(
      raw
        .map(({ g, raw: r }) => ({ g, frac: r - Math.floor(r) }))
        .filter(({ g }) => result[g.key]! < g.capacity)
    ).sort((a, b) => b.frac - a.frac);

    for (const { g } of remainders) {
      if (leftover <= 0) break;
      if (result[g.key]! < g.capacity) {
        result[g.key]! += 1;
        leftover -= 1;
      }
    }

    remaining = leftover;
    pool = pool.filter((g) => result[g.key]! < g.capacity);
    if (used === 0 && leftover === remaining) break; // no capacity left anywhere, avoid infinite loop
  }

  return result;
}

export interface CooldownFilterResult {
  eligible: QuestionRow[];
  degraded: boolean;
}

/**
 * Excludes recently-correct (14d) and very-recently-wrong (24h) questions for this user.
 * If that leaves too few candidates for the requested count, progressively relaxes the
 * correct-answer cooldown (14d -> 3d -> none) rather than failing the session outright,
 * flagging `degraded` so it can be logged as a signal that this area's bank is too thin.
 */
export function filterByCooldown(
  candidates: QuestionRow[],
  attempts: AttemptRow[],
  neededCount: number,
  now = Date.now()
): CooldownFilterResult {
  const lastCorrectByQuestion = new Map<string, number>();
  const lastWrongByQuestion = new Map<string, number>();
  for (const a of attempts) {
    const t = new Date(a.created_at).getTime();
    if (a.is_correct) {
      const prev = lastCorrectByQuestion.get(a.question_id);
      if (prev === undefined || t > prev) lastCorrectByQuestion.set(a.question_id, t);
    } else {
      const prev = lastWrongByQuestion.get(a.question_id);
      if (prev === undefined || t > prev) lastWrongByQuestion.set(a.question_id, t);
    }
  }

  const withinCooldown = (q: QuestionRow, correctCooldownMs: number) => {
    const lastCorrect = lastCorrectByQuestion.get(q.id);
    const lastWrong = lastWrongByQuestion.get(q.id);
    if (lastCorrect !== undefined && now - lastCorrect < correctCooldownMs) return true;
    if (lastWrong !== undefined && now - lastWrong < WRONG_COOLDOWN_MS) return true;
    return false;
  };

  let eligible = candidates.filter((q) => !withinCooldown(q, CORRECT_COOLDOWN_MS));
  if (eligible.length >= neededCount) return { eligible, degraded: false };

  eligible = candidates.filter((q) => !withinCooldown(q, CORRECT_COOLDOWN_RELAXED_MS));
  if (eligible.length >= neededCount) return { eligible, degraded: true };

  return { eligible: candidates.slice(), degraded: true };
}

export function rollingAccuracy(attempts: AttemptRow[], area: string): number {
  const inArea = attempts.filter((a) => a.kpi_area === area);
  if (inArea.length === 0) return 50; // neutral prior for an area with no data yet
  const correct = inArea.filter((a) => a.is_correct).length;
  return Math.round((100 * correct) / inArea.length);
}
