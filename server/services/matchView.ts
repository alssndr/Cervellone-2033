import { storage } from '../storage';
import { AXES, type MatchView, normalizeE164 } from '@shared/schema';

export async function buildPublicMatchView(matchId: string, phone: string): Promise<MatchView> {
  const match = await storage.getMatch(matchId);
  if (!match) {
    throw new Error('MATCH_NOT_FOUND');
  }

  // Normalize phone for comparison
  const normalizedPhone = normalizeE164(phone);

  const teams = await storage.getMatchTeams(matchId);
  const signups = await storage.getMatchSignups(matchId);
  const assignments = await storage.getMatchAssignments(matchId);

  const lightTeam = teams.find(t => t.name === 'LIGHT')!;
  const darkTeam = teams.find(t => t.name === 'DARK')!;

  const startersIds = new Set(signups.filter(s => s.status === 'STARTER').map(s => s.playerId));

  // Get player details for starters
  const lightStarterAssignments = assignments.filter(a => a.teamId === lightTeam.id && startersIds.has(a.playerId));
  const darkStarterAssignments = assignments.filter(a => a.teamId === darkTeam.id && startersIds.has(a.playerId));

  const lightStarters = await Promise.all(
    lightStarterAssignments.map(async a => {
      const player = await storage.getPlayer(a.playerId);
      const ratings = await storage.getPlayerRatings(a.playerId);
      return {
        id: a.playerId,
        name: player ? `${player.name} ${player.surname}`.trim() : 'Giocatore',
        ratings: ratings || null,
      };
    })
  );

  const darkStarters = await Promise.all(
    darkStarterAssignments.map(async a => {
      const player = await storage.getPlayer(a.playerId);
      const ratings = await storage.getPlayerRatings(a.playerId);
      return {
        id: a.playerId,
        name: player ? `${player.name} ${player.surname}`.trim() : 'Giocatore',
        ratings: ratings || null,
      };
    })
  );

  // Get reserves
  const reservesLightSignups = signups.filter(s => s.status === 'RESERVE' && s.reserveTeam === 'LIGHT');
  const reservesDarkSignups = signups.filter(s => s.status === 'RESERVE' && s.reserveTeam === 'DARK');

  const reservesLight = await Promise.all(
    reservesLightSignups.map(async s => {
      const player = await storage.getPlayer(s.playerId);
      const ratings = await storage.getPlayerRatings(s.playerId);
      return {
        id: s.playerId,
        name: player ? `${player.name} ${player.surname}`.trim() : 'Giocatore',
        ratings: ratings || null,
      };
    })
  );

  const reservesDark = await Promise.all(
    reservesDarkSignups.map(async s => {
      const player = await storage.getPlayer(s.playerId);
      const ratings = await storage.getPlayerRatings(s.playerId);
      return {
        id: s.playerId,
        name: player ? `${player.name} ${player.surname}`.trim() : 'Giocatore',
        ratings: ratings || null,
      };
    })
  );

  // Get next time players
  const nextLightSignups = signups.filter(s => s.status === 'NEXT' && s.reserveTeam === 'LIGHT');
  const nextDarkSignups = signups.filter(s => s.status === 'NEXT' && s.reserveTeam === 'DARK');

  const nextLight = await Promise.all(
    nextLightSignups.map(async s => {
      const player = await storage.getPlayer(s.playerId);
      const ratings = await storage.getPlayerRatings(s.playerId);
      return {
        id: s.playerId,
        name: player ? `${player.name} ${player.surname}`.trim() : 'Giocatore',
        ratings: ratings || null,
      };
    })
  );

  const nextDark = await Promise.all(
    nextDarkSignups.map(async s => {
      const player = await storage.getPlayer(s.playerId);
      const ratings = await storage.getPlayerRatings(s.playerId);
      return {
        id: s.playerId,
        name: player ? `${player.name} ${player.surname}`.trim() : 'Giocatore',
        ratings: ratings || null,
      };
    })
  );

  // Calculate radar data
  async function getAxisMeans(playerIds: string[]): Promise<Record<string, number>> {
    const sums: Record<string, number> = Object.fromEntries(AXES.map(a => [a, 0]));
    let count = 0;

    for (const playerId of playerIds) {
      const ratings = await storage.getPlayerRatings(playerId);
      if (ratings) {
        AXES.forEach(a => sums[a] += (ratings as any)[a]);
        count++;
      }
    }

    const n = Math.max(count, 1);
    return Object.fromEntries(AXES.map(a => [a, sums[a] / n]));
  }

  const radar = {
    light: await getAxisMeans(lightStarterAssignments.map(a => a.playerId)),
    dark: await getAxisMeans(darkStarterAssignments.map(a => a.playerId)),
  };

  const me = signups.find(s => s.phone === normalizedPhone) || null;

  return {
    match: {
      id: match.id,
      sport: match.sport,
      dateTime: match.dateTime,
      location: match.location,
      status: match.status,
      teamNameLight: match.teamNameLight || 'Chiari',
      teamNameDark: match.teamNameDark || 'Scuri',
    },
    me: me ? { status: me.status } : null,
    starters: {
      light: lightStarters,
      dark: darkStarters,
    },
    reserves: {
      light: reservesLight,
      dark: reservesDark,
    },
    next: {
      light: nextLight,
      dark: nextDark,
    },
    radar,
  };
}
