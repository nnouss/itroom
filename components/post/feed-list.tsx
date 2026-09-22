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
}: {
  initialPosts: Post[];
  initialCursor: FeedCursor | null;
  isOwner: boolean;
  tag: string | null;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  // 서버가 첫 페이지를 다시 보내면(router.refresh) 렌더 중에 상태를 맞춘다.
  const [syncedInitial, setSyncedInitial] = useState(initialPosts);
  if (syncedInitial !== initialPosts) {
    setSyncedInitial(initialPosts);
    setPosts(initialPosts);
    setCursor(initialCursor);
  }

  const loadMore = useCallback(() => {
    if (!cursor || pending) return;
    startTransition(async () => {
      try {
        const page = await loadMorePosts(cursor, tag);
        setPosts((current) => {
          const seen = new Set(current.map((post) => post.id));
          return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
        });
        setCursor(page.nextCursor);
        setError(null);
      } catch {
        setError("더 불러오지 못했습니다.");
      }
    });
  }, [cursor, pending, tag]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && loadMore(),
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  const now = new Date();
  return (
    <>
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
            onDeleted={(id) =>
              setPosts((current) => current.filter((item) => item.id !== id))
            }
          />
        </div>
      ))}
      {cursor ? (
        <div ref={sentinel} aria-live="polite" className="space-y-6 py-4">
          {[0, 1].map((n) => (
            <div key={n} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-full" />
              </div>
            </div>
          ))}
          {error && (
            <div className="text-center">
              <p className="type-body-sm text-text-muted">{error}</p>
              <button
                type="button"
                onClick={loadMore}
                className="type-caption mt-2 rounded-full underline underline-offset-4"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="type-caption py-8 text-center text-text-faint">
          {posts.length === 0 ? "" : "마지막 소식입니다."}
        </p>
      )}
    </>
  );
}
