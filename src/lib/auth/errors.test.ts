import { describe, expect, it } from "vitest";
import { authErrorMessage, GENERIC_AUTH_ERROR } from "./errors";

describe("authErrorMessage", () => {
  it("maps wrong credentials to a single message that does not reveal which field is wrong", () => {
    expect(authErrorMessage({ code: "auth/invalid-credential" })).toBe(
      authErrorMessage({ code: "auth/user-not-found" }),
    );
    expect(authErrorMessage({ code: "auth/invalid-credential" })).toMatch(/E-mail ou senha incorretos/);
  });

  it("stays silent when the user closes the Google popup", () => {
    expect(authErrorMessage({ code: "auth/popup-closed-by-user" })).toBeNull();
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(authErrorMessage(new Error("boom"))).toBe(GENERIC_AUTH_ERROR);
    expect(authErrorMessage({ code: "auth/something-new" })).toBe(GENERIC_AUTH_ERROR);
  });
});
