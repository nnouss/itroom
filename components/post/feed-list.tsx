"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PostRow } from "./post-row";
import { Skeleton } from "@/components/ui/skeleton";
import { loadMorePosts } from "@/app/(app)/posts/actions";
import { formatRelative } from "@/lib/format";
import type { FeedCursor, Post } from "@/lib/types";

export function FeedList({
  initialPosts,
  initialCursor,
  isOwner,
  tag,
  serverNow,
}: {
  initialPosts: Post[];
  initialCursor: FeedCursor | null;
  isOwner: boolean;
  tag: string | null;
  /** 서버 렌더 시각. 첫 페이지의 상대 시각을 서버/클라이언트가 같은 기준으로 계산한다. */
  serverNow: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const now = new Date(serverNow);

  const loadMore = useCallback(
    (manual = false) => {
      if (!cursor || inFlight.current) return;
      if (error && !manual) return; // 실패 뒤에는 "다시 시도"로만 재요청한다.
      inFlight.current = true;
      const gen = generation.current;
      startTransition(async () => {
        try {
          const page = await loadMorePosts(cursor, tag);
          if (gen !== generation.current) return; // 오래된 응답은 버린다.
          setPosts((current) => {
            const seen = new Set(current.map((post) => post.id));
            return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
          });
          setCursor(page.nextCursor);
          setError(null);
        } catch {
          if (gen === generation.current) setError("더 불러오지 못했습니다.");
        } finally {
          if (gen === generation.current) inFlight.current = false;
        }
      });
    },
    [cursor, error, tag],
  );

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && loadMore(),
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, error, loadMore]);

  const onDeleted = (id: string) => {
    generation.current += 1;
    inFlight.current = false;
    setPosts((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
          style={{ animationDelay: `${Math.min(index % 10, 9) * 30}ms` }}
        >
          <PostRow
            post={post}
            isOwner={isOwner}
            relativeTime={formatRelative(post.createdAt, now)}
            activeTag={tag}
            afterDelete="none"
            onDeleted={onDeleted}
          />
        </div>
      ))}
      {cursor ? (
        <div ref={sentinel} aria-live="polite" className="space-y-3">
          {!error &&
            [0, 1].map((n) => (
              <div key={n} className="space-y-3 border-y border-hairline-soft bg-canvas px-4 py-4 sm:rounded-2xl sm:border">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-full" />
              </div>
            ))}
          {error && (
            <div className="text-center">
              <p className="type-body-sm text-text-muted">{error}</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => loadMore(true)}
                className="type-caption mt-2 inline-flex h-11 items-center rounded-full px-4 underline underline-offset-4"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      ) : (
        posts.length > 0 && (
          <p className="type-caption py-8 text-center text-text-faint">마지막 소식입니다.</p>
        )
      )}
    </div>
  );
}
