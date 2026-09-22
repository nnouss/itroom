import { AuthForm } from "@/components/auth/auth-form";
import { PasswordPage } from "@/components/auth/password-page";
import { isEnvConfigured } from "@/lib/env";
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if ((await searchParams).mode !== "request")
    return <PasswordPage title="새 비밀번호를 입력해주세요." />;
  return (
    <>
      <h1 className="type-heading mb-4">비밀번호를 잊으셨나요?</h1>
      <p className="type-body-light mb-6 text-text-muted">
        초대받은 이메일로 재설정 링크를 보내드립니다.
      </p>
      <AuthForm mode="request" configured={isEnvConfigured()} />
    </>
  );
}
