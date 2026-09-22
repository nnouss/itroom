"use client";
import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LinkCard } from "./link-card";
import { TagChip } from "./tag-chip";
import type { MockPost } from "@/lib/mock-posts";
import { cn } from "@/lib/utils";
export function PostRow({
  post,
  isOwner,
  relativeTime,
}: {
  post: MockPost;
  isOwner: boolean;
  relativeTime: string;
}) {
  const multiple = (post.images?.length ?? 0) > 1;
  return (
    <article className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] gap-3 border-b border-hairline-soft py-4 md:py-6">
      <div
        aria-hidden="true"
        className="type-label flex size-9 items-center justify-center rounded-full bg-canvas-soft"
      >
        {post.author.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex min-h-9 items-center gap-2">
          <h2 className="type-title font-[650]">{post.author}</h2>
          <span className="type-caption text-text-muted">·</span>
          <time
            dateTime={post.createdAt}
            className="type-caption text-text-muted"
          >
            {relativeTime}
          </time>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto shrink-0"
                  aria-label="게시물 메뉴"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/posts/${post.id}/edit`}>
                    <Pencil />
                    수정
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-destructive">
                  <Trash2 />
                  삭제 (준비 중)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="space-y-4">
          {post.contentHtml && (
            <div
              className="post-content type-body"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          )}
          {post.images && (
            <div
              className={cn(
                "min-w-0",
                multiple &&
                  "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
              )}
              aria-label="게시물 이미지"
            >
              {post.images.map((image) => (
                <Dialog key={image.src}>
                  <DialogTrigger asChild>
                    <button
                      aria-label={`${image.alt} 원본 보기`}
                      className={cn(
                        "block overflow-hidden rounded-2xl",
                        multiple
                          ? "h-60 w-[85%] shrink-0 snap-start"
                          : "w-full",
                      )}
                    >
                      <Image
                        unoptimized
                        src={image.src}
                        alt={image.alt}
                        width={1200}
                        height={800}
                        className={cn(
                          "w-full object-cover",
                          multiple ? "h-60" : "h-auto max-h-[520px]",
                        )}
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl">
                    <DialogTitle className="sr-only">{image.alt}</DialogTitle>
                    <DialogDescription className="sr-only">
                      게시물 이미지 원본
                    </DialogDescription>
                    <Image
                      unoptimized
                      src={image.src}
                      alt={image.alt}
                      width={1200}
                      height={800}
                      className="max-h-[80dvh] w-full rounded-2xl object-contain"
                    />
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
          {post.link && <LinkCard link={post.link} />}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
