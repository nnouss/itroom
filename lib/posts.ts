import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import type { FeedCursor, FeedPage, Post } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { safeHttpUrl, sanitizePostHtml } from "@/lib/sanitize";

const POST_COLUMNS =
  "id, author_id, content_html, tags, images, link_url, link_title, link_description, link_image, created_at, updated_at, author:profiles(display_name)";

type PostRow = {
  id: string;
  author_id: string;
  content_html: string;
  tags: string[] | null;
  images: string[] | null;
  link_url: string | null;
  link_title: string | null;
  link_description: string | null;
  link_image: string | null;
  created_at: string;
  updated_at: string;
  author: { display_name: string | null } | { display_name: string | null }[] | null;
};

function toPost(row: PostRow): Post {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  const linkUrl = safeHttpUrl(row.link_url);
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: author?.display_name?.trim() || "회원",
    // 저장 경로 밖(SQL, REST)으로 들어온 HTML도 있을 수 있으므로 조회 시 다시 정화한다.
    contentHtml: sanitizePostHtml(row.content_html ?? ""),
    tags: row.tags ?? [],
    images: (row.images ?? []).map((path, index) => ({
      path,
      src: mediaUrl(path),
      alt: `첨부 이미지 ${index + 1}`,
    })),
    link:
      linkUrl && row.link_title
        ? {
            url: linkUrl,
            title: row.link_title,
            description: row.link_description ?? "",
            // 외부 썸네일은 /og 경로로 서버가 대신 받는다. 수정 시각으로 브라우저 캐시를 갱신한다.
            image: safeHttpUrl(row.link_image)
              ? `/og/${row.id}?v=${Date.parse(row.updated_at) || 0}`
              : undefined,
          }
        : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchFeedPage({
  cursor,
  tag,
  limit = FEED_PAGE_SIZE,
}: {
  cursor?: FeedCursor | null;
  tag?: string | null;
  limit?: number;
}): Promise<FeedPage> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (tag) query = query.contains("tags", [tag]);
  if (cursor) {
    // (created_at, id) < (cursor.createdAt, cursor.id) 튜플 비교
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(`피드를 불러오지 못했습니다: ${error.message}`);
  const rows = (data ?? []) as unknown as PostRow[];
  const hasMore = rows.length > limit;
  const posts = rows.slice(0, limit).map(toPost);
  const last = posts.at(-1);
  return {
    posts,
    nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

export async function fetchPost(id: string): Promise<Post | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`글을 불러오지 못했습니다: ${error.message}`);
  return data ? toPost(data as unknown as PostRow) : null;
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** PostgREST가 돌려주는 timestamptz 문자열 형태 (마이크로초 유지). */
export const TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:\d{2}|Z)$/;
