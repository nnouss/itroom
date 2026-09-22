import { ComposeRow } from "@/components/post/compose-row";
import { PostRow } from "@/components/post/post-row";
import { getMockPosts } from "@/lib/mock-posts";
import { formatRelative } from "@/lib/format";
export default function FeedPage() {
  const isOwner = true;
  const now = new Date();
  return (
    <>
      <h1 className="sr-only">잇룸 소식 피드</h1>
      <ComposeRow isOwner={isOwner} />
      {getMockPosts(now).map((post) => (
        <PostRow
          key={post.id}
          post={post}
          isOwner={isOwner}
          relativeTime={formatRelative(post.createdAt, now)}
        />
      ))}
      <p className="type-caption py-8 text-center text-text-faint">
        마지막 소식입니다.
      </p>
    </>
  );
}
