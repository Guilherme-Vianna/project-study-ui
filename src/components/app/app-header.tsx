import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { profileOf } from "@/lib/api/account";
import {
  EXERCISES_PATH,
  HOME_PATH,
  MY_PLAN_PATH,
  MY_SKILLS_PATH,
  PLANS_PATH,
  PRACTICE_PATH,
  REVIEWS_PATH,
  SKILLS_PATH,
  STUDENTS_PATH,
  SUBJECTS_PATH,
} from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { ROLE_COPY, type Role } from "@/lib/profile/roles";
import { AccountMenu } from "./account-menu";
import { MainNav, type NavItem } from "./main-nav";
import { ProductTour } from "./product-tour";

const navigation: Record<Role, NavItem[]> = {
  teacher: [
    { href: HOME_PATH, label: "Início" },
    { href: STUDENTS_PATH, label: "Alunos" },
    { href: PLANS_PATH, label: "Planos" },
    { href: REVIEWS_PATH, label: "Correções" },
    { href: EXERCISES_PATH, label: "Exercícios" },
    { href: SKILLS_PATH, label: "Habilidades" },
    { href: SUBJECTS_PATH, label: "Assuntos" },
  ],
  student: [
    { href: HOME_PATH, label: "Início" },
    { href: MY_PLAN_PATH, label: "Meu plano" },
    { href: PRACTICE_PATH, label: "Exercícios" },
    { href: MY_SKILLS_PATH, label: "Habilidades" },
  ],
};

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-8 px-4 sm:px-6 md:h-16 md:flex-nowrap lg:px-8">
        <Link
          href={HOME_PATH}
          aria-label="Project Study, ir para o início"
          className="flex h-14 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:h-auto"
        >
          <Logo />
        </Link>
        <Suspense>
          <HeaderNav />
        </Suspense>
        <Suspense fallback={<span aria-hidden="true" className="size-9 animate-pulse rounded-full bg-border" />}>
          <HeaderAccount />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderNav() {
  const { account } = await loadCurrentAccount();
  if (!account?.role) return null;
  return (
    <>
      <MainNav items={navigation[account.role]} />
      <ProductTour accountId={account.uid} role={account.role} />
    </>
  );
}

async function HeaderAccount() {
  const { user, account } = await loadCurrentAccount();
  if (!account) return <SignOutButton />;

  const profile = profileOf(account);
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const name = fullName || account.name || user.name || account.email || "Sua conta";

  return (
    <AccountMenu
      name={name}
      email={account.email ?? user.email}
      roleLabel={account.role ? ROLE_COPY[account.role].label : null}
      canReplayTour={Boolean(account.role)}
    />
  );
}
