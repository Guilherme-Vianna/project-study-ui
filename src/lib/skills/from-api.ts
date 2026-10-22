import "server-only";
import type { SkillGroup } from "@/lib/api/skills";
import { newItemKey, type SkillGroupDraft, type SkillGroupOption } from "./model";

const byPosition = <T extends { position: number }>(items: T[]) => [...items].sort((a, b) => a.position - b.position);

export function toSkillGroupOptions(groups: SkillGroup[]): SkillGroupOption[] {
  return groups
    .map((group) => ({ id: group.id, name: group.name, skills: byPosition(group.skills).map(({ id, name }) => ({ id, name })) }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function skillGroupToDraft(group: SkillGroup): SkillGroupDraft {
  const toItem = (item: { id: string; name: string; description: string | null }) => ({
    key: newItemKey(),
    id: item.id,
    name: item.name,
    description: item.description ?? "",
  });
  return {
    name: group.name,
    description: group.description ?? "",
    levels: byPosition(group.levels).map(toItem),
    skills: byPosition(group.skills).map(toItem),
  };
}
