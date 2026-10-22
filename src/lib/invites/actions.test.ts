// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const { api, refresh, getSessionUser, RedirectSignal } = vi.hoisted(() => ({
  api: { createInvite: vi.fn(), revokeInvite: vi.fn(), acceptInvite: vi.fn(), removeStudent: vi.fn() },
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
vi.mock("@/lib/api/enrollments", () => api);
vi.mock("@/lib/auth/session", () => ({ getSessionUser, getSessionToken: vi.fn() }));

const { acceptInviteAction, createInviteAction, removeStudentAction, revokeInviteAction } = await import("./actions");

function validity(value: string) {
  const data = new FormData();
  data.set("validity", value);
  return data;
}

async function redirectOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  return null;
}

describe("invite actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: "u1" });
  });

  it("creates an invite valid for the chosen days and refreshes the page", async () => {
    api.createInvite.mockResolvedValue({ token: "tok" });
    const before = Date.now();
    const state = await createInviteAction({ token: null, error: null }, validity("7"));

    expect(state).toEqual({ token: "tok", error: null });
    const expiresAt = Date.parse(api.createInvite.mock.calls[0][0]);
    expect(expiresAt - before).toBeGreaterThanOrEqual(7 * 86_400_000 - 1000);
    expect(refresh).toHaveBeenCalled();
  });

  it("creates an invite without expiration", async () => {
    api.createInvite.mockResolvedValue({ token: "tok" });
    await createInviteAction({ token: null, error: null }, validity("never"));
    expect(api.createInvite).toHaveBeenCalledWith(null);
  });

  it("rejects an unknown validity", async () => {
    const state = await createInviteAction({ token: null, error: null }, validity("999"));
    expect(state.error).toMatch(/Escolha/);
    expect(api.createInvite).not.toHaveBeenCalled();
  });

  it("revokes an invite and removes a student", async () => {
    expect(await revokeInviteAction("i1")).toEqual({ ok: true });
    expect(await removeStudentAction("s1")).toEqual({ ok: true });
    expect(api.revokeInvite).toHaveBeenCalledWith("i1");
    expect(api.removeStudent).toHaveBeenCalledWith("s1");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("explains a student that is no longer in the class", async () => {
    api.removeStudent.mockRejectedValue(new ApiError(404, "Enrollment not found"));
    expect(await removeStudentAction("s1")).toEqual({ ok: false, error: expect.stringMatching(/já não está/) });
  });

  it("accepts an invite and opens the home page", async () => {
    api.acceptInvite.mockResolvedValue({});
    expect(await redirectOf(acceptInviteAction("tok"))).toBe("/inicio?convite=aceito");
  });

  it.each([
    [409, /já é aluno/],
    [410, /expirou ou foi desativado/],
    [404, /Não encontramos/],
  ])("maps accept error %s to a helpful message", async (status, message) => {
    api.acceptInvite.mockRejectedValue(new ApiError(status, "x"));
    const result = await acceptInviteAction("tok");
    expect(result).toEqual({ ok: false, error: expect.stringMatching(message) });
  });

  it("redirects to login when the session expired", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await redirectOf(revokeInviteAction("i1"))).toBe("/");
  });
});
