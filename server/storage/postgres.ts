import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { 
  type User, type InsertUser, 
  type Player, type InsertPlayer,
  type PlayerRatings, type InsertPlayerRatings,
  type Match, type InsertMatch,
  type Signup, type InsertSignup,
  type Team, type InsertTeam,
  type TeamAssignment, type InsertTeamAssignment,
  type LineupVersion, type InsertLineupVersion,
  type LineupAssignment, type InsertLineupAssignment,
  type AuditLog, type InsertAuditLog,
  type MatchStatus, type SignupStatus, type TeamSide
} from "@shared/schema";
import type { IStorage } from '../storage';

export class PostgresStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0] as User | undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
    return result[0] as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0] as User;
  }

  // Players
  async getPlayer(id: string): Promise<Player | undefined> {
    const result = await db.select().from(schema.players).where(eq(schema.players.id, id)).limit(1);
    return result[0] as Player | undefined;
  }

  async getPlayerByPhone(phone: string): Promise<Player | undefined> {
    const result = await db.select().from(schema.players).where(eq(schema.players.phone, phone)).limit(1);
    return result[0] as Player | undefined;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const result = await db.insert(schema.players).values(player).returning();
    return result[0] as Player;
  }

  async getAllPlayers(): Promise<Player[]> {
    const result = await db.select().from(schema.players);
    return result as Player[];
  }

  async updatePlayer(id: string, updates: Partial<InsertPlayer>): Promise<void> {
    await db.update(schema.players).set(updates).where(eq(schema.players.id, id));
  }

  // Player Ratings
  async getPlayerRatings(playerId: string): Promise<PlayerRatings | undefined> {
    const result = await db.select().from(schema.playerRatings)
      .where(eq(schema.playerRatings.playerId, playerId)).limit(1);
    return result[0] as PlayerRatings | undefined;
  }

  async createPlayerRatings(ratings: InsertPlayerRatings): Promise<PlayerRatings> {
    const result = await db.insert(schema.playerRatings).values(ratings).returning();
    return result[0] as PlayerRatings;
  }

  async updatePlayerRatings(playerId: string, ratings: Omit<InsertPlayerRatings, 'playerId'>): Promise<PlayerRatings> {
    const result = await db.update(schema.playerRatings)
      .set({ ...ratings, updatedAt: new Date() })
      .where(eq(schema.playerRatings.playerId, playerId))
      .returning();
    
    if (result.length === 0) {
      return this.createPlayerRatings({ playerId, ...ratings });
    }
    
    return result[0] as PlayerRatings;
  }

  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    const result = await db.select().from(schema.matches).where(eq(schema.matches.id, id)).limit(1);
    return result[0] as Match | undefined;
  }

  async getAllMatches(): Promise<Match[]> {
    const result = await db.select().from(schema.matches);
    return result as Match[];
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const result = await db.insert(schema.matches).values(match as any).returning();
    return result[0] as Match;
  }

  async updateMatchStatus(id: string, status: MatchStatus): Promise<void> {
    await db.update(schema.matches).set({ status }).where(eq(schema.matches.id, id));
  }

  // Signups
  async getSignup(matchId: string, playerId: string): Promise<Signup | undefined> {
    const result = await db.select().from(schema.signups)
      .where(and(
        eq(schema.signups.matchId, matchId),
        eq(schema.signups.playerId, playerId)
      )).limit(1);
    return result[0] as Signup | undefined;
  }

  async getSignupById(id: string): Promise<Signup | undefined> {
    const result = await db.select().from(schema.signups).where(eq(schema.signups.id, id)).limit(1);
    return result[0] as Signup | undefined;
  }

  async getMatchSignups(matchId: string): Promise<Signup[]> {
    const result = await db.select().from(schema.signups)
      .where(eq(schema.signups.matchId, matchId));
    return result as Signup[];
  }

  async createSignup(signup: InsertSignup): Promise<Signup> {
    const result = await db.insert(schema.signups).values(signup).returning();
    return result[0] as Signup;
  }

  async updateSignup(id: string, status: SignupStatus, reserveTeam?: TeamSide): Promise<void> {
    const updates: any = { status };
    if (reserveTeam !== undefined) {
      updates.reserveTeam = reserveTeam;
    }
    await db.update(schema.signups).set(updates).where(eq(schema.signups.id, id));
  }

  // Teams
  async getMatchTeams(matchId: string): Promise<Team[]> {
    const result = await db.select().from(schema.teams)
      .where(eq(schema.teams.matchId, matchId));
    return result as Team[];
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const result = await db.insert(schema.teams).values(team).returning();
    return result[0] as Team;
  }

  // Team Assignments
  async getTeamAssignments(teamId: string): Promise<TeamAssignment[]> {
    const result = await db.select().from(schema.teamAssignments)
      .where(eq(schema.teamAssignments.teamId, teamId));
    return result as TeamAssignment[];
  }

  async getMatchAssignments(matchId: string): Promise<TeamAssignment[]> {
    const result = await db.select({
      id: schema.teamAssignments.id,
      teamId: schema.teamAssignments.teamId,
      playerId: schema.teamAssignments.playerId,
    })
    .from(schema.teamAssignments)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamAssignments.teamId))
    .where(eq(schema.teams.matchId, matchId));
    
    return result as TeamAssignment[];
  }

  async createTeamAssignment(assignment: InsertTeamAssignment): Promise<TeamAssignment> {
    const result = await db.insert(schema.teamAssignments).values(assignment).returning();
    return result[0] as TeamAssignment;
  }

  async deleteTeamAssignments(teamId: string): Promise<void> {
    await db.delete(schema.teamAssignments).where(eq(schema.teamAssignments.teamId, teamId));
  }

  // LineupVersions
  async getLineupVersion(id: string): Promise<LineupVersion | undefined> {
    const result = await db.select().from(schema.lineupVersions)
      .where(eq(schema.lineupVersions.id, id)).limit(1);
    return result[0] as LineupVersion | undefined;
  }

  async getMatchLineupVersions(matchId: string): Promise<LineupVersion[]> {
    const result = await db.select().from(schema.lineupVersions)
      .where(eq(schema.lineupVersions.matchId, matchId));
    return result as LineupVersion[];
  }

  async createLineupVersion(version: InsertLineupVersion): Promise<LineupVersion> {
    const result = await db.insert(schema.lineupVersions).values(version).returning();
    return result[0] as LineupVersion;
  }

  async updateLineupRecommended(id: string, recommended: boolean): Promise<void> {
    await db.update(schema.lineupVersions).set({ recommended }).where(eq(schema.lineupVersions.id, id));
  }

  async deleteLineupVersion(id: string): Promise<void> {
    await db.delete(schema.lineupVersions).where(eq(schema.lineupVersions.id, id));
  }

  async deleteMatchLineupVersions(matchId: string): Promise<void> {
    await db.delete(schema.lineupVersions).where(eq(schema.lineupVersions.matchId, matchId));
  }

  // LineupAssignments
  async getLineupAssignments(lineupVersionId: string): Promise<LineupAssignment[]> {
    const result = await db.select().from(schema.lineupAssignments)
      .where(eq(schema.lineupAssignments.lineupVersionId, lineupVersionId));
    return result as LineupAssignment[];
  }

  async createLineupAssignment(assignment: InsertLineupAssignment): Promise<LineupAssignment> {
    const result = await db.insert(schema.lineupAssignments).values(assignment).returning();
    return result[0] as LineupAssignment;
  }

  async deleteLineupAssignments(lineupVersionId: string): Promise<void> {
    await db.delete(schema.lineupAssignments)
      .where(eq(schema.lineupAssignments.lineupVersionId, lineupVersionId));
  }

  // AuditLog
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(schema.auditLogs).values(log).returning();
    return result[0] as AuditLog;
  }

  async getAuditLogs(entity: string, entityId: string): Promise<AuditLog[]> {
    const result = await db.select().from(schema.auditLogs)
      .where(and(
        eq(schema.auditLogs.entity, entity),
        eq(schema.auditLogs.entityId, entityId)
      ));
    return result as AuditLog[];
  }
}
