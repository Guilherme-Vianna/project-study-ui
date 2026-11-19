import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PackageEditor } from "@/components/packages/package-editor";
import { listMyExercises } from "@/lib/api/exercises";
import { PACKAGES_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { toPackageExerciseOptions } from "@/lib/packages/from-api";
import { emptyPackageDraft } from "@/lib/packages/model";

export const metadata: Metadata = {
  title: "Novo pacote",
};

export default function NewPackagePage() {
  return (
    <>
      <PageHeader
        back={{ href: PACKAGES_PATH, label: "Pacotes" }}
        title="Novo pacote"
        description="Dê um nome, escolha os exercícios e a ordem. Você libera para os alunos depois de criar."
      />
      <Suspense fallback={<PageLoading />}>
        <NewPackageForm />
      </Suspense>
    </>
  );
}

async function NewPackageForm() {
  const account = await requireTeacherAccount();
  if (!account) return <ApiUnavailable retryHref={`${PACKAGES_PATH}/novo`} />;
  let exercises;
  try {
    exercises = await listMyExercises();
  } catch {
    return <ApiUnavailable retryHref={`${PACKAGES_PATH}/novo`} />;
  }
  return (
    <PackageEditor
      packageId={null}
      initialDraft={emptyPackageDraft()}
      exercises={toPackageExerciseOptions(exercises)}
      cancelHref={PACKAGES_PATH}
    />
  );
}
