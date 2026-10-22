"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { saveExerciseAction, type SavedExercise } from "@/lib/exercises/actions";
import {
  emptyOption,
  LIMITS,
  optionLetter,
  PLACEMENT_LABELS,
  type DraftImage,
  type ExerciseDraft,
  type ExerciseType,
  type ImagePlacement,
} from "@/lib/exercises/model";
import { discardUploadedImage } from "@/lib/exercises/upload";
import { hasErrors, validateExercise, type ExerciseErrors } from "@/lib/exercises/validation";
import type { SkillGroupOption } from "@/lib/skills/model";
import { ImageThumb } from "./image-thumb";
import { ImageUploadButton } from "./image-upload-button";
import { SkillPicker } from "./skill-picker";
import { SubjectPicker } from "./subject-picker";

type ExerciseEditorProps = {
  exerciseId: string | null;
  initialDraft: ExerciseDraft;
  subjects: { id: string; name: string }[];
  skillGroups?: SkillGroupOption[];
  embedded?: { onSaved: (exercise: SavedExercise) => void; onCancel: () => void; submitLabel: string };
};

const typeChoices: { value: ExerciseType; title: string; description: string }[] = [
  { value: "multiple_choice", title: "Múltipla escolha", description: "O aluno escolhe entre alternativas." },
  { value: "open_answer", title: "Resposta aberta", description: "O aluno responde por extenso." },
];

