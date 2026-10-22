import { AppHeader } from "@/components/app/app-header";
import { SessionRefresher } from "@/components/auth/session-refresher";

export default function AuthenticatedLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <SessionRefresher />
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</main>
    </div>
  );
}
