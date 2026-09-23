import { SpaceBackdrop } from "@/components/auth/space-backdrop";
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark auth-scene relative min-h-dvh overflow-hidden bg-[#06080e] text-ink">
      <SpaceBackdrop />
      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-12">
        <p className="type-display auth-logo mb-8 text-white">잇룸.</p>
        <section className="auth-glass w-full max-w-[400px] rounded-3xl p-6 sm:p-8">
          {children}
        </section>
      </main>
    </div>
  );
}
