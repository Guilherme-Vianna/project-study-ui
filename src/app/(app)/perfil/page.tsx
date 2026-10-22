import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { CompleteProfileCard } from "@/components/profile/complete-profile-card";
import { ProfileSummary } from "@/components/profile/profile-summary";
import { Alert } from "@/components/ui/alert";
import { profileOf } from "@/lib/api/account";
import { HOME_PATH, ONBOARDING_PATH, PROFILE_EDIT_PATH, PROFILE_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { ROLE_COPY } from "@/lib/profile/roles";

export const metadata: Metadata = {
  title: "Meu perfil",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageLoading label="Carregando seu perfil…" />}>
      <ProfileView searchParams={searchParams} />
    </Suspense>
  );
}

async function ProfileView({ searchParams }: { searchParams: SearchParams }) {
  const [{ user, account }, params] = await Promise.all([loadCurrentAccount(), searchParams]);
  if (!account) return <ApiUnavailable retryHref={PROFILE_PATH} />;
  const profile = profileOf(account);
  if (!account.role || !profile) redirect(ONBOARDING_PATH);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        back={{ href: HOME_PATH, label: "Início" }}
        eyebrow={`Perfil ${ROLE_COPY[account.role].article}`}
        title="Meu perfil"
        description="Seus dados de cadastro. O e-mail vem da sua conta de login e não pode ser alterado aqui."
        actions={
          <Link
            href={PROFILE_EDIT_PATH}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PencilIcon />
            Editar perfil
          </Link>
        }
      />
      {params.salvo && <Alert tone="success">Alterações salvas.</Alert>}
      <CompleteProfileCard profile={profile} />
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <ProfileSummary profile={profile} email={account.email ?? user.email} />
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" strokeLinejoin="round" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}
