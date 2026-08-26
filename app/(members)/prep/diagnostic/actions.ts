'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  checkStop,
  plannedItemCount,
  selectNextDiagnosticItem,
  INITIAL_ABILITY,
  INITIAL_RD,
  type DiagnosticAreaState,
} from '@/lib/algorithms/diagnosticElo';
import type { QuestionRow } from '@/lib/algorithms/types';

async function loadAreaStates(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, runId: string) {
  const [{ data: questionRows }, { data: abilityRows }, { data: runItems }] = await Promise.all([
    supabase.from('questions_public').select('id, kpi_area, cluster, difficulty_rating, exposure_count'),
    supabase.from('user_kpi_ability').select('kpi_area, rating, rd, items_answered').eq('user_id', userId),
    supabase.from('diagnostic_items').select('kpi_area, question_id').eq('run_id', runId),
  ]);

  const questionsByArea = new Map<string, QuestionRow[]>();
  for (const q of questionRows ?? []) {
    const list = questionsByArea.get(q.kpi_area) ?? [];
    list.push({ id: q.id, kpi_area: q.kpi_area, cluster: q.cluster, difficulty_rating: q.difficulty_rating, exposure_count: q.exposure_count });
    questionsByArea.set(q.kpi_area, list);
  }

  const abilityByArea = new Map((abilityRows ?? []).map((a) => [a.kpi_area, a]));
  const itemsThisRunByArea = new Map<string, number>();
  const askedQuestionIds = new Set<string>();
  for (const item of runItems ?? []) {
    itemsThisRunByArea.set(item.kpi_area, (itemsThisRunByArea.get(item.kpi_area) ?? 0) + 1);
    askedQuestionIds.add(item.question_id);
  }

  const areas: DiagnosticAreaState[] = Array.from(questionsByArea.keys()).map((kpiArea) => {
    const ability = abilityByArea.get(kpiArea);
    return {
      kpiArea,
      rating: ability?.rating ?? INITIAL_ABILITY,
      rd: ability?.rd ?? INITIAL_RD,
      itemsAnsweredLifetime: ability?.items_answered ?? 0,
      itemsThisRun: itemsThisRunByArea.get(kpiArea) ?? 0,
    };
  });

  return { areas, questionsByArea, askedQuestionIds, totalItemsThisRun: runItems?.length ?? 0 };
}

export async function startDiagnosticRun() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: runId, error } = await supabase.rpc('start_diagnostic_run');
  if (error || !runId) throw new Error(error?.message ?? 'Could not start diagnostic run');

  redirect(`/prep/diagnostic/run/${runId}`);
}

export interface NextItemResult {
  done: boolean;
  stopReason?: string;
  question?: { id: string; question_text: string; choices: string[]; kpi_area: string };
  totalItemsThisRun?: number;
  areasCovered?: number;
  totalAreas?: number;
  /** Fixed-form run length (areas x ITEMS_PER_AREA), so the runner can show "Item 7 of 50". */
  plannedItemCount?: number;
}

export async function getNextDiagnosticItem(runId: string): Promise<NextItemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { areas, questionsByArea, askedQuestionIds, totalItemsThisRun } = await loadAreaStates(supabase, user.id, runId);

  const stopReason = checkStop(areas, questionsByArea, totalItemsThisRun);
  if (stopReason) {
    const { error } = await supabase.rpc('complete_diagnostic_run', { p_run_id: runId, p_stop_reason: stopReason });
    if (error) throw new Error(error.message);
    revalidatePath('/prep/diagnostic');
    return { done: true, stopReason };
  }

  const pick = selectNextDiagnosticItem(areas, questionsByArea, askedQuestionIds);
  if (!pick) {
    await supabase.rpc('complete_diagnostic_run', { p_run_id: runId, p_stop_reason: 'converged' });
    return { done: true, stopReason: 'converged' };
  }

  const { data: fullQuestion } = await supabase
    .from('questions_public')
    .select('id, question_text, choices, kpi_area')
    .eq('id', pick.question.id)
    .single();
  if (!fullQuestion) throw new Error('Question not found');

  return {
    done: false,
    question: fullQuestion,
    totalItemsThisRun,
    areasCovered: areas.filter((a) => a.itemsThisRun > 0).length,
    totalAreas: areas.length,
    plannedItemCount: plannedItemCount(questionsByArea),
  };
}

export interface DiagnosticAnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  abilityAfter: number;
  rdAfter: number;
}

export async function answerDiagnosticItem(runId: string, questionId: string, chosenIndex: number): Promise<DiagnosticAnswerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const [{ data: questionRow }, { data: run }] = await Promise.all([
    supabase.from('questions_public').select('kpi_area').eq('id', questionId).single(),
    supabase.from('diagnostic_runs').select('item_count').eq('id', runId).single(),
  ]);
  if (!questionRow) throw new Error('Question not found');

  const { data: areaAbility } = await supabase
    .from('user_kpi_ability')
    .select('rating, rd, items_answered')
    .eq('user_id', user.id)
    .eq('kpi_area', questionRow.kpi_area)
    .maybeSingle();

  const { data, error } = await supabase
    .rpc('record_diagnostic_item', {
      p_run_id: runId,
      p_question_id: questionId,
      p_chosen_index: chosenIndex,
      p_seq_index: run?.item_count ?? 0,
      p_ability_before: areaAbility?.rating ?? INITIAL_ABILITY,
      p_rd_before: areaAbility?.rd ?? INITIAL_RD,
      p_items_answered_lifetime_in_area: areaAbility?.items_answered ?? 0,
    })
    .returns<RecordDiagnosticItemRow[]>()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not grade answer');

  return {
    isCorrect: data.is_correct,
    correctIndex: data.correct_index,
    explanation: data.explanation,
    abilityAfter: data.ability_after,
    rdAfter: data.rd_after,
  };
}

/** Return shape of the record_diagnostic_item RPC (supabase/migrations/0002_rpcs.sql). */
interface RecordDiagnosticItemRow {
  is_correct: boolean;
  correct_index: number;
  explanation: string;
  ability_after: number;
  rd_after: number;
}

export interface DiagnosticResultRow {
  kpi_area: string;
  mastery_pct: number;
  confidence_pct: number;
  items_in_area: number;
  items_correct: number;
  low_data: boolean;
}

export async function getDiagnosticResults(runId: string): Promise<DiagnosticResultRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('diagnostic_results')
    .select('kpi_area, mastery_pct, confidence_pct, items_in_area, items_correct, low_data')
    .eq('run_id', runId)
    .order('kpi_area');
  return data ?? [];
}

// areaTier() lives in lib/algorithms/diagnosticElo.ts -- a 'use server' module may only
// export async functions, and it is scoring logic rather than a server action.
