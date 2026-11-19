import { describe, expect, it } from "vitest";
import { hasAttemptErrors, reviewsHref, statusFromParam, toAttemptPayload, validateAttempt, type AttemptDraft } from "./model";

const blank: AttemptDraft = { answers: {}, spentHours: "" };
const open = [{ id: "q1", type: "open_answer" as const }];
const choice = [{ id: "q2", type: "multiple_choice" as const }];

describe("validateAttempt", () => {
  it("requires text for open answers and options for multiple choice", () => {
    expect(validateAttempt(blank, { questions: open, estimatedHours: 1 }).answers?.q1).toBe("Escreva sua resposta.");
    expect(validateAttempt(blank, { questions: choice, estimatedHours: 1 }).answers?.q2).toMatch(/pelo menos uma/);
  });

  it("checks every question of the exercise", () => {
    const draft: AttemptDraft = { answers: { q1: { answerText: "oi", selectedOptionIds: [] } }, spentHours: "" };
    const errors = validateAttempt(draft, { questions: [...open, ...choice], estimatedHours: 1 });
    expect(Object.keys(errors.answers ?? {})).toEqual(["q2"]);
  });

  it("requires spent hours only when the exercise has no estimate", () => {
    const draft: AttemptDraft = { answers: { q1: { answerText: "Resposta", selectedOptionIds: [] } }, spentHours: "" };
    expect(hasAttemptErrors(validateAttempt(draft, { questions: open, estimatedHours: 0.5 }))).toBe(false);
    expect(validateAttempt(draft, { questions: open, estimatedHours: null }).hours).toMatch(/quanto tempo/);
    expect(validateAttempt({ ...draft, spentHours: "200" }, { questions: open, estimatedHours: null }).hours).toMatch(/168/);
    expect(validateAttempt({ ...draft, spentHours: "abc" }, { questions: open, estimatedHours: null }).hours).toMatch(/números/);
  });
});

describe("toAttemptPayload", () => {
  it("sends one answer per question with only what each type accepts", () => {
    const draft: AttemptDraft = {
      answers: {
        q1: { answerText: "  oi ", selectedOptionIds: ["o1"] },
        q2: { answerText: "x", selectedOptionIds: ["o1", "o1", "o2"] },
      },
      spentHours: "0,5",
    };
    expect(toAttemptPayload(draft, [...open, ...choice])).toEqual({
      answers: [
        { question_id: "q1", answer_text: "oi" },
        { question_id: "q2", selected_option_ids: ["o1", "o2"] },
      ],
      spent_hours: 0.5,
    });
    expect(toAttemptPayload({ ...draft, spentHours: "" }, open)).toEqual({ answers: [{ question_id: "q1", answer_text: "oi" }] });
  });
});

describe("review links", () => {
  it("builds and parses review filters", () => {
    expect(reviewsHref({})).toBe("/correcoes");
    expect(reviewsHref({ status: "all", studentId: "s1", page: 2 })).toBe("/correcoes?status=todas&aluno=s1&pagina=2");
    expect(reviewsHref({ packageId: "p1" })).toBe("/correcoes?pacote=p1");
    expect(statusFromParam("aprovadas")).toBe("approved");
    expect(statusFromParam("qualquer")).toBe("pending");
  });
});
