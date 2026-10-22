import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getMyAccount, type Account } from "@/lib/api/account";
import { ApiError } from "@/lib/api/client";
import { LOGIN_PATH } from "./constants";
import { getSessionUser, type SessionUser } from "./session";

export type CurrentAccount = { user: SessionUser; account: Account | null };

export const loadCurrentAccount = cache(async (): Promise<CurrentAccount> => {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);
  try {
    return { user, account: await getMyAccount() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(LOGIN_PATH);
    return { user, account: null };
  }
});
