import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { QuestionGenerator } from "@/components/question-bank/question-generator";
import { Alert } from "@/components/ui/alert";
import { getQuestionCatalog } from "@/lib/api/question-bank";
import { EXERCISES_PATH, GENERATE_QUESTIONS_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { suggestions } from "@/lib/question-bank/model";

export const metadata: Metadata = {
  title: "Gerar questões com IA",
};

export default function GenerateQuestionsPage() {
  return (
    <>
      <PageHeader
        back={{ href: EXERCISES_PATH, label: "Exercícios" }}
        eyebrow="Banco de questões"
        title="Gerar questões com IA"
        description="Peça um tema e a IA cria questões novas inspiradas em provas reais. Revise e salve as que quiser usar."
      />
      <Suspense fallback={<PageLoading label="Carregando o banco de questões…" />}>
        <GenerateContent />
      </Suspense>
    </>
  );
}

async function GenerateContent() {
  const account = await requireTeacherAccount();
  if (!account) return <ApiUnavailable retryHref={GENERATE_QUESTIONS_PATH} />;
  let catalog;
  try {
    catalog = await getQuestionCatalog();
  } catch {
    return <ApiUnavailable retryHref={GENERATE_QUESTIONS_PATH} />;
  }
  if (catalog.total === 0) {
    return (
      <div className="max-w-2xl">
        <Alert tone="info">O banco de questões ainda está vazio. Importe as provas na API para começar a gerar.</Alert>
      </div>
    );
  }
  return <QuestionGenerator suggestions={suggestions(catalog)} total={catalog.total} />;
}
