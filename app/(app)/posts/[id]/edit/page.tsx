import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";
import { editorHtml, fetchPost, UUID_RE } from "@/lib/posts";
import { canManagePost } from "@/lib/permissions";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { user, profile } = await requireUser();
  const post = await fetchPost(id);
  if (!post) notFound();
  if (!canManagePost({ id: profile.id, isOwner: profile.role === "owner" }, post.authorId))
    redirect(`/posts/${id}`);
  return (
    <>
      <h1 className="sr-only">소식 수정</h1>
      <PostEditor
        mode="edit"
        postId={post.id}
        userId={user.id}
        initialHtml={editorHtml(post)}
        initialTags={post.tags}
      />
    </>
  );
}
