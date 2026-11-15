import "server-only";
import { NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/auth/session";

const messages: Record<number, string> = {
  401: "Sua sessão expirou. Entre de novo.",
  403: "Só professores podem gerar questões.",
  404: "Esta geração não existe mais. Gere as questões de novo.",
  409: "Não foi possível continuar: o banco está vazio, a questão chegou ao limite de ajustes ou a geração já terminou.",
  422: "Revise o pedido e tente de novo.",
  503: "A geração com IA não está disponível no momento.",
};

function failure(status: number) {
  return NextResponse.json(
    { error: messages[status] ?? "Não foi possível gerar agora. Tente de novo em instantes." },
    { status },
  );
}

export async function proxyGenerationStream(request: Request, path: string) {
  const token = await getSessionToken();
  if (!token || !(await getSessionUser())) return failure(401);
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) return failure(503);
  const body = await request.text();

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "text/event-stream",
        "content-type": "application/json",
      },
      body,
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return failure(503);
  }
  if (!response.ok || !response.body) return failure(response.status);
  return new Response(response.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
