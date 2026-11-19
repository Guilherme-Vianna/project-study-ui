"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { normalize } from "@/components/students/student-filters";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SearchIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { STUDENTS_PATH } from "@/lib/auth/constants";
import { releasePackageAction, revokePackageAction } from "@/lib/packages/actions";
import { initialsOf } from "@/lib/people";

export type ReleaseStudent = { id: string; name: string; releasedLabel: string | null };

type PackageReleasePanelProps = { packageId: string; packageTitle: string; students: ReleaseStudent[] };

export function PackageReleasePanel({ packageId, packageTitle, students }: PackageReleasePanelProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const released = students.filter((student) => student.releasedLabel);
  const blocked = students.filter((student) => !student.releasedLabel);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Por padrão o pacote fica escondido. Só os alunos que você liberar conseguem ver e responder os exercícios.
      </p>
      {notice && <Alert tone="success">{notice}</Alert>}

      {students.length === 0 ? (
        <Link
          href={STUDENTS_PATH}
          className="inline-flex h-11 items-center justify-center self-start rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Convidar alunos
        </Link>
      ) : (
        <Button
          block={false}
          disabled={blocked.length === 0}
          onClick={() => {
            setNotice(null);
            setOpen(true);
          }}
        >
          {blocked.length === 0 ? "Liberado para todos os alunos" : "Liberar para alunos"}
        </Button>
      )}

      {released.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">
            Liberado para {released.length} {released.length === 1 ? "aluno" : "alunos"}
          </p>
          <ul className="flex flex-col divide-y divide-border">
            {released.map((student) => (
              <li key={student.id} className="flex items-center gap-3 py-2.5">
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {initialsOf(student.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{student.name}</p>
                  <p className="text-xs text-muted">Liberado em {student.releasedLabel}</p>
                </div>
                <ConfirmDialog
                  title="Bloquear pacote?"
                  description={`${student.name} deixa de ver “${packageTitle}”. As respostas já enviadas continuam guardadas e você pode liberar de novo depois.`}
                  confirmLabel="Bloquear"
                  pendingLabel="Bloqueando…"
                  onConfirm={() => revokePackageAction(packageId, student.id)}
                  trigger={(show) => (
                    <button
                      type="button"
                      onClick={show}
                      className="h-10 shrink-0 cursor-pointer rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      Bloquear
                    </button>
                  )}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title="Liberar pacote"
        description={`Escolha quem vai poder ver “${packageTitle}”.`}
      >
        {open && (
          <ReleasePicker
            packageId={packageId}
            students={blocked}
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

function ReleasePicker({
  packageId,
  students,
  onCancel,
  onDone,
}: {
  packageId: string;
  students: ReleaseStudent[];
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const term = normalize(query);
  const visible = students
    .filter((student) => !term || normalize(student.name).includes(term))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const allSelected = visible.length > 0 && visible.every((student) => selected.includes(student.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    const ids = visible.map((student) => student.id);
    setSelected((current) => (allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]));
  }

  function release() {
    setError(null);
    startTransition(async () => {
      const result = await releasePackageAction(packageId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const first = students.find((student) => student.id === selected[0])?.name;
      onDone(selected.length === 1 ? `Pacote liberado para ${first}.` : `Pacote liberado para ${selected.length} alunos.`);
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
        {visible.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            disabled={pending}
            className="h-11 cursor-pointer rounded-full px-4 text-sm font-medium text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
          >
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted">Nenhum aluno com “{query}”.</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
          {visible.map((student) => {
            const checked = selected.includes(student.id);
            return (
              <li key={student.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-3 transition-colors ${
                    checked ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={() => toggle(student.id)}
                    className="size-5 shrink-0 cursor-pointer accent-primary"
                  />
                  <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {initialsOf(student.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{student.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button block={false} disabled={selected.length === 0} loading={pending} loadingLabel="Liberando…" onClick={release}>
          {selected.length > 1 ? `Liberar para ${selected.length} alunos` : "Liberar"}
        </Button>
      </div>
    </div>
  );
}
