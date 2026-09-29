export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image?: string;
};

export type PostImage = { src: string; alt: string; path: string };

/** 본문 조각. 이미지는 쓴 자리에 놓이고, 연속한 이미지는 한 묶음으로 보인다. */
export type PostBlock =
  | { type: "html"; html: string }
  | { type: "images"; images: PostImage[] };

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  blocks: PostBlock[];
  tags: string[];
  link: LinkPreview | null;
  /** DB가 돌려준 원본 문자열. 커서 비교에 그대로 쓰므로 Date로 바꾸지 않는다. */
  createdAt: string;
  updatedAt: string;
};

export type FeedCursor = { createdAt: string; id: string };

export type FeedPage = { posts: Post[]; nextCursor: FeedCursor | null };

/** 현재 로그인한 사용자. 글 단위 권한 판단(`canManagePost`)에 쓴다. */
export type Viewer = { id: string; isOwner: boolean };
