import React from 'react';
import { centipawnsToWinProb } from '../services/stockfishEngine';

interface EvalBarProps {
  score: number; // in centipawns from White's perspective (+ = White advantage)
  mateIn?: number;
  orientation?: 'w' | 'b';
  heightClass?: string;
  className?: string;
  showText?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  mateIn,
  orientation = 'w',
  heightClass = 'h-full',
  className = '',
  showText = true,
}) => {
  // Calculate percentage of White's height (0% to 100%)
  let whitePercent: number;
  let labelText: string;

  if (mateIn !== undefined && mateIn !== 0) {
    if (mateIn > 0) {
      whitePercent = 100;
      labelText = `M${mateIn}`;
    } else {
      whitePercent = 0;
      labelText = `-M${Math.abs(mateIn)}`;
    }
  } else {
    // Win probability sigmoid
    const prob = centipawnsToWinProb(score);
    whitePercent = prob * 100;

    const pawns = (score / 100).toFixed(1);
    if (score > 0) {
      labelText = `+${pawns}`;
    } else if (score < 0) {
      labelText = pawns;
    } else {
      labelText = '0.0';
    }
  }

  // Ensure small visible sliver
  whitePercent = Math.max(3, Math.min(97, whitePercent));

  // If orientation is Black, invert the bar visually
  const displayedWhitePercent = orientation === 'w' ? whitePercent : 100 - whitePercent;

  return (
    <div
      className={`relative w-7 bg-slate-900 rounded-lg overflow-hidden flex flex-col justify-end border border-slate-700/60 shadow-inner select-none ${heightClass} ${className}`}
      title={`Evaluation: ${labelText} (${Math.round(whitePercent)}% White win chance)`}
    >
      {/* Black's portion (top) */}
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-slate-900 transition-all duration-300 ease-out" />

      {/* White's portion (bottom) */}
      <div
        className="w-full bg-emerald-50 transition-all duration-300 ease-out z-10"
        style={{ height: `${displayedWhitePercent}%` }}
      />

      {/* Numerical score label */}
      {showText && (
        <div
          className={`absolute inset-x-0 z-20 flex justify-center text-[10px] font-black tracking-tight ${
            whitePercent > 50 ? 'bottom-1 text-slate-900' : 'top-1 text-slate-100'
          }`}
        >
          {labelText}
        </div>
      )}
    </div>
  );
};
