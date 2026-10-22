import "server-only";
import type { Role } from "@/lib/profile/roles";
import { apiFetch } from "./client";
import type { Profile } from "./profiles";

export type Account = {
  uid: string;
  email: string | null;
  name: string | null;
  role: Role | null;
  teacher: Profile | null;
  student: Profile | null;
};

export function getMyAccount() {
  return apiFetch<Account>("/me");
}

export function profileOf(account: Account): Profile | null {
  return account.teacher ?? account.student;
}
