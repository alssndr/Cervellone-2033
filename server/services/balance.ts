import { type PlayerRatings, AXES } from '@shared/schema';

export interface RatedPlayer {
  playerId: string;
  ratings: PlayerRatings;
  mean: number;
}

export interface TeamAssignmentResult {
  light: string[];
  dark: string[];
  score: number;
  axisMeans: {
    light: Record<string, number>;
    dark: Record<string, number>;
  };
}

function playerMean(r: PlayerRatings): number {
  return (r.defense + r.attack + r.speed + r.power + r.technique + r.shot) / 6;
}

function scoreTeams(
  axisA: Record<string, number>,
  axisB: Record<string, number>,
  meanA: number,
  meanB: number
): number {
  const axisDelta = AXES.reduce((acc, k) => acc + Math.abs(axisA[k] - axisB[k]), 0);
  const meanDelta = Math.abs(meanA - meanB);
  return 0.7 * axisDelta + 0.3 * meanDelta;
}

function computeAxisMeans(players: RatedPlayer[]): { means: Record<string, number>; teamMean: number } {
  const sums: Record<string, number> = Object.fromEntries(AXES.map(a => [a, 0]));
  players.forEach(p => {
    AXES.forEach(a => sums[a] += (p.ratings as any)[a]);
  });
  const n = Math.max(players.length, 1);
  const means: Record<string, number> = Object.fromEntries(AXES.map(a => [a, sums[a] / n]));
  const teamMean = players.reduce((a, b) => a + b.mean, 0) / n;
  return { means, teamMean };
}

// Seeded random number generator for reproducible results
function seededRandom(seed: number) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function balanceRandomSeeded(players: RatedPlayer[], perTeamSize: number, seed: number): TeamAssignmentResult {
  const rng = seededRandom(seed);
  const shuffled = [...players].sort(() => rng() - 0.5);
  
  const A: RatedPlayer[] = shuffled.slice(0, perTeamSize);
  const B: RatedPlayer[] = shuffled.slice(perTeamSize, perTeamSize * 2);

  const { means: Am, teamMean: AmM } = computeAxisMeans(A);
  const { means: Bm, teamMean: BmM } = computeAxisMeans(B);
  const score = scoreTeams(Am, Bm, AmM, BmM);

  return {
    light: A.map(p => p.playerId),
    dark: B.map(p => p.playerId),
    score,
    axisMeans: { light: Am, dark: Bm },
  };
}

export function balanceGreedyLocal(players: RatedPlayer[], perTeamSize: number, seed: number, kSwaps = 200): TeamAssignmentResult {
  // Use seed to create randomized initial assignment
  const rng = seededRandom(seed);
  
  // Sort by mean + add small random perturbation for variation
  const sorted = [...players].sort((a, b) => {
    const am = playerMean(a.ratings) + (rng() - 0.5) * 0.1; // Small random noise
    const bm = playerMean(b.ratings) + (rng() - 0.5) * 0.1;
    return bm - am;
  });

  const A: RatedPlayer[] = [];
  const B: RatedPlayer[] = [];

  for (const p of sorted) {
    const candA = [...A, p];
    const candB = [...B, p];
    if (candA.length > perTeamSize) {
      B.push(p);
      continue;
    }
    if (candB.length > perTeamSize) {
      A.push(p);
      continue;
    }

    const { means: Am, teamMean: AmM } = computeAxisMeans(candA);
    const { means: Bm, teamMean: BmM } = computeAxisMeans(B);
    const scoreA = scoreTeams(Am, Bm, AmM, BmM);

    const { means: Am2, teamMean: AmM2 } = computeAxisMeans(A);
    const { means: Bm2, teamMean: BmM2 } = computeAxisMeans(candB);
    const scoreB = scoreTeams(Am2, Bm2, AmM2, BmM2);

    if (scoreA <= scoreB) A.push(p);
    else B.push(p);
  }

  let improved = true;
  let iter = 0;
  while (improved && iter < kSwaps) {
    improved = false;
    iter++;
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        const A2 = [...A];
        const B2 = [...B];
        [A2[i], B2[j]] = [B2[j], A2[i]];

        const { means: Am, teamMean: AmM } = computeAxisMeans(A);
        const { means: Bm, teamMean: BmM } = computeAxisMeans(B);
        const curr = scoreTeams(Am, Bm, AmM, BmM);

        const { means: Am2, teamMean: AmM2 } = computeAxisMeans(A2);
        const { means: Bm2, teamMean: BmM2 } = computeAxisMeans(B2);
        const next = scoreTeams(Am2, Bm2, AmM2, BmM2);

        if (next + 1e-9 < curr) {
          A.splice(0, A.length, ...A2);
          B.splice(0, B.length, ...B2);
          improved = true;
        }
      }
    }
  }

  const { means: Am, teamMean: AmM } = computeAxisMeans(A);
  const { means: Bm, teamMean: BmM } = computeAxisMeans(B);
  const score = scoreTeams(Am, Bm, AmM, BmM);

  return {
    light: A.map(p => p.playerId),
    dark: B.map(p => p.playerId),
    score,
    axisMeans: { light: Am, dark: Bm },
  };
}
