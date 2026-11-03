import React, { useState, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { ChessPiece } from './ChessPieces';

interface ChessBoardProps {
  fen: string;
  orientation?: 'w' | 'b';
  onMove?: (from: string, to: string, promotion?: string) => boolean | void;
  interactive?: boolean;
  lastMove?: { from: string; to: string } | null;
  bestMove?: { from: string; to: string } | null;
  showBestMoveArrow?: boolean;
  className?: string;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation = 'w',
  onMove,
  interactive = true,
  lastMove,
  bestMove,
  showBestMoveArrow = false,
  className = '',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  // Check if king is in check
  const inCheck = chess.inCheck();
  const checkedKingSquare = useMemo(() => {
    if (!inCheck) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = 8 - r;
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chess, inCheck]);

  // Legal moves for selected square
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || !interactive) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selectedSquare, interactive]);

  const legalDestinationMap = useMemo(() => {
    const map = new Map<string, { isCapture: boolean; isPromotion: boolean }>();
    for (const m of legalMovesForSelected) {
      map.set(m.to, {
        isCapture: !!m.captured,
        isPromotion: !!m.promotion,
      });
    }
    return map;
  }, [legalMovesForSelected]);

  // 8x8 squares generation based on orientation
  const ranks = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  const handleSquareClick = (square: Square) => {
    if (!interactive) return;

    if (pendingPromotion) {
      setPendingPromotion(null);
    }

    if (!selectedSquare) {
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    // If clicking another piece of the same color, switch selection
    const destPiece = chess.get(square);
    if (destPiece && destPiece.color === chess.turn()) {
      setSelectedSquare(square);
      return;
    }

    // Check if it's a legal move
    const isLegal = legalDestinationMap.has(square);
    if (isLegal) {
      const moveInfo = legalDestinationMap.get(square);
      // Check if it is a promotion
      if (moveInfo?.isPromotion) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      if (onMove) {
        onMove(selectedSquare, square);
      }
      setSelectedSquare(null);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotionSelect = (promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion && onMove) {
      onMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
    }
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Convert square to pixel/percentage coordinates for arrow rendering
  const getSquareCoordinates = (sq: string) => {
    const file = sq[0];
    const rank = parseInt(sq[1], 10);
    const fileIdx = files.indexOf(file);
    const rankIdx = ranks.indexOf(rank);
    if (fileIdx === -1 || rankIdx === -1) return null;
    return {
      x: (fileIdx + 0.5) * 12.5,
      y: (rankIdx + 0.5) * 12.5,
    };
  };

  return (
    <div className={`relative aspect-square w-full select-none rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-800 ${className}`}>
      {/* 8x8 Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {ranks.map((rank, rIdx) =>
          files.map((file, fIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isLight = (rIdx + fIdx) % 2 === 0;

            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isCheckedKing = checkedKingSquare === square;
            const legalMoveInfo = legalDestinationMap.get(square);

            let squareBg = isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]'; // Classic chess.com palette
            if (isSelected) {
              squareBg = 'bg-[#baca2b] ring-2 ring-inset ring-amber-300';
            } else if (isLastMoveFrom || isLastMoveTo) {
              squareBg = isLight ? 'bg-[#f7f789]' : 'bg-[#baca44]';
            } else if (isCheckedKing) {
              squareBg = 'bg-rose-500/80 ring-2 ring-inset ring-rose-400';
            }

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors ${squareBg}`}
              >
                {/* Board Rank Label (on left column) */}
                {fIdx === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] font-bold pointer-events-none ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {rank}
                  </span>
                )}

                {/* Board File Label (on bottom row) */}
                {rIdx === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-bold pointer-events-none ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Piece */}
                {piece && (
                  <div className="w-[82%] h-[82%] z-10 transition-transform active:scale-95">
                    <ChessPiece type={piece.type as any} color={piece.color} />
                  </div>
                )}

                {/* Legal move indicator */}
                {legalMoveInfo && !piece && (
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-slate-900/25 pointer-events-none z-20" />
                )}

                {/* Capture indicator */}
                {legalMoveInfo && piece && (
                  <div className="absolute inset-1 rounded-full border-4 border-slate-900/30 pointer-events-none z-20" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SVG Overlay for arrows (e.g. Best Move Arrow from Stockfish) */}
      {showBestMoveArrow && bestMove && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100">
          <defs>
            <marker
              id="best-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" opacity="0.85" />
            </marker>
          </defs>
          {(() => {
            const start = getSquareCoordinates(bestMove.from);
            const end = getSquareCoordinates(bestMove.to);
            if (!start || !end) return null;
            return (
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
                markerEnd="url(#best-arrow)"
              />
            );
          })()}
        </svg>
      )}

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl max-w-xs w-full text-center">
            <h4 className="text-sm font-bold text-slate-100 mb-3">Promote Pawn</h4>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((pieceType) => (
                <button
                  key={pieceType}
                  onClick={() => handlePromotionSelect(pieceType)}
                  className="aspect-square bg-slate-800 hover:bg-emerald-600/30 border border-slate-700 rounded-xl p-2 flex flex-col items-center justify-center transition"
                >
                  <div className="w-10 h-10">
                    <ChessPiece type={pieceType} color={chess.turn()} />
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-slate-300 mt-1">
                    {pieceType === 'q' ? 'Queen' : pieceType === 'r' ? 'Rook' : pieceType === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
