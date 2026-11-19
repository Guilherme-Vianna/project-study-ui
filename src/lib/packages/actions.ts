"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { createPackage, deletePackage, releasePackage, replacePackage, revokePackage } from "@/lib/api/packages";
import { LOGIN_PATH, PACKAGES_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { hasPackageErrors, toPackagePayload, validatePackage, type PackageDraft, type PackageErrors } from "./model";

export type SavePackageResult = { ok: false; errors: PackageErrors; formError: string | null };
export type PackageActionResult = { ok: true } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

function failure(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(LOGIN_PATH);
    if (error.status === 404) return "Este pacote ou aluno não está mais disponível. Atualize a página.";
  }
  return fallback;
}

export async function savePackageAction(packageId: string | null, draft: PackageDraft): Promise<SavePackageResult> {
  await requireSession();
  const errors = validatePackage(draft);
  if (hasPackageErrors(errors)) return { ok: false, errors, formError: "Revise os campos destacados." };
  let saved;
  try {
    const payload = toPackagePayload(draft);
    saved = packageId ? await replacePackage(packageId, payload) : await createPackage(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      return { ok: false, errors: { exercises: "Algum exercício escolhido foi excluído. Revise a lista." }, formError: null };
    }
    return { ok: false, errors: {}, formError: failure(error, "Não foi possível salvar agora. Seus dados continuam aqui; tente de novo.") };
  }
  redirect(`${PACKAGES_PATH}/${saved.id}?salvo=${packageId ? "editado" : "criado"}`);
}

export async function deletePackageAction(packageId: string): Promise<PackageActionResult> {
  await requireSession();
  try {
    await deletePackage(packageId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return {
        ok: false,
        error: "Seus alunos já responderam exercícios deste pacote, por isso ele não pode ser excluído. Você pode bloquear o acesso dos alunos.",
      };
    }
    return { ok: false, error: failure(error, "Não foi possível excluir agora. Tente de novo em instantes.") };
  }
  redirect(PACKAGES_PATH);
}

export async function releasePackageAction(packageId: string, studentIds: string[]): Promise<PackageActionResult> {
  await requireSession();
  if (studentIds.length === 0) return { ok: false, error: "Escolha pelo menos um aluno." };
  try {
    await releasePackage(packageId, studentIds);
  } catch (error) {
    return { ok: false, error: failure(error, "Não foi possível liberar agora. Tente de novo em instantes.") };
  }
  refresh();
  return { ok: true };
}

export async function revokePackageAction(packageId: string, studentId: string): Promise<PackageActionResult> {
  await requireSession();
  try {
    await revokePackage(packageId, studentId);
  } catch (error) {
    return { ok: false, error: failure(error, "Não foi possível bloquear agora. Tente de novo em instantes.") };
  }
  refresh();
  return { ok: true };
}
