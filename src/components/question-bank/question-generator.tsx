"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/text-area-field";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { EXERCISE_TYPE_LABELS, optionLetter, type ExerciseType } from "@/lib/exercises/model";
import { generateQuestionsAction, saveGeneratedQuestionAction } from "@/lib/question-bank/actions";
import {
  COUNT_OPTIONS,
  DIFFICULTY_LABELS,
  PROMPT_LIMIT,
  referenceSummary,
  type Difficulty,
  type GeneratedQuestion,
  type GenerationResult,
  type Suggestion,
} from "@/lib/question-bank/model";

const controlClass =
  "h-11 w-full cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary";

type SaveState = { status: "saving" } | { status: "saved"; exerciseId: string } | { status: "error"; error: string };

export function QuestionGenerator({ suggestions, total }: { suggestions: Suggestion[]; total: number }) {
  const formId = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState("5");
  const [type, setType] = useState<ExerciseType | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [promptError, setPromptError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [saves, setSaves] = useState<Record<number, SaveState>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if (text.length < PROMPT_LIMIT.min) {
      setPromptError("Descreva o que você quer praticar, por exemplo um tema e uma matéria.");
      promptRef.current?.focus();
      return;
    }
    setPromptError(undefined);
    setFormError(null);
    setPending(true);
    const response = await generateQuestionsAction({
      prompt: text,
      count: Number(count),
      type: type || null,
      difficulty: difficulty || null,
    });
    setPending(false);
    if (response.ok) {
      setResult(response.result);
      setSaves({});
    } else {
      setFormError(response.error);
    }
  }

  async function save(index: number, question: GeneratedQuestion) {
    setSaves((current) => ({ ...current, [index]: { status: "saving" } }));
    const response = await saveGeneratedQuestionAction(question);
    setSaves((current) => ({
      ...current,
      [index]: response.ok ? { status: "saved", exerciseId: response.exerciseId } : { status: "error", error: response.error },
    }));
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        noValidate
        onSubmit={submit}
        aria-describedby={`${formId}-hint`}
        className="flex max-w-2xl flex-col gap-5 rounded-3xl border border-border bg-surface p-6 sm:p-8"
      >
        <TextAreaField
          ref={promptRef}
          label="O que você quer praticar?"
          placeholder="Ex.: questões de geometria espacial no estilo do ENEM, com contexto do dia a dia"
          hint="A IA escolhe a matéria e o tema, busca questões parecidas no banco e cria novas."
          value={prompt}
          maxLength={PROMPT_LIMIT.max}
          error={promptError}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (promptError) setPromptError(undefined);
          }}
          disabled={pending}
        />
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Sugestões do banco</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setPrompt(suggestion.prompt);
                    setPromptError(undefined);
                  }}
                  className="min-h-10 cursor-pointer rounded-full border border-border bg-canvas px-4 text-sm text-ink hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-muted"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField id={`${formId}-count`} label="Quantidade" value={count} onChange={setCount} disabled={pending}>
            {COUNT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} {value === 1 ? "questão" : "questões"}
              </option>
            ))}
          </SelectField>
          <SelectField
            id={`${formId}-type`}
            label="Tipo"
            value={type}
            onChange={(value) => setType(value as ExerciseType | "")}
            disabled={pending}
          >
            <option value="">Qualquer tipo</option>
            {Object.entries(EXERCISE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField
            id={`${formId}-difficulty`}
            label="Dificuldade"
            value={difficulty}
            onChange={(value) => setDifficulty(value as Difficulty | "")}
            disabled={pending}
          >
            <option value="">Como nas provas</option>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" loading={pending} loadingLabel="Gerando questões…">
          Gerar questões
        </Button>
        <p id={`${formId}-hint`} className="text-sm text-muted" role={pending ? "status" : undefined}>
          {pending
            ? "A IA está lendo as questões de referência e resolvendo as novas. Isso pode levar até um minuto."
            : `Baseado em ${total.toLocaleString("pt-BR")} questões de provas. Nada é salvo até você escolher.`}
        </p>
      </form>

      {result && (
        <section aria-labelledby={`${formId}-results`} className="flex flex-col gap-4">
          <div>
            <h2 id={`${formId}-results`} className="text-xl font-semibold tracking-tight text-ink">
              {result.questions.length} {result.questions.length === 1 ? "questão gerada" : "questões geradas"}
            </h2>
            <FilterSummary result={result} />
          </div>
          <ol className="flex flex-col gap-4">
            {result.questions.map((question, index) => (
              <QuestionCard
                key={`${index}-${question.title}`}
                number={index + 1}
                question={question}
                save={saves[index]}
                onSave={() => save(index, question)}
              />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={controlClass}>
        {children}
      </select>
    </div>
  );
}

function FilterSummary({ result }: { result: GenerationResult }) {
  const { filters } = result;
  const parts = [filters.subject, filters.topics.join(", "), filters.board].filter(Boolean);
  const source = referenceSummary(result);
  return (
    <p className="mt-1 text-sm text-muted">
      {parts.length ? `A IA buscou por ${parts.join(" · ")}` : "A IA buscou no banco inteiro"}
      {result.references.length > 0 &&
        ` e usou ${result.references.length} ${result.references.length === 1 ? "questão" : "questões"} de referência${source ? ` (${source})` : ""}.`}
    </p>
  );
}

function QuestionCard({
  number,
  question,
  save,
  onSave,
}: {
  number: number;
  question: GeneratedQuestion;
  save: SaveState | undefined;
  onSave: () => void;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">{question.subject}</span>
        <span className="rounded-full bg-canvas px-3 py-1 text-muted">{question.topic}</span>
        <span className="rounded-full bg-canvas px-3 py-1 text-muted">{EXERCISE_TYPE_LABELS[question.type]}</span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-ink">
        {number}. {question.title}
      </h3>
      <p className="whitespace-pre-line leading-relaxed text-ink">{question.statement}</p>

      {question.type === "multiple_choice" ? (
        <ul className="flex flex-col gap-2" aria-label="Alternativas">
          {question.options.map((option, index) => (
            <li
              key={index}
              className={`flex gap-3 rounded-2xl border px-4 py-3 ${
                option.is_correct ? "border-success/50 bg-success-soft" : "border-border"
              }`}
            >
              <span className={`font-semibold ${option.is_correct ? "text-success-strong" : "text-muted"}`}>
                {optionLetter(index)})
              </span>
              <span className="flex-1 whitespace-pre-line text-ink">{option.text}</span>
              {option.is_correct && <span className="text-sm font-medium text-success-strong">Correta</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-success/50 bg-success-soft px-4 py-3">
          <p className="text-sm font-medium text-success-strong">Resposta esperada</p>
          <p className="mt-1 whitespace-pre-line text-ink">{question.expected_answer}</p>
        </div>
      )}

      <details className="group rounded-2xl bg-canvas px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-primary">
          Ver resolução
        </summary>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{question.explanation}</p>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        {save?.status === "saved" ? (
          <p role="status" className="text-sm font-medium text-success-strong">
            Salvo nos seus exercícios.{" "}
            <Link href={`${EXERCISES_PATH}/${save.exerciseId}`} className="text-primary underline-offset-4 hover:underline">
              Abrir para editar
            </Link>
          </p>
        ) : (
          <Button variant="secondary" onClick={onSave} loading={save?.status === "saving"} loadingLabel="Salvando…">
            Salvar como exercício
          </Button>
        )}
        {save?.status === "error" && (
          <p role="alert" className="text-sm text-danger">
            {save.error}
          </p>
        )}
      </div>
    </li>
  );
}
