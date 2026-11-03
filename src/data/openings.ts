/**
 * Comprehensive ECO Opening Book for Grandmaster Review
 */

export interface OpeningDefinition {
  eco: string;
  name: string;
  moves: string[]; // SAN moves
}

export const OPENING_BOOK: OpeningDefinition[] = [
  // Sicilian Defense
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
  { eco: 'B33', name: 'Sicilian Defense: Sveshnikov Variation', moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5'] },
  { eco: 'B40', name: 'Sicilian Defense: Kan / Paulsen Variation', moves: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'a6'] },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', moves: ['e4', 'c5', 'c3'] },
  { eco: 'B23', name: 'Sicilian Defense: Closed', moves: ['e4', 'c5', 'Nc3'] },
  { eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },

  // Ruy Lopez (Spanish Game)
  { eco: 'C88', name: 'Ruy Lopez: Closed Variation', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'] },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'] },
  { eco: 'C60', name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },

  // Italian Game
  { eco: 'C50', name: 'Italian Game: Giuoco Piano', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },
  { eco: 'C57', name: 'Italian Game: Two Knights Defense, Fried Liver', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5'] },
  { eco: 'C55', name: 'Italian Game: Two Knights Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
  { eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },

  // French Defense
  { eco: 'C11', name: 'French Defense: Classical Variation', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'] },
  { eco: 'C15', name: 'French Defense: Winawer Variation', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'] },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
  { eco: 'C00', name: 'French Defense', moves: ['e4', 'e6'] },

  // Caro-Kann Defense
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: ['e4', 'c6', 'd4', 'd5', 'e5'] },
  { eco: 'B18', name: 'Caro-Kann Defense: Classical Variation', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'] },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },

  // Scandinavian & Alekhine
  { eco: 'B01', name: 'Scandinavian Defense: Mieses-Kotroc', moves: ['e4', 'd5', 'exd5', 'Qxd5'] },
  { eco: 'B01', name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  { eco: 'B02', name: 'Alekhine Defense', moves: ['e4', 'Nf6'] },

  // King's Pawn Openings
  { eco: 'C42', name: "Petrov's Defense", moves: ['e4', 'e5', 'Nf3', 'Nf6'] },
  { eco: 'C45', name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  { eco: 'C41', name: "Philidor's Defense", moves: ['e4', 'e5', 'Nf3', 'd6'] },
  { eco: 'C46', name: 'Four Knights Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'] },
  { eco: 'C30', name: "King's Gambit", moves: ['e4', 'e5', 'f4'] },
  { eco: 'C20', name: "King's Pawn Game", moves: ['e4', 'e5'] },

  // Queen's Gambit & 1.d4
  { eco: 'D35', name: "Queen's Gambit Declined: Exchange Variation", moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5'] },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'] },
  { eco: 'D10', name: 'Slav Defense', moves: ['d4', 'd5', 'c4', 'c6'] },
  { eco: 'D06', name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { eco: 'D00', name: "Queen's Pawn Game: London System", moves: ['d4', 'd5', 'Bf4'] },
  { eco: 'D02', name: "Queen's Pawn Game: London System", moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'] },
  { eco: 'D02', name: "Queen's Pawn Game", moves: ['d4', 'd5'] },

  // Indian Defenses
  { eco: 'E61', name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'] },
  { eco: 'E60', name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { eco: 'E40', name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { eco: 'E12', name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
  { eco: 'A56', name: 'Benoni Defense', moves: ['d4', 'Nf6', 'c4', 'c5'] },
  { eco: 'D80', name: 'Grünfeld Defense', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },
  { eco: 'A80', name: 'Dutch Defense', moves: ['d4', 'f5'] },

  // Flank Openings
  { eco: 'A10', name: 'English Opening', moves: ['c4'] },
  { eco: 'A04', name: 'Réti Opening', moves: ['Nf3'] },
  { eco: 'A02', name: "Bird's Opening", moves: ['f4'] },
];

/**
 * Find matched opening and check if a move index is book theory
 */
export function identifyOpening(sanMoves: string[]): {
  opening?: OpeningDefinition;
  bookMovesCount: number;
} {
  let bestMatch: OpeningDefinition | undefined;
  let maxMatchedMoves = 0;

  for (const item of OPENING_BOOK) {
    let matches = true;
    const len = Math.min(sanMoves.length, item.moves.length);
    if (len === 0) continue;

    for (let i = 0; i < len; i++) {
      if (sanMoves[i] !== item.moves[i]) {
        matches = false;
        break;
      }
    }

    if (matches && len > maxMatchedMoves) {
      maxMatchedMoves = len;
      bestMatch = item;
    }
  }

  return {
    opening: bestMatch,
    bookMovesCount: maxMatchedMoves,
  };
}
