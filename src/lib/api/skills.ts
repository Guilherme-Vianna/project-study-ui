import "server-only";
import type { SkillGroupPayload } from "@/lib/skills/model";
import { apiFetch, fetchAll } from "./client";

export type SkillSummary = { id: string; name: string; group: { id: string; name: string } };

export type SkillLevel = { id: string; name: string; description: string | null; position: number };

export type SkillGroup = {
  id: string;
  name: string;
  description: string | null;
  levels: SkillLevel[];
  skills: { id: string; name: string; description: string | null; position: number }[];
  created_at: string;
  updated_at: string;
};

export type StudentSkill = {
  id: string;
  student_id: string;
  skill: SkillSummary;
  level: SkillLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentSkillHistoryEntry = {
  operation: "insert" | "update" | "delete";
  level_id: string;
  level_name: string | null;
  level_position: number | null;
  notes: string | null;
  valid_from: string;
  changed_by: string | null;
};

const groups = "/skill-groups";
const groupPath = (groupId: string) => `${groups}/${encodeURIComponent(groupId)}`;
const studentSkills = (studentId: string) => `/teachers/me/students/${encodeURIComponent(studentId)}/skills`;

export function listSkillGroups() {
  return fetchAll<SkillGroup>(groups);
}

export function getSkillGroup(groupId: string) {
  return apiFetch<SkillGroup>(groupPath(groupId));
}

export function createSkillGroup(payload: SkillGroupPayload) {
  return apiFetch<SkillGroup>(groups, { method: "POST", json: payload });
}

export function replaceSkillGroup(groupId: string, payload: SkillGroupPayload) {
  return apiFetch<SkillGroup>(groupPath(groupId), { method: "PUT", json: payload });
}

export function deleteSkillGroup(groupId: string) {
  return apiFetch<void>(groupPath(groupId), { method: "DELETE" });
}

export function listStudentSkills(studentId: string) {
  return apiFetch<StudentSkill[]>(studentSkills(studentId));
}

export function assessStudentSkill(studentId: string, skillId: string, levelId: string, notes: string | null) {
  return apiFetch<StudentSkill>(`${studentSkills(studentId)}/${encodeURIComponent(skillId)}`, {
    method: "PUT",
    json: notes ? { level_id: levelId, notes } : { level_id: levelId },
  });
}

export function removeStudentSkill(studentId: string, skillId: string) {
  return apiFetch<void>(`${studentSkills(studentId)}/${encodeURIComponent(skillId)}`, { method: "DELETE" });
}

export function getStudentSkillHistory(studentId: string, skillId: string) {
  return apiFetch<StudentSkillHistoryEntry[]>(`${studentSkills(studentId)}/${encodeURIComponent(skillId)}/history`);
}

export function listMySkills() {
  return apiFetch<StudentSkill[]>("/students/me/skills");
}
