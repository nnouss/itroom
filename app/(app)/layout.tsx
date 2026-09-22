import { NavPill } from "@/components/layout/nav-pill";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();
  return (
    <>
      <NavPill
        displayName={profile.displayName}
        isOwner={profile.role === "owner"}
      />
      <main className="mx-auto w-full max-w-[640px] px-4 pt-20 pb-12 md:px-6">
        {children}
      </main>
    </>
  );
}
