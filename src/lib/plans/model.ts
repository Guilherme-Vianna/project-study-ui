import type { ExerciseType } from "@/lib/exercises/model";

export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const WEEKDAYS: { value: Weekday; short: string; label: string }[] = [
  { value: "monday", short: "Seg", label: "Segunda" },
  { value: "tuesday", short: "Ter", label: "Terça" },
  { value: "wednesday", short: "Qua", label: "Quarta" },
  { value: "thursday", short: "Qui", label: "Quinta" },
  { value: "friday", short: "Sex", label: "Sexta" },
  { value: "saturday", short: "Sáb", label: "Sábado" },
  { value: "sunday", short: "Dom", label: "Domingo" },
];

export const PLAN_LIMITS = {
  title: 200,
  description: 5000,
  subjects: 50,
  exercises: 200,
  weeklyHours: 168,
};

export type SubjectOption = { id: string; name: string };

export type ExerciseOption = {
  id: string;
  title: string;
  type: ExerciseType;
  estimatedHours: number | null;
  subjects: SubjectOption[];
};

export type PlanSubjectDraft = { subjectId: string; weeklyHours: string; weekdays: Weekday[] };
export type PlanExerciseDraft = { exerciseId: string; allocatedHours: string };

export type PlanDraft = {
  title: string;
  description: string;
  subjects: PlanSubjectDraft[];
  exercises: PlanExerciseDraft[];
};

export type PlanPayload = {
  title: string;
  description: string | null;
  subjects: { subject_id: string; weekly_hours: number; weekdays: Weekday[] }[];
  exercises: { exercise_id: string; allocated_hours: number | null }[];
};

export function emptyPlanDraft(): PlanDraft {
  return { title: "", description: "", subjects: [], exercises: [] };
}

export function hoursToInput(hours: number | null) {
  return hours === null ? "" : String(hours).replace(".", ",");
}

export function sortWeekdays(days: Weekday[]) {
  const order = WEEKDAYS.map((day) => day.value);
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
