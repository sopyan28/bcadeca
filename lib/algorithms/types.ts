export interface QuestionRow {
  id: string;
  kpi_area: string;
  cluster: string;
  difficulty_rating: number;
  exposure_count: number;
}

export interface AttemptRow {
  question_id: string;
  kpi_area: string;
  is_correct: boolean;
  created_at: string; // ISO
}
