import Link from "next/link";
import { X } from "lucide-react";
import { ComposeRow } from "@/components/post/compose-row";
import { FeedList } from "@/components/post/feed-list";
import { requireUser } from "@/lib/auth";
import { fetchFeedPage } from "@/lib/posts";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const { profile } = await requireUser();
  const isOwner = profile.role === "owner";
  const raw = (await searchParams).tag;
  const tag = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 40) || null;
  const page = await fetchFeedPage({ tag });
  return (
    <>
      <h1 className="sr-only">잇룸 소식 피드</h1>
      {tag ? (
        <div className="flex items-center gap-3 border-b border-hairline-soft py-4">
          <span className="type-label inline-flex h-7 min-w-0 max-w-[60%] items-center rounded-full bg-ink px-3 text-on-ink">
            <span className="truncate">{tag}</span>
          </span>
          <span className="type-body-sm shrink-0 text-text-muted">태그로 보는 중</span>
          <Link
            href="/"
            aria-label="태그 필터 해제"
            className="ml-auto inline-flex size-10 items-center justify-center rounded-full hover:bg-canvas-soft"
          >
            <X className="size-4" />
          </Link>
        </div>
      ) : (
        <ComposeRow isOwner={isOwner} />
      )}
      {page.posts.length === 0 && (
        <div className="py-20 text-center">
          <p className="type-heading">
            {tag ? "이 태그의 소식이 없습니다." : "아직 소식이 없습니다."}
          </p>
          <p className="type-body-light mt-3 text-text-muted">
            {tag
              ? "다른 태그를 눌러보거나 전체 피드로 돌아가세요."
              : isOwner
                ? "위의 입력란에서 첫 소식을 남겨보세요."
                : "소유자가 첫 소식을 올리면 여기에 보입니다."}
          </p>
        </div>
      )}
      <FeedList
        key={tag ?? ""}
        initialPosts={page.posts}
        initialCursor={page.nextCursor}
        isOwner={isOwner}
        tag={tag}
        serverNow={new Date().toISOString()}
      />
    </>
  );
}
