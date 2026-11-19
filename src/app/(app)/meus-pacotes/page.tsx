import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { listMyPackages } from "@/lib/api/packages";
import { MY_PACKAGES_PATH } from "@/lib/auth/constants";
import { requireStudentAccount } from "@/lib/auth/student-guard";
import { formatDate } from "@/lib/invites/validity";
import { exerciseCountLabel } from "@/lib/packages/model";

export const metadata: Metadata = {
  title: "Pacotes de exercícios",
};

export default function MyPackagesPage() {
  return (
    <>
      <PageHeader
        title="Pacotes de exercícios"
        description="Grupos de exercícios que seu professor liberou para você. Abra um pacote para ver e responder os exercícios."
      />
      <Suspense fallback={<PageLoading label="Carregando pacotes…" />}>
        <MyPackages />
      </Suspense>
    </>
  );
}

async function MyPackages() {
  const account = await requireStudentAccount();
  if (!account) return <ApiUnavailable retryHref={MY_PACKAGES_PATH} />;
  let packages;
  try {
    packages = await listMyPackages();
  } catch {
    return <ApiUnavailable retryHref={MY_PACKAGES_PATH} />;
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-ink">Nenhum pacote liberado</h2>
        <p className="mt-2 max-w-xl text-muted">Quando seu professor liberar um pacote de exercícios para você, ele aparece aqui.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {packages.map((item) => {
        const done = item.exercise_count > 0 && item.attempted_exercises >= item.exercise_count;
        const percent = item.exercise_count ? Math.round((item.attempted_exercises / item.exercise_count) * 100) : 0;
        return (
          <li key={item.id}>
            <Link
              href={`${MY_PACKAGES_PATH}/${item.id}`}
              className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-surface p-5 transition hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-border bg-canvas px-2.5 py-0.5 text-ink">{exerciseCountLabel(item.exercise_count)}</span>
                {done ? (
                  <span className="font-medium text-success-strong">✓ Concluído</span>
                ) : (
                  <span className="text-muted">Liberado em {formatDate(item.released_at)}</span>
                )}
              </div>
              <h2 className="font-semibold text-ink">{item.title}</h2>
              {item.description && <p className="line-clamp-3 text-sm text-ink/70">{item.description}</p>}
              <div className="mt-auto flex flex-col gap-1.5">
                <div
                  role="progressbar"
                  aria-label={`Progresso em ${item.title}`}
                  aria-valuemin={0}
                  aria-valuemax={item.exercise_count}
                  aria-valuenow={item.attempted_exercises}
                  className="h-2 overflow-hidden rounded-full bg-canvas"
                >
                  <div className={`h-full rounded-full ${done ? "bg-success" : "bg-primary"}`} style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs text-muted">
                  {item.attempted_exercises} de {item.exercise_count} respondidos
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
