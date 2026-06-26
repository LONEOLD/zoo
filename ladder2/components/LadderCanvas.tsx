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
const LINE_WIDTH = 3;

export default function LadderCanvas({
  config,
  tracePlayerIndex,
  revealedPlayers,
  resultMap,
  onAnimationEnd,
}: LadderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const { players, results, rungs } = config;
  const cols = players.length;
  const rows = rungs.length;

  const W = PADDING_X * 2 + COL_GAP * (cols - 1);
  const H = PADDING_Y * 2 + ROW_GAP * rows;

  // Reverse map: resultCol -> playerIdx
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

  function drawBase(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);
    // Vertical lines
    for (let c = 0; c < cols; c++) {
      ctx.beginPath();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.moveTo(colX(c), rowY(0));
      ctx.lineTo(colX(c), rowY(rows));
      ctx.stroke();
    }
    // Horizontal rungs
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        if (rungs[r][c]) {
          ctx.beginPath();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = LINE_WIDTH;
          ctx.lineCap = 'round';
          ctx.moveTo(colX(c), rowY(r) + ROW_GAP / 2);
          ctx.lineTo(colX(c + 1), rowY(r) + ROW_GAP / 2);
          ctx.stroke();
        }
      }
    }
  }

  function drawRevealedPaths(ctx: CanvasRenderingContext2D) {
    for (const pIdx of revealedPlayers) {
      const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
      const points = buildPathPoints(pIdx);
      if (points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawLabels(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let c = 0; c < cols; c++) {
      const color = PLAYER_COLORS[c % PLAYER_COLORS.length];
      const px = colX(c);
      const py = rowY(0) - 24;
      const name = players[c].slice(0, 6);
      const nameWidth = Math.max(56, ctx.measureText(name).width + 20);

      // Player name bubble
      ctx.fillStyle = color + '28';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      roundRect(ctx, px - nameWidth / 2, py - 13, nameWidth, 26, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(name, px, py);

      // Result bubble
      const rx = colX(c);
      const ry = rowY(rows) + 24;
      // Who ends up at result column c?
      const ownerPlayerIdx = reverseMap[c];
      const isRevealed = ownerPlayerIdx !== undefined && revealedPlayers.includes(ownerPlayerIdx);

      if (isRevealed) {
        const resultText = results[c]?.slice(0, 6) ?? '';
        const rw = Math.max(56, ctx.measureText(resultText).width + 20);
        const ownerColor = PLAYER_COLORS[ownerPlayerIdx % PLAYER_COLORS.length];
        ctx.fillStyle = ownerColor + '28';
        ctx.strokeStyle = ownerColor;
        ctx.lineWidth = 2;
        roundRect(ctx, rx - rw / 2, ry - 13, rw, 26, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ownerColor;
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(resultText, rx, ry);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        roundRect(ctx, rx - 28, ry - 13, 56, 26, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('?', rx, ry);
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animRef.current) cancelAnimationFrame(animRef.current);

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

    const DURATION = 1300;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const drawn = totalLen * progress;

      drawBase(ctx!);
      drawRevealedPaths(ctx!);

      // Animated trace line
      ctx!.save();
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 5;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      ctx!.shadowColor = color;
      ctx!.shadowBlur = 10;
      ctx!.beginPath();

      let remaining = drawn;
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < segLens.length; i++) {
        if (remaining <= 0) break;
        const from = points[i];
        const to = points[i + 1];
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

      // Glowing dot at current position
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
      ctx!.beginPath();
      ctx!.arc(dotX, dotY, 7, 0, Math.PI * 2);
      ctx!.fillStyle = color;
      ctx!.shadowBlur = 16;
      ctx!.fill();
      ctx!.restore();

      drawLabels(ctx!);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onAnimationEnd?.();
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracePlayerIndex, revealedPlayers]);

  // Static redraw when config/revealed changes
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
