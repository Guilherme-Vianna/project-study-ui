import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { profileOf } from "@/lib/api/account";
import { HOME_PATH, STUDENTS_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { ROLE_COPY, type Role } from "@/lib/profile/roles";
import { AccountMenu } from "./account-menu";
import { MainNav, type NavItem } from "./main-nav";

const navigation: Record<Role, NavItem[]> = {
  teacher: [
    { href: HOME_PATH, label: "Início" },
    { href: STUDENTS_PATH, label: "Alunos" },
  ],
  student: [{ href: HOME_PATH, label: "Início" }],
};

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link
            href={HOME_PATH}
            aria-label="Project Study, ir para o início"
            className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <Logo compactOnMobile />
          </Link>
          <Suspense>
            <HeaderNav />
          </Suspense>
        </div>
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
  return <MainNav items={navigation[account.role]} />;
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
    />
  );
}
