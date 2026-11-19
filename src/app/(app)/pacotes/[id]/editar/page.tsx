import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PackageEditor } from "@/components/packages/package-editor";
import { PackageNotFound } from "@/components/packages/package-not-found";
import { ApiError } from "@/lib/api/client";
import { listMyExercises } from "@/lib/api/exercises";
import { getPackage } from "@/lib/api/packages";
import { PACKAGES_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { draftFromPackage, toPackageExerciseOptions } from "@/lib/packages/from-api";

export const metadata: Metadata = {
  title: "Editar pacote",
};

export default function EditPackagePage({ params }: PageProps<"/pacotes/[id]/editar">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditPackage params={params} />
    </Suspense>
  );
}

async function EditPackage({ params }: Pick<PageProps<"/pacotes/[id]/editar">, "params">) {
  const [account, { id }] = await Promise.all([requireTeacherAccount(), params]);
  const href = `${PACKAGES_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={`${href}/editar`} />;
  let data;
  try {
    data = await Promise.all([getPackage(id), listMyExercises()]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return <PackageNotFound />;
    return <ApiUnavailable retryHref={`${href}/editar`} />;
  }
  const [item, exercises] = data;
  return (
    <>
      <PageHeader back={{ href, label: item.title }} title="Editar pacote" />
      <PackageEditor
        packageId={item.id}
        initialDraft={draftFromPackage(item)}
        exercises={toPackageExerciseOptions(exercises)}
        cancelHref={href}
      />
    </>
  );
}
