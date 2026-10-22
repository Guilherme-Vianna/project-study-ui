"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

export function CopyButton({ text, label = "Copiar link", className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        state === "copied"
          ? "border-success/40 bg-success-soft text-success-strong"
          : "border-border bg-surface text-ink hover:border-border-strong hover:bg-canvas"
      } ${className}`}
    >
      {state === "copied" ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">
        {state === "copied" ? "Copiado!" : state === "failed" ? "Copie manualmente" : label}
      </span>
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
