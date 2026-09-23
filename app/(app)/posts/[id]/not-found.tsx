import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, TitleCard } from "@/components/layout/card";

export default function PostNotFound() {
  return (
    <>
      <TitleCard title="소식" backHref="/" />
      <Card className="px-6 py-20 text-center">
        <p className="type-title text-[17px]">소식을 찾을 수 없습니다</p>
        <p className="type-body-sm mt-2 text-text-muted">삭제되었거나 주소가 잘못되었습니다.</p>
        <Button asChild className="mt-6">
          <Link href="/">피드로 가기</Link>
        </Button>
      </Card>
    </>
  );
}
