export type AuthMode = "signin" | "signup";

export type AuthValues = {
  name: string;
  email: string;
  password: string;
};

export type AuthFieldErrors = Partial<Record<keyof AuthValues, string>>;

export const MIN_PASSWORD_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Digite seu e-mail.";
  if (!EMAIL_PATTERN.test(value)) return "Digite um e-mail válido, como nome@exemplo.com.";
  return undefined;
}

export function validateAuth(mode: AuthMode, values: AuthValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (mode === "signup" && !values.name.trim()) {
    errors.name = "Digite seu nome.";
  }
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) {
    errors.password = "Digite sua senha.";
  } else if (mode === "signup" && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return errors;
}
