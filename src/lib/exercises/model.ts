import { createKeyFactory } from "@/lib/draft-keys";

export type ExerciseType = "multiple_choice" | "open_answer";
export type ImagePlacement = "statement" | "attachment";

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  multiple_choice: "Múltipla escolha",
  open_answer: "Resposta aberta",
};

export const PLACEMENT_LABELS: Record<ImagePlacement, string> = {
  statement: "No enunciado",
  attachment: "Anexo",
};

export const LIMITS = {
  title: 200,
  text: 10000,
  options: { min: 2, max: 10 },
  questions: 50,
  subjects: 20,
  skills: 20,
  images: 20,
  hours: 168,
  imageBytes: 5 * 1024 * 1024,
};

export const IMAGE_UPLOADS_ENABLED = process.env.NEXT_PUBLIC_IMAGE_UPLOADS === "true";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export type DraftImage = { imageId: string; url: string | null; name: string | null };

export type DraftOption = { key: string; text: string; isCorrect: boolean; image: DraftImage | null };

export type DraftQuestion = {
  key: string;
  type: ExerciseType;
  statement: string;
  expectedAnswer: string;
  options: DraftOption[];
};

export type ExerciseDraft = {
  title: string;
  statement: string;
  estimatedHours: string;
  subjectIds: string[];
  skillIds: string[];
  images: (DraftImage & { placement: ImagePlacement })[];
  questions: DraftQuestion[];
};

export type QuestionPayload = {
  type: ExerciseType;
  statement: string | null;
  expected_answer: string | null;
  options: { text: string | null; is_correct: boolean; image_id: string | null }[];
};

export type ExercisePayload = {
  title: string;
  statement: string | null;
  estimated_hours: number | null;
  subject_ids: string[];
  skill_ids: string[];
  images: { image_id: string; placement: ImagePlacement }[];
  questions: QuestionPayload[];
};

export const newOptionKey = createKeyFactory("option");
export const newQuestionKey = createKeyFactory("question");

export function emptyOption(): DraftOption {
  return { key: newOptionKey(), text: "", isCorrect: false, image: null };
}

export function emptyQuestion(type: ExerciseType = "multiple_choice"): DraftQuestion {
  return {
    key: newQuestionKey(),
    type,
    statement: "",
    expectedAnswer: "",
    options: type === "multiple_choice" ? [emptyOption(), emptyOption(), emptyOption(), emptyOption()] : [],
  };
}

export function emptyDraft(): ExerciseDraft {
  return {
    title: "",
    statement: "",
    estimatedHours: "",
    subjectIds: [],
    skillIds: [],
    images: [],
    questions: [emptyQuestion()],
  };
}

export function questionTypes(questions: { type: ExerciseType }[]): ExerciseType[] {
  return (Object.keys(EXERCISE_TYPE_LABELS) as ExerciseType[]).filter((type) => questions.some((q) => q.type === type));
}

export function exerciseKindLabel(types: ExerciseType[]) {
  if (types.length === 1) return EXERCISE_TYPE_LABELS[types[0]];
  return "Misto";
}

export function questionCountLabel(count: number) {
  return count === 1 ? "1 questão" : `${count} questões`;
}

export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

export function parseHours(value: string): number | null | undefined {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return Number(normalized);
}

export function formatHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function toQuestionPayload(question: DraftQuestion): QuestionPayload {
  const multiple = question.type === "multiple_choice";
  return {
    type: question.type,
    statement: nullable(question.statement),
    expected_answer: multiple ? null : nullable(question.expectedAnswer),
    options: multiple
      ? question.options.map((option) => ({
          text: nullable(option.text),
          is_correct: option.isCorrect,
          image_id: option.image?.imageId ?? null,
        }))
      : [],
  };
}

export function toExercisePayload(draft: ExerciseDraft): ExercisePayload {
  return {
    title: draft.title.trim(),
    statement: nullable(draft.statement),
    estimated_hours: parseHours(draft.estimatedHours) ?? null,
    subject_ids: [...new Set(draft.subjectIds)],
    skill_ids: [...new Set(draft.skillIds)],
    images: draft.images.map((image) => ({ image_id: image.imageId, placement: image.placement })),
    questions: draft.questions.map(toQuestionPayload),
  };
}
