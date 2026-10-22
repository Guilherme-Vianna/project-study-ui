import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { ExerciseEditor } from "@/components/exercises/exercise-editor";
import { ApiError } from "@/lib/api/client";
import { getExercise } from "@/lib/api/exercises";
import { listMySubjects } from "@/lib/api/subjects";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { draftFromExercise } from "@/lib/exercises/from-api";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";

export const metadata: Metadata = {
  title: "Editar exercício",
};

export default function EditExercisePage({ params }: PageProps<"/exercicios/[id]">) {
  return (
    <>
      <PageHeader back={{ href: EXERCISES_PATH, label: "Exercícios" }} title="Editar exercício" />
      <Suspense fallback={<PageLoading />}>
        <EditExerciseForm params={params} />
      </Suspense>
    </>
  );
}

async function EditExerciseForm({ params }: Pick<PageProps<"/exercicios/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireTeacherAccount(), params]);
  const retry = `${EXERCISES_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={retry} />;

  let data;
  try {
    data = await Promise.all([getExercise(id), listMySubjects()]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return (
        <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
          <h2 className="text-xl font-semibold text-ink">Exercício não encontrado</h2>
          <p className="mt-2 text-muted">Ele pode ter sido excluído. Volte para a lista para ver seus exercícios.</p>
          <Link href={EXERCISES_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
            Ver exercícios
          </Link>
        </div>
      );
    }
    return <ApiUnavailable retryHref={retry} />;
  }
  const [exercise, subjects] = data;
  return (
    <ExerciseEditor
      exerciseId={exercise.id}
      initialDraft={draftFromExercise(exercise)}
      subjects={subjects.map(({ id: subjectId, name }) => ({ id: subjectId, name }))}
    />
  );
}
