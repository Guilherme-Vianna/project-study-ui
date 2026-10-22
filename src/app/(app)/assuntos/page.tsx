import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { SubjectBoard } from "@/components/subjects/subject-board";
import { listMySubjects } from "@/lib/api/subjects";
import { HOME_PATH, ONBOARDING_PATH, SUBJECTS_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { formatDate } from "@/lib/invites/validity";

export const metadata: Metadata = {
  title: "Assuntos",
};

export default function SubjectsPage() {
  return (
    <>
      <PageHeader
        title="Assuntos"
        description="Os temas que seus alunos vão estudar, como Trigonometria, Inglês ou Gramática. Você usa os assuntos para organizar exercícios e planos de estudo."
      />
      <Suspense fallback={<PageLoading label="Carregando assuntos…" />}>
        <SubjectsContent />
      </Suspense>
    </>
  );
}

async function SubjectsContent() {
  const { account } = await loadCurrentAccount();
  if (!account) return <ApiUnavailable retryHref={SUBJECTS_PATH} />;
  if (!account.role) redirect(ONBOARDING_PATH);
  if (account.role !== "teacher") redirect(HOME_PATH);

  let subjects;
  try {
    subjects = await listMySubjects();
  } catch {
    return <ApiUnavailable retryHref={SUBJECTS_PATH} />;
  }

  return (
    <SubjectBoard
      subjects={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        createdAt: subject.created_at,
        createdLabel: formatDate(subject.created_at),
      }))}
    />
  );
}
