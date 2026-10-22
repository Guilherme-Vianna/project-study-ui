import { normalize } from "@/components/students/student-filters";

export type SubjectItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdLabel: string;
};

export type SubjectSort = "name-asc" | "recent";

export function filterSubjects(subjects: SubjectItem[], { query, sort }: { query: string; sort: SubjectSort }) {
  const term = normalize(query);
  const result = subjects.filter(
    (subject) =>
      !term || normalize(subject.name).includes(term) || normalize(subject.description ?? "").includes(term),
  );
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  result.sort((a, b) => (sort === "recent" ? b.createdAt.localeCompare(a.createdAt) : collator.compare(a.name, b.name)));
  return result;
}
