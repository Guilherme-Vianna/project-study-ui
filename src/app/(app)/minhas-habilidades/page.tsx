import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { listMySkills, type StudentSkill } from "@/lib/api/skills";
import { MY_SKILLS_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";
import { formatDate } from "@/lib/invites/validity";

export const metadata: Metadata = {
  title: "Minhas habilidades",
};

export default function MySkillsPage() {
  return (
    <>
      <PageHeader
        title="Minhas habilidades"
        description="O nível que seus professores avaliaram em cada habilidade. Os exercícios mostram quais habilidades eles treinam."
      />
      <Suspense fallback={<PageLoading label="Carregando habilidades…" />}>
        <MySkills />
      </Suspense>
    </>
  );
}

async function MySkills() {
  const account = await requireStudentAccount();
  if (!account) return <ApiUnavailable retryHref={MY_SKILLS_PATH} />;

  let skills;
  try {
    skills = await listMySkills();
  } catch {
    return <ApiUnavailable retryHref={MY_SKILLS_PATH} />;
  }

  if (skills.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-ink">Nenhuma avaliação ainda</h2>
        <p className="mt-2 max-w-xl text-muted">Quando seu professor avaliar suas habilidades, como Listening ou Gramática, elas aparecem aqui.</p>
      </div>
    );
  }

  const groups = new Map<string, { name: string; skills: StudentSkill[] }>();
  for (const item of skills) {
    const group = groups.get(item.skill.group.id) ?? { name: item.skill.group.name, skills: [] };
    group.skills.push(item);
    groups.set(item.skill.group.id, group);
  }
  const sorted = [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "pt-BR"));

  return (
    <div className="flex flex-col gap-6">
      {sorted.map(([groupId, group]) => (
        <section key={groupId} aria-labelledby={`group-${groupId}`} className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          <h2 id={`group-${groupId}`} className="text-lg font-semibold text-ink">
            {group.name}
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {group.skills
              .sort((a, b) => a.skill.name.localeCompare(b.skill.name, "pt-BR"))
              .map((item) => (
                <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-ink">{item.skill.name}</p>
                    <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">{item.level.name}</span>
                  </div>
                  <LevelSteps position={item.level.position} />
                  {item.level.description && <p className="text-sm text-muted">{item.level.description}</p>}
                  {item.notes && <p className="whitespace-pre-wrap rounded-xl bg-canvas p-3 text-sm text-ink">{item.notes}</p>}
                  <p className="text-xs text-muted">Atualizado em {formatDate(item.updated_at)}</p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LevelSteps({ position }: { position: number }) {
  return (
    <div aria-label={`Nível ${position + 1}`} role="img" className="flex gap-1">
      {Array.from({ length: position + 1 }, (_, index) => (
        <span key={index} className="h-1.5 w-6 rounded-full bg-primary" />
      ))}
    </div>
  );
}
