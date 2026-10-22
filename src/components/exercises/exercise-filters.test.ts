import { describe, expect, it } from "vitest";
import { filterExercises, NO_SUBJECT, type ExerciseItem } from "./exercise-filters";

const item = (id: string, title: string, overrides: Partial<ExerciseItem> = {}): ExerciseItem => ({
  id,
  title,
  type: "multiple_choice",
  statementPreview: null,
  subjects: [],
  skills: [],
  hoursLabel: null,
  imageCount: 0,
  optionCount: 4,
  updatedAt: `2026-10-0${id}`,
  updatedLabel: "",
  ...overrides,
});

const items = [
  item("1", "Seno de 30°", { subjects: [{ id: "s1", name: "Trigonometria" }] }),
  item("2", "Análise sintática", { type: "open_answer", statementPreview: "Identifique o sujeito" }),
  item("3", "Cosseno", { subjects: [{ id: "s1", name: "Trigonometria" }] }),
];

const ids = (result: ExerciseItem[]) => result.map((entry) => entry.id);
const base = { query: "", type: "all" as const, subjectId: "", sort: "recent" as const };

describe("filterExercises", () => {
  it("orders by most recent by default and by title on demand", () => {
    expect(ids(filterExercises(items, base))).toEqual(["3", "2", "1"]);
    expect(ids(filterExercises(items, { ...base, sort: "title" }))).toEqual(["2", "3", "1"]);
  });

  it("filters by type, subject and missing subject", () => {
    expect(ids(filterExercises(items, { ...base, type: "open_answer" }))).toEqual(["2"]);
    expect(ids(filterExercises(items, { ...base, subjectId: "s1" }))).toEqual(["3", "1"]);
    expect(ids(filterExercises(items, { ...base, subjectId: NO_SUBJECT }))).toEqual(["2"]);
  });

  it("searches title and statement ignoring accents", () => {
    expect(ids(filterExercises(items, { ...base, query: "analise" }))).toEqual(["2"]);
    expect(ids(filterExercises(items, { ...base, query: "sujeito" }))).toEqual(["2"]);
  });
});
