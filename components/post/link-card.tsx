import Image from "next/image";
export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image?: string;
};
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
        <p className="type-body-sm line-clamp-2 text-text-muted">
          {link.description}
        </p>
        <p className="type-caption text-text-faint">
          {new URL(link.url).hostname}
        </p>
      </div>
    </a>
  );
}
