import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageLoading } from "@/components/app/page-loading";
import { ExercisePractice } from "@/components/practice/exercise-practice";
import { getPlanExercise, listMyAttempts } from "@/lib/api/attempts";
import { ApiError } from "@/lib/api/client";
import { PRACTICE_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";

export const metadata: Metadata = {
  title: "Responder exercício",
};

export default function PracticeExercisePage({ params }: PageProps<"/praticar/[id]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando exercício…" />}>
      <PracticeExercise params={params} />
    </Suspense>
  );
}

async function PracticeExercise({ params }: Pick<PageProps<"/praticar/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireStudentAccount(), params]);
  const href = `${PRACTICE_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;

  let data;
  try {
    data = await Promise.all([getPlanExercise(id), listMyAttempts(id)]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return (
        <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold text-ink">Exercício não encontrado</h1>
          <p className="mt-2 text-muted">Ele não está mais no seu plano de estudo. Volte para a lista para ver os exercícios disponíveis.</p>
          <Link href={PRACTICE_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
            Ver exercícios
          </Link>
        </div>
      );
    }
    return <ApiUnavailable retryHref={href} />;
  }
  const [entry, attempts] = data;
  return <ExercisePractice entry={entry} attempts={attempts} back={{ href: PRACTICE_PATH, label: "Exercícios" }} />;
}
