import type { User } from "firebase/auth";

export async function createServerSession(user: User, forceRefresh = false) {
  const idToken = await user.getIdToken(forceRefresh);
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error(`Session request failed with ${response.status}`);
  }
}

export async function destroyServerSession() {
  await fetch("/api/session", { method: "DELETE" });
}
