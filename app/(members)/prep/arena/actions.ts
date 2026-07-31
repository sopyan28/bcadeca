'use server';

import { createClient } from '@/lib/supabase/server';
import { selectPracticeSession, type PracticeMode } from '@/lib/algorithms/practiceSelection';
import type { AttemptRow, QuestionRow } from '@/lib/algorithms/types';
import { revalidatePath } from 'next/cache';

const SESSION_SIZE = 8;
const XP_PER_QUESTION = 12;

export interface StartSessionResult {
  sessionId: string;
  questions: { id: string; question_text: string; choices: string[]; kpi_area: string; cluster: string }[];
  degraded: boolean;
}

export async function startPracticeSession(mode: PracticeMode, clusterFilter?: string | null): Promise<StartSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const [{ data: questionRows }, { data: attemptRows }] = await Promise.all([
    supabase.from('questions_public').select('id, kpi_area, cluster, difficulty_rating, exposure_count'),
    supabase.from('attempts').select('question_id, kpi_area, is_correct, created_at').eq('user_id', user.id),
  ]);

  const questions: QuestionRow[] = (questionRows ?? []).map((q) => ({
    id: q.id,
    kpi_area: q.kpi_area,
    cluster: q.cluster,
    difficulty_rating: q.difficulty_rating,
    exposure_count: q.exposure_count,
  }));
  const attempts: AttemptRow[] = (attemptRows ?? []).map((a) => ({
    question_id: a.question_id,
    kpi_area: a.kpi_area,
    is_correct: a.is_correct,
    created_at: a.created_at,
  }));

  const result = selectPracticeSession({ mode, sessionSize: SESSION_SIZE, clusterFilter, questions, attempts });
  if (result.questionIds.length === 0) {
    throw new Error(mode === 'weakness' ? "No missed areas yet -- you haven't gotten anything wrong!" : 'No questions available.');
  }

  const { data: fullQuestions } = await supabase
    .from('questions_public')
    .select('id, question_text, choices, kpi_area, cluster')
    .in('id', result.questionIds);

  const ordered = result.questionIds
    .map((id) => fullQuestions?.find((q) => q.id === id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      mode,
      cluster_filter: clusterFilter ?? null,
      question_ids: result.questionIds,
      degraded: result.degraded,
    })
    .select('id')
    .single();

  if (error || !session) throw new Error(error?.message ?? 'Could not start session');

  return { sessionId: session.id, questions: ordered, degraded: result.degraded };
}

export interface AnswerResult {
  isCorrect: boolean;
  xpAwarded: number;
  ddAwarded: number;
  correctIndex: number;
  explanation: string;
}

/**
 * Row shapes returned by the `security definer` RPCs in supabase/migrations/0002_rpcs.sql.
 * Declared by hand because lib/supabase/database.types.ts is still a stub -- once
 * `npm run supabase:types` is run against the live schema these become redundant and the
 * generated Database types will enforce them automatically.
 */
interface RecordAttemptRow {
  is_correct: boolean;
  xp_awarded: number;
  dd_awarded: number;
  correct_index: number;
  explanation: string;
}

interface PurchaseItemRow {
  ok: boolean;
  message: string;
}

interface CompleteSessionRow {
  bonus_xp: number;
  bonus_dd: number;
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  chosenIndex: number,
  options?: { hintUsed?: boolean; doublePoints?: boolean }
): Promise<AnswerResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('record_attempt', {
      p_question_id: questionId,
      p_session_id: sessionId,
      p_chosen_index: chosenIndex,
      p_hint_used: options?.hintUsed ?? false,
      p_double_points: options?.doublePoints ?? false,
    })
    .returns<RecordAttemptRow[]>()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not grade answer');

  return {
    isCorrect: data.is_correct,
    xpAwarded: data.xp_awarded,
    ddAwarded: data.dd_awarded,
    correctIndex: data.correct_index,
    explanation: data.explanation,
  };
}

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

export async function purchaseItem(itemId: string): Promise<PurchaseResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('purchase_item', { p_item_id: itemId }).returns<PurchaseItemRow[]>().single();
  if (error || !data) throw new Error(error?.message ?? 'Could not complete purchase');

  revalidatePath('/prep/arena');
  revalidatePath('/prep/profile');
  return { ok: data.ok, message: data.message };
}

export async function equipItem(slot: string, itemId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (itemId === null) {
    const { error } = await supabase.from('user_equipped').delete().eq('user_id', user.id).eq('slot', slot);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('user_equipped').upsert({ user_id: user.id, slot, item_id: itemId });
    if (error) throw new Error(error.message);
  }

  revalidatePath('/prep/arena');
}

export async function finishPracticeSession(sessionId: string, questionCount: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('complete_session', {
      p_session_id: sessionId,
      p_base_xp_reward: XP_PER_QUESTION * questionCount,
      p_question_count: questionCount,
    })
    .returns<CompleteSessionRow[]>()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/prep/arena');
  revalidatePath('/prep/profile');
  revalidatePath('/');

  return { bonusXp: data?.bonus_xp ?? 0, bonusDd: data?.bonus_dd ?? 0 };
}
