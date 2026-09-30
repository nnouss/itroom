"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { POST_COLLAPSED_HEIGHT, POST_COLLAPSE_THRESHOLD } from "@/lib/constants";

/** 태그를 제외한 피드 본문과 링크 카드를 함께 높이 기준으로 접는다. */
export function CollapsibleBody({ children }: { children: ReactNode }) {
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [shouldCollapse, setShouldCollapse] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || expanded) return;

    // 잘린 바깥 영역이 아니라 전체 높이를 유지하는 내부를 관찰한다.
    // observe 직후의 첫 알림과 이미지 로드·폭 변경 알림에서 모두 판단한다.
    const observer = new ResizeObserver(([entry]) => {
      setShouldCollapse(entry.contentRect.height > POST_COLLAPSE_THRESHOLD);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [expanded]);

  useEffect(() => {
    if (expanded) bodyRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  const collapsed = !expanded && shouldCollapse === true;
  const maxHeight = expanded || shouldCollapse === false
    ? undefined
    : collapsed ? POST_COLLAPSED_HEIGHT : POST_COLLAPSE_THRESHOLD;

  return (
    <div className="min-w-0">
      <div
        id={bodyId}
        ref={bodyRef}
        tabIndex={-1}
        className="relative min-w-0 outline-none"
        // SSR·측정 전에도 720px로 제한해 긴 본문 전체가 먼저 보이지 않게 한다.
        style={{ maxHeight, overflow: maxHeight === undefined ? undefined : "hidden" }}
      >
        <div ref={contentRef} className="flow-root min-w-0 space-y-3">
          {children}
        </div>
        {collapsed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(to bottom, transparent, var(--canvas))" }}
          />
        )}
      </div>
      {collapsed && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded(true)}
            className="type-body-sm inline-flex h-9 items-center justify-center gap-2 rounded-full font-medium text-text-muted hover:text-ink focus-visible:underline active:opacity-80 motion-safe:transition-opacity motion-safe:duration-[120ms]"
          >
            더보기
            <ChevronDown aria-hidden="true" className="size-4 text-current" />
          </button>
        </div>
      )}
    </div>
  );
}
