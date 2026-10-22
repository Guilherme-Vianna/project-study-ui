import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PlanProgress } from "@/components/plans/plan-progress";
import { NoPlan } from "@/components/practice/no-plan";
import { ApiError } from "@/lib/api/client";
import { personName } from "@/lib/api/enrollments";
import { getMyProgress, getMyStudyPlan } from "@/lib/api/plans";
import { MY_PLAN_PATH, PRACTICE_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";
import { formatHours } from "@/lib/exercises/model";
import { formatDate } from "@/lib/invites/validity";
import { isoDate, shiftDate, weekLabel } from "@/lib/plans/weeks";

export const metadata: Metadata = {
  title: "Meu plano",
};

export default function MyPlanPage({ searchParams }: PageProps<"/meu-plano">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando seu plano…" />}>
      <MyPlan searchParams={searchParams} />
    </Suspense>
  );
}

const linkButton =
  "inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink hover:border-border-strong hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

async function MyPlan({ searchParams }: Pick<PageProps<"/meu-plano">, "searchParams">) {
  const [account, params] = await Promise.all([requireStudentAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={MY_PLAN_PATH} />;
  const week = typeof params.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.semana) ? params.semana : undefined;

  let data;
  try {
    data = await Promise.all([getMyStudyPlan(), getMyProgress(week)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <>
          <PageHeader title="Meu plano" />
          <NoPlan />
        </>
      );
    }
    return <ApiUnavailable retryHref={MY_PLAN_PATH} />;
  }
  const [plan, progress] = data;
  const teacher = personName(plan.teacher) || "seu professor";
  const today = isoDate(new Date());
  const previous = shiftDate(progress.week_start, -7);
  const next = shiftDate(progress.week_start, 7);
  const isCurrentWeek = progress.week_start <= today && today <= progress.week_end;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Meu plano"
        title={plan.title}
        description={plan.description ?? undefined}
        actions={
          <Link
            href={PRACTICE_PATH}
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Praticar {plan.available_exercises} {plan.available_exercises === 1 ? "exercício" : "exercícios"}
          </Link>
        }
      />
      <p className="-mt-6 text-sm text-muted">
        Plano de {teacher}, desde {formatDate(plan.assigned_at)} · meta de {formatHours(plan.required_weekly_hours)} por semana
      </p>

      <section aria-labelledby="week-title" className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="week-title" className="text-lg font-semibold text-ink">
            {isCurrentWeek ? "Esta semana" : "Semana"} · {weekLabel(progress.week_start, progress.week_end)}
          </h2>
          <nav aria-label="Trocar semana" className="flex gap-2">
            <Link href={`${MY_PLAN_PATH}?semana=${previous}`} className={linkButton}>
              ← Anterior
            </Link>
            {!isCurrentWeek && (
              <Link href={next > today ? MY_PLAN_PATH : `${MY_PLAN_PATH}?semana=${next}`} className={linkButton}>
                Próxima →
              </Link>
            )}
          </nav>
        </div>
        <PlanProgress progress={progress} subjectsOpen />
      </section>

      <p className="text-sm text-muted">
        Cada resposta que você envia soma o tempo estudado em todos os assuntos do plano ligados ao exercício. Exercícios de resposta aberta
        podem ser feitos quantas vezes você quiser; os de múltipla escolha, uma vez.
      </p>
    </div>
  );
}
