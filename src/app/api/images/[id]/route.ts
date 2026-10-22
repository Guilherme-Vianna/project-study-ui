import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api/client";
import { getSessionUser } from "@/lib/auth/session";

export async function DELETE(_: Request, { params }: RouteContext<"/api/images/[id]">) {
  if (!(await getSessionUser())) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  try {
    await apiFetch<void>(`/images/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return new NextResponse(null, { status: error instanceof ApiError ? error.status : 503 });
  }
  return new NextResponse(null, { status: 204 });
}
