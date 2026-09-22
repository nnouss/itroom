import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";
import { fetchPost, UUID_RE } from "@/lib/posts";
import { joinImages } from "@/lib/sanitize";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { user, profile } = await requireUser();
  if (profile.role !== "owner") redirect(`/posts/${id}`);
  const post = await fetchPost(id);
  if (!post) notFound();
  return (
    <>
      <h1 className="sr-only">소식 수정</h1>
      <PostEditor
        mode="edit"
        postId={post.id}
        userId={user.id}
        authorInitial={Array.from(profile.displayName)[0] ?? "잇"}
        initialHtml={joinImages(post.contentHtml, post.images.map((image) => image.path))}
        initialTags={post.tags}
      />
    </>
  );
}
