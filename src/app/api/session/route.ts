import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifyIdToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    idToken?: unknown;
  } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  let exp: number;
  try {
    ({ exp } = await verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, idToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(exp - Math.floor(Date.now() / 1000), 0),
  });
  return new NextResponse(null, { status: 204 });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return new NextResponse(null, { status: 204 });
}
