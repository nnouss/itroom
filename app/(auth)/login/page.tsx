import { AuthForm } from "@/components/auth/auth-form";
import { isEnvConfigured } from "@/lib/env";
export default function LoginPage() {
  return (
    <>
      <h1 className="sr-only">로그인</h1>
      <AuthForm mode="login" configured={isEnvConfigured()} />
    </>
  );
}
