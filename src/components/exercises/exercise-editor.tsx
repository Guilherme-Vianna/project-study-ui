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
  emptyQuestion,
  IMAGE_UPLOADS_ENABLED,
  LIMITS,
  PLACEMENT_LABELS,
  type DraftImage,
  type DraftQuestion,
  type ExerciseDraft,
  type ImagePlacement,
} from "@/lib/exercises/model";
import { discardUploadedImage } from "@/lib/exercises/upload";
import { hasErrors, validateExercise, type ExerciseErrors, type QuestionErrors } from "@/lib/exercises/validation";
import type { SkillGroupOption } from "@/lib/skills/model";
import { ImageThumb } from "./image-thumb";
import { ImageUploadButton } from "./image-upload-button";
import { QuestionEditor } from "./question-editor";
import { SkillPicker } from "./skill-picker";
import { SubjectPicker } from "./subject-picker";

type ExerciseEditorProps = {
  exerciseId: string | null;
  initialDraft: ExerciseDraft;
  subjects: { id: string; name: string }[];
  skillGroups?: SkillGroupOption[];
  embedded?: { onSaved: (exercise: SavedExercise) => void; onCancel: () => void; submitLabel: string };
};

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

  function updateQuestion(
    key: string,
    update: (current: DraftQuestion) => DraftQuestion,
    clear?: keyof QuestionErrors | "all",
  ) {
    change((current) => ({
      ...current,
      questions: current.questions.map((question) => (question.key === key ? update(question) : question)),
    }));
    if (clear) clearQuestionError(key, clear);
  }

  function clearQuestionError(key: string, field: keyof QuestionErrors | "all", optionKey?: string) {
    setErrors((current) => {
      const existing = current.questionErrors?.[key];
      if (!existing) return current;
      const next: QuestionErrors = field === "all" ? {} : { ...existing, [field]: undefined };
      if (optionKey && next.optionText) {
        next.optionText = { ...next.optionText };
        delete next.optionText[optionKey];
      }
      return { ...current, questionErrors: { ...current.questionErrors, [key]: next } };
    });
  }

  function moveQuestion(index: number, delta: number) {
    change((current) => {
      const questions = [...current.questions];
      const [moved] = questions.splice(index, 1);
      questions.splice(index + delta, 0, moved);
      return { ...current, questions };
    });
  }

  function removeQuestion(key: string) {
    const question = draft.questions.find((item) => item.key === key);
    for (const option of question?.options ?? []) if (option.image) releaseImage(option.image.imageId);
    change((current) => ({ ...current, questions: current.questions.filter((item) => item.key !== key) }));
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

  const imageSlots = LIMITS.images - draft.images.length;

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className={`flex max-w-3xl flex-col gap-6 ${embedded ? "" : "pb-28"}`}>
      {formError && (
        <div data-form-error="true" tabIndex={-1} className="outline-none">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}

      <Section title="Exercício">
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
          label="Enunciado geral"
          name="statement"
          optional
          value={draft.statement}
          maxLength={LIMITS.text}
          placeholder="Texto, contexto ou instruções que valem para todas as questões."
          hint="Use para um texto de leitura ou instruções comuns. Cada questão abaixo tem a sua própria pergunta."
          error={errors.statement}
          disabled={pending}
          rows={5}
          onChange={(event) => setField("statement", event.target.value)}
        />

        {(IMAGE_UPLOADS_ENABLED || draft.images.length > 0) && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-ink">
              Imagens <span className="font-normal text-muted">(opcional)</span>
            </p>
            {IMAGE_UPLOADS_ENABLED && <p className="text-sm text-muted">Figuras, gráficos ou fotos. PNG, JPEG, GIF ou WebP de até 5 MB.</p>}
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
          {IMAGE_UPLOADS_ENABLED && (
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
          )}
          {(uploadError || errors.images) && <Alert tone="error">{uploadError ?? errors.images}</Alert>}
        </div>
        )}
      </Section>

      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Questões</h2>
          <p className="text-sm text-muted">
            Um exercício pode ter várias questões, de múltipla escolha ou abertas. O aluno responde todas de uma vez.
          </p>
        </div>
        {draft.questions.map((question, index) => (
          <QuestionEditor
            key={question.key}
            question={question}
            number={index + 1}
            total={draft.questions.length}
            errors={errors.questionErrors?.[question.key]}
            pending={pending}
            onChange={(update, clear) => updateQuestion(question.key, update, clear)}
            onClearOptionError={(optionKey) => clearQuestionError(question.key, "optionText", optionKey)}
            onMove={(delta) => moveQuestion(index, delta)}
            onRemove={() => removeQuestion(question.key)}
            onUploaded={trackUpload}
            onReleaseImage={releaseImage}
            onUploadError={setUploadError}
          />
        ))}
        {errors.questions && (
          <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
            {errors.questions}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            block={false}
            icon={<PlusIcon />}
            disabled={pending || draft.questions.length >= LIMITS.questions}
            onClick={() => change((current) => ({ ...current, questions: [...current.questions, emptyQuestion("multiple_choice")] }))}
          >
            Questão de múltipla escolha
          </Button>
          <Button
            variant="secondary"
            block={false}
            icon={<PlusIcon />}
            disabled={pending || draft.questions.length >= LIMITS.questions}
            onClick={() => change((current) => ({ ...current, questions: [...current.questions, emptyQuestion("open_answer")] }))}
          >
            Questão aberta
          </Button>
        </div>
      </div>

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
