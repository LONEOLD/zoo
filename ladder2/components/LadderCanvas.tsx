'use client';

import { useEffect, useRef } from 'react';
import { LadderConfig, PLAYER_COLORS } from '@/lib/ladder';

interface LadderCanvasProps {
  config: LadderConfig;
  tracePlayerIndex: number | null;
  revealedPlayers: number[];
  resultMap: Record<number, number>;
  isDark: boolean;
  onAnimationEnd?: () => void;
}

const COL_GAP = 88;
const ROW_GAP = 54;
const PADDING_X = 54;
const PADDING_Y = 64;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  size: number;
  color: string;
}

export default function LadderCanvas({
  config, tracePlayerIndex, revealedPlayers, resultMap, isDark, onAnimationEnd,
}: LadderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const { players, results, rungs } = config;
  const cols = players.length;
  const rows = rungs.length;
  const W = PADDING_X * 2 + COL_GAP * (cols - 1);
  const H = PADDING_Y * 2 + ROW_GAP * rows;

  const reverseMap: Record<number, number> = {};
  Object.entries(resultMap).forEach(([pIdx, rIdx]) => { reverseMap[rIdx] = Number(pIdx); });

  const colX = (col: number) => PADDING_X + col * COL_GAP;
  const rowY = (row: number) => PADDING_Y + row * ROW_GAP;

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function buildPathPoints(startCol: number): Array<{ x: number; y: number }> {
    const pts: Array<{ x: number; y: number }> = [];
    let col = startCol;
    pts.push({ x: colX(col), y: rowY(0) });
    for (let row = 0; row < rows; row++) {
      const midY = rowY(row) + ROW_GAP / 2;
      if (col > 0 && rungs[row][col - 1]) {
        pts.push({ x: colX(col), y: midY }, { x: colX(col - 1), y: midY });
        col--;
      } else if (col < cols - 1 && rungs[row][col]) {
        pts.push({ x: colX(col), y: midY }, { x: colX(col + 1), y: midY });
        col++;
      } else {
        pts.push({ x: colX(col), y: midY });
      }
    }
    pts.push({ x: colX(col), y: rowY(rows) });
    return pts;
  }

  function drawBase(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);

    // Subtle grid
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(139,92,246,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    // Vertical lines
    for (let c = 0; c < cols; c++) {
      const color = PLAYER_COLORS[c % PLAYER_COLORS.length];
      const x = colX(c);
      if (isDark) {
        // Outer glow
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.globalAlpha = 0.12; ctx.shadowColor = color; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.moveTo(x, rowY(0)); ctx.lineTo(x, rowY(rows)); ctx.stroke();
        ctx.restore();
        // Core
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.globalAlpha = 0.72; ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(x, rowY(0)); ctx.lineTo(x, rowY(rows)); ctx.stroke();
        ctx.restore();
      } else {
        // Light mode: crisp pastel line
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.globalAlpha = 0.55; ctx.shadowColor = color; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.moveTo(x, rowY(0)); ctx.lineTo(x, rowY(rows)); ctx.stroke();
        ctx.restore();
      }
    }

    // Horizontal rungs
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (!rungs[r][c]) continue;
        const y = rowY(r) + ROW_GAP / 2;
        if (isDark) {
          ctx.save();
          ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.globalAlpha = 0.14; ctx.shadowColor = '#a5b4fc'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.moveTo(colX(c), y); ctx.lineTo(colX(c + 1), y); ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = '#c7d2fe'; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.globalAlpha = 0.85; ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.moveTo(colX(c), y); ctx.lineTo(colX(c + 1), y); ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.globalAlpha = 0.45;
          ctx.beginPath(); ctx.moveTo(colX(c), y); ctx.lineTo(colX(c + 1), y); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  function drawRevealedPaths(ctx: CanvasRenderingContext2D) {
    for (const pIdx of revealedPlayers) {
      const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
      const pts = buildPathPoints(pIdx);
      if (pts.length < 2) continue;
      if (isDark) {
        ctx.save();
        ctx.globalAlpha = 0.2; ctx.strokeStyle = color; ctx.lineWidth = 10;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke(); ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = isDark ? 0.58 : 0.65;
      ctx.strokeStyle = color; ctx.lineWidth = isDark ? 3.5 : 3;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (isDark) { ctx.shadowColor = color; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.restore();
    }
  }

  function drawLabels(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "bold 12px 'Cafe24 Surround', system-ui, sans-serif";

    const labelText = isDark ? '#ffffff' : '#2e1065';
    const questionColor = isDark ? '#64748b' : '#a78bfa';
    const questionBg = isDark ? '#1e293b' : '#f5f0ff';
    const questionBorder = isDark ? '#334155' : '#ddd6fe';

    for (let c = 0; c < cols; c++) {
      const color = PLAYER_COLORS[c % PLAYER_COLORS.length];
      const px = colX(c), py = rowY(0) - 24;
      const name = players[c].slice(0, 6);
      const nameWidth = Math.max(56, ctx.measureText(name).width + 22);

      ctx.save();
      if (isDark) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
      ctx.fillStyle = color + (isDark ? '22' : '28');
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      roundRect(ctx, px - nameWidth / 2, py - 13, nameWidth, 26, 10);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = labelText;
      ctx.fillText(name, px, py);
      ctx.restore();

      const rx = colX(c), ry = rowY(rows) + 24;
      const ownerPlayerIdx = reverseMap[c];
      const isRevealed = ownerPlayerIdx !== undefined && revealedPlayers.includes(ownerPlayerIdx);

      if (isRevealed) {
        const ownerColor = PLAYER_COLORS[ownerPlayerIdx % PLAYER_COLORS.length];
        const txt = results[c]?.slice(0, 6) ?? '';
        const rw = Math.max(56, ctx.measureText(txt).width + 22);
        ctx.save();
        if (isDark) { ctx.shadowColor = ownerColor; ctx.shadowBlur = 14; }
        ctx.fillStyle = ownerColor + (isDark ? '22' : '28');
        ctx.strokeStyle = ownerColor; ctx.lineWidth = 1.5;
        roundRect(ctx, rx - rw / 2, ry - 13, rw, 26, 10);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = labelText;
        ctx.fillText(txt, rx, ry);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = questionBg; ctx.strokeStyle = questionBorder; ctx.lineWidth = 1.5;
        roundRect(ctx, rx - 28, ry - 13, 56, 26, 10);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = questionColor;
        ctx.font = "14px 'Cafe24 Surround', system-ui";
        ctx.fillText('?', rx, ry);
        ctx.restore();
      }
    }
  }

  function spawnParticles(x: number, y: number, color: string) {
    const pts = particlesRef.current;
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.2;
      pts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.5, life: 1, size: 2 + Math.random() * 3, color });
    }
    if (pts.length > 280) pts.splice(0, pts.length - 280);
  }

  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life -= 0.035; p.x += p.vx; p.y += p.vy; p.vy += 0.05;
      if (p.life <= 0) { particlesRef.current.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life * (isDark ? 0.9 : 0.7);
      ctx.fillStyle = p.color;
      if (isDark) { ctx.shadowColor = p.color; ctx.shadowBlur = 6; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    particlesRef.current = [];

    if (tracePlayerIndex === null) {
      drawBase(ctx); drawRevealedPaths(ctx); drawLabels(ctx);
      return;
    }

    const color = PLAYER_COLORS[tracePlayerIndex % PLAYER_COLORS.length];
    const pts = buildPathPoints(tracePlayerIndex);
    let totalLen = 0;
    const segLens: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
      const len = Math.sqrt(dx*dx + dy*dy);
      segLens.push(len); totalLen += len;
    }

    const DURATION = 1400;
    const start = performance.now();
    let spawnTick = 0;

    function animate(now: number) {
      const p = Math.min((now - start) / DURATION, 1);
      const eased = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
      const drawn = totalLen * eased;

      drawBase(ctx!); drawRevealedPaths(ctx!);

      // Trace line
      ctx!.save();
      ctx!.strokeStyle = color; ctx!.lineWidth = 4;
      ctx!.lineCap = 'round'; ctx!.lineJoin = 'round';
      if (isDark) { ctx!.shadowColor = color; ctx!.shadowBlur = 12; }
      ctx!.beginPath();
      let rem = drawn; ctx!.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < segLens.length; i++) {
        if (rem <= 0) break;
        const from = pts[i], to = pts[i+1];
        if (rem >= segLens[i]) { ctx!.lineTo(to.x, to.y); rem -= segLens[i]; }
        else { const t = rem/segLens[i]; ctx!.lineTo(from.x+(to.x-from.x)*t, from.y+(to.y-from.y)*t); break; }
      }
      ctx!.stroke(); ctx!.restore();

      // Dot position
      let distLeft = drawn, dotX = pts[0].x, dotY = pts[0].y;
      for (let i = 0; i < segLens.length; i++) {
        if (distLeft <= segLens[i]) {
          const t = distLeft/segLens[i];
          dotX = pts[i].x+(pts[i+1].x-pts[i].x)*t;
          dotY = pts[i].y+(pts[i+1].y-pts[i].y)*t;
          break;
        }
        distLeft -= segLens[i];
      }

      if (++spawnTick % 2 === 0) spawnParticles(dotX, dotY, color);
      updateAndDrawParticles(ctx!);

      // Glowing dot
      ctx!.save();
      if (isDark) {
        const grad = ctx!.createRadialGradient(dotX, dotY, 0, dotX, dotY, 18);
        grad.addColorStop(0, color+'cc'); grad.addColorStop(1, color+'00');
        ctx!.fillStyle = grad; ctx!.beginPath(); ctx!.arc(dotX, dotY, 18, 0, Math.PI*2); ctx!.fill();
        ctx!.shadowColor = color; ctx!.shadowBlur = 20;
        ctx!.fillStyle = color+'aa'; ctx!.beginPath(); ctx!.arc(dotX, dotY, 9, 0, Math.PI*2); ctx!.fill();
      }
      ctx!.shadowBlur = isDark ? 8 : 4;
      ctx!.fillStyle = isDark ? '#ffffff' : color;
      ctx!.beginPath(); ctx!.arc(dotX, dotY, isDark ? 4.5 : 6, 0, Math.PI*2); ctx!.fill();
      ctx!.restore();

      drawLabels(ctx!);

      if (p < 1) { animRef.current = requestAnimationFrame(animate); }
      else { onAnimationEnd?.(); }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracePlayerIndex, revealedPlayers, isDark]);

  useEffect(() => {
    if (tracePlayerIndex !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBase(ctx); drawRevealedPaths(ctx); drawLabels(ctx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, revealedPlayers, resultMap, isDark]);

  return <canvas ref={canvasRef} width={W} height={H} className="max-w-full" />;
}
