import { redirect } from "next/navigation";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";

export default async function WritePage() {
  const { user, profile } = await requireUser();
  if (profile.role !== "owner") redirect("/");
  return (
    <>
      <h1 className="sr-only">새 소식 작성</h1>
      <PostEditor mode="create" userId={user.id} authorInitial={Array.from(profile.displayName)[0] ?? "잇"} />
    </>
  );
}
