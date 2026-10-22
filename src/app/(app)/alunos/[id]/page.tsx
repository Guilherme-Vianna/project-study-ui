import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { CorrectnessBadge, ReviewBadge } from "@/components/attempts/attempt-parts";
import { PlanProgress } from "@/components/plans/plan-progress";
import { StudentSkillsPanel, type Assessment } from "@/components/skills/student-skills-panel";
import { BooksIcon, CalendarIcon, ClipboardIcon } from "@/components/ui/icons";
import { listAttempts } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { listMyStudents, personName } from "@/lib/api/enrollments";
import { listMyExercises } from "@/lib/api/exercises";
import { getAssignmentProgress, listActiveAssignments, listMyPlans } from "@/lib/api/plans";
import { listSkillGroups, listStudentSkills } from "@/lib/api/skills";
import { PLANS_PATH, REVIEWS_PATH, STUDENTS_PATH } from "@/lib/auth/constants";
import { reviewsHref } from "@/lib/attempts/model";
import { formatHours } from "@/lib/exercises/model";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { formatDate, formatDateTime } from "@/lib/invites/validity";
import { formatMobilePhone } from "@/lib/profile/fields";

export const metadata: Metadata = {
  title: "Aluno",
};

export default function StudentPage({ params }: PageProps<"/alunos/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando aluno…" />}>
      <StudentDetail params={params} />
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
      <h1 className="text-xl font-semibold text-ink">Aluno não encontrado</h1>
      <p className="mt-2 text-muted">Ele pode ter saído da sua lista. Volte para ver seus alunos.</p>
      <Link href={STUDENTS_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
        Ver alunos
      </Link>
    </div>
  );
}

const byPosition = <T extends { position: number }>(items: T[]) => [...items].sort((a, b) => a.position - b.position);

async function StudentDetail({ params }: Pick<PageProps<"/alunos/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireTeacherAccount(), params]);
  const href = `${STUDENTS_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;

  let data;
  try {
    data = await Promise.all([listMyStudents(), listSkillGroups(), listMyPlans(), listMyExercises()]);
  } catch {
    return <ApiUnavailable retryHref={href} />;
  }
  const [students, groups, plans, exercises] = data;
  const student = students.find((item) => item.id === id);
  if (!student) return <NotFound />;

  let details;
  try {
    const [skills, attempts, planAssignments] = await Promise.all([
      listStudentSkills(id),
      listAttempts({ student_id: id }, { limit: 8 }),
      Promise.all(plans.map(async (plan) => ({ plan, assignments: await listActiveAssignments(plan.id) }))),
    ]);
    const active = planAssignments.flatMap(({ plan, assignments }) =>
      assignments.filter((assignment) => assignment.student_id === id).map((assignment) => ({ plan, assignment })),
    )[0];
    const progress = active ? await getAssignmentProgress(active.plan.id, active.assignment.id).catch(() => null) : null;
    details = { skills, attempts, active, progress };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />;
    return <ApiUnavailable retryHref={href} />;
  }
  const { skills, attempts, active, progress } = details;
  const name = personName(student) || "Aluno sem nome";
  const exerciseTitle = new Map(exercises.map((exercise) => [exercise.id, exercise.title]));
  const assessments: Record<string, Assessment> = Object.fromEntries(
    skills.map((item) => [item.skill.id, { levelId: item.level.id, notes: item.notes ?? "", updatedLabel: formatDate(item.updated_at) }]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: STUDENTS_PATH, label: "Alunos" }}
        eyebrow="Aluno"
        title={name}
        description={student.mobile_phone ? formatMobilePhone(student.mobile_phone) : undefined}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Habilidades" icon={<BooksIcon className="size-5" />}>
          <p className="-mt-2 text-sm text-muted">Escolha o nível de cada habilidade. Cada mudança fica registrada na evolução do aluno.</p>
          <StudentSkillsPanel
            studentId={id}
            studentName={name}
            assessments={assessments}
            groups={[...groups]
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((group) => ({
                id: group.id,
                name: group.name,
                levels: byPosition(group.levels).map(({ id: levelId, name: levelName }) => ({ id: levelId, name: levelName })),
                skills: byPosition(group.skills).map(({ id: skillId, name: skillName }) => ({ id: skillId, name: skillName })),
              }))}
          />
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Plano de estudo" icon={<CalendarIcon className="size-5" />}>
            {active ? (
              <>
                <div>
                  <Link href={`${PLANS_PATH}/${active.plan.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                    {active.plan.title}
                  </Link>
                  <p className="text-xs text-muted">
                    Desde {formatDate(active.assignment.created_at)} · meta de {formatHours(active.plan.required_weekly_hours)} por semana
                  </p>
                </div>
                {progress ? (
                  <PlanProgress progress={progress} pendingHref={reviewsHref({ studentId: id })} />
                ) : (
                  <p className="text-sm text-muted">Não foi possível carregar o progresso agora.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                {name.split(" ")[0]} não está com nenhum plano.{" "}
                <Link href={PLANS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
                  Atribuir um plano
                </Link>
              </p>
            )}
          </Panel>

          <Panel title="Últimas respostas" icon={<ClipboardIcon className="size-5" />}>
            {attempts.items.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma resposta enviada ainda.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {attempts.items.map((attempt) => (
                  <li key={attempt.id} className="py-2.5">
                    <Link href={`${REVIEWS_PATH}/${attempt.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                      {exerciseTitle.get(attempt.exercise_id) ?? "Exercício excluído"}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{formatDateTime(attempt.submitted_at)}</span>
                      <CorrectnessBadge isCorrect={attempt.is_correct} />
                      <ReviewBadge status={attempt.review_status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {attempts.total > attempts.items.length && (
              <Link href={reviewsHref({ status: "all", studentId: id })} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Ver todas as {attempts.total} respostas
              </Link>
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
