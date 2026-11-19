import { REVIEWS_PATH } from "@/lib/auth/constants";
import { LIMITS, parseHours, type ExerciseType } from "@/lib/exercises/model";

export type ReviewStatus = "pending" | "approved" | "rejected";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Aguardando correção",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

export const FEEDBACK_LIMIT = 20000;

export type AnswerDraft = { answerText: string; selectedOptionIds: string[] };

export type AttemptDraft = { answers: Record<string, AnswerDraft>; spentHours: string };

export type AttemptQuestion = { id: string; type: ExerciseType };

export type AnswerPayload = { question_id: string; answer_text?: string; selected_option_ids?: string[] };

export type AttemptPayload = { answers: AnswerPayload[]; spent_hours?: number };

export type AttemptErrors = { answers?: Record<string, string>; hours?: string };

export type AttemptTarget = { packageId: string | null };

export function emptyAnswer(): AnswerDraft {
  return { answerText: "", selectedOptionIds: [] };
}

export function hasAttemptErrors(errors: AttemptErrors) {
  return Boolean(errors.hours) || Object.keys(errors.answers ?? {}).length > 0;
}

export function validateAttempt(
  draft: AttemptDraft,
  exercise: { questions: AttemptQuestion[]; estimatedHours: number | null },
): AttemptErrors {
  const errors: AttemptErrors = {};
  const answers: Record<string, string> = {};
  for (const question of exercise.questions) {
    const answer = draft.answers[question.id] ?? emptyAnswer();
    if (question.type === "open_answer") {
      const text = answer.answerText.trim();
      if (!text) answers[question.id] = "Escreva sua resposta.";
      else if (text.length > LIMITS.text) answers[question.id] = `Use até ${LIMITS.text} caracteres.`;
    } else if (answer.selectedOptionIds.length === 0) {
      answers[question.id] = "Escolha pelo menos uma alternativa.";
    }
  }
  if (Object.keys(answers).length) errors.answers = answers;
  const hours = parseHours(draft.spentHours);
  if (hours === undefined) errors.hours = "Use só números, como 1 ou 0,5.";
  else if (hours === null) {
    if (exercise.estimatedHours === null) errors.hours = "Informe quanto tempo você estudou.";
  } else if (hours <= 0 || hours > LIMITS.hours) errors.hours = `Informe um tempo entre 0,01 e ${LIMITS.hours} horas.`;
  return errors;
}

export function toAttemptPayload(draft: AttemptDraft, questions: AttemptQuestion[]): AttemptPayload {
  const hours = parseHours(draft.spentHours);
  return {
    answers: questions.map((question) => {
      const answer = draft.answers[question.id] ?? emptyAnswer();
      return question.type === "open_answer"
        ? { question_id: question.id, answer_text: answer.answerText.trim() }
        : { question_id: question.id, selected_option_ids: [...new Set(answer.selectedOptionIds)] };
    }),
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
  packageId,
  page,
}: {
  status?: StatusFilter;
  studentId?: string;
  exerciseId?: string;
  packageId?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", STATUS_PARAMS[status]);
  if (studentId) params.set("aluno", studentId);
  if (exerciseId) params.set("exercicio", exerciseId);
  if (packageId) params.set("pacote", packageId);
  if (page && page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `${REVIEWS_PATH}?${query}` : REVIEWS_PATH;
}
