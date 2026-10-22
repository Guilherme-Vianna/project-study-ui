import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { DeleteSkillGroupButton } from "@/components/skills/delete-skill-group-button";
import { Alert } from "@/components/ui/alert";
import { PencilIcon, PlusIcon } from "@/components/ui/icons";
import { listSkillGroups } from "@/lib/api/skills";
import { SKILLS_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";

export const metadata: Metadata = {
  title: "Habilidades",
};

const primaryLink =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function SkillsPage({ searchParams }: PageProps<"/habilidades">) {
  return (
    <>
      <PageHeader
        title="Habilidades"
        description="Grupos com níveis e habilidades, como Inglês → Grammar, Speaking, Listening. Marque nos exercícios o que eles treinam e avalie cada aluno."
        actions={
          <Link href={`${SKILLS_PATH}/novo`} className={primaryLink}>
            <PlusIcon />
            Novo grupo
          </Link>
        }
      />
      <Suspense fallback={<PageLoading label="Carregando habilidades…" />}>
        <SkillsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SkillsContent({ searchParams }: Pick<PageProps<"/habilidades">, "searchParams">) {
  const [account, params] = await Promise.all([requireTeacherAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={SKILLS_PATH} />;

  let groups;
  try {
    groups = await listSkillGroups();
  } catch {
    return <ApiUnavailable retryHref={SKILLS_PATH} />;
  }
  groups.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="flex flex-col gap-4">
      {params.salvo === "criado" && <Alert tone="success">Grupo criado. Agora marque nos exercícios as habilidades que eles treinam.</Alert>}
      {params.salvo === "editado" && <Alert tone="success">Alterações salvas.</Alert>}
      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-12">
          <h2 className="text-xl font-semibold text-ink">Crie seu primeiro grupo de habilidades</h2>
          <ol className="mt-4 flex flex-col gap-3 text-muted sm:flex-row sm:gap-8">
            {["Dê um nome, como Inglês", "Defina os níveis, do básico ao avançado", "Liste as habilidades que você avalia"].map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Link href={`${SKILLS_PATH}/novo`} className={`${primaryLink} mt-8`}>
            <PlusIcon />
            Novo grupo
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const levels = [...group.levels].sort((a, b) => a.position - b.position);
            const skills = [...group.skills].sort((a, b) => a.position - b.position);
            return (
              <li key={group.id} className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-ink">
                      <Link href={`${SKILLS_PATH}/${group.id}`} className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
                        {group.name}
                      </Link>
                    </h2>
                    {group.description && <p className="mt-1 line-clamp-2 text-sm text-ink/70">{group.description}</p>}
                  </div>
                  <Link
                    href={`${SKILLS_PATH}/${group.id}`}
                    aria-label={`Editar ${group.name}`}
                    title="Editar"
                    className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <PencilIcon />
                  </Link>
                  <DeleteSkillGroupButton groupId={group.id} name={group.name} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Níveis</p>
                  <ol className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-ink">
                    {levels.map((level, index) => (
                      <li key={level.id} className="flex items-center gap-1">
                        {index > 0 && <span aria-hidden="true" className="text-muted">→</span>}
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{level.name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="mt-auto">
                  <p className="text-xs font-medium text-muted">
                    {skills.length} {skills.length === 1 ? "habilidade" : "habilidades"}
                  </p>
                  {skills.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <li key={skill.id} className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs text-success-strong">
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
