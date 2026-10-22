import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PlanEditor } from "@/components/plans/plan-editor";
import { listMyExercises } from "@/lib/api/exercises";
import { listMySubjects } from "@/lib/api/subjects";
import { PLANS_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { toExerciseOptions, toSubjectOptions } from "@/lib/plans/from-api";
import { emptyPlanDraft } from "@/lib/plans/model";

export const metadata: Metadata = {
  title: "Novo plano de estudo",
};

export default function NewPlanPage() {
  return (
    <>
      <PageHeader
        back={{ href: PLANS_PATH, label: "Planos" }}
        title="Novo plano de estudo"
        description="Escolha os assuntos com a meta de horas por semana e os exercícios. Esqueceu de cadastrar algo? Crie aqui mesmo."
      />
      <Suspense fallback={<PageLoading />}>
        <NewPlanForm />
      </Suspense>
    </>
  );
}

async function NewPlanForm() {
  const account = await requireTeacherAccount();
  if (!account) return <ApiUnavailable retryHref={`${PLANS_PATH}/novo`} />;
  let data;
  try {
    data = await Promise.all([listMySubjects(), listMyExercises()]);
  } catch {
    return <ApiUnavailable retryHref={`${PLANS_PATH}/novo`} />;
  }
  const [subjects, exercises] = data;
  return (
    <PlanEditor
      planId={null}
      initialDraft={emptyPlanDraft()}
      subjects={toSubjectOptions(subjects)}
      exercises={toExerciseOptions(exercises)}
      cancelHref={PLANS_PATH}
    />
  );
}
