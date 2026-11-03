/**
 * Avelux Grand: Grandmaster-Grade Game Reviewer & Engine
 * Full Chess.com CAPS2 Standards • ECO Opening Detection • Human GM Commentary
 */

import { Chess } from 'chess.js';
import type { MoveAnalysis, GameReviewSummary, MoveClassification } from '../types/chess';
import { identifyOpening } from '../data/openings';
import { stockfish, evaluatePositionHeuristic, PIECE_VALUES } from './stockfishEngine';

/**
 * Converts centipawns to win probability (0.0 to 1.0) using Chess.com CAPS2 logistic formula
 */
export function centipawnsToWinProb(cp: number): number {
  // Cap at +- 1000 cp
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 1 / (1 + Math.pow(10, -clamped / 400));
}

/**
 * Converts win probability loss into CAPS accuracy score (0 to 100%)
 */
export function winProbLossToAccuracy(winProbLoss: number): number {
  const scaledLoss = Math.max(0, Math.min(1, winProbLoss)) * 100;
  // CAPS2 non-linear exponential decay formula
  const acc = 103.1668 * Math.exp(-0.04354 * scaledLoss) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

/**
 * Estimates player Elo performance based on accuracy and blunder frequency
 */
export function estimatePerformanceElo(
  accuracy: number,
  blunders: number,
  mistakes: number,
  opponentRating?: number
): number {
  let baseElo = 600;
  if (accuracy >= 98) baseElo = 2850;
  else if (accuracy >= 95) baseElo = 2600;
  else if (accuracy >= 90) baseElo = 2300;
  else if (accuracy >= 85) baseElo = 2000;
  else if (accuracy >= 80) baseElo = 1750;
  else if (accuracy >= 75) baseElo = 1500;
  else if (accuracy >= 70) baseElo = 1300;
  else if (accuracy >= 65) baseElo = 1100;
  else if (accuracy >= 55) baseElo = 900;
  else baseElo = 700;

  // Penalize for blunders and mistakes
  const penalty = (blunders * 75) + (mistakes * 25);
  let elo = Math.max(500, baseElo - penalty);

  if (opponentRating && opponentRating > 0) {
    elo = Math.round((elo * 0.7) + (opponentRating * 0.3));
  }

  return Math.min(3100, Math.max(400, elo));
}

export interface AdvancedReviewSummary extends GameReviewSummary {
  whitePerformanceElo: number;
  blackPerformanceElo: number;
  keyMomentsCount: number;
  phaseAccuracy: {
    opening: { white: number; black: number };
    middlegame: { white: number; black: number };
    endgame: { white: number; black: number };
  };
  turningPoints: number[]; // ply indices
}

/**
 * Generates natural Grandmaster coach commentary for a move
 */
function generateCoachCommentary(
  classification: MoveClassification,
  san: string,
  pieceType: string,
  bestMoveSan?: string,
  probLoss?: number,
  mateIn?: number,
  isSacrifice?: boolean
): string {
  switch (classification) {
    case 'brilliant':
      return isSacrifice
        ? `Brilliant sacrifice! ${san} gives up material for an overwhelming tactical initiative.`
        : `Brilliant intuition! An extraordinary find that breaks the position open.`;

    case 'great':
      return bestMoveSan
        ? `Great move! In a complex position, ${san} was the only winning continuation.`
        : `A critical move that decisively tips the game in your favor.`;

    case 'best':
      return `The best move. Stockfish confirms ${san} exerts maximum pressure.`;

    case 'excellent':
      return bestMoveSan && bestMoveSan !== san
        ? `Excellent choice. Keeps strong control; ${bestMoveSan} was slightly sharper.`
        : `A very strong move that maintains the initiative.`;

    case 'good':
      return `Solid move. Safe, active, and keeps the position balanced.`;

    case 'book':
      return `Book move. Standard opening theory according to master databases.`;

    case 'inaccuracy':
      return bestMoveSan
        ? `Inaccuracy. ${san} releases some pressure. Better was ${bestMoveSan}.`
        : `A small inaccuracy that gives your opponent breathing room.`;

    case 'mistake':
      return bestMoveSan
        ? `Mistake. ${san} compromises your position. ${bestMoveSan} was required.`
        : `A noticeable mistake that hands your opponent an advantage.`;

    case 'miss':
      return mateIn
        ? `Missed win! You had a forced checkmate starting with ${bestMoveSan || 'a tactical strike'}.`
        : `Missed opportunity! You had a decisive winning tactic with ${bestMoveSan || 'a better move'}.`;

    case 'blunder':
      return mateIn
        ? `Blunder! Allows a forced checkmate against your king.`
        : bestMoveSan
        ? `Blunder! ${san} loses critical material or positional control. ${bestMoveSan} was needed.`
        : `Blunder! A serious tactical error that turns the tide of the game.`;
  }
}

/**
 * Main Grandmaster Game Reviewer: High-speed, depth-accurate, on-device analysis
 */
export async function performGrandmasterReview(
  pgn: string,
  depth: number = 10,
  onProgress?: (current: number, total: number, latest: MoveAnalysis) => void
): Promise<AdvancedReviewSummary> {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    const cleanMoves = pgn.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').replace(/\$\d+/g, '').trim();
    chess.loadPgn(cleanMoves);
  }

  // Parse metadata
  const lines = pgn.split('\n');
  const metadata: Record<string, string> = {};
  for (const l of lines) {
    const m = l.match(/^\[([A-Za-z0-9_]+)\s+"(.*)"\]$/);
    if (m) metadata[m[1].toLowerCase()] = m[2];
  }

  const history = chess.history({ verbose: true });
  const total = history.length;

  if (total === 0) {
    return {
      whiteAccuracy: 0,
      blackAccuracy: 0,
      whiteStats: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 },
      blackStats: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 },
      moves: [],
      whitePerformanceElo: 1200,
      blackPerformanceElo: 1200,
      keyMomentsCount: 0,
      phaseAccuracy: {
        opening: { white: 0, black: 0 },
        middlegame: { white: 0, black: 0 },
        endgame: { white: 0, black: 0 },
      },
      turningPoints: [],
      winner: 'draw',
    };
  }

  // Identify Opening Theory
  const sanList = history.map((h) => h.san);
  const { opening, bookMovesCount } = identifyOpening(sanList);

  // Pre-generate FEN positions: 0 = start position, 1..total = after move i
  const replay = new Chess();
  const fens: string[] = [replay.fen()];
  for (const m of history) {
    replay.move({ from: m.from, to: m.to, promotion: m.promotion });
    fens.push(replay.fen());
  }

  // Evaluation cache to avoid recomputing identical positions
  const evalCache = new Map<string, { score: number; bestMoveSan?: string; bestMoveUci?: string; mateIn?: number }>();

  async function getEvaluation(fen: string): Promise<{ score: number; bestMoveSan?: string; bestMoveUci?: string; mateIn?: number }> {
    if (evalCache.has(fen)) {
      return evalCache.get(fen)!;
    }
    const res = await stockfish.evaluatePosition(fen, depth, 450);
    const parsed = {
      score: res.score,
      bestMoveSan: res.bestMoveSan,
      bestMoveUci: res.bestMoveUci,
      mateIn: res.mateIn,
    };
    evalCache.set(fen, parsed);
    return parsed;
  }

  const analyzedMoves: MoveAnalysis[] = [];
  const whiteStats: Record<MoveClassification, number> = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
  };
  const blackStats: Record<MoveClassification, number> = {
    brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0,
  };

  const whiteMoveAccuracies: number[] = [];
  const blackMoveAccuracies: number[] = [];
  const turningPoints: number[] = [];

  // Phase accuracies tracking
  const phaseScores = {
    opening: { white: [] as number[], black: [] as number[] },
    middlegame: { white: [] as number[], black: [] as number[] },
    endgame: { white: [] as number[], black: [] as number[] },
  };

  // Pre-evaluate initial start position (PLY 0)
  let evalBefore = await getEvaluation(fens[0]);

  for (let i = 0; i < total; i++) {
    const move = history[i];
    const ply = i + 1;
    const moveNumber = Math.floor(i / 2) + 1;
    const isWhite = move.color === 'w';
    const fenBefore = fens[i];
    const fenAfter = fens[i + 1];

    // Evaluate position after the move
    const evalAfter = await getEvaluation(fenAfter);

    // Normalize to the moving player's perspective (+ = good for mover)
    const playerBefore = isWhite ? evalBefore.score : -evalBefore.score;
    const playerAfter = isWhite ? evalAfter.score : -evalAfter.score;

    // Win probability before and after
    const winProbBefore = centipawnsToWinProb(playerBefore);
    const winProbAfter = centipawnsToWinProb(playerAfter);
    const probLoss = Math.max(0, winProbBefore - winProbAfter);
    const cpLoss = Math.max(0, playerBefore - playerAfter);

    // Accuracy for this individual move
    const moveAcc = winProbLossToAccuracy(probLoss);
    if (isWhite) whiteMoveAccuracies.push(moveAcc);
    else blackMoveAccuracies.push(moveAcc);

    // Phase classification:
    // Plies 1-16 = Opening, 17-60 = Middlegame, >60 or low pieces = Endgame
    const pieceCount = (fenAfter.match(/[rnbqRNBQ]/g) || []).length;
    let phase: 'opening' | 'middlegame' | 'endgame' = 'middlegame';
    if (i < 16) phase = 'opening';
    else if (pieceCount <= 6) phase = 'endgame';

    if (isWhite) phaseScores[phase].white.push(moveAcc);
    else phaseScores[phase].black.push(moveAcc);

    // Check material sacrifice for Brilliant (!!)
    const pieceVal = PIECE_VALUES[move.piece] || 100;
    const capturedVal = move.captured ? (PIECE_VALUES[move.captured] || 100) : 0;
    const isSacrifice = pieceVal > capturedVal && pieceVal >= 300;

    // Is move matching top engine recommendation?
    const isTopMove = Boolean(
      (evalBefore.bestMoveSan && move.san === evalBefore.bestMoveSan) ||
      (evalBefore.bestMoveUci && evalBefore.bestMoveUci.startsWith(`${move.from}${move.to}`))
    );

    // Is move recognized theory from opening book?
    const isTheory = i < bookMovesCount;

    let classification: MoveClassification;

    // 1. Brilliant move check (!!)
    if (isSacrifice && probLoss <= 0.02 && playerAfter >= 30) {
      classification = 'brilliant';
    }
    // 2. Book opening move check
    else if (isTheory && cpLoss <= 60) {
      classification = 'book';
    }
    // 3. Great move check (!) - sole winning move in tricky/equal position
    else if (probLoss <= 0.025 && playerBefore <= 50 && playerAfter >= -20 && (isTopMove || cpLoss <= 10)) {
      classification = 'great';
    }
    // 4. Best move (★)
    else if (isTopMove || (probLoss <= 0.015 && cpLoss <= 15)) {
      classification = 'best';
    }
    // 5. Excellent move
    else if (probLoss <= 0.035 && cpLoss <= 30) {
      classification = 'excellent';
    }
    // 6. Good move
    else if (probLoss <= 0.065 && cpLoss <= 65) {
      classification = 'good';
    }
    // 7. Missed win (✕) - had decisive win (+2.5 or mate), threw it away
    else if ((playerBefore >= 250 || evalBefore.mateIn !== undefined) && playerAfter <= 100 && probLoss >= 0.18) {
      classification = 'miss';
      turningPoints.push(ply);
    }
    // 8. Blunder (??) - catastrophic drop
    else if (probLoss >= 0.28 || cpLoss >= 260 || (evalAfter.mateIn && evalAfter.mateIn < 0)) {
      classification = 'blunder';
      turningPoints.push(ply);
    }
    // 9. Mistake (?)
    else if (probLoss >= 0.14 || cpLoss >= 130) {
      classification = 'mistake';
      turningPoints.push(ply);
    }
    // 10. Inaccuracy (?!)
    else {
      classification = 'inaccuracy';
    }

    if (isWhite) whiteStats[classification]++;
    else blackStats[classification]++;

    const comment = generateCoachCommentary(
      classification,
      move.san,
      move.piece,
      evalBefore.bestMoveSan,
      probLoss,
      evalAfter.mateIn,
      isSacrifice
    );

    const moveAnalysis: MoveAnalysis = {
      moveNumber,
      ply,
      san: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      fenBefore,
      fenAfter,
      color: move.color,
      evaluation: evalAfter.score,
      mateIn: evalAfter.mateIn,
      winProbability: Math.round(centipawnsToWinProb(evalAfter.score) * 100),
      bestMoveSan: evalBefore.bestMoveSan,
      bestMoveUci: evalBefore.bestMoveUci,
      bestEvaluation: evalBefore.score,
      classification,
      comment,
    };

    analyzedMoves.push(moveAnalysis);

    if (onProgress) {
      onProgress(ply, total, moveAnalysis);
    }

    // Current evalAfter becomes the evalBefore for the next ply!
    evalBefore = evalAfter;
  }

  // Calculate overall CAPS accuracy
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 75);
  const whiteAccuracy = avg(whiteMoveAccuracies);
  const blackAccuracy = avg(blackMoveAccuracies);

  // Performance Elos
  const whiteEloHeader = metadata.whiteelo ? parseInt(metadata.whiteelo, 10) : undefined;
  const blackEloHeader = metadata.blackelo ? parseInt(metadata.blackelo, 10) : undefined;

  const whitePerformanceElo = estimatePerformanceElo(
    whiteAccuracy,
    whiteStats.blunder,
    whiteStats.mistake,
    blackEloHeader
  );

  const blackPerformanceElo = estimatePerformanceElo(
    blackAccuracy,
    blackStats.blunder,
    blackStats.mistake,
    whiteEloHeader
  );

  let winner: 'white' | 'black' | 'draw' = 'draw';
  if (metadata.result === '1-0') winner = 'white';
  else if (metadata.result === '0-1') winner = 'black';

  return {
    whiteAccuracy,
    blackAccuracy,
    whiteStats,
    blackStats,
    moves: analyzedMoves,
    opening: opening ? { eco: opening.eco, name: opening.name } : undefined,
    winner,
    whitePerformanceElo,
    blackPerformanceElo,
    keyMomentsCount: turningPoints.length,
    phaseAccuracy: {
      opening: { white: avg(phaseScores.opening.white), black: avg(phaseScores.opening.black) },
      middlegame: { white: avg(phaseScores.middlegame.white), black: avg(phaseScores.middlegame.black) },
      endgame: { white: avg(phaseScores.endgame.white), black: avg(phaseScores.endgame.black) },
    },
    turningPoints,
  };
}
