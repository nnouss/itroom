"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
export default function LoginPage() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 space-y-4 text-center">
        <h1 className="type-display">잇룸.</h1>
        <p className="type-body-light text-text-muted">
          초대받은 사람만 들어올 수 있습니다.
        </p>
      </div>
      <section
        aria-label="로그인"
        className="w-full max-w-[400px] rounded-3xl border-hairline-soft p-4 sm:border sm:p-8"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                className="pr-12"
                required
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
          <Button type="submit" className="w-full">
            로그인
          </Button>
          <div className="text-center">
            <Link href="/reset-password" className="type-caption rounded-full text-text-muted underline underline-offset-4">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
