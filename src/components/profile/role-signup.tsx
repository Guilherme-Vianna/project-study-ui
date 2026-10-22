import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { profileOf } from "@/lib/api/account";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { Alert } from "@/components/ui/alert";
import { HOME_PATH, ONBOARDING_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { invitePath } from "@/lib/invites/links";
import { registerStudentAction, registerTeacherAction } from "@/lib/profile/actions";
import { otherRoleMessage } from "@/lib/profile/action-state";
import { EMPTY_PROFILE, splitDisplayName, todayIso } from "@/lib/profile/fields";
import { ROLE_COPY, type Role } from "@/lib/profile/roles";
import { ProfileForm } from "./profile-form";

const actions = {
  teacher: registerTeacherAction,
  student: registerStudentAction,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function RoleSignup({ role, searchParams }: { role: Role; searchParams: SearchParams }) {
  const copy = ROLE_COPY[role];
  return (
    <div className="max-w-2xl">
      <PageHeader
        back={{ href: ONBOARDING_PATH, label: "Voltar" }}
        eyebrow={`Cadastro ${copy.article}`}
        title={`Crie seu perfil ${copy.article}`}
        description="Leva menos de um minuto. Só nome e sobrenome são obrigatórios."
      />
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <Suspense fallback={<PageLoading />}>
          <RoleSignupForm role={role} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function RoleSignupForm({ role, searchParams }: { role: Role; searchParams: SearchParams }) {
  const [{ user, account }, query] = await Promise.all([loadCurrentAccount(), searchParams]);
  const invite = role === "student" && typeof query.convite === "string" ? query.convite : null;
  if (!account) return <ApiUnavailable retryHref={ROLE_COPY[role].signupPath} />;
  if (account.role === role && profileOf(account)) redirect(invite ? invitePath(invite) : HOME_PATH);
  if (account.role && account.role !== role) return <Alert tone="error">{otherRoleMessage(role)}</Alert>;

  return (
    <ProfileForm
      action={actions[role]}
      audience={ROLE_COPY[role].audience}
      initialValues={{ ...EMPTY_PROFILE, ...splitDisplayName(account.name ?? user.name) }}
      submitLabel={`Criar perfil ${ROLE_COPY[role].article}`}
      pendingLabel="Criando seu perfil…"
      cancelHref={invite ? invitePath(invite) : ONBOARDING_PATH}
      hiddenFields={invite ? { convite: invite } : undefined}
      today={todayIso()}
    />
  );
}
