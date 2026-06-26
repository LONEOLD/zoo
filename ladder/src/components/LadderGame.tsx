"use client";

import { useState, useCallback } from "react";
import {
  generateLadder,
  LadderData,
  getPlayerColor,
  tracePath,
} from "@/lib/ladder";
import LadderSVG from "./LadderSVG";

const DEFAULT_PLAYERS = ["김철수", "이영희", "박민준", "최수아"];
const DEFAULT_RESULTS = ["1등", "2등", "3등", "꽝"];

type GamePhase = "setup" | "playing" | "done";

export default function LadderGame() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [playerInputs, setPlayerInputs] = useState<string[]>(DEFAULT_PLAYERS);
  const [resultInputs, setResultInputs] = useState<string[]>(DEFAULT_RESULTS);
  const [ladder, setLadder] = useState<LadderData | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [revealedPlayers, setRevealedPlayers] = useState<Set<number>>(
    new Set()
  );
  const [results, setResults] = useState<Map<number, number>>(new Map());
  const [animating, setAnimating] = useState(false);

  const numPlayers = playerInputs.length;

  const addPlayer = () => {
    if (playerInputs.length >= 10) return;
    const newInputs = [...playerInputs, `참가자${playerInputs.length + 1}`];
    setPlayerInputs(newInputs);
    setResultInputs([...resultInputs, `결과${resultInputs.length + 1}`]);
  };

  const removePlayer = (idx: number) => {
    if (playerInputs.length <= 2) return;
    setPlayerInputs(playerInputs.filter((_, i) => i !== idx));
    setResultInputs(resultInputs.filter((_, i) => i !== idx));
  };

  const startGame = () => {
    const players = playerInputs.map((p) => p.trim() || `참가자${playerInputs.indexOf(p) + 1}`);
    const res = resultInputs.map((r) => r.trim() || `결과${resultInputs.indexOf(r) + 1}`);
    const data = generateLadder(players, res);
    setLadder(data);
    setSelectedPlayer(null);
    setRevealedPlayers(new Set());
    setResults(new Map());
    setAnimating(false);
    setPhase("playing");
  };

  const handlePlayerClick = (playerIdx: number) => {
    if (animating || revealedPlayers.has(playerIdx) || !ladder) return;
    setSelectedPlayer(playerIdx);
    setAnimating(true);
  };

  const handleAnimationComplete = useCallback(
    (playerIdx: number, resultIdx: number) => {
      setRevealedPlayers((prev) => {
        const next = new Set([...prev, playerIdx]);
        if (ladder && next.size === ladder.players.length) {
          setPhase("done");
        }
        return next;
      });
      setResults((prev) => new Map([...prev, [playerIdx, resultIdx]]));
      setAnimating(false);
    },
    [ladder]
  );

  const revealAll = () => {
    if (!ladder || animating) return;
    const allPlayers = new Set(ladder.players.map((_, i) => i));
    const newResults = new Map<number, number>();
    ladder.players.forEach((_, i) => {
      const path = tracePath(i, ladder.numRows, ladder.bridges);
      newResults.set(i, path[path.length - 1].col);
    });
    setRevealedPlayers(allPlayers);
    setResults(newResults);
    setSelectedPlayer(null);
    setAnimating(false);
    setPhase("done");
  };

  const reset = () => {
    setPhase("setup");
    setLadder(null);
    setSelectedPlayer(null);
    setRevealedPlayers(new Set());
    setResults(new Map());
    setAnimating(false);
  };

  // Setup phase
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">🪜 사다리타기</h1>
            <p className="text-slate-400 text-sm">참가자와 결과를 입력하고 사다리를 타세요!</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
            {/* Header row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">참가자</div>
              <div className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">결과</div>
            </div>

            {/* Input rows */}
            <div className="space-y-2 mb-4">
              {playerInputs.map((player, i) => (
                <div key={i} className="grid grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <span
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: getPlayerColor(i) }}
                    >
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={player}
                      onChange={(e) => {
                        const next = [...playerInputs];
                        next[i] = e.target.value;
                        setPlayerInputs(next);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      maxLength={10}
                      placeholder={`참가자 ${i + 1}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resultInputs[i] || ""}
                      onChange={(e) => {
                        const next = [...resultInputs];
                        next[i] = e.target.value;
                        setResultInputs(next);
                      }}
                      className="flex-1 px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      maxLength={10}
                      placeholder={`결과 ${i + 1}`}
                    />
                    {playerInputs.length > 2 && (
                      <button
                        onClick={() => removePlayer(i)}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition text-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add player button */}
            {playerInputs.length < 10 && (
              <button
                onClick={addPlayer}
                className="w-full py-2.5 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-400 transition text-sm mb-4"
              >
                + 참가자 추가
              </button>
            )}

            {/* Start button */}
            <button
              onClick={startGame}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition text-lg shadow-lg shadow-blue-900/40"
            >
              사다리 시작!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing / Done phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center p-4 pb-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="text-3xl font-bold text-white mb-1">🪜 사다리타기</h1>
          {phase === "done" ? (
            <p className="text-emerald-400 text-sm font-medium">모든 결과가 공개됐어요!</p>
          ) : animating ? (
            <p className="text-blue-400 text-sm animate-pulse">사다리를 타는 중...</p>
          ) : (
            <p className="text-slate-400 text-sm">참가자를 클릭해서 사다리를 타세요</p>
          )}
        </div>

        {/* Player buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {ladder!.players.map((name, i) => {
            const revealed = revealedPlayers.has(i);
            const isAnimating = selectedPlayer === i && animating;
            const resultIdx = results.get(i);
            return (
              <button
                key={i}
                onClick={() => handlePlayerClick(i)}
                disabled={animating || revealed}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-md
                  ${revealed
                    ? "opacity-70 cursor-default"
                    : animating
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:scale-105 hover:shadow-lg active:scale-95 cursor-pointer"
                  }
                  ${isAnimating ? "ring-2 ring-white scale-105" : ""}
                `}
                style={{
                  backgroundColor: getPlayerColor(i),
                  color: "white",
                  boxShadow: isAnimating
                    ? `0 0 16px ${getPlayerColor(i)}`
                    : undefined,
                }}
              >
                {name}
                {revealed && resultIdx !== undefined && (
                  <span className="ml-1.5 bg-white/20 rounded-full px-2 text-xs">
                    {ladder!.results[resultIdx]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Ladder SVG */}
        <div className="bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700 p-3 mb-4 shadow-xl">
          {ladder && (
            <LadderSVG
              players={ladder.players}
              results={ladder.results}
              bridges={ladder.bridges}
              numRows={ladder.numRows}
              selectedPlayer={selectedPlayer}
              revealedPlayers={revealedPlayers}
              onAnimationComplete={handleAnimationComplete}
            />
          )}
        </div>

        {/* Result summary (done phase) */}
        {phase === "done" && (
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 mb-4">
            <h2 className="text-white font-bold text-lg mb-3 text-center">결과 발표</h2>
            <div className="space-y-2">
              {ladder!.players.map((name, i) => {
                const resultIdx = results.get(i);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: getPlayerColor(i) }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-white font-semibold">{name}</span>
                    </div>
                    <span className="text-slate-200 font-bold text-lg">
                      {resultIdx !== undefined ? ladder!.results[resultIdx] : "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {phase === "playing" && (
            <>
              <button
                onClick={revealAll}
                disabled={animating}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-lg"
              >
                모두 공개
              </button>
              <button
                onClick={startGame}
                disabled={animating}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-semibold rounded-xl transition"
              >
                다시 생성
              </button>
            </>
          )}
          {phase === "done" && (
            <>
              <button
                onClick={startGame}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                다시 하기
              </button>
              <button
                onClick={reset}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition"
              >
                처음으로
              </button>
            </>
          )}
          {phase === "playing" && (
            <button
              onClick={reset}
              disabled={animating}
              className="py-3 px-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-semibold rounded-xl transition"
            >
              처음으로
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
