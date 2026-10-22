"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { TextAreaField } from "@/components/ui/text-area-field";
import { SKILLS_PATH } from "@/lib/auth/constants";
import {
  assessStudentSkillAction,
  loadSkillHistoryAction,
  removeStudentSkillAction,
  type SkillHistoryItem,
} from "@/lib/skills/actions";
import { levelProgress, SKILL_LIMITS } from "@/lib/skills/model";

export type AssessmentGroup = {
  id: string;
  name: string;
  levels: { id: string; name: string }[];
  skills: { id: string; name: string }[];
};

export type Assessment = { levelId: string; notes: string; updatedLabel: string };

type StudentSkillsPanelProps = {
  studentId: string;
  studentName: string;
  groups: AssessmentGroup[];
  assessments: Record<string, Assessment>;
};

export function StudentSkillsPanel({ studentId, studentName, groups, assessments }: StudentSkillsPanelProps) {
  const withSkills = groups.filter((group) => group.skills.length > 0);
  if (withSkills.length === 0) {
    return (
      <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
        Você ainda não tem habilidades para avaliar.{" "}
        <Link href={`${SKILLS_PATH}/novo`} className="font-medium text-primary underline-offset-4 hover:underline">
          Crie um grupo de habilidades
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {withSkills.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">{group.name}</h3>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {group.skills.map((skill) => (
              <SkillRow key={skill.id} studentId={studentId} studentName={studentName} skill={skill} levels={group.levels} assessment={assessments[skill.id]} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type SkillRowProps = {
  studentId: string;
  studentName: string;
  skill: { id: string; name: string };
  levels: { id: string; name: string }[];
  assessment: Assessment | undefined;
};

function SkillRow({ studentId, studentName, skill, levels, assessment }: SkillRowProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [levelId, setLevelId] = useState(assessment?.levelId ?? "");
  const [notes, setNotes] = useState(assessment?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<SkillHistoryItem[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loadingHistory, startHistory] = useTransition();

  const levelIndex = assessment ? levels.findIndex((level) => level.id === assessment.levelId) : -1;
  const current = levelIndex >= 0 ? levels[levelIndex] : null;
  const rate = levelIndex >= 0 ? levelProgress(levelIndex, levels.length) : null;

  function open() {
    setLevelId(assessment?.levelId ?? "");
    setNotes(assessment?.notes ?? "");
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  function save() {
    if (!levelId) {
      setError("Escolha um nível.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assessStudentSkillAction(studentId, skill.id, levelId, notes);
      if (result.ok) {
        setEditing(false);
        setSaved(true);
        setHistory(null);
        setHistoryOpen(false);
      } else setError(result.error);
    });
  }

  function toggleHistory() {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    if (history) return;
    startHistory(async () => {
      const result = await loadSkillHistoryAction(studentId, skill.id);
      if (result.ok) setHistory(result.items);
      else setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{skill.name}</p>
          {current ? (
            <p className="text-sm text-muted">
              <span className="font-medium text-primary">{current.name}</span> · nível {levelIndex + 1} de {levels.length} · {assessment?.updatedLabel}
            </p>
          ) : (
            <p className="text-sm text-muted">Ainda não avaliada</p>
          )}
          {rate !== null && (
            <div aria-hidden="true" className="mt-2 h-1.5 max-w-xs rounded-full bg-canvas">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${rate}%` }} />
            </div>
          )}
        </div>
        {!editing && (
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="link" className="px-2 text-sm" onClick={open}>
              {assessment ? "Atualizar" : "Avaliar"}
            </Button>
            {assessment && (
              <Button variant="link" className="px-2 text-sm" aria-expanded={historyOpen} onClick={toggleHistory}>
                Evolução
              </Button>
            )}
          </div>
        )}
      </div>
      {saved && !editing && <Alert tone="success">Avaliação salva. {studentName.split(" ")[0]} já vê o novo nível.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {assessment?.notes && !editing && <p className="whitespace-pre-wrap rounded-xl bg-canvas p-3 text-sm text-ink">{assessment.notes}</p>}

      {editing && (
        <div className="flex flex-col gap-4 rounded-2xl bg-canvas p-4">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Nível de {skill.name}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {levels.map((level, index) => (
                <label
                  key={level.id}
                  className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm has-focus-visible:outline-2 has-focus-visible:outline-primary ${
                    levelId === level.id ? "border-primary bg-primary-soft font-medium text-primary" : "border-border bg-surface text-ink hover:border-border-strong"
                  }`}
                >
                  <input type="radio" name={`${id}-level`} value={level.id} checked={levelId === level.id} disabled={pending} onChange={() => setLevelId(level.id)} className="sr-only" />
                  <span aria-hidden="true" className="text-xs text-muted">
                    {index + 1}
                  </span>
                  {level.name}
                </label>
              ))}
            </div>
          </fieldset>
          <TextAreaField
            label="Observações"
            optional
            name="notes"
            rows={3}
            value={notes}
            maxLength={SKILL_LIMITS.notes}
            placeholder="O que levou a este nível e o que treinar a seguir."
            hint="O aluno vê estas observações."
            disabled={pending}
            onChange={(event) => setNotes(event.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button block={false} loading={pending} loadingLabel="Salvando…" onClick={save}>
              Salvar avaliação
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            {assessment && (
              <ConfirmDialog
                title={`Remover a avaliação de ${skill.name}?`}
                description={`${studentName} deixa de ver esta habilidade. A evolução registrada continua no histórico.`}
                confirmLabel="Remover avaliação"
                pendingLabel="Removendo…"
                onConfirm={async () => {
                  const result = await removeStudentSkillAction(studentId, skill.id);
                  if (result.ok) setEditing(false);
                  return result;
                }}
                trigger={(openDialog) => (
                  <Button variant="link" className="text-danger sm:ml-auto" disabled={pending} onClick={openDialog}>
                    Remover avaliação
                  </Button>
                )}
              />
            )}
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="rounded-2xl border border-border p-3">
          <p className="text-sm font-medium text-ink">Evolução de {skill.name}</p>
          {loadingHistory || !history ? (
            <p role="status" className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
              <Spinner className="size-4" /> Carregando…
            </p>
          ) : history.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Sem registros.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="relative">
                  <span aria-hidden="true" className={`absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full ${entry.removed ? "bg-border-strong" : "bg-primary"}`} />
                  <p className="text-sm text-ink">
                    {entry.removed ? "Avaliação removida" : <span className="font-medium">{entry.levelName}</span>}
                    <span className="text-muted"> · {entry.whenLabel}</span>
                  </p>
                  {entry.notes && !entry.removed && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{entry.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}
