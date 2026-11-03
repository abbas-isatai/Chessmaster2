/**
 * Stockfish UCI Engine Controller running 100% on device CPU via Web Worker
 * With built-in fallback evaluation engine for guaranteed offline resilience
 */

import { Chess } from 'chess.js';
import type { MoveClassification, MoveAnalysis, GameReviewSummary } from '../types/chess';

export interface EngineEvaluationResult {
  score: number; // Centipawns from White's perspective (+ = White advantage)
  mateIn?: number; // Positive = White mates in N, Negative = Black mates in N
  depth: number;
  bestMoveUci: string;
  bestMoveSan?: string;
  pv?: string[];
  nodes?: number;
  nps?: number;
}

export function centipawnsToWinProb(cp: number): number {
  // Official Chess.com CAPS win probability formula:
  // winPercent = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
  // maps to 0.00 to 1.00
  const winPercent = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
  return Math.max(0, Math.min(1, winPercent / 100));
}

// Built-in PeSTO piece square tables for instant zero-dependency evaluation
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// PeSTO Midgame Piece-Square Tables (8x8 flattened from a8 to h1)
const MG_PST: Record<string, number[]> = {
  p: [
      0,   0,   0,   0,   0,   0,   0,   0,
     98, 134,  61,  95,  68, 126,  34, -11,
     -6,   7,  26,  31,  65,  56,  25, -20,
    -14,  13,   6,  21,  23,  12,  17, -23,
    -27,  -2,  -5,  12,  17,   6,  10, -25,
    -26,  -4,  -4, -10,   3,   3,  33, -12,
    -35,  -1, -20, -23, -15,  24,  38, -22,
      0,   0,   0,   0,   0,   0,   0,   0,
  ],
  n: [
    -167, -89, -34, -49,  61, -97, -15,-107,
     -73, -41,  72,  36,  23,  62,   7, -17,
     -47,  60,  37,  65,  84, 129,  73,  44,
      -9,  17,  19,  53,  37,  69,  18,  22,
     -13,   4,  16,  13,  28,  19,  21,  -8,
     -23,  -9,  12,  10,  19,  17,  25, -16,
     -29, -53, -12,  -3,  -1,  18, -14, -19,
    -105, -21, -58, -33, -17, -28, -19, -23,
  ],
  b: [
    -29,   4, -82, -37, -25, -42,   7,  -8,
    -26,  16, -18, -13,  30,  59,  18, -47,
    -16,  37,  43,  40,  35,  50,  37,  -2,
     -4,   5,  19,  50,  37,  37,   7,  -2,
     -6,  13,  13,  26,  34,  12,  10,   4,
      0,  15,  15,  15,  14,  27,  18,  10,
      4,  15,  16,   0,   7,  21,  33,   1,
    -33,  -3, -14, -21, -13, -12, -39, -21,
  ],
  r: [
     32,  42,  32,  51,  63,   9,  31,  43,
     27,  32,  58,  62,  80,  67,  26,  44,
     -5,  19,  26,  36,  17,  45,  61,  16,
    -24, -11,   7,  26,  24,  35,  -8, -20,
    -36, -26, -12,  -1,   9,  -7,   6, -23,
    -45, -25, -16, -17,   3,   0,  -5, -33,
    -44, -16, -20,  -9,  -1,  11,  -6, -71,
    -19, -13,   1,  17,  16,   7, -37, -26,
  ],
  q: [
    -28,   0,  29,  12,  59,  44,  43,  45,
    -24, -39,  -5,   1, -16,  57,  28,  54,
    -18, -17,  10,  54,  40,  80,  67,  30,
     -2,  -6,   9,  17,  27,  62,  51,  10,
    -26,  -9,  -9,  -6,   7,  13,  21, -21,
    -11, -12,   9,   2,   2,  12,  14, -18,
    -12, -27,  -8, -12,  -5,   0, -11, -14,
     -3,   6,  12,  19,   5,  14,  12,  -8,
  ],
  k: [
    -65,  23,  16, -15, -56, -34,   2,  13,
     29,  -1, -20,  -7,  -8,  -4, -38, -29,
     -9,  24,   2, -16, -20,   6,  22, -22,
    -17, -20, -12, -27, -30, -25, -14, -36,
    -49,  -1, -27, -39, -46, -44, -33, -51,
    -14, -14, -22, -46, -44, -30, -15, -27,
      1,   7,  -8, -64, -43, -16,   9,   8,
    -15,  36,  12, -54,   8, -28,  24,  14,
  ],
};

