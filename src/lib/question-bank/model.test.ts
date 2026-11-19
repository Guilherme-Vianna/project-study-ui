import { describe, expect, it } from "vitest";
import {
  matchingSubjectIds,
  referenceSummary,
  suggestions,
  toGeneratedExercisePayload,
  type GeneratedQuestion,
  type GenerationSession,
} from "./model";

const subjects = [
  { id: "s1", name: "matematica" },
  { id: "s2", name: "Geometria espacial" },
  { id: "s3", name: "Inglês" },
];

function question(overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  return {
    type: "multiple_choice",
    subject: "Matemática",
    topic: "Geometria espacial",
    title: "Caixa d'água",
    statement: "Qual o volume?",
    explanation: "V = 2·3·4 = 24",
    options: [
      { text: "12", is_correct: false },
      { text: "24", is_correct: true },
    ],
    expected_answer: null,
    ...overrides,
  };
}

describe("matchingSubjectIds", () => {
  it("matches the teacher subjects by subject or topic ignoring case and accents", () => {
    expect(matchingSubjectIds(question(), subjects)).toEqual(["s1", "s2"]);
    expect(matchingSubjectIds(question({ subject: "Física", topic: "Óptica" }), subjects)).toEqual([]);
  });
});

describe("toGeneratedExercisePayload", () => {
  it("maps a multiple choice question to an exercise", () => {
    expect(toGeneratedExercisePayload(question(), subjects)).toEqual({
      title: "Caixa d'água",
      statement: null,
      estimated_hours: null,
      subject_ids: ["s1", "s2"],
      skill_ids: [],
      images: [],
      questions: [
        {
          type: "multiple_choice",
          statement: "Qual o volume?",
          expected_answer: null,
          options: [
            { text: "12", is_correct: false, image_id: null },
            { text: "24", is_correct: true, image_id: null },
          ],
        },
      ],
    });
  });

  it("keeps the solution with the expected answer of open questions", () => {
    const payload = toGeneratedExercisePayload(
      question({ type: "open_answer", options: [], expected_answer: "24 m³" }),
      [],
    );
    expect(payload.questions[0].options).toEqual([]);
    expect(payload.questions[0].expected_answer).toBe("24 m³\n\nResolução: V = 2·3·4 = 24");
  });

  it("sends the chosen skills once each", () => {
    expect(toGeneratedExercisePayload(question(), [], ["k1", "k2", "k1"]).skill_ids).toEqual(["k1", "k2"]);
  });

  it("clips the title to the API limit", () => {
    expect(toGeneratedExercisePayload(question({ title: "x".repeat(250) }), []).title).toHaveLength(200);
  });
});

describe("suggestions", () => {
  it("offers the most common topic of each subject", () => {
    const catalog = {
      total: 3,
      boards: [],
      subjects: [
        { name: "Matemática", count: 2, topics: [{ name: "Funções", count: 2 }] },
        { name: "Biologia", count: 1, topics: [{ name: "Ecologia", count: 1 }] },
      ],
    };
    expect(suggestions(catalog, 1)).toEqual([{ label: "Funções · Matemática", prompt: "Questões de Funções (Matemática)" }]);
  });
});

describe("referenceSummary", () => {
  it("describes the exams and the year span", () => {
    const result = {
      references: [
        { id: "1", subject: "M", topic: "T", board: "INEP", exam: "ENEM", year: 2016 },
        { id: "2", subject: "M", topic: "T", board: "INEP", exam: "ENEM", year: 2024 },
      ],
    } as GenerationSession;
    expect(referenceSummary(result)).toBe("ENEM 2016–2024");
  });
});
