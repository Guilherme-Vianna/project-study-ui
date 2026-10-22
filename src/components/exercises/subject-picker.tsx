"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { normalize } from "@/components/students/student-filters";
import { SUBJECTS_PATH } from "@/lib/auth/constants";
import { LIMITS } from "@/lib/exercises/model";

type SubjectPickerProps = {
  subjects: { id: string; name: string }[];
  selected: string[];
  error?: string;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
};

export function SubjectPicker({ subjects, selected, error, disabled = false, onChange }: SubjectPickerProps) {
  const filterId = useId();
  const [query, setQuery] = useState("");
  const term = normalize(query);
  const visible = subjects.filter((subject) => !term || normalize(subject.name).includes(term));
  const full = selected.length >= LIMITS.subjects;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  if (subjects.length === 0) {
    return (
      <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
        Você ainda não tem assuntos.{" "}
        <Link href={SUBJECTS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
          Cadastre assuntos
        </Link>{" "}
        para organizar seus exercícios.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {subjects.length > 12 && (
        <div>
          <label htmlFor={filterId} className="sr-only">
            Filtrar assuntos
          </label>
          <input
            id={filterId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar assuntos"
            className="h-10 w-full rounded-full border border-border-strong bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-primary sm:max-w-xs"
          />
        </div>
      )}
      <div role="group" aria-label="Assuntos do exercício" aria-describedby={error ? `${filterId}-error` : undefined} className="flex flex-wrap gap-2">
        {visible.map((subject) => {
          const active = selected.includes(subject.id);
          return (
            <button
              key={subject.id}
              type="button"
              aria-pressed={active}
              disabled={disabled || (!active && full)}
              onClick={() => toggle(subject.id)}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-primary bg-primary-soft font-medium text-primary"
                  : "border-border bg-surface text-ink hover:border-border-strong"
              }`}
            >
              {active && (
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {subject.name}
            </button>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-muted">Nenhum assunto com “{query}”.</p>}
      </div>
      <p className={`text-sm ${error ? "text-danger" : "text-muted"}`} id={`${filterId}-error`}>
        {error ?? (selected.length ? `${selected.length} selecionado${selected.length > 1 ? "s" : ""}` : "Escolha um ou mais assuntos.")}
      </p>
    </div>
  );
}
