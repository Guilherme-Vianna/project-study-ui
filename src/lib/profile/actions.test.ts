// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const { api, getSessionUser, RedirectSignal } = vi.hoisted(() => ({
  api: { registerProfile: vi.fn(), updateMyProfile: vi.fn(), getMyAccount: vi.fn() },
  getSessionUser: vi.fn(),
  RedirectSignal: class RedirectSignal extends Error {
    constructor(readonly url: string) {
      super(url);
    }
  },
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/lib/api/profiles", () => ({ registerProfile: api.registerProfile, updateMyProfile: api.updateMyProfile }));
vi.mock("@/lib/api/account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/account")>()),
  getMyAccount: api.getMyAccount,
}));
vi.mock("@/lib/auth/session", () => ({ getSessionUser, getSessionToken: vi.fn() }));

const { registerStudentAction, registerTeacherAction, updateProfileAction } = await import("./actions");
const empty = { fieldErrors: {}, formError: null };
type Action = typeof registerTeacherAction;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function run(action: Action, values: Record<string, string>) {
  try {
    return { state: await action(empty, form(values)) };
  } catch (error) {
    if (error instanceof RedirectSignal) return { redirect: error.url };
    throw error;
  }
}

const ana = { first_name: "Ana", last_name: "Souza" };

describe("register actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: "u1" });
  });

  it("registers a teacher with normalized data and opens the home page", async () => {
    api.registerProfile.mockResolvedValue({});
    const result = await run(registerTeacherAction, {
      ...ana,
      postal_code: "01310-100",
      mobile_phone: "(11) 98765-4321",
      birth_date: "",
    });

    expect(api.registerProfile).toHaveBeenCalledWith("teacher", {
      ...ana,
      postal_code: "01310100",
      mobile_phone: "11987654321",
    });
    expect(result.redirect).toBe("/inicio?bem-vindo=teacher");
  });

  it("registers a student", async () => {
    api.registerProfile.mockResolvedValue({});
    const result = await run(registerStudentAction, ana);
    expect(api.registerProfile).toHaveBeenCalledWith("student", ana);
    expect(result.redirect).toBe("/inicio?bem-vindo=student");
  });

  it("validates on the server before calling the API", async () => {
    const result = await run(registerTeacherAction, { first_name: "", last_name: "Souza" });
    expect(result.state?.fieldErrors.first_name).toBe("Digite seu nome.");
    expect(api.registerProfile).not.toHaveBeenCalled();
  });

  it("redirects to login without a session", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await run(registerTeacherAction, {})).redirect).toBe("/");
  });

  it("explains that an account cannot have both roles", async () => {
    api.registerProfile.mockRejectedValue(new ApiError(409, "User is registered as a teacher and cannot be a student"));
    const result = await run(registerStudentAction, ana);
    expect(result.state?.formError).toMatch(/já está cadastrada como professor/);
  });

  it("sends an already registered user to the home page", async () => {
    api.registerProfile.mockRejectedValue(new ApiError(409, "User is already registered as a teacher"));
    expect((await run(registerTeacherAction, ana)).redirect).toBe("/inicio");
  });

  it("maps API validation errors to the fields", async () => {
    api.registerProfile.mockRejectedValue(
      new ApiError(422, [{ loc: ["body", "mobile_phone"], msg: "bad", type: "value_error" }]),
    );
    const result = await run(registerTeacherAction, { ...ana, mobile_phone: "(11) 98765-4321" });
    expect(result.state?.fieldErrors.mobile_phone).toMatch(/celular com DDD/);
  });

  it("keeps the user on the form when the API is down", async () => {
    api.registerProfile.mockRejectedValue(new TypeError("fetch failed"));
    const result = await run(registerTeacherAction, ana);
    expect(result.state?.formError).toMatch(/Seus dados continuam aqui/);
  });
});

describe("updateProfileAction", () => {
  const student = { ...ana, birth_date: null, postal_code: "01310100", mobile_phone: null };

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue({ uid: "u1" });
    api.getMyAccount.mockResolvedValue({ role: "student", student, teacher: null });
  });

  it("updates the profile of the current role and returns to the profile page", async () => {
    api.updateMyProfile.mockResolvedValue({});
    const result = await run(updateProfileAction, { ...ana, postal_code: "29550-000", mobile_phone: "27998751326" });

    expect(api.updateMyProfile).toHaveBeenCalledWith("student", {
      ...ana,
      postal_code: "29550000",
      mobile_phone: "27998751326",
    });
    expect(result.redirect).toBe("/perfil?salvo=1");
  });

  it("does not let a saved field be cleared", async () => {
    const result = await run(updateProfileAction, { ...ana, postal_code: "" });
    expect(result.state?.fieldErrors.postal_code).toMatch(/não pode ficar em branco/);
    expect(api.updateMyProfile).not.toHaveBeenCalled();
  });

  it("sends users without a role to onboarding", async () => {
    api.getMyAccount.mockResolvedValue({ role: null, student: null, teacher: null });
    expect((await run(updateProfileAction, ana)).redirect).toBe("/cadastro");
  });
});
