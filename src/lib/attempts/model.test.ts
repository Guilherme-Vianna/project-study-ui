import { describe, expect, it } from "vitest";
import { hasAttemptErrors, reviewsHref, statusFromParam, toAttemptPayload, validateAttempt, type AttemptDraft } from "./model";

const blank: AttemptDraft = { answerText: "", selectedOptionIds: [], spentHours: "" };

describe("validateAttempt", () => {
  it("requires text for open answers and options for multiple choice", () => {
    expect(validateAttempt(blank, { type: "open_answer", estimatedHours: 1 }).answer).toBe("Escreva sua resposta.");
    expect(validateAttempt(blank, { type: "multiple_choice", estimatedHours: 1 }).options).toMatch(/pelo menos uma/);
  });

  it("requires spent hours only when the exercise has no estimate", () => {
    const draft = { ...blank, answerText: "Resposta" };
    expect(hasAttemptErrors(validateAttempt(draft, { type: "open_answer", estimatedHours: 0.5 }))).toBe(false);
    expect(validateAttempt(draft, { type: "open_answer", estimatedHours: null }).hours).toMatch(/quanto tempo/);
    expect(validateAttempt({ ...draft, spentHours: "200" }, { type: "open_answer", estimatedHours: null }).hours).toMatch(/168/);
    expect(validateAttempt({ ...draft, spentHours: "abc" }, { type: "open_answer", estimatedHours: null }).hours).toMatch(/números/);
  });
});

describe("toAttemptPayload", () => {
  it("sends only what each type accepts and omits empty hours", () => {
    expect(toAttemptPayload({ answerText: "  oi ", selectedOptionIds: ["o1"], spentHours: "" }, "open_answer")).toEqual({ answer_text: "oi" });
    expect(toAttemptPayload({ answerText: "x", selectedOptionIds: ["o1", "o1", "o2"], spentHours: "0,5" }, "multiple_choice")).toEqual({
      selected_option_ids: ["o1", "o2"],
      spent_hours: 0.5,
    });
  });
});

describe("review links", () => {
  it("builds and parses review filters", () => {
    expect(reviewsHref({})).toBe("/correcoes");
    expect(reviewsHref({ status: "all", studentId: "s1", page: 2 })).toBe("/correcoes?status=todas&aluno=s1&pagina=2");
    expect(statusFromParam("aprovadas")).toBe("approved");
    expect(statusFromParam("qualquer")).toBe("pending");
  });
});
