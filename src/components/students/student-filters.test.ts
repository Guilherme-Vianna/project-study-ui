import { describe, expect, it } from "vitest";
import { filterStudents, type StudentItem } from "./student-filters";

const student = (id: string, name: string, phone: string | null, complete = true): StudentItem => ({
  id,
  name,
  phone,
  phoneHref: null,
  complete,
});

const students = [
  student("1", "Bruno Lima", "(27) 99875-1326"),
  student("2", "Ágata Souza", null, false),
  student("3", "Caio Prado", "(11) 98765-4321"),
];

const names = (items: StudentItem[]) => items.map((item) => item.name);

describe("filterStudents", () => {
  it("sorts by name with Portuguese collation", () => {
    expect(names(filterStudents(students, { query: "", filter: "all", sort: "name-asc" }))).toEqual([
      "Ágata Souza",
      "Bruno Lima",
      "Caio Prado",
    ]);
    expect(names(filterStudents(students, { query: "", filter: "all", sort: "name-desc" }))[0]).toBe("Caio Prado");
  });

  it("searches ignoring accents and case", () => {
    expect(names(filterStudents(students, { query: "agata", filter: "all", sort: "name-asc" }))).toEqual(["Ágata Souza"]);
  });

  it("searches by phone digits", () => {
    expect(names(filterStudents(students, { query: "9876", filter: "all", sort: "name-asc" }))).toEqual(["Caio Prado"]);
  });

  it("filters incomplete profiles", () => {
    expect(names(filterStudents(students, { query: "", filter: "incomplete", sort: "name-asc" }))).toEqual([
      "Ágata Souza",
    ]);
  });
});
