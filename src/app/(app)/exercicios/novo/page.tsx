import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { ExerciseEditor } from "@/components/exercises/exercise-editor";
import { listSkillGroups } from "@/lib/api/skills";
import { listMySubjects } from "@/lib/api/subjects";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { emptyDraft } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { toSkillGroupOptions } from "@/lib/skills/from-api";

export const metadata: Metadata = {
  title: "Novo exercício",
};

export default function NewExercisePage() {
  return (
    <>
      <PageHeader back={{ href: EXERCISES_PATH, label: "Exercícios" }} title="Novo exercício" />
      <Suspense fallback={<PageLoading />}>
        <NewExerciseForm />
      </Suspense>
    </>
  );
}

async function NewExerciseForm() {
  const account = await requireTeacherAccount();
  if (!account) return <ApiUnavailable retryHref={`${EXERCISES_PATH}/novo`} />;
  let data;
  try {
    data = await Promise.all([listMySubjects(), listSkillGroups()]);
  } catch {
    return <ApiUnavailable retryHref={`${EXERCISES_PATH}/novo`} />;
  }
  const [subjects, groups] = data;
  return (
    <ExerciseEditor
      exerciseId={null}
      initialDraft={emptyDraft()}
      subjects={subjects.map(({ id, name }) => ({ id, name }))}
      skillGroups={toSkillGroupOptions(groups)}
    />
  );
}
