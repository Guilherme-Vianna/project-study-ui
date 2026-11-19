import Link from "next/link";

export function PackageNotFound({ href, label = "Ver pacotes", message }: { href?: string; label?: string; message?: string }) {
  return (
    <div className="max-w-xl rounded-3xl border border-border bg-surface p-8">
      <h1 className="text-xl font-semibold text-ink">Pacote não encontrado</h1>
      <p className="mt-2 text-muted">{message ?? "Ele pode ter sido excluído. Volte para a lista de pacotes."}</p>
      <Link href={href ?? "/pacotes"} className="mt-6 inline-flex font-medium text-primary underline-offset-4 hover:underline">
        {label}
      </Link>
    </div>
  );
}
