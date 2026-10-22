import "server-only";
import type { PlanPayload, Weekday } from "@/lib/plans/model";
import { apiFetch, fetchAll } from "./client";
import type { Exercise } from "./exercises";

export type StudyPlan = {
  id: string;
  title: string;
  description: string | null;
  required_weekly_hours: number;
  allocated_hours: number;
  subjects: { subject: { id: string; name: string }; weekly_hours: number; weekdays: Weekday[] }[];
  exercises: { position: number; allocated_hours: number; exercise: Exercise }[];
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  plan_id: string;
  student_id: string;
  ended_at: string | null;
  created_at: string;
};

export type Progress = {
  assignment_id: string;
  week_start: string;
  week_end: string;
  required_weekly_hours: number;
  week_completed_hours: number;
  allocated_hours: number;
  completed_hours: number;
  total_exercises: number;
  completed_exercises: number;
  completion_rate: number;
  subjects: {
    subject: { id: string; name: string };
    weekdays: Weekday[];
    weekly_hours: number;
    week_completed_hours: number;
    week_remaining_hours: number;
    total_completed_hours: number;
  }[];
};

const base = "/study-plans";
const planPath = (planId: string) => `${base}/${encodeURIComponent(planId)}`;

export function listMyPlans() {
  return fetchAll<StudyPlan>(base);
}

export function getPlan(planId: string) {
  return apiFetch<StudyPlan>(planPath(planId));
}

export function createPlan(payload: PlanPayload) {
  return apiFetch<StudyPlan>(base, { method: "POST", json: payload });
}

export function replacePlan(planId: string, payload: PlanPayload) {
  return apiFetch<StudyPlan>(planPath(planId), { method: "PUT", json: payload });
}

export function deletePlan(planId: string) {
  return apiFetch<void>(planPath(planId), { method: "DELETE" });
}

export function listActiveAssignments(planId: string) {
  return fetchAll<Assignment>(`${planPath(planId)}/assignments`);
}

export function assignPlan(planId: string, studentId: string) {
  return apiFetch<Assignment>(`${planPath(planId)}/assignments`, { method: "POST", json: { student_id: studentId } });
}

export function endAssignment(planId: string, assignmentId: string) {
  return apiFetch<void>(`${planPath(planId)}/assignments/${encodeURIComponent(assignmentId)}`, { method: "DELETE" });
}

export function getAssignmentProgress(planId: string, assignmentId: string) {
  return apiFetch<Progress>(`${planPath(planId)}/assignments/${encodeURIComponent(assignmentId)}/progress`);
}
