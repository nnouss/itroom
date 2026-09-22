import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <div className="flex items-center gap-2 py-2">
        <Link
          href="/"
          aria-label="피드로 돌아가기"
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-canvas-soft"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="type-title">소식</h1>
      </div>
      <PostRow
        post={post}
        isOwner={profile.role === "owner"}
        relativeTime={formatRelative(post.createdAt)}
        afterDelete="home"
        standalone
      />
    </>
  );
}
