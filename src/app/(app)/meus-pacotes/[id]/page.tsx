import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PackageNotFound } from "@/components/packages/package-not-found";
import { PracticeList } from "@/components/practice/practice-list";
import { ApiError } from "@/lib/api/client";
import { getMyPackage } from "@/lib/api/packages";
import { MY_PACKAGES_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";
import { formatHours, questionTypes } from "@/lib/exercises/model";
import { formatDate } from "@/lib/invites/validity";
import { exerciseCountLabel } from "@/lib/packages/model";

export const metadata: Metadata = {
  title: "Pacote de exercícios",
};

export default function MyPackagePage({ params }: PageProps<"/meus-pacotes/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando pacote…" />}>
      <MyPackage params={params} />
    </Suspense>
  );
}

async function MyPackage({ params }: Pick<PageProps<"/meus-pacotes/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireStudentAccount(), params]);
  const href = `${MY_PACKAGES_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;
  let item;
  try {
    item = await getMyPackage(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return (
        <PackageNotFound
          href={MY_PACKAGES_PATH}
          message="Este pacote não está liberado para você. Volte para ver os pacotes disponíveis."
        />
      );
    }
    return <ApiUnavailable retryHref={href} />;
  }
  const subjects = new Map(item.exercises.flatMap(({ exercise }) => exercise.subjects.map((subject) => [subject.id, subject])));

  return (
    <>
      <PageHeader
        back={{ href: MY_PACKAGES_PATH, label: "Pacotes" }}
        eyebrow={`${exerciseCountLabel(item.exercises.length)} · liberado em ${formatDate(item.released_at)}`}
        title={item.title}
        description={item.description ?? undefined}
      />
      <PracticeList
        basePath={href}
        subjects={[...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))}
        emptyMessage="Este pacote ainda não tem exercícios."
        items={item.exercises.map(({ exercise, attempts_count, last_attempt_at, locked }) => ({
          id: exercise.id,
          title: exercise.title,
          types: questionTypes(exercise.questions),
          questionCount: exercise.questions.length,
          subjects: exercise.subjects,
          skills: exercise.skills,
          hoursLabel: exercise.estimated_hours ? formatHours(exercise.estimated_hours) : null,
          attemptsCount: attempts_count,
          lastAttemptLabel: last_attempt_at ? formatDate(last_attempt_at) : null,
          locked,
        }))}
      />
    </>
  );
}
