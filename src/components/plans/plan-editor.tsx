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
import { emptyDraft, formatHours } from "@/lib/exercises/model";
import { savePlanAction } from "@/lib/plans/actions";
import { exercisesInPlan, PLAN_LIMITS, type ExerciseOption, type PlanDraft, type SubjectOption } from "@/lib/plans/model";
import { hasPlanErrors, validatePlan, weeklyTotal, type PlanErrors } from "@/lib/plans/validation";
import type { SkillGroupOption } from "@/lib/skills/model";
import { WeekdayPicker } from "./weekday-picker";

type PlanEditorProps = {
  planId: string | null;
  initialDraft: PlanDraft;
  subjects: SubjectOption[];
  exercises: ExerciseOption[];
  skillGroups?: SkillGroupOption[];
  cancelHref: string;
  assignedCount?: number;
};

const iconButton =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30";

export function PlanEditor({
  planId,
  initialDraft,
  subjects: initialSubjects,
  exercises: initialExercises,
  skillGroups = [],
  cancelHref,
  assignedCount = 0,
}: PlanEditorProps) {
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
  const planSubjectIds = draft.subjects.map((item) => item.subjectId);
  const unusedSubjects = subjects.filter((subject) => !planSubjectIds.includes(subject.id));
  const available = exercisesInPlan(exercises, planSubjectIds);
  const weekly = weeklyTotal(draft);

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
    const inPlan = exercise.subjects.some((subject) => planSubjectIds.includes(subject.id));
    setNotice(
      inPlan
        ? `Exercício “${exercise.title}” criado. Ele já aparece para os alunos do plano.`
        : `Exercício “${exercise.title}” criado, mas sem nenhum assunto do plano. Os alunos só veem exercícios com assuntos do plano.`,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePlan(draft);
    flushSync(() => {
      setErrors(found);
      setFormError(hasPlanErrors(found) ? "Revise os campos destacados." : null);
    });
    if (hasPlanErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const result = await savePlanAction(planId, draft);
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
              Este plano está com {assignedCount} {assignedCount === 1 ? "aluno" : "alunos"}. As mudanças valem para todos; as respostas que
              eles já enviaram continuam contando.
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
            title="Exercícios do plano"
            description="Entram sozinhos: o aluno vê todos os seus exercícios que tenham algum assunto do plano, inclusive os que você criar depois."
            icon={<ClipboardIcon className="size-5" />}
          >
            {planSubjectIds.length === 0 ? (
              <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">Escolha os assuntos para ver quais exercícios entram no plano.</p>
            ) : available.length === 0 ? (
              <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-ink">
                Nenhum exercício seu usa esses assuntos ainda. Crie um para que os alunos tenham o que praticar.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink">
                  <strong>{available.length}</strong> {available.length === 1 ? "exercício disponível" : "exercícios disponíveis"} para os alunos:
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {available.slice(0, 12).map((exercise) => (
                    <li key={exercise.id} className="rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs text-ink">
                      {exercise.title}
                    </li>
                  ))}
                  {available.length > 12 && <li className="px-1 text-xs text-muted">e mais {available.length - 12}</li>}
                </ul>
              </div>
            )}
            <div>
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
            <Stat label="Assuntos" value={String(draft.subjects.length)} />
            <Stat label="Exercícios disponíveis" value={String(available.length)} />
          </dl>
          <p className="rounded-2xl bg-primary-soft p-3 text-sm text-ink">
            Cada resposta do aluno soma horas em todos os assuntos do plano ligados ao exercício.
          </p>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {dirty ? (
              <ConfirmDialog
                title="Descartar alterações?"
                description="O que você mudou neste plano será perdido. Assuntos e exercícios criados aqui continuam salvos."
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

      <Modal open={creatingExercise} onClose={() => setCreatingExercise(false)} size="xl" locked title="Novo exercício" description="Ele é salvo na sua lista de exercícios. Com um assunto do plano, já aparece para os alunos.">
        {creatingExercise && (
          <ExerciseEditor
            exerciseId={null}
            initialDraft={{ ...emptyDraft(), subjectIds: planSubjectIds.slice(0, 20) }}
            subjects={subjects}
            skillGroups={skillGroups}
            embedded={{
              onSaved: handleExerciseCreated,
              onCancel: () => setCreatingExercise(false),
              submitLabel: "Criar exercício",
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
