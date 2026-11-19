import { LIMITS, parseHours, type DraftQuestion, type ExerciseDraft } from "./model";

export type QuestionErrors = {
  statement?: string;
  expectedAnswer?: string;
  options?: string;
  optionText?: Record<string, string>;
};

export type ExerciseErrors = {
  title?: string;
  statement?: string;
  estimatedHours?: string;
  subjects?: string;
  skills?: string;
  images?: string;
  questions?: string;
  questionErrors?: Record<string, QuestionErrors>;
};

function questionHasErrors(errors: QuestionErrors) {
  const { optionText, ...rest } = errors;
  return Object.values(rest).some(Boolean) || Object.keys(optionText ?? {}).length > 0;
}

export function hasErrors(errors: ExerciseErrors) {
  const { questionErrors, ...rest } = errors;
  return Object.values(rest).some(Boolean) || Object.values(questionErrors ?? {}).some(questionHasErrors);
}

export function validateQuestion(question: DraftQuestion): QuestionErrors {
  const errors: QuestionErrors = {};
  if (question.statement.trim().length > LIMITS.text) errors.statement = `Use até ${LIMITS.text} caracteres.`;
  if (question.type === "open_answer") {
    if (question.expectedAnswer.trim().length > LIMITS.text) errors.expectedAnswer = `Use até ${LIMITS.text} caracteres.`;
    return errors;
  }

  const optionText: Record<string, string> = {};
  for (const option of question.options) {
    const text = option.text.trim();
    if (!text && !option.image) optionText[option.key] = "Escreva a alternativa, adicione uma imagem ou remova-a.";
    else if (text.length > LIMITS.text) optionText[option.key] = `Use até ${LIMITS.text} caracteres.`;
  }
  if (Object.keys(optionText).length) errors.optionText = optionText;

  if (question.options.length < LIMITS.options.min) errors.options = "Adicione pelo menos 2 alternativas.";
  else if (question.options.length > LIMITS.options.max) errors.options = `Use até ${LIMITS.options.max} alternativas.`;
  else if (!question.options.some((option) => option.isCorrect)) errors.options = "Marque qual alternativa está correta.";
  return errors;
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

  if (draft.questions.length === 0) errors.questions = "Adicione pelo menos uma questão.";
  else if (draft.questions.length > LIMITS.questions) errors.questions = `Use até ${LIMITS.questions} questões.`;

  const questionErrors: Record<string, QuestionErrors> = {};
  for (const question of draft.questions) {
    const found = validateQuestion(question);
    if (questionHasErrors(found)) questionErrors[question.key] = found;
  }
  if (Object.keys(questionErrors).length) errors.questionErrors = questionErrors;
  return errors;
}
