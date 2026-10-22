"use client";

import Link from "next/link";
import { useId } from "react";
import { SKILLS_PATH } from "@/lib/auth/constants";
import { LIMITS } from "@/lib/exercises/model";
import type { SkillGroupOption } from "@/lib/skills/model";

type SkillPickerProps = {
  groups: SkillGroupOption[];
  selected: string[];
  error?: string;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
};

export function SkillPicker({ groups, selected, error, disabled = false, onChange }: SkillPickerProps) {
  const id = useId();
  const full = selected.length >= LIMITS.skills;
  const withSkills = groups.filter((group) => group.skills.length > 0);

  if (withSkills.length === 0) {
    return (
      <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
        Você ainda não tem habilidades.{" "}
        <Link href={SKILLS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
          Cadastre habilidades
        </Link>{" "}
        (como Listening ou Speaking) para mostrar ao aluno o que cada exercício treina.
      </p>
    );
  }

  function toggle(skillId: string) {
    onChange(selected.includes(skillId) ? selected.filter((item) => item !== skillId) : [...selected, skillId]);
  }

  return (
    <div className="flex flex-col gap-3" aria-describedby={`${id}-status`}>
      {withSkills.map((group) => (
        <div key={group.id} role="group" aria-label={`Habilidades de ${group.name}`} className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.skills.map((skill) => {
              const active = selected.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled || (!active && full)}
                  onClick={() => toggle(skill.id)}
                  className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
                    active ? "border-success bg-success-soft font-medium text-success-strong" : "border-border bg-surface text-ink hover:border-border-strong"
                  }`}
                >
                  {active && (
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p id={`${id}-status`} className={`text-sm ${error ? "text-danger" : "text-muted"}`}>
        {error ??
          (selected.length
            ? `${selected.length} selecionada${selected.length > 1 ? "s" : ""}`
            : "Opcional. O aluno vê quais habilidades o exercício treina.")}
      </p>
    </div>
  );
}
