import "server-only";
import type { Exercise } from "@/lib/api/exercises";
import type { StudyPlan } from "@/lib/api/plans";
import type { Subject } from "@/lib/api/subjects";
import { hoursToInput, type ExerciseOption, type PlanDraft, type SubjectOption } from "./model";

export function toSubjectOptions(subjects: Subject[]): SubjectOption[] {
  return subjects.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function toExerciseOptions(exercises: Exercise[]): ExerciseOption[] {
  return exercises.map((exercise) => ({
    id: exercise.id,
    title: exercise.title,
    type: exercise.type,
    estimatedHours: exercise.estimated_hours,
    subjects: exercise.subjects,
  }));
}

export function planToDraft(plan: StudyPlan): PlanDraft {
  const estimates = new Map(plan.exercises.map((item) => [item.exercise.id, item.exercise.estimated_hours]));
  return {
    title: plan.title,
    description: plan.description ?? "",
    subjects: plan.subjects.map((item) => ({
      subjectId: item.subject.id,
      weeklyHours: hoursToInput(item.weekly_hours),
      weekdays: item.weekdays,
    })),
    exercises: [...plan.exercises]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        exerciseId: item.exercise.id,
        allocatedHours: estimates.get(item.exercise.id) === item.allocated_hours ? "" : hoursToInput(item.allocated_hours),
      })),
  };
}
