import { PageHeader } from "@/components/app/page-header";
import { AttemptForm } from "@/components/attempts/attempt-form";
import { AttemptAnswers, Chips, CorrectnessBadge, ExerciseStatement, Feedback, ReviewBadge } from "@/components/attempts/attempt-parts";
import type { Attempt, StudentExercise, StudentExerciseEntry } from "@/lib/api/attempts";
import { exerciseKindLabel, formatHours, questionCountLabel, questionTypes } from "@/lib/exercises/model";
import { formatDateTime } from "@/lib/invites/validity";

type ExercisePracticeProps = {
  entry: StudentExerciseEntry;
  attempts: Attempt[];
  back: { href: string; label: string };
  packageId?: string | null;
};

export function ExercisePractice({ entry, attempts, back, packageId = null }: ExercisePracticeProps) {
  const { exercise, attempts_count, locked } = entry;
  const questions = [...exercise.questions].sort((a, b) => a.position - b.position);
  const several = questions.length > 1;
  const latest = attempts[0];
  const kind = exerciseKindLabel(questionTypes(questions));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={back} eyebrow={several ? `${kind} · ${questionCountLabel(questions.length)}` : kind} title={exercise.title} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {(exercise.statement || exercise.images.length > 0 || !several) && (
            <section aria-label="Enunciado" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
              <ExerciseStatement statement={exercise.statement ?? (several ? null : questions[0]?.statement ?? null)} images={exercise.images} />
              <Meta exercise={exercise} />
            </section>
          )}

          <section aria-labelledby="answer-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h2 id="answer-title" className="text-lg font-semibold text-ink">
              {locked ? "Seu resultado" : several ? "Questões" : "Responder"}
            </h2>
            {locked && latest ? (
              <LockedResult questions={questions} attempt={latest} />
            ) : (
              <AttemptForm
                exerciseId={exercise.id}
                packageId={packageId}
                estimatedHours={exercise.estimated_hours}
                attemptsCount={attempts_count}
                questions={questions.map((question) => ({
                  id: question.id,
                  type: question.type,
                  statement: several || exercise.statement ? question.statement : null,
                  options: [...question.options].sort((a, b) => a.position - b.position),
                }))}
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
              {attempts.map((attempt, index) => {
                const texts = attempt.answers.filter((answer) => answer.answer_text).map((answer) => answer.answer_text);
                return (
                  <li key={attempt.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">#{attempts.length - index}</span>
                      <ReviewBadge status={attempt.review_status} />
                      <CorrectnessBadge isCorrect={attempt.is_correct} />
                    </div>
                    <p className="text-xs text-muted">
                      {formatDateTime(attempt.submitted_at)} · {formatHours(attempt.hours)}
                    </p>
                    {texts.length > 0 && <p className="line-clamp-4 whitespace-pre-wrap text-sm text-ink/80">{texts.join("\n")}</p>}
                    {attempt.feedback ? (
                      <Feedback text={attempt.feedback} />
                    ) : (
                      attempt.review_status === "pending" && <p className="text-xs text-muted">O professor ainda não corrigiu.</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Meta({ exercise }: { exercise: StudentExercise }) {
  if (!exercise.estimated_hours && !exercise.subjects.length && !exercise.skills.length) return null;
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

function LockedResult({ questions, attempt }: { questions: StudentExercise["questions"]; attempt: Attempt }) {
  const graded = attempt.answers.filter((answer) => answer.is_correct !== null);
  const right = graded.filter((answer) => answer.is_correct).length;
  const allRight = right === graded.length;
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className={`rounded-2xl border px-4 py-3 text-sm ${
          allRight ? "border-success/40 bg-success-soft text-success-strong" : "border-danger/30 bg-danger-soft text-danger"
        }`}
      >
        {graded.length > 1
          ? `Você acertou ${right} de ${graded.length} questões de múltipla escolha. `
          : allRight
            ? "Você acertou! "
            : "Não foi dessa vez. "}
        <span className="text-ink">
          As alternativas corretas estão em verde. Exercícios com múltipla escolha valem uma resposta só.
          {attempt.answers.some((answer) => answer.question_type === "open_answer") && " As respostas abertas vão para o professor corrigir."}
        </span>
      </div>
      <AttemptAnswers questions={questions} answers={attempt.answers} />
    </div>
  );
}
