import type { Profile } from "@/lib/api/profiles";
import { formatMobilePhone, formatPostalCode, PROFILE_LABELS } from "@/lib/profile/fields";

export function ProfileSummary({ profile, email }: { profile: Profile; email: string | null }) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const birthDate = profile.birth_date
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(profile.birth_date))
    : null;
  const rows = [
    { label: "Nome", value: fullName || null },
    { label: "E-mail", value: email },
    { label: PROFILE_LABELS.mobile_phone, value: profile.mobile_phone ? formatMobilePhone(profile.mobile_phone) : null },
    { label: PROFILE_LABELS.birth_date, value: birthDate },
    { label: PROFILE_LABELS.postal_code, value: profile.postal_code ? formatPostalCode(profile.postal_code) : null },
  ];

  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-sm text-muted">{row.label}</dt>
          <dd className={`mt-1 font-medium ${row.value ? "text-ink" : "text-muted"}`}>{row.value ?? "Não informado"}</dd>
        </div>
      ))}
    </dl>
  );
}
