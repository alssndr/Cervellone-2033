import { storage } from '../storage';
import { balanceGreedyLocal, balanceRandomSeeded, type RatedPlayer } from './balance';
import { startersCap } from '@shared/schema';
import type { Algo } from '@shared/schema';

export async function generateLineupVariants(matchId: string, count: number = 5): Promise<string[]> {
  const match = await storage.getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const perTeam = startersCap(match.sport) / 2;
  const signups = await storage.getMatchSignups(matchId);
  const starters = signups.filter(s => s.status === 'STARTER');
  
  const required = perTeam * 2;
  if (starters.length < required) {
    throw new Error(`Servono almeno ${required} giocatori titolari per ${match.sport}. Al momento: ${starters.length}`);
  }

  // Build rated players array
  const rated: RatedPlayer[] = await Promise.all(
    starters.map(async s => {
      const ratings = await storage.getPlayerRatings(s.playerId);
      if (!ratings) {
        throw new Error(`Player ${s.playerId} has no ratings`);
      }
      const mean = (ratings.defense + ratings.attack + ratings.speed + ratings.power + ratings.technique + ratings.shot) / 6;
      return { playerId: s.playerId, ratings, mean };
    })
  );

  // Get existing lineup count for ordinal
  const existingLineups = await storage.getMatchLineupVersions(matchId);
  let ordinal = existingLineups.length;

  const versionIds: string[] = [];

  // Generate 1 GREEDY_LOCAL variant
  const greedyResult = balanceGreedyLocal(rated, perTeam);
  const greedyVersion = await storage.createLineupVersion({
    matchId,
    ordinal: ordinal++,
    algo: 'GREEDY_LOCAL',
    score: greedyResult.score,
    recommended: true, // Mark first one as recommended
  });
  versionIds.push(greedyVersion.id);

  // Create assignments for greedy version
  console.log(`[generateLineupVariants] Creating lineup assignments for GREEDY version: ${greedyResult.light.length} light + ${greedyResult.dark.length} dark`);
  for (const playerId of greedyResult.light) {
    await storage.createLineupAssignment({
      lineupVersionId: greedyVersion.id,
      teamSide: 'LIGHT',
      playerId,
    });
  }
  for (const playerId of greedyResult.dark) {
    await storage.createLineupAssignment({
      lineupVersionId: greedyVersion.id,
      teamSide: 'DARK',
      playerId,
    });
  }

  // Generate random seeded variants
  for (let i = 1; i < count; i++) {
    const seed = Date.now() + i;
    const randomResult = balanceRandomSeeded(rated, perTeam, seed);
    
    const randomVersion = await storage.createLineupVersion({
      matchId,
      ordinal: ordinal++,
      algo: 'RANDOM_SEEDED',
      seed,
      score: randomResult.score,
      recommended: false,
    });
    versionIds.push(randomVersion.id);

    // Create assignments
    for (const playerId of randomResult.light) {
      await storage.createLineupAssignment({
        lineupVersionId: randomVersion.id,
        teamSide: 'LIGHT',
        playerId,
      });
    }
    for (const playerId of randomResult.dark) {
      await storage.createLineupAssignment({
        lineupVersionId: randomVersion.id,
        teamSide: 'DARK',
        playerId,
      });
    }
  }

  return versionIds;
}

export async function applyLineupVersion(lineupVersionId: string): Promise<void> {
  console.log(`[applyLineupVersion] START - applying lineup version ${lineupVersionId}`);
  const version = await storage.getLineupVersion(lineupVersionId);
  if (!version) throw new Error('Lineup version not found');

  const assignments = await storage.getLineupAssignments(lineupVersionId);
  console.log(`[applyLineupVersion] Retrieved ${assignments.length} lineup assignments from storage`);
  const match = await storage.getMatch(version.matchId);
  if (!match) throw new Error('Match not found');

  let teams = await storage.getMatchTeams(version.matchId);
  
  // Create teams if they don't exist
  if (teams.length === 0) {
    console.log(`Creating teams for match ${version.matchId}`);
    await storage.createTeam({ matchId: version.matchId, name: 'LIGHT' });
    await storage.createTeam({ matchId: version.matchId, name: 'DARK' });
    teams = await storage.getMatchTeams(version.matchId);
  }
  
  const lightTeam = teams.find(t => t.name === 'LIGHT');
  const darkTeam = teams.find(t => t.name === 'DARK');
  
  if (!lightTeam || !darkTeam) {
    throw new Error(`Teams not properly created for match ${version.matchId}`);
  }

  // Clear existing team assignments
  await storage.deleteTeamAssignments(lightTeam.id);
  await storage.deleteTeamAssignments(darkTeam.id);

  // Apply new assignments from lineup version
  console.log(`[applyLineupVersion] Found ${assignments.length} lineup assignments to apply`);
  for (const assignment of assignments) {
    const teamId = assignment.teamSide === 'LIGHT' ? lightTeam.id : darkTeam.id;
    console.log(`[applyLineupVersion] Creating team assignment: player=${assignment.playerId}, team=${assignment.teamSide}, teamId=${teamId}`);
    await storage.createTeamAssignment({
      teamId,
      playerId: assignment.playerId,
      position: assignment.position,
    });
  }
  
  // Verify assignments were created
  const verifyLight = await storage.getTeamAssignments(lightTeam.id);
  const verifyDark = await storage.getTeamAssignments(darkTeam.id);
  console.log(`[applyLineupVersion] VERIFICATION: Light team has ${verifyLight.length} assignments, Dark team has ${verifyDark.length} assignments`);

  // Update recommended status
  const allVersions = await storage.getMatchLineupVersions(version.matchId);
  for (const v of allVersions) {
    await storage.updateLineupRecommended(v.id, v.id === lineupVersionId);
  }
}

export async function getLineupVariants(matchId: string) {
  const versions = await storage.getMatchLineupVersions(matchId);
  
  const variants = await Promise.all(
    versions.map(async (version) => {
      const assignments = await storage.getLineupAssignments(version.id);
      const lightPlayers = assignments.filter(a => a.teamSide === 'LIGHT');
      const darkPlayers = assignments.filter(a => a.teamSide === 'DARK');

      // Get player details
      const getPlayerDetails = async (playerIds: string[]) => {
        return await Promise.all(
          playerIds.map(async (playerId) => {
            const player = await storage.getPlayer(playerId);
            return player ? `${player.name} ${player.surname}`.trim() : 'Unknown';
          })
        );
      };

      const lightNames = await getPlayerDetails(lightPlayers.map(p => p.playerId));
      const darkNames = await getPlayerDetails(darkPlayers.map(p => p.playerId));

      return {
        id: version.id,
        ordinal: version.ordinal,
        algo: version.algo,
        seed: version.seed,
        score: version.score,
        recommended: version.recommended,
        light: lightNames,
        dark: darkNames,
      };
    })
  );

  return variants.sort((a, b) => a.ordinal - b.ordinal);
}
