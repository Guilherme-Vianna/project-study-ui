"use server";

import { redirect } from "next/navigation";
import { getMyAccount, profileOf } from "@/lib/api/account";
import { registerProfile, updateMyProfile } from "@/lib/api/profiles";
import { HOME_PATH, LOGIN_PATH, ONBOARDING_PATH, PROFILE_PATH } from "@/lib/auth/constants";
import { getSessionUser } from "@/lib/auth/session";
import { invalidState, stateFromApiError, type ProfileFormState } from "./action-state";
import { invitePath } from "@/lib/invites/links";
import { filledFields, readProfileForm, toPayload, validateProfile } from "./fields";
import type { Role } from "./roles";

async function register(role: Role, formData: FormData): Promise<ProfileFormState> {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);

  const values = readProfileForm(formData);
  const fieldErrors = validateProfile(values);
  if (Object.keys(fieldErrors).length) return invalidState(fieldErrors);

  try {
    await registerProfile(role, toPayload(values));
  } catch (error) {
    return stateFromApiError(error, role);
  }
  const invite = formData.get("convite");
  if (role === "student" && typeof invite === "string" && invite) {
    redirect(`${invitePath(invite)}?perfil=criado`);
  }
  redirect(`${HOME_PATH}?bem-vindo=${role}`);
}

export async function registerTeacherAction(_: ProfileFormState, formData: FormData) {
  return register("teacher", formData);
}

export async function registerStudentAction(_: ProfileFormState, formData: FormData) {
  return register("student", formData);
}

export async function updateProfileAction(_: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  if (!(await getSessionUser())) redirect(LOGIN_PATH);

  let account;
  try {
    account = await getMyAccount();
  } catch (error) {
    return stateFromApiError(error, "teacher");
  }
  const role = account.role;
  const profile = profileOf(account);
  if (!role || !profile) redirect(ONBOARDING_PATH);

  const values = readProfileForm(formData);
  const fieldErrors = validateProfile(values, { locked: filledFields(profile) });
  if (Object.keys(fieldErrors).length) return invalidState(fieldErrors);

  try {
    await updateMyProfile(role, toPayload(values));
  } catch (error) {
    return stateFromApiError(error, role);
  }
  redirect(`${PROFILE_PATH}?salvo=1`);
}
