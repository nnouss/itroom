import "server-only";
import sanitizeHtml from "sanitize-html";
import * as cheerio from "cheerio";
import { pathFromMediaUrl, mediaUrl } from "@/lib/media";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "s", "code", "pre", "a", "ul", "ol", "li"];

/** 에디터 HTML에서 `<img>`를 떼어내 Storage 경로 목록으로 돌려준다. */
export function splitImages(html: string): { html: string; images: string[] } {
  const $ = cheerio.load(html, null, false);
  const images: string[] = [];
  $("img").each((_, el) => {
    const path = pathFromMediaUrl($(el).attr("src") ?? "");
    if (path && !images.includes(path)) images.push(path);
    $(el).remove();
  });
  return { html: $.html(), images };
}

/** 수정 화면용: 본문 끝에 이미지 노드를 다시 붙인다. */
export function joinImages(html: string, images: string[]): string {
  return (
    html +
    images
      .map((path) => `<img src="${mediaUrl(path)}" alt="첨부 이미지">`)
      .join("")
  );
}

export function sanitizePostHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      }),
      // 붙여넣기로 들어온 제목/인용은 문단으로 낮춘다.
      h1: "p", h2: "p", h3: "p", h4: "p", h5: "p", h6: "p", blockquote: "p", div: "p",
    },
  });
  // 끝에 남은 빈 문단은 버린다.
  return clean.replace(/(<p>(\s|<br\s*\/?>)*<\/p>\s*)+$/g, "").trim();
}

export function textLength(html: string): number {
  return cheerio.load(html, null, false).text().trim().length;
}

/** 본문에서 첫 번째 외부 http(s) 링크. */
export function firstExternalUrl(html: string): string | null {
  const $ = cheerio.load(html, null, false);
  let found: string | null = null;
  $("a[href]").each((_, el) => {
    if (found) return;
    const href = $(el).attr("href") ?? "";
    if (/^https?:\/\//i.test(href)) found = href;
  });
  return found;
}
