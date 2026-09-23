import { notFound } from "next/navigation";
import { TitleCard } from "@/components/layout/card";
import { PostRow } from "@/components/post/post-row";
import { requireUser } from "@/lib/auth";
import { fetchPost, UUID_RE } from "@/lib/posts";
import { formatRelative } from "@/lib/format";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { profile } = await requireUser();
  const post = await fetchPost(id);
  if (!post) notFound();
  return (
    <>
      <TitleCard title="소식" backHref="/" />
      <PostRow
        post={post}
        isOwner={profile.role === "owner"}
        relativeTime={formatRelative(post.createdAt)}
        afterDelete="home"
      />
    </>
  );
}
