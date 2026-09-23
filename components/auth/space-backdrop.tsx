"use client";
import { useEffect, useRef } from "react";

/**
 * 인증 화면 배경. 원근 투영한 별 필드(캔버스) + 성운 광원 + 바닥 그리드.
 * prefers-reduced-motion 이면 정지 화면만 그린다. 탭이 숨겨지면 멈춘다.
 */
export function SpaceBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;

    type Star = { x: number; y: number; z: number; pz: number; hue: number };
    const COUNT = 760;
    const DEPTH = 1400;
    const stars: Star[] = [];
    const spawn = (star?: Star): Star => {
      const s = star ?? ({} as Star);
      s.x = (Math.random() - 0.5) * width * 2.4;
      s.y = (Math.random() - 0.5) * height * 2.4;
      s.z = star ? DEPTH : Math.random() * DEPTH;
      s.pz = s.z;
      s.hue = Math.random() < 0.15 ? 210 : Math.random() < 0.5 ? 0 : 190;
      return s;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stars.length === 0) for (let i = 0; i < COUNT; i++) stars.push(spawn());
    };

    const draw = (speed: number) => {
      ctx.fillStyle = "rgba(6, 8, 14, 0.34)";
      ctx.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * 0.42;
      const focal = Math.min(width, height) * 0.9;
      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed;
        if (s.z < 8) spawn(s);
        const k = focal / s.z;
        const pk = focal / s.pz;
        const x = cx + s.x * k;
        const y = cy + s.y * k;
        const px = cx + s.x * pk;
        const py = cy + s.y * pk;
        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;
        const depth = 1 - s.z / DEPTH;
        const size = Math.max(0.5, depth * 2.6);
        const alpha = Math.min(1, depth * 1.4);
        const color =
          s.hue === 0
            ? `rgba(255,255,255,${alpha})`
            : s.hue === 210
              ? `rgba(120,170,255,${alpha})`
              : `rgba(140,235,255,${alpha})`;
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    };

    const loop = () => {
      if (!running) return;
      draw(3.8);
      frame = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      running = document.visibilityState === "visible" && !reduced;
      if (running) frame = requestAnimationFrame(loop);
      else cancelAnimationFrame(frame);
    };

    resize();
    ctx.fillStyle = "#06080e";
    ctx.fillRect(0, 0, width, height);
    if (reduced) {
      // 정지 화면: 짧은 궤적이 남도록 몇 프레임만 그린다.
      for (let i = 0; i < 6; i++) draw(2);
      running = false;
    } else {
      frame = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden="true" className="space-backdrop">
      <canvas ref={canvasRef} className="space-stars" />
      <div className="space-nebula space-nebula-a" />
      <div className="space-nebula space-nebula-b" />
      <div className="space-nebula space-nebula-c" />
      <div className="space-planet">
        <div className="space-planet-ring" />
      </div>
      <div className="space-horizon">
        <div className="space-grid" />
      </div>
      <div className="space-vignette" />
    </div>
  );
}
