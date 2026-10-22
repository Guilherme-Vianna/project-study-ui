export const SKILL_LIMITS = {
  name: 100,
  description: 2000,
  levels: { min: 1, max: 20 },
  skills: 100,
  notes: 10000,
  perExercise: 20,
};

export type SkillGroupOption = { id: string; name: string; skills: { id: string; name: string }[] };

export type SkillItemDraft = { key: string; id: string | null; name: string; description: string };

export type SkillGroupDraft = {
  name: string;
  description: string;
  levels: SkillItemDraft[];
  skills: SkillItemDraft[];
};

type ItemPayload = { id?: string; name: string; description: string | null };

export type SkillGroupPayload = {
  name: string;
  description: string | null;
  levels: ItemPayload[];
  skills: ItemPayload[];
};

let keySeed = 0;
export function newItemKey() {
  keySeed += 1;
  return `skill-item-${keySeed}`;
}

export function emptyItem(name = ""): SkillItemDraft {
  return { key: newItemKey(), id: null, name, description: "" };
}

export const SUGGESTED_LEVELS = ["Iniciante", "Intermediário", "Avançado"];

export function emptySkillGroupDraft(): SkillGroupDraft {
  return { name: "", description: "", levels: SUGGESTED_LEVELS.map((name) => emptyItem(name)), skills: [emptyItem()] };
}

function toItemPayload(item: SkillItemDraft): ItemPayload {
  const description = item.description.trim();
  return { ...(item.id ? { id: item.id } : {}), name: item.name.trim(), description: description || null };
}

export function toSkillGroupPayload(draft: SkillGroupDraft): SkillGroupPayload {
  const description = draft.description.trim();
  return {
    name: draft.name.trim(),
    description: description || null,
    levels: draft.levels.map(toItemPayload),
    skills: draft.skills.filter((skill) => skill.name.trim() || skill.id).map(toItemPayload),
  };
}

export type SkillGroupErrors = {
  name?: string;
  description?: string;
  levels?: string;
  skills?: string;
  items?: Record<string, string>;
};

export function hasSkillGroupErrors(errors: SkillGroupErrors) {
  const { items, ...rest } = errors;
  return Object.values(rest).some(Boolean) || Object.keys(items ?? {}).length > 0;
}

function checkItems(list: SkillItemDraft[], items: Record<string, string>, { skipBlank }: { skipBlank: boolean }) {
  const seen = new Map<string, string>();
  for (const item of list) {
    const name = item.name.trim();
    if (!name) {
      if (!skipBlank || item.id) items[item.key] = "Dê um nome ou remova.";
      continue;
    }
    if (name.length > SKILL_LIMITS.name) items[item.key] = `Use até ${SKILL_LIMITS.name} caracteres.`;
    const normalized = name.toLocaleLowerCase("pt-BR");
    if (seen.has(normalized)) items[item.key] = "Este nome já está na lista.";
    else seen.set(normalized, item.key);
  }
}

export function validateSkillGroup(draft: SkillGroupDraft, existingNames: string[] = []): SkillGroupErrors {
  const errors: SkillGroupErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Dê um nome ao grupo, como “Inglês”.";
  else if (name.length > SKILL_LIMITS.name) errors.name = `Use até ${SKILL_LIMITS.name} caracteres.`;
  else if (existingNames.some((other) => other.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    errors.name = "Você já tem um grupo com esse nome.";
  }
  if (draft.description.trim().length > SKILL_LIMITS.description) errors.description = `Use até ${SKILL_LIMITS.description} caracteres.`;

  if (draft.levels.length < SKILL_LIMITS.levels.min) errors.levels = "Crie pelo menos um nível.";
  else if (draft.levels.length > SKILL_LIMITS.levels.max) errors.levels = `Use até ${SKILL_LIMITS.levels.max} níveis.`;
  if (draft.skills.length > SKILL_LIMITS.skills) errors.skills = `Use até ${SKILL_LIMITS.skills} habilidades.`;

  const items: Record<string, string> = {};
  checkItems(draft.levels, items, { skipBlank: false });
  checkItems(draft.skills, items, { skipBlank: true });
  if (Object.keys(items).length) errors.items = items;
  return errors;
}

export function levelProgress(position: number, total: number | null) {
  if (!total) return null;
  return Math.round(((position + 1) / total) * 100);
}
