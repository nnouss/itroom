import Link from "next/link";
import { Newspaper, X } from "lucide-react";
import { ComposeRow } from "@/components/post/compose-row";
import { FeedList } from "@/components/post/feed-list";
import { Card } from "@/components/layout/card";
import { requireUser } from "@/lib/auth";
import { fetchFeedPage } from "@/lib/posts";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const { profile } = await requireUser();
  const raw = (await searchParams).tag;
  const tag = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 40) || null;
  const page = await fetchFeedPage({ tag });
  return (
    <>
      <h1 className="sr-only">{tag ? `#${tag} 소식` : "잇룸 소식 피드"}</h1>
      {tag ? (
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="type-title min-w-0 truncate text-[17px]">#{tag}</span>
          <span className="type-body-sm shrink-0 text-text-muted">태그로 보는 중</span>
          <Link
            href="/"
            aria-label="태그 필터 해제"
            className="type-label ml-auto inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-canvas-soft pr-3 pl-2.5 text-text-muted hover:text-ink"
          >
            <X className="size-3.5" />
            필터 해제
          </Link>
        </Card>
      ) : (
        <ComposeRow displayName={profile.displayName} />
      )}
      {page.posts.length === 0 && (
        <Card className="flex flex-col items-center px-6 py-20 text-center">
          <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-canvas-soft text-text-muted">
            <Newspaper className="size-6" />
          </span>
          <p className="type-title text-[17px]">
            {tag ? "이 태그의 소식이 없습니다" : "아직 소식이 없습니다"}
          </p>
          <p className="type-body-sm mt-2 text-text-muted">
            {tag ? "다른 태그를 눌러보거나 전체 피드로 돌아가세요." : "위에서 첫 소식을 남겨보세요."}
          </p>
        </Card>
      )}
      <FeedList
        key={tag ?? ""}
        initialPosts={page.posts}
        initialCursor={page.nextCursor}
        viewer={{ id: profile.id, isOwner: profile.role === "owner" }}
        filter={{ tag, mine: false }}
        serverNow={new Date().toISOString()}
      />
    </>
  );
}
