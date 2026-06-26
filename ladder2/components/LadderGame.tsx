'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { LadderConfig, generateLadder, traceAll, PLAYER_COLORS } from '@/lib/ladder';
import LadderCanvas from './LadderCanvas';
import ResultPopup from './ResultPopup';
import { useTheme } from './ThemeProvider';

type Phase = 'setup' | 'game' | 'done';

const DEFAULT_PLAYERS = ['참가자1', '참가자2', '참가자3', '참가자4'];
const DEFAULT_RESULTS = ['1등', '2등', '3등', '꼴등'];

function fireConfetti() {
  const colors = PLAYER_COLORS;
  confetti({ particleCount: 60, angle: 60,  spread: 55, origin: { x: 0 }, colors });
  confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
  setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 }, colors }), 200);
}

interface PopupInfo {
  playerName: string;
  result: string;
  color: string;
  isLast: boolean;
}

export default function LadderGame() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  const [phase, setPhase] = useState<Phase>('setup');
  const [players, setPlayers] = useState<string[]>(DEFAULT_PLAYERS);
  const [results, setResults] = useState<string[]>(DEFAULT_RESULTS);
  const [config, setConfig] = useState<LadderConfig | null>(null);
  const [resultMap, setResultMap] = useState<Record<number, number>>({});
  const [tracePlayerIdx, setTracePlayerIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // Safety-net: if RAF never fires (headless/inactive tab), force-complete after 3s
  const handleAnimationEndRef = useRef<() => void>(() => {});
  useEffect(() => { handleAnimationEndRef.current = handleAnimationEnd; });
  useEffect(() => {
    if (!isAnimating) return;
    const t = setTimeout(() => handleAnimationEndRef.current(), 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating]);

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
    setConfig(cfg); setResultMap(map);
    setRevealed([]); setTracePlayerIdx(null);
    setIsAnimating(false); setPopup(null);
    setPhase('game');
  }

  function handlePlayerClick(idx: number) {
    if (isAnimating || revealed.includes(idx) || popup !== null || !config) return;
    setTracePlayerIdx(idx);
    setIsAnimating(true);
  }

  function handleAnimationEnd() {
    if (tracePlayerIdx === null || !config) return;
    const pIdx = tracePlayerIdx;
    const rIdx = resultMap[pIdx];
    const isLast = revealed.length + 1 === config.players.length;

    setRevealed(prev => [...prev, pIdx]);
    setIsAnimating(false);
    setTracePlayerIdx(null);
    setPopup({
      playerName: config.players[pIdx],
      result: config.results[rIdx],
      color: PLAYER_COLORS[pIdx % PLAYER_COLORS.length],
      isLast,
    });
    if (isLast) setPhase('done');
  }

  function handlePopupDismiss() {
    const wasLast = popup?.isLast ?? false;
    setPopup(null);
    if (wasLast) fireConfetti();
  }

  function revealAll() {
    if (!config || isAnimating || popup !== null) return;
    setRevealed(config.players.map((_, i) => i));
    setTracePlayerIdx(null); setIsAnimating(false);
    setPhase('done');
    fireConfetti();
  }

  function resetGame() {
    setPhase('setup'); setConfig(null);
    setRevealed([]); setTracePlayerIdx(null);
    setIsAnimating(false); setPopup(null);
  }

  // CSS var-based colors
  const headerBg = isDark ? 'border-white/5' : 'border-purple-200/40';
  const textMuted = isDark ? 'text-slate-400' : 'text-purple-500';
  const titleColor = isDark ? 'text-indigo-400' : 'text-purple-600';

  return (
    <div className="min-h-screen bg-mesh text-[var(--text)] flex flex-col relative overflow-hidden">
      {/* Floating orbs */}
      <div className="orb-1 pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--orb1)' }} />
      <div className="orb-2 pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl" style={{ background: 'var(--orb2)' }} />

      {/* Header */}
      <header className={`py-5 px-4 border-b ${headerBg} relative z-10 flex items-center justify-between`}>
        <div className="w-10" />
        <div className="text-center">
          <h1 className={`text-3xl font-black tracking-widest ${titleColor} neon-text`}>사다리타기</h1>
          <p className={`${textMuted} text-sm mt-0.5`}>
            {phase === 'setup' ? '참가자와 결과를 입력하세요'
             : phase === 'game' ? '이름을 클릭해서 결과 확인!'
             : '🎉 모든 결과 공개!'}
          </p>
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="theme-toggle w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: 'var(--btn-secondary)', border: '1.5px solid var(--border)' }}
          aria-label="테마 전환"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-6 gap-6 relative z-10">
        {phase === 'setup' && (
          <SetupPanel
            players={players} results={results}
            onPlayerChange={handlePlayerChange} onResultChange={handleResultChange}
            onAdd={addPlayer} onRemove={removePlayer} onStart={startGame}
            isDark={isDark}
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
                      disabled={isAnimating || done || popup !== null}
                      style={{
                        borderColor: color,
                        color: done ? (isDark ? '#475569' : '#a78bfa') : color,
                        backgroundColor: active ? color + '33' : 'transparent',
                        boxShadow: active ? `0 0 16px ${color}55` : 'none',
                      }}
                      className={[
                        'px-4 py-2 rounded-full border-2 font-bold text-sm transition-all duration-200',
                        done ? 'opacity-35 cursor-not-allowed' : 'hover:scale-105 hover:brightness-110 cursor-pointer',
                        active ? 'scale-105' : '',
                      ].join(' ')}
                    >
                      {name}{done && ' ✓'}
                    </button>
                  );
                })}
              </div>

              {/* Canvas */}
              <div
                className="overflow-x-auto flex justify-center rounded-2xl p-4 backdrop-blur-sm shadow-2xl"
                style={{
                  background: 'var(--canvas-bg)',
                  border: '1px solid var(--canvas-border)',
                  boxShadow: isDark ? '0 0 40px rgba(99,102,241,0.08)' : '0 8px 32px rgba(139,92,246,0.12)',
                }}
              >
                <LadderCanvas
                  config={config}
                  tracePlayerIndex={tracePlayerIdx}
                  revealedPlayers={revealed}
                  resultMap={resultMap}
                  isDark={isDark}
                  onAnimationEnd={handleAnimationEnd}
                />
              </div>
            </div>

            {/* Results summary */}
            {revealed.length > 0 && (
              <div className="w-full max-w-2xl fade-in-up">
                <h2 className={`text-sm font-bold ${textMuted} mb-3 text-center`}>결과 현황</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {revealed.map(pIdx => {
                    const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
                    const rIdx = resultMap[pIdx];
                    return (
                      <div
                        key={pIdx}
                        className="rounded-xl p-3 text-center pop-in"
                        style={{
                          border: `1.5px solid ${color}`,
                          backgroundColor: color + (isDark ? '18' : '20'),
                          boxShadow: isDark ? `0 0 16px ${color}22` : `0 4px 16px ${color}25`,
                        }}
                      >
                        <p className="font-bold text-sm" style={{ color }}>{config.players[pIdx]}</p>
                        <p className="text-xs opacity-40 my-0.5">→</p>
                        <p className="font-black text-base" style={{ color: isDark ? '#fff' : color }}>{config.results[rIdx]}</p>
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
                  disabled={isAnimating || popup !== null}
                  className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-sm transition-all disabled:opacity-50 hover:scale-105"
                >
                  전체 공개 ✨
                </button>
              )}
              <button
                onClick={startGame}
                disabled={isAnimating || popup !== null}
                className="px-6 py-2.5 rounded-full font-black text-sm transition-all disabled:opacity-50 hover:scale-105"
                style={{
                  background: isDark ? 'rgba(99,102,241,0.8)' : '#7c3aed',
                  color: '#fff',
                }}
              >
                다시 섞기 🎲
              </button>
              <button
                onClick={resetGame}
                disabled={isAnimating || popup !== null}
                className="px-6 py-2.5 rounded-full font-black text-sm transition-all disabled:opacity-50 hover:scale-105"
                style={{ background: 'var(--btn-secondary)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                처음으로
              </button>
            </div>

            {phase === 'done' && !popup && (
              <p className="font-black text-lg fade-in-up" style={{ color: isDark ? '#34d399' : '#059669' }}>
                🎊 모든 결과 공개 완료!
              </p>
            )}
          </>
        )}
      </main>

      {/* Result popup */}
      {popup && (
        <ResultPopup
          playerName={popup.playerName}
          result={popup.result}
          color={popup.color}
          onDismiss={handlePopupDismiss}
        />
      )}
    </div>
  );
}

/* ── Setup Panel ─────────────────────────────────────────────────────────── */
interface SetupPanelProps {
  players: string[]; results: string[];
  onPlayerChange: (idx: number, val: string) => void;
  onResultChange: (idx: number, val: string) => void;
  onAdd: () => void; onRemove: () => void; onStart: () => void;
  isDark: boolean;
}

function SetupPanel({ players, results, onPlayerChange, onResultChange, onAdd, onRemove, onStart, isDark }: SetupPanelProps) {
  const count = players.length;
  const textMuted = isDark ? 'text-slate-400' : 'text-purple-500';

  return (
    <div className="w-full max-w-lg space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-black text-base" style={{ color: 'var(--text)' }}>
          참가자 {count}명
        </span>
        <div className="flex gap-2">
          {[{ label: '−', action: onRemove, disabled: count <= 2 }, { label: '+', action: onAdd, disabled: count >= 8 }].map(({ label, action, disabled }) => (
            <button
              key={label}
              onClick={action}
              disabled={disabled}
              className="w-9 h-9 rounded-full font-black text-xl transition-all hover:scale-110 disabled:opacity-35"
              style={{ background: 'var(--btn-secondary)', color: 'var(--text)', border: '1.5px solid var(--border)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <p className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>참가자</p>
        <p className={`text-xs font-bold ${textMuted} uppercase tracking-wider`}>결과</p>
        {players.map((player, idx) => {
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          return (
            <React.Fragment key={idx}>
              <input
                type="text" value={player}
                onChange={e => onPlayerChange(idx, e.target.value)}
                placeholder={`참가자${idx + 1}`} maxLength={8}
                className="rounded-xl px-3 py-2 text-sm font-bold transition-all focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--input-bg)', color: 'var(--text)',
                  border: `1.5px solid var(--input-border)`,
                  '--tw-ring-color': color,
                } as React.CSSProperties}
              />
              <input
                type="text" value={results[idx]}
                onChange={e => onResultChange(idx, e.target.value)}
                placeholder={`결과${idx + 1}`} maxLength={8}
                className="rounded-xl px-3 py-2 text-sm font-bold transition-all focus:outline-none focus:ring-2"
                style={{
                  background: 'var(--input-bg)', color: 'var(--text)',
                  border: `1.5px solid var(--input-border)`,
                  '--tw-ring-color': color,
                } as React.CSSProperties}
              />
            </React.Fragment>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-2xl font-black text-lg text-white transition-all glow-pulse hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: isDark ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
      >
        사다리 시작! 🪜
      </button>
    </div>
  );
}
