import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { CompleteProfileCard } from "@/components/profile/complete-profile-card";
import { Alert } from "@/components/ui/alert";
import { BooksIcon, CalendarIcon, ClipboardIcon, UsersIcon } from "@/components/ui/icons";
import { profileOf } from "@/lib/api/account";
import { listMyInvites, listMyStudents, listMyTeachers, personName } from "@/lib/api/enrollments";
import { listMyExercises } from "@/lib/api/exercises";
import { listMyPlans } from "@/lib/api/plans";
import { listMySubjects } from "@/lib/api/subjects";
import { EXERCISES_PATH, HOME_PATH, ONBOARDING_PATH, PLANS_PATH, STUDENTS_PATH, SUBJECTS_PATH } from "@/lib/auth/constants";
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
      {params.convite === "aceito" && <Alert tone="success">Convite aceito! Seu professor já pode te enviar planos de estudo.</Alert>}
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

type OverviewCardProps = {
  icon: ReactNode;
  title: string;
  summary: string;
  href: string;
  action: string;
};

function OverviewCard({ icon, title, summary, href, action }: OverviewCardProps) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">{summary}</p>
        </div>
      </div>
      <Link
        href={href}
        className="mt-auto inline-flex h-11 items-center justify-center self-start rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink hover:border-border-strong hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {action}
      </Link>
    </section>
  );
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

async function TeacherOverview() {
  let data;
  try {
    data = await Promise.all([listMyStudents(), listMyInvites(), listMySubjects(), listMyExercises(), listMyPlans()]);
  } catch {
    return <ApiUnavailable retryHref={HOME_PATH} />;
  }
  const [students, invites, subjects, exercises, plans] = data;
  const activeInvites = invites.filter((invite) => invite.is_active).length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OverviewCard
        icon={<UsersIcon className="size-5" />}
        title="Seus alunos"
        summary={
          students.length === 0
            ? "Você ainda não tem alunos. Gere um link de convite e envie para eles."
            : `${plural(students.length, "aluno", "alunos")} · ${plural(activeInvites, "link ativo", "links ativos")}`
        }
        href={STUDENTS_PATH}
        action={students.length === 0 ? "Convidar alunos" : "Ver alunos"}
      />
      <OverviewCard
        icon={<CalendarIcon className="size-5" />}
        title="Planos de estudo"
        summary={
          plans.length === 0
            ? "Monte um plano com metas semanais e exercícios e atribua aos seus alunos."
            : plural(plans.length, "plano criado", "planos criados")
        }
        href={PLANS_PATH}
        action={plans.length === 0 ? "Criar plano" : "Ver planos"}
      />
      <OverviewCard
        icon={<BooksIcon className="size-5" />}
        title="Assuntos"
        summary={
          subjects.length === 0
            ? "Cadastre os temas que seus alunos vão estudar, como Trigonometria ou Inglês."
            : plural(subjects.length, "assunto cadastrado", "assuntos cadastrados")
        }
        href={SUBJECTS_PATH}
        action={subjects.length === 0 ? "Cadastrar assuntos" : "Ver assuntos"}
      />
      <OverviewCard
        icon={<ClipboardIcon className="size-5" />}
        title="Exercícios"
        summary={
          exercises.length === 0
            ? "Crie questões de múltipla escolha ou de resposta aberta para seus planos de estudo."
            : plural(exercises.length, "exercício cadastrado", "exercícios cadastrados")
        }
        href={EXERCISES_PATH}
        action={exercises.length === 0 ? "Criar exercício" : "Ver exercícios"}
      />
    </div>
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
        <h2 className="text-xl font-semibold text-ink">Você ainda não tem professor</h2>
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
