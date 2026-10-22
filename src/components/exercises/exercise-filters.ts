import { normalize } from "@/components/students/student-filters";
import type { ExerciseType } from "@/lib/exercises/model";

export type ExerciseItem = {
  id: string;
  title: string;
  type: ExerciseType;
  statementPreview: string | null;
  subjects: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  hoursLabel: string | null;
  imageCount: number;
  optionCount: number;
  updatedAt: string;
  updatedLabel: string;
};

export type TypeFilter = "all" | ExerciseType;
export const NO_SUBJECT = "none";
export type ExerciseSort = "recent" | "title";

export function filterExercises(
  items: ExerciseItem[],
  { query, type, subjectId, sort }: { query: string; type: TypeFilter; subjectId: string; sort: ExerciseSort },
) {
  const term = normalize(query);
  const result = items.filter((item) => {
    if (type !== "all" && item.type !== type) return false;
    if (subjectId === NO_SUBJECT && item.subjects.length > 0) return false;
    if (subjectId && subjectId !== NO_SUBJECT && !item.subjects.some((subject) => subject.id === subjectId)) return false;
    if (!term) return true;
    return normalize(item.title).includes(term) || normalize(item.statementPreview ?? "").includes(term);
  });
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  result.sort((a, b) => (sort === "title" ? collator.compare(a.title, b.title) : b.updatedAt.localeCompare(a.updatedAt)));
  return result;
}
