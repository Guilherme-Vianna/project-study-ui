"use client";

import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { createInviteAction, type CreateInviteState } from "@/lib/invites/actions";
import { DEFAULT_INVITE_VALIDITY, INVITE_VALIDITY_OPTIONS } from "@/lib/invites/validity";

function subscribeNever() {
  return () => undefined;
}

function browserCanShare() {
  return typeof navigator.share === "function";
}

const initialState: CreateInviteState = { token: null, error: null };

export function InviteCreator({ origin, invitePathPrefix }: { origin: string; invitePathPrefix: string }) {
  const [state, formAction, pending] = useActionState(createInviteAction, initialState);
  const canShare = useSyncExternalStore(subscribeNever, browserCanShare, () => false);
  const resultRef = useRef<HTMLDivElement>(null);
  const link = state.token ? `${origin}${invitePathPrefix}/${encodeURIComponent(state.token)}` : null;

  useEffect(() => {
    if (state.token) resultRef.current?.focus();
  }, [state.token]);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-4">
        <fieldset>
          <legend className="text-sm font-medium text-ink">Validade do link</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {INVITE_VALIDITY_OPTIONS.map((option) => (
              <label key={option.value} className="relative">
                <input
                  type="radio"
                  name="validity"
                  value={option.value}
                  defaultChecked={option.value === DEFAULT_INVITE_VALIDITY}
                  disabled={pending}
                  className="peer sr-only"
                />
                <span className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-sm text-ink transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-medium peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:border-border-strong">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">Qualquer aluno com o link pode entrar na sua turma enquanto ele estiver ativo.</p>
        </fieldset>
        <Button type="submit" loading={pending} loadingLabel="Gerando link…">
          Gerar link de convite
        </Button>
      </form>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      {link && !pending && (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-success/40 bg-success-soft p-4 outline-none"
        >
          <p className="text-sm font-medium text-success-strong">Link criado! Envie para seus alunos.</p>
          <input
            readOnly
            value={link}
            aria-label="Link de convite"
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 w-full rounded-full border border-border bg-surface px-4 text-sm text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={link} />
            {canShare && (
              <button
                type="button"
                onClick={() => navigator.share({ title: "Convite para minha turma", url: link }).catch(() => undefined)}
                className="inline-flex h-10 cursor-pointer items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Compartilhar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
