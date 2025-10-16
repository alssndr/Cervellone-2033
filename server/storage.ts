import { 
  type User, type InsertUser, 
  type Player, type InsertPlayer,
  type PlayerRatings, type InsertPlayerRatings,
  type Match, type InsertMatch,
  type Signup, type InsertSignup,
  type Team, type InsertTeam,
  type TeamAssignment, type InsertTeamAssignment,
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private players: Map<string, Player>;
  private playerRatings: Map<string, PlayerRatings>;
  private matches: Map<string, Match>;
  private signups: Map<string, Signup>;
  private teams: Map<string, Team>;
  private teamAssignments: Map<string, TeamAssignment>;

  constructor() {
    this.users = new Map();
    this.players = new Map();
    this.playerRatings = new Map();
    this.matches = new Map();
    this.signups = new Map();
    this.teams = new Map();
    this.teamAssignments = new Map();
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
}

export const storage = new MemStorage();
