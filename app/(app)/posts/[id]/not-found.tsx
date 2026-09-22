import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PostNotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="type-heading">소식을 찾을 수 없습니다.</h1>
      <p className="type-body-light mt-3 text-text-muted">
        삭제되었거나 주소가 잘못되었습니다.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">피드로 가기</Link>
      </Button>
    </div>
  );
}
