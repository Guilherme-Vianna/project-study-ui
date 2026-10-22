import type { ReactNode } from "react";
import { ImageThumb } from "@/components/exercises/image-thumb";
import { REVIEW_STATUS_LABELS, type ReviewStatus } from "@/lib/attempts/model";
import { optionLetter, type ImagePlacement } from "@/lib/exercises/model";

const badgeTones: Record<ReviewStatus, string> = {
  pending: "bg-accent-soft text-accent-strong",
  approved: "bg-success-soft text-success-strong",
  rejected: "bg-danger-soft text-danger",
};

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[status]}`}>{REVIEW_STATUS_LABELS[status]}</span>;
}

export function CorrectnessBadge({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === null) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${isCorrect ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger"}`}
    >
      {isCorrect ? "Acertou" : "Errou"}
    </span>
  );
}

export function Chips({ items, tone = "neutral" }: { items: { id: string; name: string }[]; tone?: "neutral" | "skill" }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className={`rounded-full px-2.5 py-0.5 text-xs ${tone === "skill" ? "bg-success-soft text-success-strong" : "border border-border bg-canvas text-ink"}`}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}

type ImageLink = { placement: ImagePlacement; position: number; image: { id: string; url: string | null; original_filename: string | null } };

export function ExerciseStatement({ statement, images }: { statement: string | null; images: ImageLink[] }) {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const inline = sorted.filter((link) => link.placement === "statement");
  const attachments = sorted.filter((link) => link.placement === "attachment");
  return (
    <div className="flex flex-col gap-4">
      {statement ? (
        <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">{statement}</p>
      ) : (
        <p className="text-sm italic text-muted">Sem enunciado. Use o título e as imagens como guia.</p>
      )}
      {inline.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {inline.map((link, index) => (
            <ImageLinkThumb key={link.image.id} url={link.image.url} alt={link.image.original_filename ?? `Imagem ${index + 1} do enunciado`} className="size-40 sm:size-56" />
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink">Anexos</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {attachments.map((link, index) => (
              <ImageLinkThumb key={link.image.id} url={link.image.url} alt={link.image.original_filename ?? `Anexo ${index + 1}`} className="size-24" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageLinkThumb({ url, alt, className }: { url: string | null; alt: string; className: string }) {
  if (!url) return <ImageThumb url={null} alt={alt} className={className} />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <ImageThumb url={url} alt={alt} className={className} />
    </a>
  );
}

type OptionView = { id: string; position: number; text: string | null; image: { url: string | null } | null };

export function AnsweredOptions({ options, selected, correct }: { options: OptionView[]; selected: string[]; correct: string[] }) {
  const sorted = [...options].sort((a, b) => a.position - b.position);
  return (
    <ol className="flex flex-col gap-2">
      {sorted.map((option, index) => {
        const isSelected = selected.includes(option.id);
        const isCorrect = correct.includes(option.id);
        const tone = isCorrect ? "border-success bg-success-soft/60" : isSelected ? "border-danger/50 bg-danger-soft" : "border-border";
        const marks: ReactNode[] = [];
        if (isSelected) marks.push(<Mark key="selected" tone={isCorrect ? "success" : "danger"}>Marcada</Mark>);
        if (isCorrect) marks.push(<Mark key="correct" tone="success">Correta</Mark>);
        return (
          <li key={option.id} className={`flex items-start gap-3 rounded-2xl border p-3 ${tone}`}>
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isCorrect ? "bg-success text-white" : isSelected ? "bg-danger text-white" : "bg-canvas text-ink"
              }`}
            >
              {optionLetter(index)}
            </span>
            <div className="min-w-0 flex-1">
              <span className="sr-only">Alternativa {optionLetter(index)}: </span>
              {option.text && <p className="whitespace-pre-wrap text-ink">{option.text}</p>}
              {option.image && <ImageThumb url={option.image.url} alt={`Imagem da alternativa ${optionLetter(index)}`} className="mt-2 size-24" />}
            </div>
            {marks.length > 0 && <div className="flex shrink-0 flex-col items-end gap-1">{marks}</div>}
          </li>
        );
      })}
    </ol>
  );
}

function Mark({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone === "success" ? "bg-surface text-success-strong" : "bg-surface text-danger"}`}>
      {children}
    </span>
  );
}

export function Feedback({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary-soft p-4">
      <p className="text-xs font-medium text-primary">Comentário do professor</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}
