"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  glow: boolean; // only ~30% of particles glow — see design review note below
}

const COLORS = [
  "192,168,240", // violet-bright
  "196,96,138", // rose
  "112,212,207", // teal-bright
  "232,200,122", // gold
];

// MAX_PARTICLES caps total on-screen count. Design review found that an
// unthrottled ambient stream + glow on every particle produces a hazy
// "film" look across the whole page rather than distinct sparkle.
// Keep this cap, and keep `glow: true` rare (~30%), if adjusting.
const MAX_PARTICLES = 55;
const AMBIENT_INTERVAL_MS = 350;

export default function MagicLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = (x: number, y: number, count: number, burst: boolean) => {
      for (let i = 0; i < count; i++) {
        if (particles.current.length >= MAX_PARTICLES) return;
        const angle = burst ? (Math.PI * 2 * i) / count + Math.random() * 0.3 : Math.random() * Math.PI * 2;
        const speed = burst ? Math.random() * 3 + 1 : Math.random() * 0.5 + 0.1;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (burst ? 1.5 : 0),
          life: 1,
          maxLife: Math.random() * 40 + 25,
          size: Math.random() * 1.8 + 0.6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          glow: burst || Math.random() < 0.3,
        });
      }
    };

    const ambientInterval = setInterval(() => {
      if (particles.current.length >= MAX_PARTICLES) return;
      const x = Math.random() * window.innerWidth;
      const y = window.innerHeight + 8;
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.4 + 0.15),
        life: 1,
        maxLife: Math.random() * 140 + 90,
        size: Math.random() * 1.2 + 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        glow: false, // ambient dust is always plain — glow is reserved for bursts/trail
      });
    }, AMBIENT_INTERVAL_MS);

    let raf: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter((p) => {
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.003;

        const alpha = p.life * 0.8;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (p.glow) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = `rgba(${p.color},0.7)`;
        }
        ctx.fillStyle = `rgba(${p.color},0.9)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onMouseMove = (e: MouseEvent) => {
      if (Math.random() < 0.35) spawn(e.clientX, e.clientY, 1, false);
    };
    const onClick = (e: MouseEvent) => spawn(e.clientX, e.clientY, 14, true);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      clearInterval(ambientInterval);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="glitter-canvas" aria-hidden="true" />
      <div className="nebula-bg" aria-hidden="true" />
    </>
  );
}