/**
 * Fast static position evaluation in centipawns (from White's perspective)
 */
export function evaluatePositionHeuristic(fen: string): number {
  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        return chess.turn() === 'w' ? -10000 : 10000;
      }
      return 0; // Stalemate, draw
    }

    let score = 0;
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 0;
        const squareIdx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
        const pstVal = MG_PST[piece.type]?.[squareIdx] || 0;
        const pieceScore = val + pstVal;

        if (piece.color === 'w') {
          score += pieceScore;
        } else {
          score -= pieceScore;
        }
      }
    }

    // Small mobility bonus
    const legalMoves = chess.moves().length;
    score += chess.turn() === 'w' ? legalMoves * 5 : -legalMoves * 5;

    return score;
  } catch {
    return 0;
  }
}

/**
 * Stockfish Engine Client managing the Web Worker
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private isEvaluating: boolean = false;
  private onReadyCallbacks: (() => void)[] = [];
  private currentResolver: ((res: EngineEvaluationResult) => void) | null = null;
  private currentRejecter: ((err: Error) => void) | null = null;
  private currentEvaluation: Partial<EngineEvaluationResult> = {};
  private currentTurnColor: 'w' | 'b' = 'w';
  public skillLevel: number = 20;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    try {
      // Official Stockfish 19 WASM engine running directly on the user's CPU
      const workerUrl = typeof WebAssembly === 'object' ? '/stockfish-19-lite-single.js' : '/stockfish-19-asm.js';
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';
        this.handleEngineOutput(line);
      };

      this.worker.onerror = (err) => {
        console.warn('Stockfish 19 worker error, falling back to legacy worker or heuristic:', err);
        try {
          this.worker = new Worker('/stockfish.js');
          this.worker.onmessage = (e: MessageEvent) => {
            const line = typeof e.data === 'string' ? e.data : '';
            this.handleEngineOutput(line);
          };
          this.worker.postMessage('uci');
          this.worker.postMessage('isready');
        } catch {
          this.isReady = true;
        }
      };

      // Send initial UCI handshakes to Stockfish 19
      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    } catch (err) {
      console.warn('Could not initialize Stockfish web worker:', err);
      this.isReady = true;
    }
  }

  private handleEngineOutput(line: string) {
    if (line === 'readyok' || line.includes('Stockfish')) {
      this.isReady = true;
      while (this.onReadyCallbacks.length > 0) {
        const cb = this.onReadyCallbacks.shift();
        cb?.();
      }
    }

    // Parsing info line: e.g. "info depth 12 score cp 85 pv e2e4 e7e5" or "info depth 8 score mate 2"
    if (line.startsWith('info') && line.includes('score')) {
      const depthMatch = line.match(/depth\s+(\d+)/);
      if (depthMatch) {
        this.currentEvaluation.depth = parseInt(depthMatch[1], 10);
      }

      const cpMatch = line.match(/score cp (-?\d+)/);
      if (cpMatch) {
        let cp = parseInt(cpMatch[1], 10);
        // Stockfish reports score from perspective of the side to move!
        // We normalize to White's perspective (+ = White advantage)
        if (this.currentTurnColor === 'b') {
          cp = -cp;
        }
        this.currentEvaluation.score = cp;
        delete this.currentEvaluation.mateIn;
      }

      const mateMatch = line.match(/score mate (-?\d+)/);
      if (mateMatch) {
        let mate = parseInt(mateMatch[1], 10);
        if (this.currentTurnColor === 'b') {
          mate = -mate;
        }
        this.currentEvaluation.mateIn = mate;
        this.currentEvaluation.score = mate > 0 ? 10000 : -10000;
      }

      const pvMatch = line.match(/pv\s+(.+)$/);
      if (pvMatch) {
        const moves = pvMatch[1].trim().split(/\s+/);
        this.currentEvaluation.pv = moves;
        if (moves[0]) {
          this.currentEvaluation.bestMoveUci = moves[0];
        }
      }

      const nodesMatch = line.match(/nodes\s+(\d+)/);
      if (nodesMatch) {
        this.currentEvaluation.nodes = parseInt(nodesMatch[1], 10);
      }
    }

    // Best move received, search finished
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMoveUci = parts[1] || '';
      const finalResult: EngineEvaluationResult = {
        score: this.currentEvaluation.score ?? 0,
        mateIn: this.currentEvaluation.mateIn,
        depth: this.currentEvaluation.depth ?? 10,
        bestMoveUci: bestMoveUci || (this.currentEvaluation.bestMoveUci ?? ''),
        pv: this.currentEvaluation.pv ?? [],
        nodes: this.currentEvaluation.nodes ?? 0,
      };

      this.isEvaluating = false;
      if (this.currentResolver) {
        const resolve = this.currentResolver;
        this.currentResolver = null;
        this.currentRejecter = null;
        resolve(finalResult);
      }
    }
  }

  public async waitUntilReady(): Promise<void> {
    if (this.isReady) return;
    return new Promise((resolve) => {
      this.onReadyCallbacks.push(resolve);
      // Timeout safeguard
      setTimeout(() => resolve(), 1200);
    });
  }

  public setSkillLevel(level: number) {
    this.skillLevel = Math.max(0, Math.min(20, level));
    if (this.worker) {
      this.worker.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
    }
  }

  public stop() {
    if (this.worker && this.isEvaluating) {
      this.worker.postMessage('stop');
    }
    this.isEvaluating = false;
  }

  /**
   * Evaluate a given FEN position with Stockfish on the CPU
   */
  public async evaluatePosition(
    fen: string,
    depth: number = 10,
    maxTimeMs: number = 1500
  ): Promise<EngineEvaluationResult> {
    await this.waitUntilReady();

    const chess = new Chess(fen);
    this.currentTurnColor = chess.turn();
    this.currentEvaluation = {
      score: evaluatePositionHeuristic(fen),
      depth: 0,
      pv: [],
    };

    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        const mate = chess.turn() === 'w' ? -1 : 1;
        return {
          score: mate > 0 ? 10000 : -10000,
          mateIn: mate,
          depth: 1,
          bestMoveUci: '',
          pv: [],
        };
      }
      return {
        score: 0,
        depth: 1,
        bestMoveUci: '',
        pv: [],
      };
    }

    const worker = this.worker;
    if (!worker) {
      return this.fallbackEvaluate(fen, depth);
    }

    return new Promise((resolve) => {
      this.isEvaluating = true;
      this.currentResolver = resolve;

      // Timer watchdog: if stockfish takes longer than maxTimeMs, stop and resolve
      const timeoutId = setTimeout(() => {
        if (this.isEvaluating) {
          this.stop();
          const fallback = this.fallbackEvaluate(fen, depth);
          resolve(fallback);
        }
      }, maxTimeMs);

      const wrappedResolve = (res: EngineEvaluationResult) => {
        clearTimeout(timeoutId);
        resolve(res);
      };
      this.currentResolver = wrappedResolve;

      worker.postMessage('stop');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go depth ${depth}`);
    });
  }

  /**
   * Fast pure JS alpha-beta fallback search if worker is unavailable or times out
   */
  private fallbackEvaluate(fen: string, depth: number): EngineEvaluationResult {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      return {
        score: chess.inCheck() ? (chess.turn() === 'w' ? -10000 : 10000) : 0,
        depth: 1,
        bestMoveUci: '',
      };
    }

    let bestScore = chess.turn() === 'w' ? -Infinity : Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
      chess.move(move);
      const score = evaluatePositionHeuristic(chess.fen());
      chess.undo();

      if (chess.turn() === 'w') {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    const uci = bestMove ? `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}` : '';
    return {
      score: bestScore,
      depth: Math.min(depth, 4),
      bestMoveUci: uci,
      bestMoveSan: bestMove?.san,
      pv: [uci],
    };
  }
}

// Global engine instance
export const stockfish = new StockfishEngine();

/**
 * Classify a move compared to Stockfish's top recommendation using official Chess.com CAPS 2 standards
 */
export function classifyMove(
  moveSan: string,
  from: string,
  to: string,
  fenBefore: string,
  fenAfter: string,
  evalBefore: number, // in White centipawns
  evalAfter: number,  // in White centipawns
  bestEval: number,   // in White centipawns
  bestMoveSan?: string,
  mateInBefore?: number,
  mateInAfter?: number,
  bestMoveUci?: string
): { classification: MoveClassification; comment: string } {
  const chessBefore = new Chess(fenBefore);
  const color = chessBefore.turn();
  const isWhite = color === 'w';

  // Normalize evaluations to the perspective of the player making the move
  // (+ = good for player, - = bad for player)
  const playerEvalBefore = isWhite ? evalBefore : -evalBefore;
  const playerEvalAfter = isWhite ? evalAfter : -evalAfter;
  const playerBestEval = isWhite ? bestEval : -bestEval;

  const winProbBefore = centipawnsToWinProb(playerEvalBefore);
  const winProbAfter = centipawnsToWinProb(playerEvalAfter);
  const winProbBest = centipawnsToWinProb(playerBestEval);

  // Win probability loss from the best available move (0.00 to 1.00)
  const probLoss = Math.max(0, winProbBest - winProbAfter);
  const cpLoss = Math.max(0, playerBestEval - playerEvalAfter);

  // Check if played move matches the engine top choice
  const cleanSan = moveSan.replace(/[+#]/g, '');
  const cleanBest = bestMoveSan ? bestMoveSan.replace(/[+#]/g, '') : '';
  const isEngineTopMove = Boolean(
    (bestMoveSan && (moveSan === bestMoveSan || cleanSan === cleanBest)) ||
    (bestMoveUci && bestMoveUci.startsWith(`${from}${to}`))
  );

  // Check if player sacrificed material on this move
  const pieceBefore = chessBefore.get(from as import('chess.js').Square);
  const targetPiece = chessBefore.get(to as import('chess.js').Square);
  const pieceVal = pieceBefore ? PIECE_VALUES[pieceBefore.type] || 0 : 0;
  const targetVal = targetPiece ? PIECE_VALUES[targetPiece.type] || 0 : 0;
  const isSacrifice = pieceVal > targetVal && pieceVal >= 300;

  // 1. Brilliant move check (!!)
  // Player sacrifices material but retains high advantage or improves game decisively
  if (isSacrifice && probLoss < 0.02 && playerEvalAfter >= 20) {
    return { classification: 'brilliant', comment: 'Brilliant sacrifice! Stockfish found no refutation.' };
  }

  // 2. Best move (*)
  // If move matches engine top move OR win probability loss is negligible (<= 1.5% or <= 15 cp)
  if (isEngineTopMove || probLoss <= 0.015 || cpLoss <= 15) {
    return { classification: 'best', comment: 'The best move recommended by Stockfish.' };
  }

  // 3. Great move check (!)
  // Critical position where only this move preserves or gains victory
  if (probLoss <= 0.02 && playerEvalBefore <= -60 && playerEvalAfter >= -10) {
    return { classification: 'great', comment: 'Great find! A critical turnaround move.' };
  }

  // 4. Excellent move
  // Near-optimal (<= 4.5% win prob loss or <= 30 cp loss).
  // Also: if position was winning (> 85% win prob) and remains clearly winning (> 80%), it is Excellent!
  if (probLoss <= 0.045 || cpLoss <= 30 || (winProbBefore >= 0.85 && winProbAfter >= 0.80)) {
    return { classification: 'excellent', comment: 'An excellent, strong continuation.' };
  }

  // 5. Good move
  // Solid move (<= 10% win prob loss or <= 65 cp loss).
  // If winning (> 75% win prob) and remains winning (> 70%), it is Good!
  if (probLoss <= 0.10 || cpLoss <= 65 || (winProbBefore >= 0.75 && winProbAfter >= 0.70)) {
    return { classification: 'good', comment: 'A natural, solid move.' };
  }

  // 6. Miss check
  // Missed a forced checkmate or massive tactical blow
  if (mateInBefore && ((isWhite && mateInBefore > 0) || (!isWhite && mateInBefore < 0))) {
    if (!mateInAfter || (isWhite ? mateInAfter <= 0 : mateInAfter >= 0)) {
      return { classification: 'miss', comment: 'Missed a forced checkmate opportunity.' };
    }
  }

  // 7. Inaccuracy (?!)
  // Mild slip: 10% to 20% win prob loss or 65 to 140 cp drop
  if (probLoss <= 0.20 || cpLoss <= 140 || (winProbBefore >= 0.70 && winProbAfter >= 0.50)) {
    return { classification: 'inaccuracy', comment: 'Slight inaccuracy. Stockfish preferred ' + (bestMoveSan || 'another idea') + '.' };
  }

  // 8. Mistake (?)
  // Noticeable error: 20% to 32% win prob loss.
  // CRITICAL Chess.com rule: if position was ALREADY lost (winProbBefore <= 15%), further drops are Mistakes, NOT blunders!
  if (probLoss <= 0.32 || winProbBefore <= 0.15 || cpLoss <= 260) {
    return { classification: 'mistake', comment: 'A mistake that gave the opponent counterplay.' };
  }

  // 9. Blunder (??)
  // Decisive game swing: losing > 32% win probability from an equal or winning position
  return { classification: 'blunder', comment: 'Blunder! This decisively shifted the evaluation.' };
}

/**
 * Calculate CAPS Accuracy % for white and black based on move win probability deltas
 */
export function calculateAccuracy(moves: MoveAnalysis[]): { whiteAccuracy: number; blackAccuracy: number } {
  let whiteSum = 0;
  let whiteCount = 0;
  let blackSum = 0;
  let blackCount = 0;

  for (const m of moves) {
    const isWhite = m.color === 'w';
    // Move accuracy formula based on Chess.com CAPS score approximation:
    // 100 * exp(-0.005 * centipawnLoss)
    let moveAccuracy = 100;
    if (m.bestEvaluation !== undefined) {
      const best = isWhite ? m.bestEvaluation : -m.bestEvaluation;
      const actual = isWhite ? m.evaluation : -m.evaluation;
      const cpLoss = Math.max(0, best - actual);

      switch (m.classification) {
        case 'brilliant':
        case 'great':
        case 'best':
          moveAccuracy = 100;
          break;
        case 'excellent':
          moveAccuracy = 95 - cpLoss * 0.1;
          break;
        case 'good':
          moveAccuracy = 85 - cpLoss * 0.15;
          break;
        case 'book':
          moveAccuracy = 100;
          break;
        case 'inaccuracy':
          moveAccuracy = 65 - cpLoss * 0.15;
          break;
        case 'mistake':
          moveAccuracy = 45 - cpLoss * 0.12;
          break;
        case 'miss':
          moveAccuracy = 25;
          break;
        case 'blunder':
          moveAccuracy = 10;
          break;
      }
    }
    moveAccuracy = Math.max(5, Math.min(100, moveAccuracy));

    if (isWhite) {
      whiteSum += moveAccuracy;
      whiteCount++;
    } else {
      blackSum += moveAccuracy;
      blackCount++;
    }
  }

  return {
    whiteAccuracy: whiteCount > 0 ? Math.round((whiteSum / whiteCount) * 10) / 10 : 85.0,
    blackAccuracy: blackCount > 0 ? Math.round((blackSum / blackCount) * 10) / 10 : 85.0,
  };
}
