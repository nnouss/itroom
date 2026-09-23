import { AppHeader } from "@/components/layout/app-header";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();
  return (
    <div className="app-shell min-h-dvh bg-page">
      <AppHeader displayName={profile.displayName} isOwner={profile.role === "owner"} />
      <main className="mx-auto w-full max-w-[680px] space-y-3 py-3 sm:px-4 sm:py-5">{children}</main>
    </div>
  );
}
