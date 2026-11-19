import type { Exercise } from "@/lib/api/exercises";
import { newOptionKey, newQuestionKey, type ExerciseDraft } from "./model";

export function draftFromExercise(exercise: Exercise): ExerciseDraft {
  const questions = [...exercise.questions].sort((a, b) => a.position - b.position);
  const images = [...exercise.images].sort((a, b) => a.position - b.position);
  return {
    title: exercise.title,
    statement: exercise.statement ?? "",
    estimatedHours: exercise.estimated_hours === null ? "" : String(exercise.estimated_hours).replace(".", ","),
    subjectIds: exercise.subjects.map((subject) => subject.id),
    skillIds: exercise.skills.map((skill) => skill.id),
    images: images.map((link) => ({
      imageId: link.image.id,
      url: link.image.url,
      name: link.image.original_filename,
      placement: link.placement,
    })),
    questions: questions.map((question) => ({
      key: newQuestionKey(),
      type: question.type,
      statement: question.statement ?? "",
      expectedAnswer: question.expected_answer ?? "",
      options: [...question.options]
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          key: newOptionKey(),
          text: option.text ?? "",
          isCorrect: option.is_correct,
          image: option.image
            ? { imageId: option.image.id, url: option.image.url, name: option.image.original_filename }
            : null,
        })),
    })),
  };
}
