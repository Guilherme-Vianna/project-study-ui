export type StudentItem = {
  id: string;
  name: string;
  phone: string | null;
  phoneHref: string | null;
  complete: boolean;
};

export type StudentFilter = "all" | "incomplete";
export type StudentSort = "name-asc" | "name-desc";

export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function filterStudents(
  students: StudentItem[],
  { query, filter, sort }: { query: string; filter: StudentFilter; sort: StudentSort },
) {
  const term = normalize(query);
  const digits = query.replace(/\D/g, "");
  const result = students.filter((student) => {
    if (filter === "incomplete" && student.complete) return false;
    if (!term) return true;
    if (normalize(student.name).includes(term)) return true;
    return digits.length >= 2 && (student.phone ?? "").replace(/\D/g, "").includes(digits);
  });
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  result.sort((a, b) => collator.compare(a.name, b.name) * (sort === "name-asc" ? 1 : -1));
  return result;
}
