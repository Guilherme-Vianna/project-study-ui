"use client";

import { useId, useState } from "react";
import { normalize } from "@/components/students/student-filters";
import { Button } from "@/components/ui/button";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { EXERCISE_TYPE_LABELS, formatHours } from "@/lib/exercises/model";
import type { ExerciseOption, SubjectOption } from "@/lib/plans/model";

type ExercisePickerDialogProps = {
  open: boolean;
  exercises: ExerciseOption[];
  subjects: SubjectOption[];
  alreadyInPlan: string[];
  suggestedSubjectIds: string[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  onCreateNew: () => void;
};

export function ExercisePickerDialog(props: ExercisePickerDialogProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      size="xl"
      title="Escolher exercícios"
      description="Marque os exercícios que entram no plano. Você pode mudar a ordem depois."
    >
      {props.open && <PickerBody {...props} />}
    </Modal>
  );
}

function PickerBody({ exercises, subjects, alreadyInPlan, suggestedSubjectIds, onClose, onAdd, onCreateNew }: ExercisePickerDialogProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const term = normalize(query);
  const available = exercises.filter((exercise) => !alreadyInPlan.includes(exercise.id));
  const suggested = new Set(suggestedSubjectIds);
  const visible = available
    .filter((exercise) => !subjectId || exercise.subjects.some((subject) => subject.id === subjectId))
    .filter((exercise) => !term || normalize(exercise.title).includes(term))
    .sort((a, b) => Number(b.subjects.some((s) => suggested.has(s.id))) - Number(a.subjects.some((s) => suggested.has(s.id))));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
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
            placeholder="Buscar exercício"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-primary"
          />
        </div>
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
      </div>

      {available.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong/60 bg-surface p-6 text-center">
          <p className="font-medium text-ink">
            {exercises.length === 0 ? "Você ainda não tem exercícios." : "Todos os seus exercícios já estão no plano."}
          </p>
          <p className="mt-1 text-sm text-muted">Crie um agora sem sair do plano.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl bg-surface p-4 text-center text-sm text-muted">Nenhum exercício com esses filtros.</p>
      ) : (
        <ul className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
          {visible.map((exercise) => {
            const checked = selected.includes(exercise.id);
            return (
              <li key={exercise.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface p-3 transition-colors ${
                    checked ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(exercise.id)}
                    className="mt-1 size-4 cursor-pointer accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{exercise.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span>{EXERCISE_TYPE_LABELS[exercise.type]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exercise.estimatedHours ? formatHours(exercise.estimatedHours) : "sem tempo estimado"}</span>
                      {exercise.subjects.map((subject) => (
                        <span
                          key={subject.id}
                          className={`rounded-full border px-2 py-0.5 ${
                            suggested.has(subject.id) ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-canvas text-ink"
                          }`}
                        >
                          {subject.name}
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" icon={<PlusIcon />} onClick={onCreateNew}>
          Criar novo exercício
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button block={false} disabled={selected.length === 0} onClick={() => onAdd(selected)}>
            {selected.length ? `Adicionar ${selected.length} ao plano` : "Adicionar ao plano"}
          </Button>
        </div>
      </div>
    </div>
  );
}
