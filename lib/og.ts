import "server-only";
import * as cheerio from "cheerio";
import type { LinkPreview } from "@/lib/types";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;

function isPublicHttpUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal"))
    return false;
  // IP 리터럴은 거부한다 (사설망 접근 방지).
  if (/^[\d.]+$/.test(host) || host.includes(":")) return false;
  return true;
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** 링크의 OG 메타를 가져온다. 실패하면 null (카드 없이 링크만 남긴다). */
export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isPublicHttpUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; itroom-preview/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) return null;
    const html = await readLimited(response);
    const $ = cheerio.load(html);
    const meta = (...names: string[]) => {
      for (const name of names) {
        const value =
          $(`meta[property="${name}"]`).attr("content") ??
          $(`meta[name="${name}"]`).attr("content");
        if (value?.trim()) return value.trim();
      }
      return "";
    };
    const title = (meta("og:title", "twitter:title") || $("title").first().text().trim()).slice(0, 200);
    if (!title) return null;
    const description = meta("og:description", "twitter:description", "description").slice(0, 400);
    const imageRaw = meta("og:image", "og:image:url", "twitter:image");
    let image: string | undefined;
    if (imageRaw) {
      try {
        const resolved = new URL(imageRaw, response.url || url);
        if (["http:", "https:"].includes(resolved.protocol)) image = resolved.toString();
      } catch {
        image = undefined;
      }
    }
    return { url: raw, title, description, image };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
