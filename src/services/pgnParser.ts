/**
 * PGN Parser & Deep Stockfish Game Reviewer
 */

import { Chess } from 'chess.js';
import type { MoveAnalysis, GameReviewSummary, MoveClassification } from '../types/chess';
import { stockfish, classifyMove, calculateAccuracy, evaluatePositionHeuristic } from './stockfishEngine';

export interface ParsedPgnMetadata {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white?: string;
  black?: string;
  result?: string;
  whiteElo?: number;
  blackElo?: number;
  eco?: string;
  opening?: string;
}

export function parsePgnMetadata(pgn: string): ParsedPgnMetadata {
  const meta: ParsedPgnMetadata = {};
  const lines = pgn.split('\n');

  for (const line of lines) {
    const match = line.match(/^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/);
    if (match) {
      const key = match[1].toLowerCase();
      const val = match[2];

      if (key === 'event') meta.event = val;
      else if (key === 'site') meta.site = val;
      else if (key === 'date') meta.date = val;
      else if (key === 'round') meta.round = val;
      else if (key === 'white') meta.white = val;
      else if (key === 'black') meta.black = val;
      else if (key === 'result') meta.result = val;
      else if (key === 'whiteelo') meta.whiteElo = parseInt(val, 10);
      else if (key === 'blackelo') meta.blackElo = parseInt(val, 10);
      else if (key === 'eco') meta.eco = val;
      else if (key === 'opening') meta.opening = val;
    }
  }

  return meta;
}

/**
 * Parses raw PGN string into playable plies list
 */
export function extractPliesFromPgn(pgn: string): {
  moves: { san: string; from: string; to: string; promotion?: string; fenBefore: string; fenAfter: string; color: 'w' | 'b' }[];
  metadata: ParsedPgnMetadata;
} {
  const chess = new Chess();
  const metadata = parsePgnMetadata(pgn);

  try {
    chess.loadPgn(pgn);
  } catch (err) {
    // If headers or comments caused loadPgn failure, strip tags and try loading moves
    const cleanMoves = pgn.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').replace(/\$\d+/g, '').trim();
    chess.loadPgn(cleanMoves);
  }

  const history = chess.history({ verbose: true });
  const replayChess = new Chess();

  const moves = history.map((m) => {
    const fenBefore = replayChess.fen();
    replayChess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const fenAfter = replayChess.fen();

    return {
      san: m.san,
      from: m.from,
      to: m.to,
      promotion: m.promotion,
      fenBefore,
      fenAfter,
      color: m.color,
    };
  });

  return { moves, metadata };
}

import { performGrandmasterReview, type AdvancedReviewSummary } from './grandmasterReviewer';

/**
 * Deep Game Review: Evaluates every position using Avelux Grandmaster Reviewer
 */
export async function analyzeGameWithStockfish(
  pgn: string,
  depth: number = 10,
  onProgress?: (analyzed: number, total: number, latestMove: MoveAnalysis) => void
): Promise<AdvancedReviewSummary> {
  return performGrandmasterReview(pgn, depth, onProgress);
}

export { performGrandmasterReview };

