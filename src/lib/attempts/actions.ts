"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { reviewAttempt, submitAttempt } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import type { ExerciseType } from "@/lib/exercises/model";
import {
  FEEDBACK_LIMIT,
  hasAttemptErrors,
  toAttemptPayload,
  validateAttempt,
  type AttemptDraft,
  type AttemptErrors,
  type ReviewStatus,
} from "./model";

export type SubmitAttemptResult = { ok: true } | { ok: false; errors: AttemptErrors; formError: string | null };
export type ReviewResult = { ok: true } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

export async function submitAttemptAction(
  exerciseId: string,
  exercise: { type: ExerciseType; estimatedHours: number | null },
  draft: AttemptDraft,
): Promise<SubmitAttemptResult> {
  await requireSession();
  const errors = validateAttempt(draft, exercise);
  if (hasAttemptErrors(errors)) return { ok: false, errors, formError: "Revise os campos destacados." };
  try {
    await submitAttempt(exerciseId, toAttemptPayload(draft, exercise.type));
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(LOGIN_PATH);
      const detail = typeof error.detail === "string" ? error.detail : "";
      if (error.status === 409) {
        return { ok: false, errors: {}, formError: "Você já respondeu este exercício de múltipla escolha neste plano. Veja o resultado abaixo." };
      }
      if (error.status === 404) {
        return { ok: false, errors: {}, formError: "Este exercício não está mais no seu plano. Volte para a lista de exercícios." };
      }
      if (error.status === 422 && detail.startsWith("spent_hours")) {
        return { ok: false, errors: { hours: "Informe quanto tempo você estudou." }, formError: null };
      }
      if (error.status === 422 && detail.startsWith("Unknown options")) {
        return { ok: false, errors: {}, formError: "As alternativas mudaram. Atualize a página e responda de novo." };
      }
      if (error.status === 422) return { ok: false, errors: {}, formError: "Sua resposta não foi aceita. Revise e tente de novo." };
    }
    return { ok: false, errors: {}, formError: "Não foi possível enviar agora. Sua resposta continua aqui; tente de novo." };
  }
  refresh();
  return { ok: true };
}

export async function reviewAttemptAction(attemptId: string, status: ReviewStatus, feedback: string): Promise<ReviewResult> {
  await requireSession();
  const trimmed = feedback.trim();
  if (trimmed.length > FEEDBACK_LIMIT) return { ok: false, error: `O comentário pode ter até ${FEEDBACK_LIMIT} caracteres.` };
  try {
    await reviewAttempt(attemptId, status, trimmed || null);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(LOGIN_PATH);
      if (error.status === 404) return { ok: false, error: "Esta resposta não está mais disponível. Volte para a lista." };
      if (error.status === 422) return { ok: false, error: "A correção não foi aceita. Revise o comentário e tente de novo." };
    }
    return { ok: false, error: "Não foi possível salvar a correção agora. Seu comentário continua aqui; tente de novo." };
  }
  refresh();
  return { ok: true };
}
