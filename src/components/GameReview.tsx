import React, { useState, useEffect, useRef } from 'react';
import { ChessBoard } from './ChessBoard';
import { EvalBar } from './EvalBar';
import { MoveBadge, CLASSIFICATION_CONFIG } from './MoveBadge';
import { fetchUserRecentGames, SAMPLE_PGNS } from '../services/chesscomApi';
import { analyzeGameWithStockfish, extractPliesFromPgn } from '../services/pgnParser';
import { chessAudio } from '../services/soundEffects';
import type { GameReviewSummary, MoveAnalysis, ChesscomGameHeader, MoveClassification } from '../types/chess';
import {
  Search,
  Cpu,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Award,
  Eye,
  FileText,
  Volume2,
  VolumeX,
  RefreshCw,
  TrendingUp,
  Share2,
  Smartphone,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { generatePuzzlesFromReviewedGame } from '../services/puzzleGenerator';

interface GameReviewProps {
  initialPgn?: string;
  onOpenApkModal?: () => void;
  onNavigateToPuzzles?: () => void;
}

export const GameReview: React.FC<GameReviewProps> = ({ initialPgn, onOpenApkModal, onNavigateToPuzzles }) => {
  const [username, setUsername] = useState('hikaru');
  const [isFetchingGames, setIsFetchingGames] = useState(false);
  const [recentGames, setRecentGames] = useState<ChesscomGameHeader[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [extractedPuzzleCount, setExtractedPuzzleCount] = useState<number | null>(null);

  const [activePgn, setActivePgn] = useState<string>(initialPgn || SAMPLE_PGNS[0].pgn);
  const [customPgnModal, setCustomPgnModal] = useState(false);
  const [customPgnInput, setCustomPgnInput] = useState('');

  // Stockfish CPU analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number } | null>(null);
  const [reviewSummary, setReviewSummary] = useState<GameReviewSummary | null>(null);
  const [analysisDepth, setAnalysisDepth] = useState<number>(8);

  // Board navigation state
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [boardOrientation, setBoardOrientation] = useState<'w' | 'b'>('w');
  const [showBestMove, setShowBestMove] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Extracted raw moves
  const { moves: parsedPlies, metadata } = React.useMemo(() => {
    return extractPliesFromPgn(activePgn);
  }, [activePgn]);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial review analysis on mount or PGN change
  useEffect(() => {
    setCurrentPly(0);
    startAnalysis(activePgn, analysisDepth);
  }, [activePgn]);

  // Handle auto-play
  useEffect(() => {
    if (isPlayingAuto) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentPly((prev) => {
          if (prev >= parsedPlies.length) {
            setIsPlayingAuto(false);
            return prev;
          }
          const next = prev + 1;
          playMoveAudio(next);
          return next;
        });
      }, 1200);
    } else if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPlayingAuto, parsedPlies.length]);

  const playMoveAudio = (plyIndex: number) => {
    if (!soundEnabled) return;
    const move = reviewSummary?.moves[plyIndex - 1] || parsedPlies[plyIndex - 1];
    if (!move) return;

    if (reviewSummary) {
      const classified = reviewSummary.moves[plyIndex - 1];
      if (classified?.classification === 'brilliant') {
        chessAudio.playBrilliant();
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
        return;
      }
      if (classified?.classification === 'blunder') {
        chessAudio.playBlunder();
        return;
      }
    }

    if (move.san.includes('#')) {
      chessAudio.playGameEnd();
    } else if (move.san.includes('+')) {
      chessAudio.playCheck();
    } else if (move.san.includes('x')) {
      chessAudio.playCapture();
    } else if (move.san === 'O-O' || move.san === 'O-O-O') {
      chessAudio.playCastle();
    } else {
      chessAudio.playMove();
    }
  };

  const startAnalysis = async (pgnToAnalyze: string, depth: number) => {
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: parsedPlies.length || 1 });

    try {
      const summary = await analyzeGameWithStockfish(pgnToAnalyze, depth, (curr, tot) => {
        setAnalysisProgress({ current: curr, total: tot });
      });
      setReviewSummary(summary);
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    } catch (err) {
      console.error('Analysis failed:', err);
      setIsAnalyzing(false);
    }
  };

  const handleFetchChesscom = async () => {
    if (!username.trim()) return;
    setIsFetchingGames(true);
    setFetchError(null);

    try {
      const games = await fetchUserRecentGames(username.trim());
      if (games.length === 0) {
        setFetchError(`No recent games found for @${username}. Try "hikaru" or "magnuscarlsen".`);
      } else {
        setRecentGames(games);
        // Load the most recent game
        if (games[0].pgn) {
          setActivePgn(games[0].pgn);
        }
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch from Chess.com API');
    } finally {
      setIsFetchingGames(false);
    }
  };

  // Current position FEN
  const currentFen = currentPly === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : parsedPlies[currentPly - 1]?.fenAfter;

  const currentMoveAnalysis: MoveAnalysis | undefined = reviewSummary?.moves[currentPly - 1];
  const lastMove = currentPly > 0 ? { from: parsedPlies[currentPly - 1].from, to: parsedPlies[currentPly - 1].to } : null;

  // Best move coordinates for arrow
  const bestMove = currentMoveAnalysis?.bestMoveUci
    ? {
        from: currentMoveAnalysis.bestMoveUci.substring(0, 2),
        to: currentMoveAnalysis.bestMoveUci.substring(2, 4),
      }
    : null;

  const currentEval = currentMoveAnalysis?.evaluation ?? 20;
  const currentMateIn = currentMoveAnalysis?.mateIn;

  const goToPly = (ply: number) => {
    const clamped = Math.max(0, Math.min(parsedPlies.length, ply));
    setCurrentPly(clamped);
    playMoveAudio(clamped);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      {/* Top App Bar with CPU & Engine Status */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              Stockfish 19 Engine
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
                CPU On-Device
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Zero Server Latency • 100% Privacy</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* APK Direct Download / Modal Trigger */}
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-xs font-bold text-emerald-300 border border-emerald-500/40 transition active:scale-95 cursor-pointer shadow-sm"
              title="Download compiled Android APK (4.5 MB • Signed)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Get APK (4.5MB)</span>
              <span className="sm:hidden">APK</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              chessAudio.enabled = next;
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Custom PGN */}
          <button
            onClick={() => setCustomPgnModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Paste PGN
          </button>
        </div>
      </div>

      {/* Chess.com Username Fetch Bar */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800/60">
        <div className="max-w-2xl mx-auto">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Review Chess.com Games by Username
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchChesscom()}
                placeholder="Enter Chess.com username (e.g. hikaru, magnuscarlsen)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              onClick={handleFetchChesscom}
              disabled={isFetchingGames}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
            >
              {isFetchingGames ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Fetch Games
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-slate-500">Popular:</span>
            {['hikaru', 'magnuscarlsen', 'danielnaroditsky', 'gothamchess'].map((user) => (
              <button
                key={user}
                onClick={() => {
                  setUsername(user);
                  handleFetchChesscom();
                }}
                className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/60 transition"
              >
                @{user}
              </button>
            ))}
            <span className="text-slate-600 mx-1">•</span>
            <span className="text-[10px] text-slate-500">Sample Classics:</span>
            {SAMPLE_PGNS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => setActivePgn(sample.pgn)}
                className="text-[10px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800/60 transition truncate max-w-[140px]"
                title={sample.title}
              >
                {sample.title.split('(')[0]}
              </button>
            ))}
          </div>

          {fetchError && (
            <p className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg p-2">
              {fetchError}
            </p>
          )}

          {/* Recent fetched games list preview */}
          {recentGames.length > 0 && (
            <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 block mb-1">
                Recent games for @{username} ({recentGames.length})
              </span>
              {recentGames.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setActivePgn(g.pgn)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                    activePgn === g.pgn ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-200' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {g.white.username} ({g.white.rating}) vs {g.black.username} ({g.black.rating})
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-800 rounded font-mono text-slate-400">
                      {g.timeClass}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{g.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analysis CPU Banner / Progress */}
      {isAnalyzing && analysisProgress && (
        <div className="bg-emerald-950/40 border-b border-emerald-800/50 px-4 py-2.5">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center text-xs text-emerald-300 mb-1 font-semibold">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                Calculating positions on your CPU with Stockfish...
              </span>
              <span>
                Move {analysisProgress.current} / {analysisProgress.total} (
                {Math.round((analysisProgress.current / Math.max(1, analysisProgress.total)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-150"
                style={{ width: `${(analysisProgress.current / Math.max(1, analysisProgress.total)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Review Section: Game Header, Board, Eval Bar, Move Info */}
      <div className="max-w-4xl mx-auto w-full p-3 sm:p-4 space-y-4">
        {/* Game Title & CAPS Accuracy Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {metadata.white || 'White'} vs {metadata.black || 'Black'}
                {metadata.result && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {metadata.result}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {metadata.event || 'Chess Game'} • {metadata.date || 'Recent'} • {parsedPlies.length} moves
                {metadata.eco && ` • ECO ${metadata.eco}`}
              </p>
            </div>

            {/* Depth Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Engine Depth:</span>
              <select
                value={analysisDepth}
                onChange={(e) => {
                  const d = parseInt(e.target.value, 10);
                  setAnalysisDepth(d);
                  startAnalysis(activePgn, d);
                }}
                disabled={isAnalyzing}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value={6}>Depth 6 (Fast)</option>
                <option value={8}>Depth 8 (Balanced)</option>
                <option value={12}>Depth 12 (Deep)</option>
                <option value={16}>Depth 16 (Master)</option>
              </select>
            </div>
          </div>

          {/* CAPS Accuracy Score Comparison */}
          {reviewSummary && (
            <div className="grid grid-cols-2 gap-3 pt-3">
              {/* White accuracy card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400" />
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[110px]">
                      {metadata.white || 'White'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {metadata.whiteElo ? `${metadata.whiteElo} Elo` : 'Accuracy'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {reviewSummary.whiteAccuracy}%
                  </span>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">CAPS Score</div>
                </div>
              </div>

              {/* Black accuracy card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600" />
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[110px]">
                      {metadata.black || 'Black'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {metadata.blackElo ? `${metadata.blackElo} Elo` : 'Accuracy'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {reviewSummary.blackAccuracy}%
                  </span>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">CAPS Score</div>
                </div>
              </div>
            </div>
          )}

          {/* Move Classification Pill Counters Table */}
          {reviewSummary && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Move Classification Breakdown
                </span>
                <button
                  onClick={() => {
                    const generated = generatePuzzlesFromReviewedGame(reviewSummary, metadata);
                    setExtractedPuzzleCount(generated.length);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Extract Tactics Puzzles from this Game
                </button>
              </div>

              {/* Success Extraction Banner */}
              {extractedPuzzleCount !== null && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-between text-xs text-amber-200">
                  <span>
                    ✓ Extracted <strong>{extractedPuzzleCount} tactics puzzles</strong> from critical moments in this game!
                  </span>
                  {onNavigateToPuzzles && (
                    <button
                      onClick={onNavigateToPuzzles}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-[11px] transition shadow"
                    >
                      Solve Now →
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                {(['brilliant', 'great', 'best', 'excellent', 'inaccuracy', 'mistake', 'miss', 'blunder'] as MoveClassification[]).map(
                  (cKey) => {
                    const whiteCount = reviewSummary.whiteStats[cKey] || 0;
                    const blackCount = reviewSummary.blackStats[cKey] || 0;
                    const cfg = CLASSIFICATION_CONFIG[cKey];

                    return (
                      <div
                        key={cKey}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${cfg.text}`}>{cfg.symbol}</span>
                          <span className="text-[11px] text-slate-300 capitalize">{cKey}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <span className="text-white font-bold">{whiteCount}</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400 font-bold">{blackCount}</span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>

        {/* Board & Interactive Evaluation Bar Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Left Column: Board + Eval Bar */}
          <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
            <div className="flex gap-3 items-stretch justify-center">
              {/* Dynamic Animated Evaluation Bar */}
              <EvalBar
                score={currentEval}
                mateIn={currentMateIn}
                orientation={boardOrientation}
                heightClass="h-[320px] sm:h-[400px]"
              />

              {/* 8x8 Chessboard */}
              <div className="flex-1 max-w-[400px]">
                <ChessBoard
                  fen={currentFen}
                  orientation={boardOrientation}
                  interactive={false}
                  lastMove={lastMove}
                  bestMove={bestMove}
                  showBestMoveArrow={showBestMove}
                />
              </div>
            </div>

            {/* Board Controls */}
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPly(0)}
                  disabled={currentPly === 0}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                  title="First Move"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPly(currentPly - 1)}
                  disabled={currentPly === 0}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                  title="Previous Move"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                  className={`p-2 rounded-lg text-white font-bold transition flex items-center gap-1 ${
                    isPlayingAuto ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                  title={isPlayingAuto ? 'Pause' : 'Auto Play'}
                >
                  {isPlayingAuto ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => goToPly(currentPly + 1)}
                  disabled={currentPly >= parsedPlies.length}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                  title="Next Move"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPly(parsedPlies.length)}
                  disabled={currentPly >= parsedPlies.length}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                  title="Last Move"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Stockfish Arrow */}
                <button
                  onClick={() => setShowBestMove(!showBestMove)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                    showBestMove
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Best Move
                </button>

                {/* Flip Board */}
                <button
                  onClick={() => setBoardOrientation(boardOrientation === 'w' ? 'b' : 'w')}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Flip Board"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Move Analysis Inspector & Move List */}
          <div className="md:col-span-5 space-y-3">
            {/* Current Move Detail Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {currentPly === 0
                    ? 'Starting Position'
                    : `Move ${Math.floor((currentPly - 1) / 2) + 1} (${currentMoveAnalysis?.color === 'w' ? 'White' : 'Black'})`}
                </span>
                {currentMoveAnalysis && (
                  <MoveBadge classification={currentMoveAnalysis.classification} showLabel size="md" />
                )}
              </div>

              {currentPly === 0 ? (
                <p className="text-xs text-slate-400 py-3">
                  Starting position. Use the arrow keys or tap any move below to step through the game review.
                </p>
              ) : (
                <div className="space-y-2 py-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white font-mono">
                      {currentMoveAnalysis?.san || parsedPlies[currentPly - 1]?.san}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {currentMateIn !== undefined && currentMateIn !== 0
                        ? `Mate in ${Math.abs(currentMateIn)}`
                        : `${currentEval >= 0 ? '+' : ''}${(currentEval / 100).toFixed(2)}`}
                    </span>
                  </div>

                  {/* Stockfish Comment */}
                  <p className="text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 leading-relaxed">
                    {currentMoveAnalysis?.comment || 'Standard chess play.'}
                  </p>

                  {/* Stockfish Engine Recommendation */}
                  {currentMoveAnalysis?.bestMoveSan && currentMoveAnalysis.bestMoveSan !== currentMoveAnalysis.san && (
                    <div className="text-xs bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="text-slate-400">Stockfish recommended:</span>
                      <span className="font-bold font-mono text-emerald-300">
                        {currentMoveAnalysis.bestMoveSan}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Advantage Graph */}
            {reviewSummary && reviewSummary.moves.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Advantage Chart
                  </span>
                  <span className="text-[9px] text-slate-500">Tap dot to jump</span>
                </div>

                <div className="relative h-20 w-full bg-slate-950 rounded-lg p-1 overflow-hidden border border-slate-800 flex items-center">
                  {/* Zero line */}
                  <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-700/60 pointer-events-none" />

                  {/* SVG Line / Dots */}
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${reviewSummary.moves.length} 100`} preserveAspectRatio="none">
                    {/* Polyline */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      points={reviewSummary.moves
                        .map((m, idx) => {
                          // Clamped between -600 and +600 cp
                          const clamped = Math.max(-600, Math.min(600, m.evaluation));
                          // map to 0..100 SVG y
                          const y = 50 - (clamped / 600) * 45;
                          return `${idx},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Circles for highlights */}
                    {reviewSummary.moves.map((m, idx) => {
                      const isBrilliant = m.classification === 'brilliant';
                      const isBlunder = m.classification === 'blunder';
                      const isMistake = m.classification === 'mistake';
                      if (!isBrilliant && !isBlunder && !isMistake) return null;

                      const clamped = Math.max(-600, Math.min(600, m.evaluation));
                      const y = 50 - (clamped / 600) * 45;
                      const color = isBrilliant ? '#06b6d4' : isBlunder ? '#f43f5e' : '#f59e0b';

                      return (
                        <circle
                          key={idx}
                          cx={idx}
                          cy={y}
                          r="3"
                          fill={color}
                          className="cursor-pointer hover:r-5 transition-all"
                          onClick={() => goToPly(idx + 1)}
                        />
                      );
                    })}

                    {/* Current ply vertical cursor */}
                    {currentPly > 0 && (
                      <line
                        x1={currentPly - 1}
                        y1="0"
                        x2={currentPly - 1}
                        y2="100"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>
                </div>
              </div>
            )}

            {/* Scrollable Move List with Badges */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl max-h-64 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
                Move List ({parsedPlies.length} Plies)
              </span>

              <div className="space-y-1">
                {Array.from({ length: Math.ceil(parsedPlies.length / 2) }).map((_, moveIdx) => {
                  const whitePly = moveIdx * 2 + 1;
                  const blackPly = moveIdx * 2 + 2;
                  const whiteMove = parsedPlies[whitePly - 1];
                  const blackMove = parsedPlies[blackPly - 1];

                  const whiteAnalysis = reviewSummary?.moves[whitePly - 1];
                  const blackAnalysis = reviewSummary?.moves[blackPly - 1];

                  return (
                    <div
                      key={moveIdx}
                      className="grid grid-cols-12 items-center gap-1.5 text-xs py-1 px-1.5 rounded-lg hover:bg-slate-800/60"
                    >
                      <span className="col-span-2 text-slate-500 font-mono text-[11px]">
                        {moveIdx + 1}.
                      </span>

                      {/* White Move */}
                      <button
                        onClick={() => goToPly(whitePly)}
                        className={`col-span-5 flex items-center justify-between px-2 py-1 rounded-md text-left transition font-mono ${
                          currentPly === whitePly
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <span>{whiteMove?.san}</span>
                        {whiteAnalysis && <MoveBadge classification={whiteAnalysis.classification} size="sm" />}
                      </button>

                      {/* Black Move */}
                      {blackMove ? (
                        <button
                          onClick={() => goToPly(blackPly)}
                          className={`col-span-5 flex items-center justify-between px-2 py-1 rounded-md text-left transition font-mono ${
                            currentPly === blackPly
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{blackMove.san}</span>
                          {blackAnalysis && <MoveBadge classification={blackAnalysis.classification} size="sm" />}
                        </button>
                      ) : (
                        <div className="col-span-5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paste Custom PGN Modal */}
      {customPgnModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Paste Chess PGN Data
            </h3>
            <p className="text-xs text-slate-400">
              Paste standard PGN format from Chess.com, Lichess, or tournaments. Stockfish will parse and evaluate every move locally.
            </p>

            <textarea
              rows={8}
              value={customPgnInput}
              onChange={(e) => setCustomPgnInput(e.target.value)}
              placeholder='[Event "World Championship"]&#10;1. e4 e5 2. Nf3 Nc6 3. Bb5 a6...'
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCustomPgnModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (customPgnInput.trim()) {
                    setActivePgn(customPgnInput.trim());
                    setCustomPgnModal(false);
                    setCustomPgnInput('');
                  }
                }}
                disabled={!customPgnInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition"
              >
                Load & Review Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
