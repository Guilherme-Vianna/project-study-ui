import { IMAGE_TYPES, LIMITS, type DraftImage } from "./model";

export type UploadResult = { ok: true; image: DraftImage } | { ok: false; error: string };

export function checkImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return `“${file.name}” não é PNG, JPEG, GIF ou WebP.`;
  if (file.size > LIMITS.imageBytes) return `“${file.name}” passa de 5 MB. Escolha um arquivo menor.`;
  return null;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const problem = checkImageFile(file);
  if (problem) return { ok: false, error: problem };

  const body = new FormData();
  body.set("file", file);
  try {
    const response = await fetch("/api/images", { method: "POST", body });
    const data = (await response.json()) as { id?: string; url?: string | null; original_filename?: string | null; error?: string };
    if (!response.ok || !data.id) return { ok: false, error: data.error ?? "Não foi possível enviar a imagem." };
    return { ok: true, image: { imageId: data.id, url: data.url ?? null, name: data.original_filename ?? file.name } };
  } catch {
    return { ok: false, error: "Sem conexão. Verifique sua rede e envie a imagem de novo." };
  }
}

export function discardUploadedImage(imageId: string) {
  void fetch(`/api/images/${encodeURIComponent(imageId)}`, { method: "DELETE" }).catch(() => undefined);
}
