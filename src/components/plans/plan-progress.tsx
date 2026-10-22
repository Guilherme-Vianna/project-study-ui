import Link from "next/link";
import type { Progress } from "@/lib/api/plans";
import { formatHours } from "@/lib/exercises/model";
import { WEEKDAYS } from "@/lib/plans/model";

const weekdayShort = new Map(WEEKDAYS.map((day) => [day.value, day.short]));

export function ProgressBar({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "primary" | "success" }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-right text-muted">{detail}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="mt-1.5 h-2 rounded-full bg-canvas">
        <div className={`h-2 rounded-full ${tone === "success" ? "bg-success" : "bg-primary"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function weekRate(progress: Pick<Progress, "week_completed_hours" | "required_weekly_hours">) {
  if (!progress.required_weekly_hours) return 0;
  return Math.min(100, Math.round((progress.week_completed_hours / progress.required_weekly_hours) * 100));
}

type PlanProgressProps = {
  progress: Progress;
  pendingHref?: string;
  subjectsOpen?: boolean;
};

export function PlanProgress({ progress, pendingHref, subjectsOpen = false }: PlanProgressProps) {
  const subjects = (
    <ul className="flex flex-col gap-3">
      {progress.subjects.map((subject) => {
        const rate = subject.weekly_hours ? Math.min(100, Math.round((subject.week_completed_hours / subject.weekly_hours) * 100)) : 0;
        const days = subject.weekdays.length ? subject.weekdays.map((day) => weekdayShort.get(day)).join(", ") : "qualquer dia";
        return (
          <li key={subject.subject.id}>
            <ProgressBar
              label={subject.subject.name}
              value={rate}
              tone={subject.week_remaining_hours > 0 ? "primary" : "success"}
              detail={`${formatHours(subject.week_completed_hours)} de ${formatHours(subject.weekly_hours)}${
                subject.week_remaining_hours > 0 ? ` · faltam ${formatHours(subject.week_remaining_hours)}` : " ✓"
              } · ${days}`}
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4">
      <ProgressBar
        label="Esta semana"
        value={weekRate(progress)}
        detail={`${formatHours(progress.week_completed_hours)} de ${formatHours(progress.required_weekly_hours)}`}
        tone={weekRate(progress) >= 100 ? "success" : "primary"}
      />
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <MiniStat label="Exercícios feitos" value={`${progress.attempted_exercises} de ${progress.available_exercises}`} />
        <MiniStat label="Respostas enviadas" value={String(progress.total_attempts)} />
        <MiniStat
          label="Aguardando correção"
          value={String(progress.pending_reviews)}
          href={progress.pending_reviews > 0 ? pendingHref : undefined}
          highlight={progress.pending_reviews > 0}
        />
        <MiniStat label="Aprovadas" value={String(progress.approved_attempts)} />
      </dl>
      <p className="text-xs text-muted">Total estudado no plano: {formatHours(progress.completed_hours)}</p>
      {progress.subjects.length > 0 &&
        (subjectsOpen ? (
          subjects
        ) : (
          <details className="rounded-xl bg-canvas px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-ink">Por assunto nesta semana</summary>
            <div className="mt-3">{subjects}</div>
          </details>
        ))}
    </div>
  );
}

function MiniStat({ label, value, href, highlight = false }: { label: string; value: string; href?: string; highlight?: boolean }) {
  const content = (
    <>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-semibold ${highlight ? "text-accent-strong" : "text-ink"}`}>{value}</dd>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-xl border border-border px-3 py-2">{content}</div>
  );
}
