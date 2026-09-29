"use client";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { ExternalLink, X } from "lucide-react";
import type { PostImage } from "@/lib/types";

/** 아래로 이만큼 끌면 닫는다 (px). */
const CLOSE_DISTANCE = 120;

/**
 * 게시물 이미지 원본 보기. 화면 전체를 어두운 배경으로 쓰고,
 * 벌려서 확대·두 번 탭 확대·끌어서 이동·휠 확대를 지원한다. 원래 크기일 때 아래로 쓸면 닫힌다.
 */
export function ImageViewer({ image, children }: { image: PostImage; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ startY: number; dy: number } | null>(null);

  const setDrag = (dy: number) => {
    const el = stage.current;
    if (!el) return;
    el.style.transform = dy ? `translateY(${dy}px)` : "";
    el.style.opacity = dy ? String(Math.max(0.3, 1 - Math.abs(dy) / 400)) : "";
    el.style.transition = dy ? "none" : "";
  };

  const onTouchStart = (event: TouchEvent) => {
    swipe.current = !zoomed && event.touches.length === 1 ? { startY: event.touches[0].clientY, dy: 0 } : null;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (!swipe.current) return;
    // 두 손가락이 되면 확대 동작이므로 닫기 제스처를 버린다.
    if (event.touches.length > 1) {
      swipe.current = null;
      setDrag(0);
      return;
    }
    swipe.current.dy = event.touches[0].clientY - swipe.current.startY;
    setDrag(Math.max(0, swipe.current.dy));
  };
  const onTouchEnd = (event: TouchEvent) => {
    // 터치 뒤에 따라오는 호환용 마우스 이벤트가 마우스 끌기로 잡혀 두 번 탭 애니메이션을 끊지 않게 막는다.
    if (event.cancelable) event.preventDefault();
    const dy = swipe.current?.dy ?? 0;
    swipe.current = null;
    if (dy > CLOSE_DISTANCE) setOpen(false);
    else setDrag(0);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setZoomed(false);
      }}
    >
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{image.alt}</DialogPrimitive.Title>
          <div
            ref={stage}
            className="size-full transition-[transform,opacity] duration-200"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            <TransformWrapper
              minScale={1}
              maxScale={6}
              centerOnInit
              // 라이브러리의 toggle은 1배에서만 확대로 동작하므로, 확대 중이면 원래 크기로 되돌린다.
              doubleClick={{ mode: zoomed ? "reset" : "zoomIn", step: 1.2 }}
              panning={{ disabled: !zoomed, velocityDisabled: true }}
              onTransform={(_, state) => {
                const next = state.scale > 1.01;
                if (next !== zoomed) setZoomed(next);
              }}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%" }}
                contentClass="flex items-center justify-center"
              >
                <Image
                  unoptimized
                  src={image.src}
                  alt={image.alt}
                  width={2000}
                  height={1200}
                  draggable={false}
                  className="h-auto max-h-dvh w-auto max-w-full select-none object-contain sm:max-h-[90dvh] sm:max-w-[90vw]"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <a
              href={image.src}
              target="_blank"
              rel="noopener"
              className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm text-white/90 hover:bg-white/20"
            >
              <ExternalLink className="size-4" />
              원본
            </a>
            <DialogPrimitive.Close
              className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/10 text-white/90 hover:bg-white/20"
              aria-label="닫기"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <p
            className="pointer-events-none absolute inset-x-0 bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-white/50 transition-opacity data-[hidden=true]:opacity-0"
            data-hidden={zoomed}
            aria-hidden
          >
            <span className="sm:hidden">두 번 탭하거나 벌려서 확대 · 아래로 쓸어서 닫기</span>
            <span className="hidden sm:inline">두 번 클릭하거나 휠로 확대 · Esc로 닫기</span>
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
