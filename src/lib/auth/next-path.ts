import { PROTECTED_PATHS } from "./constants";

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  const pathname = value.split(/[?#]/)[0];
  const allowed = PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return allowed ? value : null;
}
