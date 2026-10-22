import type { Metadata } from "next";
import { RoleSignup } from "@/components/profile/role-signup";

export const metadata: Metadata = {
  title: "Perfil de aluno",
};

export default function StudentSignupPage({ searchParams }: PageProps<"/cadastro/aluno">) {
  return <RoleSignup role="student" searchParams={searchParams} />;
}
