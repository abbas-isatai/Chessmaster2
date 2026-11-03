/**
 * Chess.com Public API Client & Offline Sample Game Vault
 * Fully CORS compatible and client-side executed
 */

import type { ChesscomGameHeader } from '../types/chess';

export const SAMPLE_PGNS: { title: string; pgn: string; description: string }[] = [
  {
    title: 'Nakamura vs. Carlsen (Speed Chess Championship)',
    description: 'A tense blitz struggle featuring tactical resourcefulness and tactical bishop sacrifices.',
    pgn: `[Event "Speed Chess Championship 2023"]
[Site "Chess.com"]
[Date "2023.09.22"]
[Round "Final"]
[White "Carlsen, Magnus"]
[Black "Nakamura, Hikaru"]
[Result "1-0"]
[WhiteElo "2839"]
[BlackElo "2875"]
[TimeControl "300+1"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. h3 e6 7. g4 b5 8. Bg2 Bb7 9. O-O Nfd7 10. Re1 Be7 11. a4 b4 12. Nd5 exd5 13. exd5 O-O 14. Nf5 Bf6 15. Nxd6 Nc5 16. Bf4 Nbd7 17. Qd2 a5 18. g5 Bxb2 19. Nxb7 Nxb7 20. d6 Bxa1 21. Rxa1 Nbc5 22. Bxa8 Qxa8 23. Re1 Qf3 24. Re3 Qxf4 25. Qd5 Ne6 26. Qxa5 Qxg5+ 27. Qxg5 Nxg5 28. a5 Ne6 29. Rb3 Ra8 30. Rxb4 Rxa5 31. Rb7 Nef8 32. Rc7 Rc5 33. c4 g5 34. Kf1 Kg7 35. Ke2 Kf6 36. Kd3 Ke6 37. Kd4 Kxd6 38. Ra7 Ne6+ 39. Kc3 Ne5 40. Ra6+ Rc6 1-0`,
  },
  {
    title: 'Game of the Century (Bobby Fischer vs Donald Byrne)',
    description: 'Bobby Fischer at age 13 plays the legendary queen sacrifice 17...Be6!!',
    pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[Round "8"]
[White "Byrne, Donald"]
[Black "Fischer, Robert James"]
[Result "0-1"]
[WhiteElo "2500"]
[BlackElo "2600"]
[ECO "D92"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
  },
  {
    title: 'The Immortal Game (Adolf Anderssen vs Lionel Kieseritzky)',
    description: 'Anderssen sacrifices both rooks, a bishop, and finally his queen to deliver checkmate with three minor pieces.',
    pgn: `[Event "London Casual Game"]
[Site "London ENG"]
[Date "1851.06.21"]
[Round "1"]
[White "Anderssen, Adolf"]
[Black "Kieseritzky, Lionel"]
[Result "1-0"]
[ECO "C39"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`,
  },
];

export async function fetchChesscomArchives(username: string): Promise<string[]> {
  const cleanUser = username.trim().toLowerCase();
  const url = `https://api.chess.com/pub/player/${cleanUser}/games/archives`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Player "${username}" not found on Chess.com (HTTP ${response.status})`);
  }

  const data = await response.json();
  return data.archives || [];
}

export async function fetchUserRecentGames(username: string): Promise<ChesscomGameHeader[]> {
  try {
    const archives = await fetchChesscomArchives(username);
    if (!archives || archives.length === 0) {
      return [];
    }

    // Get games from the most recent archive month
    const latestArchiveUrl = archives[archives.length - 1];
    const res = await fetch(latestArchiveUrl);
    if (!res.ok) {
      throw new Error(`Failed to load games from Chess.com archive.`);
    }

    const data = await res.json();
    const games = data.games || [];

    // Parse up to 25 latest games
    return games
      .slice(-25)
      .reverse()
      .map((g: any, index: number) => {
        const whiteUser = g.white?.username || 'Unknown';
        const blackUser = g.black?.username || 'Unknown';
        const dateStr = g.end_time ? new Date(g.end_time * 1000).toLocaleDateString() : 'Recent';

        return {
          id: `${whiteUser}-${blackUser}-${index}-${Date.now()}`,
          url: g.url || '',
          pgn: g.pgn || '',
          timeControl: g.time_control || 'Unknown',
          timeClass: g.time_class || 'blitz',
          date: dateStr,
          white: {
            username: whiteUser,
            rating: g.white?.rating || 1500,
            result: g.white?.result || 'win',
          },
          black: {
            username: blackUser,
            rating: g.black?.rating || 1500,
            result: g.black?.result || 'checkmated',
          },
        };
      });
  } catch (err: any) {
    console.warn('Error fetching Chess.com games:', err);
    throw err;
  }
}
