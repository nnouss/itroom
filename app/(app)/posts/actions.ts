"use server";
import { revalidatePath } from "next/cache";
import { fetchFeedPage, TIMESTAMP_RE, UUID_RE } from "@/lib/posts";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { firstExternalUrl, sanitizePostHtml, splitImages, textLength } from "@/lib/sanitize";
import { fetchLinkPreview } from "@/lib/og";
import { normalizeTags, MAX_TAGS, MAX_TAG_LENGTH } from "@/lib/tags";
import { OBJECT_PATH_RE } from "@/lib/media";
import { canManagePost } from "@/lib/permissions";
import type { FeedCursor, FeedPage } from "@/lib/types";

const MAX_HTML_LENGTH = 100_000;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function loadMorePosts(cursor: unknown, filter: unknown): Promise<FeedPage> {
  const { user } = await requireUser();
  if (
    !isRecord(cursor) ||
    typeof cursor.id !== "string" ||
    !UUID_RE.test(cursor.id) ||
    typeof cursor.createdAt !== "string" ||
    !TIMESTAMP_RE.test(cursor.createdAt)
  )
    return { posts: [], nextCursor: null };
  const tag = isRecord(filter) ? filter.tag : undefined;
  const safeTag = typeof tag === "string" ? tag.trim().slice(0, 40) || null : null;
  // 내 글 필터의 작성자는 클라이언트 값이 아니라 세션 사용자로 정한다.
  const mine = isRecord(filter) && filter.mine === true;
  return fetchFeedPage({ cursor: cursor as FeedCursor, tag: safeTag, authorId: mine ? user.id : null });
}

