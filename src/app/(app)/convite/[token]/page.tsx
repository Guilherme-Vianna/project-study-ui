import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PageLoading } from "@/components/app/page-loading";
import { AcceptInviteButton } from "@/components/invites/accept-invite-button";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { personName, previewInvite, type InvitePreview } from "@/lib/api/enrollments";
import { HOME_PATH, STUDENT_SIGNUP_PATH } from "@/lib/auth/constants";
import { loadCurrentAccount } from "@/lib/auth/current-account";
import { invitePath } from "@/lib/invites/links";
import { formatDate } from "@/lib/invites/validity";
import { initialsOf } from "@/lib/people";

export const metadata: Metadata = {
  title: "Convite",
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function InvitePage({ params, searchParams }: InvitePageProps) {
  return (
    <div className="mx-auto w-full max-w-lg pt-4 sm:pt-10">
      <Suspense fallback={<PageLoading label="Abrindo convite…" />}>
        <InviteContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const linkButton =
  "inline-flex h-12 w-full items-center justify-center rounded-full px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

async function InviteContent({ params, searchParams }: InvitePageProps) {
  const [{ token }, query, { account }] = await Promise.all([params, searchParams, loadCurrentAccount()]);

  let preview: InvitePreview;
  try {
    preview = await previewInvite(token);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status === 404) {
      return (
        <InviteProblem title="Convite não encontrado">
          Confira se o link foi copiado inteiro ou peça um novo link ao seu professor.
        </InviteProblem>
      );
    }
    if (status === 410) {
      return (
        <InviteProblem title="Este convite não vale mais">
          O link expirou ou foi desativado pelo professor. Peça um novo link a quem te convidou.
        </InviteProblem>
      );
    }
    return (
      <InviteProblem title="Não conseguimos abrir o convite">
        Verifique sua conexão e{" "}
        <Link href={invitePath(token)} className="font-medium text-primary underline underline-offset-4">
          tente de novo
        </Link>
        .
      </InviteProblem>
    );
  }

  const teacherName = personName(preview.teacher) || "Seu professor";
  const role = account?.role ?? null;

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 text-center sm:p-10">
      {query.perfil === "criado" && (
        <div className="mb-6 text-left">
          <Alert tone="success">Perfil de aluno criado! Agora é só aceitar o convite.</Alert>
        </div>
      )}
      <span
        aria-hidden="true"
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary"
      >
        {initialsOf(teacherName)}
      </span>
      <p className="mt-6 text-sm font-medium text-primary">Convite de professor</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {teacherName} convidou você para ser aluno
      </h1>
      <p className="mt-3 text-muted">
        Ao aceitar, você passa a receber os planos de estudo de quem te convidou e pode acompanhar seu progresso por
        aqui.
        {preview.expires_at && ` Convite válido até ${formatDate(preview.expires_at)}.`}
      </p>

      <div className="mt-8 text-left">
        {role === "student" && <AcceptInviteButton token={token} />}
        {role === null && (
          <div className="flex flex-col gap-3">
            <Link
              href={`${STUDENT_SIGNUP_PATH}?convite=${encodeURIComponent(token)}`}
              className={`${linkButton} bg-primary text-white hover:bg-primary-hover`}
            >
              Criar perfil de aluno e continuar
            </Link>
            <p className="text-center text-sm text-muted">Leva menos de um minuto. Depois você volta para este convite.</p>
          </div>
        )}
        {role === "teacher" && (
          <div className="flex flex-col gap-4">
            <Alert tone="info">
              Este convite é para alunos, e você está conectado com uma conta de professor. Para aceitar, saia e
              entre com a conta do aluno.
            </Alert>
            <Link href={HOME_PATH} className={`${linkButton} border border-border bg-surface text-ink hover:bg-canvas`}>
              Voltar ao início
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteProblem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 text-center sm:p-10">
      <span
        aria-hidden="true"
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent-strong"
      >
        !
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
      <Link
        href={HOME_PATH}
        className={`${linkButton} mt-8 border border-border bg-surface text-ink hover:bg-canvas`}
      >
        Ir para o início
      </Link>
    </div>
  );
}
