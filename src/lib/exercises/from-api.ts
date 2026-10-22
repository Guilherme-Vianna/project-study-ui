import type { Exercise } from "@/lib/api/exercises";
import { newOptionKey, type ExerciseDraft } from "./model";

export function draftFromExercise(exercise: Exercise): ExerciseDraft {
  const options = [...exercise.options].sort((a, b) => a.position - b.position);
  const images = [...exercise.images].sort((a, b) => a.position - b.position);
  return {
    type: exercise.type,
    title: exercise.title,
    statement: exercise.statement ?? "",
    expectedAnswer: exercise.expected_answer ?? "",
    estimatedHours: exercise.estimated_hours === null ? "" : String(exercise.estimated_hours).replace(".", ","),
    subjectIds: exercise.subjects.map((subject) => subject.id),
    images: images.map((link) => ({
      imageId: link.image.id,
      url: link.image.url,
      name: link.image.original_filename,
      placement: link.placement,
    })),
    options: options.map((option) => ({
      key: newOptionKey(),
      text: option.text ?? "",
      isCorrect: option.is_correct,
      image: option.image ? { imageId: option.image.id, url: option.image.url, name: option.image.original_filename } : null,
    })),
  };
}
