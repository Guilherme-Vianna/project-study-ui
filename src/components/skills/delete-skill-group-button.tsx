"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashIcon } from "@/components/ui/icons";
import { deleteSkillGroupAction } from "@/lib/skills/actions";

export function DeleteSkillGroupButton({ groupId, name }: { groupId: string; name: string }) {
  return (
    <ConfirmDialog
      title={`Excluir “${name}”?`}
      description="O grupo, seus níveis e habilidades saem da sua lista. Grupos com habilidades em exercícios ou avaliações de alunos não podem ser excluídos."
      confirmLabel="Excluir grupo"
      pendingLabel="Excluindo…"
      onConfirm={() => deleteSkillGroupAction(groupId)}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          aria-label={`Excluir ${name}`}
          title="Excluir"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
        >
          <TrashIcon />
        </button>
      )}
    />
  );
}
