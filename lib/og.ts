import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";
import type { LinkPreview } from "@/lib/types";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateIPv4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string) {
  if (isIP(ip) === 4) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return (
    v6 === "::" || v6 === "::1" || v6.startsWith("fe8") || v6.startsWith("fe9") ||
    v6.startsWith("fea") || v6.startsWith("feb") || v6.startsWith("fc") || v6.startsWith("fd")
  );
}

/** 호스트가 공개 인터넷 주소로만 해석되는지 확인한다 (사설망 SSRF 방지). */
async function isPublicHttpUrl(url: URL): Promise<boolean> {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    return false;
  const literal = host.replace(/^\[|\]$/g, "");
  if (isIP(literal)) return !isPrivateIP(literal);
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((entry) => !isPrivateIP(entry.address));
  } catch {
    return false;
  }
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

/** 리다이렉트를 수동으로 따라가며 매 단계 목적지를 검증한다. */
async function fetchChecked(start: URL, signal: AbortSignal): Promise<Response | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicHttpUrl(url))) return null;
    const response = await fetch(url, {
      signal,
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; itroom-preview/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      response.body?.cancel().catch(() => {});
      if (!location) return null;
      url = new URL(location, url);
      continue;
    }
    return response;
  }
  return null;
}

/** 링크의 OG 메타를 가져온다. 실패하면 null (카드 없이 링크만 남긴다). */
export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchChecked(url, controller.signal);
    if (!response || !response.ok) return null;
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
