import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PlanNotFound } from "@/components/plans/plan-not-found";
import { ApiError } from "@/lib/api/client";
import { listMyExercises } from "@/lib/api/exercises";
import { getPlan, listActiveAssignments } from "@/lib/api/plans";
import { listSkillGroups } from "@/lib/api/skills";
import { listMySubjects } from "@/lib/api/subjects";
import { PLANS_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { toSkillGroupOptions } from "@/lib/skills/from-api";
import { planToDraft, toExerciseOptions, toSubjectOptions } from "@/lib/plans/from-api";

export const metadata: Metadata = {
  title: "Editar plano",
};

export default function EditPlanPage({ params }: PageProps<"/planos/[id]/editar">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditPlan params={params} />
    </Suspense>
  );
}

async function EditPlan({ params }: Pick<PageProps<"/planos/[id]/editar">, "params">) {
  const [account, { id }] = await Promise.all([requireTeacherAccount(), params]);
  const detailHref = `${PLANS_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={`${detailHref}/editar`} />;

  let data;
  try {
    data = await Promise.all([getPlan(id), listMySubjects(), listMyExercises(), listActiveAssignments(id), listSkillGroups()]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return <PlanNotFound />;
    return <ApiUnavailable retryHref={`${detailHref}/editar`} />;
  }
  const [plan, subjects, exercises, assignments, groups] = data;

  return (
    <>
      <PageHeader back={{ href: detailHref, label: plan.title }} title="Editar plano" />
      <PlanEditor
        planId={plan.id}
        initialDraft={planToDraft(plan)}
        subjects={toSubjectOptions(subjects)}
        exercises={toExerciseOptions(exercises)}
        skillGroups={toSkillGroupOptions(groups)}
        cancelHref={detailHref}
        assignedCount={assignments.length}
      />
    </>
  );
}
