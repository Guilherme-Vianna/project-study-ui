import type { Metadata } from "next";
import { RoleSignup } from "@/components/profile/role-signup";

export const metadata: Metadata = {
  title: "Perfil de professor",
};

export default function TeacherSignupPage({ searchParams }: PageProps<"/cadastro/professor">) {
  return <RoleSignup role="teacher" searchParams={searchParams} />;
}
