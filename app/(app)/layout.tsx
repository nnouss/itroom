import { NavPill } from "@/components/layout/nav-pill";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavPill />
      <main className="mx-auto w-full max-w-[640px] px-4 pt-20 pb-12 md:px-6">
        {children}
      </main>
    </>
  );
}
