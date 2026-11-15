import { LIMITS, type ExercisePayload, type ExerciseType } from "@/lib/exercises/model";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
};

export const PROMPT_LIMIT = { min: 3, max: 2000 };
export const FEEDBACK_LIMIT = { min: 3, max: 2000 };
export const COUNT_OPTIONS = [1, 3, 5, 10];

export type CatalogEntry = { name: string; count: number };
export type QuestionCatalog = {
  total: number;
  subjects: (CatalogEntry & { topics: CatalogEntry[] })[];
  boards: CatalogEntry[];
};

export type GenerationRequest = {
  prompt: string;
  count: number;
  type: ExerciseType | null;
  difficulty: Difficulty | null;
};

export type GeneratedQuestion = {
  type: ExerciseType;
  subject: string;
  topic: string;
  title: string;
  statement: string;
  explanation: string;
  options: { text: string; is_correct: boolean }[];
  expected_answer: string | null;
};

export type DraftStatus = "ready" | "discarded";

export type GeneratedDraft = {
  id: string;
  status: DraftStatus;
  verified: boolean | null;
  auto_fixes: number;
  teacher_revisions: number;
  issue: string | null;
  skill_ids: string[];
  question: GeneratedQuestion;
};

export type GenerationSession = {
  id: string;
  filters: {
    subject: string | null;
    topics: string[];
    board: string | null;
    year_from: number | null;
    year_to: number | null;
  };
  references: { id: string; subject: string; topic: string; board: string | null; exam: string | null; year: number | null }[];
  questions: GeneratedDraft[];
  max_teacher_revisions: number;
};

export type Suggestion = { label: string; prompt: string };

export function suggestions(catalog: QuestionCatalog, max = 6): Suggestion[] {
  return catalog.subjects
    .filter((subject) => subject.topics.length > 0)
    .slice(0, max)
    .map((subject) => {
      const topic = subject.topics[0].name;
      return { label: `${topic} · ${subject.name}`, prompt: `Questões de ${topic} (${subject.name})` };
    });
}

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function matchingSubjectIds(question: GeneratedQuestion, subjects: { id: string; name: string }[]) {
  const wanted = new Set([fold(question.subject), fold(question.topic)]);
  return subjects.filter((subject) => wanted.has(fold(subject.name))).map((subject) => subject.id);
}

function clip(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function toGeneratedExercisePayload(
  question: GeneratedQuestion,
  subjects: { id: string; name: string }[],
  skillIds: string[] = [],
): ExercisePayload {
  const multiple = question.type === "multiple_choice";
  const answer = [question.expected_answer?.trim(), question.explanation.trim() && `Resolução: ${question.explanation.trim()}`]
    .filter(Boolean)
    .join("\n\n");
  return {
    type: question.type,
    title: clip(question.title, LIMITS.title),
    statement: clip(question.statement, LIMITS.text) || null,
    expected_answer: multiple ? null : clip(answer, LIMITS.text) || null,
    estimated_hours: null,
    subject_ids: matchingSubjectIds(question, subjects).slice(0, LIMITS.subjects),
    skill_ids: [...new Set(skillIds)].slice(0, LIMITS.skills),
    images: [],
    options: multiple
      ? question.options.slice(0, LIMITS.options.max).map((option) => ({
          text: clip(option.text, LIMITS.text),
          is_correct: option.is_correct,
          image_id: null,
        }))
      : [],
  };
}

export function referenceSummary(result: Pick<GenerationSession, "references">) {
  const years = result.references.map((reference) => reference.year).filter((year): year is number => year !== null);
  const exams = [...new Set(result.references.map((reference) => reference.exam ?? reference.board).filter(Boolean))];
  const span = years.length ? (Math.min(...years) === Math.max(...years) ? `${years[0]}` : `${Math.min(...years)}–${Math.max(...years)}`) : "";
  return [exams.join(", "), span].filter(Boolean).join(" ");
}
