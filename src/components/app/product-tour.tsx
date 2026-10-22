"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { HOME_PATH } from "@/lib/auth/constants";
import type { Role } from "@/lib/profile/roles";
import { hasSeenTour, markTourSeen, START_TOUR_EVENT, TOUR_STEPS } from "@/lib/tour/steps";

const AUTO_START_DELAY_MS = 400;
const SPOTLIGHT_PADDING = 6;
const GAP = 12;
const GUTTER = 16;
const CARD_WIDTH = 360;

type Rect = { top: number; left: number; width: number; height: number };

type ProductTourProps = {
  accountId: string;
  role: Role;
};

export function ProductTour({ accountId, role }: ProductTourProps) {
  const pathname = usePathname();
  const [step, setStep] = useState<number | null>(null);

  const start = useCallback(() => setStep(0), []);

  useEffect(() => {
    if (pathname !== HOME_PATH || hasSeenTour(accountId)) return;
    const timer = window.setTimeout(start, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [accountId, pathname, start]);

  useEffect(() => {
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, [start]);

  if (step === null) return null;

  function finish() {
    markTourSeen(accountId);
    setStep(null);
  }

  return createPortal(
    <TourStepCard steps={TOUR_STEPS[role]} index={step} onChange={setStep} onFinish={finish} />,
    document.body,
  );
}

type TourStepCardProps = {
  steps: (typeof TOUR_STEPS)[Role];
  index: number;
  onChange: (index: number) => void;
  onFinish: () => void;
};

function TourStepCard({ steps, index, onChange, onFinish }: TourStepCardProps) {
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const current = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus();
  }, []);

  useLayoutEffect(() => {
    const target = current.target ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`) : null;
    target?.scrollIntoView({ block: "nearest", inline: "center" });

    function measure() {
      const box = target?.getBoundingClientRect();
      setRect(box && box.width > 0 ? { top: box.top, left: box.left, width: box.width, height: box.height } : null);
    }

    measure();
    primaryRef.current?.focus();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [current]);

  function next() {
    if (isLast) onFinish();
    else onChange(index + 1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onFinish();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft" && !isFirst) {
      event.preventDefault();
      onChange(index - 1);
    } else if (event.key === "Tab") {
      const focusable = [...(cardRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
      const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? focusable[focusable.length - 1] : focusable[0])?.focus();
      }
    }
  }

  const cardStyle = rect
    ? {
        top: rect.top + rect.height + SPOTLIGHT_PADDING + GAP,
        left: `clamp(${GUTTER}px, ${rect.left + rect.width / 2}px - min(${CARD_WIDTH}px, 100vw - ${GUTTER * 2}px) / 2, 100vw - ${GUTTER}px - min(${CARD_WIDTH}px, 100vw - ${GUTTER * 2}px))`,
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl shadow-[0_0_0_9999px_rgb(15_23_42/0.55)] ring-2 ring-primary motion-safe:transition-all motion-safe:duration-300"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-ink/55" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={cardStyle}
        className={`fixed flex w-[min(22.5rem,calc(100vw-2rem))] flex-col gap-4 rounded-3xl border border-border bg-surface p-6 text-ink shadow-2xl ${
          rect ? "" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-primary">
            {index + 1} de {steps.length}
          </p>
          {!isLast && (
            <button
              type="button"
              onClick={onFinish}
              className="cursor-pointer rounded-sm text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Pular tour
            </button>
          )}
        </div>
        <div>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {current.title}
          </h2>
          <p id={bodyId} className="mt-2 text-muted">
            {current.body}
          </p>
        </div>
        <div aria-hidden="true" className="flex gap-1.5">
          {steps.map((item, position) => (
            <span
              key={item.title}
              className={`h-1.5 rounded-full motion-safe:transition-all ${position === index ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-end gap-3">
          {!isFirst && (
            <Button variant="secondary" onClick={() => onChange(index - 1)}>
              Voltar
            </Button>
          )}
          <Button ref={primaryRef} block={false} onClick={next}>
            {isLast ? "Concluir" : isFirst ? "Vamos lá" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
