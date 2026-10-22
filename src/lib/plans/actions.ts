"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { assignPlan, createPlan, deletePlan, endAssignment, replacePlan } from "@/lib/api/plans";
import { LOGIN_PATH, PLANS_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import type { PlanDraft } from "./model";
import { hasPlanErrors, toPlanPayload, validatePlan, type PlanErrors } from "./validation";

export type SavePlanResult = { ok: false; errors: PlanErrors; formError: string | null };
export type PlanActionResult = { ok: true } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

function apiMessage(error: unknown, messages: Partial<Record<number, string>>, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(LOGIN_PATH);
    return messages[error.status] ?? fallback;
  }
  return fallback;
}

export async function savePlanAction(planId: string | null, draft: PlanDraft): Promise<SavePlanResult> {
  await requireSession();
  const errors = validatePlan(draft);
  if (hasPlanErrors(errors)) return { ok: false, errors, formError: "Revise os campos destacados." };

  let savedId: string;
  try {
    const saved = planId ? await replacePlan(planId, toPlanPayload(draft)) : await createPlan(toPlanPayload(draft));
    savedId = saved.id;
  } catch (error) {
    return {
      ok: false,
      errors: {},
      formError: apiMessage(
        error,
        {
          404: "Este plano não existe mais. Volte para a lista.",
          422: "Algum assunto escolhido foi excluído. Revise o plano e tente de novo.",
          403: "Só professores podem criar planos de estudo.",
        },
        "Não foi possível salvar agora. Seus dados continuam aqui; tente de novo.",
      ),
    };
  }
  redirect(`${PLANS_PATH}/${savedId}?salvo=${planId ? "editado" : "criado"}`);
}

export async function deletePlanAction(planId: string): Promise<PlanActionResult> {
  await requireSession();
  try {
    await deletePlan(planId);
  } catch (error) {
    return {
      ok: false,
      error: apiMessage(
        error,
        {
          409: "Este plano já foi atribuído a alunos e fica guardado com as respostas deles. Edite o plano em vez de excluir.",
          404: "Este plano já foi excluído.",
        },
        "Não foi possível excluir agora. Tente de novo em instantes.",
      ),
    };
  }
  redirect(`${PLANS_PATH}?excluido=1`);
}

export async function assignPlanAction(planId: string, studentId: string): Promise<PlanActionResult> {
  await requireSession();
  try {
    await assignPlan(planId, studentId);
  } catch (error) {
    return {
      ok: false,
      error: apiMessage(
        error,
        {
          404: "Este aluno não está mais na sua lista. Atualize a página.",
          409: "Este aluno já tem um plano ativo. Encerre o plano atual dele antes de atribuir outro.",
        },
        "Não foi possível atribuir agora. Tente de novo em instantes.",
      ),
    };
  }
  refresh();
  return { ok: true };
}

export async function endAssignmentAction(planId: string, assignmentId: string): Promise<PlanActionResult> {
  await requireSession();
  try {
    await endAssignment(planId, assignmentId);
  } catch (error) {
    return {
      ok: false,
      error: apiMessage(error, { 404: "Esta atribuição já foi encerrada. Atualize a página." }, "Não foi possível encerrar agora."),
    };
  }
  refresh();
  return { ok: true };
}
