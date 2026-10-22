"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ExerciseEditor } from "@/components/exercises/exercise-editor";
import { SubjectFormDialog, type SubjectDraft } from "@/components/subjects/subject-form-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BooksIcon, ClipboardIcon, PlusIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import type { SavedExercise } from "@/lib/exercises/actions";
import { emptyDraft, EXERCISE_TYPE_LABELS, formatHours } from "@/lib/exercises/model";
import { savePlanAction } from "@/lib/plans/actions";
import { hoursToInput, PLAN_LIMITS, type ExerciseOption, type PlanDraft, type SubjectOption } from "@/lib/plans/model";
import { allocatedTotal, hasPlanErrors, validatePlan, weeklyTotal, type PlanErrors } from "@/lib/plans/validation";
import { ExercisePickerDialog } from "./exercise-picker-dialog";
import { WeekdayPicker } from "./weekday-picker";

type PlanEditorProps = {
  planId: string | null;
  initialDraft: PlanDraft;
  subjects: SubjectOption[];
  exercises: ExerciseOption[];
  cancelHref: string;
  assignedCount?: number;
};

const iconButton =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30";

export function PlanEditor({ planId, initialDraft, subjects: initialSubjects, exercises: initialExercises, cancelHref, assignedCount = 0 }: PlanEditorProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [subjects, setSubjects] = useState(initialSubjects);
  const [exercises, setExercises] = useState(initialExercises);
  const [errors, setErrors] = useState<PlanErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingExercise, setCreatingExercise] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty || pending) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const planSubjectIds = draft.subjects.map((item) => item.subjectId);
  const unusedSubjects = subjects.filter((subject) => !planSubjectIds.includes(subject.id));
  const missingFromExercises = [
    ...new Map(
      draft.exercises
        .flatMap((item) => exerciseById.get(item.exerciseId)?.subjects ?? [])
        .filter((subject) => !planSubjectIds.includes(subject.id))
        .map((subject) => [subject.id, subject]),
    ).values(),
  ];
  const weekly = weeklyTotal(draft);
  const allocated = allocatedTotal(draft, exercises);

  function change(update: (current: PlanDraft) => PlanDraft) {
    setDraft(update);
    setDirty(true);
    setNotice(null);
  }

  function addSubjects(ids: string[]) {
    change((current) => ({
      ...current,
      subjects: [...current.subjects, ...ids.filter((id) => !current.subjects.some((item) => item.subjectId === id)).map((subjectId) => ({ subjectId, weeklyHours: "", weekdays: [] }))],
    }));
  }

  function updateSubject(subjectId: string, update: Partial<PlanDraft["subjects"][number]>) {
    change((current) => ({
      ...current,
      subjects: current.subjects.map((item) => (item.subjectId === subjectId ? { ...item, ...update } : item)),
    }));
    if ("weeklyHours" in update) {
      setErrors((current) => {
        const subjectHours = { ...current.subjectHours };
        delete subjectHours[subjectId];
        return { ...current, subjectHours, subjects: undefined };
      });
    }
  }

  function addExercises(ids: string[]) {
    change((current) => ({
      ...current,
      exercises: [...current.exercises, ...ids.filter((id) => !current.exercises.some((item) => item.exerciseId === id)).map((exerciseId) => ({ exerciseId, allocatedHours: "" }))],
    }));
  }

  function moveExercise(index: number, delta: number) {
    change((current) => {
      const list = [...current.exercises];
      const [moved] = list.splice(index, 1);
      list.splice(index + delta, 0, moved);
      return { ...current, exercises: list };
    });
  }

  function handleSubjectCreated(subject: { id: string; name: string }, created: boolean) {
    setSubjectDraft(null);
    if (!created) return;
    setSubjects((current) => [...current, subject].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    addSubjects([subject.id]);
    setNotice(`Assunto “${subject.name}” criado e adicionado ao plano. Defina a meta semanal dele.`);
  }

  function handleExerciseCreated(exercise: SavedExercise) {
    setCreatingExercise(false);
    setExercises((current) => [...current, exercise]);
    addExercises([exercise.id]);
    setNotice(`Exercício “${exercise.title}” criado e adicionado ao plano.`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePlan(draft, exercises);
    flushSync(() => {
      setErrors(found);
      setFormError(hasPlanErrors(found) ? "Revise os campos destacados." : null);
    });
    if (hasPlanErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const result = await savePlanAction(planId, draft, exercises);
      if (!result) return;
      flushSync(() => {
        setErrors(result.errors);
        setFormError(result.formError);
      });
      focusFirstError();
    });
  }

  function focusFirstError() {
    const form = formRef.current;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]') ?? form?.querySelector<HTMLElement>('[data-form-error="true"]');
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }

  return (
    <>
      <form ref={formRef} noValidate onSubmit={handleSubmit} className="grid items-start gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          {formError && (
            <div data-form-error="true" tabIndex={-1} className="outline-none">
              <Alert tone="error">{formError}</Alert>
            </div>
          )}
          {notice && <Alert tone="success">{notice}</Alert>}
          {planId && assignedCount > 0 && (
            <Alert tone="info">
              Este plano está com {assignedCount} {assignedCount === 1 ? "aluno" : "alunos"}. As mudanças valem para todos; o que eles já
              concluíram continua contando.
            </Alert>
          )}

          <Section title="Sobre o plano">
            <TextField
              label="Nome do plano"
              name="title"
              value={draft.title}
              maxLength={PLAN_LIMITS.title + 20}
              placeholder="Ex.: Preparação ENEM — 1º bimestre"
              error={errors.title}
              disabled={pending}
              onChange={(event) => {
                change((current) => ({ ...current, title: event.target.value }));
                setErrors((current) => ({ ...current, title: undefined }));
              }}
            />
            <TextAreaField
              label="Descrição"
              name="description"
              optional
              value={draft.description}
              maxLength={PLAN_LIMITS.description}
              placeholder="Objetivo do plano, orientações para os alunos…"
              error={errors.description}
              disabled={pending}
              onChange={(event) => change((current) => ({ ...current, description: event.target.value }))}
            />
          </Section>

          <Section
            title="Assuntos e metas semanais"
            description="Quantas horas por semana o aluno deve estudar cada assunto. Os dias são uma sugestão."
            icon={<BooksIcon className="size-5" />}
          >
            {draft.subjects.length > 0 && (
              <ul className="flex flex-col gap-3">
                {draft.subjects.map((item) => {
                  const subject = subjectById.get(item.subjectId);
                  const name = subject?.name ?? "Assunto removido";
                  const error = errors.subjectHours?.[item.subjectId];
                  return (
                    <li key={item.subjectId} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{name}</p>
                        <div className="mt-2">
                          <WeekdayPicker
                            label={`Dias sugeridos para ${name}`}
                            value={item.weekdays}
                            disabled={pending}
                            onChange={(weekdays) => updateSubject(item.subjectId, { weekdays })}
                          />
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-36">
                          <label className="sr-only" htmlFor={`weekly-${item.subjectId}`}>
                            Horas por semana de {name}
                          </label>
                          <div className="relative">
                            <input
                              id={`weekly-${item.subjectId}`}
                              inputMode="decimal"
                              value={item.weeklyHours}
                              placeholder="Ex.: 3"
                              aria-invalid={error ? true : undefined}
                              disabled={pending}
                              onChange={(event) => updateSubject(item.subjectId, { weeklyHours: event.target.value })}
                              className={`h-11 w-full rounded-full border bg-surface pl-4 pr-16 text-base text-ink placeholder:text-muted focus:outline-2 ${
                                error ? "border-danger focus:outline-danger" : "border-border-strong focus:border-primary focus:outline-primary"
                              }`}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted">h/sem</span>
                          </div>
                          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label={`Tirar ${name} do plano`}
                          title="Tirar do plano"
                          disabled={pending}
                          onClick={() => change((current) => ({ ...current, subjects: current.subjects.filter((entry) => entry.subjectId !== item.subjectId) }))}
                          className={`${iconButton} mt-1 hover:bg-danger-soft hover:text-danger`}
                        >
                          <XIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {missingFromExercises.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent-soft p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm text-ink">
                  Os exercícios do plano usam {missingFromExercises.length === 1 ? "um assunto que não está" : "assuntos que não estão"} aqui:{" "}
                  <strong>{new Intl.ListFormat("pt-BR").format(missingFromExercises.map((subject) => subject.name))}</strong>.
                </p>
                <Button variant="secondary" disabled={pending} onClick={() => addSubjects(missingFromExercises.map((subject) => subject.id))}>
                  Adicionar ao plano
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">{draft.subjects.length ? "Adicionar mais assuntos" : "Escolha os assuntos do plano"}</p>
              <div className="flex flex-wrap gap-2">
                {unusedSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    disabled={pending || draft.subjects.length >= PLAN_LIMITS.subjects}
                    onClick={() => addSubjects([subject.id])}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm text-ink hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    <PlusIcon className="size-4" />
                    {subject.name}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setSubjectDraft({ id: null, name: "", description: "" })}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-primary px-3 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <PlusIcon className="size-4" />
                  Novo assunto
                </button>
              </div>
            </div>
            {errors.subjects && (
              <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
                {errors.subjects}
              </p>
            )}
          </Section>

          <Section
            title="Exercícios"
            description="Na ordem em que o aluno deve fazer. As horas de cada um contam para a meta dos assuntos dele."
            icon={<ClipboardIcon className="size-5" />}
          >
            {draft.exercises.length === 0 ? (
              <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">Nenhum exercício no plano ainda.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {draft.exercises.map((item, index) => {
                  const exercise = exerciseById.get(item.exerciseId);
                  const title = exercise?.title ?? "Exercício removido";
                  const error = errors.exerciseHours?.[item.exerciseId];
                  return (
                    <li key={item.exerciseId} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-start">
                      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-semibold text-ink">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{title}</p>
                        {exercise && (
                          <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
                            <span>{EXERCISE_TYPE_LABELS[exercise.type]}</span>
                            {exercise.subjects.map((subject) => (
                              <span key={subject.id} className="rounded-full border border-border bg-canvas px-2 py-0.5 text-ink">
                                {subject.name}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-1">
                        <div className="w-36">
                          <label className="sr-only" htmlFor={`hours-${item.exerciseId}`}>
                            Horas para {title}
                          </label>
                          <div className="relative">
                            <input
                              id={`hours-${item.exerciseId}`}
                              inputMode="decimal"
                              value={item.allocatedHours}
                              placeholder={exercise?.estimatedHours ? hoursToInput(exercise.estimatedHours) : "Ex.: 1"}
                              aria-invalid={error ? true : undefined}
                              disabled={pending}
                              onChange={(event) => {
                                const allocatedHours = event.target.value;
                                change((current) => ({
                                  ...current,
                                  exercises: current.exercises.map((entry) => (entry.exerciseId === item.exerciseId ? { ...entry, allocatedHours } : entry)),
                                }));
                                setErrors((current) => {
                                  const exerciseHours = { ...current.exerciseHours };
                                  delete exerciseHours[item.exerciseId];
                                  return { ...current, exerciseHours };
                                });
                              }}
                              className={`h-10 w-full rounded-full border bg-surface pl-4 pr-8 text-sm text-ink placeholder:text-muted focus:outline-2 ${
                                error ? "border-danger focus:outline-danger" : "border-border-strong focus:border-primary focus:outline-primary"
                              }`}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">h</span>
                          </div>
                          {error ? (
                            <p className="mt-1 text-xs text-danger">{error}</p>
                          ) : (
                            exercise?.estimatedHours != null &&
                            !item.allocatedHours && <p className="mt-1 text-xs text-muted">Padrão do exercício: {formatHours(exercise.estimatedHours)}</p>
                          )}
                        </div>
                        <button type="button" aria-label={`Mover ${title} para cima`} disabled={pending || index === 0} onClick={() => moveExercise(index, -1)} className={`${iconButton} hover:bg-canvas hover:text-ink`}>
                          <ChevronIcon up />
                        </button>
                        <button
                          type="button"
                          aria-label={`Mover ${title} para baixo`}
                          disabled={pending || index === draft.exercises.length - 1}
                          onClick={() => moveExercise(index, 1)}
                          className={`${iconButton} hover:bg-canvas hover:text-ink`}
                        >
                          <ChevronIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Tirar ${title} do plano`}
                          disabled={pending}
                          onClick={() => change((current) => ({ ...current, exercises: current.exercises.filter((entry) => entry.exerciseId !== item.exerciseId) }))}
                          className={`${iconButton} hover:bg-danger-soft hover:text-danger`}
                        >
                          <XIcon />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {errors.exercises && (
              <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
                {errors.exercises}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" icon={<PlusIcon />} disabled={pending} onClick={() => setPickerOpen(true)}>
                Escolher exercícios
              </Button>
              <Button variant="secondary" icon={<PlusIcon />} disabled={pending} onClick={() => setCreatingExercise(true)}>
                Criar exercício
              </Button>
            </div>
          </Section>
        </div>

        <aside aria-label="Resumo do plano" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 lg:sticky lg:top-24">
          <p className="font-semibold text-ink">Resumo</p>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <Stat label="Meta semanal" value={weekly ? formatHours(weekly) : "—"} hint={`máx. ${PLAN_LIMITS.weeklyHours}h`} warn={weekly > PLAN_LIMITS.weeklyHours} />
            <Stat label="Horas de exercícios" value={allocated ? formatHours(allocated) : "—"} />
            <Stat label="Assuntos" value={String(draft.subjects.length)} />
            <Stat label="Exercícios" value={String(draft.exercises.length)} />
          </dl>
          {weekly > 0 && allocated > 0 && (
            <p className="rounded-2xl bg-primary-soft p-3 text-sm text-ink">
              No ritmo de {formatHours(weekly)} por semana, os exercícios levam cerca de{" "}
              <strong>
                {Math.max(1, Math.ceil(allocated / weekly))} {Math.ceil(allocated / weekly) > 1 ? "semanas" : "semana"}
              </strong>
              .
            </p>
          )}
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {dirty ? (
              <ConfirmDialog
                title="Descartar alterações?"
                description="O que você mudou neste plano será perdido. Assuntos e exercícios criados continuam salvos."
                confirmLabel="Descartar"
                pendingLabel="Saindo…"
                onConfirm={async () => {
                  setDirty(false);
                  router.push(cancelHref);
                  return { ok: true };
                }}
                trigger={(open) => (
                  <Button variant="secondary" disabled={pending} onClick={open}>
                    Cancelar
                  </Button>
                )}
              />
            ) : (
              <Link
                href={cancelHref}
                className="inline-flex h-12 items-center rounded-full px-6 font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Cancelar
              </Link>
            )}
            <Button type="submit" block={false} loading={pending} loadingLabel="Salvando…">
              {planId ? "Salvar alterações" : "Criar plano"}
            </Button>
          </div>
        </div>
      </form>

      <SubjectFormDialog
        draft={subjectDraft}
        existingNames={subjects.map((subject) => subject.name)}
        onClose={() => setSubjectDraft(null)}
        onSaved={handleSubjectCreated}
      />

      <ExercisePickerDialog
        open={pickerOpen}
        exercises={exercises}
        subjects={subjects}
        alreadyInPlan={draft.exercises.map((item) => item.exerciseId)}
        suggestedSubjectIds={planSubjectIds}
        onClose={() => setPickerOpen(false)}
        onAdd={(ids) => {
          setPickerOpen(false);
          addExercises(ids);
        }}
        onCreateNew={() => {
          setPickerOpen(false);
          setCreatingExercise(true);
        }}
      />

      <Modal open={creatingExercise} onClose={() => setCreatingExercise(false)} size="xl" locked title="Novo exercício" description="Ele é salvo na sua lista de exercícios e já entra neste plano.">
        {creatingExercise && (
          <ExerciseEditor
            exerciseId={null}
            initialDraft={{ ...emptyDraft(), subjectIds: planSubjectIds.slice(0, 20) }}
            subjects={subjects}
            embedded={{
              onSaved: handleExerciseCreated,
              onCancel: () => setCreatingExercise(false),
              submitLabel: "Criar e adicionar ao plano",
            }}
          />
        )}
      </Modal>
    </>
  );
}

function Section({ title, description, icon, children }: { title: string; description?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true" className="flex items-start gap-3">
        {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</span>}
        <div>
          <p className="text-lg font-semibold text-ink">{title}</p>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function Stat({ label, value, hint, warn = false }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-xl font-semibold ${warn ? "text-danger" : "text-ink"}`}>
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
      <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
