import "server-only";
import type { ExercisePayload, ExerciseType, ImagePlacement } from "@/lib/exercises/model";
import { apiFetch, fetchAll } from "./client";

export type ImageRead = {
  id: string;
  object_name: string;
  content_type: string;
  size_bytes: number;
  original_filename: string | null;
  created_at: string;
  url: string | null;
};

export type Exercise = {
  id: string;
  type: ExerciseType;
  title: string;
  statement: string | null;
  expected_answer: string | null;
  estimated_hours: number | null;
  subjects: { id: string; name: string }[];
  images: { placement: ImagePlacement; position: number; image: ImageRead }[];
  options: { id: string; position: number; text: string | null; is_correct: boolean; image: ImageRead | null }[];
  created_at: string;
  updated_at: string;
};

export function listMyExercises() {
  return fetchAll<Exercise>("/exercises");
}

export function getExercise(exerciseId: string) {
  return apiFetch<Exercise>(`/exercises/${encodeURIComponent(exerciseId)}`);
}

export function createExercise(payload: ExercisePayload) {
  return apiFetch<Exercise>("/exercises", { method: "POST", json: payload });
}

export function replaceExercise(exerciseId: string, payload: ExercisePayload) {
  return apiFetch<Exercise>(`/exercises/${encodeURIComponent(exerciseId)}`, { method: "PUT", json: payload });
}

export function deleteExercise(exerciseId: string) {
  return apiFetch<void>(`/exercises/${encodeURIComponent(exerciseId)}`, { method: "DELETE" });
}
