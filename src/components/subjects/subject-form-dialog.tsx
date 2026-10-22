"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { saveSubjectAction } from "@/lib/subjects/actions";
import {
  SUBJECT_DESCRIPTION_MAX,
  SUBJECT_NAME_MAX,
  validateSubject,
  type SubjectFieldErrors,
  type SubjectValues,
} from "@/lib/subjects/validation";

export type SubjectDraft = { id: string | null; name: string; description: string };

type SubjectFormDialogProps = {
  draft: SubjectDraft | null;
  existingNames: readonly string[];
  onClose: () => void;
  onSaved: (name: string, created: boolean) => void;
};

export function SubjectFormDialog({ draft, existingNames, onClose, onSaved }: SubjectFormDialogProps) {
  return (
    <Modal
      open={draft !== null}
      onClose={onClose}
      title={draft?.id ? "Editar assunto" : "Novo assunto"}
      description="Assuntos são os temas que seus alunos vão estudar."
    >
      {draft && (
        <SubjectForm key={draft.id ?? `new-${draft.name}`} draft={draft} existingNames={existingNames} onClose={onClose} onSaved={onSaved} />
      )}
    </Modal>
  );
}

function SubjectForm({ draft, existingNames, onClose, onSaved }: SubjectFormDialogProps & { draft: SubjectDraft }) {
  const [values, setValues] = useState<SubjectValues>({ name: draft.name, description: draft.description });
  const [errors, setErrors] = useState<SubjectFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const otherNames = existingNames.filter((name) => name !== draft.name || !draft.id);

  function update(field: keyof SubjectValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError(null);
    const found = validateSubject(values, otherNames);
    setErrors(found);
    const first = (["name", "description"] as const).find((field) => found[field]);
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    startTransition(async () => {
      const result = await saveSubjectAction(draft.id, values);
      if (result.ok) {
        onSaved(values.name.trim(), !draft.id);
        return;
      }
      setErrors(result.fieldErrors);
      setFormError(result.formError);
      if (result.fieldErrors.name) form.querySelector<HTMLElement>('[name="name"]')?.focus();
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        name="name"
        label="Nome"
        autoFocus
        autoComplete="off"
        maxLength={SUBJECT_NAME_MAX + 20}
        placeholder="Ex.: Trigonometria"
        value={values.name}
        error={errors.name}
        disabled={pending}
        onChange={(event) => update("name", event.target.value)}
      />
      <TextAreaField
        name="description"
        label="Descrição"
        optional
        maxLength={SUBJECT_DESCRIPTION_MAX}
        placeholder="O que entra neste assunto? Ex.: seno, cosseno e tangente."
        hint="Ajuda você a lembrar o que cobrir."
        value={values.description}
        error={errors.description}
        disabled={pending}
        onChange={(event) => update("description", event.target.value)}
      />
      <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="sm:w-auto" loading={pending} loadingLabel="Salvando…">
          {draft.id ? "Salvar alterações" : "Criar assunto"}
        </Button>
      </div>
    </form>
  );
}
