"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { deleteExerciseAction } from "@/lib/exercises/actions";
import { EXERCISE_TYPE_LABELS } from "@/lib/exercises/model";
import { filterExercises, NO_SUBJECT, type ExerciseItem, type ExerciseSort, type TypeFilter } from "./exercise-filters";

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "multiple_choice", label: EXERCISE_TYPE_LABELS.multiple_choice },
  { value: "open_answer", label: EXERCISE_TYPE_LABELS.open_answer },
];

const controlClass =
  "h-11 cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary";

export const NEW_EXERCISE_LINK =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function ExerciseBoard({ exercises, subjects }: { exercises: ExerciseItem[]; subjects: { id: string; name: string }[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [subjectId, setSubjectId] = useState("");
  const [sort, setSort] = useState<ExerciseSort>("recent");
  const [notice, setNotice] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const visible = filterExercises(exercises, { query: deferredQuery, type, subjectId, sort });
  const filtering = Boolean(query.trim()) || type !== "all" || Boolean(subjectId);

  function clearFilters() {
    setQuery("");
    setType("all");
    setSubjectId("");
  }

  if (exercises.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 text-center sm:p-12">
        <h2 className="text-xl font-semibold text-ink">Crie seu primeiro exercício</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Exercícios podem ser de múltipla escolha ou de resposta aberta, com imagens e vários assuntos.
        </p>
        <Link href={`${EXERCISES_PATH}/novo`} className={`${NEW_EXERCISE_LINK} mt-6`}>
          <PlusIcon />
          Novo exercício
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && <Alert tone="success">{notice}</Alert>}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Buscar exercício
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título ou enunciado"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted hover:border-ink focus:border-primary focus:outline-2 focus:outline-primary"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="sr-only" htmlFor={`${searchId}-subject`}>
            Filtrar por assunto
          </label>
          <select id={`${searchId}-subject`} value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className={controlClass}>
            <option value="">Todos os assuntos</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
            <option value={NO_SUBJECT}>Sem assunto</option>
          </select>
          <label className="sr-only" htmlFor={`${searchId}-sort`}>
            Ordenar
          </label>
          <select id={`${searchId}-sort`} value={sort} onChange={(event) => setSort(event.target.value as ExerciseSort)} className={controlClass}>
            <option value="recent">Mais recentes</option>
            <option value="title">Título (A–Z)</option>
          </select>
        </div>
      </div>

      <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
        {typeFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={type === option.value}
            onClick={() => setType(option.value)}
            className={`h-9 cursor-pointer rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              type === option.value
                ? "border-primary bg-primary-soft font-medium text-primary"
                : "border-border bg-surface text-ink hover:border-border-strong"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="text-sm text-muted">
        {filtering
          ? `Mostrando ${visible.length} de ${exercises.length} exercícios`
          : `${exercises.length} ${exercises.length === 1 ? "exercício" : "exercícios"}`}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <p className="font-medium text-ink">Nenhum exercício encontrado</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 cursor-pointer rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((exercise) => (
            <li key={exercise.id} className="flex gap-3 rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-border-strong">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      exercise.type === "multiple_choice" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent-strong"
                    }`}
                  >
                    {EXERCISE_TYPE_LABELS[exercise.type]}
                  </span>
                  {exercise.hoursLabel && <span className="text-xs text-muted">⏱ {exercise.hoursLabel}</span>}
                  {exercise.imageCount > 0 && (
                    <span className="text-xs text-muted">
                      {exercise.imageCount} {exercise.imageCount === 1 ? "imagem" : "imagens"}
                    </span>
                  )}
                  {exercise.type === "multiple_choice" && <span className="text-xs text-muted">{exercise.optionCount} alternativas</span>}
                </div>
                <h3 className="mt-2 font-semibold text-ink">
                  <Link
                    href={`${EXERCISES_PATH}/${exercise.id}`}
                    className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {exercise.title}
                  </Link>
                </h3>
                {exercise.statementPreview && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{exercise.statementPreview}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {exercise.subjects.length ? (
                    exercise.subjects.map((subject) => (
                      <span key={subject.id} className="rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs text-ink">
                        {subject.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-muted">Sem assunto</span>
                  )}
                  <span className="ml-auto text-xs text-muted">Atualizado em {exercise.updatedLabel}</span>
                </div>
              </div>
              <div className="-mr-2 -mt-2 flex shrink-0 flex-col sm:flex-row">
                <Link
                  href={`${EXERCISES_PATH}/${exercise.id}`}
                  aria-label={`Editar ${exercise.title}`}
                  title="Editar"
                  className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <PencilIcon />
                </Link>
                <ConfirmDialog
                  title={`Excluir “${exercise.title}”?`}
                  description="O exercício sai da sua lista. Isso não pode ser desfeito."
                  confirmLabel="Excluir exercício"
                  pendingLabel="Excluindo…"
                  onConfirm={async () => {
                    const result = await deleteExerciseAction(exercise.id);
                    if (result.ok) setNotice(`Exercício “${exercise.title}” excluído.`);
                    return result;
                  }}
                  trigger={(open) => (
                    <button
                      type="button"
                      aria-label={`Excluir ${exercise.title}`}
                      title="Excluir"
                      onClick={open}
                      className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <TrashIcon />
                    </button>
                  )}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
