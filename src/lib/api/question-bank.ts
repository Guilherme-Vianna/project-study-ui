import "server-only";
import type { QuestionCatalog } from "@/lib/question-bank/model";
import { apiFetch } from "./client";

export function getQuestionCatalog() {
  return apiFetch<QuestionCatalog>("/question-bank/catalog");
}
