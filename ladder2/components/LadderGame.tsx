'use client';

import React, { useState } from 'react';
import {
  LadderConfig,
  generateLadder,
  traceAll,
  PLAYER_COLORS,
} from '@/lib/ladder';
import LadderCanvas from './LadderCanvas';

type Phase = 'setup' | 'game' | 'done';

const DEFAULT_PLAYERS = ['참가자1', '참가자2', '참가자3', '참가자4'];
const DEFAULT_RESULTS = ['1등', '2등', '3등', '꼴등'];

export default function LadderGame() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);
  const [results, setResults] = useState<string[]>(DEFAULT_RESULTS);
  const [config, setConfig] = useState<LadderConfig | null>(null);
  const [resultMap, setResultMap] = useState<Record<number, number>>({});

  const [tracePlayerIdx, setTracePlayerIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const count = players.length;

  function handlePlayerChange(idx: number, val: string) {
    setPlayers(prev => prev.map((p, i) => (i === idx ? val : p)));
  }
  function handleResultChange(idx: number, val: string) {
    setResults(prev => prev.map((r, i) => (i === idx ? val : r)));
  }
  function addPlayer() {
    if (count >= 8) return;
    setPlayers(prev => [...prev, `참가자${prev.length + 1}`]);
    setResults(prev => [...prev, `결과${prev.length + 1}`]);
  }
  function removePlayer() {
    if (count <= 2) return;
    setPlayers(prev => prev.slice(0, -1));
    setResults(prev => prev.slice(0, -1));
  }

  function startGame() {
    const rungs = generateLadder(count);
    const cfg: LadderConfig = { players: [...players], results: [...results], rungs };
    const traces = traceAll(cfg);
    const map: Record<number, number> = {};
    traces.forEach(t => { map[t.playerIndex] = t.resultIndex; });
    setConfig(cfg);
    setResultMap(map);
    setRevealed([]);
    setTracePlayerIdx(null);
    setIsAnimating(false);
    setPhase('game');
  }

  function handlePlayerClick(idx: number) {
    if (isAnimating || revealed.includes(idx) || !config) return;
    setTracePlayerIdx(idx);
    setIsAnimating(true);
  }

  function handleAnimationEnd() {
    if (tracePlayerIdx === null || !config) return;
    const pIdx = tracePlayerIdx;
    setRevealed(prev => {
      const next = [...prev, pIdx];
      if (next.length === config.players.length) setPhase('done');
      return next;
    });
    setIsAnimating(false);
    setTracePlayerIdx(null);
  }

  function revealAll() {
    if (!config || isAnimating) return;
    setRevealed(config.players.map((_, i) => i));
    setTracePlayerIdx(null);
    setIsAnimating(false);
    setPhase('done');
  }

  function resetGame() {
    setPhase('setup');
    setConfig(null);
    setRevealed([]);
    setTracePlayerIdx(null);
    setIsAnimating(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="py-4 px-4 text-center border-b border-slate-800">
        <h1 className="text-2xl font-bold text-indigo-400 tracking-wide">사다리타기</h1>
        <p className="text-slate-400 text-sm mt-1">
          {phase === 'setup'
            ? '참가자와 결과를 입력하세요'
            : phase === 'game'
            ? '참가자 이름을 클릭해서 결과를 확인하세요'
            : '모든 결과가 공개되었습니다!'}
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-6">
        {phase === 'setup' && (
          <SetupPanel
            players={players}
            results={results}
            onPlayerChange={handlePlayerChange}
            onResultChange={handleResultChange}
            onAdd={addPlayer}
            onRemove={removePlayer}
            onStart={startGame}
          />
        )}

        {(phase === 'game' || phase === 'done') && config && (
          <>
            {/* Player buttons */}
            <div className="w-full max-w-2xl">
              <div className="flex gap-2 flex-wrap justify-center mb-4">
                {config.players.map((name, idx) => {
                  const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                  const done = revealed.includes(idx);
                  const active = tracePlayerIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handlePlayerClick(idx)}
                      disabled={isAnimating || done}
                      style={{
                        borderColor: color,
                        color: done ? '#64748b' : color,
                        backgroundColor: active ? color + '33' : 'transparent',
                      }}
                      className={[
                        'px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all',
                        done ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer',
                        active ? 'scale-105' : '',
                      ].join(' ')}
                    >
                      {name}{done && ' ✓'}
                    </button>
                  );
                })}
              </div>

              {/* Canvas */}
              <div className="overflow-x-auto flex justify-center rounded-xl bg-slate-800/60 p-4 border border-slate-700">
                <LadderCanvas
                  config={config}
                  tracePlayerIndex={tracePlayerIdx}
                  revealedPlayers={revealed}
                  resultMap={resultMap}
                  onAnimationEnd={handleAnimationEnd}
                />
              </div>
            </div>

            {/* Results summary */}
            {revealed.length > 0 && (
              <div className="w-full max-w-2xl fade-in-up">
                <h2 className="text-base font-bold text-slate-300 mb-3 text-center">결과 현황</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {revealed.map(pIdx => {
                    const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
                    const rIdx = resultMap[pIdx];
                    return (
                      <div
                        key={pIdx}
                        className="rounded-xl p-3 text-center border fade-in-up"
                        style={{ borderColor: color, backgroundColor: color + '15' }}
                      >
                        <p className="font-bold text-sm" style={{ color }}>{config.players[pIdx]}</p>
                        <p className="text-xs text-slate-500 my-0.5">→</p>
                        <p className="font-bold text-base text-white">{config.results[rIdx]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap justify-center">
              {phase === 'game' && (
                <button
                  onClick={revealAll}
                  disabled={isAnimating}
                  className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-colors disabled:opacity-50"
                >
                  전체 공개
                </button>
              )}
              <button
                onClick={startGame}
                disabled={isAnimating}
                className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                다시 섞기
              </button>
              <button
                onClick={resetGame}
                disabled={isAnimating}
                className="px-6 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition-colors disabled:opacity-50"
              >
                처음으로
              </button>
            </div>

            {phase === 'done' && (
              <p className="text-emerald-400 font-bold text-lg fade-in-up animate-bounce">
                🎉 모든 결과 공개!
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface SetupPanelProps {
  players: string[];
  results: string[];
  onPlayerChange: (idx: number, val: string) => void;
  onResultChange: (idx: number, val: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  onStart: () => void;
}

function SetupPanel({ players, results, onPlayerChange, onResultChange, onAdd, onRemove, onStart }: SetupPanelProps) {
  const count = players.length;
  return (
    <div className="w-full max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-slate-300 font-semibold">참가자 {count}명</span>
        <div className="flex gap-2">
          <button
            onClick={onRemove}
            disabled={count <= 2}
            className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl disabled:opacity-40 transition-colors"
          >
            −
          </button>
          <button
            onClick={onAdd}
            disabled={count >= 8}
            className="w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider col-span-1">참가자</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider col-span-1">결과</p>
        {players.map((player, idx) => {
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          return (
            <React.Fragment key={idx}>
              <input
                type="text"
                value={player}
                onChange={e => onPlayerChange(idx, e.target.value)}
                placeholder={`참가자${idx + 1}`}
                maxLength={8}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
              <input
                type="text"
                value={results[idx]}
                onChange={e => onResultChange(idx, e.target.value)}
                placeholder={`결과${idx + 1}`}
                maxLength={8}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': color } as React.CSSProperties}
              />
            </React.Fragment>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-base transition-colors shadow-lg shadow-indigo-900/40"
      >
        사다리 시작!
      </button>
    </div>
  );
}
