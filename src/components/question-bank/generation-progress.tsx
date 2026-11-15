"use client";

import { useEffect, useState } from "react";
import type { ProgressState, Step } from "@/lib/question-bank/stream";

function useElapsedSeconds(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      window.clearInterval(timer);
      setSeconds(0);
    };
  }, [running]);
  return seconds;
}

export function GenerationProgress({
  steps,
  progress,
  compact = false,
}: {
  steps: Step[];
  progress: ProgressState;
  compact?: boolean;
}) {
  const seconds = useElapsedSeconds(progress.active !== "done");
  const activeStep = steps.find((step) => step.key === progress.active);
  const visible = steps.filter((step) => step.key !== "fix" || progress.rounds > 0);

  return (
    <div className={`flex flex-col gap-4 ${compact ? "" : "rounded-3xl border border-border bg-surface p-5 sm:p-6"}`}>
      <div className="flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="text-sm font-medium text-ink">
          {activeStep?.label ?? "Preparando…"}
          {progress.active === "fix" && progress.rounds > 1 ? ` (rodada ${progress.rounds})` : ""}
        </p>
        <span className="shrink-0 text-sm tabular-nums text-muted" aria-hidden="true">
          {seconds}s
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-primary-soft"
        role="progressbar"
        aria-label="Progresso da geração"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {!compact && (
        <ol className="flex flex-col gap-2">
          {visible.map((step) => {
            const done = progress.completed.includes(step.key) && step.key !== progress.active;
            const active = step.key === progress.active;
            return (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    done
                      ? "border-success bg-success text-white"
                      : active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-muted"
                  }`}
                >
                  {done ? "✓" : active ? <span className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none" /> : ""}
                </span>
                <span className={done ? "text-muted" : active ? "font-medium text-ink" : "text-muted"}>
                  {step.label}
                  <span className="sr-only">{done ? " (concluído)" : active ? " (em andamento)" : " (aguardando)"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!compact && seconds >= 20 && progress.active !== "done" && (
        <p className="text-sm text-muted">
          A IA resolve cada questão antes de entregar, por isso pode levar até um minuto. Pode continuar nesta página.
        </p>
      )}
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <li aria-hidden="true" className="flex animate-pulse flex-col gap-4 rounded-3xl border border-border bg-surface p-5 motion-reduce:animate-none sm:p-6">
      <div className="flex gap-2">
        <span className="h-6 w-24 rounded-full bg-canvas" />
        <span className="h-6 w-32 rounded-full bg-canvas" />
      </div>
      <span className="h-6 w-2/3 rounded-lg bg-canvas" />
      <div className="flex flex-col gap-2">
        <span className="h-4 w-full rounded bg-canvas" />
        <span className="h-4 w-full rounded bg-canvas" />
        <span className="h-4 w-4/5 rounded bg-canvas" />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className="h-11 w-full rounded-2xl bg-canvas" />
        ))}
      </div>
    </li>
  );
}
