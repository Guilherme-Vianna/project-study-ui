// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = { set: vi.fn(), delete: vi.fn() };
const verifyIdToken = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/lib/auth/session", () => ({ verifyIdToken }));

const { POST, DELETE } = await import("./route");

function post(body: unknown) {
  return POST(new Request("http://localhost/api/session", { method: "POST", body: JSON.stringify(body) }));
}

describe("/api/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a verified token in an httpOnly cookie that expires with the token", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    verifyIdToken.mockResolvedValue({ uid: "u1", exp });

    const response = await post({ idToken: "token" });

    expect(response.status).toBe(204);
    expect(cookieStore.set).toHaveBeenCalledWith(
      "session",
      "token",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    const maxAge = cookieStore.set.mock.calls[0][2].maxAge;
    expect(maxAge).toBeGreaterThan(3590);
    expect(maxAge).toBeLessThanOrEqual(3600);
  });

  it("rejects a missing token", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("rejects an invalid token without setting the cookie", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad signature"));
    const response = await post({ idToken: "forged" });
    expect(response.status).toBe(401);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("clears the cookie on sign out", async () => {
    const response = await DELETE();
    expect(response.status).toBe(204);
    expect(cookieStore.delete).toHaveBeenCalledWith("session");
  });
});
