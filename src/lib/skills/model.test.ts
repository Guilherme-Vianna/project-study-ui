import { describe, expect, it } from "vitest";
import { emptyItem, emptySkillGroupDraft, hasSkillGroupErrors, levelProgress, toSkillGroupPayload, validateSkillGroup, type SkillGroupDraft } from "./model";

function draft(overrides: Partial<SkillGroupDraft> = {}): SkillGroupDraft {
  return { ...emptySkillGroupDraft(), name: "Inglês", skills: [emptyItem("Listening")], ...overrides };
}

describe("validateSkillGroup", () => {
  it("accepts the default levels with a skill", () => {
    expect(hasSkillGroupErrors(validateSkillGroup(draft()))).toBe(false);
  });

  it("requires a unique group name and at least one level", () => {
    expect(validateSkillGroup(draft({ name: " " })).name).toBeDefined();
    expect(validateSkillGroup(draft(), ["INGLÊS"]).name).toMatch(/já tem um grupo/);
    expect(validateSkillGroup(draft({ levels: [] })).levels).toMatch(/pelo menos um nível/);
  });

  it("flags blank levels and duplicated names ignoring case", () => {
    const blank = emptyItem();
    const duplicate = emptyItem("listening");
    const errors = validateSkillGroup(draft({ levels: [blank], skills: [emptyItem("Listening"), duplicate] }));
    expect(errors.items?.[blank.key]).toMatch(/nome/);
    expect(errors.items?.[duplicate.key]).toMatch(/já está na lista/);
  });

  it("ignores blank new skills but not blank existing ones", () => {
    expect(hasSkillGroupErrors(validateSkillGroup(draft({ skills: [emptyItem()] })))).toBe(false);
    const existing = { ...emptyItem(), id: "k1" };
    expect(validateSkillGroup(draft({ skills: [existing] })).items?.[existing.key]).toBeDefined();
  });
});

describe("toSkillGroupPayload", () => {
  it("keeps ids of existing items, drops blank new skills and nulls empty descriptions", () => {
    const payload = toSkillGroupPayload(
      draft({
        description: " ",
        levels: [{ key: "a", id: "l1", name: " Básico ", description: "" }],
        skills: [{ key: "b", id: null, name: "Speaking", description: "Fala" }, emptyItem()],
      }),
    );
    expect(payload).toEqual({
      name: "Inglês",
      description: null,
      levels: [{ id: "l1", name: "Básico", description: null }],
      skills: [{ name: "Speaking", description: "Fala" }],
    });
  });

  it("computes level progress when the total is known", () => {
    expect(levelProgress(0, 3)).toBe(33);
    expect(levelProgress(2, 3)).toBe(100);
    expect(levelProgress(1, null)).toBeNull();
  });
});