export function ExerciseEditor({ exerciseId, initialDraft, subjects, skillGroups = [], embedded }: ExerciseEditorProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploadedHere] = useState(() => new Set<string>());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty || pending || embedded) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending, embedded]);

  function change(update: (current: ExerciseDraft) => ExerciseDraft) {
    setDraft(update);
    setDirty(true);
  }

  function setField<K extends keyof ExerciseDraft>(field: K, value: ExerciseDraft[K]) {
    change((current) => ({ ...current, [field]: value }));
    if (field in errors) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateOption(key: string, update: Partial<ExerciseDraft["options"][number]>) {
    change((current) => ({
      ...current,
      options: current.options.map((option) => (option.key === key ? { ...option, ...update } : option)),
    }));
    setErrors((current) => {
      const optionText = { ...current.optionText };
      delete optionText[key];
      return { ...current, optionText, options: "isCorrect" in update ? undefined : current.options };
    });
  }

  function moveOption(index: number, delta: number) {
    change((current) => {
      const options = [...current.options];
      const [moved] = options.splice(index, 1);
      options.splice(index + delta, 0, moved);
      return { ...current, options };
    });
  }

  function removeOption(key: string) {
    const option = draft.options.find((item) => item.key === key);
    if (option?.image) releaseImage(option.image.imageId);
    change((current) => ({ ...current, options: current.options.filter((item) => item.key !== key) }));
  }

  function trackUpload(image: DraftImage) {
    uploadedHere.add(image.imageId);
    setUploadError(null);
    return image;
  }

  function releaseImage(imageId: string) {
    if (uploadedHere.has(imageId)) {
      uploadedHere.delete(imageId);
      discardUploadedImage(imageId);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateExercise(draft);
    flushSync(() => {
      setErrors(found);
      setFormError(hasErrors(found) ? "Revise os campos destacados." : null);
    });
    if (hasErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const result = await saveExerciseAction(exerciseId, draft, { stay: Boolean(embedded) });
      if (!result) return;
      if (result.ok) {
        uploadedHere.clear();
        embedded?.onSaved(result.exercise);
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
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }

  const multiple = draft.type === "multiple_choice";
  const imageSlots = LIMITS.images - draft.images.length;

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={`flex max-w-3xl flex-col gap-6 ${embedded ? "" : "pb-28"}`}>
      {formError && (
        <div data-form-error="true" tabIndex={-1} className="outline-none">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}

      <Section title="Tipo de exercício">
        <div role="radiogroup" aria-label="Tipo de exercício" className="grid gap-3 sm:grid-cols-2">
          {typeChoices.map((choice) => {
            const active = draft.type === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => setField("type", choice.value)}
                className={`flex cursor-pointer flex-col items-start rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                <span className={`font-semibold ${active ? "text-primary" : "text-ink"}`}>{choice.title}</span>
                <span className="mt-1 text-sm text-muted">{choice.description}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Conteúdo">
        <TextField
          label="Título"
          name="title"
          value={draft.title}
          maxLength={LIMITS.title + 20}
          placeholder="Ex.: Calcule o seno de 30°"
          hint="Aparece na sua lista de exercícios e na lista dos alunos."
          error={errors.title}
          disabled={pending}
          onChange={(event) => setField("title", event.target.value)}
        />
        <TextAreaField
          label="Enunciado"
          name="statement"
          optional
          value={draft.statement}
          maxLength={LIMITS.text}
          placeholder="Escreva a pergunta completa, com os dados que o aluno precisa."
          error={errors.statement}
          disabled={pending}
          rows={5}
          onChange={(event) => setField("statement", event.target.value)}
        />

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-ink">
              Imagens <span className="font-normal text-muted">(opcional)</span>
            </p>
            <p className="text-sm text-muted">Figuras, gráficos ou fotos. PNG, JPEG, GIF ou WebP de até 5 MB.</p>
          </div>
          {draft.images.length > 0 && (
            <ul className="flex flex-col gap-2">
              {draft.images.map((image, index) => (
                <li key={image.imageId} className="flex items-center gap-3 rounded-2xl border border-border p-2 pr-3">
                  <ImageThumb url={image.url} alt={image.name ?? `Imagem ${index + 1}`} className="size-16" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{image.name ?? `Imagem ${index + 1}`}</p>
                    <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                      Mostrar
                      <select
                        value={image.placement}
                        disabled={pending}
                        onChange={(event) =>
                          change((current) => ({
                            ...current,
                            images: current.images.map((item) =>
                              item.imageId === image.imageId ? { ...item, placement: event.target.value as ImagePlacement } : item,
                            ),
                          }))
                        }
                        className="h-8 cursor-pointer rounded-full border border-border bg-surface px-2 text-xs text-ink focus:outline-2 focus:outline-primary"
                      >
                        {(Object.keys(PLACEMENT_LABELS) as ImagePlacement[]).map((placement) => (
                          <option key={placement} value={placement}>
                            {PLACEMENT_LABELS[placement]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remover ${image.name ?? `imagem ${index + 1}`}`}
                    disabled={pending}
                    onClick={() => {
                      releaseImage(image.imageId);
                      change((current) => ({ ...current, images: current.images.filter((item) => item.imageId !== image.imageId) }));
                    }}
                    className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <ImageUploadButton
              label="Adicionar imagens"
              multiple
              maxFiles={imageSlots}
              disabled={pending}
              onUploaded={(image) =>
                change((current) => ({ ...current, images: [...current.images, { ...trackUpload(image), placement: "statement" }] }))
              }
              onError={setUploadError}
            />
          </div>
          {(uploadError || errors.images) && <Alert tone="error">{uploadError ?? errors.images}</Alert>}
        </div>
      </Section>

      {multiple ? (
        <Section
          title="Alternativas"
          description="Marque uma ou mais alternativas corretas. O aluno só vê a resposta certa depois de responder."
        >
          <ol className="flex flex-col gap-3">
            {draft.options.map((option, index) => {
              const letter = optionLetter(index);
              const error = errors.optionText?.[option.key];
              return (
                <li
                  key={option.key}
                  className={`rounded-2xl border p-3 transition-colors ${
                    option.isCorrect ? "border-success bg-success-soft/50" : "border-border"
                  }`}
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
                        aria-label={`Alternativa ${letter}`}
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
                                if (option.image) releaseImage(option.image.imageId);
                                updateOption(option.key, { image: null });
                              }}
                              className="cursor-pointer rounded-sm text-xs font-medium text-danger hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                              Remover imagem
                            </button>
                          </span>
                        ) : (
                          <ImageUploadButton
                            compact
                            label="Imagem"
                            disabled={pending}
                            onUploaded={(image) => updateOption(option.key, { image: trackUpload(image) })}
                            onError={setUploadError}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col">
                      <OptionControl label={`Mover ${letter} para cima`} disabled={pending || index === 0} onClick={() => moveOption(index, -1)}>
                        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </OptionControl>
                      <OptionControl
                        label={`Mover ${letter} para baixo`}
                        disabled={pending || index === draft.options.length - 1}
                        onClick={() => moveOption(index, 1)}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </OptionControl>
                      <OptionControl
                        label={`Remover alternativa ${letter}`}
                        danger
                        disabled={pending || draft.options.length <= LIMITS.options.min}
                        onClick={() => removeOption(option.key)}
                      >
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </OptionControl>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {errors.options && (
            <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
              {errors.options}
            </p>
          )}
          <div>
            <Button
              variant="secondary"
              icon={<PlusIcon />}
              disabled={pending || draft.options.length >= LIMITS.options.max}
              onClick={() => change((current) => ({ ...current, options: [...current.options, emptyOption()] }))}
            >
              Adicionar alternativa
            </Button>
            {draft.options.length >= LIMITS.options.max && (
              <p className="mt-2 text-sm text-muted">Máximo de {LIMITS.options.max} alternativas.</p>
            )}
          </div>
        </Section>
      ) : (
        <Section title="Resposta esperada" description="Só você vê. Ajuda a corrigir as respostas dos alunos.">
          <TextAreaField
            label="Resposta esperada"
            name="expectedAnswer"
            optional
            value={draft.expectedAnswer}
            maxLength={LIMITS.text}
            placeholder="Ex.: sen 30° = 1/2"
            error={errors.expectedAnswer}
            disabled={pending}
            onChange={(event) => setField("expectedAnswer", event.target.value)}
          />
        </Section>
      )}

      <Section title="Organização">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">Assuntos</p>
          <SubjectPicker
            subjects={subjects}
            selected={draft.subjectIds}
            error={errors.subjects}
            disabled={pending}
            onChange={(ids) => setField("subjectIds", ids)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">Habilidades treinadas</p>
          <SkillPicker
            groups={skillGroups}
            selected={draft.skillIds}
            error={errors.skills}
            disabled={pending}
            onChange={(ids) => setField("skillIds", ids)}
          />
        </div>
        <TextField
          label="Tempo estimado"
          name="estimatedHours"
          optional
          inputMode="decimal"
          placeholder="Ex.: 0,5"
          hint="Em horas: 0,5 = 30 minutos. Sugerido ao aluno quando ele responde; sem ele, o aluno precisa informar o tempo."
          value={draft.estimatedHours}
          error={errors.estimatedHours}
          disabled={pending}
          className="sm:max-w-xs"
          trailing={<span className="pr-4 text-sm text-muted">horas</span>}
          onChange={(event) => setField("estimatedHours", event.target.value)}
        />
      </Section>

      <div
        className={
          embedded
            ? "sticky bottom-0 z-10 -mx-6 -mb-6 rounded-b-3xl border-t border-border bg-surface/95 backdrop-blur"
            : "fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur"
        }
      >
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {dirty ? (
            <ConfirmDialog
              title="Descartar alterações?"
              description="O que você escreveu neste exercício será perdido."
              confirmLabel="Descartar"
              pendingLabel="Saindo…"
              onConfirm={async () => {
                setDirty(false);
                for (const id of uploadedHere) discardUploadedImage(id);
                if (embedded) embedded.onCancel();
                else router.push(EXERCISES_PATH);
                return { ok: true };
              }}
              trigger={(open) => (
                <Button variant="secondary" disabled={pending} onClick={open}>
                  Cancelar
                </Button>
              )}
            />
          ) : embedded ? (
            <Button variant="secondary" disabled={pending} onClick={embedded.onCancel}>
              Cancelar
            </Button>
          ) : (
            <Link
              href={EXERCISES_PATH}
              className="inline-flex h-12 items-center rounded-full px-6 font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancelar
            </Link>
          )}
          <Button type="submit" block={false} loading={pending} loadingLabel="Salvando…">
            {embedded?.submitLabel ?? (exerciseId ? "Salvar alterações" : "Criar exercício")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true">
        <p className="text-lg font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function OptionControl({
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
      className={`inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-canvas hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
