"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { createExercise } from "@/lib/api/exercises";
import { generateQuestions } from "@/lib/api/question-bank";
import { listMySubjects } from "@/lib/api/subjects";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import {
  PROMPT_LIMIT,
  toGeneratedExercisePayload,
  type GeneratedQuestion,
  type GenerationRequest,
  type GenerationResult,
} from "./model";

export type GenerateResult = { ok: true; result: GenerationResult } | { ok: false; error: string };
export type SaveGeneratedResult = { ok: true; exerciseId: string } | { ok: false; error: string };

async function requireSession() {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);
}

function generationError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) redirect(LOGIN_PATH);
    if (error.status === 403) return "Só professores podem gerar questões.";
    if (error.status === 409) return "O banco de questões ainda está vazio. Importe as provas antes de gerar.";
    if (error.status === 422) return "Revise o pedido: descreva o que quer praticar em até 2000 caracteres.";
    if (error.status === 503) return "A geração com IA não está configurada no servidor.";
    if (error.status === 502) return "A IA não conseguiu gerar as questões desta vez. Tente de novo.";
  }
  return "Não foi possível gerar agora. Seu pedido continua aqui; tente de novo em instantes.";
}

export async function generateQuestionsAction(request: GenerationRequest): Promise<GenerateResult> {
  await requireSession();
  const prompt = request.prompt.trim();
  if (prompt.length < PROMPT_LIMIT.min || prompt.length > PROMPT_LIMIT.max) {
    return { ok: false, error: "Descreva o que você quer praticar (de 3 a 2000 caracteres)." };
  }
  try {
    return { ok: true, result: await generateQuestions({ ...request, prompt }) };
  } catch (error) {
    return { ok: false, error: generationError(error) };
  }
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
