import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageLoading } from "@/components/app/page-loading";
import { PackageNotFound } from "@/components/packages/package-not-found";
import { ExercisePractice } from "@/components/practice/exercise-practice";
import { ApiError } from "@/lib/api/client";
import { getPackageExercise, listPackageAttempts } from "@/lib/api/packages";
import { MY_PACKAGES_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";

export const metadata: Metadata = {
  title: "Responder exercício",
};

export default function PackageExercisePage({ params }: PageProps<"/meus-pacotes/[id]/[exerciseId]">) {
  return (
    <Suspense fallback={<PageLoading label="Carregando exercício…" />}>
      <PackageExercise params={params} />
    </Suspense>
  );
}

async function PackageExercise({ params }: Pick<PageProps<"/meus-pacotes/[id]/[exerciseId]">, "params">) {
  const [account, { id, exerciseId }] = await Promise.all([requireStudentAccount(), params]);
  const packageHref = `${MY_PACKAGES_PATH}/${encodeURIComponent(id)}`;
  const href = `${packageHref}/${encodeURIComponent(exerciseId)}`;
  if (!account) return <ApiUnavailable retryHref={href} />;
  let data;
  try {
    data = await Promise.all([getPackageExercise(id, exerciseId), listPackageAttempts(id, exerciseId)]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return (
        <PackageNotFound
          href={MY_PACKAGES_PATH}
          message="Este exercício não está mais liberado para você. Volte para ver os pacotes disponíveis."
        />
      );
    }
    return <ApiUnavailable retryHref={href} />;
  }
  const [entry, attempts] = data;
  return <ExercisePractice entry={entry} attempts={attempts} packageId={id} back={{ href: packageHref, label: "Pacote" }} />;
}
