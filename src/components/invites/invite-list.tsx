"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { revokeInviteAction } from "@/lib/invites/actions";

export type InviteItem = {
  id: string;
  link: string;
  createdLabel: string;
  expiresLabel: string | null;
  inactiveReason: string | null;
};

export function InviteList({ invites }: { invites: InviteItem[] }) {
  const active = invites.filter((invite) => !invite.inactiveReason);
  const inactive = invites.filter((invite) => invite.inactiveReason);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium text-ink">
        Links ativos <span className="text-muted">({active.length})</span>
      </h3>
      {active.length === 0 ? (
        <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">Nenhum link ativo. Gere um acima.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((invite) => (
            <li key={invite.id} className="rounded-2xl border border-border p-4">
              <p className="truncate font-mono text-sm text-ink" title={invite.link}>
                {invite.link.replace(/^https?:\/\//, "")}
              </p>
              <p className="mt-1 text-xs text-muted">
                Criado em {invite.createdLabel} · {invite.expiresLabel ? `vale até ${invite.expiresLabel}` : "sem prazo"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton text={invite.link} />
                <ConfirmDialog
                  title="Desativar este link?"
                  description="Quem ainda não entrou na turma não vai conseguir usar este link. Alunos que já entraram continuam na turma."
                  confirmLabel="Desativar link"
                  pendingLabel="Desativando…"
                  onConfirm={() => revokeInviteAction(invite.id)}
                  trigger={(open) => (
                    <button
                      type="button"
                      onClick={open}
                      className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Desativar
                    </button>
                  )}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {inactive.length > 0 && (
        <details className="group rounded-2xl bg-canvas px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted marker:text-muted">
            Links inativos ({inactive.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {inactive.map((invite) => (
              <li key={invite.id} className="text-sm text-muted">
                <span className="font-mono">…{invite.link.slice(-10)}</span> · {invite.inactiveReason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
