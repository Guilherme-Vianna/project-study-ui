import { describe, expect, it } from "vitest";
import type { ExerciseOption, PlanDraft } from "./model";
import { allocatedTotal, hasPlanErrors, toPlanPayload, validatePlan, weeklyTotal } from "./validation";

const exercises: ExerciseOption[] = [
  { id: "e1", title: "Seno", type: "multiple_choice", estimatedHours: 0.5, subjects: [] },
  { id: "e2", title: "Redação", type: "open_answer", estimatedHours: null, subjects: [] },
];

function draft(overrides: Partial<PlanDraft> = {}): PlanDraft {
  return {
    title: "ENEM",
    description: "",
    subjects: [{ subjectId: "s1", weeklyHours: "3", weekdays: ["wednesday", "monday"] }],
    exercises: [{ exerciseId: "e1", allocatedHours: "" }],
    ...overrides,
  };
}

describe("validatePlan", () => {
  it("accepts a valid plan", () => {
    expect(hasPlanErrors(validatePlan(draft(), exercises))).toBe(false);
  });

  it("requires a title and weekly hours for each subject", () => {
    const errors = validatePlan(draft({ title: " ", subjects: [{ subjectId: "s1", weeklyHours: "", weekdays: [] }] }), exercises);
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
      exercises,
    );
    expect(errors.subjects).toMatch(/168/);
  });

  it("asks for hours on exercises without an estimate, like the API", () => {
    const errors = validatePlan(draft({ exercises: [{ exerciseId: "e2", allocatedHours: "" }] }), exercises);
    expect(errors.exerciseHours?.e2).toMatch(/não tem tempo estimado/);
    expect(hasPlanErrors(validatePlan(draft({ exercises: [{ exerciseId: "e2", allocatedHours: "1,5" }] }), exercises))).toBe(false);
  });
});

describe("totals and payload", () => {
  it("sums weekly and allocated hours using the exercise estimate as default", () => {
    const plan = draft({ exercises: [{ exerciseId: "e1", allocatedHours: "" }, { exerciseId: "e2", allocatedHours: "2" }] });
    expect(weeklyTotal(plan)).toBe(3);
    expect(allocatedTotal(plan, exercises)).toBe(2.5);
  });

  it("builds the API payload with sorted weekdays and null defaults", () => {
    expect(toPlanPayload(draft({ description: "  " }))).toEqual({
      title: "ENEM",
      description: null,
      subjects: [{ subject_id: "s1", weekly_hours: 3, weekdays: ["monday", "wednesday"] }],
      exercises: [{ exercise_id: "e1", allocated_hours: null }],
    });
  });
});
