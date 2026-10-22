import { STUDENT_SIGNUP_PATH, TEACHER_SIGNUP_PATH } from "@/lib/auth/constants";

export type Role = "teacher" | "student";

export const ROLES: readonly Role[] = ["teacher", "student"];

export const ROLE_COPY: Record<
  Role,
  { label: string; article: string; signupPath: string; audience: string; otherLabel: string }
> = {
  teacher: {
    label: "Professor",
    article: "de professor",
    signupPath: TEACHER_SIGNUP_PATH,
    audience: "Como seus alunos vão te ver",
    otherLabel: "aluno",
  },
  student: {
    label: "Aluno",
    article: "de aluno",
    signupPath: STUDENT_SIGNUP_PATH,
    audience: "Como seus professores vão te ver",
    otherLabel: "professor",
  },
};

export function isRole(value: unknown): value is Role {
  return value === "teacher" || value === "student";
}
