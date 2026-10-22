import { describe, expect, it } from "vitest";
import { emptyDraft, formatHours, optionLetter, parseHours, toExercisePayload, type ExerciseDraft } from "./model";
import { hasErrors, validateExercise } from "./validation";

function multipleChoice(overrides: Partial<ExerciseDraft> = {}): ExerciseDraft {
  const draft = emptyDraft();
  draft.title = "Seno de 30°";
  draft.options = draft.options.slice(0, 2).map((option, index) => ({ ...option, text: index ? "1" : "1/2", isCorrect: index === 0 }));
  return { ...draft, ...overrides };
}

describe("hours", () => {
  it("parses decimal hours with comma or dot", () => {
    expect(parseHours("1,5")).toBe(1.5);
    expect(parseHours("0.25")).toBe(0.25);
    expect(parseHours("")).toBeNull();
    expect(parseHours("1h")).toBeUndefined();
  });

  it("formats hours in a friendly way", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(1.5)).toBe("1h30");
    expect(formatHours(2)).toBe("2h");
  });
});

describe("toExercisePayload", () => {
  it("builds a multiple choice payload without an expected answer", () => {
    const payload = toExercisePayload(
      multipleChoice({
        statement: "  ",
        expectedAnswer: "ignored",
        estimatedHours: "0,5",
        subjectIds: ["s1", "s1", "s2"],
        images: [{ imageId: "i1", url: null, name: null, placement: "statement" }],
      }),
    );
    expect(payload).toEqual({
      type: "multiple_choice",
      title: "Seno de 30°",
      statement: null,
      expected_answer: null,
      estimated_hours: 0.5,
      subject_ids: ["s1", "s2"],
      images: [{ image_id: "i1", placement: "statement" }],
      options: [
        { text: "1/2", is_correct: true, image_id: null },
        { text: "1", is_correct: false, image_id: null },
      ],
    });
  });

  it("drops options for open answer exercises", () => {
    const payload = toExercisePayload(multipleChoice({ type: "open_answer", expectedAnswer: " 1/2 " }));
    expect(payload.options).toEqual([]);
    expect(payload.expected_answer).toBe("1/2");
  });
});

describe("validateExercise", () => {
  it("accepts a valid multiple choice exercise", () => {
    expect(hasErrors(validateExercise(multipleChoice()))).toBe(false);
  });

  it("requires a title, a correct option and content in every option", () => {
    const draft = multipleChoice({ title: "" });
    draft.options = draft.options.map((option) => ({ ...option, isCorrect: false }));
    draft.options[1] = { ...draft.options[1], text: "" };
    const errors = validateExercise(draft);
    expect(errors.title).toMatch(/título/);
    expect(errors.options).toMatch(/correta/);
    expect(errors.optionText?.[draft.options[1].key]).toMatch(/Escreva a alternativa/);
  });

  it("accepts an option that has only an image", () => {
    const draft = multipleChoice();
    draft.options[1] = { ...draft.options[1], text: "", image: { imageId: "i1", url: null, name: null } };
    expect(validateExercise(draft).optionText).toBeUndefined();
  });

  it("checks the estimated time", () => {
    expect(validateExercise(multipleChoice({ estimatedHours: "abc" })).estimatedHours).toMatch(/números/);
    expect(validateExercise(multipleChoice({ estimatedHours: "200" })).estimatedHours).toMatch(/168/);
  });

  it("ignores options on open answer exercises", () => {
    const draft = multipleChoice({ type: "open_answer" });
    draft.options = [];
    expect(hasErrors(validateExercise(draft))).toBe(false);
  });

  it("labels options with letters", () => {
    expect([0, 1, 9].map(optionLetter)).toEqual(["A", "B", "J"]);
  });
});
