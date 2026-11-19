import "server-only";
import type { PackagePayload } from "@/lib/packages/model";
import type { Attempt, StudentExerciseEntry } from "./attempts";
import type { AttemptPayload } from "@/lib/attempts/model";
import { apiFetch, fetchAll, queryString } from "./client";
import type { ExerciseSummary } from "./exercises";

export type PackageRelease = {
  student_id: string;
  first_name: string | null;
  last_name: string | null;
  released_at: string;
};

export type ExercisePackage = {
  id: string;
  title: string;
  description: string | null;
  exercises: ExerciseSummary[];
  releases: PackageRelease[];
  created_at: string;
  updated_at: string;
};

export type StudentPackageSummary = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  released_at: string;
  exercise_count: number;
  attempted_exercises: number;
};

export type StudentPackage = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  released_at: string;
  exercises: StudentExerciseEntry[];
};

const packages = "/exercise-packages";
const mine = "/students/me/exercise-packages";
const id = encodeURIComponent;

export function listPackages() {
  return fetchAll<ExercisePackage>(packages);
}

export function getPackage(packageId: string) {
  return apiFetch<ExercisePackage>(`${packages}/${id(packageId)}`);
}

export function createPackage(payload: PackagePayload) {
  return apiFetch<ExercisePackage>(packages, { method: "POST", json: payload });
}

export function replacePackage(packageId: string, payload: PackagePayload) {
  return apiFetch<ExercisePackage>(`${packages}/${id(packageId)}`, { method: "PUT", json: payload });
}

export function deletePackage(packageId: string) {
  return apiFetch<void>(`${packages}/${id(packageId)}`, { method: "DELETE" });
}

export function releasePackage(packageId: string, studentIds: string[]) {
  return apiFetch<ExercisePackage>(`${packages}/${id(packageId)}/releases`, {
    method: "POST",
    json: { student_ids: studentIds },
  });
}

export function revokePackage(packageId: string, studentId: string) {
  return apiFetch<void>(`${packages}/${id(packageId)}/releases/${id(studentId)}`, { method: "DELETE" });
}

export function listMyPackages() {
  return apiFetch<StudentPackageSummary[]>(mine);
}

export function getMyPackage(packageId: string) {
  return apiFetch<StudentPackage>(`${mine}/${id(packageId)}`);
}

export function getPackageExercise(packageId: string, exerciseId: string) {
  return apiFetch<StudentExerciseEntry>(`${mine}/${id(packageId)}/exercises/${id(exerciseId)}`);
}

export function submitPackageAttempt(packageId: string, exerciseId: string, payload: AttemptPayload) {
  return apiFetch<Attempt>(`${mine}/${id(packageId)}/exercises/${id(exerciseId)}/attempts`, {
    method: "POST",
    json: payload,
  });
}

export function listPackageAttempts(packageId: string, exerciseId?: string) {
  return fetchAll<Attempt>(`${mine}/${id(packageId)}/attempts${queryString({ exercise_id: exerciseId })}`);
}
