"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { TextAreaField } from "@/components/ui/text-area-field";
import {
  emptyOption,
  EXERCISE_TYPE_LABELS,
  IMAGE_UPLOADS_ENABLED,
  LIMITS,
  optionLetter,
  type DraftImage,
  type DraftOption,
  type DraftQuestion,
  type ExerciseType,
} from "@/lib/exercises/model";
import type { QuestionErrors } from "@/lib/exercises/validation";
import { ImageThumb } from "./image-thumb";
import { ImageUploadButton } from "./image-upload-button";

type QuestionEditorProps = {
  question: DraftQuestion;
  number: number;
  total: number;
  errors: QuestionErrors | undefined;
  pending: boolean;
  onChange: (update: (current: DraftQuestion) => DraftQuestion, clear?: keyof QuestionErrors | "all") => void;
  onClearOptionError: (optionKey: string) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onUploaded: (image: DraftImage) => DraftImage;
  onReleaseImage: (imageId: string) => void;
  onUploadError: (message: string) => void;
};

const typeChoices: { value: ExerciseType; description: string }[] = [
  { value: "multiple_choice", description: "O aluno escolhe entre alternativas." },
  { value: "open_answer", description: "O aluno responde por extenso." },
];

export function QuestionEditor({
  question,
  number,
  total,
  errors,
  pending,
  onChange,
  onClearOptionError,
  onMove,
  onRemove,
  onUploaded,
  onReleaseImage,
  onUploadError,
}: QuestionEditorProps) {
  const multiple = question.type === "multiple_choice";
  const label = `Questão ${number}`;

  function setType(type: ExerciseType) {
    onChange(
      (current) => ({
        ...current,
        type,
        options: type === "multiple_choice" && current.options.length === 0 ? [emptyOption(), emptyOption(), emptyOption(), emptyOption()] : current.options,
      }),
      "all",
    );
  }

  function updateOption(key: string, update: Partial<DraftOption>) {
    onChange(
      (current) => ({ ...current, options: current.options.map((option) => (option.key === key ? { ...option, ...update } : option)) }),
      "isCorrect" in update ? "options" : undefined,
    );
    onClearOptionError(key);
  }

  function moveOption(index: number, delta: number) {
    onChange((current) => {
      const options = [...current.options];
      const [moved] = options.splice(index, 1);
      options.splice(index + delta, 0, moved);
      return { ...current, options };
    });
  }

  function removeOption(option: DraftOption) {
    if (option.image) onReleaseImage(option.image.imageId);
    onChange((current) => ({ ...current, options: current.options.filter((item) => item.key !== option.key) }));
  }

  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <p aria-hidden="true" className="text-lg font-semibold text-ink">
          {label}
        </p>
        {total > 1 && (
          <div className="ml-auto flex items-center">
            <IconButton label={`Mover ${label.toLowerCase()} para cima`} disabled={pending || number === 1} onClick={() => onMove(-1)}>
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </IconButton>
            <IconButton label={`Mover ${label.toLowerCase()} para baixo`} disabled={pending || number === total} onClick={() => onMove(1)}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </IconButton>
            <IconButton label={`Remover ${label.toLowerCase()}`} danger disabled={pending} onClick={onRemove}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </IconButton>
          </div>
        )}
      </div>

      <div role="radiogroup" aria-label={`Tipo da ${label.toLowerCase()}`} className="grid gap-3 sm:grid-cols-2">
        {typeChoices.map((choice) => {
          const active = question.type === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => setType(choice.value)}
              className={`flex cursor-pointer flex-col items-start rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <span className={`text-sm font-semibold ${active ? "text-primary" : "text-ink"}`}>{EXERCISE_TYPE_LABELS[choice.value]}</span>
              <span className="mt-0.5 text-xs text-muted">{choice.description}</span>
            </button>
          );
        })}
      </div>

      <TextAreaField
        label="Pergunta"
        name={`question-${question.key}-statement`}
        optional={total === 1}
        value={question.statement}
        maxLength={LIMITS.text}
        placeholder="Ex.: Qual é o valor de sen 30°?"
        error={errors?.statement}
        disabled={pending}
        rows={3}
        onChange={(event) => {
          const statement = event.target.value;
          onChange((current) => ({ ...current, statement }), "statement");
        }}
      />

      {multiple ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Alternativas</p>
            <p className="text-sm text-muted">Marque uma ou mais corretas. O aluno só vê a resposta certa depois de responder.</p>
          </div>
          <ol className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              const letter = optionLetter(index);
              const error = errors?.optionText?.[option.key];
              return (
                <li
                  key={option.key}
                  className={`rounded-2xl border p-3 transition-colors ${option.isCorrect ? "border-success bg-success-soft/50" : "border-border"}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        option.isCorrect ? "bg-success text-white" : "bg-canvas text-ink"
                      }`}
                    >
                      {letter}
                    </span>
                    <div className="min-w-0 flex-1">
                      <textarea
                        aria-label={`${label}, alternativa ${letter}`}
                        aria-invalid={error ? true : undefined}
                        value={option.text}
                        rows={2}
                        maxLength={LIMITS.text}
                        disabled={pending}
                        placeholder={`Texto da alternativa ${letter}`}
                        onChange={(event) => updateOption(option.key, { text: event.target.value })}
                        className={`w-full resize-y rounded-xl border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted focus:outline-2 ${
                          error ? "border-danger focus:outline-danger" : "border-border-strong focus:border-primary focus:outline-primary"
                        }`}
                      />
                      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={option.isCorrect}
                          disabled={pending}
                          onClick={() => updateOption(option.key, { isCorrect: !option.isCorrect })}
                          className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            option.isCorrect
                              ? "border-success bg-success text-white"
                              : "border-border bg-surface text-ink hover:border-success hover:text-success-strong"
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {option.isCorrect ? "Correta" : "Marcar como correta"}
                        </button>
                        {option.image ? (
                          <span className="inline-flex items-center gap-2">
                            <ImageThumb url={option.image.url} alt={`Imagem da alternativa ${letter}`} className="size-12" />
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                if (option.image) onReleaseImage(option.image.imageId);
                                updateOption(option.key, { image: null });
                              }}
                              className="cursor-pointer rounded-sm text-xs font-medium text-danger hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              Remover imagem
                            </button>
                          </span>
                        ) : (
                          IMAGE_UPLOADS_ENABLED && (
                          <ImageUploadButton
                            compact
                            label="Imagem"
                            disabled={pending}
                            onUploaded={(image) => updateOption(option.key, { image: onUploaded(image) })}
                            onError={onUploadError}
                          />
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col">
                      <IconButton label={`Mover ${letter} para cima`} disabled={pending || index === 0} onClick={() => moveOption(index, -1)}>
                        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </IconButton>
                      <IconButton
                        label={`Mover ${letter} para baixo`}
                        disabled={pending || index === question.options.length - 1}
                        onClick={() => moveOption(index, 1)}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </IconButton>
                      <IconButton
                        label={`Remover alternativa ${letter}`}
                        danger
                        disabled={pending || question.options.length <= LIMITS.options.min}
                        onClick={() => removeOption(option)}
                      >
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {errors?.options && (
            <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
              {errors.options}
            </p>
          )}
          <div>
            <Button
              variant="secondary"
              icon={<PlusIcon />}
              disabled={pending || question.options.length >= LIMITS.options.max}
              onClick={() => onChange((current) => ({ ...current, options: [...current.options, emptyOption()] }))}
            >
              Adicionar alternativa
            </Button>
            {question.options.length >= LIMITS.options.max && (
              <p className="mt-2 text-sm text-muted">Máximo de {LIMITS.options.max} alternativas.</p>
            )}
          </div>
        </div>
      ) : (
        <TextAreaField
          label="Resposta esperada"
          name={`question-${question.key}-expected`}
          optional
          value={question.expectedAnswer}
          maxLength={LIMITS.text}
          placeholder="Ex.: sen 30° = 1/2"
          hint="Só você vê. Ajuda a corrigir as respostas dos alunos."
          error={errors?.expectedAnswer}
          disabled={pending}
          onChange={(event) => {
            const expectedAnswer = event.target.value;
            onChange((current) => ({ ...current, expectedAnswer }), "expectedAnswer");
          }}
        />
      )}
    </fieldset>
  );
}

function IconButton({
  label,
  disabled,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-canvas hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
