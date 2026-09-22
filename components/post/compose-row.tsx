import Link from "next/link";
export function ComposeRow({ isOwner }: { isOwner: boolean }) {
  if (!isOwner) return null;
  return (
    <div className="border-b border-hairline-soft">
      <Link
        href="/write"
        className="flex items-center gap-3 rounded-full py-4 md:py-6"
        aria-label="새 소식 작성"
      >
        <span className="type-label flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas-soft">
          잇
        </span>
        <span className="min-w-0 flex-1 text-text-faint">
          새 소식 남기기...
        </span>
        <span
          aria-disabled="true"
          className="type-title flex h-10 items-center rounded-full bg-ink px-4 text-on-ink opacity-[0.38]"
        >
          게시
        </span>
      </Link>
    </div>
  );
}
