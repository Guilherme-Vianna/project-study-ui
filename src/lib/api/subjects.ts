import "server-only";
import { apiFetch, fetchAll } from "./client";

export type Subject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type SubjectPayload = {
  name: string;
  description: string | null;
};

export function listMySubjects() {
  return fetchAll<Subject>("/subjects");
}

export function createSubject(payload: SubjectPayload) {
  return apiFetch<Subject>("/subjects", { method: "POST", json: payload });
}

export function updateSubject(subjectId: string, payload: SubjectPayload) {
  return apiFetch<Subject>(`/subjects/${encodeURIComponent(subjectId)}`, { method: "PATCH", json: payload });
}

export function deleteSubject(subjectId: string) {
  return apiFetch<void>(`/subjects/${encodeURIComponent(subjectId)}`, { method: "DELETE" });
}
