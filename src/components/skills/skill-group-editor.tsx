"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlusIcon } from "@/components/ui/icons";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { SKILLS_PATH } from "@/lib/auth/constants";
import { saveSkillGroupAction } from "@/lib/skills/actions";
import {
  emptyItem,
  hasSkillGroupErrors,
  SKILL_LIMITS,
  validateSkillGroup,
  type SkillGroupDraft,
  type SkillGroupErrors,
  type SkillItemDraft,
} from "@/lib/skills/model";

type SkillGroupEditorProps = { groupId: string | null; initialDraft: SkillGroupDraft; existingNames: string[] };

type ListKey = "levels" | "skills";

export function SkillGroupEditor({ groupId, initialDraft, existingNames }: SkillGroupEditorProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<SkillGroupErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty || pending) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function change(update: (current: SkillGroupDraft) => SkillGroupDraft) {
    setDraft(update);
    setDirty(true);
  }

  function clearItemError(key: string) {
    setErrors((current) => {
      const items = { ...current.items };
      delete items[key];
      return { ...current, items };
    });
  }

  function updateItem(list: ListKey, key: string, name: string) {
    change((current) => ({ ...current, [list]: current[list].map((item) => (item.key === key ? { ...item, name } : item)) }));
    clearItemError(key);
  }

  function moveItem(list: ListKey, index: number, delta: number) {
    change((current) => {
      const items = [...current[list]];
      const [moved] = items.splice(index, 1);
      items.splice(index + delta, 0, moved);
      return { ...current, [list]: items };
    });
  }

  function addItem(list: ListKey) {
    const item = emptyItem();
    change((current) => ({ ...current, [list]: [...current[list], item] }));
    setErrors((current) => ({ ...current, [list]: undefined }));
    requestAnimationFrame(() => document.getElementById(`item-${item.key}`)?.focus());
  }

  function removeItem(list: ListKey, key: string) {
    change((current) => ({ ...current, [list]: current[list].filter((item) => item.key !== key) }));
    clearItemError(key);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateSkillGroup(draft, existingNames);
    flushSync(() => {
      setErrors(found);
      setFormError(hasSkillGroupErrors(found) ? "Revise os campos destacados." : null);
    });
    if (hasSkillGroupErrors(found)) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const result = await saveSkillGroupAction(groupId, draft, existingNames);
      if (!result) return;
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
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    target?.focus({ preventScroll: true });
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6 pb-28">
      {formError && (
        <div data-form-error="true" tabIndex={-1} className="outline-none">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}

      <Section title="Grupo">
        <TextField
          label="Nome do grupo"
          name="name"
          value={draft.name}
          maxLength={SKILL_LIMITS.name + 20}
          placeholder="Ex.: Inglês"
          error={errors.name}
          disabled={pending}
          onChange={(event) => {
            change((current) => ({ ...current, name: event.target.value }));
            setErrors((current) => ({ ...current, name: undefined }));
          }}
        />
        <TextAreaField
          label="Descrição"
          name="description"
          optional
          value={draft.description}
          maxLength={SKILL_LIMITS.description}
          placeholder="Como você avalia este grupo, critérios…"
          error={errors.description}
          disabled={pending}
          onChange={(event) => change((current) => ({ ...current, description: event.target.value }))}
        />
      </Section>

      <Section title="Níveis" description="Do mais básico ao mais avançado. Valem para todas as habilidades do grupo.">
        <ItemList
          list="levels"
          items={draft.levels}
          errors={errors.items}
          numbered
          pending={pending}
          noun="nível"
          minItems={SKILL_LIMITS.levels.min}
          onRename={updateItem}
          onMove={moveItem}
          onRemove={removeItem}
        />
        {errors.levels && (
          <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
            {errors.levels}
          </p>
        )}
        <div>
          <Button variant="secondary" icon={<PlusIcon />} disabled={pending || draft.levels.length >= SKILL_LIMITS.levels.max} onClick={() => addItem("levels")}>
            Adicionar nível
          </Button>
        </div>
      </Section>

      <Section title="Habilidades" description="O que você avalia em cada aluno, como Grammar, Speaking e Listening.">
        {draft.skills.length === 0 ? (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">Nenhuma habilidade ainda.</p>
        ) : (
          <ItemList list="skills" items={draft.skills} errors={errors.items} pending={pending} noun="habilidade" onRename={updateItem} onMove={moveItem} onRemove={removeItem} />
        )}
        {errors.skills && (
          <p data-error="true" tabIndex={-1} className="text-sm text-danger outline-none">
            {errors.skills}
          </p>
        )}
        <div>
          <Button variant="secondary" icon={<PlusIcon />} disabled={pending || draft.skills.length >= SKILL_LIMITS.skills} onClick={() => addItem("skills")}>
            Adicionar habilidade
          </Button>
        </div>
        {groupId && (
          <p className="text-sm text-muted">Níveis e habilidades já usados em avaliações ou exercícios não podem ser removidos, só renomeados.</p>
        )}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {dirty ? (
            <ConfirmDialog
              title="Descartar alterações?"
              description="O que você mudou neste grupo será perdido."
              confirmLabel="Descartar"
              pendingLabel="Saindo…"
              onConfirm={async () => {
                setDirty(false);
                router.push(SKILLS_PATH);
                return { ok: true };
              }}
              trigger={(open) => (
                <Button variant="secondary" disabled={pending} onClick={open}>
                  Cancelar
                </Button>
              )}
            />
          ) : (
            <Link
              href={SKILLS_PATH}
              className="inline-flex h-12 items-center rounded-full px-6 font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Cancelar
            </Link>
          )}
          <Button type="submit" block={false} loading={pending} loadingLabel="Salvando…">
            {groupId ? "Salvar alterações" : "Criar grupo"}
          </Button>
        </div>
      </div>
    </form>
  );
}

