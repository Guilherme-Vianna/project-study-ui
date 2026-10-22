"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { normalize } from "@/components/students/student-filters";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { STUDENTS_PATH } from "@/lib/auth/constants";
import { initialsOf } from "@/lib/people";
import { assignPlanAction } from "@/lib/plans/actions";

export type AssignableStudent = {
  id: string;
  name: string;
  phone: string | null;
  status: "free" | "this-plan" | "other-plan";
  otherPlanTitle: string | null;
};

type AssignStudentButtonProps = { planId: string; planTitle: string; students: AssignableStudent[] };

export function AssignStudentButton({ planId, planTitle, students }: AssignStudentButtonProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const free = students.filter((student) => student.status === "free").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {students.length === 0
            ? "Você ainda não tem alunos para atribuir."
            : free
              ? `${free} ${free === 1 ? "aluno pode" : "alunos podem"} receber este plano.`
              : "Todos os seus alunos já seguem um plano."}
        </p>
        {students.length === 0 ? (
          <Link
            href={STUDENTS_PATH}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Convidar alunos
          </Link>
        ) : (
          <Button
            block={false}
            icon={<PlusIcon />}
            onClick={() => {
              setNotice(null);
              setOpen(true);
            }}
          >
            Atribuir plano
          </Button>
        )}
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title="Atribuir plano"
        description={`Escolha quem vai seguir “${planTitle}”. Cada aluno segue um plano por vez.`}
      >
        {open && (
          <StudentPicker
            planId={planId}
            students={students}
            onCancel={() => setOpen(false)}
            onDone={(message) => {
              setOpen(false);
              setNotice(message);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

type Failure = { id: string; name: string; error: string };

function StudentPicker({
  planId,
  students,
  onCancel,
  onDone,
}: {
  planId: string;
  students: AssignableStudent[];
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [pending, startTransition] = useTransition();
  const term = normalize(query);
  const order = { free: 0, "this-plan": 1, "other-plan": 2 };
  const visible = students
    .filter((student) => !term || normalize(student.name).includes(term))
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "pt-BR"));
  const freeVisible = visible.filter((student) => student.status === "free");
  const allVisibleSelected = freeVisible.length > 0 && freeVisible.every((student) => selected.includes(student.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    const ids = freeVisible.map((student) => student.id);
    setSelected((current) => (allVisibleSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]));
  }

  function assign() {
    setFailures([]);
    startTransition(async () => {
      const failed: Failure[] = [];
      let done = 0;
      for (const id of selected) {
        const result = await assignPlanAction(planId, id);
        if (result.ok) done += 1;
        else failed.push({ id, name: students.find((student) => student.id === id)?.name ?? "Aluno", error: result.error });
      }
      if (failed.length === 0) {
        onDone(done === 1 ? `${students.find((student) => student.id === selected[0])?.name} agora segue este plano.` : `${done} alunos agora seguem este plano.`);
        return;
      }
      setSelected(failed.map((failure) => failure.id));
      setFailures(failed);
    });
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
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar aluno pelo nome"
            className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-primary"
          />
        </div>
        {freeVisible.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            disabled={pending}
            className="h-11 cursor-pointer rounded-full px-4 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
          >
            {allVisibleSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        )}
      </div>

      {failures.length > 0 && (
        <Alert tone="error">
          <p className="font-medium">Não foi possível atribuir a {failures.length === 1 ? "um aluno" : `${failures.length} alunos`}:</p>
          <ul className="mt-1 list-disc pl-5">
            {failures.map((failure) => (
              <li key={failure.id}>
                {failure.name}: {failure.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted">Nenhum aluno com “{query}”.</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
          {visible.map((student) => {
            const disabled = student.status !== "free";
            const checked = selected.includes(student.id);
            return (
              <li key={student.id}>
                <label
                  className={`flex items-center gap-3 rounded-2xl border bg-surface p-3 transition-colors ${
                    disabled
                      ? "cursor-not-allowed border-border opacity-70"
                      : checked
                        ? "cursor-pointer border-primary ring-1 ring-primary"
                        : "cursor-pointer border-border hover:border-border-strong"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled || pending}
                    onChange={() => toggle(student.id)}
                    className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                  />
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                    {initialsOf(student.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{student.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {student.status === "this-plan"
                        ? "Já segue este plano"
                        : student.status === "other-plan"
                          ? `Segue “${student.otherPlanTitle}”. Encerre aquele plano para trocar.`
                          : (student.phone ?? "Disponível")}
                    </span>
                  </span>
                  {student.status === "this-plan" && (
                    <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-strong">Neste plano</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-sm text-muted">
          {selected.length ? `${selected.length} ${selected.length === 1 ? "aluno selecionado" : "alunos selecionados"}` : "Nenhum aluno selecionado"}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
          <Button block={false} disabled={selected.length === 0} loading={pending} loadingLabel="Atribuindo…" onClick={assign}>
            {selected.length > 1 ? `Atribuir a ${selected.length} alunos` : "Atribuir plano"}
          </Button>
        </div>
      </div>
    </div>
  );
}
