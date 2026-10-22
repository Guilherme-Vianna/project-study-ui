import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiUnavailable } from "@/components/app/api-unavailable";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-loading";
import { InviteCreator } from "@/components/invites/invite-creator";
import { InviteList, type InviteItem } from "@/components/invites/invite-list";
import type { StudentItem } from "@/components/students/student-filters";
import { StudentList } from "@/components/students/student-list";
import { listMyInvites, listMyStudents, personName, type Invite } from "@/lib/api/enrollments";
import type { Profile } from "@/lib/api/profiles";
import { HOME_PATH, INVITE_PATH, ONBOARDING_PATH, STUDENTS_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { appOrigin, invitePath } from "@/lib/invites/links";
import { formatDate } from "@/lib/invites/validity";
import { formatMobilePhone } from "@/lib/profile/fields";

export const metadata: Metadata = {
  title: "Alunos",
};

export default function StudentsPage() {
  return (
    <>
      <PageHeader
        title="Alunos"
        description="Convide alunos por link, encontre quem já está na turma e gerencie o acesso."
      />
      <Suspense fallback={<PageLoading label="Carregando sua turma…" />}>
        <StudentsContent />
      </Suspense>
    </>
  );
}

function toStudentItem(student: Profile): StudentItem {
  const phone = student.mobile_phone ? formatMobilePhone(student.mobile_phone) : null;
  return {
    id: student.id,
    name: personName(student) || "Aluno sem nome",
    phone,
    phoneHref: student.mobile_phone ? `tel:${student.mobile_phone}` : null,
    complete: student.profile_complete,
  };
}

function toInviteItem(invite: Invite, origin: string): InviteItem {
  const expired = !invite.revoked_at && !invite.is_active;
  return {
    id: invite.id,
    link: `${origin}${invitePath(invite.token)}`,
    createdLabel: formatDate(invite.created_at),
    expiresLabel: invite.expires_at ? formatDate(invite.expires_at) : null,
    inactiveReason: invite.revoked_at
      ? `desativado em ${formatDate(invite.revoked_at)}`
      : expired && invite.expires_at
        ? `expirou em ${formatDate(invite.expires_at)}`
        : null,
  };
}

async function StudentsContent() {
  const { account } = await loadCurrentAccount();
  if (!account) return <ApiUnavailable retryHref={STUDENTS_PATH} />;
  if (!account.role) redirect(ONBOARDING_PATH);
  if (account.role !== "teacher") redirect(HOME_PATH);

  let data;
  try {
    data = await Promise.all([listMyStudents(), listMyInvites(), appOrigin()]);
  } catch {
    return <ApiUnavailable retryHref={STUDENTS_PATH} />;
  }
  const [students, invites, origin] = data;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="class-title" className="flex flex-col gap-4">
        <h2 id="class-title" className="text-xl font-semibold text-ink">
          Sua turma
        </h2>
        <StudentList students={students.map(toStudentItem)} />
      </section>

      <section
        aria-labelledby="invite-title"
        className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-6 lg:sticky lg:top-24"
      >
        <div>
          <h2 id="invite-title" className="text-xl font-semibold text-ink">
            Convidar alunos
          </h2>
          <p className="mt-1 text-sm text-muted">
            Envie o link por WhatsApp ou e-mail. O aluno entra, cria o perfil e confirma.
          </p>
        </div>
        <InviteCreator origin={origin} invitePathPrefix={INVITE_PATH} />
        <InviteList invites={invites.map((invite) => toInviteItem(invite, origin))} />
      </section>
    </div>
  );
}
