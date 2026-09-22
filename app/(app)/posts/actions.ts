"use server";
import { revalidatePath } from "next/cache";
import { fetchFeedPage, UUID_RE } from "@/lib/posts";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FeedCursor, FeedPage } from "@/lib/types";

export async function loadMorePosts(
  cursor: FeedCursor,
  tag: string | null,
): Promise<FeedPage> {
  await requireUser();
  if (!UUID_RE.test(cursor.id) || Number.isNaN(Date.parse(cursor.createdAt)))
    return { posts: [], nextCursor: null };
  return fetchFeedPage({ cursor, tag });
}

export async function deletePost(id: string): Promise<{ error?: string }> {
  const { profile } = await requireUser();
  if (profile.role !== "owner") return { error: "삭제 권한이 없습니다." };
  if (!UUID_RE.test(id)) return { error: "잘못된 글입니다." };
  const supabase = await createClient();
  const { data: post, error: readError } = await supabase
    .from("posts")
    .select("id, images")
    .eq("id", id)
    .maybeSingle();
  if (readError) return { error: "글을 확인하지 못했습니다." };
  if (!post) return { error: "이미 삭제된 글입니다." };
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해주세요." };
  const images = (post.images as string[] | null) ?? [];
  if (images.length > 0) {
    // 이미지 정리 실패는 글 삭제를 되돌릴 이유가 아니므로 무시한다.
    await supabase.storage.from("post-images").remove(images);
  }
  revalidatePath("/", "layout");
  return {};
}

import { firstExternalUrl, sanitizePostHtml, splitImages, textLength } from "@/lib/sanitize";
import { fetchLinkPreview } from "@/lib/og";
import { normalizeTags } from "@/lib/tags";

export type SavePostInput = { id?: string; contentHtml: string; tags: string[] };
export type SavePostResult = { error?: string; id?: string };

const MAX_HTML_LENGTH = 100_000;

export async function savePost(input: SavePostInput): Promise<SavePostResult> {
  const { user, profile } = await requireUser();
  if (profile.role !== "owner") return { error: "글을 쓸 권한이 없습니다." };
  if (input.id && !UUID_RE.test(input.id)) return { error: "잘못된 글입니다." };
  if (typeof input.contentHtml !== "string" || input.contentHtml.length > MAX_HTML_LENGTH)
    return { error: "본문이 너무 깁니다." };

  const split = splitImages(input.contentHtml);
  const html = sanitizePostHtml(split.html);
  const images = split.images;
  if (images.some((path) => !path.startsWith(`${user.id}/`)))
    return { error: "허용되지 않은 이미지가 있습니다." };
  const tags = normalizeTags(Array.isArray(input.tags) ? input.tags : []);
  const linkUrl = firstExternalUrl(html);
  if (textLength(html) === 0 && images.length === 0 && !linkUrl)
    return { error: "내용을 입력해주세요." };

  const supabase = await createClient();
  type PreviousRow = {
    images: string[] | null;
    link_url: string | null;
    link_title: string | null;
    link_description: string | null;
    link_image: string | null;
  };
  let previous: PreviousRow | null = null;
  if (input.id) {
    const { data, error } = await supabase
      .from("posts")
      .select("images, link_url, link_title, link_description, link_image")
      .eq("id", input.id)
      .maybeSingle();
    if (error || !data) return { error: "수정할 글을 찾지 못했습니다." };
    previous = data as unknown as PreviousRow;
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
  let id = input.id;
  if (id) {
    const { error } = await supabase.from("posts").update(row).eq("id", id);
    if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
    const removed = (previous?.images ?? []).filter((path) => !images.includes(path));
    if (removed.length > 0) await supabase.storage.from("post-images").remove(removed);
  } else {
    const { data, error } = await supabase
      .from("posts")
      .insert({ ...row, author_id: user.id })
      .select("id")
      .single();
    if (error || !data) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };
    id = data.id as string;
  }
  revalidatePath("/", "layout");
  return { id };
}
