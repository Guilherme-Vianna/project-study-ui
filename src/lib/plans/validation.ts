import { parseHours } from "@/lib/exercises/model";
import { PLAN_LIMITS, sortWeekdays, type PlanDraft, type PlanPayload } from "./model";

export type PlanErrors = {
  title?: string;
  description?: string;
  subjects?: string;
  subjectHours?: Record<string, string>;
};

export function hasPlanErrors(errors: PlanErrors) {
  const { subjectHours, ...rest } = errors;
  return Object.values(rest).some(Boolean) || Object.keys(subjectHours ?? {}).length > 0;
}

function hoursError(value: string): string | undefined {
  const hours = parseHours(value);
  if (hours === undefined) return "Use só números, como 2 ou 1,5.";
  if (hours === null) return "Informe as horas.";
  if (hours <= 0 || hours > PLAN_LIMITS.weeklyHours) return `Entre 0,01 e ${PLAN_LIMITS.weeklyHours} horas.`;
  return undefined;
}

export function weeklyTotal(draft: PlanDraft) {
  return draft.subjects.reduce((total, subject) => total + (parseHours(subject.weeklyHours) ?? 0), 0);
}

export function validatePlan(draft: PlanDraft): PlanErrors {
  const errors: PlanErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "Dê um nome ao plano, como “Preparação ENEM — 1º bimestre”.";
  else if (title.length > PLAN_LIMITS.title) errors.title = `Use até ${PLAN_LIMITS.title} caracteres.`;
  if (draft.description.length > PLAN_LIMITS.description) errors.description = `Use até ${PLAN_LIMITS.description} caracteres.`;

  const subjectHours: Record<string, string> = {};
  for (const subject of draft.subjects) {
    const error = hoursError(subject.weeklyHours);
    if (error) subjectHours[subject.subjectId] = error;
  }
  if (Object.keys(subjectHours).length) errors.subjectHours = subjectHours;
  if (draft.subjects.length > PLAN_LIMITS.subjects) errors.subjects = `Use até ${PLAN_LIMITS.subjects} assuntos.`;
  else if (weeklyTotal(draft) > PLAN_LIMITS.weeklyHours) {
    errors.subjects = `A soma das metas passa de ${PLAN_LIMITS.weeklyHours} horas, o total de uma semana.`;
  }
  return errors;
}

export function toPlanPayload(draft: PlanDraft): PlanPayload {
  const description = draft.description.trim();
  return {
    title: draft.title.trim(),
    description: description || null,
    subjects: draft.subjects.map((subject) => ({
      subject_id: subject.subjectId,
      weekly_hours: parseHours(subject.weeklyHours) ?? 0,
      weekdays: sortWeekdays(subject.weekdays),
    })),
  };
}
