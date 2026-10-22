import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PlanProgress } from "@/components/plans/plan-progress";
import { CompleteProfileCard } from "@/components/profile/complete-profile-card";
import { Alert } from "@/components/ui/alert";
import { BooksIcon, CalendarIcon, ClipboardIcon, UsersIcon } from "@/components/ui/icons";
import { profileOf } from "@/lib/api/account";
import { listAttempts } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { listMyInvites, listMyStudents, listMyTeachers, personName } from "@/lib/api/enrollments";
import { listMyExercises } from "@/lib/api/exercises";
import { getMyProgress, getMyStudyPlan, listMyPlans } from "@/lib/api/plans";
import { listSkillGroups } from "@/lib/api/skills";
import { listMySubjects } from "@/lib/api/subjects";
import {
  EXERCISES_PATH,
  HOME_PATH,
  MY_PLAN_PATH,
  ONBOARDING_PATH,
  PLANS_PATH,
  PRACTICE_PATH,
  REVIEWS_PATH,
  SKILLS_PATH,
  STUDENTS_PATH,
  SUBJECTS_PATH,
} from "@/lib/auth/constants";
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
    data = await Promise.all([
      listMyStudents(),
      listMyInvites(),
      listMySubjects(),
      listMyExercises(),
      listMyPlans(),
      listAttempts({ review_status: "pending" }, { limit: 1 }),
      listSkillGroups(),
    ]);
  } catch {
    return <ApiUnavailable retryHref={HOME_PATH} />;
  }
  const [students, invites, subjects, exercises, plans, pending, skillGroups] = data;
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
            ? "Monte um plano com metas semanais por assunto e atribua aos seus alunos."
            : plural(plans.length, "plano criado", "planos criados")
        }
        href={PLANS_PATH}
        action={plans.length === 0 ? "Criar plano" : "Ver planos"}
      />
      <OverviewCard
        icon={<ClipboardIcon className="size-5" />}
        title="Correções"
        summary={
          pending.total === 0
            ? "Nenhuma resposta esperando correção."
            : `${plural(pending.total, "resposta esperando", "respostas esperando")} sua correção.`
        }
        href={REVIEWS_PATH}
        action={pending.total === 0 ? "Ver respostas" : "Corrigir agora"}
      />
      <OverviewCard
        icon={<BooksIcon className="size-5" />}
        title="Habilidades"
        summary={
          skillGroups.length === 0
            ? "Crie grupos com níveis, como Inglês → Listening, e avalie a evolução de cada aluno."
            : plural(skillGroups.length, "grupo de habilidades", "grupos de habilidades")
        }
        href={SKILLS_PATH}
        action={skillGroups.length === 0 ? "Criar habilidades" : "Ver habilidades"}
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

async function loadStudentPlan() {
  try {
    const [plan, progress] = await Promise.all([getMyStudyPlan(), getMyProgress()]);
    return { plan, progress };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function StudentOverview() {
  let data;
  try {
    data = await Promise.all([listMyTeachers(), loadStudentPlan()]);
  } catch {
    return <ApiUnavailable retryHref={HOME_PATH} />;
  }
  const [teachers, current] = data;

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
    <div className="flex flex-col gap-6">
      {current ? (
        <section className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <CalendarIcon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-primary">Seu plano</p>
                <h2 className="text-xl font-semibold text-ink">{current.plan.title}</h2>
              </div>
            </div>
            <Link
              href={PRACTICE_PATH}
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Praticar
            </Link>
          </div>
          <PlanProgress progress={current.progress} />
          <Link href={MY_PLAN_PATH} className="self-start rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline">
            Ver metas por assunto
          </Link>
        </section>
      ) : (
        <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">Seu plano de estudo vai aparecer aqui quando o professor atribuir um.</p>
      )}
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
    </Panel>
    </div>
  );
}
