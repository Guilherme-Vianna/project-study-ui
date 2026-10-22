import { normalize } from "@/components/students/student-filters";
import type { ExerciseType } from "@/lib/exercises/model";

export type PracticeItem = {
  id: string;
  title: string;
  type: ExerciseType;
  subjects: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  hoursLabel: string | null;
  attemptsCount: number;
  lastAttemptLabel: string | null;
  locked: boolean;
};

export type PracticeType = "all" | ExerciseType;
export type PracticeStatus = "all" | "todo" | "done";

export function filterPractice(
  items: PracticeItem[],
  { query, type, subjectId, status }: { query: string; type: PracticeType; subjectId: string; status: PracticeStatus },
) {
  const term = normalize(query);
  return items
    .filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (subjectId && !item.subjects.some((subject) => subject.id === subjectId)) return false;
      if (status === "todo" && item.attemptsCount > 0) return false;
      if (status === "done" && item.attemptsCount === 0) return false;
      return !term || normalize(item.title).includes(term);
    })
    .sort((a, b) => Number(a.attemptsCount > 0) - Number(b.attemptsCount > 0) || a.title.localeCompare(b.title, "pt-BR"));
}
