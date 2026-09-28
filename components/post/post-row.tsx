"use client";
import { useState } from "react";
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
import { DeletePostDialog } from "./delete-post-dialog";
import type { Post, Viewer } from "@/lib/types";
import { canManagePost } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { AvatarMark } from "@/components/ui/avatar-mark";
import { Card } from "@/components/layout/card";

export function PostRow({
  post,
  viewer,
  relativeTime,
  activeTag,
  afterDelete = "refresh",
  onDeleted,
}: {
  post: Post;
  viewer: Viewer;
  relativeTime: string;
  activeTag?: string | null;
  afterDelete?: "refresh" | "home" | "none";
  onDeleted?: (id: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canManage = canManagePost(viewer, post.authorId);
  const multiple = post.images.length > 1;
  const edited = post.updatedAt !== post.createdAt;
  return (
    <Card className="min-w-0 px-4 pt-3 pb-4">
    <article className="min-w-0">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-3">
          <AvatarMark name={post.authorName} size={40} />
          <div className="min-w-0 flex-1">
            <h2 className="type-title min-w-0 truncate text-[15px]">{post.authorName}</h2>
            <Link
              href={`/posts/${post.id}`}
              className="type-caption rounded-full text-text-muted hover:underline"
            >
              <time dateTime={post.createdAt}>{relativeTime}</time>
              {edited && <span> · 수정됨</span>}
            </Link>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
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
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="space-y-3">
          {post.contentHtml && (
            <div
              className="post-content type-body"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          )}
          {post.images.length > 0 && (
            <div
              className={cn(
                "min-w-0",
                multiple && "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
              )}
              aria-label="게시물 이미지"
            >
              {post.images.map((image) => (
                <Dialog key={image.path}>
                  <DialogTrigger asChild>
                    <button
                      aria-label={`${image.alt} 원본 보기`}
                      className={cn(
                        "block overflow-hidden rounded-2xl bg-canvas-soft",
                        multiple ? "h-60 w-[85%] shrink-0 snap-start" : "w-full",
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
                <TagChip key={tag} tag={tag} active={tag === activeTag} />
              ))}
            </div>
          )}
        </div>
      </div>
      {canManage && (
        <DeletePostDialog
          postId={post.id}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          afterDelete={afterDelete}
          onDeleted={onDeleted}
        />
      )}
    </article>
    </Card>
  );
}
