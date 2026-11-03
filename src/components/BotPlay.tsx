import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './ChessBoard';
import { EvalBar } from './EvalBar';
import { stockfish } from '../services/stockfishEngine';
import { chessAudio } from '../services/soundEffects';
import { BOT_PROFILES } from '../data/botProfiles';
import type { BotProfile } from '../types/chess';
import confetti from 'canvas-confetti';
import {
  Bot,
  Sliders,
  RotateCcw,
  Undo2,
  Lightbulb,
  Flag,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Award,
  Sparkles,
} from 'lucide-react';

interface BotPlayProps {
  onReviewGame: (pgn: string) => void;
}

export const BotPlay: React.FC<BotPlayProps> = ({ onReviewGame }) => {
  const [selectedBot, setSelectedBot] = useState<BotProfile>(BOT_PROFILES[3]); // Stockfish Level 7 default
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  // Custom Bot Parameters
  const [customElo, setCustomElo] = useState<number>(1800);
  const [customSkillLevel, setCustomSkillLevel] = useState<number>(11);
  const [customDepth, setCustomDepth] = useState<number>(10);

  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [history, setHistory] = useState<{ san: string; from: string; to: string }[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [coachHint, setCoachHint] = useState<string | null>(null);
  const [liveEval, setLiveEval] = useState<number>(20);
  const [showEvalBar, setShowEvalBar] = useState<boolean>(true);

  // Game over state
  const [gameOverInfo, setGameOverInfo] = useState<{
    over: boolean;
    reason: string;
    winner?: 'player' | 'bot' | 'draw';
  }>({ over: false, reason: '' });

  // Update engine skill level when bot changes
  useEffect(() => {
    stockfish.setSkillLevel(selectedBot.stockfishLevel);
  }, [selectedBot]);

  // Start new game
  const startNewGame = (bot: BotProfile = selectedBot, color: 'w' | 'b' = playerColor) => {
    const newChess = new Chess();
    setChess(newChess);
    setFen(newChess.fen());
    setHistory([]);
    setCoachHint(null);
    setLiveEval(20);
    setGameOverInfo({ over: false, reason: '' });
    setSelectedBot(bot);
    setPlayerColor(color);

    // If bot plays White, trigger bot's first move
    if (color === 'b') {
      setTimeout(() => {
        makeBotMove(newChess, bot);
      }, 500);
    }
  };

  const makeBotMove = async (currentChess: Chess, bot: BotProfile) => {
    if (currentChess.isGameOver()) return;
    setIsBotThinking(true);

    try {
      stockfish.setSkillLevel(bot.stockfishLevel);
      const res = await stockfish.evaluatePosition(currentChess.fen(), bot.depth, 1500);

      let uciMove = res.bestMoveUci;

      // Handle blunder chance for lower bots (Martin, Wayne)
      if (bot.blunderChance > 0 && Math.random() * 100 < bot.blunderChance) {
        const legalMoves = currentChess.moves({ verbose: true });
        if (legalMoves.length > 1) {
          const randomPick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          uciMove = `${randomPick.from}${randomPick.to}${randomPick.promotion || ''}`;
        }
      }

      if (uciMove && uciMove.length >= 4) {
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

        const moveResult = currentChess.move({
          from: from as Square,
          to: to as Square,
          promotion: (promotion as any) || 'q',
        });

        if (moveResult) {
          setFen(currentChess.fen());
          setHistory((prev) => [...prev, { san: moveResult.san, from: moveResult.from, to: moveResult.to }]);
          setLiveEval(res.score);

          // Audio
          if (currentChess.isGameOver()) {
            chessAudio.playGameEnd();
          } else if (currentChess.inCheck()) {
            chessAudio.playCheck();
          } else if (moveResult.captured) {
            chessAudio.playCapture();
          } else if (moveResult.san === 'O-O' || moveResult.san === 'O-O-O') {
            chessAudio.playCastle();
          } else {
            chessAudio.playMove();
          }

          checkEndConditions(currentChess);
        }
      }
    } catch (err) {
      console.warn('Bot move error:', err);
    } finally {
      setIsBotThinking(false);
    }
  };

  const handlePlayerMove = (from: string, to: string, promotion?: string) => {
    if (gameOverInfo.over || isBotThinking) return;
    if (chess.turn() !== playerColor) return;

    try {
      const moveResult = chess.move({
        from: from as Square,
        to: to as Square,
        promotion: (promotion as any) || 'q',
      });

      if (!moveResult) return;

      // Reset coach hint
      setCoachHint(null);

      // Sound
      if (chess.isGameOver()) {
        chessAudio.playGameEnd();
      } else if (chess.inCheck()) {
        chessAudio.playCheck();
      } else if (moveResult.captured) {
        chessAudio.playCapture();
      } else if (moveResult.san === 'O-O' || moveResult.san === 'O-O-O') {
        chessAudio.playCastle();
      } else {
        chessAudio.playMove();
      }

      setFen(chess.fen());
      setHistory((prev) => [...prev, { san: moveResult.san, from: moveResult.from, to: moveResult.to }]);

      const isOver = checkEndConditions(chess);
      if (!isOver) {
        // Trigger bot turn
        setTimeout(() => {
          makeBotMove(chess, selectedBot);
        }, 300);
      }
    } catch (err) {
      // invalid move
    }
  };

  const checkEndConditions = (game: Chess): boolean => {
    if (game.isGameOver()) {
      let reason = 'Game over';
      let winner: 'player' | 'bot' | 'draw' = 'draw';

      if (game.isCheckmate()) {
        const winningColor = game.turn() === 'w' ? 'b' : 'w';
        if (winningColor === playerColor) {
          winner = 'player';
          reason = `Checkmate! You defeated ${selectedBot.name}! 🎉`;
          confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
        } else {
          winner = 'bot';
          reason = `Checkmate! ${selectedBot.name} won the game.`;
        }
      } else if (game.isDraw()) {
        if (game.isStalemate()) reason = 'Draw by Stalemate';
        else if (game.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
        else if (game.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
        else reason = 'Draw by 50-Move Rule';
      }

      setGameOverInfo({ over: true, reason, winner });
      return true;
    }
    return false;
  };

  const handleTakeback = () => {
    if (history.length < 2 || isBotThinking || gameOverInfo.over) return;
    // Undo bot move and player move
    chess.undo();
    chess.undo();
    setFen(chess.fen());
    setHistory((prev) => prev.slice(0, -2));
    setCoachHint(null);
  };

  const handleAskCoach = async () => {
    if (isBotThinking || gameOverInfo.over || chess.turn() !== playerColor) return;
    try {
      const res = await stockfish.evaluatePosition(chess.fen(), 12, 1000);
      if (res.bestMoveSan || res.bestMoveUci) {
        setCoachHint(`Coach recommendation: Try playing ${res.bestMoveSan || res.bestMoveUci}`);
      }
    } catch {
      setCoachHint('Look for pieces under attack and control the center.');
    }
  };

  const lastMove = history.length > 0 ? { from: history[history.length - 1].from, to: history[history.length - 1].to } : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-20 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              Play Stockfish Bots
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
                Levels 7 - 19
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">100% CPU computation • Instant moves</p>
          </div>
        </div>

        <button
          onClick={() => setShowCustomConfig(!showCustomConfig)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          Custom Bot
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 space-y-4">
        {/* Bot Selector Carousel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2 px-1">
            Choose Your Opponent ({BOT_PROFILES.length} Bots Available)
          </span>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
            {BOT_PROFILES.map((bot) => {
              const isSelected = selectedBot.id === bot.id;
              return (
                <button
                  key={bot.id}
                  onClick={() => startNewGame(bot, playerColor)}
                  className={`flex-shrink-0 w-32 p-2.5 rounded-xl border text-center transition flex flex-col items-center ${
                    isSelected
                      ? 'bg-emerald-600/20 border-emerald-500/80 shadow-md ring-1 ring-emerald-500'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60'
                  }`}
                >
                  <img
                    src={bot.avatar}
                    alt={bot.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-600 mb-1.5 shadow"
                  />
                  <span className="text-xs font-bold text-white truncate w-full">{bot.name}</span>
                  <span className="text-[10px] font-mono font-semibold text-emerald-400">{bot.elo} Elo</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Level {bot.stockfishLevel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Difficulty Builder Modal / Drawer */}
        {showCustomConfig && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Custom Stockfish Difficulty Settings
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Stockfish Skill Level: {customSkillLevel} (of 20)</span>
                  <span className="font-mono text-emerald-400">Elo ~{customElo}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={customSkillLevel}
                  onChange={(e) => {
                    const lvl = parseInt(e.target.value, 10);
                    setCustomSkillLevel(lvl);
                    setCustomElo(300 + lvl * 150);
                  }}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Calculation Depth: {customDepth} ply</span>
                  <span className="font-mono text-slate-400">{customDepth <= 8 ? 'Fast' : customDepth <= 14 ? 'Strong' : 'Grandmaster'}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={customDepth}
                  onChange={(e) => setCustomDepth(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  const customBot: BotProfile = {
                    id: 'custom_stockfish',
                    name: `Custom SF (Lvl ${customSkillLevel})`,
                    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                    country: 'Custom',
                    elo: customElo,
                    stockfishLevel: customSkillLevel,
                    depth: customDepth,
                    description: 'Custom configured Stockfish engine parameters.',
                    personality: 'balanced',
                    blunderChance: Math.max(0, 20 - customSkillLevel),
                    category: 'stockfish',
                  };
                  startNewGame(customBot, playerColor);
                  setShowCustomConfig(false);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Apply & Start Game
              </button>
            </div>
          </div>
        )}

        {/* Board & Active Opponent Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          {/* Active Bot Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src={selectedBot.avatar}
                alt={selectedBot.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-700"
              />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {selectedBot.name}
                  {isBotThinking && (
                    <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1 font-mono">
                      <Cpu className="w-3 h-3" /> Thinking...
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedBot.elo} Elo • {selectedBot.title || `Level ${selectedBot.stockfishLevel}`}
                </div>
              </div>
            </div>

            {/* Color switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => startNewGame(selectedBot, 'w')}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  playerColor === 'w' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                White
              </button>
              <button
                onClick={() => startNewGame(selectedBot, 'b')}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition ${
                  playerColor === 'b' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Black
              </button>
            </div>
          </div>

          {/* Board with Eval Bar */}
          <div className="flex gap-3 justify-center items-stretch">
            {showEvalBar && (
              <EvalBar
                score={liveEval}
                orientation={playerColor}
                heightClass="h-[300px] sm:h-[380px]"
              />
            )}

            <div className="flex-1 max-w-[380px]">
              <ChessBoard
                fen={fen}
                orientation={playerColor}
                onMove={handlePlayerMove}
                interactive={!gameOverInfo.over && !isBotThinking && chess.turn() === playerColor}
                lastMove={lastMove}
              />
            </div>
          </div>

          {/* Coach Hint Card */}
          {coachHint && (
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-2.5 text-xs text-amber-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                {coachHint}
              </span>
              <button
                onClick={() => setCoachHint(null)}
                className="text-amber-400 hover:text-amber-300 font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Bottom Action Bar */}
          {gameOverInfo.over ? (
            <div className="bg-slate-950 border border-emerald-500/50 rounded-xl p-4 text-center space-y-2">
              <h4 className="text-sm font-bold text-white">{gameOverInfo.reason}</h4>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  onClick={() => startNewGame()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Play Again
                </button>
                <button
                  onClick={() => onReviewGame(chess.pgn())}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  Review with Stockfish
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAskCoach}
                  disabled={isBotThinking || chess.turn() !== playerColor}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 transition disabled:opacity-40"
                  title="Ask Coach for Move Hint"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Coach Hint
                </button>

                <button
                  onClick={() => setShowEvalBar(!showEvalBar)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border transition ${
                    showEvalBar ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Eval Bar: {showEvalBar ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTakeback}
                  disabled={history.length < 2 || isBotThinking}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
                  title="Takeback Move"
                >
                  <Undo2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    chessAudio.playGameEnd();
                    setGameOverInfo({
                      over: true,
                      reason: `You resigned against ${selectedBot.name}.`,
                      winner: 'bot',
                    });
                  }}
                  className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition"
                  title="Resign"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
