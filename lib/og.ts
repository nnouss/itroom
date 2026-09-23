import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import * as cheerio from "cheerio";
import type { LinkPreview } from "@/lib/types";

const TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = "Mozilla/5.0 (compatible; itroom-preview/1.0)";

/** 공개 인터넷이 아닌 대역. IPv4-mapped IPv6(::ffff:a.b.c.d)는 BlockList가 IPv4 규칙으로 함께 검사한다. */
const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const)
  blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  // ::/96은 ::, ::1, IPv4-compatible 주소를 덮는다. 64:ff9b(NAT64), 2002(6to4), 2001::/32(Teredo)는 IPv4를 품는다.
  ["::", 96], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["100::", 64], ["2001::", 32], ["2001:db8::", 32],
  ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
] as const)
  blocked.addSubnet(net, prefix, "ipv6");

export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return true;
  return blocked.check(ip, family === 6 ? "ipv6" : "ipv4");
}

/**
 * 소켓이 실제로 연결할 주소를 여기서 검사한다. 검사와 연결이 같은 조회 결과를 쓰므로
 * 검사 때와 연결 때 다른 IP를 돌려주는 DNS rebinding도 막힌다.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "", 4);
    if (addresses.length === 0 || addresses.some((entry) => isBlockedAddress(entry.address)))
      return callback(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }), "", 4);
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

function isAllowedUrl(url: URL): boolean {
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    return false;
  // IP 리터럴은 lookup을 거치지 않으므로 여기서 직접 검사한다.
  const literal = host.replace(/^\[|\]$/g, "");
  return isIP(literal) ? !isBlockedAddress(literal) : true;
}

function get(url: URL, accept: string, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      {
        agent: false,
        lookup: safeLookup,
        signal,
        headers: { "user-agent": USER_AGENT, accept, "accept-encoding": "identity" },
      },
      resolve,
    );
    request.on("error", reject);
  });
}

type Fetched = { url: URL; contentType: string; body: Buffer };

/**
 * 공개 인터넷 주소만 GET한다. 리다이렉트는 매 단계 다시 검사한다.
 * `truncate`가 참이면 한도까지만 읽고, 거짓이면 한도를 넘는 응답은 버린다.
 */
async function fetchPublic(
  start: URL,
  { accept, maxBytes, truncate }: { accept: string; maxBytes: number; truncate: boolean },
): Promise<Fetched | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowedUrl(url)) return null;
      const response = await get(url, accept, controller.signal);
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        const location = response.headers.location;
        response.destroy();
        if (!location) return null;
        url = new URL(location, url);
        continue;
      }
      const encoding = response.headers["content-encoding"];
      if (status !== 200 || (encoding && encoding !== "identity")) {
        response.destroy();
        return null;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of response as AsyncIterable<Buffer>) {
        chunks.push(chunk);
        total += chunk.byteLength;
        if (total > maxBytes || (truncate && total === maxBytes)) {
          response.destroy();
          if (!truncate) return null;
          break;
        }
      }
      return { url, contentType: String(response.headers["content-type"] ?? ""), body: Buffer.concat(chunks).subarray(0, maxBytes) };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    // 버린 응답이나 끝나지 않은 연결이 시간 제한 밖에서 계속 받지 않도록 남은 요청을 모두 끊는다.
    controller.abort();
  }
}

/** 링크의 OG 메타를 가져온다. 실패하면 null (카드 없이 링크만 남긴다). */
export async function fetchLinkPreview(raw: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const response = await fetchPublic(url, {
    accept: "text/html,application/xhtml+xml",
    maxBytes: MAX_HTML_BYTES,
    truncate: true,
  });
  if (!response || !/text\/html|application\/xhtml/i.test(response.contentType)) return null;
  const $ = cheerio.load(new TextDecoder().decode(response.body));
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
      const resolved = new URL(imageRaw, response.url);
      if (["http:", "https:"].includes(resolved.protocol)) image = resolved.toString();
    } catch {
      image = undefined;
    }
  }
  return { url: raw, title, description, image };
}

const PREVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);

/**
 * 링크 카드 썸네일을 서버에서 대신 가져온다. 회원 브라우저가 외부 사이트에 직접 요청하지 않게 한다.
 * SVG처럼 스크립트를 품을 수 있는 형식은 받지 않는다.
 */
export async function fetchPreviewImage(raw: string): Promise<{ contentType: string; body: Buffer } | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const response = await fetchPublic(url, {
    accept: [...PREVIEW_IMAGE_TYPES].join(","),
    maxBytes: MAX_IMAGE_BYTES,
    truncate: false,
  });
  const contentType = response?.contentType.split(";")[0].trim().toLowerCase() ?? "";
  if (!response || !PREVIEW_IMAGE_TYPES.has(contentType) || response.body.byteLength === 0) return null;
  return { contentType, body: response.body };
}
