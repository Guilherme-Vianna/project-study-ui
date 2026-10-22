"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { createSubject, deleteSubject, updateSubject } from "@/lib/api/subjects";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { duplicateNameMessage, toSubjectPayload, validateSubject, type SubjectFieldErrors, type SubjectValues } from "./validation";

export type SaveSubjectResult =
  | { ok: true; subject: { id: string; name: string } }
  | { ok: false; fieldErrors: SubjectFieldErrors; formError: string | null };
export type DeleteSubjectResult = { ok: true } | { ok: false; error: string };

const UNAVAILABLE = "Não foi possível salvar agora. Seus dados continuam aqui; tente de novo em instantes.";

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

export async function saveSubjectAction(subjectId: string | null, values: SubjectValues): Promise<SaveSubjectResult> {
  await requireSession();
  const fieldErrors = validateSubject(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, formError: null };

  const payload = toSubjectPayload(values);
  let saved;
  try {
    saved = subjectId ? await updateSubject(subjectId, payload) : await createSubject(payload);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(LOGIN_PATH);
      if (error.status === 409) return { ok: false, fieldErrors: { name: duplicateNameMessage(payload.name) }, formError: null };
      if (error.status === 404) {
        return { ok: false, fieldErrors: {}, formError: "Este assunto não existe mais. Feche e atualize a página." };
      }
      if (error.status === 403) {
        return { ok: false, fieldErrors: {}, formError: "Só professores podem cadastrar assuntos." };
      }
    }
    return { ok: false, fieldErrors: {}, formError: UNAVAILABLE };
  }
  refresh();
  return { ok: true, subject: { id: saved.id, name: saved.name } };
}

export async function deleteSubjectAction(subjectId: string): Promise<DeleteSubjectResult> {
  await requireSession();
  try {
    await deleteSubject(subjectId);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(LOGIN_PATH);
      if (error.status === 409) {
        return {
          ok: false,
          error: "Este assunto está em um plano de estudo. Tire o assunto do plano antes de excluir.",
        };
      }
      if (error.status === 404) return { ok: false, error: "Este assunto já foi excluído. Atualize a página." };
    }
    return { ok: false, error: "Não foi possível excluir agora. Tente de novo em instantes." };
  }
  refresh();
  return { ok: true };
}
