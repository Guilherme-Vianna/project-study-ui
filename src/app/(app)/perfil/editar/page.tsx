import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { ProfileForm } from "@/components/profile/profile-form";
import { profileOf } from "@/lib/api/account";
import { ONBOARDING_PATH, PROFILE_EDIT_PATH, PROFILE_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { updateProfileAction } from "@/lib/profile/actions";
import { filledFields, profileToValues, todayIso } from "@/lib/profile/fields";
import { ROLE_COPY } from "@/lib/profile/roles";

export const metadata: Metadata = {
  title: "Editar perfil",
};

export default function EditProfilePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        back={{ href: PROFILE_PATH, label: "Meu perfil" }}
        title="Editar perfil"
        description="Atualize seus dados. Campos já preenchidos podem ser alterados, mas não apagados."
      />
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <Suspense fallback={<PageLoading />}>
          <EditProfileForm />
        </Suspense>
      </div>
    </div>
  );
}

async function EditProfileForm() {
  const { account } = await loadCurrentAccount();
  if (!account) return <ApiUnavailable retryHref={PROFILE_EDIT_PATH} />;
  const profile = profileOf(account);
  if (!account.role || !profile) redirect(ONBOARDING_PATH);

  return (
    <ProfileForm
      action={updateProfileAction}
      audience={ROLE_COPY[account.role].audience}
      initialValues={profileToValues(profile)}
      locked={filledFields(profile)}
      submitLabel="Salvar alterações"
      pendingLabel="Salvando…"
      cancelHref={PROFILE_PATH}
      today={todayIso()}
    />
  );
}
