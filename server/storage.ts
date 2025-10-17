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
  type Sport, type MatchStatus, type SignupStatus, type TeamSide
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Players
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByPhone(phone: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  getAllPlayers(): Promise<Player[]>;

  // Player Ratings
  getPlayerRatings(playerId: string): Promise<PlayerRatings | undefined>;
  createPlayerRatings(ratings: InsertPlayerRatings): Promise<PlayerRatings>;

  // Matches
  getMatch(id: string): Promise<Match | undefined>;
  getAllMatches(): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatchStatus(id: string, status: MatchStatus): Promise<void>;

  // Signups
  getSignup(matchId: string, playerId: string): Promise<Signup | undefined>;
  getSignupById(id: string): Promise<Signup | undefined>;
  getMatchSignups(matchId: string): Promise<Signup[]>;
  createSignup(signup: InsertSignup): Promise<Signup>;
  updateSignup(id: string, status: SignupStatus, reserveTeam?: TeamSide): Promise<void>;

  // Teams
  getMatchTeams(matchId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;

  // Team Assignments
  getTeamAssignments(teamId: string): Promise<TeamAssignment[]>;
  getMatchAssignments(matchId: string): Promise<TeamAssignment[]>;
  createTeamAssignment(assignment: InsertTeamAssignment): Promise<TeamAssignment>;
  deleteTeamAssignments(teamId: string): Promise<void>;

  // Player Updates
  updatePlayer(id: string, updates: Partial<InsertPlayer>): Promise<void>;
  updatePlayerRatings(playerId: string, ratings: Omit<InsertPlayerRatings, 'playerId'>): Promise<PlayerRatings>;

  // LineupVersions
  getLineupVersion(id: string): Promise<LineupVersion | undefined>;
  getMatchLineupVersions(matchId: string): Promise<LineupVersion[]>;
  createLineupVersion(version: InsertLineupVersion): Promise<LineupVersion>;
  updateLineupRecommended(id: string, recommended: boolean): Promise<void>;
  deleteLineupVersion(id: string): Promise<void>;
  deleteMatchLineupVersions(matchId: string): Promise<void>;

  // LineupAssignments
  getLineupAssignments(lineupVersionId: string): Promise<LineupAssignment[]>;
  createLineupAssignment(assignment: InsertLineupAssignment): Promise<LineupAssignment>;
  deleteLineupAssignments(lineupVersionId: string): Promise<void>;

  // AuditLog
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entity: string, entityId: string): Promise<AuditLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private players: Map<string, Player>;
  private playerRatings: Map<string, PlayerRatings>;
  private matches: Map<string, Match>;
  private signups: Map<string, Signup>;
  private teams: Map<string, Team>;
  private teamAssignments: Map<string, TeamAssignment>;
  private lineupVersions: Map<string, LineupVersion>;
  private lineupAssignments: Map<string, LineupAssignment>;
  private auditLogs: Map<string, AuditLog>;

  constructor() {
    this.users = new Map();
    this.players = new Map();
    this.playerRatings = new Map();
    this.matches = new Map();
    this.signups = new Map();
    this.teams = new Map();
    this.teamAssignments = new Map();
    this.lineupVersions = new Map();
    this.lineupAssignments = new Map();
    this.auditLogs = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  // Players
  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayerByPhone(phone: string): Promise<Player | undefined> {
    return Array.from(this.players.values()).find(p => p.phone === phone);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = { ...insertPlayer, id };
    this.players.set(id, player);
    return player;
  }

  async getAllPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  // Player Ratings
  async getPlayerRatings(playerId: string): Promise<PlayerRatings | undefined> {
    return this.playerRatings.get(playerId);
  }

  async createPlayerRatings(insertRatings: InsertPlayerRatings): Promise<PlayerRatings> {
    const ratings: PlayerRatings = { ...insertRatings, updatedAt: new Date() };
    this.playerRatings.set(insertRatings.playerId, ratings);
    return ratings;
  }

  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async getAllMatches(): Promise<Match[]> {
    return Array.from(this.matches.values()).sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = randomUUID();
    const match: Match = {
      ...insertMatch,
      id,
      status: 'OPEN',
      inviteTokenHash: '',
      createdAt: new Date(),
    };
    this.matches.set(id, match);
    return match;
  }

  async updateMatchStatus(id: string, status: MatchStatus): Promise<void> {
    const match = this.matches.get(id);
    if (match) {
      match.status = status;
      this.matches.set(id, match);
    }
  }

  // Signups
  async getSignup(matchId: string, playerId: string): Promise<Signup | undefined> {
    return Array.from(this.signups.values()).find(
      s => s.matchId === matchId && s.playerId === playerId
    );
  }

  async getSignupById(id: string): Promise<Signup | undefined> {
    return this.signups.get(id);
  }

  async getMatchSignups(matchId: string): Promise<Signup[]> {
    return Array.from(this.signups.values()).filter(s => s.matchId === matchId);
  }

  async createSignup(insertSignup: InsertSignup): Promise<Signup> {
    const id = randomUUID();
    const signup: Signup = { ...insertSignup, id, createdAt: new Date() };
    this.signups.set(id, signup);
    return signup;
  }

  async updateSignup(id: string, status: SignupStatus, reserveTeam?: TeamSide): Promise<void> {
    const signup = this.signups.get(id);
    if (signup) {
      signup.status = status;
      if (reserveTeam !== undefined) {
        signup.reserveTeam = reserveTeam;
      }
      this.signups.set(id, signup);
    }
  }

  // Teams
  async getMatchTeams(matchId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(t => t.matchId === matchId);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const team: Team = { ...insertTeam, id, frozen: false, createdAt: new Date() };
    this.teams.set(id, team);
    return team;
  }

  // Team Assignments
  async getTeamAssignments(teamId: string): Promise<TeamAssignment[]> {
    return Array.from(this.teamAssignments.values()).filter(a => a.teamId === teamId);
  }

  async getMatchAssignments(matchId: string): Promise<TeamAssignment[]> {
    const teams = await this.getMatchTeams(matchId);
    const teamIds = new Set(teams.map(t => t.id));
    return Array.from(this.teamAssignments.values()).filter(a => teamIds.has(a.teamId));
  }

  async createTeamAssignment(insertAssignment: InsertTeamAssignment): Promise<TeamAssignment> {
    const id = randomUUID();
    const assignment: TeamAssignment = { ...insertAssignment, id };
    this.teamAssignments.set(id, assignment);
    return assignment;
  }

  async deleteTeamAssignments(teamId: string): Promise<void> {
    const toDelete = Array.from(this.teamAssignments.entries())
      .filter(([, a]) => a.teamId === teamId)
      .map(([id]) => id);
    toDelete.forEach(id => this.teamAssignments.delete(id));
  }

  // Player Updates
  async updatePlayer(id: string, updates: Partial<InsertPlayer>): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      Object.assign(player, updates);
      this.players.set(id, player);
    }
  }

  async updatePlayerRatings(playerId: string, ratings: Omit<InsertPlayerRatings, 'playerId'>): Promise<PlayerRatings> {
    const updated: PlayerRatings = { ...ratings, playerId, updatedAt: new Date() };
    this.playerRatings.set(playerId, updated);
    return updated;
  }

  // LineupVersions
  async getLineupVersion(id: string): Promise<LineupVersion | undefined> {
    return this.lineupVersions.get(id);
  }

  async getMatchLineupVersions(matchId: string): Promise<LineupVersion[]> {
    return Array.from(this.lineupVersions.values())
      .filter(v => v.matchId === matchId)
      .sort((a, b) => a.ordinal - b.ordinal);
  }

  async createLineupVersion(insertVersion: InsertLineupVersion): Promise<LineupVersion> {
    const id = randomUUID();
    const version: LineupVersion = { ...insertVersion, id, createdAt: new Date() };
    this.lineupVersions.set(id, version);
    return version;
  }

  async updateLineupRecommended(id: string, recommended: boolean): Promise<void> {
    const version = this.lineupVersions.get(id);
    if (version) {
      version.recommended = recommended;
      this.lineupVersions.set(id, version);
    }
  }

  async deleteLineupVersion(id: string): Promise<void> {
    this.lineupVersions.delete(id);
  }

  async deleteMatchLineupVersions(matchId: string): Promise<void> {
    const versions = await this.getMatchLineupVersions(matchId);
    for (const version of versions) {
      await this.deleteLineupAssignments(version.id);
      this.lineupVersions.delete(version.id);
    }
  }

  // LineupAssignments
  async getLineupAssignments(lineupVersionId: string): Promise<LineupAssignment[]> {
    return Array.from(this.lineupAssignments.values()).filter(a => a.lineupVersionId === lineupVersionId);
  }

  async createLineupAssignment(insertAssignment: InsertLineupAssignment): Promise<LineupAssignment> {
    const id = randomUUID();
    const assignment: LineupAssignment = { ...insertAssignment, id };
    this.lineupAssignments.set(id, assignment);
    return assignment;
  }

  async deleteLineupAssignments(lineupVersionId: string): Promise<void> {
    const toDelete = Array.from(this.lineupAssignments.entries())
      .filter(([, a]) => a.lineupVersionId === lineupVersionId)
      .map(([id]) => id);
    toDelete.forEach(id => this.lineupAssignments.delete(id));
  }

  // AuditLog
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = { ...insertLog, id, createdAt: new Date() };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(entity: string, entityId: string): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.entity === entity && log.entityId === entityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();
