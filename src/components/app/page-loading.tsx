import { Spinner } from "@/components/ui/spinner";

export function PageLoading({ label = "Carregando…" }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-3 text-muted">
      <Spinner /> {label}
    </p>
  );
}
