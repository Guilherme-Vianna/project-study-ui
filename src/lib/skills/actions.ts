"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  assessStudentSkill,
  createSkillGroup,
  deleteSkillGroup,
  getStudentSkillHistory,
  removeStudentSkill,
  replaceSkillGroup,
} from "@/lib/api/skills";
import { LOGIN_PATH, SKILLS_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/invites/validity";
import { hasSkillGroupErrors, SKILL_LIMITS, toSkillGroupPayload, validateSkillGroup, type SkillGroupDraft, type SkillGroupErrors } from "./model";

export type SaveSkillGroupResult = { ok: false; errors: SkillGroupErrors; formError: string | null };
export type SkillActionResult = { ok: true } | { ok: false; error: string };
export type SkillHistoryItem = { id: string; levelName: string; notes: string | null; whenLabel: string; removed: boolean };
export type SkillHistoryResult = { ok: true; items: SkillHistoryItem[] } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

function detailOf(error: unknown) {
  return error instanceof ApiError && typeof error.detail === "string" ? error.detail : "";
}

function failure(error: unknown, messages: Partial<Record<number, string>>, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(LOGIN_PATH);
    return messages[error.status] ?? fallback;
  }
  return fallback;
}

function saveFailure(error: unknown): SaveSkillGroupResult {
  const detail = detailOf(error);
  if (error instanceof ApiError && error.status === 409) {
    if (detail.includes("already exists")) return { ok: false, errors: { name: "Você já tem um grupo com esse nome." }, formError: null };
    if (detail.includes("assigned to students")) {
      return {
        ok: false,
        errors: {},
        formError: "Você tirou um nível ou uma habilidade que já está na avaliação de algum aluno. Mantenha o item ou mude a avaliação do aluno antes.",
      };
    }
    if (detail.includes("used by exercises")) {
      return {
        ok: false,
        errors: {},
        formError: "Você tirou uma habilidade usada em exercícios. Mantenha a habilidade ou tire-a dos exercícios antes.",
      };
    }
  }
  return {
    ok: false,
    errors: {},
    formError: failure(
      error,
      {
        404: "Este grupo não existe mais. Volte para a lista.",
        422: "Algum dado não foi aceito. Revise os nomes e tente de novo.",
        403: "Só professores podem cadastrar habilidades.",
      },
      "Não foi possível salvar agora. Seus dados continuam aqui; tente de novo.",
    ),
  };
}

export async function saveSkillGroupAction(
  groupId: string | null,
  draft: SkillGroupDraft,
  existingNames: string[] = [],
): Promise<SaveSkillGroupResult> {
  await requireSession();
  const errors = validateSkillGroup(draft, existingNames);
  if (hasSkillGroupErrors(errors)) return { ok: false, errors, formError: "Revise os campos destacados." };
  try {
    const payload = toSkillGroupPayload(draft);
    if (groupId) await replaceSkillGroup(groupId, payload);
    else await createSkillGroup(payload);
  } catch (error) {
    return saveFailure(error);
  }
  redirect(`${SKILLS_PATH}?salvo=${groupId ? "editado" : "criado"}`);
}

export async function deleteSkillGroupAction(groupId: string): Promise<SkillActionResult> {
  await requireSession();
  try {
    await deleteSkillGroup(groupId);
  } catch (error) {
    const detail = detailOf(error);
    const conflict = detail.includes("used by exercises")
      ? "Alguma habilidade deste grupo está em exercícios. Tire-a dos exercícios antes de excluir o grupo."
      : "Alguma habilidade deste grupo já foi avaliada em alunos, por isso o grupo não pode ser excluído.";
    return {
      ok: false,
      error: failure(error, { 409: conflict, 404: "Este grupo já foi excluído. Atualize a página." }, "Não foi possível excluir agora. Tente de novo em instantes."),
    };
  }
  refresh();
  return { ok: true };
}

export async function assessStudentSkillAction(
  studentId: string,
  skillId: string,
  levelId: string,
  notes: string,
): Promise<SkillActionResult> {
  await requireSession();
  if (!levelId) return { ok: false, error: "Escolha um nível." };
  const trimmed = notes.trim();
  if (trimmed.length > SKILL_LIMITS.notes) return { ok: false, error: `Use até ${SKILL_LIMITS.notes} caracteres nas observações.` };
  try {
    await assessStudentSkill(studentId, skillId, levelId, trimmed || null);
  } catch (error) {
    return {
      ok: false,
      error: failure(
        error,
        {
          404: "Este aluno ou esta habilidade não está mais disponível. Atualize a página.",
          422: "Este nível não pertence ao grupo da habilidade. Atualize a página e tente de novo.",
          409: "Outra avaliação foi salva ao mesmo tempo. Tente de novo.",
        },
        "Não foi possível salvar a avaliação agora. Tente de novo.",
      ),
    };
  }
  refresh();
  return { ok: true };
}

export async function removeStudentSkillAction(studentId: string, skillId: string): Promise<SkillActionResult> {
  await requireSession();
  try {
    await removeStudentSkill(studentId, skillId);
  } catch (error) {
    return {
      ok: false,
      error: failure(error, { 404: "Esta avaliação já foi removida. Atualize a página." }, "Não foi possível remover agora. Tente de novo."),
    };
  }
  refresh();
  return { ok: true };
}

export async function loadSkillHistoryAction(studentId: string, skillId: string): Promise<SkillHistoryResult> {
  await requireSession();
  try {
    const entries = await getStudentSkillHistory(studentId, skillId);
    return {
      ok: true,
      items: entries.map((entry, index) => ({
        id: `${entry.valid_from}-${index}`,
        levelName: entry.level_name ?? (entry.level_position === null ? "Nível removido" : `Nível ${entry.level_position + 1}`),
        notes: entry.notes,
        whenLabel: formatDateTime(entry.valid_from),
        removed: entry.operation === "delete",
      })),
    };
  } catch (error) {
    return { ok: false, error: failure(error, {}, "Não foi possível carregar a evolução agora.") };
  }
}
