import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { SkillGroupEditor } from "@/components/skills/skill-group-editor";
import { ApiError } from "@/lib/api/client";
import { getSkillGroup, listSkillGroups } from "@/lib/api/skills";
import { SKILLS_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { skillGroupToDraft } from "@/lib/skills/from-api";

export const metadata: Metadata = {
  title: "Editar grupo de habilidades",
};

export default function EditSkillGroupPage({ params }: PageProps<"/habilidades/[id]">) {
  return (
    <>
      <PageHeader back={{ href: SKILLS_PATH, label: "Habilidades" }} title="Editar grupo de habilidades" />
      <Suspense fallback={<PageLoading />}>
        <EditSkillGroupForm params={params} />
      </Suspense>
    </>
  );
}

async function EditSkillGroupForm({ params }: Pick<PageProps<"/habilidades/[id]">, "params">) {
  const [account, { id }] = await Promise.all([requireTeacherAccount(), params]);
  const retry = `${SKILLS_PATH}/${encodeURIComponent(id)}`;
  if (!account) return <ApiUnavailable retryHref={retry} />;

  let data;
  try {
    data = await Promise.all([getSkillGroup(id), listSkillGroups()]);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
      return (
        <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
          <h2 className="text-xl font-semibold text-ink">Grupo não encontrado</h2>
          <p className="mt-2 text-muted">Ele pode ter sido excluído. Volte para a lista para ver suas habilidades.</p>
          <Link href={SKILLS_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
            Ver habilidades
          </Link>
        </div>
      );
    }
    return <ApiUnavailable retryHref={retry} />;
  }
  const [group, groups] = data;
  return (
    <SkillGroupEditor
      groupId={group.id}
      initialDraft={skillGroupToDraft(group)}
      existingNames={groups.filter((other) => other.id !== group.id).map((other) => other.name)}
    />
  );
}
