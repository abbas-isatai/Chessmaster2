import React, { useState, useEffect, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { CURATED_PUZZLES } from '../data/puzzles';
import { getStoredUserPuzzles, importPuzzleFromInternet } from '../services/puzzleGenerator';
import { chessAudio } from '../services/soundEffects';
import type { TacticsPuzzle, PuzzleDifficulty } from '../types/chess';
import confetti from 'canvas-confetti';
import {
  Flame,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Plus,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
  ClipboardCopy,
} from 'lucide-react';

interface TacticsPuzzleProps {
  onGoToReview?: () => void;
}

export const TacticsPuzzleSection: React.FC<TacticsPuzzleProps> = ({ onGoToReview }) => {
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | PuzzleDifficulty | 'game_review'>('all');
  const [userPuzzles, setUserPuzzles] = useState<TacticsPuzzle[]>(() => getStoredUserPuzzles());
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState<number>(0);

  // User puzzle rating & streak persistence
  const [userRating, setUserRating] = useState<number>(() => {
    const saved = localStorage.getItem('tactics_user_rating');
    return saved ? parseInt(saved, 10) : 1500;
  });
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem('tactics_streak');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Current active puzzle state
  const [puzzleMoveStep, setPuzzleMoveStep] = useState<number>(0);
  const [puzzleStatus, setPuzzleStatus] = useState<'solving' | 'correct' | 'wrong'>('solving');
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [showSolutionActive, setShowSolutionActive] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Custom import form
  const [importTitle, setImportTitle] = useState('');
  const [importFen, setImportFen] = useState('');
  const [importMoves, setImportMoves] = useState('');
  const [importDiff, setImportDiff] = useState<PuzzleDifficulty>('mid');
  const [importTheme, setImportTheme] = useState('');

  // Combined puzzle library
  const allPuzzles = useMemo(() => {
    const combined = [...userPuzzles, ...CURATED_PUZZLES];
    if (difficultyFilter === 'all') return combined;
    if (difficultyFilter === 'game_review') return combined.filter((p) => p.source === 'game_review');
    return combined.filter((p) => p.difficulty === difficultyFilter);
  }, [userPuzzles, difficultyFilter]);

  const activePuzzle: TacticsPuzzle | undefined = allPuzzles[currentPuzzleIndex] || CURATED_PUZZLES[0];

  // Live chess instance for the active puzzle
  const [chess, setChess] = useState<Chess>(() => new Chess(activePuzzle?.fen || '8/8/8/8/8/8/8/8 w - - 0 1'));
  const [fen, setFen] = useState<string>(chess.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Reinitialize chess when active puzzle changes
  useEffect(() => {
    if (!activePuzzle) return;
    try {
      const newGame = new Chess(activePuzzle.fen);
      setChess(newGame);
      setFen(newGame.fen());
      setPuzzleMoveStep(0);
      setPuzzleStatus('solving');
      setHintActive(false);
      setShowSolutionActive(false);
      setLastMove(null);
    } catch {
      // invalid fen fallback
    }
  }, [activePuzzle]);

  const handlePlayerMove = (from: string, to: string, promotion?: string) => {
    if (!activePuzzle || puzzleStatus === 'correct') return;

    try {
      // Test if move is valid in chess.js
      const tempGame = new Chess(chess.fen());
      const moveResult = tempGame.move({
        from: from as Square,
        to: to as Square,
        promotion: (promotion as any) || 'q',
      });

      if (!moveResult) return;

      const expectedMoveSan = activePuzzle.moves[puzzleMoveStep];

      // Convert expected SAN or UCI to compare
      const isSanMatch = moveResult.san === expectedMoveSan;
      const isUciMatch = `${moveResult.from}${moveResult.to}` === expectedMoveSan;

      if (isSanMatch || isUciMatch) {
        // Correct move!
        chess.move({
          from: from as Square,
          to: to as Square,
          promotion: (promotion as any) || 'q',
        });
        setFen(chess.fen());
        setLastMove({ from, to });
        chessAudio.playMove();

        const nextStep = puzzleMoveStep + 1;

        if (nextStep >= activePuzzle.moves.length) {
          // Puzzle Solved!
          setPuzzleStatus('correct');
          chessAudio.playBrilliant();
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });

          // Update rating & streak
          const newRating = userRating + 15;
          const newStreak = streak + 1;
          setUserRating(newRating);
          setStreak(newStreak);
          localStorage.setItem('tactics_user_rating', newRating.toString());
          localStorage.setItem('tactics_streak', newStreak.toString());
        } else {
          // Opponent response move in puzzle
          setPuzzleMoveStep(nextStep);
          setTimeout(() => {
            const oppMove = activePuzzle.moves[nextStep];
            try {
              const oppRes = chess.move(oppMove);
              if (oppRes) {
                setFen(chess.fen());
                setLastMove({ from: oppRes.from, to: oppRes.to });
                chessAudio.playMove();
                setPuzzleMoveStep(nextStep + 1);
              }
            } catch {
              // fallback
            }
          }, 450);
        }
      } else {
        // Wrong move!
        setPuzzleStatus('wrong');
        chessAudio.playBlunder();

        const newRating = Math.max(500, userRating - 10);
        setUserRating(newRating);
        setStreak(0);
        localStorage.setItem('tactics_user_rating', newRating.toString());
        localStorage.setItem('tactics_streak', '0');
      }
    } catch {
      // illegal move
    }
  };

  const handleRetry = () => {
    if (!activePuzzle) return;
    const freshGame = new Chess(activePuzzle.fen);
    setChess(freshGame);
    setFen(freshGame.fen());
    setPuzzleMoveStep(0);
    setPuzzleStatus('solving');
    setLastMove(null);
  };

  const handleNextPuzzle = () => {
    if (allPuzzles.length === 0) return;
    const nextIdx = (currentPuzzleIndex + 1) % allPuzzles.length;
    setCurrentPuzzleIndex(nextIdx);
  };

  const handleShowSolution = () => {
    if (!activePuzzle) return;
    setShowSolutionActive(true);
    const demo = new Chess(activePuzzle.fen);
    for (const m of activePuzzle.moves) {
      try {
        demo.move(m);
      } catch {
        //
      }
    }
    setFen(demo.fen());
    setPuzzleStatus('correct');
  };

  const handleImportSubmit = () => {
    if (!importFen.trim() || !importMoves.trim()) return;
    try {
      const movesArray = importMoves
        .split(/[\s,]+/)
        .map((m) => m.trim())
        .filter(Boolean);
      const imported = importPuzzleFromInternet(
        importTitle.trim() || 'Custom Internet Puzzle',
        importFen.trim(),
        movesArray,
        importDiff,
        importTheme.trim() || 'Combination'
      );
      setUserPuzzles(getStoredUserPuzzles());
      setShowImportModal(false);
      setDifficultyFilter('all');
      setCurrentPuzzleIndex(0);
      setImportFen('');
      setImportMoves('');
      setImportTitle('');
    } catch (err) {
      alert('Failed to parse puzzle FEN. Please verify format.');
    }
  };

  const hintText = useMemo(() => {
    if (!activePuzzle || !hintActive) return null;
    const targetMove = activePuzzle.moves[puzzleMoveStep];
    if (!targetMove) return null;
    return `Hint: Look for a tactical idea involving ${targetMove[0] === 'N' ? 'the Knight' : targetMove[0] === 'B' ? 'the Bishop' : targetMove[0] === 'R' ? 'the Rook' : targetMove[0] === 'Q' ? 'the Queen' : 'a pawn'}.`;
  }, [activePuzzle, hintActive, puzzleMoveStep]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      {/* Top Bar with Tactical Rating & Streak */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Tactics Puzzles
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-mono">
                {activePuzzle?.rating} Elo
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Procedurally generated from your games & Internet GM puzzles
            </p>
          </div>
        </div>

        {/* Rating & Streak Badges */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-1 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-white">{userRating}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center gap-1 text-xs text-amber-300">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold">{streak}</span>
          </div>

          {/* Import / Paste puzzle from internet button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Import/Copy Puzzle from Internet"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full p-4 space-y-4">
        {/* Difficulty Pill Filter Selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Puzzles' },
            { id: 'easy', label: 'Easy (800-1200)' },
            { id: 'mid', label: 'Mid (1300-1700)' },
            { id: 'hard', label: 'Hard (1800-2200)' },
            { id: 'gm', label: 'GM (2300+)' },
            { id: 'game_review', label: 'From My Games ♟️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setDifficultyFilter(tab.id as any);
                setCurrentPuzzleIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                difficultyFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Puzzle Header Card */}
        {activePuzzle && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                  {activePuzzle.theme} • {activePuzzle.difficulty.toUpperCase()}
                </span>
                <h3 className="text-sm font-bold text-white">{activePuzzle.title}</h3>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full border ${
                  activePuzzle.turn === 'w' ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-600'
                }`} />
                <span className="text-xs font-bold text-slate-300">
                  {activePuzzle.turn === 'w' ? 'White to move' : 'Black to move'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              {activePuzzle.description}
            </p>

            {/* Game origin if generated from review */}
            {activePuzzle.gameOrigin && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Procedurally extracted from your game: {activePuzzle.gameOrigin.white} vs {activePuzzle.gameOrigin.black} (Move {activePuzzle.gameOrigin.moveNumber})
              </div>
            )}
          </div>
        )}

        {/* The Board: Automatically flipped to side to move */}
        <div className="relative">
          <ChessBoard
            fen={fen}
            orientation={activePuzzle?.turn || 'w'}
            onMove={handlePlayerMove}
            interactive={puzzleStatus === 'solving'}
            lastMove={lastMove}
          />
        </div>

        {/* Status Response Notification */}
        {puzzleStatus === 'correct' && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Brilliant! Puzzle Solved (+15 Rating)</span>
            </div>
            <button
              onClick={handleNextPuzzle}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md shadow-emerald-950"
            >
              Next Puzzle
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {puzzleStatus === 'wrong' && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-between shadow-xl animate-shake">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>Not the best move! (-10 Rating)</span>
            </div>
            <button
              onClick={handleRetry}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Hint text card if activated */}
        {hintText && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              {hintText}
            </span>
          </div>
        )}

        {/* Puzzle Action Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHintActive(true)}
              disabled={hintActive || puzzleStatus !== 'solving'}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 transition disabled:opacity-40"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Get Hint
            </button>

            <button
              onClick={handleShowSolution}
              disabled={puzzleStatus === 'correct'}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Solution
            </button>
          </div>

          <button
            onClick={handleNextPuzzle}
            className="flex items-center gap-1 text-xs px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md shadow-emerald-950"
          >
            Skip / Next
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Copy / Import Puzzle from Internet Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardCopy className="w-4 h-4 text-emerald-400" />
                Import Chess Puzzle from Internet
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Puzzle Title</label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="e.g. Lichess Daily Tactical Puzzle #4912"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Position FEN String</label>
                <input
                  type="text"
                  value={importFen}
                  onChange={(e) => setImportFen(e.target.value)}
                  placeholder="r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/2P2N2/PPP2PPP/R1BQK2R w KQkq - 0 6"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Solution Moves (space or comma separated SAN/UCI)
                </label>
                <input
                  type="text"
                  value={importMoves}
                  onChange={(e) => setImportMoves(e.target.value)}
                  placeholder="e.g. Bxf7+ Kxf7 Qd5+"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={importDiff}
                    onChange={(e) => setImportDiff(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="easy">Easy (800-1200)</option>
                    <option value="mid">Mid (1300-1700)</option>
                    <option value="hard">Hard (1800-2200)</option>
                    <option value="gm">GM (2300+)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Theme (optional)</label>
                  <input
                    type="text"
                    value={importTheme}
                    onChange={(e) => setImportTheme(e.target.value)}
                    placeholder="e.g. Pin, Fork, Sacrifice"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importFen.trim() || !importMoves.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition"
              >
                Save & Play Puzzle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
