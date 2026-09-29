import { CircleCheck } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { isEnvConfigured } from "@/lib/env";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[] }>;
}) {
  const deleted = (await searchParams).deleted === "1";
  return (
    <>
      <h1 className="sr-only">로그인</h1>
      {deleted && (
        <p role="status" className="type-body-sm mb-6 flex items-start gap-2 text-text-muted">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          탈퇴가 완료되었습니다. 그동안 함께해 주셔서 감사합니다.
        </p>
      )}
      <AuthForm mode="login" configured={isEnvConfigured()} />
    </>
  );
}
