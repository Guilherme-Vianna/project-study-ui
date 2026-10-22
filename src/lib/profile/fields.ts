export const PROFILE_FIELDS = ["first_name", "last_name", "birth_date", "postal_code", "mobile_phone"] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileValues = Record<ProfileField, string>;
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;
export type ProfilePayload = Partial<Record<ProfileField, string>>;

export const PROFILE_LABELS: Record<ProfileField, string> = {
  first_name: "Nome",
  last_name: "Sobrenome",
  birth_date: "Data de nascimento",
  postal_code: "CEP",
  mobile_phone: "Celular",
};

export const REQUIRED_FIELDS: readonly ProfileField[] = ["first_name", "last_name"];

export const MIN_BIRTH_DATE = "1900-01-01";
const FIRST_NAME_MAX = 100;
const LAST_NAME_MAX = 150;

const invalidMessages: Record<ProfileField, string> = {
  first_name: "Digite seu nome.",
  last_name: "Digite seu sobrenome.",
  birth_date: "Digite uma data válida.",
  postal_code: "O CEP precisa ter 8 dígitos, como 01310-100.",
  mobile_phone: "Digite um celular com DDD, como (11) 98765-4321.",
};

export const EMPTY_PROFILE: ProfileValues = {
  first_name: "",
  last_name: "",
  birth_date: "",
  postal_code: "",
  mobile_phone: "",
};

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatPostalCode(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function formatMobilePhone(value: string) {
  let digits = digitsOnly(value);
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function todayIso(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function validateBirthDate(value: string, today: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    return invalidMessages.birth_date;
  }
  if (value > today) return "A data de nascimento não pode estar no futuro.";
  if (value < MIN_BIRTH_DATE) return "Confira o ano: a data precisa ser depois de 1900.";
  return undefined;
}

export function validateProfile(
  values: ProfileValues,
  { locked = [], today = todayIso() }: { locked?: readonly ProfileField[]; today?: string } = {},
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const firstName = values.first_name.trim();
  const lastName = values.last_name.trim();
  const postalCode = digitsOnly(values.postal_code);
  const phone = digitsOnly(values.mobile_phone);

  if (!firstName) errors.first_name = invalidMessages.first_name;
  else if (firstName.length > FIRST_NAME_MAX) errors.first_name = `Use até ${FIRST_NAME_MAX} caracteres.`;

  if (!lastName) errors.last_name = invalidMessages.last_name;
  else if (lastName.length > LAST_NAME_MAX) errors.last_name = `Use até ${LAST_NAME_MAX} caracteres.`;

  if (values.birth_date) {
    const error = validateBirthDate(values.birth_date, today);
    if (error) errors.birth_date = error;
  }
  if (postalCode && postalCode.length !== 8) errors.postal_code = invalidMessages.postal_code;
  if (phone && !/^[1-9][1-9]9\d{8}$/.test(phone)) errors.mobile_phone = invalidMessages.mobile_phone;

  for (const field of locked) {
    if (!errors[field] && !values[field].trim()) {
      errors[field] = "Este dado já foi salvo e não pode ficar em branco.";
    }
  }
  return errors;
}

export function toPayload(values: ProfileValues): ProfilePayload {
  const payload: ProfilePayload = {};
  const first = values.first_name.trim();
  const last = values.last_name.trim();
  if (first) payload.first_name = first;
  if (last) payload.last_name = last;
  if (values.birth_date) payload.birth_date = values.birth_date;
  if (digitsOnly(values.postal_code)) payload.postal_code = digitsOnly(values.postal_code);
  if (digitsOnly(values.mobile_phone)) payload.mobile_phone = digitsOnly(values.mobile_phone);
  return payload;
}

export function readProfileForm(formData: FormData): ProfileValues {
  const read = (field: ProfileField) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    first_name: read("first_name"),
    last_name: read("last_name"),
    birth_date: read("birth_date"),
    postal_code: read("postal_code"),
    mobile_phone: read("mobile_phone"),
  };
}

export function profileToValues(profile: Partial<Record<ProfileField, string | null>>): ProfileValues {
  return {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    birth_date: profile.birth_date ?? "",
    postal_code: formatPostalCode(profile.postal_code ?? ""),
    mobile_phone: formatMobilePhone(profile.mobile_phone ?? ""),
  };
}

export function filledFields(profile: Partial<Record<ProfileField, string | null>>): ProfileField[] {
  return PROFILE_FIELDS.filter((field) => Boolean(profile[field]));
}

export function fieldErrorsFromIssues(
  issues: { loc: (string | number)[] }[],
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  for (const issue of issues) {
    const field = issue.loc.find((part): part is ProfileField =>
      PROFILE_FIELDS.includes(part as ProfileField),
    );
    if (field) errors[field] = invalidMessages[field];
  }
  return errors;
}

export function splitDisplayName(name: string | null | undefined) {
  const [first = "", ...rest] = (name ?? "").trim().split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
}
