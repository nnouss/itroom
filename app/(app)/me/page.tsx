import { PenLine } from "lucide-react";
import { FeedList } from "@/components/post/feed-list";
import { Card } from "@/components/layout/card";
import { requireUser } from "@/lib/auth";
import { fetchFeedPage } from "@/lib/posts";

/** 내 소식: 로그인한 회원 본인의 글만 최신순으로 모아 본다. */
export default async function MyPostsPage() {
  const { profile } = await requireUser();
  const page = await fetchFeedPage({ authorId: profile.id });
  return (
    <>
      <h1 className="sr-only">내 소식</h1>
      {page.posts.length === 0 && (
        <Card className="flex flex-col items-center px-6 py-20 text-center">
          <span className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-canvas-soft text-text-muted">
            <PenLine className="size-6" />
          </span>
          <p className="type-title text-[17px]">아직 쓴 소식이 없습니다</p>
          <p className="type-body-sm mt-2 text-text-muted">위 쓰기 버튼으로 첫 소식을 남겨보세요.</p>
        </Card>
      )}
      <FeedList
        initialPosts={page.posts}
        initialCursor={page.nextCursor}
        viewer={{ id: profile.id, isOwner: profile.role === "owner" }}
        filter={{ tag: null, mine: true }}
        serverNow={new Date().toISOString()}
        endLabel="내가 쓴 소식은 여기까지입니다."
      />
    </>
  );
}
