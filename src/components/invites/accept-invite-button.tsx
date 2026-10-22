"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/lib/invites/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Button loading={pending} loadingLabel="Aceitando convite…" onClick={accept}>
        Aceitar convite
      </Button>
    </div>
  );
}
