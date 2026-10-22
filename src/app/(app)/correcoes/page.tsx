import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { CorrectnessBadge, ReviewBadge } from "@/components/attempts/attempt-parts";
import { ReviewFilters } from "@/components/attempts/review-filters";
import { listAttempts } from "@/lib/api/attempts";
import { listMyStudents, personName } from "@/lib/api/enrollments";
import { listMyExercises } from "@/lib/api/exercises";
import { REVIEWS_PATH } from "@/lib/auth/constants";
import { reviewsHref, statusFromParam } from "@/lib/attempts/model";
import { EXERCISE_TYPE_LABELS, formatHours } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { formatDateTime } from "@/lib/invites/validity";
import { initialsOf } from "@/lib/people";

export const metadata: Metadata = {
  title: "Correções",
};

const PAGE_SIZE = 20;

export default function ReviewsPage({ searchParams }: PageProps<"/correcoes">) {
  return (
    <>
      <PageHeader
        title="Correções"
        description="Respostas dos seus alunos. Aprove ou rejeite com um comentário; o aluno vê na hora."
      />
      <Suspense fallback={<PageLoading label="Carregando respostas…" />}>
        <ReviewsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

async function ReviewsContent({ searchParams }: Pick<PageProps<"/correcoes">, "searchParams">) {
  const [account, params] = await Promise.all([requireTeacherAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={REVIEWS_PATH} />;

  const status = statusFromParam(params.status);
  const studentId = param(params.aluno);
  const exerciseId = param(params.exercicio);
  const page = Math.max(1, Number.parseInt(param(params.pagina), 10) || 1);
  const retry = reviewsHref({ status, studentId, exerciseId, page });

  let data;
  try {
    data = await Promise.all([
      listAttempts(
        { review_status: status === "all" ? undefined : status, student_id: studentId || undefined, exercise_id: exerciseId || undefined },
        { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
      ),
      listMyStudents(),
      listMyExercises(),
    ]);
  } catch {
    return <ApiUnavailable retryHref={retry} />;
  }
  const [result, students, exercises] = data;
  const studentNames = new Map(students.map((student) => [student.id, personName(student) || "Aluno sem nome"]));
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filtered = Boolean(studentId || exerciseId);

  return (
    <div className="flex flex-col gap-4">
      <ReviewFilters
        status={status}
        studentId={studentId}
        exerciseId={exerciseId}
        students={[...studentNames].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
        exercises={exercises.map(({ id, title }) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))}
      />
      <p aria-live="polite" className="text-sm text-muted">
        {result.total} {result.total === 1 ? "resposta" : "respostas"}
      </p>

      {result.items.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <p className="font-medium text-ink">{status === "pending" && !filtered ? "Nada para corrigir agora 🎉" : "Nenhuma resposta encontrada"}</p>
          <p className="mt-1 text-sm text-muted">
            {status === "pending" && !filtered
              ? "Quando seus alunos responderem exercícios, as respostas aparecem aqui."
              : "Tente outra situação ou limpe os filtros."}
          </p>
          {filtered && (
            <Link href={reviewsHref({ status })} className="mt-3 inline-flex font-medium text-primary underline-offset-4 hover:underline">
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
          {result.items.map((attempt) => {
            const name = studentNames.get(attempt.student_id) ?? "Ex-aluno";
            const exercise = exerciseById.get(attempt.exercise_id);
            return (
              <li key={attempt.id}>
                <Link
                  href={`${REVIEWS_PATH}/${attempt.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                >
                  <span aria-hidden="true" className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary sm:flex">
                    {initialsOf(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{exercise?.title ?? "Exercício excluído"}</p>
                    <p className="text-sm text-muted">
                      {name} · {EXERCISE_TYPE_LABELS[attempt.exercise_type]} · {formatDateTime(attempt.submitted_at)} · {formatHours(attempt.hours)}
                    </p>
                    {attempt.answer_text && <p className="mt-1 line-clamp-1 text-sm text-ink/70">{attempt.answer_text}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <CorrectnessBadge isCorrect={attempt.is_correct} />
                    <ReviewBadge status={attempt.review_status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={reviewsHref({ status, studentId, exerciseId, page: page - 1 })} className="font-medium text-primary underline-offset-4 hover:underline">
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={reviewsHref({ status, studentId, exerciseId, page: page + 1 })} className="font-medium text-primary underline-offset-4 hover:underline">
              Próximas →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
