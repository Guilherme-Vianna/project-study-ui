// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const { api, refresh, getSessionUser } = vi.hoisted(() => ({
  api: { createSubject: vi.fn(), updateSubject: vi.fn(), deleteSubject: vi.fn() },
  refresh: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/api/subjects", () => api);
vi.mock("@/lib/auth/session", () => ({ getSessionUser, getSessionToken: vi.fn() }));

const { deleteSubjectAction, saveSubjectAction } = await import("./actions");

describe("subject actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionUser.mockResolvedValue({ uid: "u1" });
  });

  it("creates a subject and refreshes the page", async () => {
    api.createSubject.mockResolvedValue({ id: "s9", name: "Inglês" });
    expect(await saveSubjectAction(null, { name: " Inglês ", description: "" })).toEqual({
      ok: true,
      subject: { id: "s9", name: "Inglês" },
    });
    expect(api.createSubject).toHaveBeenCalledWith({ name: "Inglês", description: null });
    expect(refresh).toHaveBeenCalled();
  });

  it("updates an existing subject", async () => {
    api.updateSubject.mockResolvedValue({ id: "s1", name: "Inglês" });
    await saveSubjectAction("s1", { name: "Inglês", description: "Verbos" });
    expect(api.updateSubject).toHaveBeenCalledWith("s1", { name: "Inglês", description: "Verbos" });
  });

  it("validates before calling the API", async () => {
    const result = await saveSubjectAction(null, { name: "", description: "" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: expect.stringMatching(/Dê um nome/) } });
    expect(api.createSubject).not.toHaveBeenCalled();
  });

  it("shows a duplicate name next to the field", async () => {
    api.createSubject.mockRejectedValue(new ApiError(409, "Subject 'Inglês' already exists"));
    const result = await saveSubjectAction(null, { name: "Inglês", description: "" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: expect.stringMatching(/já tem um assunto/) } });
  });

  it("explains why a subject in a study plan cannot be deleted", async () => {
    api.deleteSubject.mockRejectedValue(new ApiError(409, "Subject is used by a study plan"));
    expect(await deleteSubjectAction("s1")).toEqual({ ok: false, error: expect.stringMatching(/plano de estudo/) });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("deletes a subject", async () => {
    expect(await deleteSubjectAction("s1")).toEqual({ ok: true });
    expect(api.deleteSubject).toHaveBeenCalledWith("s1");
  });
});
