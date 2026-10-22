export const INVITE_VALIDITY_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "never", label: "Sem prazo" },
] as const;

export type InviteValidity = (typeof INVITE_VALIDITY_OPTIONS)[number]["value"];

export const DEFAULT_INVITE_VALIDITY: InviteValidity = "7";

export function expiresAtFor(validity: unknown, now = new Date()): string | null | undefined {
  if (validity === "never") return null;
  if (validity !== "7" && validity !== "30") return undefined;
  return new Date(now.getTime() + Number(validity) * 24 * 60 * 60 * 1000).toISOString();
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}
