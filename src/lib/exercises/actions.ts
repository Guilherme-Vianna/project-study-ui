"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { createExercise, deleteExercise, replaceExercise } from "@/lib/api/exercises";
import { EXERCISES_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { toExercisePayload, type ExerciseDraft, type ExerciseType } from "./model";
import { hasErrors, validateExercise, type ExerciseErrors } from "./validation";

export type SavedExercise = {
  id: string;
  title: string;
  type: ExerciseType;
  estimatedHours: number | null;
  subjects: { id: string; name: string }[];
};
export type SaveExerciseResult =
  | { ok: true; exercise: SavedExercise }
  | { ok: false; errors: ExerciseErrors; formError: string | null };
export type DeleteExerciseResult = { ok: true } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

function saveFailure(error: unknown): SaveExerciseResult {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(LOGIN_PATH);
    if (error.status === 404) {
      return { ok: false, errors: {}, formError: "Este exercício não existe mais. Volte para a lista e atualize." };
    }
    if (error.status === 422) {
      const detail = typeof error.detail === "string" ? error.detail : "";
      if (detail.startsWith("Unknown subjects")) {
        return { ok: false, errors: { subjects: "Algum assunto escolhido foi excluído. Revise os assuntos." }, formError: null };
      }
      if (detail.startsWith("Unknown images")) {
        return { ok: false, errors: { images: "Alguma imagem não está mais disponível. Envie de novo." }, formError: null };
      }
      return { ok: false, errors: {}, formError: "Alguns dados não foram aceitos. Revise o exercício e tente de novo." };
    }
    if (error.status === 403) return { ok: false, errors: {}, formError: "Só professores podem cadastrar exercícios." };
  }
  return { ok: false, errors: {}, formError: "Não foi possível salvar agora. Seus dados continuam aqui; tente de novo." };
}

export async function saveExerciseAction(
  exerciseId: string | null,
  draft: ExerciseDraft,
  { stay = false }: { stay?: boolean } = {},
): Promise<SaveExerciseResult> {
  await requireSession();
  const errors = validateExercise(draft);
  if (hasErrors(errors)) return { ok: false, errors, formError: "Revise os campos destacados." };

  const payload = toExercisePayload(draft);
  let saved;
  try {
    saved = exerciseId ? await replaceExercise(exerciseId, payload) : await createExercise(payload);
  } catch (error) {
    return saveFailure(error);
  }
  if (stay) {
    refresh();
    return {
      ok: true,
      exercise: {
        id: saved.id,
        title: saved.title,
        type: saved.type,
        estimatedHours: saved.estimated_hours,
        subjects: saved.subjects,
      },
    };
  }
  redirect(`${EXERCISES_PATH}?salvo=${exerciseId ? "editado" : "criado"}`);
}

export async function deleteExerciseAction(exerciseId: string): Promise<DeleteExerciseResult> {
  await requireSession();
  try {
    await deleteExercise(exerciseId);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(LOGIN_PATH);
      if (error.status === 409) {
        return {
          ok: false,
          error: "Este exercício está em um plano de estudo ou já tem progresso de alunos, por isso não pode ser excluído.",
        };
      }
      if (error.status === 404) return { ok: false, error: "Este exercício já foi excluído. Atualize a página." };
    }
    return { ok: false, error: "Não foi possível excluir agora. Tente de novo em instantes." };
  }
  refresh();
  return { ok: true };
}
