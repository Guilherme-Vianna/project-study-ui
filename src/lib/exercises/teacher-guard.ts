import "server-only";
import { redirect } from "next/navigation";
import { HOME_PATH, ONBOARDING_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";

export async function requireTeacherAccount() {
  const { account } = await loadCurrentAccount();
  if (!account) return null;
  if (!account.role) redirect(ONBOARDING_PATH);
  if (account.role !== "teacher") redirect(HOME_PATH);
  return account;
}
