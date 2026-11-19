import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { PlusIcon } from "@/components/ui/icons";
import { listPackages } from "@/lib/api/packages";
import { PACKAGES_PATH } from "@/lib/auth/constants";
import { requireTeacherAccount } from "@/lib/exercises/teacher-guard";
import { exerciseCountLabel } from "@/lib/packages/model";

export const metadata: Metadata = {
  title: "Pacotes de exercícios",
};

export default function PackagesPage() {
  return (
    <>
      <PageHeader
        title="Pacotes de exercícios"
        description="Agrupe exercícios, como um “Pacote de Nivelamento”, e libere para os alunos quando quiser. Sem liberar, o aluno não vê o pacote."
        actions={
          <Link
            href={`${PACKAGES_PATH}/novo`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PlusIcon /> Novo pacote
          </Link>
        }
      />
      <Suspense fallback={<PageLoading label="Carregando pacotes…" />}>
        <PackageList />
      </Suspense>
    </>
  );
}

async function PackageList() {
  const account = await requireTeacherAccount();
  if (!account) return <ApiUnavailable retryHref={PACKAGES_PATH} />;
  let packages;
  try {
    packages = await listPackages();
  } catch {
    return <ApiUnavailable retryHref={PACKAGES_PATH} />;
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border-strong/60 bg-surface p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-ink">Nenhum pacote ainda</h2>
        <p className="mt-2 max-w-xl text-muted">
          Crie um pacote com os exercícios que quer aplicar juntos. Depois escolha para quais alunos liberar.
        </p>
        <Link href={`${PACKAGES_PATH}/novo`} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
          Criar o primeiro pacote
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {packages.map((item) => (
        <li key={item.id}>
          <Link
            href={`${PACKAGES_PATH}/${item.id}`}
            className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-surface p-5 transition hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <h2 className="font-semibold text-ink">{item.title}</h2>
            {item.description && <p className="line-clamp-2 text-sm text-ink/70">{item.description}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-border bg-canvas px-2.5 py-0.5 text-ink">{exerciseCountLabel(item.exercises.length)}</span>
              {item.releases.length ? (
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 font-medium text-success-strong">
                  Liberado para {item.releases.length} {item.releases.length === 1 ? "aluno" : "alunos"}
                </span>
              ) : (
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-medium text-accent-strong">Ainda não liberado</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
