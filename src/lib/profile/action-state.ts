import "server-only";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { fieldErrorsFromIssues, type ProfileFieldErrors } from "./fields";
import { ROLE_COPY, type Role } from "./roles";

export type ProfileFormState = {
  fieldErrors: ProfileFieldErrors;
  formError: string | null;
};

export const REVIEW_FIELDS_MESSAGE = "Revise os campos destacados e tente de novo.";
const GENERIC_SAVE_ERROR = "Não foi possível salvar agora. Seus dados continuam aqui; tente de novo em instantes.";

export function invalidState(fieldErrors: ProfileFieldErrors): ProfileFormState {
  return { fieldErrors, formError: REVIEW_FIELDS_MESSAGE };
}

export function otherRoleMessage(role: Role) {
  const other = ROLE_COPY[role].otherLabel;
  return `Sua conta já está cadastrada como ${other}. Uma mesma conta não pode ser professor e aluno; entre com outro e-mail para criar um perfil ${ROLE_COPY[role].article}.`;
}

export function stateFromApiError(error: unknown, role: Role): ProfileFormState {
  if (!(error instanceof ApiError)) {
    return { fieldErrors: {}, formError: GENERIC_SAVE_ERROR };
  }
  if (error.status === 401) redirect(LOGIN_PATH);
  if (error.status === 409) {
    if (typeof error.detail === "string" && error.detail.includes("already registered")) {
      redirect(HOME_PATH);
    }
    return { fieldErrors: {}, formError: otherRoleMessage(role) };
  }
  if (error.status === 404) redirect(HOME_PATH);
  if (error.status === 422 && Array.isArray(error.detail)) {
    const fieldErrors = fieldErrorsFromIssues(error.detail);
    if (Object.keys(fieldErrors).length) return invalidState(fieldErrors);
  }
  if (error.status === 503) {
    return {
      fieldErrors: {},
      formError: "O serviço de contas está instável no momento. Seus dados continuam aqui; tente de novo em instantes.",
    };
  }
  return { fieldErrors: {}, formError: GENERIC_SAVE_ERROR };
}
