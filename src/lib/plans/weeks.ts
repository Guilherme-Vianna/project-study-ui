const isoFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const shortFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" });

export function isoDate(date: Date) {
  return isoFormat.format(date);
}

export function shiftDate(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekLabel(start: string, end: string) {
  return `${shortFormat.format(new Date(`${start}T00:00:00Z`))} a ${shortFormat.format(new Date(`${end}T00:00:00Z`))}`;
}
