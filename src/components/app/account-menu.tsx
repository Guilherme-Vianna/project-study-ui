"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Spinner } from "@/components/ui/spinner";
import { LOGIN_PATH, PROFILE_PATH } from "@/lib/auth/constants";
import { destroyServerSession } from "@/lib/auth/client-session";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { initialsOf } from "@/lib/people";
import { ACCOUNT_TOUR_TARGET, startTour } from "@/lib/tour/steps";

type AccountMenuProps = {
  name: string;
  email: string | null;
  roleLabel: string | null;
  canReplayTour?: boolean;
};

export function AccountMenu({ name, email, roleLabel, canReplayTour = false }: AccountMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function handlePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  function close({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      close({ restoreFocus: false });
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    if (isFirebaseConfigured()) await signOut(getFirebaseAuth());
    await destroyServerSession();
    router.replace(LOGIN_PATH);
  }

  return (
    <div ref={containerRef} data-tour={ACCOUNT_TOUR_TARGET} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-label={`Abrir menu da conta de ${name}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex cursor-pointer items-center gap-3 rounded-full p-1 pr-1 transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:pr-3"
      >
        <Avatar name={name} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-ink">{name}</span>
          {roleLabel && <span className="block text-xs leading-tight text-muted">{roleLabel}</span>}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`hidden size-4 text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Conta"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-ink/10"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-4">
            <Avatar name={name} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{name}</p>
              {email && <p className="truncate text-sm text-muted">{email}</p>}
            </div>
          </div>
          <div className="p-2">
            <Link
              href={PROFILE_PATH}
              role="menuitem"
              onClick={() => close({ restoreFocus: false })}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink outline-none hover:bg-canvas focus-visible:bg-canvas"
            >
              <UserIcon />
              Meu perfil
            </Link>
            {canReplayTour && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close({ restoreFocus: false });
                  startTour();
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-ink outline-none hover:bg-canvas focus-visible:bg-canvas"
              >
                <CompassIcon />
                Ver tour do sistema
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={handleSignOut}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-ink outline-none hover:bg-canvas focus-visible:bg-canvas disabled:cursor-wait disabled:text-muted"
            >
              {signingOut ? <Spinner className="size-5" /> : <SignOutIcon />}
              {signingOut ? "Saindo…" : "Sair"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
    >
      {initialsOf(name)}
    </span>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" strokeLinejoin="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
