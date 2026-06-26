"use client";

import { useEffect, useRef, useState } from "react";
import { Bridge, PathStep, tracePath, getPlayerColor } from "@/lib/ladder";

interface LadderSVGProps {
  players: string[];
  results: string[];
  bridges: Bridge[];
  numRows: number;
  selectedPlayer: number | null;
  revealedPlayers: Set<number>;
  onAnimationComplete: (playerIndex: number, resultIndex: number) => void;
}

const COL_WIDTH = 80;
const ROW_HEIGHT = 36;
const PAD_X = 48;
const PAD_TOP = 48;
const PAD_BOT = 52;

function stepToXY(step: PathStep): [number, number] {
  const x = PAD_X + step.col * COL_WIDTH;
  const y = step.row < 0 ? PAD_TOP : PAD_TOP + step.row * ROW_HEIGHT;
  return [x, y];
}

function stepsToPolylinePoints(steps: PathStep[]): string {
  return steps.map((s) => stepToXY(s).join(",")).join(" ");
}

export default function LadderSVG({
  players,
  results,
  bridges,
  numRows,
  selectedPlayer,
  revealedPlayers,
  onAnimationComplete,
}: LadderSVGProps) {
  const [animSteps, setAnimSteps] = useState<PathStep[]>([]);
  const [shownCount, setShownCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPlayerRef = useRef<number | null>(null);

  const numPlayers = players.length;
  const svgW = (numPlayers - 1) * COL_WIDTH + PAD_X * 2;
  const svgH = numRows * ROW_HEIGHT + PAD_TOP + PAD_BOT;

  const colX = (col: number) => PAD_X + col * COL_WIDTH;
  const rowY = (row: number) => PAD_TOP + row * ROW_HEIGHT;

  useEffect(() => {
    if (
      selectedPlayer === null ||
      selectedPlayer === prevPlayerRef.current
    )
      return;
    prevPlayerRef.current = selectedPlayer;

    if (intervalRef.current) clearInterval(intervalRef.current);

    const steps = tracePath(selectedPlayer, numRows, bridges);
    setAnimSteps(steps);
    setShownCount(1);

    let idx = 1;
    intervalRef.current = setInterval(() => {
      idx++;
      setShownCount(idx);
      if (idx >= steps.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        onAnimationComplete(selectedPlayer, steps[steps.length - 1].col);
      }
    }, 55);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedPlayer, numRows, bridges, onAnimationComplete]);

  return (
    <div className="overflow-x-auto overflow-y-hidden w-full">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="mx-auto block"
      >
        {/* Vertical lines */}
        {players.map((_, i) => (
          <line
            key={`vl-${i}`}
            x1={colX(i)}
            y1={PAD_TOP}
            x2={colX(i)}
            y2={PAD_TOP + numRows * ROW_HEIGHT}
            stroke={revealedPlayers.has(i) ? getPlayerColor(i) : "#475569"}
            strokeWidth={2}
            strokeOpacity={revealedPlayers.has(i) ? 0.5 : 1}
          />
        ))}

        {/* Horizontal bridges */}
        {bridges.map((b, idx) => (
          <line
            key={`br-${idx}`}
            x1={colX(b.col)}
            y1={rowY(b.row)}
            x2={colX(b.col + 1)}
            y2={rowY(b.row)}
            stroke="#64748B"
            strokeWidth={2}
          />
        ))}

        {/* Player name labels (top) */}
        {players.map((name, i) => (
          <g key={`pname-${i}`}>
            <rect
              x={colX(i) - 27}
              y={4}
              width={54}
              height={24}
              rx={5}
              fill={revealedPlayers.has(i) ? getPlayerColor(i) : "#1E293B"}
              opacity={0.9}
            />
            <text
              x={colX(i)}
              y={20}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
            >
              {name.length > 5 ? name.slice(0, 4) + "…" : name}
            </text>
          </g>
        ))}

        {/* Result labels (bottom) */}
        {results.map((result, i) => {
          const owner = Array.from(revealedPlayers).find((p) => {
            const steps = tracePath(p, numRows, bridges);
            return steps[steps.length - 1].col === i;
          });
          return (
            <g key={`res-${i}`}>
              <rect
                x={colX(i) - 27}
                y={svgH - PAD_BOT + 12}
                width={54}
                height={24}
                rx={5}
                fill={owner !== undefined ? getPlayerColor(owner) : "#0F172A"}
                opacity={owner !== undefined ? 0.9 : 0.75}
              />
              <text
                x={colX(i)}
                y={svgH - PAD_BOT + 28}
                textAnchor="middle"
                fill="white"
                fontSize={10}
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                {result.length > 5 ? result.slice(0, 4) + "…" : result}
              </text>
            </g>
          );
        })}

        {/* Revealed static paths */}
        {Array.from(revealedPlayers).map((playerIdx) => {
          if (playerIdx === selectedPlayer) return null;
          const steps = tracePath(playerIdx, numRows, bridges);
          return (
            <polyline
              key={`rpath-${playerIdx}`}
              points={stepsToPolylinePoints(steps)}
              fill="none"
              stroke={getPlayerColor(playerIdx)}
              strokeWidth={3}
              strokeOpacity={0.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Animated path */}
        {animSteps.length > 0 && selectedPlayer !== null && (
          <polyline
            points={stepsToPolylinePoints(animSteps.slice(0, shownCount))}
            fill="none"
            stroke={getPlayerColor(selectedPlayer)}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 5px ${getPlayerColor(selectedPlayer)})`,
            }}
          />
        )}

        {/* End dots for revealed players */}
        {Array.from(revealedPlayers).map((playerIdx) => {
          const steps = tracePath(playerIdx, numRows, bridges);
          const last = steps[steps.length - 1];
          return (
            <circle
              key={`dot-${playerIdx}`}
              cx={colX(last.col)}
              cy={PAD_TOP + numRows * ROW_HEIGHT}
              r={5}
              fill={getPlayerColor(playerIdx)}
            />
          );
        })}
      </svg>
    </div>
  );
}
