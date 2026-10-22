import "server-only";
import type { ProfileField, ProfilePayload } from "@/lib/profile/fields";
import type { Role } from "@/lib/profile/roles";
import { apiFetch } from "./client";

export type Profile = {
  id: string;
  firebase_uid: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  postal_code: string | null;
  mobile_phone: string | null;
  created_at: string;
  updated_at: string;
  missing_fields: ProfileField[];
  profile_complete: boolean;
};

const collections: Record<Role, string> = {
  teacher: "/teachers",
  student: "/students",
};

export function registerProfile(role: Role, payload: ProfilePayload) {
  return apiFetch<Profile>(collections[role], { method: "POST", json: payload });
}

export function getMyProfile(role: Role) {
  return apiFetch<Profile>(`${collections[role]}/me`);
}

export function updateMyProfile(role: Role, payload: ProfilePayload) {
  return apiFetch<Profile>(`${collections[role]}/me`, { method: "PATCH", json: payload });
}
