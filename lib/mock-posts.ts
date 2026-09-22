import type { LinkPreview } from "@/components/post/link-card";
export type MockPost = {
  id: string;
  author: string;
  createdAt: string;
  contentHtml: string;
  tags: string[];
  images?: { src: string; alt: string }[];
  link?: LinkPreview;
};
// Trusted, local HTML fixtures only. User content will be sanitized in task 04.
export function getMockPosts(now = new Date()): MockPost[] {
  const ago = (hours: number) =>
    new Date(now.getTime() - hours * 3_600_000).toISOString();
  return [
    {
      id: "1",
      author: "잇룸 에디터",
      createdAt: ago(0.2),
      contentHtml:
        "<p>소음은 줄이고, 궁금한 이야기는 가까이.</p><p>잇룸을 열었습니다. 기술을 만들고 사용하는 사람들의 소식을 천천히 모아보려고 해요. 읽다가 오래 생각하게 되는 이야기가 있다면, 이곳에 남겨둘게요.</p>",
      tags: ["잇룸", "커뮤니티"],
    },
    {
      id: "2",
      author: "잇룸 에디터",
      createdAt: ago(3),
      contentHtml:
        '<p>익숙한 웹도 다른 시선으로 보면 배울 게 많네요. <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">Next.js 문서</a>를 다시 읽으며 서버와 클라이언트의 경계를 정리하고 있습니다.</p>',
      tags: [],
      link: {
        url: "https://nextjs.org/docs",
        title: "웹의 다음 장을 만드는 방법",
        description:
          "라우팅부터 렌더링까지. 작은 예제로 살펴보는 Next.js의 기본 개념.",
        image: "https://picsum.photos/seed/itroom-web/480/270",
      },
    },
    {
      id: "3",
      author: "잇룸 에디터",
      createdAt: ago(6),
      contentHtml:
        "<p>가끔은 화면 밖을 바라보는 시간이 필요하죠. 오늘의 영감은 잠깐의 산책에서.</p>",
      tags: ["일하는방식"],
      images: [
        {
          src: "https://picsum.photos/seed/itroom1/1200/800",
          alt: "산책하며 발견한 풍경",
        },
      ],
    },
    {
      id: "4",
      author: "잇룸 에디터",
      createdAt: ago(24),
      contentHtml: "<p>이번 주에 모아둔 장면 세 가지. 옆으로 넘겨보세요.</p>",
      tags: ["영감"],
      images: [2, 3, 4].map((n) => ({
        src: `https://picsum.photos/seed/itroom${n}/900/700`,
        alt: `이번 주의 풍경 ${n - 1}`,
      })),
    },
    {
      id: "5",
      author: "잇룸 에디터",
      createdAt: ago(48),
      contentHtml:
        "<p>작은 상수 하나가 코드의 의도를 설명해주기도 합니다. <code>FEED_PAGE_SIZE</code>처럼요.</p><pre><code>export const FEED_PAGE_SIZE = 10;\n\nconst nextPage = posts.slice(0, FEED_PAGE_SIZE);</code></pre><p>바꿀 곳은 하나, 읽는 사람에게는 분명하게.</p>",
      tags: ["개발", "TypeScript"],
    },
    {
      id: "6",
      author: "잇룸 에디터",
      createdAt: ago(192),
      contentHtml: "",
      tags: ["웹", "접근성", "오픈소스", "읽을거리"],
      link: {
        url: "https://developer.mozilla.org/ko/docs/Web/Accessibility",
        title: "모두를 위한 웹, 접근성부터",
        description:
          "좋은 기본값에서 시작하는 접근성. 키보드 탐색과 의미 있는 HTML을 다시 살펴봅니다.",
      },
    },
  ];
}
