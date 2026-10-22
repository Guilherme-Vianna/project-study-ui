import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { StudyPreview } from "@/components/auth/study-preview";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-8 lg:py-8">
      <header>
        <Logo />
      </header>

      <main className="grid flex-1 items-start gap-12 py-10 lg:items-center lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
        <section aria-labelledby="login-title" className="w-full max-w-md">
          <h1 id="login-title" className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Bem-vindo ao Project Study
          </h1>
          <p className="mt-2 text-2xl font-medium tracking-tight text-muted sm:text-3xl">
            Seu plano de estudos, sempre em dia
          </p>
          <div className="mt-10">
            <LoginForm />
          </div>
        </section>

        <div className="hidden h-full py-4 lg:block">
          <StudyPreview />
        </div>
      </main>
    </div>
  );
}
