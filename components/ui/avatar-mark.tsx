import { cn } from "@/lib/utils";

/** 노을 그라데이션 원형 아바타. 이미지 없이 이름 첫 글자만 쓴다. */
export function AvatarMark({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: 28 | 32 | 36 | 40;
  className?: string;
}) {
  const initial = Array.from(name.trim())[0] ?? "잇";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "avatar-sunset inline-flex shrink-0 items-center justify-center rounded-full font-[650] text-white",
        size === 28 && "size-7 text-[11px]",
        size === 32 && "size-8 text-xs",
        size === 36 && "size-9 text-[13px]",
        size === 40 && "size-10 text-sm",
        className,
      )}
    >
      {initial.toUpperCase()}
    </span>
  );
}
