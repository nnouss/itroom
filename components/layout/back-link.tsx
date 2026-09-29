"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { goBack } from "@/lib/back-nav";
import { confirmLeave } from "@/lib/leave-guard";

/** 뒤로 버튼. 들어온 앱 화면으로 돌아가고, 없으면 fallback으로 간다. 에디터 이탈 확인을 거친다. */
export function BackLink({
  fallback,
  className,
  children,
}: {
  fallback: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      aria-label="뒤로"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        if (confirmLeave()) goBack(router, fallback);
      }}
    >
      {children}
    </Link>
  );
}
