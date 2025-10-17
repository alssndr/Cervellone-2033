import { storage } from '../storage';
import { balanceGreedyLocal, balanceRandomSeeded, type RatedPlayer, type TeamAssignmentResult } from './balance';
import { startersCap } from '@shared/schema';
import type { Algo } from '@shared/schema';

export async function generateLineupVariants(matchId: string): Promise<string[]> {
  const match = await storage.getMatch(matchId);
  if (!match) throw new Error('Match not found');

  const perTeam = startersCap(match.sport) / 2;
  const signups = await storage.getMatchSignups(matchId);
  const starters = signups.filter(s => s.status === 'STARTER');
  
  // Must have at least 1 player
  if (starters.length === 0) {
    throw new Error('Serve almeno 1 giocatore titolare per generare le squadre');
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

  // DELETE all existing variants (v1/v2/v3/v4)
  await storage.deleteMatchLineupVersions(matchId);

  // Generate 3 GREEDY_LOCAL variants with different seeds
  const variantCandidates: Array<{
    result: TeamAssignmentResult;
    meanDelta: number;
    seed: number;
  }> = [];

  for (let i = 0; i < 3; i++) {
    const seed = Date.now() + i * 1000;
    const result = balanceGreedyLocal(rated, perTeam, 200 + i * 50); // Different kSwaps for variation
    
    // Calculate mean delta (difference between team means)
    const lightMean = result.light
      .map(id => rated.find(p => p.playerId === id)!)
      .reduce((sum, p) => sum + p.mean, 0) / Math.max(result.light.length, 1);
    
    const darkMean = result.dark
      .map(id => rated.find(p => p.playerId === id)!)
      .reduce((sum, p) => sum + p.mean, 0) / Math.max(result.dark.length, 1);
    
    const meanDelta = Math.abs(lightMean - darkMean);
    
    variantCandidates.push({ result, meanDelta, seed });
  }

  // Sort by meanDelta: v1 = smallest (most balanced), v3 = largest
  variantCandidates.sort((a, b) => a.meanDelta - b.meanDelta);

  const versionIds: string[] = [];
  const variantTypes: Array<'V1' | 'V2' | 'V3'> = ['V1', 'V2', 'V3'];

  // Create variants in order (v1, v2, v3)
  for (let i = 0; i < 3; i++) {
    const candidate = variantCandidates[i];
    const variantType = variantTypes[i];
    
    const version = await storage.createLineupVersion({
      matchId,
      ordinal: i,
      variantType,
      algo: 'GREEDY_LOCAL',
      seed: candidate.seed,
      score: candidate.result.score,
      meanDelta: candidate.meanDelta,
      recommended: i === 0, // Only v1 is recommended
    });
    versionIds.push(version.id);

    console.log(`[generateLineupVariants] Created ${variantType}: score=${candidate.result.score.toFixed(2)}, meanDelta=${candidate.meanDelta.toFixed(3)}, ${candidate.result.light.length}L + ${candidate.result.dark.length}D`);

    // Create assignments
    for (const playerId of candidate.result.light) {
      await storage.createLineupAssignment({
        lineupVersionId: version.id,
        teamSide: 'LIGHT',
        playerId,
      });
    }
    for (const playerId of candidate.result.dark) {
      await storage.createLineupAssignment({
        lineupVersionId: version.id,
        teamSide: 'DARK',
        playerId,
      });
    }
  }

  console.log(`[generateLineupVariants] Generated 3 GREEDY variants: v1 (best balance) to v3`);
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

      return {
        id: version.id,
        ordinal: version.ordinal,
        variantType: version.variantType,
        algo: version.algo,
        score: version.score,
        meanDelta: version.meanDelta,
        recommended: version.recommended,
        light: lightPlayers.map(p => p.playerId),
        dark: darkPlayers.map(p => p.playerId),
      };
    })
  );

  return variants.sort((a, b) => a.ordinal - b.ordinal);
}

export async function saveManualVariant(
  matchId: string,
  lightIds: string[],
  darkIds: string[]
): Promise<{ id: string; meanDelta: number }> {
  // 1. Get all starters for validation
  const signups = await storage.getMatchSignups(matchId);
  const starters = signups.filter(s => s.status === 'STARTER');
  const starterIds = new Set(starters.map(s => s.playerId));
  
  // 2. Validate that all provided players are starters
  for (const id of [...lightIds, ...darkIds]) {
    if (!starterIds.has(id)) {
      throw new Error(`Player ${id} is not a starter`);
    }
  }
  
  // 3. Calculate meanDelta
  const rated: RatedPlayer[] = await Promise.all(
    starters.map(async s => {
      const ratings = await storage.getPlayerRatings(s.playerId);
      if (!ratings) throw new Error(`Player ${s.playerId} has no ratings`);
      const mean = (ratings.defense + ratings.attack + ratings.speed + ratings.power + ratings.technique + ratings.shot) / 6;
      return { playerId: s.playerId, ratings, mean };
    })
  );
  
  const lightMean = lightIds.length > 0
    ? lightIds.map(id => rated.find(p => p.playerId === id)!).reduce((sum, p) => sum + p.mean, 0) / lightIds.length
    : 0;
  
  const darkMean = darkIds.length > 0
    ? darkIds.map(id => rated.find(p => p.playerId === id)!).reduce((sum, p) => sum + p.mean, 0) / darkIds.length
    : 0;
  
  const meanDelta = Math.abs(lightMean - darkMean);
  
  // 4. Delete existing v4
  const existing = await storage.getMatchLineupVersions(matchId);
  const v4 = existing.find(v => v.variantType === 'V4');
  if (v4) {
    await storage.deleteLineupVersion(v4.id);
    console.log(`[saveManualVariant] Deleted existing V4 variant`);
  }
  
  // 5. Create new v4
  const version = await storage.createLineupVersion({
    matchId,
    ordinal: 3,
    variantType: 'V4',
    algo: 'MANUAL',
    seed: 0,
    score: 0,
    meanDelta,
    recommended: false,
  });
  
  // 6. Create assignments
  for (const playerId of lightIds) {
    await storage.createLineupAssignment({
      lineupVersionId: version.id,
      teamSide: 'LIGHT',
      playerId,
    });
  }
  for (const playerId of darkIds) {
    await storage.createLineupAssignment({
      lineupVersionId: version.id,
      teamSide: 'DARK',
      playerId,
    });
  }
  
  console.log(`[saveManualVariant] Created V4: meanDelta=${meanDelta.toFixed(3)}, ${lightIds.length}L + ${darkIds.length}D`);
  
  return { id: version.id, meanDelta };
}
