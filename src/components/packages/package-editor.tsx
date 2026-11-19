"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { ExerciseKindBadge } from "@/components/exercises/exercise-kind-badge";
import { normalize } from "@/components/students/student-filters";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/ui/icons";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import type { ExerciseType } from "@/lib/exercises/model";
import { savePackageAction } from "@/lib/packages/actions";
import {
  exerciseCountLabel,
  hasPackageErrors,
  PACKAGE_LIMITS,
  validatePackage,
  type PackageDraft,
  type PackageErrors,
} from "@/lib/packages/model";

export type PackageExerciseOption = {
  id: string;
  title: string;
  types: ExerciseType[];
  questionCount: number;
  subjects: { id: string; name: string }[];
};

type PackageEditorProps = {
  packageId: string | null;
  initialDraft: PackageDraft;
  exercises: PackageExerciseOption[];
  cancelHref: string;
};

export function PackageEditor({ packageId, initialDraft, exercises, cancelHref }: PackageEditorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const searchId = useId();
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<PackageErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const selected = draft.exerciseIds.map((id) => byId.get(id)).filter((item) => item !== undefined);
  const term = normalize(query);
  const available = exercises.filter(
    (exercise) =>
      !draft.exerciseIds.includes(exercise.id) &&
      (!term || normalize(exercise.title).includes(term) || exercise.subjects.some((subject) => normalize(subject.name).includes(term))),
  );

  useEffect(() => {
    if (!dirty || pending) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function update(patch: Partial<PackageDraft>, field?: keyof PackageErrors) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    if (field) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function move(index: number, delta: number) {
    const ids = [...draft.exerciseIds];
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    update({ exerciseIds: ids });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validatePackage(draft);
    flushSync(() => {
      setErrors(found);
      setFormError(hasPackageErrors(found) ? "Revise os campos destacados." : null);
    });
    if (hasPackageErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      setDirty(false);
      const result = await savePackageAction(packageId, draft);
      if (!result) return;
      setDirty(true);
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
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      {formError && (
        <div data-form-error="true" tabIndex={-1} className="outline-none">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <TextField
          label="Nome do pacote"
          name="title"
          value={draft.title}
          maxLength={PACKAGE_LIMITS.title + 20}
          placeholder="Ex.: Pacote de Nivelamento"
          hint="É o que o aluno vê na lista de pacotes."
          error={errors.title}
          disabled={pending}
          onChange={(event) => update({ title: event.target.value }, "title")}
        />
        <TextAreaField
          label="Descrição"
          name="description"
          optional
          value={draft.description}
          maxLength={PACKAGE_LIMITS.description}
          placeholder="Ex.: Responda estes exercícios na primeira semana para eu conhecer seu nível."
          error={errors.description}
          disabled={pending}
          rows={3}
          onChange={(event) => update({ description: event.target.value }, "description")}
        />
      </section>

      <section aria-labelledby="chosen-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div>
          <h2 id="chosen-title" className="text-lg font-semibold text-ink">
            Exercícios do pacote
          </h2>
          <p className="text-sm text-muted">O aluno vê os exercícios nesta ordem.</p>
        </div>
        {selected.length === 0 ? (
          <p data-error={errors.exercises ? "true" : undefined} tabIndex={-1} className={`text-sm outline-none ${errors.exercises ? "text-danger" : "text-muted"}`}>
            {errors.exercises ?? "Nenhum exercício escolhido ainda. Adicione abaixo."}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {selected.map((exercise, index) => (
              <li key={exercise.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-semibold text-ink">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{exercise.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <ExerciseKindBadge types={exercise.types} questionCount={exercise.questionCount} />
                  </div>
                </div>
                <div className="flex shrink-0">
                  <SmallButton label={`Mover “${exercise.title}” para cima`} disabled={pending || index === 0} onClick={() => move(index, -1)}>
                    <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </SmallButton>
                  <SmallButton
                    label={`Mover “${exercise.title}” para baixo`}
                    disabled={pending || index === selected.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </SmallButton>
                  <SmallButton
                    label={`Tirar “${exercise.title}” do pacote`}
                    danger
                    disabled={pending}
                    onClick={() => update({ exerciseIds: draft.exerciseIds.filter((id) => id !== exercise.id) })}
                  >
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </SmallButton>
                </div>
              </li>
            ))}
          </ol>
        )}
        {errors.exercises && selected.length > 0 && <p className="text-sm text-danger">{errors.exercises}</p>}
      </section>

      <section aria-labelledby="available-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <h2 id="available-title" className="text-lg font-semibold text-ink">
          Adicionar exercícios
        </h2>
        {exercises.length === 0 ? (
          <p className="text-sm text-muted">
            Você ainda não tem exercícios.{" "}
            <Link href={`${EXERCISES_PATH}/novo`} className="font-medium text-primary underline-offset-4 hover:underline">
              Criar exercício
            </Link>
          </p>
        ) : (
          <>
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Buscar exercício
              </label>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar pelo título ou assunto"
                autoComplete="off"
                className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-primary"
              />
            </div>
            {available.length === 0 ? (
              <p className="text-sm text-muted">{term ? `Nenhum exercício com “${query}”.` : "Todos os seus exercícios já estão no pacote."}</p>
            ) : (
              <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                {available.map((exercise) => (
                  <li key={exercise.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{exercise.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <ExerciseKindBadge types={exercise.types} questionCount={exercise.questionCount} />
                        {exercise.subjects.map((subject) => (
                          <span key={subject.id} className="rounded-full border border-border bg-canvas px-2 py-0.5 text-xs text-ink">
                            {subject.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={pending || draft.exerciseIds.length >= PACKAGE_LIMITS.exercises}
                      onClick={() => update({ exerciseIds: [...draft.exerciseIds, exercise.id] }, "exercises")}
                      className="h-10 shrink-0 cursor-pointer rounded-full border border-border px-4 text-sm font-medium text-primary hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Adicionar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-12 items-center justify-center rounded-full px-6 font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Cancelar
        </Link>
        <Button type="submit" block={false} loading={pending} loadingLabel="Salvando…">
          {packageId ? "Salvar alterações" : `Criar pacote${selected.length ? ` com ${exerciseCountLabel(selected.length)}` : ""}`}
        </Button>
      </div>
    </form>
  );
}

function SmallButton({
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
  children: React.ReactNode;
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
