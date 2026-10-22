export const SUBJECT_NAME_MAX = 100;
export const SUBJECT_DESCRIPTION_MAX = 2000;

export type SubjectValues = { name: string; description: string };
export type SubjectFieldErrors = Partial<Record<keyof SubjectValues, string>>;

export const SUBJECT_SUGGESTIONS = ["Trigonometria", "Inglês", "Gramática", "Redação", "Física", "Química"];

export function sameSubjectName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function duplicateNameMessage(name: string) {
  return `Você já tem um assunto chamado “${name.trim()}”. Use outro nome.`;
}

export function validateSubject(
  values: SubjectValues,
  existingNames: readonly string[] = [],
): SubjectFieldErrors {
  const errors: SubjectFieldErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Dê um nome ao assunto, como Trigonometria.";
  else if (name.length > SUBJECT_NAME_MAX) errors.name = `Use até ${SUBJECT_NAME_MAX} caracteres.`;
  else if (existingNames.some((existing) => sameSubjectName(existing, name))) errors.name = duplicateNameMessage(name);

  if (values.description.length > SUBJECT_DESCRIPTION_MAX) {
    errors.description = `Use até ${SUBJECT_DESCRIPTION_MAX} caracteres.`;
  }
  return errors;
}

export function toSubjectPayload(values: SubjectValues) {
  const description = values.description.trim();
  return { name: values.name.trim(), description: description || null };
}
