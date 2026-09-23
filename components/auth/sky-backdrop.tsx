"use client";
import { useEffect, useRef, useState } from "react";
import { SkyFluid } from "@/lib/sky-fluid";

/**
 * 인증 화면 배경: 노을 하늘 유체. 포인터가 지나가면 하늘 색이 휘말려 섞인다.
 * WebGL2가 없으면 CSS 그라데이션, 움직임 줄이기면 정지된 하늘 한 장.
 */
export function SkyBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fluid = SkyFluid.create(canvas, { mobile: window.matchMedia("(max-width: 767px)").matches });
    if (!fluid) return;
    const frame = requestAnimationFrame(() => setLive(true));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fluid.renderStatic();
      return () => {
        cancelAnimationFrame(frame);
        fluid.dispose();
      };
    }
    fluid.start();
    const onMove = (e: PointerEvent) => fluid.pointerMove(e.clientX, e.clientY);
    const onVisibility = () => (document.visibilityState === "visible" ? fluid.start() : fluid.stop());
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      fluid.dispose();
    };
  }, []);

  return (
    <div aria-hidden="true" className="sky-backdrop">
      <canvas ref={canvasRef} className="sky-canvas" data-live={live} />
    </div>
  );
}
