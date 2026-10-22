import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { HOME_PATH, ONBOARDING_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { ROLE_COPY, ROLES, type Role } from "@/lib/profile/roles";

export const metadata: Metadata = {
  title: "Escolha seu perfil",
};

const options: Record<Role, { title: string; description: string; icon: ReactNode }> = {
  teacher: {
    title: "Sou professor",
    description: "Monte planos de estudo, cadastre exercícios e acompanhe o progresso dos seus alunos.",
    icon: <TeacherIcon />,
  },
  student: {
    title: "Sou aluno",
    description: "Siga o plano de estudos do seu professor e marque os exercícios que concluir.",
    icon: <StudentIcon />,
  },
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RoleChoice />
    </Suspense>
  );
}

async function RoleChoice() {
  const { user, account } = await loadCurrentAccount();
  if (!account) return <ApiUnavailable retryHref={ONBOARDING_PATH} />;
  if (account.role) redirect(HOME_PATH);

  const firstName = (account.name ?? user.name ?? "").split(" ")[0];

  return (
    <section className="max-w-3xl">
      <PageHeader
        eyebrow="Primeiro acesso"
        title={firstName ? `${firstName}, como você vai usar o Project Study?` : "Como você vai usar o Project Study?"}
        description="Escolha uma opção. Cada conta é de professor ou de aluno, não as duas."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {ROLES.map((role) => (
          <li key={role}>
            <Link
              href={ROLE_COPY[role].signupPath}
              className="group flex h-full flex-col rounded-3xl border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                {options[role].icon}
              </span>
              <span className="mt-5 text-xl font-semibold text-ink">{options[role].title}</span>
              <span className="mt-2 flex-1 text-muted">{options[role].description}</span>
              <span className="mt-6 inline-flex items-center gap-2 font-medium text-primary">
                Criar perfil {ROLE_COPY[role].article}
                <span aria-hidden="true" className="transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeacherIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 5h18v11H3z" strokeLinejoin="round" />
      <path d="M8 20h8M12 16v4M7 9h6M7 12h4" strokeLinecap="round" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 9l10-5 10 5-10 5L2 9Z" strokeLinejoin="round" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" strokeLinejoin="round" />
    </svg>
  );
}
