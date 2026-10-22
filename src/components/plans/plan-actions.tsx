"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashIcon } from "@/components/ui/icons";
import { deletePlanAction, endAssignmentAction } from "@/lib/plans/actions";

export function DeletePlanButton({ planId, title }: { planId: string; title: string }) {
  return (
    <ConfirmDialog
      title={`Excluir “${title}”?`}
      description="Só planos que nunca foram atribuídos podem ser excluídos. Assuntos e exercícios continuam salvos."
      confirmLabel="Excluir plano"
      pendingLabel="Excluindo…"
      onConfirm={() => deletePlanAction(planId)}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <TrashIcon />
          Excluir
        </button>
      )}
    />
  );
}

export function EndAssignmentButton({ planId, assignmentId, studentName }: { planId: string; assignmentId: string; studentName: string }) {
  return (
    <ConfirmDialog
      title={`Encerrar o plano de ${studentName}?`}
      description="O aluno deixa de ver este plano. O progresso fica guardado no histórico, e você pode atribuir outro plano depois."
      confirmLabel="Encerrar plano"
      pendingLabel="Encerrando…"
      onConfirm={() => endAssignmentAction(planId, assignmentId)}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          aria-label={`Encerrar o plano de ${studentName}`}
          className="inline-flex h-9 cursor-pointer items-center rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Encerrar
        </button>
      )}
    />
  );
}
