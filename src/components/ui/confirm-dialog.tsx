"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { Alert } from "./alert";
import { Button } from "./button";

type ConfirmDialogProps = {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function ConfirmDialog({ trigger, title, description, confirmLabel, pendingLabel, onConfirm }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function show() {
    setError(null);
    setOpen(true);
  }

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) setOpen(false);
      else setError(result.error);
    });
  }

  return (
    <>
      {trigger(show)}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => setOpen(false)}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) setOpen(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-border bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40"
      >
        {open && (
          <div className="flex flex-col gap-4 p-6">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <div id={descriptionId} className="text-muted">
              {description}
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" autoFocus disabled={pending} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="sm:w-auto"
                loading={pending}
                loadingLabel={pendingLabel}
                onClick={confirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
