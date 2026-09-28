export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image?: string;
};

export type PostImage = { src: string; alt: string; path: string };

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  contentHtml: string;
  tags: string[];
  images: PostImage[];
  link: LinkPreview | null;
  /** DB가 돌려준 원본 문자열. 커서 비교에 그대로 쓰므로 Date로 바꾸지 않는다. */
  createdAt: string;
  updatedAt: string;
};

export type FeedCursor = { createdAt: string; id: string };

export type FeedPage = { posts: Post[]; nextCursor: FeedCursor | null };

/** 현재 로그인한 사용자. 글 단위 권한 판단(`canManagePost`)에 쓴다. */
export type Viewer = { id: string; isOwner: boolean };
