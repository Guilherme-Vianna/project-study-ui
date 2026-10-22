import Link from "next/link";
import { PLANS_PATH } from "@/lib/auth/constants";

export function PlanNotFound() {
  return (
    <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
      <h1 className="text-xl font-semibold text-ink">Plano não encontrado</h1>
      <p className="mt-2 text-muted">Ele pode ter sido excluído. Volte para a lista para ver seus planos.</p>
      <Link href={PLANS_PATH} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
        Ver planos
      </Link>
    </div>
  );
}
