"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Home, Pencil } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { ProfileMenu } from "./profile-menu";
import { confirmLeave } from "@/lib/leave-guard";
import { cn } from "@/lib/utils";

function Tab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={(event) => {
        if (!active && !confirmLeave()) event.preventDefault();
      }}
      className={cn(
        "relative flex w-14 items-center justify-center sm:w-24",
        active ? "text-ink" : "text-text-faint hover:text-text-muted",
      )}
    >
      <span className="flex h-11 w-full items-center justify-center rounded-xl transition-colors hover:bg-canvas-soft">
        {children}
      </span>
      {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-ink" />}
    </Link>
  );
}

/** 하위 화면의 모바일 헤더 제목과 뒤로 갈 곳 */
function subPage(path: string): { title: string; back: string } | null {
  if (path === "/write") return { title: "새 소식", back: "/" };
  if (path === "/me") return { title: "내 소식", back: "/" };
  if (path === "/account") return { title: "내 정보", back: "/" };
  const edit = path.match(/^\/posts\/([^/]+)\/edit$/);
  if (edit) return { title: "소식 수정", back: `/posts/${edit[1]}` };
  if (/^\/posts\/[^/]+$/.test(path)) return { title: "소식", back: "/" };
  return null;
}

/**
 * 상단 고정 헤더. 안쪽 폭은 피드 카드와 같다.
 * - 640px 이상: 워드마크 | 홈·쓰기 탭 | 테마·프로필
 * - 640px 미만: 워드마크 | 홈·쓰기 탭(좁은 폭) | 프로필(테마 토글은 메뉴 안)
 *   하위 화면(쓰기, 글 상세·수정, 내 소식, 내 정보)은 ← + 제목 | (탭 없음) | 프로필
 * 내 소식·내 정보는 탭이 아니라 프로필 메뉴에서 들어간다(모든 폭 같은 자리).
 */
export function AppHeader({ displayName, isOwner }: { displayName: string; isOwner: boolean }) {
  const path = usePathname();
  const home = path === "/";
  const writing = path === "/write";
  const sub = subPage(path);
  return (
    <header className="sticky top-0 z-30 border-b border-hairline-soft bg-canvas">
      <div
        className={cn(
          "mx-auto grid h-14 max-w-[680px] items-center px-4 sm:grid-cols-[1fr_auto_1fr]",
          // 모바일 하위 화면은 탭을 숨기므로 두 칸(제목 | 프로필)으로 나눈다.
          sub ? "grid-cols-[1fr_auto]" : "grid-cols-[1fr_auto_1fr]",
        )}
      >
        <div className="flex min-w-0 items-center justify-self-start">
          {sub && (
            <Link
              href={sub.back}
              aria-label="뒤로"
              onClick={(event) => {
                if (!confirmLeave()) event.preventDefault();
              }}
              className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-canvas-soft sm:hidden"
            >
              <ArrowLeft className="size-[22px]" />
            </Link>
          )}
          {sub && <span className="type-title ml-1 truncate text-[17px] sm:hidden">{sub.title}</span>}
          <Link
            href="/"
            aria-label="잇룸 홈"
            onClick={(event) => {
              if (!home && !confirmLeave()) event.preventDefault();
            }}
            className={cn("type-title text-[20px] font-semibold", sub && "hidden sm:inline")}
          >
            잇룸
          </Link>
        </div>

        <nav aria-label="주 메뉴" className={cn("flex h-14 items-stretch", sub && "hidden sm:flex")}>
          <Tab href="/" label="홈" active={home}>
            <Home className="size-6" strokeWidth={home ? 2.4 : 1.8} />
          </Tab>
          <Tab href="/write" label="새 소식 쓰기" active={writing}>
            <Pencil className="size-[22px]" strokeWidth={writing ? 2.4 : 1.8} />
          </Tab>
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <span className="hidden size-10 items-center justify-center rounded-full bg-canvas-soft sm:inline-flex [&>button]:size-10">
            <ThemeToggle />
          </span>
          {/* 버튼 안쪽 여백만큼 당겨서 아바타 오른쪽 끝을 카드 끝에 맞춘다 */}
          <span className="-mr-1.5">
            <ProfileMenu displayName={displayName} isOwner={isOwner} />
          </span>
        </div>
      </div>
    </header>
  );
}
