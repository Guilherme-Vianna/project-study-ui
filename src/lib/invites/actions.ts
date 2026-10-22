"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { acceptInvite, createInvite, removeStudent, revokeInvite } from "@/lib/api/enrollments";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { expiresAtFor } from "./validity";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateInviteState = { token: string | null; error: string | null };

const UNAVAILABLE = "Não foi possível concluir agora. Verifique sua conexão e tente de novo.";

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

function failure(error: unknown, messages: Partial<Record<number, string>> = {}): string {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(LOGIN_PATH);
    return messages[error.status] ?? UNAVAILABLE;
  }
  return UNAVAILABLE;
}

export async function createInviteAction(_: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  await requireSession();
  const expiresAt = expiresAtFor(formData.get("validity"));
  if (expiresAt === undefined) return { token: null, error: "Escolha por quanto tempo o link vale." };

  try {
    const invite = await createInvite(expiresAt);
    refresh();
    return { token: invite.token, error: null };
  } catch (error) {
    return { token: null, error: failure(error, { 403: "Só professores podem gerar links de convite." }) };
  }
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  await requireSession();
  try {
    await revokeInvite(inviteId);
  } catch (error) {
    return { ok: false, error: failure(error, { 404: "Este link já não existe. Atualize a página." }) };
  }
  refresh();
  return { ok: true };
}

export async function removeStudentAction(studentId: string): Promise<ActionResult> {
  await requireSession();
  try {
    await removeStudent(studentId);
  } catch (error) {
    return { ok: false, error: failure(error, { 404: "Este aluno já não está na sua lista. Atualize a página." }) };
  }
  refresh();
  return { ok: true };
}

export async function acceptInviteAction(token: string): Promise<ActionResult> {
  await requireSession();
  try {
    await acceptInvite(token);
  } catch (error) {
    return {
      ok: false,
      error: failure(error, {
        403: "Crie seu perfil de aluno antes de aceitar o convite.",
        404: "Não encontramos este convite. Confira o link ou peça um novo ao professor.",
        409: "Você já é aluno deste professor.",
        410: "Este convite expirou ou foi desativado. Peça um novo link ao seu professor.",
      }),
    };
  }
  redirect(`${HOME_PATH}?convite=aceito`);
}
