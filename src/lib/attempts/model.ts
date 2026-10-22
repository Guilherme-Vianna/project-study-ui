import { REVIEWS_PATH } from "@/lib/auth/constants";
import { LIMITS, parseHours, type ExerciseType } from "@/lib/exercises/model";

export type ReviewStatus = "pending" | "approved" | "rejected";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Aguardando correção",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

export const FEEDBACK_LIMIT = 20000;

export type AttemptDraft = { answerText: string; selectedOptionIds: string[]; spentHours: string };

export type AttemptPayload = { answer_text?: string; selected_option_ids?: string[]; spent_hours?: number };

export type AttemptErrors = { answer?: string; options?: string; hours?: string };

export function hasAttemptErrors(errors: AttemptErrors) {
  return Object.values(errors).some(Boolean);
}

export function validateAttempt(draft: AttemptDraft, exercise: { type: ExerciseType; estimatedHours: number | null }): AttemptErrors {
  const errors: AttemptErrors = {};
  if (exercise.type === "open_answer") {
    const text = draft.answerText.trim();
    if (!text) errors.answer = "Escreva sua resposta.";
    else if (text.length > LIMITS.text) errors.answer = `Use até ${LIMITS.text} caracteres.`;
  } else if (draft.selectedOptionIds.length === 0) {
    errors.options = "Escolha pelo menos uma alternativa.";
  }
  const hours = parseHours(draft.spentHours);
  if (hours === undefined) errors.hours = "Use só números, como 1 ou 0,5.";
  else if (hours === null) {
    if (exercise.estimatedHours === null) errors.hours = "Informe quanto tempo você estudou.";
  } else if (hours <= 0 || hours > LIMITS.hours) errors.hours = `Informe um tempo entre 0,01 e ${LIMITS.hours} horas.`;
  return errors;
}

export function toAttemptPayload(draft: AttemptDraft, type: ExerciseType): AttemptPayload {
  const hours = parseHours(draft.spentHours);
  return {
    ...(type === "open_answer" ? { answer_text: draft.answerText.trim() } : { selected_option_ids: [...new Set(draft.selectedOptionIds)] }),
    ...(typeof hours === "number" ? { spent_hours: hours } : {}),
  };
}

export type StatusFilter = ReviewStatus | "all";

export const STATUS_PARAMS: Record<StatusFilter, string> = {
  pending: "pendentes",
  approved: "aprovadas",
  rejected: "rejeitadas",
  all: "todas",
};

export function statusFromParam(value: unknown): StatusFilter {
  const found = (Object.keys(STATUS_PARAMS) as StatusFilter[]).find((status) => STATUS_PARAMS[status] === value);
  return found ?? "pending";
}

export function reviewsHref({
  status = "pending",
  studentId,
  exerciseId,
  page,
}: {
  status?: StatusFilter;
  studentId?: string;
  exerciseId?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", STATUS_PARAMS[status]);
  if (studentId) params.set("aluno", studentId);
  if (exerciseId) params.set("exercicio", exerciseId);
  if (page && page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `${REVIEWS_PATH}?${query}` : REVIEWS_PATH;
}
