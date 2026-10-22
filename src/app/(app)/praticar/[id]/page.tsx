import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { AttemptForm } from "@/components/attempts/attempt-form";
import { AnsweredOptions, Chips, CorrectnessBadge, ExerciseStatement, Feedback, ReviewBadge } from "@/components/attempts/attempt-parts";
import { getPlanExercise, listMyAttempts, type Attempt, type StudentExercise } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { PRACTICE_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";
import { EXERCISE_TYPE_LABELS, formatHours } from "@/lib/exercises/model";
import { formatDateTime } from "@/lib/invites/validity";

export const metadata: Metadata = {
  title: "Responder exercício",
};

export default function PracticeExercisePage({ params }: PageProps<"/praticar/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando exercício…" />}>
      <PracticeExercise params={params} />
    </Suspense>
  );
}

async function PracticeExercise({ params }: Pick<PageProps<"/praticar/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireStudentAccount(), params]);
  const href = `${PRACTICE_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;

  let data;
  try {
    data = await Promise.all([getPlanExercise(id), listMyAttempts(id)]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return (
        <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold text-ink">Exercício não encontrado</h1>
          <p className="mt-2 text-muted">Ele não está mais no seu plano de estudo. Volte para a lista para ver os exercícios disponíveis.</p>
          <Link href={PRACTICE_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
            Ver exercícios
          </Link>
        </div>
      );
    }
    return <ApiUnavailable retryHref={href} />;
  }
  const [{ exercise, attempts_count, locked }, attempts] = data;
  const multiple = exercise.type === "multiple_choice";
  const latest = attempts[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: PRACTICE_PATH, label: "Exercícios" }} eyebrow={EXERCISE_TYPE_LABELS[exercise.type]} title={exercise.title} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Enunciado" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <ExerciseStatement statement={exercise.statement} images={exercise.images} />
            <Meta exercise={exercise} />
          </section>

          <section aria-labelledby="answer-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h2 id="answer-title" className="text-lg font-semibold text-ink">
              {multiple && locked ? "Seu resultado" : "Responder"}
            </h2>
            {multiple && locked && latest ? (
              <MultipleChoiceResult exercise={exercise} attempt={latest} />
            ) : (
              <AttemptForm
                exerciseId={exercise.id}
                type={exercise.type}
                estimatedHours={exercise.estimated_hours}
                attemptsCount={attempts_count}
                options={[...exercise.options].sort((a, b) => a.position - b.position).map(({ id: optionId, text, image }) => ({ id: optionId, text, image }))}
              />
            )}
          </section>
        </div>

        <section aria-labelledby="history-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 lg:sticky lg:top-24">
          <h2 id="history-title" className="text-lg font-semibold text-ink">
            Suas respostas
          </h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted">Você ainda não respondeu este exercício.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {attempts.map((attempt, index) => (
                <li key={attempt.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">#{attempts.length - index}</span>
                    <ReviewBadge status={attempt.review_status} />
                    <CorrectnessBadge isCorrect={attempt.is_correct} />
                  </div>
                  <p className="text-xs text-muted">
                    {formatDateTime(attempt.submitted_at)} · {formatHours(attempt.hours)}
                  </p>
                  {attempt.answer_text && <p className="line-clamp-4 whitespace-pre-wrap text-sm text-ink/80">{attempt.answer_text}</p>}
                  {attempt.feedback ? (
                    <Feedback text={attempt.feedback} />
                  ) : (
                    attempt.review_status === "pending" && <p className="text-xs text-muted">O professor ainda não corrigiu.</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Meta({ exercise }: { exercise: StudentExercise }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {exercise.estimated_hours && <p className="text-sm text-muted">Tempo estimado: {formatHours(exercise.estimated_hours)}</p>}
      {exercise.subjects.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted">Assuntos</p>
          <Chips items={exercise.subjects} />
        </div>
      )}
      {exercise.skills.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted">Habilidades que este exercício treina</p>
          <Chips items={exercise.skills.map((skill) => ({ id: skill.id, name: `${skill.name} · ${skill.group.name}` }))} tone="skill" />
        </div>
      )}
    </div>
  );
}

function MultipleChoiceResult({ exercise, attempt }: { exercise: StudentExercise; attempt: Attempt }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className={`rounded-2xl border px-4 py-3 text-sm ${
          attempt.is_correct ? "border-success/40 bg-success-soft text-success-strong" : "border-danger/30 bg-danger-soft text-danger"
        }`}
      >
        {attempt.is_correct ? "Você acertou! " : "Não foi dessa vez. "}
        <span className="text-ink">As alternativas corretas estão em verde. Exercícios de múltipla escolha valem uma resposta por plano.</span>
      </div>
      <AnsweredOptions options={exercise.options} selected={attempt.selected_option_ids} correct={attempt.correct_option_ids} />
    </div>
  );
}
