"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ImageThumb } from "@/components/exercises/image-thumb";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { submitAttemptAction } from "@/lib/attempts/actions";
import {
  emptyAnswer,
  hasAttemptErrors,
  validateAttempt,
  type AnswerDraft,
  type AttemptDraft,
  type AttemptErrors,
} from "@/lib/attempts/model";
import { formatHours, LIMITS, optionLetter, type ExerciseType } from "@/lib/exercises/model";
import { hoursToInput } from "@/lib/plans/model";

export type AttemptFormQuestion = {
  id: string;
  type: ExerciseType;
  statement: string | null;
  options: { id: string; text: string | null; image: { url: string | null } | null }[];
};

type AttemptFormProps = {
  exerciseId: string;
  packageId?: string | null;
  estimatedHours: number | null;
  questions: AttemptFormQuestion[];
  attemptsCount: number;
};

export function AttemptForm({ exerciseId, packageId = null, estimatedHours, questions, attemptsCount }: AttemptFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const blank = (): AttemptDraft => ({ answers: {}, spentHours: hoursToInput(estimatedHours) });
  const [draft, setDraft] = useState<AttemptDraft>(blank);
  const [errors, setErrors] = useState<AttemptErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const singleAttempt = questions.some((question) => question.type === "multiple_choice");
  const several = questions.length > 1;
  const exercise = { questions: questions.map(({ id, type }) => ({ id, type })), estimatedHours };

  function updateAnswer(questionId: string, patch: Partial<AnswerDraft>) {
    setDraft((current) => ({
      ...current,
      answers: { ...current.answers, [questionId]: { ...(current.answers[questionId] ?? emptyAnswer()), ...patch } },
    }));
    setErrors((current) => {
      const answers = { ...current.answers };
      delete answers[questionId];
      return { ...current, answers };
    });
    setNotice(null);
  }

  function toggleOption(questionId: string, optionId: string) {
    const selected = draft.answers[questionId]?.selectedOptionIds ?? [];
    updateAnswer(questionId, {
      selectedOptionIds: selected.includes(optionId) ? selected.filter((item) => item !== optionId) : [...selected, optionId],
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateAttempt(draft, exercise);
    flushSync(() => {
      setErrors(found);
      setFormError(hasAttemptErrors(found) ? (several ? "Responda todas as questões destacadas." : "Revise os campos destacados.") : null);
    });
    if (hasAttemptErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const result = await submitAttemptAction({ packageId }, exerciseId, exercise, draft);
      if (result.ok) {
        setDraft(blank());
        setNotice(
          singleAttempt
            ? "Resposta enviada! Veja o resultado abaixo."
            : "Resposta enviada! Ela aparece no seu histórico e vai para o professor corrigir.",
        );
        return;
      }
      flushSync(() => {
        setErrors(result.errors);
        setFormError(result.formError);
      });
      focusFirstError();
    });
  }

  function focusFirstError() {
    const target =
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]') ??
      formRef.current?.querySelector<HTMLElement>('[data-form-error="true"]');
    target?.focus();
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      {formError && (
        <div data-form-error="true" tabIndex={-1} className="outline-none">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}
      {notice && <Alert tone="success">{notice}</Alert>}
      {singleAttempt && (
        <p className="text-sm text-muted">
          Este exercício tem questões de múltipla escolha: você só pode enviar uma vez, então revise antes de enviar.
        </p>
      )}

      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <li key={question.id} className={several ? "rounded-2xl border border-border p-4" : undefined}>
            <QuestionAnswer
              question={question}
              number={several ? index + 1 : null}
              answer={draft.answers[question.id] ?? emptyAnswer()}
              error={errors.answers?.[question.id]}
              pending={pending}
              repeat={attemptsCount > 0}
              onToggle={(optionId) => toggleOption(question.id, optionId)}
              onText={(text) => updateAnswer(question.id, { answerText: text })}
            />
          </li>
        ))}
      </ol>

      <TextField
        label="Quanto tempo você estudou?"
        name="spentHours"
        optional={estimatedHours !== null}
        inputMode="decimal"
        placeholder="Ex.: 0,5"
        hint={
          estimatedHours !== null
            ? `Em horas (0,5 = 30 minutos). O professor estimou ${formatHours(estimatedHours)}; ajuste se foi diferente.`
            : "Em horas (0,5 = 30 minutos). Conta para a sua meta semanal."
        }
        value={draft.spentHours}
        error={errors.hours}
        disabled={pending}
        className="sm:max-w-xs"
        trailing={<span className="pr-4 text-sm text-muted">horas</span>}
        onChange={(event) => {
          const spentHours = event.target.value;
          setDraft((current) => ({ ...current, spentHours }));
          setErrors((current) => ({ ...current, hours: undefined }));
        }}
      />

      <div>
        <Button type="submit" block={false} loading={pending} loadingLabel="Enviando…">
          {!singleAttempt && attemptsCount > 0 ? "Enviar nova resposta" : several ? "Enviar respostas" : "Enviar resposta"}
        </Button>
      </div>
    </form>
  );
}

function QuestionAnswer({
  question,
  number,
  answer,
  error,
  pending,
  repeat,
  onToggle,
  onText,
}: {
  question: AttemptFormQuestion;
  number: number | null;
  answer: AnswerDraft;
  error: string | undefined;
  pending: boolean;
  repeat: boolean;
  onToggle: (optionId: string) => void;
  onText: (text: string) => void;
}) {
  const heading = number ? `Questão ${number}` : null;
  const statement = question.statement && <p className="mb-3 whitespace-pre-wrap text-ink">{question.statement}</p>;

  if (question.type === "multiple_choice") {
    const hintId = `${question.id}-hint`;
    return (
      <fieldset className="flex flex-col gap-2" aria-describedby={hintId}>
        <legend className="mb-2 text-sm font-semibold text-ink">{heading ?? "Escolha a resposta"}</legend>
        {statement}
        <p id={hintId} className={`-mt-1 mb-1 text-sm ${error ? "text-danger" : "text-muted"}`}>
          {error ?? "Pode haver mais de uma correta."}
        </p>
        {question.options.map((option, index) => {
          const checked = answer.selectedOptionIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-primary ${
                checked ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={pending}
                data-error={error && index === 0 ? "true" : undefined}
                onChange={() => onToggle(option.id)}
              />
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${checked ? "bg-primary text-white" : "bg-canvas text-ink"}`}
              >
                {optionLetter(index)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="sr-only">Alternativa {optionLetter(index)}: </span>
                {option.text && <span className="block whitespace-pre-wrap text-ink">{option.text}</span>}
                {option.image && <ImageThumb url={option.image.url} alt={`Imagem da alternativa ${optionLetter(index)}`} className="mt-2 size-24" />}
              </span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <div>
      {heading && <p className="mb-2 text-sm font-semibold text-ink">{heading}</p>}
      {statement}
      <TextAreaField
        label={heading ? `Resposta da ${heading.toLowerCase()}` : repeat ? "Nova resposta" : "Sua resposta"}
        name={`answer-${question.id}`}
        value={answer.answerText}
        maxLength={LIMITS.text}
        rows={number ? 5 : 8}
        placeholder="Escreva sua resposta com as suas palavras."
        hint={number ? undefined : "Você pode responder quantas vezes quiser. Cada resposta vai para o professor corrigir."}
        error={error}
        disabled={pending}
        onChange={(event) => onText(event.target.value)}
      />
    </div>
  );
}