export async function deletePost(id: unknown): Promise<{ error?: string }> {
  await requireUser();
  if (typeof id !== "string" || !UUID_RE.test(id)) return { error: "잘못된 글입니다." };
  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .select("id, images");
  if (error) return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해주세요." };
  // 남의 글이면 RLS가 0행을 돌려준다. 이미 삭제된 글과 구분하지 않는다.
  if (!deleted || deleted.length === 0) return { error: "삭제할 수 없는 글입니다." };
  const images = ((deleted[0].images as string[] | null) ?? []).filter((path) => OBJECT_PATH_RE.test(path));
  if (images.length > 0) await removeUnreferenced(supabase, images);
  revalidatePath("/", "layout");
  return {};
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 다른 글이 참조하지 않는 이미지만 Storage에서 지운다. 정리 실패는 무시한다. */
async function removeUnreferenced(supabase: Supabase, paths: string[]) {
  const { data } = await supabase.from("posts").select("images").overlaps("images", paths);
  const stillUsed = new Set((data ?? []).flatMap((row) => (row.images as string[] | null) ?? []));
  const orphans = paths.filter((path) => !stillUsed.has(path));
  if (orphans.length > 0) await supabase.storage.from("post-images").remove(orphans);
}

export type SavePostInput = { id?: string; contentHtml: string; tags: string[] };
export type SavePostResult = { error?: string; id?: string };

export async function savePost(input: unknown): Promise<SavePostResult> {
  const { user, profile } = await requireUser();
  if (!isRecord(input)) return { error: "잘못된 요청입니다." };
  const id = input.id;
  if (id !== undefined && (typeof id !== "string" || !UUID_RE.test(id))) return { error: "잘못된 글입니다." };
  if (typeof input.contentHtml !== "string" || input.contentHtml.length > MAX_HTML_LENGTH)
    return { error: "본문이 너무 깁니다." };
  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  if (rawTags.length > MAX_TAGS * 2 || rawTags.some((t) => typeof t !== "string" || t.length > MAX_TAG_LENGTH * 4))
    return { error: "태그 형식이 올바르지 않습니다." };

  const split = splitImages(input.contentHtml);
  if (split.rejected > 0)
    return { error: "외부 이미지는 붙여 넣을 수 없습니다. 파일로 올려주세요." };
  const html = sanitizePostHtml(split.html);
  const images = split.images;
  const tags = normalizeTags(rawTags as string[]);
  const linkUrl = firstExternalUrl(html);
  if (textLength(html) === 0 && images.length === 0 && !linkUrl)
    return { error: "내용을 입력해주세요." };

  const supabase = await createClient();

  type PreviousRow = {
    author_id: string;
    images: string[] | null;
    link_url: string | null;
    link_title: string | null;
    link_description: string | null;
    link_image: string | null;
  };
  let previous: PreviousRow | null = null;
  if (id) {
    const { data, error } = await supabase
      .from("posts")
      .select("author_id, images, link_url, link_title, link_description, link_image")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return { error: "수정할 글을 찾지 못했습니다." };
    previous = data as unknown as PreviousRow;
    if (!canManagePost({ id: user.id, isOwner: profile.role === "owner" }, previous.author_id))
      return { error: "이 글을 수정할 권한이 없습니다." };
  }

  // 새 이미지는 내 폴더에서만 온다. owner가 남의 글을 고칠 때 그 글에 원래 있던 이미지는 유지한다.
  const kept = new Set(previous?.images ?? []);
  if (images.some((path) => !path.startsWith(`${user.id}/`) && !kept.has(path)))
    return { error: "허용되지 않은 이미지가 있습니다." };

  // 이미지는 글 하나에만 속한다. 다른 글이 쓰는 경로는 거부한다.
  if (images.length > 0) {
    let usedElsewhere = supabase.from("posts").select("id").overlaps("images", images).limit(1);
    if (id) usedElsewhere = usedElsewhere.neq("id", id);
    const { data: conflict } = await usedElsewhere;
    if (conflict && conflict.length > 0) return { error: "다른 글에 이미 쓰인 이미지가 있습니다." };
  }

  // 링크가 바뀌었을 때만 OG를 다시 가져온다.
  let link = { link_url: null as string | null, link_title: null as string | null, link_description: null as string | null, link_image: null as string | null };
  if (linkUrl) {
    if (previous?.link_url === linkUrl && previous.link_title) {
      link = { link_url: previous.link_url, link_title: previous.link_title, link_description: previous.link_description, link_image: previous.link_image };
    } else {
      const preview = await fetchLinkPreview(linkUrl);
      link = preview
        ? { link_url: preview.url, link_title: preview.title, link_description: preview.description || null, link_image: preview.image ?? null }
        : { link_url: linkUrl, link_title: null, link_description: null, link_image: null };
    }
  }

  const row = { content_html: html, tags, images, ...link };
  let savedId = id;
  if (savedId) {
    const { data: updated, error } = await supabase.from("posts").update(row).eq("id", savedId).select("id");
    if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
    if (!updated || updated.length === 0) return { error: "글이 삭제되었거나 수정할 수 없습니다." };
    const removed = (previous?.images ?? []).filter((path) => !images.includes(path) && OBJECT_PATH_RE.test(path));
    if (removed.length > 0) await removeUnreferenced(supabase, removed);
  } else {
    const { data, error } = await supabase
      .from("posts")
      .insert({ ...row, author_id: user.id })
      .select("id")
      .single();
    if (error || !data) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
    savedId = data.id as string;
  }
  revalidatePath("/", "layout");
  return { id: savedId };
}

/** 에디터에서 올렸지만 글에 쓰지 않은 이미지를 지운다 (취소, 노드 삭제 후 저장). */
export async function discardUploads(paths: unknown): Promise<void> {
  const { user } = await requireUser();
  if (!Array.isArray(paths)) return;
  const own = paths.filter(
    (path): path is string =>
      typeof path === "string" && OBJECT_PATH_RE.test(path) && path.startsWith(`${user.id}/`),
  );
  if (own.length === 0) return;
  const supabase = await createClient();
  await removeUnreferenced(supabase, own.slice(0, 50));
}
