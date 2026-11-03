import React from 'react';
import type { MoveClassification } from '../types/chess';
import { Sparkles, Star, Check, BookOpen, AlertCircle, XCircle, HelpCircle } from 'lucide-react';

interface MoveBadgeProps {
  classification: MoveClassification;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  { label: string; symbol: string; bg: string; text: string; border: string; desc: string }
> = {
  brilliant: {
    label: 'Brilliant',
    symbol: '!!',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
    desc: 'Outstanding move sacrificing material to gain a decisive advantage',
  },
  great: {
    label: 'Great',
    symbol: '!',
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/40',
    desc: 'The only winning move in a critical position',
  },
  best: {
    label: 'Best',
    symbol: '★',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    desc: 'Top engine recommendation from Stockfish',
  },
  excellent: {
    label: 'Excellent',
    symbol: '✓',
    bg: 'bg-lime-500/20',
    text: 'text-lime-400',
    border: 'border-lime-500/40',
    desc: 'Very close to the best move, almost zero evaluation loss',
  },
  good: {
    label: 'Good',
    symbol: '•',
    bg: 'bg-sky-500/20',
    text: 'text-sky-300',
    border: 'border-sky-500/40',
    desc: 'A solid, natural move',
  },
  book: {
    label: 'Book',
    symbol: '📖',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    desc: 'Standard opening theoretical move',
  },
  inaccuracy: {
    label: 'Inaccuracy',
    symbol: '?!',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    desc: 'A small slip allowing slight opponent counterplay',
  },
  mistake: {
    label: 'Mistake',
    symbol: '?',
    bg: 'bg-amber-600/20',
    text: 'text-amber-400',
    border: 'border-amber-600/40',
    desc: 'A noticeable mistake dropping significant advantage',
  },
  miss: {
    label: 'Miss',
    symbol: '✕',
    bg: 'bg-orange-600/20',
    text: 'text-orange-400',
    border: 'border-orange-600/40',
    desc: 'Missed a winning tactical blow or checkmate',
  },
  blunder: {
    label: 'Blunder',
    symbol: '??',
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    desc: 'A severe blunder that dramatically alters the game outcome',
  },
};

export const MoveBadge: React.FC<MoveBadgeProps> = ({
  classification,
  showLabel = false,
  size = 'md',
  className = '',
}) => {
  const config = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.good;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-2.5 py-1 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
      title={`${config.label} (${config.symbol}): ${config.desc}`}
    >
      <span className="font-mono tracking-tighter">{config.symbol}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
