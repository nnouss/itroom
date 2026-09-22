// Only same-origin absolute paths are accepted after exchanging a one-time token.
export function safeNextPath(next: string | null): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(next)
  )
    return "/";
  const origin = "https://itroom.invalid";
  try {
    const url = new URL(next, origin);
    return url.origin === origin && !url.pathname.startsWith("//")
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}
