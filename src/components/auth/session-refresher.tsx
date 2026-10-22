"use client";

import { onIdTokenChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { createServerSession, destroyServerSession } from "@/lib/auth/client-session";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export function SessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (user) {
        await createServerSession(user).catch(() => undefined);
        return;
      }
      await destroyServerSession();
      router.replace(LOGIN_PATH);
    });
  }, [router]);

  return null;
}
