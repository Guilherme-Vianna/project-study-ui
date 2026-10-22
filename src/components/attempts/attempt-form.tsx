"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ImageThumb } from "@/components/exercises/image-thumb";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { submitAttemptAction } from "@/lib/attempts/actions";
import { hasAttemptErrors, validateAttempt, type AttemptDraft, type AttemptErrors } from "@/lib/attempts/model";
import { formatHours, LIMITS, optionLetter, type ExerciseType } from "@/lib/exercises/model";
import { hoursToInput } from "@/lib/plans/model";

type AttemptFormProps = {
  exerciseId: string;
  type: ExerciseType;
  estimatedHours: number | null;
  options: { id: string; text: string | null; image: { url: string | null } | null }[];
  attemptsCount: number;
};

export function AttemptForm({ exerciseId, type, estimatedHours, options, attemptsCount }: AttemptFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const optionsId = useId();
  const blank = (): AttemptDraft => ({ answerText: "", selectedOptionIds: [], spentHours: hoursToInput(estimatedHours) });
  const [draft, setDraft] = useState<AttemptDraft>(blank);
  const [errors, setErrors] = useState<AttemptErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const multiple = type === "multiple_choice";
  const exercise = { type, estimatedHours };

  function update(patch: Partial<AttemptDraft>, field: keyof AttemptErrors) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice(null);
  }

  function toggleOption(id: string) {
    const selected = draft.selectedOptionIds.includes(id)
      ? draft.selectedOptionIds.filter((item) => item !== id)
      : [...draft.selectedOptionIds, id];
    update({ selectedOptionIds: selected }, "options");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateAttempt(draft, exercise);
    flushSync(() => {
      setErrors(found);
      setFormError(hasAttemptErrors(found) ? "Revise os campos destacados." : null);
    });
    if (hasAttemptErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const result = await submitAttemptAction(exerciseId, exercise, draft);
      if (result.ok) {
        setDraft(blank());
        setNotice(multiple ? "Resposta enviada! Veja o resultado abaixo." : "Resposta enviada! Ela aparece no seu histórico e vai para o professor corrigir.");
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

      {multiple ? (
        <fieldset className="flex flex-col gap-2" aria-describedby={`${optionsId}-hint`}>
          <legend className="text-sm font-medium text-ink">Escolha a resposta</legend>
          <p id={`${optionsId}-hint`} className={`-mt-1 mb-1 text-sm ${errors.options ? "text-danger" : "text-muted"}`}>
            {errors.options ?? "Pode haver mais de uma correta. Você só pode responder uma vez, então revise antes de enviar."}
          </p>
          {options.map((option, index) => {
            const checked = draft.selectedOptionIds.includes(option.id);
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
                  data-error={errors.options && index === 0 ? "true" : undefined}
                  onChange={() => toggleOption(option.id)}
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
      ) : (
        <TextAreaField
          label={attemptsCount > 0 ? "Nova resposta" : "Sua resposta"}
          name="answer"
          value={draft.answerText}
          maxLength={LIMITS.text}
          rows={8}
          placeholder="Escreva sua resposta com as suas palavras."
          hint="Você pode responder quantas vezes quiser. Cada resposta vai para o professor corrigir."
          error={errors.answer}
          disabled={pending}
          onChange={(event) => update({ answerText: event.target.value }, "answer")}
        />
      )}

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
        onChange={(event) => update({ spentHours: event.target.value }, "hours")}
      />

      <div>
        <Button type="submit" block={false} loading={pending} loadingLabel="Enviando…">
          {multiple ? "Enviar resposta" : attemptsCount > 0 ? "Enviar nova resposta" : "Enviar resposta"}
        </Button>
      </div>
    </form>
  );
}
