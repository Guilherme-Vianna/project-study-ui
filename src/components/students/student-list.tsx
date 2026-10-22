"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchIcon } from "@/components/ui/icons";
import { STUDENTS_PATH } from "@/lib/auth/constants";
import { removeStudentAction } from "@/lib/invites/actions";
import { initialsOf } from "@/lib/people";
import { filterStudents, type StudentFilter, type StudentItem, type StudentSort } from "./student-filters";

const filters: { value: StudentFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "incomplete", label: "Perfil incompleto" },
];

export function StudentList({ students }: { students: StudentItem[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [sort, setSort] = useState<StudentSort>("name-asc");
  const deferredQuery = useDeferredValue(query);
  const visible = filterStudents(students, { query: deferredQuery, filter, sort });
  const filtering = Boolean(query.trim()) || filter !== "all";

  function clearFilters() {
    setQuery("");
    setFilter("all");
  }

  if (students.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 text-center">
        <p className="text-lg font-semibold text-ink">Você ainda não tem alunos</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Gere um link de convite e envie para seus alunos. Quem aceitar aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Buscar aluno
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou celular"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted hover:border-ink focus:border-primary focus:outline-2 focus:outline-primary"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Ordenar
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as StudentSort)}
            className="h-11 cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary"
          >
            <option value="name-asc">Nome (A–Z)</option>
            <option value="name-desc">Nome (Z–A)</option>
          </select>
        </label>
      </div>

      <div role="group" aria-label="Filtrar alunos" className="flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`h-9 cursor-pointer rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              filter === option.value
                ? "border-primary bg-primary-soft font-medium text-primary"
                : "border-border bg-surface text-ink hover:border-border-strong"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="text-sm text-muted">
        {filtering ? `Mostrando ${visible.length} de ${students.length} alunos` : `${students.length} ${students.length === 1 ? "aluno" : "alunos"}`}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <p className="font-medium text-ink">Nenhum aluno encontrado</p>
          <p className="mt-1 text-sm text-muted">Tente outro nome ou limpe os filtros.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 cursor-pointer rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
          {visible.map((student) => (
            <li key={student.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
                >
                  {initialsOf(student.name)}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`${STUDENTS_PATH}/${student.id}`}
                    className="block truncate rounded-sm font-medium text-ink hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {student.name}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                    {student.phoneHref ? (
                      <a href={student.phoneHref} className="hover:text-ink hover:underline">
                        {student.phone}
                      </a>
                    ) : (
                      <span>Sem celular</span>
                    )}
                    {!student.complete && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">
                        Perfil incompleto
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <ConfirmDialog
                title={`Remover ${student.name} dos seus alunos?`}
                description={
                  <>
                    {student.name} deixa de ver seus planos de estudo e o plano ativo é encerrado. A conta não é apagada e
                    você pode convidar de novo depois.
                  </>
                }
                confirmLabel="Remover aluno"
                pendingLabel="Removendo…"
                onConfirm={() => removeStudentAction(student.id)}
                trigger={(open) => (
                  <button
                    type="button"
                    onClick={open}
                    aria-label={`Remover ${student.name}`}
                    className="inline-flex h-10 cursor-pointer items-center self-start rounded-full px-4 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
                  >
                    Remover
                  </button>
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
