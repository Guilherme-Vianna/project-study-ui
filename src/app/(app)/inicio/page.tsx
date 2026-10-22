import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { CompleteProfileCard } from "@/components/profile/complete-profile-card";
import { Alert } from "@/components/ui/alert";
import { profileOf } from "@/lib/api/account";
import { listMyInvites, listMyStudents, listMyTeachers, personName } from "@/lib/api/enrollments";
import { HOME_PATH, ONBOARDING_PATH, STUDENTS_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { initialsOf } from "@/lib/people";
import { isRole, ROLE_COPY } from "@/lib/profile/roles";

export const metadata: Metadata = {
  title: "Início",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageLoading label="Carregando sua conta…" />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: { searchParams: SearchParams }) {
  const [{ user, account }, params] = await Promise.all([loadCurrentAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={HOME_PATH} />;
  const profile = profileOf(account);
  if (!account.role || !profile) redirect(ONBOARDING_PATH);

  const welcome = params["bem-vindo"];
  const firstName = profile.first_name ?? (account.name ?? user.name ?? "").split(" ")[0];

  return (
    <div className="space-y-6">
      {isRole(welcome) && <Alert tone="success">Pronto! Seu perfil {ROLE_COPY[welcome].article} foi criado.</Alert>}
      {params.turma === "entrou" && <Alert tone="success">Você entrou na turma! Seu professor já pode te enviar planos de estudo.</Alert>}
      <PageHeader
        eyebrow={ROLE_COPY[account.role].label}
        title={firstName ? `Olá, ${firstName}` : "Olá!"}
        description="Bom te ver por aqui."
      />
      <CompleteProfileCard profile={profile} />
      <Suspense fallback={<PageLoading />}>{account.role === "teacher" ? <TeacherOverview /> : <StudentOverview />}</Suspense>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">{children}</section>;
}

async function TeacherOverview() {
  let data;
  try {
    data = await Promise.all([listMyStudents(), listMyInvites()]);
  } catch {
    return <ApiUnavailable retryHref={HOME_PATH} />;
  }
  const [students, invites] = data;
  const activeInvites = invites.filter((invite) => invite.is_active).length;

  return (
    <Panel>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Sua turma</h2>
          <p className="mt-1 text-muted">
            {students.length === 0
              ? "Ninguém na turma ainda. Gere um link de convite e envie para seus alunos."
              : `${students.length} ${students.length === 1 ? "aluno" : "alunos"} · ${activeInvites} ${
                  activeInvites === 1 ? "link ativo" : "links ativos"
                }`}
          </p>
        </div>
        <Link
          href={STUDENTS_PATH}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {students.length === 0 ? "Convidar alunos" : "Ver alunos"}
        </Link>
      </div>
    </Panel>
  );
}

async function StudentOverview() {
  let teachers;
  try {
    teachers = await listMyTeachers();
  } catch {
    return <ApiUnavailable retryHref={HOME_PATH} />;
  }

  if (teachers.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-ink">Você ainda não está em nenhuma turma</h2>
        <p className="mt-2 max-w-xl text-muted">
          Peça ao seu professor o link de convite e abra no navegador. Depois de confirmar, seus planos de estudo aparecem
          aqui.
        </p>
      </div>
    );
  }

  return (
    <Panel>
      <h2 className="text-xl font-semibold text-ink">Seus professores</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {teachers.map((teacher) => {
          const name = personName(teacher) || "Professor";
          return (
            <li key={teacher.id} className="flex items-center gap-3 rounded-2xl border border-border p-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success-strong"
              >
                {initialsOf(name)}
              </span>
              <span className="font-medium text-ink">{name}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-muted">Seus planos de estudo vão aparecer aqui quando o professor enviar.</p>
    </Panel>
  );
}
