/**
 * Procedural Tactics Puzzle Generator from Reviewed Games & Internet Importer
 */

import { Chess } from 'chess.js';
import type { TacticsPuzzle, GameReviewSummary, MoveAnalysis, PuzzleDifficulty } from '../types/chess';
import type { ParsedPgnMetadata } from './pgnParser';

const LOCAL_PUZZLES_KEY = 'chess_procedural_puzzles';

export function getStoredUserPuzzles(): TacticsPuzzle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PUZZLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserPuzzles(puzzles: TacticsPuzzle[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PUZZLES_KEY, JSON.stringify(puzzles));
  } catch (err) {
    console.warn('Could not save custom puzzles to localStorage:', err);
  }
}

/**
 * Procedurally generates tactics puzzles from a reviewed game
 */
export function generatePuzzlesFromReviewedGame(
  summary: GameReviewSummary,
  metadata?: ParsedPgnMetadata
): TacticsPuzzle[] {
  const generated: TacticsPuzzle[] = [];
  const moves = summary.moves;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const isTacticalTrigger =
      move.classification === 'blunder' ||
      move.classification === 'mistake' ||
      move.classification === 'miss' ||
      move.classification === 'brilliant';

    if (!isTacticalTrigger) continue;

    // If opponent made a blunder/mistake/miss, the puzzle is for the other player to punish it!
    // Or if player played a brilliant move, the puzzle is to reproduce the brilliant combination!
    const isPunishTactic = move.classification !== 'brilliant';

    let puzzleFen: string;
    let turn: 'w' | 'b';
    let bestMove: string | undefined;
    let theme = 'Tactical Punishment';
    let difficulty: PuzzleDifficulty = 'mid';
    let rating = 1450;
    let desc = '';

    if (isPunishTactic) {
      // The position right AFTER opponent's mistake
      puzzleFen = move.fenAfter;
      turn = move.color === 'w' ? 'b' : 'w';

      // Look at the very next move in the game, or Stockfish's best recommendation
      const nextMove = moves[i + 1];
      bestMove = nextMove?.bestMoveSan || nextMove?.san;

      if (!bestMove) continue;

      if (move.classification === 'blunder') {
        theme = 'Blunder Punishment';
        difficulty = 'easy';
        rating = 1150;
        desc = `Your opponent played ${move.san} (Blunder). Find the crushing tactical refutation!`;
      } else if (move.classification === 'miss') {
        theme = 'Missed Opportunity';
        difficulty = 'mid';
        rating = 1500;
        desc = `Opponent missed a key defense with ${move.san}. Strike with the winning idea!`;
      } else {
        theme = 'Capitalizing on Mistake';
        difficulty = 'mid';
        rating = 1600;
        desc = `Opponent slipped with ${move.san}. Take the upper hand!`;
      }
    } else {
      // Brilliant move: position right BEFORE the brilliant move
      puzzleFen = move.fenBefore;
      turn = move.color;
      bestMove = move.san;
      theme = 'Brilliant Sacrifice';
      difficulty = 'hard';
      rating = 2100;
      desc = `In this game, a brilliant tactical masterstroke was found. Can you discover it?`;
    }

    try {
      const chessTest = new Chess(puzzleFen);
      if (chessTest.isGameOver()) continue;

      // Verify move is legal
      const testMove = chessTest.move(bestMove);
      if (!testMove) continue;

      const puzzleId = `game_puzzle_${Date.now()}_${i}`;
      generated.push({
        id: puzzleId,
        title: `${metadata?.white || 'White'} vs ${metadata?.black || 'Black'} (Move ${move.moveNumber})`,
        fen: puzzleFen,
        turn,
        difficulty,
        rating,
        theme,
        description: desc,
        moves: [bestMove],
        source: 'game_review',
        gameOrigin: {
          white: metadata?.white || 'White',
          black: metadata?.black || 'Black',
          moveNumber: move.moveNumber,
          blunderSan: move.san,
        },
      });
    } catch {
      // Skip invalid positions
    }
  }

  // Save to stored puzzles and return
  if (generated.length > 0) {
    const existing = getStoredUserPuzzles();
    const merged = [...generated, ...existing].slice(0, 50); // keep up to 50
    saveUserPuzzles(merged);
  }

  return generated;
}

/**
 * Creates a puzzle from custom FEN and solution copied from the internet
 */
export function importPuzzleFromInternet(
  title: string,
  fen: string,
  solutionMoves: string[],
  difficulty: PuzzleDifficulty,
  theme: string
): TacticsPuzzle {
  const chess = new Chess(fen);
  const puzzle: TacticsPuzzle = {
    id: `internet_puzzle_${Date.now()}`,
    title: title || 'Imported Internet Tactics Puzzle',
    fen,
    turn: chess.turn(),
    difficulty,
    rating: difficulty === 'easy' ? 1000 : difficulty === 'mid' ? 1500 : difficulty === 'hard' ? 2000 : 2550,
    theme: theme || 'Tactical Combination',
    description: `Find the best tactical sequence for ${chess.turn() === 'w' ? 'White' : 'Black'}.`,
    moves: solutionMoves,
    source: 'internet',
  };

  const existing = getStoredUserPuzzles();
  saveUserPuzzles([puzzle, ...existing]);
  return puzzle;
}
