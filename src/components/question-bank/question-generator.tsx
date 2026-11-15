"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SkillPicker } from "@/components/exercises/skill-picker";
import { TextAreaField } from "@/components/ui/text-area-field";
import { EXERCISES_PATH } from "@/lib/auth/constants";
import { EXERCISE_TYPE_LABELS, optionLetter, type ExerciseType } from "@/lib/exercises/model";
import { saveGeneratedQuestionAction } from "@/lib/question-bank/actions";
import {
  COUNT_OPTIONS,
  DIFFICULTY_LABELS,
  FEEDBACK_LIMIT,
  PROMPT_LIMIT,
  referenceSummary,
  type Difficulty,
  type GeneratedDraft,
  type GenerationSession,
  type Suggestion,
} from "@/lib/question-bank/model";
import {
  ADJUSTMENT_STEPS,
  advance,
  GENERATION_STEPS,
  GenerationStreamError,
  initialProgress,
  streamGeneration,
  type ProgressState,
} from "@/lib/question-bank/stream";
import type { SkillGroupOption } from "@/lib/skills/model";
import { GenerationProgress, QuestionSkeleton } from "./generation-progress";

const controlClass =
  "h-11 w-full cursor-pointer rounded-full border border-border-strong bg-surface px-4 text-sm text-ink focus:border-primary focus:outline-2 focus:outline-primary";

const GENERATIONS_URL = "/api/question-generations";

type SaveState = { status: "saving" } | { status: "saved"; exerciseId: string } | { status: "error"; error: string };
type Adjusting = { questionId: string; progress: ProgressState } | null;

function revealSmoothly(element: HTMLElement | null) {
  if (!element) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
}

function without<T>(record: Record<string, T>, key: string) {
  const copy = { ...record };
  delete copy[key];
  return copy;
}

function errorMessage(error: unknown) {
  return error instanceof GenerationStreamError ? error.message : "Não foi possível gerar agora. Tente de novo.";
}

