import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { AttemptAnswers, Chips, CorrectnessBadge, ExerciseStatement, ReviewBadge } from "@/components/attempts/attempt-parts";
import { ReviewForm } from "@/components/attempts/review-form";
import { getAttempt, listAttempts } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { listMyStudents, personName } from "@/lib/api/enrollments";
import { getExercise } from "@/lib/api/exercises";
import { EXERCISES_PATH, REVIEWS_PATH, STUDENTS_PATH } from "@/lib/auth/constants";
import { reviewsHref } from "@/lib/attempts/model";
import { formatHours } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { formatDateTime } from "@/lib/invites/validity";

export const metadata: Metadata = {
  title: "Corrigir resposta",
};

export default function ReviewPage({ params }: PageProps<"/correcoes/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando resposta…" />}>
      <ReviewDetail params={params} />
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
      <h1 className="text-xl font-semibold text-ink">Resposta não encontrada</h1>
      <p className="mt-2 text-muted">Ela não é de um dos seus planos ou não existe mais.</p>
      <Link href={REVIEWS_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
        Ver correções
      </Link>
    </div>
  );
}

async function ReviewDetail({ params }: Pick<PageProps<"/correcoes/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireTeacherAccount(), params]);
  const href = `${REVIEWS_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;

  let attempt;
  try {
    attempt = await getAttempt(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return <NotFound />;
    return <ApiUnavailable retryHref={href} />;
  }

  let data;
  try {
    data = await Promise.all([
      getExercise(attempt.exercise_id).catch((error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
      listMyStudents(),
      listAttempts({ review_status: "pending" }, { limit: 2 }),
    ]);
  } catch {
    return <ApiUnavailable retryHref={href} />;
  }
  const [exercise, students, pending] = data;
  const student = students.find((item) => item.id === attempt.student_id);
  const name = student ? personName(student) || "Aluno sem nome" : "Ex-aluno";
  const nextPending = pending.items.find((item) => item.id !== attempt.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: REVIEWS_PATH, label: "Correções" }}
        eyebrow={`Resposta de ${name}`}
        title={exercise?.title ?? "Exercício excluído"}
        actions={
          nextPending && (
            <Link
              href={`${REVIEWS_PATH}/${nextPending.id}`}
              className="inline-flex h-12 items-center rounded-full border border-border bg-surface px-5 font-medium text-ink hover:border-border-strong hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Próxima para corrigir →
            </Link>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="answer-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="answer-title" className="mr-auto text-lg font-semibold text-ink">
                Resposta do aluno
              </h2>
              <CorrectnessBadge isCorrect={attempt.is_correct} />
              <ReviewBadge status={attempt.review_status} />
            </div>
            <p className="text-sm text-muted">
              Enviada em {formatDateTime(attempt.submitted_at)} · {formatHours(attempt.hours)} de estudo
              {attempt.package_id ? " · Pacote de exercícios" : ""}
            </p>
            {exercise ? (
              <AttemptAnswers questions={exercise.questions} answers={attempt.answers} showExpected />
            ) : (
              <p className="text-sm text-muted">O exercício foi excluído, então as questões não podem ser mostradas.</p>
            )}
          </section>

          {exercise && (
            <section aria-labelledby="statement-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="statement-title" className="text-lg font-semibold text-ink">
                  Enunciado
                </h2>
                <Link href={`${EXERCISES_PATH}/${exercise.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Editar exercício
                </Link>
              </div>
              <ExerciseStatement statement={exercise.statement} images={exercise.images} />
              <Chips items={exercise.skills.map((skill) => ({ id: skill.id, name: skill.name }))} tone="skill" />
            </section>
          )}
        </div>

        <section aria-labelledby="review-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 id="review-title" className="text-lg font-semibold text-ink">
            Sua correção
          </h2>
          {attempt.reviewed_at && <p className="-mt-2 text-sm text-muted">Última correção em {formatDateTime(attempt.reviewed_at)}</p>}
          <ReviewForm attemptId={attempt.id} status={attempt.review_status} feedback={attempt.feedback} />
          <div className="flex flex-col gap-1 border-t border-border pt-4 text-sm">
            {student && (
              <Link href={`${STUDENTS_PATH}/${student.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                Ver perfil e habilidades de {name}
              </Link>
            )}
            <Link
              href={reviewsHref({ status: "all", studentId: attempt.student_id, exerciseId: attempt.exercise_id })}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Outras respostas deste aluno neste exercício
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
