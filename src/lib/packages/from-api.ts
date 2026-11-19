import type { Exercise } from "@/lib/api/exercises";
import type { ExercisePackage } from "@/lib/api/packages";
import { questionTypes } from "@/lib/exercises/model";
import type { PackageDraft } from "./model";

export function toPackageExerciseOptions(exercises: Exercise[]) {
  return exercises
    .map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      types: questionTypes(exercise.questions),
      questionCount: exercise.questions.length,
      subjects: exercise.subjects,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

export function draftFromPackage(item: ExercisePackage): PackageDraft {
  return {
    title: item.title,
    description: item.description ?? "",
    exerciseIds: item.exercises.map((exercise) => exercise.id),
  };
}