export function QuestionGenerator({
  suggestions,
  total,
  skillGroups,
}: {
  suggestions: Suggestion[];
  total: number;
  skillGroups: SkillGroupOption[];
}) {
  const formId = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState("5");
  const [type, setType] = useState<ExerciseType | "">("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [promptError, setPromptError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  const [adjusting, setAdjusting] = useState<Adjusting>(null);
  const [adjustErrors, setAdjustErrors] = useState<Record<string, string>>({});
  const pending = progress !== null;
  const progressRef = useRef<HTMLElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (pending) revealSmoothly(progressRef.current);
  }, [pending]);

  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) return;
    revealSmoothly(resultsHeadingRef.current);
    resultsHeadingRef.current?.focus({ preventScroll: true });
  }, [sessionId]);

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
    setSession(null);
    setSaves({});
    setAdjustErrors({});
    let state = initialProgress(GENERATION_STEPS);
    setProgress(state);
    try {
      const result = await streamGeneration(
        GENERATIONS_URL,
        { prompt: text, count: Number(count), type: type || null, difficulty: difficulty || null },
        (event) => {
          state = advance(state, GENERATION_STEPS, event);
          setProgress(state);
        },
      );
      setSession(result);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setProgress(null);
    }
  }

  async function requestAdjustment(questionId: string, feedback: string) {
    if (!session) return;
    let state = initialProgress(ADJUSTMENT_STEPS);
    setAdjusting({ questionId, progress: state });
    setAdjustErrors((current) => without(current, questionId));
    try {
      const result = await streamGeneration(
        `${GENERATIONS_URL}/${encodeURIComponent(session.id)}/adjustments`,
        { adjustments: [{ question_id: questionId, feedback }] },
        (event) => {
          state = advance(state, ADJUSTMENT_STEPS, event);
          setAdjusting({ questionId, progress: state });
        },
      );
      setSession(result);
      setSaves((current) => without(current, questionId));
      return true;
    } catch (error) {
      setAdjustErrors((current) => ({ ...current, [questionId]: errorMessage(error) }));
      return false;
    } finally {
      setAdjusting(null);
    }
  }

  async function save(draft: GeneratedDraft, skillIds: string[]) {
    setSaves((current) => ({ ...current, [draft.id]: { status: "saving" } }));
    const response = await saveGeneratedQuestionAction(draft.question, skillIds);
    setSaves((current) => ({
      ...current,
      [draft.id]: response.ok ? { status: "saved", exerciseId: response.exerciseId } : { status: "error", error: response.error },
    }));
  }

  const ready = session?.questions.filter((draft) => draft.status === "ready") ?? [];
  const discarded = session?.questions.filter((draft) => draft.status === "discarded") ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:items-start">
      <form
        noValidate
        onSubmit={submit}
        aria-describedby={`${formId}-hint`}
        className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6 sm:p-8 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto"
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
        <Button type="submit" loading={pending} loadingLabel="Gerando questões…" disabled={adjusting !== null}>
          Gerar questões
        </Button>
        <p id={`${formId}-hint`} className="text-sm text-muted">
          Baseado em {total.toLocaleString("pt-BR")} questões de provas. Cada questão é conferida por outro modelo, e nada
          é salvo até você escolher.
        </p>
      </form>

      <div className="flex min-w-0 flex-col gap-4">
        {!progress && !session && (
          <div className="hidden rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 text-center lg:block">
            <p className="font-medium text-ink">As questões aparecem aqui</p>
            <p className="mt-1 text-sm text-muted">
              Descreva o que quer praticar e clique em &quot;Gerar questões&quot;. Você acompanha cada etapa ao vivo.
            </p>
          </div>
        )}

        {progress && (
          <section ref={progressRef} aria-label="Gerando questões" className="flex scroll-mt-32 flex-col gap-4">
            <GenerationProgress steps={GENERATION_STEPS} progress={progress} />
            <ol className="flex flex-col gap-4">
              {Array.from({ length: Math.min(Number(count), 3) }, (_, index) => (
                <QuestionSkeleton key={index} />
              ))}
            </ol>
          </section>
        )}

        {session && !progress && (
          <section aria-labelledby={`${formId}-results`} className="flex scroll-mt-32 flex-col gap-4">
            <div>
              <h2
                id={`${formId}-results`}
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="scroll-mt-32 text-xl font-semibold tracking-tight text-ink focus:outline-none"
              >
                {ready.length} {ready.length === 1 ? "questão pronta para revisar" : "questões prontas para revisar"}
              </h2>
              <FilterSummary session={session} />
            </div>
            {ready.length === 0 && (
              <Alert tone="info">Nenhuma questão passou na conferência desta vez. Gere de novo ou mude o pedido.</Alert>
            )}
            <ol className="flex flex-col gap-4">
              {ready.map((draft, index) => (
                <QuestionCard
                  key={`${draft.id}-${draft.teacher_revisions}`}
                  skillGroups={skillGroups}
                  number={index + 1}
                  draft={draft}
                  maxRevisions={session.max_teacher_revisions}
                  save={saves[draft.id]}
                  onSave={(skillIds) => save(draft, skillIds)}
                  adjusting={adjusting?.questionId === draft.id ? adjusting.progress : null}
                  adjustDisabled={adjusting !== null}
                  adjustError={adjustErrors[draft.id]}
                  onAdjust={(feedback) => requestAdjustment(draft.id, feedback)}
                />
              ))}
            </ol>
            {discarded.length > 0 && (
              <details className="rounded-2xl border border-border bg-surface px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-primary">
                  {discarded.length} {discarded.length === 1 ? "questão descartada" : "questões descartadas"} na conferência
                </summary>
                <ul className="mt-2 flex flex-col gap-2 text-sm text-muted">
                  {discarded.map((draft) => (
                    <li key={draft.id}>
                      <span className="font-medium text-ink">{draft.question.title}</span>
                      {draft.issue ? ` — ${draft.issue}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
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

function FilterSummary({ session }: { session: GenerationSession }) {
  const { filters } = session;
  const parts = [filters.subject, filters.topics.join(", "), filters.board].filter(Boolean);
  const source = referenceSummary(session);
  return (
    <p className="mt-1 text-sm text-muted">
      {parts.length ? `A IA buscou por ${parts.join(" · ")}` : "A IA buscou no banco inteiro"}
      {session.references.length > 0 &&
        ` e usou ${session.references.length} ${session.references.length === 1 ? "questão" : "questões"} de referência${source ? ` (${source})` : ""}.`}
    </p>
  );
}

function Badge({ tone, children }: { tone: "success" | "accent" | "muted" | "primary"; children: ReactNode }) {
  const tones = {
    success: "bg-success-soft text-success-strong",
    accent: "bg-accent/15 text-accent-strong",
    muted: "bg-canvas text-muted",
    primary: "bg-primary-soft text-primary",
  };
  return <span className={`rounded-full px-3 py-1 ${tones[tone]}`}>{children}</span>;
}

function QuestionCard({
  number,
  draft,
  skillGroups,
  maxRevisions,
  save,
  onSave,
  adjusting,
  adjustDisabled,
  adjustError,
  onAdjust,
}: {
  number: number;
  draft: GeneratedDraft;
  skillGroups: SkillGroupOption[];
  maxRevisions: number;
  save: SaveState | undefined;
  onSave: (skillIds: string[]) => void;
  adjusting: ProgressState | null;
  adjustDisabled: boolean;
  adjustError: string | undefined;
  onAdjust: (feedback: string) => Promise<boolean | undefined>;
}) {
  const { question } = draft;
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string>();
  const [skillIds, setSkillIds] = useState(draft.skill_ids);
  const hasSkills = skillGroups.some((group) => group.skills.length > 0);
  const remaining = maxRevisions - draft.teacher_revisions;

  async function submitAdjustment() {
    if (feedback.trim().length < FEEDBACK_LIMIT.min) {
      setFeedbackError("Diga o que precisa mudar, por exemplo: \"a alternativa C também está certa\".");
      return;
    }
    setFeedbackError(undefined);
    if (await onAdjust(feedback.trim())) {
      setFeedback("");
      setOpen(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <Badge tone="primary">{question.subject}</Badge>
        <Badge tone="muted">{question.topic}</Badge>
        <Badge tone="muted">{EXERCISE_TYPE_LABELS[question.type]}</Badge>
        {draft.verified && <Badge tone="success">Conferida por outro modelo</Badge>}
        {draft.verified === null && <Badge tone="accent">Não foi possível conferir</Badge>}
        {draft.auto_fixes > 0 && (
          <Badge tone="muted">
            Corrigida automaticamente {draft.auto_fixes}x
          </Badge>
        )}
        {draft.teacher_revisions > 0 && <Badge tone="muted">Ajustada por você {draft.teacher_revisions}x</Badge>}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-ink">
        {number}. {question.title}
      </h3>

      {adjusting ? (
        <GenerationProgress steps={ADJUSTMENT_STEPS} progress={adjusting} compact />
      ) : (
        <>
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
          <details className="rounded-2xl bg-canvas px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-primary">
              Ver resolução
            </summary>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{question.explanation}</p>
          </details>
        </>
      )}

      {!adjusting && hasSkills && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink">
            Habilidades{" "}
            <span className="font-normal text-muted">
              {draft.skill_ids.length > 0 ? "— sugeridas pela IA, ajuste antes de salvar" : "— marque as que esta questão treina"}
            </span>
          </p>
          <SkillPicker groups={skillGroups} selected={skillIds} onChange={setSkillIds} disabled={save?.status === "saved"} />
        </div>
      )}

      {draft.issue && !adjusting && <Alert tone="info">{draft.issue}</Alert>}
      {adjustError && <Alert tone="error">{adjustError}</Alert>}

      {open && !adjusting && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <TextAreaField
            label="O que precisa mudar?"
            placeholder="Ex.: a alternativa C também está certa; use números menores; troque o contexto"
            hint={`A IA refaz só esta questão e confere de novo. Restam ${remaining} ${remaining === 1 ? "ajuste" : "ajustes"}.`}
            value={feedback}
            maxLength={FEEDBACK_LIMIT.max}
            error={feedbackError}
            onChange={(event) => {
              setFeedback(event.target.value);
              if (feedbackError) setFeedbackError(undefined);
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Button block={false} onClick={submitAdjustment} disabled={adjustDisabled}>
              Refazer questão
            </Button>
            <Button variant="link" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!adjusting && (
        <div className="flex flex-wrap items-center gap-3">
          {save?.status === "saved" ? (
            <p role="status" className="text-sm font-medium text-success-strong">
              Salvo nos seus exercícios.{" "}
              <Link href={`${EXERCISES_PATH}/${save.exerciseId}`} className="text-primary underline-offset-4 hover:underline">
                Abrir para editar
              </Link>
            </p>
          ) : (
            <Button variant="secondary" onClick={() => onSave(skillIds)} loading={save?.status === "saving"} loadingLabel="Salvando…">
              Salvar como exercício
            </Button>
          )}
          {!open && remaining > 0 && save?.status !== "saved" && (
            <Button variant="link" onClick={() => setOpen(true)} disabled={adjustDisabled}>
              Pedir ajuste
            </Button>
          )}
          {save?.status === "error" && (
            <p role="alert" className="text-sm text-danger">
              {save.error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
