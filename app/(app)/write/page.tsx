import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";

export default async function WritePage() {
  const { user } = await requireUser();
  return (
    <>
      <h1 className="sr-only">새 소식 쓰기</h1>
      <PostEditor mode="create" userId={user.id} />
    </>
  );
}
