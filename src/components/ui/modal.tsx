"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  locked?: boolean;
  size?: "md" | "xl";
  children: ReactNode;
};

export function Modal({ open, onClose, title, description, locked = false, size = "md", children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        if (locked) event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !locked) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-3xl border border-border p-0 text-ink shadow-2xl backdrop:bg-ink/40 ${
        size === "xl" ? "max-h-[92vh] max-w-3xl overflow-y-auto bg-canvas" : "max-w-md bg-surface"
      }`}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="-mt-2 text-muted">
              {description}
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
