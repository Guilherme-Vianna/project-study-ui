import { describe, expect, it } from "vitest";
import { exercisesInPlan, type PlanDraft } from "./model";
import { hasPlanErrors, toPlanPayload, validatePlan, weeklyTotal } from "./validation";

function draft(overrides: Partial<PlanDraft> = {}): PlanDraft {
  return {
    title: "ENEM",
    description: "",
    subjects: [{ subjectId: "s1", weeklyHours: "3", weekdays: ["wednesday", "monday"] }],
    ...overrides,
  };
}

describe("validatePlan", () => {
  it("accepts a valid plan", () => {
    expect(hasPlanErrors(validatePlan(draft()))).toBe(false);
  });

  it("requires a title and weekly hours for each subject", () => {
    const errors = validatePlan(draft({ title: " ", subjects: [{ subjectId: "s1", weeklyHours: "", weekdays: [] }] }));
    expect(errors.title).toBeDefined();
    expect(errors.subjectHours?.s1).toMatch(/Informe as horas/);
  });

  it("limits the weekly total to 168 hours", () => {
    const errors = validatePlan(
      draft({
        subjects: [
          { subjectId: "s1", weeklyHours: "100", weekdays: [] },
          { subjectId: "s2", weeklyHours: "80", weekdays: [] },
        ],
      }),
    );
    expect(errors.subjects).toMatch(/168/);
  });
});

describe("totals and payload", () => {
  it("sums weekly hours", () => {
    expect(weeklyTotal(draft({ subjects: [{ subjectId: "s1", weeklyHours: "1,5", weekdays: [] }, { subjectId: "s2", weeklyHours: "2", weekdays: [] }] }))).toBe(3.5);
  });

  it("builds the API payload with only subjects and sorted weekdays", () => {
    expect(toPlanPayload(draft({ description: "  " }))).toEqual({
      title: "ENEM",
      description: null,
      subjects: [{ subject_id: "s1", weekly_hours: 3, weekdays: ["monday", "wednesday"] }],
    });
  });

  it("lists exercises that share any plan subject", () => {
    const exercises = [
      { id: "e1", subjects: [{ id: "s1" }] },
      { id: "e2", subjects: [{ id: "s2" }, { id: "s3" }] },
      { id: "e3", subjects: [] },
    ];
    expect(exercisesInPlan(exercises, ["s1", "s3"]).map((exercise) => exercise.id)).toEqual(["e1", "e2"]);
  });
});
