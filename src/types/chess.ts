/**
 * Chess review, engine evaluation, and game types
 */

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder';

export interface MoveAnalysis {
  moveNumber: number;
  ply: number;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
  color: 'w' | 'b';
  evaluation: number; // in centipawns from White's perspective (+ = white advantage)
  mateIn?: number; // mate in N (positive for white mate, negative for black mate)
  winProbability: number; // 0 to 100% for the side to move
  bestMoveSan?: string;
  bestMoveUci?: string;
  bestEvaluation?: number;
  classification: MoveClassification;
  comment?: string;
  timeSpentMs?: number;
}

export interface GameReviewSummary {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteStats: Record<MoveClassification, number>;
  blackStats: Record<MoveClassification, number>;
  moves: MoveAnalysis[];
  opening?: {
    eco: string;
    name: string;
  };
  winner?: 'white' | 'black' | 'draw';
}

export interface ChesscomGameHeader {
  id: string;
  url: string;
  pgn: string;
  timeControl: string;
  timeClass: 'bullet' | 'blitz' | 'rapid' | 'daily';
  date: string;
  white: {
    username: string;
    rating: number;
    result: string;
    avatar?: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
    avatar?: string;
  };
}

export interface BotProfile {
  id: string;
  name: string;
  avatar: string;
  title?: string;
  country: string;
  elo: number;
  stockfishLevel: number; // 1 to 20
  depth: number;
  description: string;
  personality: 'aggressive' | 'positional' | 'balanced' | 'tactical' | 'random';
  blunderChance: number; // 0 to 100%
  category: 'beginner' | 'intermediate' | 'advanced' | 'master' | 'stockfish';
}

export type PuzzleDifficulty = 'easy' | 'mid' | 'hard' | 'gm';

export interface TacticsPuzzle {
  id: string;
  title: string;
  fen: string;
  turn: 'w' | 'b';
  difficulty: PuzzleDifficulty;
  rating: number; // e.g. 1100, 1550, 1950, 2600
  theme: string; // e.g. 'Back-Rank Mate', 'Royal Fork', 'Queen Sacrifice', 'Deflection', 'Discovered Attack'
  description: string;
  moves: string[]; // Solution moves in UCI or SAN, alternating player and opponent, e.g. ['Qxf7+', 'Kh8', 'Qf8#']
  source: 'game_review' | 'curated' | 'internet';
  gameOrigin?: {
    white: string;
    black: string;
    moveNumber: number;
    blunderSan?: string;
  };
}

export type ActiveTab = 'review' | 'offline' | 'bots' | 'puzzles' | 'history' | 'legal' | 'apk';
