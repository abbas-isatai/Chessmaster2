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

/**
 * Deep Game Review: Evaluates every position using Stockfish on the CPU
 */
export async function analyzeGameWithStockfish(
  pgn: string,
  depth: number = 8,
  onProgress?: (analyzed: number, total: number, latestMove: MoveAnalysis) => void
): Promise<GameReviewSummary> {
  const { moves: extracted, metadata } = extractPliesFromPgn(pgn);
  const total = extracted.length;

  if (total === 0) {
    return {
      whiteAccuracy: 0,
      blackAccuracy: 0,
      whiteStats: {
        brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
        book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
      },
      blackStats: {
        brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
        book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
      },
      moves: [],
      winner: 'draw',
    };
  }

  const analyzedMoves: MoveAnalysis[] = [];
  const whiteStats: Record<MoveClassification, number> = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
    book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
  };
  const blackStats: Record<MoveClassification, number> = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
    book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
  };

  // Evaluate initial position
  let prevEval = 20; // Slight white first-move advantage (~+0.20 cp)

  for (let i = 0; i < total; i++) {
    const item = extracted[i];
    const moveNum = Math.floor(i / 2) + 1;
    const isBook = i < 6; // Standard opening moves considered book if reasonable

    // Evaluate position before move to get best engine move and recommendation
    const evalBefore = await stockfish.evaluatePosition(item.fenBefore, depth, 1200);

    // Evaluate position after move to measure drop/gain
    const evalAfter = await stockfish.evaluatePosition(item.fenAfter, depth, 1200);

    let classification: MoveClassification;
    let comment = '';

    if (isBook) {
      // In book opening, mark as book unless terrible blunder
      const isBlunder = Math.abs(evalAfter.score - evalBefore.score) > 300;
      if (isBlunder) {
        const res = classifyMove(
          item.san, item.from, item.to, item.fenBefore, item.fenAfter,
          evalBefore.score, evalAfter.score, evalBefore.score,
          evalBefore.bestMoveSan, evalBefore.mateIn, evalAfter.mateIn,
          evalBefore.bestMoveUci
        );
        classification = res.classification;
        comment = res.comment;
      } else {
        classification = 'book';
        comment = 'Book opening theoretical move.';
      }
    } else {
      const res = classifyMove(
        item.san, item.from, item.to, item.fenBefore, item.fenAfter,
        evalBefore.score, evalAfter.score, evalBefore.score,
        evalBefore.bestMoveSan, evalBefore.mateIn, evalAfter.mateIn,
        evalBefore.bestMoveUci
      );
      classification = res.classification;
      comment = res.comment;
    }

    if (item.color === 'w') {
      whiteStats[classification]++;
    } else {
      blackStats[classification]++;
    }

    const moveAnalysis: MoveAnalysis = {
      moveNumber: moveNum,
      ply: i + 1,
      san: item.san,
      from: item.from,
      to: item.to,
      promotion: item.promotion,
      fenBefore: item.fenBefore,
      fenAfter: item.fenAfter,
      color: item.color,
      evaluation: evalAfter.score,
      mateIn: evalAfter.mateIn,
      winProbability: Math.round(
        (item.color === 'w' ? 1 / (1 + Math.pow(10, -evalAfter.score / 400)) : 1 / (1 + Math.pow(10, evalAfter.score / 400))) * 100
      ),
      bestMoveSan: evalBefore.bestMoveSan,
      bestMoveUci: evalBefore.bestMoveUci,
      bestEvaluation: evalBefore.score,
      classification,
      comment,
    };

    analyzedMoves.push(moveAnalysis);
    prevEval = evalAfter.score;

    if (onProgress) {
      onProgress(i + 1, total, moveAnalysis);
    }
  }

  const { whiteAccuracy, blackAccuracy } = calculateAccuracy(analyzedMoves);

  let winner: 'white' | 'black' | 'draw' = 'draw';
  if (metadata.result === '1-0') winner = 'white';
  else if (metadata.result === '0-1') winner = 'black';

  return {
    whiteAccuracy,
    blackAccuracy,
    whiteStats,
    blackStats,
    moves: analyzedMoves,
    opening: metadata.eco ? { eco: metadata.eco, name: metadata.opening || metadata.eco } : undefined,
    winner,
  };
}
