import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** 피드의 기본 면. 모바일은 화면 폭을 채우고, sm 이상에서는 둥근 카드. */
export function Card({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-y border-hairline-soft bg-canvas sm:rounded-2xl sm:border", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** 하위 화면 제목 카드: 뒤로 가기 + 제목. 모바일에서는 헤더가 같은 역할을 하므로 숨긴다. */
export function TitleCard({ title, backHref }: { title: string; backHref: string }) {
  return (
    <Card className="hidden h-14 items-center gap-2 px-2 sm:flex">
      <Link
        href={backHref}
        aria-label="뒤로"
        className="inline-flex size-10 items-center justify-center rounded-full text-text-muted hover:bg-canvas-soft hover:text-ink"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="type-title text-[17px]">{title}</h1>
    </Card>
  );
}
