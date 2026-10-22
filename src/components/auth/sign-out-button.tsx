"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { destroyServerSession } from "@/lib/auth/client-session";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    if (isFirebaseConfigured()) await signOut(getFirebaseAuth());
    await destroyServerSession();
    router.replace(LOGIN_PATH);
  }

  return (
    <Button variant="secondary" loading={pending} loadingLabel="Saindo…" onClick={handleSignOut}>
      Sair
    </Button>
  );
}
