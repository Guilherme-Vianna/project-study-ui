import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { NoPlan } from "@/components/practice/no-plan";
import { PracticeList } from "@/components/practice/practice-list";
import { listPlanExercises } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { getMyStudyPlan } from "@/lib/api/plans";
import { MY_PLAN_PATH, PRACTICE_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";
import { formatHours } from "@/lib/exercises/model";
import { formatDate } from "@/lib/invites/validity";

export const metadata: Metadata = {
  title: "Exercícios",
};

export default function PracticePage() {
  return (
    <>
      <PageHeader
        back={{ href: MY_PLAN_PATH, label: "Meu plano" }}
        title="Exercícios"
        description="Todos os exercícios dos assuntos do seu plano. Abra um para responder e ver a correção do professor."
      />
      <Suspense fallback={<PageLoading label="Carregando exercícios…" />}>
        <PracticeContent />
      </Suspense>
    </>
  );
}

async function PracticeContent() {
  const account = await requireStudentAccount();
  if (!account) return <ApiUnavailable retryHref={PRACTICE_PATH} />;

  let data;
  try {
    data = await Promise.all([getMyStudyPlan(), listPlanExercises()]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return <NoPlan />;
    return <ApiUnavailable retryHref={PRACTICE_PATH} />;
  }
  const [plan, entries] = data;

  return (
    <PracticeList
      subjects={plan.subjects.map((item) => item.subject)}
      items={entries.map(({ exercise, attempts_count, last_attempt_at, locked }) => ({
        id: exercise.id,
        title: exercise.title,
        type: exercise.type,
        subjects: exercise.subjects,
        skills: exercise.skills,
        hoursLabel: exercise.estimated_hours ? formatHours(exercise.estimated_hours) : null,
        attemptsCount: attempts_count,
        lastAttemptLabel: last_attempt_at ? formatDate(last_attempt_at) : null,
        locked,
      }))}
    />
  );
}
