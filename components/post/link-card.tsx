import Image from "next/image";
import type { LinkPreview } from "@/lib/types";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinkCard({ link }: { link: LinkPreview }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline-soft transition-opacity hover:opacity-80 sm:flex-row"
      aria-label={`${link.title} (새 탭)`}
    >
      {link.image && (
        <Image
          unoptimized
          src={link.image}
          width={480}
          height={270}
          alt=""
          className="aspect-video w-full object-cover sm:aspect-square sm:size-[120px] sm:shrink-0"
        />
      )}
      <div className="min-w-0 space-y-2 p-4">
        <p className="type-title line-clamp-2">{link.title}</p>
        {link.description && (
          <p className="type-body-sm line-clamp-2 text-text-muted">
            {link.description}
          </p>
        )}
        <p className="type-caption text-text-faint">{hostname(link.url)}</p>
      </div>
    </a>
  );
}
