"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TrashIcon } from "@/components/ui/icons";
import { deletePackageAction } from "@/lib/packages/actions";

export function DeletePackageButton({ packageId, title }: { packageId: string; title: string }) {
  return (
    <ConfirmDialog
      title="Excluir pacote?"
      description={`“${title}” será excluído. Os exercícios continuam na sua lista.`}
      confirmLabel="Excluir"
      pendingLabel="Excluindo…"
      onConfirm={() => deletePackageAction(packageId)}
      trigger={(show) => (
        <button
          type="button"
          onClick={show}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-full px-4 text-sm font-medium text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-primary"
        >
          <TrashIcon className="size-4" /> Excluir pacote
        </button>
      )}
    />
  );
}
