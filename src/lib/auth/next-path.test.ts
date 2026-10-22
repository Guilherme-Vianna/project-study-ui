import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("accepts internal protected paths", () => {
    expect(safeNextPath("/convite/abc")).toBe("/convite/abc");
    expect(safeNextPath("/alunos?x=1")).toBe("/alunos?x=1");
  });

  it("rejects external, protocol-relative and unknown paths", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("//evil.com/convite")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("/api/session")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
