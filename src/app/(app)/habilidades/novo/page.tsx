import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { SkillGroupEditor } from "@/components/skills/skill-group-editor";
import { listSkillGroups } from "@/lib/api/skills";
import { SKILLS_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { emptySkillGroupDraft } from "@/lib/skills/model";

export const metadata: Metadata = {
  title: "Novo grupo de habilidades",
};

export default function NewSkillGroupPage() {
  return (
    <>
      <PageHeader
        back={{ href: SKILLS_PATH, label: "Habilidades" }}
        title="Novo grupo de habilidades"
        description="Começamos com três níveis de exemplo. Renomeie, reordene ou adicione os seus."
      />
      <Suspense fallback={<PageLoading />}>
        <NewSkillGroupForm />
      </Suspense>
    </>
  );
}

async function NewSkillGroupForm() {
  const account = await requireTeacherAccount();
  if (!account) return <ApiUnavailable retryHref={`${SKILLS_PATH}/novo`} />;
  let groups;
  try {
    groups = await listSkillGroups();
  } catch {
    return <ApiUnavailable retryHref={`${SKILLS_PATH}/novo`} />;
  }
  return <SkillGroupEditor groupId={null} initialDraft={emptySkillGroupDraft()} existingNames={groups.map((group) => group.name)} />;
}
