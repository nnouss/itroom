import "server-only";
import sanitizeHtml from "sanitize-html";
import * as cheerio from "cheerio";
import { pathFromMediaUrl, mediaUrl } from "@/lib/media";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "s", "code", "pre", "a", "ul", "ol", "li", "img"];

/**
 * 에디터 HTML의 `<img>`에서 Storage 경로 목록을 모은다. 이미지는 본문 제자리에 그대로 둔다.
 * `/media/` 경로가 아닌 이미지는 `rejected`로 센다 (조용히 버리지 않는다).
 */
export function collectImages(html: string): { images: string[]; rejected: number } {
  const $ = cheerio.load(html, null, false);
  const images: string[] = [];
  let rejected = 0;
  $("img").each((_, el) => {
    const path = pathFromMediaUrl($(el).attr("src") ?? "");
    if (path) {
      if (!images.includes(path)) images.push(path);
    } else {
      rejected += 1;
    }
  });
  return { images, rejected };
}

/** 렌더링 가능한 http(s) URL만 통과시킨다. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * 본문의 이미지를 `images` 컬럼과 맞춘다. 컬럼에 없는 이미지는 지우고,
 * 본문에 없는 이미지(본문에서 이미지를 떼어 저장하던 예전 글)는 끝에 붙인다.
 */
export function reconcileImages(html: string, images: string[]): string {
  const $ = cheerio.load(html, null, false);
  const allowed = new Set(images);
  const seen = new Set<string>();
  $("img").each((_, el) => {
    const path = pathFromMediaUrl($(el).attr("src") ?? "");
    if (path && allowed.has(path)) seen.add(path);
    else $(el).remove();
  });
  const missing = images
    .filter((path) => !seen.has(path))
    .map((path) => `<img src="${mediaUrl(path)}" alt="첨부 이미지">`)
    .join("");
  return $.html() + missing;
}

export type ContentBlock =
  | { type: "html"; html: string }
  | { type: "images"; paths: string[] };

/**
 * 본문을 최상위 기준으로 글 조각과 이미지 묶음으로 나눈다. 연속한 이미지는 한 묶음이 된다.
 * 목록 안처럼 최상위가 아닌 이미지는 글 조각 안에 남는다.
 */
export function toContentBlocks(html: string): ContentBlock[] {
  const $ = cheerio.load(html, null, false);
  const blocks: ContentBlock[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) blocks.push({ type: "html", html: buffer });
    buffer = "";
  };
  $.root()
    .contents()
    .each((_, node) => {
      const path = node.type === "tag" && node.name === "img" ? pathFromMediaUrl($(node).attr("src") ?? "") : null;
      if (!path) {
        buffer += $.html(node);
        return;
      }
      flush();
      const last = blocks.at(-1);
      if (last?.type === "images") last.paths.push(path);
      else blocks.push({ type: "images", paths: [path] });
    });
  flush();
  return blocks;
}

export function sanitizePostHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      }),
      // 이미지는 우리 Storage(/media/) 경로만 남기고 src를 정규화한다.
      img: (tagName, attribs) => {
        const path = pathFromMediaUrl(attribs.src ?? "");
        const clean: sanitizeHtml.Attributes = path
          ? { src: mediaUrl(path), alt: (attribs.alt ?? "").slice(0, 200) }
          : {};
        return { tagName, attribs: clean };
      },
      // 붙여넣기로 들어온 제목/인용은 문단으로 낮춘다.
      h1: "p", h2: "p", h3: "p", h4: "p", h5: "p", h6: "p", blockquote: "p", div: "p",
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
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
