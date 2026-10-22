"use client";

import { useDeferredValue, useId, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BooksIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import { deleteSubjectAction } from "@/lib/subjects/actions";
import { SUBJECT_SUGGESTIONS } from "@/lib/subjects/validation";
import { filterSubjects, type SubjectItem, type SubjectSort } from "./subject-filters";
import { SubjectFormDialog, type SubjectDraft } from "./subject-form-dialog";

const iconButton =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function SubjectBoard({ subjects }: { subjects: SubjectItem[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SubjectSort>("name-asc");
  const [draft, setDraft] = useState<SubjectDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const visible = filterSubjects(subjects, { query: deferredQuery, sort });
  const names = subjects.map((subject) => subject.name);
  const suggestions = SUBJECT_SUGGESTIONS.filter(
    (suggestion) => !names.some((name) => name.toLowerCase() === suggestion.toLowerCase()),
  );

  function openCreate(name = "") {
    setNotice(null);
    setDraft({ id: null, name, description: "" });
  }

  function handleSaved({ name }: { name: string }, created: boolean) {
    setDraft(null);
    setNotice(created ? `Assunto “${name}” criado.` : `Assunto “${name}” atualizado.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {subjects.length > 0 && (
          <>
            <div className="relative flex-1">
              <label htmlFor={searchId} className="sr-only">
                Buscar assunto
              </label>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar assunto"
                autoComplete="off"
                className="h-11 w-full rounded-full border border-border-strong bg-surface pl-11 pr-4 text-base text-ink placeholder:text-muted hover:border-ink focus:border-primary focus:outline-2 focus:outline-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              Ordenar
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SubjectSort)}
                className="h-11 cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary"
              >
                <option value="name-asc">Nome (A–Z)</option>
                <option value="recent">Mais recentes</option>
              </select>
            </label>
          </>
        )}
        <Button className="sm:ml-auto sm:w-auto" icon={<PlusIcon />} onClick={() => openCreate()}>
          Novo assunto
        </Button>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}

      {subjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 text-center sm:p-12">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BooksIcon className="size-7" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-ink">Cadastre seu primeiro assunto</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Assuntos organizam exercícios e planos de estudo. Comece por um destes ou crie o seu:
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => openCreate(suggestion)}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <PlusIcon className="size-4" />
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p aria-live="polite" className="-mt-2 text-sm text-muted">
            {query.trim()
              ? `Mostrando ${visible.length} de ${subjects.length} assuntos`
              : `${subjects.length} ${subjects.length === 1 ? "assunto" : "assuntos"}`}
          </p>
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-border bg-surface p-8 text-center">
              <p className="font-medium text-ink">Nenhum assunto encontrado para “{query.trim()}”</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={() => setQuery("")}>
                  Limpar busca
                </Button>
                <Button block={false} icon={<PlusIcon />} onClick={() => openCreate(query.trim())}>
                  Criar “{query.trim()}”
                </Button>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((subject) => (
                <li key={subject.id} className="flex flex-col rounded-3xl border border-border bg-surface p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <BooksIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-ink" title={subject.name}>
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted">Criado em {subject.createdLabel}</p>
                    </div>
                    <div className="-mr-2 -mt-1 flex shrink-0">
                      <button
                        type="button"
                        aria-label={`Editar ${subject.name}`}
                        title="Editar"
                        onClick={() => {
                          setNotice(null);
                          setDraft({ id: subject.id, name: subject.name, description: subject.description ?? "" });
                        }}
                        className={`${iconButton} hover:bg-canvas hover:text-ink`}
                      >
                        <PencilIcon />
                      </button>
                      <ConfirmDialog
                        title={`Excluir “${subject.name}”?`}
                        description="O assunto sai dos exercícios que o usam. Isso não pode ser desfeito."
                        confirmLabel="Excluir assunto"
                        pendingLabel="Excluindo…"
                        onConfirm={async () => {
                          const result = await deleteSubjectAction(subject.id);
                          if (result.ok) setNotice(`Assunto “${subject.name}” excluído.`);
                          return result;
                        }}
                        trigger={(open) => (
                          <button
                            type="button"
                            aria-label={`Excluir ${subject.name}`}
                            title="Excluir"
                            onClick={open}
                            className={`${iconButton} hover:bg-danger-soft hover:text-danger`}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      />
                    </div>
                  </div>
                  <p className={`mt-4 line-clamp-3 text-sm ${subject.description ? "text-ink/80" : "text-muted italic"}`}>
                    {subject.description ?? "Sem descrição"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <SubjectFormDialog draft={draft} existingNames={names} onClose={() => setDraft(null)} onSaved={handleSaved} />
    </div>
  );
}
