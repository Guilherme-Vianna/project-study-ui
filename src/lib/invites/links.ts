import "server-only";
import { headers } from "next/headers";
import { INVITE_PATH } from "@/lib/auth/constants";

export async function appOrigin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = list.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${protocol}://${host}`;
}

export function invitePath(token: string) {
  return `${INVITE_PATH}/${encodeURIComponent(token)}`;
}
