"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ImageViewer } from "./image-viewer";
import { LinkCard } from "./link-card";
import { TagChip } from "./tag-chip";
import { DeletePostDialog } from "./delete-post-dialog";
import { CollapsibleBody } from "./collapsible-body";
import type { Post, PostImage, Viewer } from "@/lib/types";
import { canManagePost } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { AvatarMark } from "@/components/ui/avatar-mark";
import { Card } from "@/components/layout/card";

async function copyPostLink(id: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/posts/${id}`);
    toast("링크를 복사했습니다.");
  } catch {
    toast("링크를 복사하지 못했습니다.");
  }
}

export function PostRow({
  post,
  viewer,
  relativeTime,
  activeTag,
  collapsible = false,
  afterDelete = "refresh",
  onDeleted,
}: {
  post: Post;
  viewer: Viewer;
  relativeTime: string;
  activeTag?: string | null;
  collapsible?: boolean;
  afterDelete?: "refresh" | "home" | "none";
  onDeleted?: (id: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canManage = canManagePost(viewer, post.authorId);
  const edited = post.updatedAt !== post.createdAt;
  const body = post.blocks.map((block, index) =>
    block.type === "html" ? (
      <div
        key={index}
        className="post-content type-body"
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    ) : (
      <PostImages key={index} images={block.images} />
    ),
  );
  const content = (
    <>
      {body}
      {post.link && <LinkCard link={post.link} />}
    </>
  );
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
              {/* 글 고정 주소. 받은 회원은 로그인 후 바로 이 글로 온다. */}
              <DropdownMenuItem onSelect={() => void copyPostLink(post.id)}>
                <Link2 />
                링크 복사
              </DropdownMenuItem>
              {canManage && (
                <>
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-3">
          {collapsible ? <CollapsibleBody>{content}</CollapsibleBody> : content}
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

/** 이미지 묶음. 한 장이면 전체 폭, 여러 장이면 가로로 넘겨 본다. 누르면 원본을 연다. */
function PostImages({ images }: { images: PostImage[] }) {
  const multiple = images.length > 1;
  return (
    <div
      className={cn(
        "min-w-0",
        multiple && "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2",
      )}
      aria-label="게시물 이미지"
    >
      {images.map((image, index) => (
        <ImageViewer key={`${image.path}-${index}`} image={image}>
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
        </ImageViewer>
      ))}
    </div>
  );
}
