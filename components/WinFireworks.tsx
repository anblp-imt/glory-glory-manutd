'use client';
import { useEffect, useRef } from 'react';
import styles from './WinFireworks.module.css';

const COLORS = ['#FFD700', '#DA291C', '#EDE6D6', '#3fae5c', '#C9A227'];
const DURATION_MS = 6200;
const LAUNCH_DELAYS_MS = [0, 400, 800, 1200, 1600, 2000, 2400, 2800];

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Rocket { delay: number; x: number; targetY: number; state: 'wait' | 'rising' | 'burst'; rocketY: number; particles: Particle[] }

export function WinFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const launches: Rocket[] = LAUNCH_DELAYS_MS.map(delay => ({
      delay, x: rand(w * 0.08, w * 0.92), targetY: rand(h * 0.12, h * 0.6), state: 'wait', rocketY: h, particles: [],
    }));

    function burst(l: Rocket) {
      for (let i = 0; i < 60; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(1, 3.5);
        l.particles.push({ x: l.x, y: l.targetY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: pick(COLORS) });
      }
    }

    const start = performance.now();
    let frameId: number;

    function tick(t: number) {
      const elapsed = t - start;
      ctx!.clearRect(0, 0, w, h);
      launches.forEach(l => {
        const local = elapsed - l.delay;
        if (local < 0) return;
        if (l.state === 'wait') l.state = 'rising';
        if (l.state === 'rising') {
          l.rocketY -= 5.5;
          ctx!.fillStyle = '#FFD700';
          ctx!.beginPath();
          ctx!.arc(l.x, l.rocketY, 2, 0, Math.PI * 2);
          ctx!.fill();
          if (l.rocketY <= l.targetY) { l.state = 'burst'; burst(l); }
        } else if (l.state === 'burst') {
          l.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.025; p.life -= 0.014;
            if (p.life <= 0) return;
            ctx!.globalAlpha = Math.max(p.life, 0);
            ctx!.fillStyle = p.color;
            ctx!.beginPath();
            ctx!.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
            ctx!.fill();
          });
          ctx!.globalAlpha = 1;
        }
      });
      if (elapsed < DURATION_MS) {
        frameId = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, w, h);
      }
    }
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return <canvas ref={canvasRef} className={styles.overlay} aria-hidden="true" />;
}
