import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { ChessPiece } from './ChessPieces';
import { chessAudio } from '../services/soundEffects';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Clock,
  Undo2,
  Flag,
  Handshake,
  Play,
  Pause,
  Award,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface OfflinePlayProps {
  onReviewGame: (pgn: string) => void;
}

export const OfflinePlay: React.FC<OfflinePlayProps> = ({ onReviewGame }) => {
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [history, setHistory] = useState<{ san: string; from: string; to: string }[]>([]);
  const [autoFlip, setAutoFlip] = useState<boolean>(true);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');

  // Timers: in seconds
  const [timeControl, setTimeControl] = useState<number>(300); // 5 mins default
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [increment, setIncrement] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Game over state
  const [gameOverInfo, setGameOverInfo] = useState<{
    over: boolean;
    reason: string;
    winner?: 'w' | 'b' | 'draw';
  }>({ over: false, reason: '' });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clock tick
  useEffect(() => {
    if (timerRunning && !gameOverInfo.over && timeControl > 0) {
      timerRef.current = setInterval(() => {
        const turn = chess.turn();
        if (turn === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 1) {
              handleTimeOut('w');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              handleTimeOut('b');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, gameOverInfo.over, chess.turn(), timeControl]);

  const handleTimeOut = (flagColor: 'w' | 'b') => {
    setTimerRunning(false);
    chessAudio.playGameEnd();
    setGameOverInfo({
      over: true,
      reason: flagColor === 'w' ? 'Black won on time!' : 'White won on time!',
      winner: flagColor === 'w' ? 'b' : 'w',
    });
  };

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (gameOverInfo.over) return;

    try {
      const moveResult = chess.move({
        from: from as Square,
        to: to as Square,
        promotion: (promotion as any) || 'q',
      });

      if (!moveResult) return;

      // Start timer on first move
      if (!timerRunning && timeControl > 0) {
        setTimerRunning(true);
      }

      // Add increment
      if (increment > 0) {
        if (moveResult.color === 'w') {
          setWhiteTime((t) => t + increment);
        } else {
          setBlackTime((t) => t + increment);
        }
      }

      // Sound feedback
      if (chess.isGameOver()) {
        chessAudio.playGameEnd();
        if (chess.isCheckmate()) {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        }
      } else if (chess.inCheck()) {
        chessAudio.playCheck();
      } else if (moveResult.captured) {
        chessAudio.playCapture();
      } else if (moveResult.san === 'O-O' || moveResult.san === 'O-O-O') {
        chessAudio.playCastle();
      } else {
        chessAudio.playMove();
      }

      // Update state
      setFen(chess.fen());
      setHistory((prev) => [...prev, { san: moveResult.san, from: moveResult.from, to: moveResult.to }]);

      // Check game over
      if (chess.isGameOver()) {
        setTimerRunning(false);
        let reason = 'Game over';
        let winner: 'w' | 'b' | 'draw' = 'draw';

        if (chess.isCheckmate()) {
          winner = moveResult.color;
          reason = `Checkmate! ${winner === 'w' ? 'White' : 'Black'} wins!`;
        } else if (chess.isDraw()) {
          if (chess.isStalemate()) reason = 'Draw by Stalemate';
          else if (chess.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
          else if (chess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
          else reason = 'Draw by 50-Move Rule';
        }

        setGameOverInfo({ over: true, reason, winner });
      } else if (autoFlip) {
        // Pass-and-play phone turn flip: rotate board to opponent's view
        setOrientation(chess.turn());
      }
    } catch (err) {
      // Invalid move rejected by chess.js
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || gameOverInfo.over) return;
    chess.undo();
    setFen(chess.fen());
    setHistory((prev) => prev.slice(0, -1));
    if (autoFlip) {
      setOrientation(chess.turn());
    }
  };

  const handleResign = () => {
    if (gameOverInfo.over) return;
    setTimerRunning(false);
    const turn = chess.turn();
    const winner = turn === 'w' ? 'b' : 'w';
    chessAudio.playGameEnd();
    setGameOverInfo({
      over: true,
      reason: `${turn === 'w' ? 'White' : 'Black'} resigned. ${winner === 'w' ? 'White' : 'Black'} wins!`,
      winner,
    });
  };

  const handleDraw = () => {
    if (gameOverInfo.over) return;
    setTimerRunning(false);
    chessAudio.playGameEnd();
    setGameOverInfo({
      over: true,
      reason: 'Game agreed drawn by mutual agreement.',
      winner: 'draw',
    });
  };

  const handleResetGame = (seconds: number = timeControl) => {
    const newChess = new Chess();
    setChess(newChess);
    setFen(newChess.fen());
    setHistory([]);
    setTimeControl(seconds);
    setWhiteTime(seconds);
    setBlackTime(seconds);
    setTimerRunning(false);
    setGameOverInfo({ over: false, reason: '' });
    setOrientation('w');
  };

  // Material evaluation: calculate captured pieces
  const getCapturedPieces = () => {
    const startPieces: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentPiecesWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentPiecesBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type !== 'k') {
          if (p.color === 'w') currentPiecesWhite[p.type]++;
          else currentPiecesBlack[p.type]++;
        }
      }
    }

    const whiteCaptured: { type: 'p' | 'n' | 'b' | 'r' | 'q'; count: number }[] = [];
    const blackCaptured: { type: 'p' | 'n' | 'b' | 'r' | 'q'; count: number }[] = [];

    (['p', 'n', 'b', 'r', 'q'] as const).forEach((t) => {
      const lostByBlack = startPieces[t] - currentPiecesBlack[t];
      if (lostByBlack > 0) whiteCaptured.push({ type: t, count: lostByBlack });

      const lostByWhite = startPieces[t] - currentPiecesWhite[t];
      if (lostByWhite > 0) blackCaptured.push({ type: t, count: lostByWhite });
    });

    return { whiteCaptured, blackCaptured };
  };

  const { whiteCaptured, blackCaptured } = getCapturedPieces();

  const formatTime = (secs: number) => {
    if (secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const lastMove = history.length > 0 ? { from: history[history.length - 1].from, to: history[history.length - 1].to } : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            Turn-by-Turn Offline Game
          </h2>
          <p className="text-[11px] text-slate-400">Pass & Play on One Device • Strict FIDE Rules</p>
        </div>

        {/* Time Control Options */}
        <div className="flex items-center gap-1.5">
          <select
            value={timeControl}
            onChange={(e) => handleResetGame(parseInt(e.target.value, 10))}
            disabled={history.length > 0 && !gameOverInfo.over}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value={0}>No Clock (Unlimited)</option>
            <option value={60}>1 min (Bullet)</option>
            <option value={180}>3 min (Blitz)</option>
            <option value={300}>5 min (Blitz)</option>
            <option value={600}>10 min (Rapid)</option>
            <option value={900}>15 min (Rapid)</option>
          </select>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full p-4 space-y-4">
        {/* Opponent (Top) Player Card & Clock */}
        <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
          chess.turn() === (orientation === 'w' ? 'b' : 'w') && !gameOverInfo.over
            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
              {orientation === 'w' ? 'B' : 'W'}
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {orientation === 'w' ? 'Black Player' : 'White Player'}
              </div>
              {/* Captured piece icons */}
              <div className="flex items-center gap-0.5 mt-0.5 h-3">
                {(orientation === 'w' ? blackCaptured : whiteCaptured).map((item, idx) => (
                  <span key={idx} className="text-[10px] text-slate-400 font-mono">
                    {item.count > 1 ? `${item.count}${item.type}` : item.type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {timeControl > 0 && (
            <div className={`px-3 py-1.5 rounded-xl font-mono text-base font-black ${
              chess.turn() === (orientation === 'w' ? 'b' : 'w')
                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                : 'bg-slate-950 text-slate-300'
            }`}>
              {formatTime(orientation === 'w' ? blackTime : whiteTime)}
            </div>
          )}
        </div>

        {/* The Chessboard */}
        <div className="relative">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            onMove={handleMove}
            interactive={!gameOverInfo.over}
            lastMove={lastMove}
          />
        </div>

        {/* You (Bottom) Player Card & Clock */}
        <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
          chess.turn() === orientation && !gameOverInfo.over
            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
              {orientation === 'w' ? 'W' : 'B'}
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {orientation === 'w' ? 'White Player' : 'Black Player'}
              </div>
              <div className="flex items-center gap-0.5 mt-0.5 h-3">
                {(orientation === 'w' ? whiteCaptured : blackCaptured).map((item, idx) => (
                  <span key={idx} className="text-[10px] text-slate-400 font-mono">
                    {item.count > 1 ? `${item.count}${item.type}` : item.type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {timeControl > 0 && (
            <div className={`px-3 py-1.5 rounded-xl font-mono text-base font-black ${
              chess.turn() === orientation
                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                : 'bg-slate-950 text-slate-300'
            }`}>
              {formatTime(orientation === 'w' ? whiteTime : blackTime)}
            </div>
          )}
        </div>

        {/* Game Status or Controls */}
        {gameOverInfo.over ? (
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 text-center space-y-3 shadow-xl">
            <Award className="w-8 h-8 text-amber-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">{gameOverInfo.reason}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Game completed in {history.length} moves</p>
            </div>
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => handleResetGame()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                New Game
              </button>
              <button
                onClick={() => onReviewGame(chess.pgn())}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
              >
                Review with Stockfish
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            {/* Auto Flip Toggle */}
            <button
              onClick={() => setAutoFlip(!autoFlip)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border transition ${
                autoFlip ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Automatically flip board on each turn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Auto-Flip: {autoFlip ? 'ON' : 'OFF'}
            </button>

            <div className="flex items-center gap-1.5">
              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
                title="Undo Move"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              {/* Offer Draw */}
              <button
                onClick={handleDraw}
                disabled={history.length < 2}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
                title="Agree Draw"
              >
                <Handshake className="w-4 h-4" />
              </button>

              {/* Resign */}
              <button
                onClick={handleResign}
                disabled={history.length === 0}
                className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 disabled:opacity-30 text-rose-300 transition"
                title="Resign"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Move History Strip */}
        {history.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 overflow-x-auto whitespace-nowrap">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-2">
              Moves:
            </span>
            {history.map((m, idx) => (
              <span key={idx} className="text-xs font-mono mr-2 text-slate-300">
                {idx % 2 === 0 && <span className="text-slate-500 mr-1">{Math.floor(idx / 2) + 1}.</span>}
                <span className="font-semibold text-white">{m.san}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
