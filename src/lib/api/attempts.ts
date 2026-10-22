import "server-only";
import type { AttemptPayload, ReviewStatus } from "@/lib/attempts/model";
import type { ExerciseType } from "@/lib/exercises/model";
import { apiFetch, fetchAll, queryString, type Page } from "./client";
import type { ImageRead } from "./exercises";
import type { SkillSummary } from "./skills";

export type StudentExercise = {
  id: string;
  type: ExerciseType;
  title: string;
  statement: string | null;
  estimated_hours: number | null;
  subjects: { id: string; name: string }[];
  skills: SkillSummary[];
  images: { placement: "statement" | "attachment"; position: number; image: ImageRead }[];
  options: { id: string; position: number; text: string | null; image: ImageRead | null }[];
};

export type StudentExerciseEntry = {
  exercise: StudentExercise;
  attempts_count: number;
  last_attempt_at: string | null;
  locked: boolean;
};

export type Attempt = {
  id: string;
  assignment_id: string;
  student_id: string;
  exercise_id: string;
  exercise_type: ExerciseType;
  answer_text: string | null;
  selected_option_ids: string[];
  correct_option_ids: string[];
  is_correct: boolean | null;
  hours: number;
  submitted_at: string;
  review_status: ReviewStatus;
  feedback: string | null;
  reviewed_at: string | null;
};

export type AttemptFilters = {
  assignment_id?: string;
  student_id?: string;
  exercise_id?: string;
  review_status?: ReviewStatus;
};

const studentPlan = "/students/me/study-plan";

export function listPlanExercises() {
  return fetchAll<StudentExerciseEntry>(`${studentPlan}/exercises`);
}

export function getPlanExercise(exerciseId: string) {
  return apiFetch<StudentExerciseEntry>(`${studentPlan}/exercises/${encodeURIComponent(exerciseId)}`);
}

export function submitAttempt(exerciseId: string, payload: AttemptPayload) {
  return apiFetch<Attempt>(`${studentPlan}/exercises/${encodeURIComponent(exerciseId)}/attempts`, { method: "POST", json: payload });
}

export function listMyAttempts(exerciseId?: string) {
  return fetchAll<Attempt>(`${studentPlan}/attempts${queryString({ exercise_id: exerciseId })}`);
}

export function listAttempts(filters: AttemptFilters, { offset = 0, limit = 50 }: { offset?: number; limit?: number } = {}) {
  return apiFetch<Page<Attempt>>(`/attempts${queryString({ ...filters, offset, limit })}`);
}

export function getAttempt(attemptId: string) {
  return apiFetch<Attempt>(`/attempts/${encodeURIComponent(attemptId)}`);
}

export function reviewAttempt(attemptId: string, reviewStatus: ReviewStatus, feedback: string | null) {
  return apiFetch<Attempt>(`/attempts/${encodeURIComponent(attemptId)}/review`, {
    method: "PUT",
    json: feedback ? { review_status: reviewStatus, feedback } : { review_status: reviewStatus },
  });
}
