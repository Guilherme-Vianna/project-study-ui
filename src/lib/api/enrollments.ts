import "server-only";
import { apiFetch, fetchAll } from "./client";
import type { Profile } from "./profiles";

export type Invite = {
  id: string;
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  url: string | null;
  is_active: boolean;
};

export type TeacherPublic = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export type InvitePreview = {
  teacher: TeacherPublic;
  expires_at: string | null;
};

export function createInvite(expiresAt: string | null) {
  return apiFetch<Invite>("/teachers/me/invites", { method: "POST", json: { expires_at: expiresAt } });
}

export function listMyInvites() {
  return fetchAll<Invite>("/teachers/me/invites");
}

export function revokeInvite(inviteId: string) {
  return apiFetch<void>(`/teachers/me/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
}

export function previewInvite(token: string) {
  return apiFetch<InvitePreview>(`/invites/${encodeURIComponent(token)}`);
}

export function acceptInvite(token: string) {
  return apiFetch<unknown>(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" });
}

export function listMyStudents() {
  return fetchAll<Profile>("/teachers/me/students");
}

export function removeStudent(studentId: string) {
  return apiFetch<void>(`/teachers/me/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
}

export function listMyTeachers() {
  return fetchAll<TeacherPublic>("/students/me/teachers");
}

export function personName(person: { first_name: string | null; last_name: string | null }) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ");
}
