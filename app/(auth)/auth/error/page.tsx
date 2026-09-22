import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function AuthErrorPage() {
  return (
    <div className="space-y-6">
      <h1 className="type-heading">링크가 만료되었거나 잘못되었습니다.</h1>
      <p className="type-body-light text-text-muted">
        초대 메일을 다시 요청하거나 비밀번호 재설정 링크를 새로 받아주세요.
      </p>
      <Button asChild className="w-full">
        <Link href="/login">로그인으로 가기</Link>
      </Button>
    </div>
  );
}
