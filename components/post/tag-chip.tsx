import Link from "next/link";
import { cn } from "@/lib/utils";
export function TagChip({
  tag,
  active = false,
}: {
  tag: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`/?tag=${encodeURIComponent(tag)}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "type-label inline-flex h-7 max-w-full items-center truncate rounded-full px-3 transition-opacity active:opacity-80",
        active ? "bg-ink text-on-ink" : "bg-canvas-soft text-text-muted",
      )}
    >
      {tag}
    </Link>
  );
}
