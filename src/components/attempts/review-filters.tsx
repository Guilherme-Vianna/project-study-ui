"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { reviewsHref, type StatusFilter } from "@/lib/attempts/model";

const statuses: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Aguardando correção" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Rejeitadas" },
  { value: "all", label: "Todas" },
];

type ReviewFiltersProps = {
  status: StatusFilter;
  studentId: string;
  exerciseId: string;
  students: { id: string; name: string }[];
  exercises: { id: string; title: string }[];
};

const selectClass =
  "h-11 w-full cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary sm:w-64";

export function ReviewFilters({ status, studentId, exerciseId, students, exercises }: ReviewFiltersProps) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  function go(next: { status?: StatusFilter; studentId?: string; exerciseId?: string }) {
    startTransition(() => {
      router.push(
        reviewsHref({
          status: next.status ?? status,
          studentId: (next.studentId ?? studentId) || undefined,
          exerciseId: (next.exerciseId ?? exerciseId) || undefined,
        }),
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Situação da correção" className="flex flex-wrap gap-2">
        {statuses.map((option) => {
          const active = option.value === status;
          return (
            <Link
              key={option.value}
              href={reviewsHref({ status: option.value, studentId: studentId || undefined, exerciseId: exerciseId || undefined })}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface text-ink hover:border-border-strong"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={`${id}-student`}>
          Filtrar por aluno
        </label>
        <select id={`${id}-student`} value={studentId} disabled={pending} onChange={(event) => go({ studentId: event.target.value })} className={selectClass}>
          <option value="">Todos os alunos</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${id}-exercise`}>
          Filtrar por exercício
        </label>
        <select id={`${id}-exercise`} value={exerciseId} disabled={pending} onChange={(event) => go({ exerciseId: event.target.value })} className={selectClass}>
          <option value="">Todos os exercícios</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.title}
            </option>
          ))}
        </select>
        {pending && (
          <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
            <Spinner /> Filtrando…
          </span>
        )}
      </div>
    </div>
  );
}
