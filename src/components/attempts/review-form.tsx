"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/text-area-field";
import { reviewAttemptAction } from "@/lib/attempts/actions";
import { FEEDBACK_LIMIT, REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/attempts/model";

type ReviewFormProps = { attemptId: string; status: ReviewStatus; feedback: string | null };

export function ReviewForm({ attemptId, status, feedback }: ReviewFormProps) {
  const [text, setText] = useState(feedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<ReviewStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const tooLong = text.trim().length > FEEDBACK_LIMIT;

  function save(next: ReviewStatus) {
    if (tooLong) {
      setError(`O comentário pode ter até ${FEEDBACK_LIMIT} caracteres.`);
      return;
    }
    setSaving(next);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await reviewAttemptAction(attemptId, next, text);
      setSaving(null);
      if (result.ok) setNotice(next === "pending" ? "A resposta voltou para a fila de correção." : `Correção salva: ${REVIEW_STATUS_LABELS[next].toLowerCase()}. O aluno já pode ver.`);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      <TextAreaField
        label="Comentário para o aluno"
        name="feedback"
        optional
        rows={10}
        value={text}
        maxLength={FEEDBACK_LIMIT}
        placeholder="O que ficou bom, o que precisa melhorar e como estudar a partir daqui."
        hint="O aluno vê este comentário junto da resposta."
        error={tooLong ? `Use até ${FEEDBACK_LIMIT} caracteres.` : undefined}
        disabled={pending}
        onChange={(event) => {
          setText(event.target.value);
          setNotice(null);
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button block={false} loading={saving === "approved"} loadingLabel="Aprovando…" disabled={pending} onClick={() => save("approved")}>
          Aprovar
        </Button>
        <Button variant="secondary" loading={saving === "rejected"} loadingLabel="Rejeitando…" disabled={pending} onClick={() => save("rejected")}>
          Rejeitar
        </Button>
        {status !== "pending" && (
          <Button variant="link" loading={saving === "pending"} loadingLabel="Salvando…" disabled={pending} onClick={() => save("pending")}>
            Voltar para aguardando correção
          </Button>
        )}
      </div>
    </div>
  );
}
