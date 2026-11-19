import { describe, expect, it } from "vitest";
import {
  emptyDraft,
  emptyQuestion,
  exerciseKindLabel,
  formatHours,
  optionLetter,
  parseHours,
  questionTypes,
  toExercisePayload,
  type DraftQuestion,
  type ExerciseDraft,
} from "./model";
import { hasErrors, validateExercise } from "./validation";

function choiceQuestion(): DraftQuestion {
  const question = emptyQuestion("multiple_choice");
  question.options = question.options.slice(0, 2).map((option, index) => ({ ...option, text: index ? "1" : "1/2", isCorrect: index === 0 }));
  return question;
}

function multipleChoice(overrides: Partial<ExerciseDraft> = {}): ExerciseDraft {
  return { ...emptyDraft(), title: "Seno de 30°", questions: [choiceQuestion()], ...overrides };
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
  it("builds the exercise with every question", () => {
    const open = { ...emptyQuestion("open_answer"), statement: " Explique ", expectedAnswer: " 1/2 " };
    const payload = toExercisePayload(
      multipleChoice({
        statement: "  ",
        estimatedHours: "0,5",
        subjectIds: ["s1", "s1", "s2"],
        skillIds: ["k1", "k1"],
        images: [{ imageId: "i1", url: null, name: null, placement: "statement" }],
        questions: [{ ...choiceQuestion(), expectedAnswer: "ignored" }, open],
      }),
    );
    expect(payload).toEqual({
      title: "Seno de 30°",
      statement: null,
      estimated_hours: 0.5,
      subject_ids: ["s1", "s2"],
      skill_ids: ["k1"],
      images: [{ image_id: "i1", placement: "statement" }],
      questions: [
        {
          type: "multiple_choice",
          statement: null,
          expected_answer: null,
          options: [
            { text: "1/2", is_correct: true, image_id: null },
            { text: "1", is_correct: false, image_id: null },
          ],
        },
        { type: "open_answer", statement: "Explique", expected_answer: "1/2", options: [] },
      ],
    });
  });

  it("drops options for open answer questions", () => {
    const question = { ...choiceQuestion(), type: "open_answer" as const };
    expect(toExercisePayload(multipleChoice({ questions: [question] })).questions[0].options).toEqual([]);
  });
});

describe("validateExercise", () => {
  it("accepts a valid multiple choice exercise", () => {
    expect(hasErrors(validateExercise(multipleChoice()))).toBe(false);
  });

  it("requires a title, a correct option and content in every option", () => {
    const question = choiceQuestion();
    question.options = question.options.map((option) => ({ ...option, isCorrect: false }));
    question.options[1] = { ...question.options[1], text: "" };
    const errors = validateExercise(multipleChoice({ title: "", questions: [question] }));
    expect(errors.title).toMatch(/título/);
    expect(errors.questionErrors?.[question.key].options).toMatch(/correta/);
    expect(errors.questionErrors?.[question.key].optionText?.[question.options[1].key]).toMatch(/Escreva a alternativa/);
  });

  it("accepts an option that has only an image", () => {
    const question = choiceQuestion();
    question.options[1] = { ...question.options[1], text: "", image: { imageId: "i1", url: null, name: null } };
    expect(validateExercise(multipleChoice({ questions: [question] })).questionErrors).toBeUndefined();
  });

  it("requires at least one question", () => {
    expect(validateExercise(multipleChoice({ questions: [] })).questions).toMatch(/pelo menos uma/);
  });

  it("checks the estimated time", () => {
    expect(validateExercise(multipleChoice({ estimatedHours: "abc" })).estimatedHours).toMatch(/números/);
    expect(validateExercise(multipleChoice({ estimatedHours: "200" })).estimatedHours).toMatch(/168/);
  });

  it("accepts mixed questions", () => {
    const draft = multipleChoice({ questions: [choiceQuestion(), emptyQuestion("open_answer")] });
    expect(hasErrors(validateExercise(draft))).toBe(false);
  });

  it("labels options with letters and exercises by their question types", () => {
    expect([0, 1, 9].map(optionLetter)).toEqual(["A", "B", "J"]);
    const types = questionTypes([{ type: "open_answer" }, { type: "multiple_choice" }]);
    expect(types).toEqual(["multiple_choice", "open_answer"]);
    expect(exerciseKindLabel(types)).toBe("Misto");
    expect(exerciseKindLabel(["open_answer"])).toBe("Resposta aberta");
  });
});
