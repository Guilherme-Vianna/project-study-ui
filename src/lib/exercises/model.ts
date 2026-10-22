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
  subjects: 20,
  images: 20,
  hours: 168,
  imageBytes: 5 * 1024 * 1024,
};

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export type DraftImage = { imageId: string; url: string | null; name: string | null };

export type DraftOption = { key: string; text: string; isCorrect: boolean; image: DraftImage | null };

export type ExerciseDraft = {
  type: ExerciseType;
  title: string;
  statement: string;
  expectedAnswer: string;
  estimatedHours: string;
  subjectIds: string[];
  images: (DraftImage & { placement: ImagePlacement })[];
  options: DraftOption[];
};

export type ExercisePayload = {
  type: ExerciseType;
  title: string;
  statement: string | null;
  expected_answer: string | null;
  estimated_hours: number | null;
  subject_ids: string[];
  images: { image_id: string; placement: ImagePlacement }[];
  options: { text: string | null; is_correct: boolean; image_id: string | null }[];
};

let keySeed = 0;
export function newOptionKey() {
  keySeed += 1;
  return `option-${keySeed}`;
}

export function emptyOption(): DraftOption {
  return { key: newOptionKey(), text: "", isCorrect: false, image: null };
}

export function emptyDraft(): ExerciseDraft {
  return {
    type: "multiple_choice",
    title: "",
    statement: "",
    expectedAnswer: "",
    estimatedHours: "",
    subjectIds: [],
    images: [],
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  };
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

export function toExercisePayload(draft: ExerciseDraft): ExercisePayload {
  const multiple = draft.type === "multiple_choice";
  return {
    type: draft.type,
    title: draft.title.trim(),
    statement: nullable(draft.statement),
    expected_answer: multiple ? null : nullable(draft.expectedAnswer),
    estimated_hours: parseHours(draft.estimatedHours) ?? null,
    subject_ids: [...new Set(draft.subjectIds)],
    images: draft.images.map((image) => ({ image_id: image.imageId, placement: image.placement })),
    options: multiple
      ? draft.options.map((option) => ({
          text: nullable(option.text),
          is_correct: option.isCorrect,
          image_id: option.image?.imageId ?? null,
        }))
      : [],
  };
}
