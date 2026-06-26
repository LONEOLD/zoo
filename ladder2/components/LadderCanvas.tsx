'use client';

import { useEffect, useRef } from 'react';
import { LadderConfig, PLAYER_COLORS } from '@/lib/ladder';

interface LadderCanvasProps {
  config: LadderConfig;
  tracePlayerIndex: number | null;
  revealedPlayers: number[];
  resultMap: Record<number, number>;
  onAnimationEnd?: () => void;
}

const COL_GAP = 88;
const ROW_GAP = 54;
const PADDING_X = 54;
const PADDING_Y = 64;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;   // 0→1, 1=fresh
  size: number;
  color: string;
}

export default function LadderCanvas({
  config,
  tracePlayerIndex,
  revealedPlayers,
  resultMap,
  onAnimationEnd,
}: LadderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const { players, results, rungs } = config;
  const cols = players.length;
  const rows = rungs.length;

  const W = PADDING_X * 2 + COL_GAP * (cols - 1);
  const H = PADDING_Y * 2 + ROW_GAP * rows;

  // Reverse map: resultCol → playerIdx
  const reverseMap: Record<number, number> = {};
  Object.entries(resultMap).forEach(([pIdx, rIdx]) => {
    reverseMap[rIdx] = Number(pIdx);
  });

  function colX(col: number) { return PADDING_X + col * COL_GAP; }
  function rowY(row: number) { return PADDING_Y + row * ROW_GAP; }

  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function buildPathPoints(startPlayerCol: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    let col = startPlayerCol;
    points.push({ x: colX(col), y: rowY(0) });
    for (let row = 0; row < rows; row++) {
      const midY = rowY(row) + ROW_GAP / 2;
      if (col > 0 && rungs[row][col - 1]) {
        points.push({ x: colX(col), y: midY });
        points.push({ x: colX(col - 1), y: midY });
        col--;
      } else if (col < cols - 1 && rungs[row][col]) {
        points.push({ x: colX(col), y: midY });
        points.push({ x: colX(col + 1), y: midY });
        col++;
      } else {
        points.push({ x: colX(col), y: midY });
      }
    }
    points.push({ x: colX(col), y: rowY(rows) });
    return points;
  }

  // ── Neon ladder base ──────────────────────────────────────────────────────
  function drawBase(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);

    // Subtle dark grid background
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // Vertical neon lines — each column has its own player color
    for (let c = 0; c < cols; c++) {
      const color = PLAYER_COLORS[c % PLAYER_COLORS.length];
      const x = colX(c);

      // Outer soft glow
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.12;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(x, rowY(0));
      ctx.lineTo(x, rowY(rows));
      ctx.stroke();
      ctx.restore();

      // Inner bright line
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x, rowY(0));
      ctx.lineTo(x, rowY(rows));
      ctx.stroke();
      ctx.restore();
    }

    // Horizontal rungs — white-ish neon
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (!rungs[r][c]) continue;
        const y = rowY(r) + ROW_GAP / 2;
        const x1 = colX(c), x2 = colX(c + 1);

        // Glow
        ctx.save();
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.15;
        ctx.shadowColor = '#a5b4fc';
        ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        ctx.restore();

        // Core
        ctx.save();
        ctx.strokeStyle = '#c7d2fe';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Already-revealed path overlays ───────────────────────────────────────
  function drawRevealedPaths(ctx: CanvasRenderingContext2D) {
    for (const pIdx of revealedPlayers) {
      const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
      const points = buildPathPoints(pIdx);
      if (points.length < 2) continue;

      // Glow layer
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.restore();

      // Core line
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  function drawLabels(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let c = 0; c < cols; c++) {
      const color = PLAYER_COLORS[c % PLAYER_COLORS.length];

      // Player name
      const px = colX(c), py = rowY(0) - 24;
      const name = players[c].slice(0, 6);
      ctx.font = 'bold 12px system-ui, sans-serif';
      const nameWidth = Math.max(56, ctx.measureText(name).width + 20);

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color + '22';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      roundRect(ctx, px - nameWidth / 2, py - 13, nameWidth, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(name, px, py);
      ctx.restore();

      // Result
      const rx = colX(c), ry = rowY(rows) + 24;
      const ownerPlayerIdx = reverseMap[c];
      const isRevealed = ownerPlayerIdx !== undefined && revealedPlayers.includes(ownerPlayerIdx);

      if (isRevealed) {
        const resultText = results[c]?.slice(0, 6) ?? '';
        const ownerColor = PLAYER_COLORS[ownerPlayerIdx % PLAYER_COLORS.length];
        ctx.font = 'bold 12px system-ui, sans-serif';
        const rw = Math.max(56, ctx.measureText(resultText).width + 20);

        ctx.save();
        ctx.shadowColor = ownerColor;
        ctx.shadowBlur = 16;
        ctx.fillStyle = ownerColor + '22';
        ctx.strokeStyle = ownerColor;
        ctx.lineWidth = 1.5;
        roundRect(ctx, rx - rw / 2, ry - 13, rw, 26, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(resultText, rx, ry);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        roundRect(ctx, rx - 28, ry - 13, 56, 26, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('?', rx, ry);
        ctx.restore();
      }
    }
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function spawnParticles(x: number, y: number, color: string) {
    const particles = particlesRef.current;
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.2;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 1,
        size: 2 + Math.random() * 3,
        color,
      });
    }
    // Keep pool bounded
    if (particles.length > 300) particles.splice(0, particles.length - 300);
  }

  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= 0.035;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Animation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    particlesRef.current = [];

    if (tracePlayerIndex === null) {
      drawBase(ctx);
      drawRevealedPaths(ctx);
      drawLabels(ctx);
      return;
    }

    const color = PLAYER_COLORS[tracePlayerIndex % PLAYER_COLORS.length];
    const points = buildPathPoints(tracePlayerIndex);

    let totalLen = 0;
    const segLens: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segLens.push(len);
      totalLen += len;
    }

    const DURATION = 1400;
    const startTime = performance.now();
    let lastDotX = points[0].x, lastDotY = points[0].y;
    let spawnCounter = 0;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);

      // Ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const drawn = totalLen * eased;

      drawBase(ctx!);
      drawRevealedPaths(ctx!);

      // Draw the completed trace so far
      ctx!.save();
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 4;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.shadowColor = color;
      ctx!.shadowBlur = 12;
      ctx!.beginPath();
      let remaining = drawn;
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < segLens.length; i++) {
        if (remaining <= 0) break;
        const from = points[i], to = points[i + 1];
        if (remaining >= segLens[i]) {
          ctx!.lineTo(to.x, to.y);
          remaining -= segLens[i];
        } else {
          const t = remaining / segLens[i];
          ctx!.lineTo(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
          break;
        }
      }
      ctx!.stroke();
      ctx!.restore();

      // Current dot position
      let distSoFar = drawn;
      let dotX = points[0].x, dotY = points[0].y;
      for (let i = 0; i < segLens.length; i++) {
        if (distSoFar <= segLens[i]) {
          const t = distSoFar / segLens[i];
          dotX = points[i].x + (points[i + 1].x - points[i].x) * t;
          dotY = points[i].y + (points[i + 1].y - points[i].y) * t;
          break;
        }
        distSoFar -= segLens[i];
      }

      // Spawn particles at dot position every few frames
      spawnCounter++;
      if (spawnCounter % 2 === 0) {
        spawnParticles(dotX, dotY, color);
      }
      lastDotX = dotX; lastDotY = dotY;

      updateAndDrawParticles(ctx!);

      // Glowing dot — triple layer
      ctx!.save();
      // Outer halo
      const grad = ctx!.createRadialGradient(dotX, dotY, 0, dotX, dotY, 18);
      grad.addColorStop(0, color + 'cc');
      grad.addColorStop(1, color + '00');
      ctx!.fillStyle = grad;
      ctx!.beginPath(); ctx!.arc(dotX, dotY, 18, 0, Math.PI * 2); ctx!.fill();
      // Mid glow
      ctx!.shadowColor = color;
      ctx!.shadowBlur = 20;
      ctx!.fillStyle = color + 'aa';
      ctx!.beginPath(); ctx!.arc(dotX, dotY, 9, 0, Math.PI * 2); ctx!.fill();
      // Core
      ctx!.shadowBlur = 8;
      ctx!.fillStyle = '#ffffff';
      ctx!.beginPath(); ctx!.arc(dotX, dotY, 4.5, 0, Math.PI * 2); ctx!.fill();
      ctx!.restore();

      drawLabels(ctx!);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Burst of particles at end
        for (let i = 0; i < 3; i++) spawnParticles(lastDotX, lastDotY, color);
        onAnimationEnd?.();
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracePlayerIndex, revealedPlayers]);

  // Static redraw
  useEffect(() => {
    if (tracePlayerIndex !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBase(ctx);
    drawRevealedPaths(ctx);
    drawLabels(ctx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, revealedPlayers, resultMap]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="max-w-full"
    />
  );
}
