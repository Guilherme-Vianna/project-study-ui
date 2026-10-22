import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { Alert } from "@/components/ui/alert";
import { CalendarIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import { listActiveAssignments, listMyPlans } from "@/lib/api/plans";
import { PLANS_PATH } from "@/lib/auth/constants";
import { formatHours } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";

export const metadata: Metadata = {
  title: "Planos de estudo",
};

const primaryLink =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function PlansPage({ searchParams }: PageProps<"/planos">) {
  return (
    <>
      <PageHeader
        title="Planos de estudo"
        description="Modelos com metas semanais por assunto e uma lista de exercícios. Monte uma vez e atribua a quantos alunos quiser."
        actions={
          <Link href={`${PLANS_PATH}/novo`} className={primaryLink}>
            <PlusIcon />
            Novo plano
          </Link>
        }
      />
      <Suspense fallback={<PageLoading label="Carregando planos…" />}>
        <PlansContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PlansContent({ searchParams }: Pick<PageProps<"/planos">, "searchParams">) {
  const [account, params] = await Promise.all([requireTeacherAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={PLANS_PATH} />;

  let plans;
  let assignedCounts: number[];
  try {
    plans = await listMyPlans();
    assignedCounts = await Promise.all(plans.map(async (plan) => (await listActiveAssignments(plan.id)).length));
  } catch {
    return <ApiUnavailable retryHref={PLANS_PATH} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {params.excluido && <Alert tone="success">Plano excluído.</Alert>}
      {plans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-12">
          <h2 className="text-xl font-semibold text-ink">Crie seu primeiro plano de estudo</h2>
          <ol className="mt-4 flex flex-col gap-3 text-muted sm:flex-row sm:gap-8">
            {["Escolha os assuntos e as horas por semana", "Adicione os exercícios na ordem certa", "Atribua o plano aos seus alunos"].map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Link href={`${PLANS_PATH}/novo`} className={`${primaryLink} mt-8`}>
            <PlusIcon />
            Novo plano
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <li key={plan.id}>
              <Link
                href={`${PLANS_PATH}/${plan.id}`}
                className="flex h-full flex-col rounded-3xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <CalendarIcon className="size-5" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      assignedCounts[index] ? "bg-success-soft text-success-strong" : "bg-canvas text-muted"
                    }`}
                  >
                    <UsersIcon className="size-3.5" />
                    {assignedCounts[index]
                      ? `${assignedCounts[index]} ${assignedCounts[index] === 1 ? "aluno" : "alunos"}`
                      : "Sem alunos"}
                  </span>
                </div>
                <h2 className="mt-4 font-semibold text-ink">{plan.title}</h2>
                {plan.description && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{plan.description}</p>}
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                  <MiniStat label="por semana" value={plan.required_weekly_hours ? formatHours(plan.required_weekly_hours) : "—"} />
                  <MiniStat label={plan.subjects.length === 1 ? "assunto" : "assuntos"} value={String(plan.subjects.length)} />
                  <MiniStat label={plan.exercises.length === 1 ? "exercício" : "exercícios"} value={String(plan.exercises.length)} />
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-semibold text-ink">{value}</span>
        <span aria-hidden="true" className="text-xs text-muted">
          {label}
        </span>
      </dd>
    </div>
  );
}
