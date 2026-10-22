import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { AssignStudentButton } from "@/components/plans/assign-student-button";
import { DeletePlanButton, EndAssignmentButton } from "@/components/plans/plan-actions";
import { PlanNotFound } from "@/components/plans/plan-not-found";
import { Alert } from "@/components/ui/alert";
import { BooksIcon, ClipboardIcon, PencilIcon, UsersIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { listMyStudents, personName } from "@/lib/api/enrollments";
import { getAssignmentProgress, getPlan, listActiveAssignments, listMyPlans, type Progress } from "@/lib/api/plans";
import { PLANS_PATH } from "@/lib/auth/constants";
import { EXERCISE_TYPE_LABELS, formatHours } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { formatDate } from "@/lib/invites/validity";
import { initialsOf } from "@/lib/people";
import { WEEKDAYS } from "@/lib/plans/model";
import { formatMobilePhone } from "@/lib/profile/fields";

export const metadata: Metadata = {
  title: "Plano de estudo",
};

export default function PlanPage({ params, searchParams }: PageProps<"/planos/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando plano…" />}>
      <PlanDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const weekdayShort = new Map(WEEKDAYS.map((day) => [day.value, day.short]));

async function PlanDetail({ params, searchParams }: PageProps<"/planos/[id]">) {
  const [account, { id }, query] = await Promise.all([requireTeacherAccount(), params, searchParams]);
  const href = `${PLANS_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;

  let data;
  try {
    data = await Promise.all([getPlan(id), listActiveAssignments(id), listMyStudents(), listMyPlans()]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return <PlanNotFound />;
    return <ApiUnavailable retryHref={href} />;
  }
  const [plan, assignments, students, plans] = data;

  let progress: (Progress | null)[];
  let busy: Map<string, { planId: string; title: string }>;
  try {
    const [progressList, otherAssignments] = await Promise.all([
      Promise.all(assignments.map((assignment) => getAssignmentProgress(plan.id, assignment.id).catch(() => null))),
      Promise.all(plans.map(async (other) => ({ id: other.id, title: other.title, assignments: await listActiveAssignments(other.id) }))),
    ]);
    progress = progressList;
    busy = new Map(
      otherAssignments.flatMap((other) =>
        other.assignments.map((assignment) => [assignment.student_id, { planId: other.id, title: other.title }] as const),
      ),
    );
  } catch {
    return <ApiUnavailable retryHref={href} />;
  }

  const studentName = new Map(students.map((student) => [student.id, personName(student) || "Aluno sem nome"]));
  const exercises = [...plan.exercises].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: PLANS_PATH, label: "Planos" }}
        eyebrow="Plano de estudo"
        title={plan.title}
        description={plan.description ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {assignments.length === 0 && <DeletePlanButton planId={plan.id} title={plan.title} />}
            <Link
              href={`${href}/editar`}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <PencilIcon />
              Editar plano
            </Link>
          </div>
        }
      />
      {query.salvo === "criado" && <Alert tone="success">Plano criado! Agora atribua a seus alunos.</Alert>}
      {query.salvo === "editado" && <Alert tone="success">Alterações salvas. Os alunos já veem a versão nova.</Alert>}

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Meta semanal" value={plan.required_weekly_hours ? formatHours(plan.required_weekly_hours) : "—"} />
        <Stat label="Horas de exercícios" value={plan.allocated_hours ? formatHours(plan.allocated_hours) : "—"} />
        <Stat label="Exercícios" value={String(plan.exercises.length)} />
        <Stat label="Alunos" value={String(assignments.length)} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel title="Alunos com este plano" icon={<UsersIcon className="size-5" />}>
          <AssignStudentButton
            planId={plan.id}
            planTitle={plan.title}
            students={students.map((student) => {
              const current = busy.get(student.id);
              return {
                id: student.id,
                name: studentName.get(student.id) ?? "Aluno",
                phone: student.mobile_phone ? formatMobilePhone(student.mobile_phone) : null,
                status: !current ? "free" : current.planId === plan.id ? "this-plan" : "other-plan",
                otherPlanTitle: current && current.planId !== plan.id ? current.title : null,
              };
            })}
          />
          {assignments.length === 0 ? (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">Nenhum aluno segue este plano ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {assignments.map((assignment, index) => {
                const name = studentName.get(assignment.student_id) ?? "Aluno";
                const stats = progress[index];
                const rate = stats ? Math.round(stats.completion_rate * 100) : 0;
                return (
                  <li key={assignment.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                        {initialsOf(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{name}</p>
                        <p className="text-xs text-muted">Desde {formatDate(assignment.created_at)}</p>
                      </div>
                      <EndAssignmentButton planId={plan.id} assignmentId={assignment.id} studentName={name} />
                    </div>
                    {stats ? (
                      <div className="mt-4 flex flex-col gap-3">
                        <ProgressBar label="Plano concluído" value={rate} detail={`${stats.completed_exercises} de ${stats.total_exercises} exercícios · ${rate}%`} tone="success" />
                        <ProgressBar
                          label="Esta semana"
                          value={stats.required_weekly_hours ? Math.min(100, Math.round((stats.week_completed_hours / stats.required_weekly_hours) * 100)) : 0}
                          detail={`${formatHours(stats.week_completed_hours)} de ${formatHours(stats.required_weekly_hours)}`}
                          tone="primary"
                        />
                        {stats.subjects.length > 0 && (
                          <details className="rounded-xl bg-canvas px-3 py-2">
                            <summary className="cursor-pointer text-sm font-medium text-ink">Por assunto nesta semana</summary>
                            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                              {stats.subjects.map((subject) => (
                                <li key={subject.subject.id} className="flex justify-between gap-3">
                                  <span className="text-ink">{subject.subject.name}</span>
                                  <span className={subject.week_remaining_hours > 0 ? "text-muted" : "text-success-strong"}>
                                    {formatHours(subject.week_completed_hours)} de {formatHours(subject.weekly_hours)}
                                    {subject.week_remaining_hours > 0 ? ` · faltam ${formatHours(subject.week_remaining_hours)}` : " ✓"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted">Não foi possível carregar o progresso agora.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Assuntos e metas" icon={<BooksIcon className="size-5" />}>
            {plan.subjects.length === 0 ? (
              <p className="text-sm text-muted">Nenhum assunto. Edite o plano para definir metas semanais.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {plan.subjects.map((item) => (
                  <li key={item.subject.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{item.subject.name}</p>
                      <p className="text-xs text-muted">
                        {item.weekdays.length ? item.weekdays.map((day) => weekdayShort.get(day)).join(", ") : "Qualquer dia"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-sm font-medium text-primary">
                      {formatHours(item.weekly_hours)}/sem
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Exercícios" icon={<ClipboardIcon className="size-5" />}>
            {exercises.length === 0 ? (
              <p className="text-sm text-muted">Nenhum exercício. Edite o plano para adicionar.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-border">
                {exercises.map((item, index) => (
                  <li key={item.exercise.id} className="flex items-start gap-3 py-2.5">
                    <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-semibold text-ink">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{item.exercise.title}</p>
                      <p className="text-xs text-muted">
                        {EXERCISE_TYPE_LABELS[item.exercise.type]}
                        {item.exercise.subjects.length > 0 && ` · ${item.exercise.subjects.map((subject) => subject.name).join(", ")}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-muted">{formatHours(item.allocated_hours)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-semibold text-ink">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-ink">{value}</dd>
    </div>
  );
}

function ProgressBar({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "primary" | "success" }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">{detail}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="mt-1.5 h-2 rounded-full bg-canvas">
        <div className={`h-2 rounded-full ${tone === "success" ? "bg-success" : "bg-primary"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
