export const dynamic = "force-dynamic";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 space-y-4 text-center">
        <p className="type-display">잇룸.</p>
        <p className="type-body-light text-text-muted">
          초대받은 사람만 들어올 수 있습니다.
        </p>
      </div>
      <section className="w-full max-w-[400px] rounded-3xl border-hairline-soft p-4 sm:border sm:p-8">
        {children}
      </section>
    </main>
  );
}
