"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { ProfileFormState } from "@/lib/profile/action-state";
import {
  formatMobilePhone,
  formatPostalCode,
  MIN_BIRTH_DATE,
  PROFILE_FIELDS,
  PROFILE_LABELS,
  validateProfile,
  type ProfileField,
  type ProfileFieldErrors,
  type ProfileValues,
} from "@/lib/profile/fields";
import { useCepLookup } from "./use-cep-lookup";

type ProfileFormProps = {
  action: (state: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  initialValues: ProfileValues;
  audience: string;
  locked?: readonly ProfileField[];
  today: string;
  submitLabel: string;
  pendingLabel: string;
  cancelHref?: string;
  hiddenFields?: Record<string, string>;
};

const initialState: ProfileFormState = { fieldErrors: {}, formError: null };

export function ProfileForm({
  action,
  initialValues,
  audience,
  locked = [],
  today,
  submitLabel,
  pendingLabel,
  cancelHref,
  hiddenFields = {},
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState<ProfileFieldErrors>({});
  const [edited, setEdited] = useState<ReadonlySet<ProfileField>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const cep = useCepLookup(values.postal_code);

  const errors: ProfileFieldErrors = {};
  for (const field of PROFILE_FIELDS) {
    const message = clientErrors[field] ?? (edited.has(field) ? undefined : state.fieldErrors[field]);
    if (message) errors[field] = message;
  }
  const formError = Object.values(clientErrors).some(Boolean) ? null : state.formError;

  useEffect(() => {
    const first = PROFILE_FIELDS.find((field) => state.fieldErrors[field]);
    if (first) focusField(formRef.current, first);
    else if (state.formError) formErrorRef.current?.focus();
  }, [state]);

  function update(field: ProfileField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setEdited((current) => new Set(current).add(field));
    if (clientErrors[field]) {
      setClientErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateProfile(values, { locked, today });
    setClientErrors(found);
    const first = PROFILE_FIELDS.find((field) => found[field]);
    if (first) {
      focusField(event.currentTarget, first);
      return;
    }
    setEdited(new Set());
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const fieldProps = (field: ProfileField) => ({
    name: field,
    label: PROFILE_LABELS[field],
    value: values[field],
    error: errors[field],
    disabled: pending,
  });

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {formError && (
        <div ref={formErrorRef} tabIndex={-1} className="scroll-mt-6 outline-none">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-lg font-semibold text-ink">{audience}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            {...fieldProps("first_name")}
            autoComplete="given-name"
            onChange={(event) => update("first_name", event.target.value)}
          />
          <TextField
            {...fieldProps("last_name")}
            autoComplete="family-name"
            onChange={(event) => update("last_name", event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-semibold text-ink">Dados pessoais</legend>
        <p className="text-sm text-muted">
          Ficam visíveis só para você. Se preferir, preencha depois em &quot;Editar perfil&quot;.
        </p>
        <TextField
          {...fieldProps("mobile_phone")}
          optional={!locked.includes("mobile_phone")}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          hint="Celular com DDD."
          onChange={(event) => update("mobile_phone", formatMobilePhone(event.target.value))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            {...fieldProps("birth_date")}
            optional={!locked.includes("birth_date")}
            type="date"
            min={MIN_BIRTH_DATE}
            max={today}
            autoComplete="bday"
            onChange={(event) => update("birth_date", event.target.value)}
          />
          <TextField
            {...fieldProps("postal_code")}
            optional={!locked.includes("postal_code")}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="01310-100"
            hint={<CepHint lookup={cep} />}
            onChange={(event) => update("postal_code", formatPostalCode(event.target.value))}
          />
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {cancelHref && (
          <Link
            href={cancelHref}
            className="inline-flex h-12 items-center justify-center rounded-full px-6 font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Cancelar
          </Link>
        )}
        <Button type="submit" className="sm:w-auto" loading={pending} loadingLabel={pendingLabel}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function focusField(form: HTMLFormElement | null, field: ProfileField) {
  const element = form?.elements.namedItem(field);
  if (element instanceof HTMLInputElement) element.focus();
}

function CepHint({ lookup }: { lookup: ReturnType<typeof useCepLookup> }) {
  if (lookup.status === "loading") return <span aria-live="polite">Buscando endereço…</span>;
  if (lookup.status === "found") {
    return (
      <span aria-live="polite" className="text-success-strong">
        {lookup.place}
      </span>
    );
  }
  if (lookup.status === "not-found") {
    return (
      <span aria-live="polite" className="text-accent-strong">
        Não encontramos este CEP. Confira os números.
      </span>
    );
  }
  return "Só os números; o traço entra sozinho.";
}
