import "server-only";
import { redirect } from "next/navigation";
import { HOME_PATH, ONBOARDING_PATH } from "./constants";
import { loadCurrentAccount } from "./current-account";

export async function requireStudentAccount() {
  const { account } = await loadCurrentAccount();
  if (!account) return null;
  if (!account.role) redirect(ONBOARDING_PATH);
  if (account.role !== "student") redirect(HOME_PATH);
  return account;
}
