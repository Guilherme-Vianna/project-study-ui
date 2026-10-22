"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/ui/text-field";
import { HOME_PATH, NEXT_PARAM } from "@/lib/auth/constants";
import { safeNextPath } from "@/lib/auth/next-path";
import { createServerSession } from "@/lib/auth/client-session";
import { authErrorMessage, GENERIC_AUTH_ERROR } from "@/lib/auth/errors";
import { createGoogleProvider, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { GoogleIcon } from "./google-icon";
import {
  MIN_PASSWORD_LENGTH,
  validateAuth,
  validateEmail,
  type AuthFieldErrors,
  type AuthMode,
  type AuthValues,
} from "./validation";

function destinationAfterLogin() {
  return safeNextPath(new URLSearchParams(window.location.search).get(NEXT_PARAM)) ?? HOME_PATH;
}

type Status = "restoring" | "idle" | "google" | "email" | "reset" | "redirecting";

const copy = {
  signin: {
    submit: "Entrar com e-mail",
    submitting: "Entrando…",
    switchPrompt: "Ainda não tem conta?",
    switchAction: "Criar conta",
  },
  signup: {
    submit: "Criar conta",
    submitting: "Criando sua conta…",
    switchPrompt: "Já tem uma conta?",
    switchAction: "Entrar",
  },
} as const;

export function LoginForm() {
  const router = useRouter();
  const configured = isFirebaseConfigured();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [status, setStatus] = useState<Status>(configured ? "restoring" : "idle");
  const [values, setValues] = useState<AuthValues>({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const busy = status !== "idle";

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        setStatus("idle");
        return;
      }
      try {
        await createServerSession(user, true);
        setStatus("redirecting");
        router.replace(destinationAfterLogin());
      } catch {
        await signOut(auth);
        setStatus("idle");
      }
    });
    return unsubscribe;
  }, [configured, router]);

  async function finishSignIn(user: User) {
    await createServerSession(user, true);
    setStatus("redirecting");
    router.replace(destinationAfterLogin());
  }

  function updateValue(field: keyof AuthValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function switchMode() {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
  }

  function focusFirstInvalid(errors: AuthFieldErrors) {
    if (errors.name) nameRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  }

  async function handleGoogle() {
    setFormError(null);
    setNotice(null);
    setStatus("google");
    try {
      const { user } = await signInWithPopup(getFirebaseAuth(), createGoogleProvider());
      await finishSignIn(user);
    } catch (error) {
      setFormError(authErrorMessage(error));
      setStatus("idle");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    const errors = validateAuth(mode, values);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      focusFirstInvalid(errors);
      return;
    }

    setStatus("email");
    const auth = getFirebaseAuth();
    const email = values.email.trim();
    try {
      if (mode === "signup") {
        const { user } = await createUserWithEmailAndPassword(auth, email, values.password);
        await updateProfile(user, { displayName: values.name.trim() });
        await finishSignIn(user);
      } else {
        const { user } = await signInWithEmailAndPassword(auth, email, values.password);
        await finishSignIn(user);
      }
    } catch (error) {
      setFormError(authErrorMessage(error) ?? GENERIC_AUTH_ERROR);
      setStatus("idle");
    }
  }

  async function handlePasswordReset() {
    setFormError(null);
    setNotice(null);
    const emailError = validateEmail(values.email);
    if (emailError) {
      setFieldErrors({
        email: values.email.trim() ? emailError : "Digite seu e-mail para receber o link de redefinição.",
      });
      emailRef.current?.focus();
      return;
    }
    setStatus("reset");
    try {
      const email = values.email.trim();
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setNotice(`Se existir uma conta para ${email}, enviamos um link para redefinir a senha. Confira também o spam.`);
    } catch (error) {
      setFormError(authErrorMessage(error) ?? GENERIC_AUTH_ERROR);
    } finally {
      setStatus("idle");
    }
  }

  if (!configured) {
    return (
      <Alert tone="error">
        O login ainda não está configurado. Preencha as variáveis <code>NEXT_PUBLIC_FIREBASE_*</code> no arquivo{" "}
        <code>.env.local</code> e reinicie o servidor.
      </Alert>
    );
  }

  if (status === "restoring" || status === "redirecting") {
    return (
      <div role="status" className="flex items-center gap-3 text-muted">
        <Spinner />
        <span>{status === "restoring" ? "Verificando sua sessão…" : "Tudo certo! Abrindo sua área…"}</span>
      </div>
    );
  }

  const text = copy[mode];

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="secondary"
        className="w-full sm:w-auto sm:self-start"
        icon={<GoogleIcon />}
        loading={status === "google"}
        loadingLabel="Aguardando o Google…"
        disabled={busy}
        onClick={handleGoogle}
      >
        Continuar com Google
      </Button>

      <div className="flex items-center gap-4 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label={text.submit}>
        {formError && <Alert tone="error">{formError}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        {mode === "signup" && (
          <TextField
            ref={nameRef}
            label="Nome"
            name="name"
            autoComplete="name"
            placeholder="Como você quer ser chamado"
            value={values.name}
            error={fieldErrors.name}
            disabled={busy}
            onChange={(event) => updateValue("name", event.target.value)}
          />
        )}

        <TextField
          ref={emailRef}
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nome@exemplo.com"
          value={values.email}
          error={fieldErrors.email}
          disabled={busy}
          onChange={(event) => updateValue("email", event.target.value)}
        />

        <TextField
          ref={passwordRef}
          label="Senha"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={values.password}
          hint={mode === "signup" ? `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` : undefined}
          error={fieldErrors.password}
          disabled={busy}
          onChange={(event) => updateValue("password", event.target.value)}
          labelAction={
            mode === "signin" && (
              <Button variant="link" className="text-sm" disabled={busy} onClick={handlePasswordReset}>
                {status === "reset" ? "Enviando link…" : "Esqueceu a senha?"}
              </Button>
            )
          }
          trailing={
            <button
              type="button"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((current) => !current)}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              <EyeIcon open={showPassword} />
            </button>
          }
        />

        <Button type="submit" className="mt-2" loading={status === "email"} loadingLabel={text.submitting} disabled={busy}>
          {text.submit}
        </Button>
      </form>

      <p className="text-sm text-muted">
        {text.switchPrompt}{" "}
        <Button variant="link" disabled={busy} onClick={switchMode}>
          {text.switchAction}
        </Button>
      </p>
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {open && <path d="M3 3l18 18" strokeLinecap="round" />}
    </svg>
  );
}
