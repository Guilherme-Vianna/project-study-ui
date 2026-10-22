import Link from "next/link";
import type { Profile } from "@/lib/api/profiles";
import { PROFILE_EDIT_PATH } from "@/lib/auth/constants";
import { PROFILE_FIELDS, PROFILE_LABELS } from "@/lib/profile/fields";

export function CompleteProfileCard({ profile }: { profile: Profile }) {
  if (profile.profile_complete) return null;
  const missing = profile.missing_fields.map((field) => PROFILE_LABELS[field].toLowerCase());
  const total = PROFILE_FIELDS.length;
  const done = total - missing.length;

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-accent/40 bg-accent-soft p-6 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="font-semibold text-ink">Complete seu perfil</p>
        <p className="mt-1 text-sm text-ink/80">
          Falta{missing.length > 1 ? "m" : ""}: {new Intl.ListFormat("pt-BR").format(missing)}.
        </p>
        <div className="mt-3 flex max-w-md items-center gap-3">
          <div
            role="progressbar"
            aria-label="Perfil preenchido"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className="h-2 flex-1 rounded-full bg-surface"
          >
            <div className="h-2 rounded-full bg-accent" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="text-sm text-ink/80">
            {done} de {total}
          </span>
        </div>
      </div>
      <Link
        href={PROFILE_EDIT_PATH}
        className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 font-medium text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Completar perfil
      </Link>
    </div>
  );
}
