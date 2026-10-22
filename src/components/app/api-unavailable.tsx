import Link from "next/link";
import { Alert } from "@/components/ui/alert";

export function ApiUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <Alert tone="error">
      Não conseguimos carregar os dados da sua conta agora. Verifique sua conexão e{" "}
      <Link href={retryHref} className="font-medium underline underline-offset-4">
        tente de novo
      </Link>
      .
    </Alert>
  );
}
