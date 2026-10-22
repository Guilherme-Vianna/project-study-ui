import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { ExerciseBoard, NEW_EXERCISE_LINK } from "@/components/exercises/exercise-board";
import { Alert } from "@/components/ui/alert";
import { PlusIcon } from "@/components/ui/icons";
import { listMyExercises } from "@/lib/api/exercises";
import { listMySubjects } from "@/lib/api/subjects";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { formatHours } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { formatDate } from "@/lib/invites/validity";

export const metadata: Metadata = {
  title: "Exercícios",
};

export default function ExercisesPage({ searchParams }: PageProps<"/exercicios">) {
  return (
    <>
      <PageHeader
        title="Exercícios"
        description="Questões de múltipla escolha ou de resposta aberta. Os alunos veem as que têm algum assunto do plano deles."
        actions={
          <Link href={`${EXERCISES_PATH}/novo`} className={NEW_EXERCISE_LINK}>
            <PlusIcon />
            Novo exercício
          </Link>
        }
      />
      <Suspense fallback={<PageLoading label="Carregando exercícios…" />}>
        <ExercisesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExercisesContent({ searchParams }: Pick<PageProps<"/exercicios">, "searchParams">) {
  const [account, params] = await Promise.all([requireTeacherAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={EXERCISES_PATH} />;

  let data;
  try {
    data = await Promise.all([listMyExercises(), listMySubjects()]);
  } catch {
    return <ApiUnavailable retryHref={EXERCISES_PATH} />;
  }
  const [exercises, subjects] = data;
  const saved = params.salvo;

  return (
    <div className="flex flex-col gap-4">
      {saved === "criado" && <Alert tone="success">Exercício criado.</Alert>}
      {saved === "editado" && <Alert tone="success">Alterações salvas.</Alert>}
      <ExerciseBoard
        subjects={subjects.map(({ id, name }) => ({ id, name }))}
        exercises={exercises.map((exercise) => ({
          id: exercise.id,
          title: exercise.title,
          type: exercise.type,
          statementPreview: exercise.statement ? exercise.statement.slice(0, 300) : null,
          subjects: exercise.subjects,
          skills: exercise.skills,
          hoursLabel: exercise.estimated_hours ? formatHours(exercise.estimated_hours) : null,
          imageCount: exercise.images.length + exercise.options.filter((option) => option.image).length,
          optionCount: exercise.options.length,
          updatedAt: exercise.updated_at,
          updatedLabel: formatDate(exercise.updated_at),
        }))}
      />
    </div>
  );
}
