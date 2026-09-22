"use client";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/(auth)/actions";
export function NavPill({
  displayName,
  isOwner,
}: {
  displayName: string;
  isOwner: boolean;
}) {
  return (
    <header className="sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center justify-between rounded-full bg-canvas-soft py-2 pr-2 pl-6 md:mx-auto md:max-w-[640px]">
      <Link
        href="/"
        className="type-title rounded-full font-[650]"
        aria-label="잇룸 홈"
      >
        잇룸.
      </Link>
      <nav aria-label="사용자 메뉴" className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="type-label flex size-8 items-center justify-center rounded-full bg-ink text-on-ink"
              aria-label="프로필 메뉴"
            >
              {Array.from(displayName)[0] || "회"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="max-w-64 break-words">
              {displayName}
              <p className="type-caption mt-1 text-text-muted">
                {isOwner ? "소유자" : "회원"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem
                asChild
                onSelect={(event) => event.preventDefault()}
              >
                <button type="submit" className="w-full">
                  <LogOut />
                  로그아웃
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
}
