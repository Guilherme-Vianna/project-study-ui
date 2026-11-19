export const PACKAGE_LIMITS = { title: 200, description: 5000, exercises: 100 };

export type PackageDraft = { title: string; description: string; exerciseIds: string[] };

export type PackagePayload = { title: string; description: string | null; exercise_ids: string[] };

export type PackageErrors = { title?: string; description?: string; exercises?: string };

export function emptyPackageDraft(): PackageDraft {
  return { title: "", description: "", exerciseIds: [] };
}

export function hasPackageErrors(errors: PackageErrors) {
  return Object.values(errors).some(Boolean);
}

export function validatePackage(draft: PackageDraft): PackageErrors {
  const errors: PackageErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "Dê um nome ao pacote.";
  else if (title.length > PACKAGE_LIMITS.title) errors.title = `Use até ${PACKAGE_LIMITS.title} caracteres.`;
  if (draft.description.trim().length > PACKAGE_LIMITS.description) {
    errors.description = `Use até ${PACKAGE_LIMITS.description} caracteres.`;
  }
  if (draft.exerciseIds.length === 0) errors.exercises = "Escolha pelo menos um exercício.";
  else if (draft.exerciseIds.length > PACKAGE_LIMITS.exercises) errors.exercises = `Use até ${PACKAGE_LIMITS.exercises} exercícios.`;
  return errors;
}

export function toPackagePayload(draft: PackageDraft): PackagePayload {
  const description = draft.description.trim();
  return { title: draft.title.trim(), description: description || null, exercise_ids: [...new Set(draft.exerciseIds)] };
}

export function exerciseCountLabel(count: number) {
  return count === 1 ? "1 exercício" : `${count} exercícios`;
}
