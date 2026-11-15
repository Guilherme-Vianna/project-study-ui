import "server-only";
import type { GenerationRequest, GenerationResult, QuestionCatalog } from "@/lib/question-bank/model";
import { apiFetch } from "./client";

export function getQuestionCatalog() {
  return apiFetch<QuestionCatalog>("/question-bank/catalog");
}

export function generateQuestions(request: GenerationRequest) {
  return apiFetch<GenerationResult>("/question-bank/generations", { method: "POST", json: request });
}
