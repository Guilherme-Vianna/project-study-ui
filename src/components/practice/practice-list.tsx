"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { PRACTICE_PATH } from "@/lib/auth/constants";
import { EXERCISE_TYPE_LABELS } from "@/lib/exercises/model";
import { filterPractice, type PracticeItem, type PracticeStatus, type PracticeType } from "./practice-filters";

const typeOptions: { value: PracticeType; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "multiple_choice", label: EXERCISE_TYPE_LABELS.multiple_choice },
  { value: "open_answer", label: EXERCISE_TYPE_LABELS.open_answer },
];

const statusOptions: { value: PracticeStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "todo", label: "Para fazer" },
  { value: "done", label: "Já respondidos" },
];

const chip = (active: boolean) =>
  `h-9 cursor-pointer rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface text-ink hover:border-border-strong"
  }`;

export function PracticeList({ items, subjects }: { items: PracticeItem[]; subjects: { id: string; name: string }[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<PracticeType>("all");
  const [status, setStatus] = useState<PracticeStatus>("all");
  const [subjectId, setSubjectId] = useState("");
  const deferredQuery = useDeferredValue(query);
  const visible = filterPractice(items, { query: deferredQuery, type, subjectId, status });
  const filtering = Boolean(query.trim()) || type !== "all" || status !== "all" || Boolean(subjectId);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-ink">Ainda não há exercícios</h2>
        <p className="mt-2 max-w-xl text-muted">Seu professor ainda não criou exercícios com os assuntos do seu plano. Eles aparecem aqui assim que forem criados.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
            placeholder="Buscar pelo título"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted hover:border-ink focus:border-primary focus:outline-2 focus:outline-primary"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="sr-only" htmlFor={`${searchId}-subject`}>
            Filtrar por assunto
          </label>
          <select
            id={`${searchId}-subject`}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="h-11 cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary"
          >
            <option value="">Todos os assuntos</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${searchId}-type`}>
            Filtrar por tipo
          </label>
          <select
            id={`${searchId}-type`}
            value={type}
            onChange={(event) => setType(event.target.value as PracticeType)}
            className="h-11 cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div role="group" aria-label="Filtrar por situação" className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button key={option.value} type="button" aria-pressed={status === option.value} onClick={() => setStatus(option.value)} className={chip(status === option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="text-sm text-muted">
        {filtering ? `Mostrando ${visible.length} de ${items.length} exercícios` : `${items.length} ${items.length === 1 ? "exercício" : "exercícios"}`}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <p className="font-medium text-ink">Nenhum exercício encontrado</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
              setStatus("all");
              setSubjectId("");
            }}
            className="mt-3 cursor-pointer rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                href={`${PRACTICE_PATH}/${item.id}`}
                className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-surface p-5 transition hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      item.type === "multiple_choice" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent-strong"
                    }`}
                  >
                    {EXERCISE_TYPE_LABELS[item.type]}
                  </span>
                  {item.hoursLabel && <span className="text-xs text-muted">⏱ {item.hoursLabel}</span>}
                  <span className="ml-auto text-xs font-medium">
                    {item.locked ? (
                      <span className="text-success-strong">✓ Respondido</span>
                    ) : item.attemptsCount > 0 ? (
                      <span className="text-muted">
                        {item.attemptsCount} {item.attemptsCount === 1 ? "resposta" : "respostas"}
                      </span>
                    ) : (
                      <span className="text-primary">Para fazer</span>
                    )}
                  </span>
                </div>
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {item.subjects.map((subject) => (
                    <span key={subject.id} className="rounded-full border border-border bg-canvas px-2.5 py-0.5 text-xs text-ink">
                      {subject.name}
                    </span>
                  ))}
                  {item.skills.map((skill) => (
                    <span key={skill.id} className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs text-success-strong">
                      {skill.name}
                    </span>
                  ))}
                </div>
                {item.lastAttemptLabel && <p className="text-xs text-muted">Última resposta em {item.lastAttemptLabel}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
