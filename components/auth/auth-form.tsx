"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import {
  signIn,
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ENV_MISSING_MESSAGE } from "@/lib/env";
type Mode = "login" | "request" | "password";
const actions = {
  login: signIn,
  request: requestPasswordReset,
  password: updatePassword,
};
export function AuthForm({
  mode,
  configured,
  next,
}: {
  mode: Mode;
  configured: boolean;
  /** 로그인 뒤 돌아갈 앱 안 경로 */
  next?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_previous: AuthState, data: FormData) => actions[mode](data),
    {},
  );
  const error = !configured ? ENV_MISSING_MESSAGE : state.error;
  const label =
    mode === "login"
      ? "로그인"
      : mode === "request"
        ? "재설정 메일 보내기"
        : "비밀번호 저장";
  return (
    <form action={formAction} className="space-y-6" aria-busy={pending}>
      {mode === "login" && next && <input type="hidden" name="next" value={next} />}
      {mode !== "password" && (
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            disabled={pending}
            aria-describedby={error ? "auth-feedback" : undefined}
          />
        </div>
      )}
      {mode !== "request" && (
        <div className="space-y-2">
          <Label htmlFor="password">
            {mode === "password" ? "새 비밀번호" : "비밀번호"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete={
                mode === "password" ? "new-password" : "current-password"
              }
              placeholder={
                mode === "password"
                  ? "8자 이상 입력하세요"
                  : "비밀번호를 입력하세요"
              }
              minLength={mode === "password" ? 8 : undefined}
              required
              className="pr-12"
              disabled={pending}
              aria-describedby={error ? "auth-feedback" : undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0.5 right-1"
              aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p
          id="auth-feedback"
          role="alert"
          className="type-body-sm flex items-start gap-2 text-text-muted"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="type-body-sm flex items-start gap-2 text-text-muted"
        >
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.success}
        </p>
      )}
      <Button
        type="submit"
        className="relative w-full"
        disabled={pending || !configured}
      >
        {pending && (
          <Loader2
            aria-hidden="true"
            className="absolute left-4 animate-spin"
          />
        )}
        {label}
      </Button>
      <div className="text-center">
        <Link
          href={mode === "login" ? "/reset-password?mode=request" : "/login"}
          className="type-caption rounded-full text-text-muted underline underline-offset-4"
        >
          {mode === "login" ? "비밀번호를 잊으셨나요?" : "로그인으로 돌아가기"}
        </Link>
      </div>
    </form>
  );
}
