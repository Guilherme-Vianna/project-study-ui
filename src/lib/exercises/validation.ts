import { LIMITS, parseHours, type ExerciseDraft } from "./model";

export type ExerciseErrors = {
  title?: string;
  statement?: string;
  expectedAnswer?: string;
  estimatedHours?: string;
  subjects?: string;
  skills?: string;
  images?: string;
  options?: string;
  optionText?: Record<string, string>;
};

export function hasErrors(errors: ExerciseErrors) {
  const { optionText, ...rest } = errors;
  return Object.values(rest).some(Boolean) || Object.keys(optionText ?? {}).length > 0;
}

export function validateExercise(draft: ExerciseDraft): ExerciseErrors {
  const errors: ExerciseErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "Dê um título ao exercício.";
  else if (title.length > LIMITS.title) errors.title = `Use até ${LIMITS.title} caracteres.`;

  if (draft.statement.trim().length > LIMITS.text) errors.statement = `Use até ${LIMITS.text} caracteres.`;

  const hours = parseHours(draft.estimatedHours);
  if (hours === undefined) errors.estimatedHours = "Use só números, como 1 ou 0,5.";
  else if (hours !== null && (hours <= 0 || hours > LIMITS.hours)) {
    errors.estimatedHours = `Informe um tempo entre 0,01 e ${LIMITS.hours} horas.`;
  }

  if (draft.subjectIds.length > LIMITS.subjects) errors.subjects = `Escolha até ${LIMITS.subjects} assuntos.`;
  if (draft.skillIds.length > LIMITS.skills) errors.skills = `Escolha até ${LIMITS.skills} habilidades.`;
  if (draft.images.length > LIMITS.images) errors.images = `Use até ${LIMITS.images} imagens.`;

  if (draft.type === "open_answer") {
    if (draft.expectedAnswer.trim().length > LIMITS.text) errors.expectedAnswer = `Use até ${LIMITS.text} caracteres.`;
    return errors;
  }

  const optionText: Record<string, string> = {};
  for (const option of draft.options) {
    const text = option.text.trim();
    if (!text && !option.image) optionText[option.key] = "Escreva a alternativa, adicione uma imagem ou remova-a.";
    else if (text.length > LIMITS.text) optionText[option.key] = `Use até ${LIMITS.text} caracteres.`;
  }
  if (Object.keys(optionText).length) errors.optionText = optionText;

  if (draft.options.length < LIMITS.options.min) errors.options = "Adicione pelo menos 2 alternativas.";
  else if (draft.options.length > LIMITS.options.max) errors.options = `Use até ${LIMITS.options.max} alternativas.`;
  else if (!draft.options.some((option) => option.isCorrect)) errors.options = "Marque qual alternativa está correta.";
  return errors;
}
