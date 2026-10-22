import "server-only";
import type { Exercise } from "@/lib/api/exercises";
import type { StudyPlan } from "@/lib/api/plans";
import type { Subject } from "@/lib/api/subjects";
import { hoursToInput, type ExerciseOption, type PlanDraft, type SubjectOption } from "./model";

export function toSubjectOptions(subjects: Subject[]): SubjectOption[] {
  return subjects.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function toExerciseOptions(exercises: Exercise[]): ExerciseOption[] {
  return exercises.map(({ id, title, subjects }) => ({ id, title, subjects }));
}

export function planToDraft(plan: StudyPlan): PlanDraft {
  return {
    title: plan.title,
    description: plan.description ?? "",
    subjects: plan.subjects.map((item) => ({
      subjectId: item.subject.id,
      weeklyHours: hoursToInput(item.weekly_hours),
      weekdays: item.weekdays,
    })),
  };
}
