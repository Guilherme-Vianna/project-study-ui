import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { DeletePackageButton } from "@/components/packages/delete-package-button";
import { PackageNotFound } from "@/components/packages/package-not-found";
import { PackageReleasePanel } from "@/components/packages/package-release-panel";
import { Alert } from "@/components/ui/alert";
import { PencilIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api/client";
import { listMyStudents, personName } from "@/lib/api/enrollments";
import { getPackage } from "@/lib/api/packages";
import { reviewsHref } from "@/lib/attempts/model";
import { EXERCISES_PATH, PACKAGES_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { formatHours, questionCountLabel } from "@/lib/exercises/model";
import { formatDate } from "@/lib/invites/validity";
import { exerciseCountLabel } from "@/lib/packages/model";

export const metadata: Metadata = {
  title: "Pacote de exercícios",
};

export default function PackagePage({ params, searchParams }: PageProps<"/pacotes/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando pacote…" />}>
      <PackageDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PackageDetail({ params, searchParams }: Pick<PageProps<"/pacotes/[id]">, "params" | "searchParams">) {
  const [account, { id }, query] = await Promise.all([requireTeacherAccount(), params, searchParams]);
  const href = `${PACKAGES_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;
  let data;
  try {
    data = await Promise.all([getPackage(id), listMyStudents()]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return <PackageNotFound />;
    return <ApiUnavailable retryHref={href} />;
  }
  const [item, students] = data;
  const releasedAt = new Map(item.releases.map((release) => [release.student_id, release.released_at]));
  const releaseStudents = students.map((student) => {
    const released = releasedAt.get(student.id);
    return { id: student.id, name: personName(student) || "Aluno sem nome", releasedLabel: released ? formatDate(released) : null };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: PACKAGES_PATH, label: "Pacotes" }}
        eyebrow={exerciseCountLabel(item.exercises.length)}
        title={item.title}
        description={item.description ?? undefined}
        actions={
          <Link
            href={`${href}/editar`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PencilIcon className="size-4" /> Editar pacote
          </Link>
        }
      />
      {query.salvo === "criado" && <Alert tone="success">Pacote criado. Agora libere para os alunos que devem responder.</Alert>}
      {query.salvo === "editado" && <Alert tone="success">Alterações salvas.</Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="exercises-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="exercises-title" className="text-lg font-semibold text-ink">
              Exercícios
            </h2>
            <Link href={reviewsHref({ status: "all", packageId: item.id })} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Ver respostas deste pacote
            </Link>
          </div>
          {item.exercises.length === 0 ? (
            <p className="text-sm text-muted">Este pacote está vazio. Edite para adicionar exercícios.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-border">
              {item.exercises.map((exercise, index) => (
                <li key={exercise.id} className="flex items-start gap-3 py-3">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-semibold text-ink">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`${EXERCISES_PATH}/${exercise.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                      {exercise.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {questionCountLabel(exercise.question_count)}
                      {exercise.estimated_hours ? ` · ${formatHours(exercise.estimated_hours)}` : ""}
                      {exercise.subjects.length > 0 && ` · ${exercise.subjects.map((subject) => subject.name).join(", ")}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <section aria-labelledby="release-title" className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
            <h2 id="release-title" className="text-lg font-semibold text-ink">
              Quem pode ver
            </h2>
            <PackageReleasePanel packageId={item.id} packageTitle={item.title} students={releaseStudents} />
          </section>
          <DeletePackageButton packageId={item.id} title={item.title} />
        </div>
      </div>
    </div>
  );
}
