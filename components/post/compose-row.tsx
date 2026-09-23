import Link from "next/link";
import { Hash, ImagePlus, Link2 } from "lucide-react";
import { Card } from "@/components/layout/card";

/** 글 작성칸 (Facebook 구성): 입력창 모양 버튼 + 빠른 동작 줄. 모두 작성 화면으로 연결된다. */
export function ComposeRow({ isOwner, displayName }: { isOwner: boolean; displayName: string }) {
  if (!isOwner) return null;
  const quick = [
    { icon: ImagePlus, label: "사진", tint: "text-tint-photo" },
    { icon: Link2, label: "링크", tint: "text-tint-link" },
    { icon: Hash, label: "태그", tint: "text-tint-tag" },
  ];
  return (
    <Card className="px-4 pt-3 pb-1.5">
      <h2 className="sr-only">새 소식 작성</h2>
      <div className="pb-3">
        <Link
          href="/write"
          className="flex h-10 w-full items-center rounded-full bg-canvas-soft px-4 text-[15px] text-text-muted transition-colors hover:bg-field"
        >
          {displayName}님, 새 소식이 있나요?
        </Link>
      </div>
      <div className="grid grid-cols-3 border-t border-hairline-soft pt-1.5">
        {quick.map(({ icon: Icon, label, tint }) => (
          <Link
            key={label}
            href="/write"
            className="type-title flex h-10 items-center justify-center gap-2 rounded-xl text-[14px] text-text-muted transition-colors hover:bg-canvas-soft"
          >
            <Icon className={`size-5 ${tint}`} strokeWidth={2} />
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
