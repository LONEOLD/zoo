'use client';

import { useEffect } from 'react';

interface ResultPopupProps {
  playerName: string;
  result: string;
  color: string;
  onDismiss: () => void;
}

export default function ResultPopup({ playerName, result, color, onDismiss }: ResultPopupProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center popup-overlay"
      onClick={onDismiss}
    >
      <div
        className="popup-card relative text-center px-12 py-10 rounded-3xl border-4 select-none"
        style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
      >
        {/* Sparkles */}
        <span className="sparkle sparkle-1 absolute text-2xl" aria-hidden>✨</span>
        <span className="sparkle sparkle-2 absolute text-xl" aria-hidden>⭐</span>
        <span className="sparkle sparkle-3 absolute text-2xl" aria-hidden>✨</span>
        <span className="sparkle sparkle-4 absolute text-xl" aria-hidden>⭐</span>

        <p
          className="text-sm font-bold mb-1 opacity-80"
          style={{ color, fontFamily: "'Poor Story', system-ui" }}
        >
          {playerName}
        </p>
        <p className="text-xs opacity-50 mb-3" style={{ color }}>의 결과는...</p>
        <p
          className="result-text leading-none"
          style={{
            color,
            fontFamily: "'Poor Story', system-ui",
            fontSize: 'clamp(3.5rem, 12vw, 6rem)',
            textShadow: `0 0 30px ${color}99, 0 0 60px ${color}44`,
          }}
        >
          {result}
        </p>
        <p className="text-xs mt-5 opacity-30" style={{ color }}>화면을 탭하면 닫혀요</p>
      </div>
    </div>
  );
}
