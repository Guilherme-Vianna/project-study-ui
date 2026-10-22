"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { IMAGE_TYPES, type DraftImage } from "@/lib/exercises/model";
import { uploadImage } from "@/lib/exercises/upload";

type ImageUploadButtonProps = {
  label: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  onUploaded: (image: DraftImage) => void;
  onError: (message: string) => void;
  compact?: boolean;
};

export function ImageUploadButton({
  label,
  multiple = false,
  maxFiles = 1,
  disabled = false,
  onUploaded,
  onError,
  compact = false,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  async function handleFiles(files: FileList | null) {
    const selected = [...(files ?? [])].slice(0, maxFiles);
    if (inputRef.current) inputRef.current.value = "";
    if (!selected.length) return;
    if ((files?.length ?? 0) > maxFiles) onError(`Só cabem mais ${maxFiles} imagens; enviamos as primeiras.`);
    setUploading((count) => count + selected.length);
    await Promise.all(
      selected.map(async (file) => {
        const result = await uploadImage(file);
        setUploading((count) => count - 1);
        if (result.ok) onUploaded(result.image);
        else onError(result.error);
      }),
    );
  }

  const busy = uploading > 0;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <button
        type="button"
        disabled={disabled || busy || maxFiles <= 0}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-border-strong bg-surface font-medium text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"
        }`}
      >
        {busy ? <Spinner className="size-4" /> : <ImageIcon />}
        <span aria-live="polite">{busy ? `Enviando${uploading > 1 ? ` ${uploading}` : ""}…` : label}</span>
      </button>
    </>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-8 9" strokeLinejoin="round" />
    </svg>
  );
}
