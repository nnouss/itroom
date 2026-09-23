"use client";
import { useTheme } from "next-themes";
import { LogOut, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarMark } from "@/components/ui/avatar-mark";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export function ProfileMenu({
  displayName,
  isOwner,
  side = "bottom",
}: {
  displayName: string;
  isOwner: boolean;
  side?: "bottom" | "right";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="프로필 메뉴"
          className="inline-flex size-11 items-center justify-center rounded-full transition-opacity hover:opacity-85"
        >
          <AvatarMark name={displayName} size={32} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="min-w-56">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <AvatarMark name={displayName} size={36} />
          <span className="min-w-0">
            <span className="type-title block truncate">{displayName}</span>
            <span className="type-caption block text-text-muted">{isOwner ? "소유자" : "회원"}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* 테마 토글: 메뉴를 닫지 않고 바로 바뀐다 */}
        <DropdownMenuItem
          role="menuitemcheckbox"
          aria-checked={dark}
          onSelect={(event) => {
            event.preventDefault();
            setTheme(dark ? "light" : "dark");
          }}
        >
          <Moon />
          <span className="flex-1">다크 모드</span>
          <span
            aria-hidden="true"
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              dark ? "bg-ink" : "bg-hairline",
            )}
          >
            <span
              className={cn(
                "absolute size-4 rounded-full bg-canvas shadow-sm transition-transform",
                dark ? "translate-x-[18px]" : "translate-x-0.5",
              )}
            />
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
            <button type="submit" className="w-full">
              <LogOut />
              로그아웃
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
