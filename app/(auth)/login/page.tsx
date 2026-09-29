import { CircleCheck } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { isEnvConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/auth-redirect";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const deleted = params.deleted === "1";
  // 로그인 뒤 돌아갈 화면(공유받은 글 등). 앱 안 경로만 허용한다.
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  return (
    <>
      <h1 className="sr-only">로그인</h1>
      {deleted && (
        <p role="status" className="type-body-sm mb-6 flex items-start gap-2 text-text-muted">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          탈퇴가 완료되었습니다. 그동안 함께해 주셔서 감사합니다.
        </p>
      )}
      <AuthForm mode="login" configured={isEnvConfigured()} next={next === "/" ? undefined : next} />
    </>
  );
}
