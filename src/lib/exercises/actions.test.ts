// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { emptyDraft, type ExerciseDraft } from "./model";

const { api, refresh, getSessionUser, RedirectSignal } = vi.hoisted(() => ({
  api: { createExercise: vi.fn(), replaceExercise: vi.fn(), deleteExercise: vi.fn() },
  refresh: vi.fn(),
  getSessionUser: vi.fn(),
  RedirectSignal: class RedirectSignal extends Error {
    constructor(readonly url: string) {
      super(url);
    }
  },
}));

vi.mock("next/cache", () => ({ refresh }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/lib/api/exercises", () => api);
vi.mock("@/lib/auth/session", () => ({ getSessionUser, getSessionToken: vi.fn() }));

const { deleteExerciseAction, saveExerciseAction } = await import("./actions");

function openAnswer(): ExerciseDraft {
  return { ...emptyDraft(), type: "open_answer", title: "Explique a Revolução Francesa", options: [] };
}

async function save(id: string | null, draft: ExerciseDraft) {
  try {
    return { result: await saveExerciseAction(id, draft) };
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.url };
    throw error;
  }
}

describe("exercise actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionUser.mockResolvedValue({ uid: "u1" });
  });

  it("creates an exercise and returns to the list", async () => {
    api.createExercise.mockResolvedValue({ id: "e9" });
    const outcome = await save(null, openAnswer());
    expect(api.createExercise).toHaveBeenCalledWith(expect.objectContaining({ type: "open_answer", options: [] }));
    expect(outcome.redirect).toBe("/exercicios?salvo=criado");
  });

  it("replaces an existing exercise", async () => {
    api.replaceExercise.mockResolvedValue({ id: "e1" });
    const outcome = await save("e1", openAnswer());
    expect(api.replaceExercise).toHaveBeenCalledWith("e1", expect.objectContaining({ title: "Explique a Revolução Francesa" }));
    expect(outcome.redirect).toBe("/exercicios?salvo=editado");
  });

  it("returns the created exercise when asked to stay on the page", async () => {
    api.createExercise.mockResolvedValue({ id: "e9", title: "T", type: "open_answer", estimated_hours: 1, subjects: [] });
    const result = await saveExerciseAction(null, openAnswer(), { stay: true });
    expect(result).toEqual({ ok: true, exercise: { id: "e9", title: "T", type: "open_answer", estimatedHours: 1, subjects: [] } });
    expect(refresh).toHaveBeenCalled();
  });

  it("validates on the server", async () => {
    const outcome = await save(null, { ...openAnswer(), title: "" });
    expect(outcome.result).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(api.createExercise).not.toHaveBeenCalled();
  });

  it("explains removed subjects", async () => {
    api.createExercise.mockRejectedValue(new ApiError(422, "Unknown subjects: ['x']"));
    const outcome = await save(null, openAnswer());
    expect(outcome.result).toMatchObject({ errors: { subjects: expect.stringMatching(/excluído/) } });
  });

  it("keeps data when the API is down", async () => {
    api.createExercise.mockRejectedValue(new TypeError("fetch failed"));
    const outcome = await save(null, openAnswer());
    expect(outcome.result).toMatchObject({ formError: expect.stringMatching(/continuam aqui/) });
  });

  it("explains why an exercise in use cannot be deleted", async () => {
    api.deleteExercise.mockRejectedValue(new ApiError(409, "Exercise is used by a study plan"));
    expect(await deleteExerciseAction("e1")).toEqual({ ok: false, error: expect.stringMatching(/plano de estudo/) });
  });

  it("deletes an exercise and refreshes", async () => {
    expect(await deleteExerciseAction("e1")).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalled();
  });
});
