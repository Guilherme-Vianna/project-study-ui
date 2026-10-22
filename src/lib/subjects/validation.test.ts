import { describe, expect, it } from "vitest";
import { toSubjectPayload, validateSubject } from "./validation";

describe("validateSubject", () => {
  it("requires a name up to 100 characters", () => {
    expect(validateSubject({ name: "  ", description: "" }).name).toMatch(/Dê um nome/);
    expect(validateSubject({ name: "a".repeat(101), description: "" }).name).toMatch(/até 100/);
    expect(validateSubject({ name: "Trigonometria", description: "" })).toEqual({});
  });

  it("rejects a name the teacher already uses, ignoring case like the API", () => {
    expect(validateSubject({ name: "inglês ", description: "" }, ["Inglês"]).name).toMatch(/já tem um assunto/);
  });

  it("limits the description", () => {
    expect(validateSubject({ name: "Física", description: "x".repeat(2001) }).description).toMatch(/até 2000/);
  });
});

describe("toSubjectPayload", () => {
  it("trims values and sends an empty description as null", () => {
    expect(toSubjectPayload({ name: " Física ", description: "  " })).toEqual({ name: "Física", description: null });
  });
});