type ItemListProps = {
  list: ListKey;
  items: SkillItemDraft[];
  errors?: Record<string, string>;
  numbered?: boolean;
  pending: boolean;
  noun: string;
  minItems?: number;
  onRename: (list: ListKey, key: string, name: string) => void;
  onMove: (list: ListKey, index: number, delta: number) => void;
  onRemove: (list: ListKey, key: string) => void;
};

function ItemList({ list, items, errors, numbered = false, pending, noun, minItems = 0, onRename, onMove, onRemove }: ItemListProps) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag className="flex flex-col gap-2">
      {items.map((item, index) => {
        const error = errors?.[item.key];
        const label = item.name.trim() || `${noun} ${index + 1}`;
        return (
          <li key={item.key} className="flex items-start gap-2">
            {numbered && (
              <span aria-hidden="true" className="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {index + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <label htmlFor={`item-${item.key}`} className="sr-only">
                {noun === "nível" ? "Nome do nível" : "Nome da habilidade"} {index + 1}
              </label>
              <input
                id={`item-${item.key}`}
                value={item.name}
                maxLength={SKILL_LIMITS.name + 20}
                placeholder={numbered ? "Ex.: Intermediário" : "Ex.: Listening"}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `item-${item.key}-error` : undefined}
                disabled={pending}
                onChange={(event) => onRename(list, item.key, event.target.value)}
                className={`h-11 w-full rounded-full border bg-surface px-4 text-base text-ink placeholder:text-muted focus:outline-2 ${
                  error ? "border-danger focus:outline-danger" : "border-border-strong focus:border-primary focus:outline-primary"
                }`}
              />
              {error && (
                <p id={`item-${item.key}-error`} className="mt-1 px-1 text-xs text-danger">
                  {error}
                </p>
              )}
            </div>
            <ItemButton label={`Mover ${label} para cima`} disabled={pending || index === 0} onClick={() => onMove(list, index, -1)}>
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </ItemButton>
            <ItemButton label={`Mover ${label} para baixo`} disabled={pending || index === items.length - 1} onClick={() => onMove(list, index, 1)}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </ItemButton>
            <ItemButton label={`Remover ${label}`} danger disabled={pending || items.length <= minItems} onClick={() => onRemove(list, item.key)}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </ItemButton>
          </li>
        );
      })}
    </Tag>
  );
}

function ItemButton({ label, disabled, danger = false, onClick, children }: { label: string; disabled: boolean; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`mt-0.5 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-canvas hover:text-ink"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true">
        <p className="text-lg font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}
