"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { createExercise } from "@/lib/api/exercises";
import { listMySubjects } from "@/lib/api/subjects";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { toGeneratedExercisePayload, type GeneratedQuestion } from "./model";

export type SaveGeneratedResult = { ok: true; exerciseId: string } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

export async function saveGeneratedQuestionAction(question: GeneratedQuestion): Promise<SaveGeneratedResult> {
  await requireSession();
  try {
    const subjects = await listMySubjects();
    const exercise = await createExercise(toGeneratedExercisePayload(question, subjects));
    refresh();
    return { ok: true, exerciseId: exercise.id };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect(LOGIN_PATH);
      if (error.status === 422) return { ok: false, error: "Esta questão não pôde ser salva como exercício. Gere outra." };
    }
    return { ok: false, error: "Não foi possível salvar agora. Tente de novo." };
  }
}
