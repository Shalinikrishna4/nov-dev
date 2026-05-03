import React, { useEffect, useRef } from 'react';

// Animated mesh gradient backdrop. Pure canvas — no deps, no DOM cost.
export default function MeshBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { x: 0.2, y: 0.3, r: 0.4, color: [139, 92, 246], phase: 0 },
      { x: 0.8, y: 0.2, r: 0.35, color: [34, 211, 238], phase: 1.5 },
      { x: 0.6, y: 0.8, r: 0.45, color: [236, 72, 153], phase: 3 },
      { x: 0.1, y: 0.7, r: 0.3, color: [16, 185, 129], phase: 4.5 },
    ];

    const draw = () => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      t += 0.003;
      blobs.forEach((b) => {
        const cx = (b.x + Math.sin(t + b.phase) * 0.08) * canvas.width;
        const cy = (b.y + Math.cos(t * 0.8 + b.phase) * 0.08) * canvas.height;
        const r = b.r * Math.min(canvas.width, canvas.height);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0.18)`);
        grad.addColorStop(1, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
