import { NextResponse } from "next/server";
import { getSessionToken, getSessionUser } from "@/lib/auth/session";
import { IMAGE_TYPES, LIMITS } from "@/lib/exercises/model";

const messages: Record<number, string> = {
  401: "Sua sessão expirou. Entre de novo.",
  403: "Só professores podem enviar imagens.",
  413: "A imagem passa de 5 MB. Escolha um arquivo menor.",
  415: "Use uma imagem PNG, JPEG, GIF ou WebP.",
  422: "O arquivo está vazio ou corrompido.",
  503: "O envio de imagens está indisponível no momento.",
};

function failure(status: number) {
  return NextResponse.json({ error: messages[status] ?? "Não foi possível enviar a imagem. Tente de novo." }, { status });
}

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token || !(await getSessionUser())) return failure(401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return failure(422);
  if (file.size > LIMITS.imageBytes) return failure(413);
  if (!IMAGE_TYPES.includes(file.type)) return failure(415);

  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) return failure(503);
  const upstream = new FormData();
  upstream.set("file", file, file.name);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/images`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      body: upstream,
      cache: "no-store",
    });
  } catch {
    return failure(503);
  }
  if (!response.ok) return failure(response.status);
  return NextResponse.json(await response.json(), { status: 201 });
}
