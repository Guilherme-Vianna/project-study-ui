// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { PlanDraft } from "./model";

const { api, refresh, getSessionUser, RedirectSignal } = vi.hoisted(() => ({
  api: { createPlan: vi.fn(), replacePlan: vi.fn(), deletePlan: vi.fn(), assignPlan: vi.fn(), endAssignment: vi.fn() },
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
vi.mock("@/lib/api/plans", () => api);
vi.mock("@/lib/auth/session", () => ({ getSessionUser, getSessionToken: vi.fn() }));

const { assignPlanAction, deletePlanAction, endAssignmentAction, savePlanAction } = await import("./actions");

const plan: PlanDraft = { title: "ENEM", description: "", subjects: [], exercises: [] };

async function redirectOf(promise: Promise<unknown>) {
  try {
    return { value: await promise };
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.url };
    throw error;
  }
}

describe("plan actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionUser.mockResolvedValue({ uid: "u1" });
  });

  it("creates a plan and opens it", async () => {
    api.createPlan.mockResolvedValue({ id: "p1" });
    expect((await redirectOf(savePlanAction(null, plan, []))).redirect).toBe("/planos/p1?salvo=criado");
  });

  it("replaces an existing plan", async () => {
    api.replacePlan.mockResolvedValue({ id: "p1" });
    expect((await redirectOf(savePlanAction("p1", plan, []))).redirect).toBe("/planos/p1?salvo=editado");
    expect(api.replacePlan).toHaveBeenCalledWith("p1", expect.objectContaining({ title: "ENEM" }));
  });

  it("validates before calling the API", async () => {
    const outcome = await redirectOf(savePlanAction(null, { ...plan, title: "" }, []));
    expect(outcome.value).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(api.createPlan).not.toHaveBeenCalled();
  });

  it("explains a missing exercise hour reported by the API", async () => {
    api.createPlan.mockRejectedValue(new ApiError(422, "Exercise x needs allocated_hours (it has no estimated_hours)"));
    const outcome = await redirectOf(savePlanAction(null, plan, []));
    expect(outcome.value).toMatchObject({ errors: { exercises: expect.stringMatching(/sem horas/) } });
  });

  it("explains why an assigned plan cannot be deleted", async () => {
    api.deletePlan.mockRejectedValue(new ApiError(409, "assigned"));
    expect(await deletePlanAction("p1")).toEqual({ ok: false, error: expect.stringMatching(/Encerre as atribuições/) });
  });

  it("deletes a plan and returns to the list", async () => {
    expect((await redirectOf(deletePlanAction("p1"))).redirect).toBe("/planos?excluido=1");
  });

  it("assigns and refreshes, explaining a student with another active plan", async () => {
    expect(await assignPlanAction("p1", "s1")).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalled();
    api.assignPlan.mockRejectedValue(new ApiError(409, "Student already has an active study plan"));
    expect(await assignPlanAction("p1", "s1")).toEqual({ ok: false, error: expect.stringMatching(/já tem um plano ativo/) });
  });

  it("ends an assignment", async () => {
    expect(await endAssignmentAction("p1", "a1")).toEqual({ ok: true });
    expect(api.endAssignment).toHaveBeenCalledWith("p1", "a1");
  });
});
