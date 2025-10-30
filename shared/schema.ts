import { z } from "zod";

// Enums
export const Role = z.enum(['ADMIN', 'USER']);
export const Sport = z.enum(['THREE', 'FIVE', 'EIGHT', 'ELEVEN']);
export const MatchStatus = z.enum(['OPEN', 'FROZEN', 'CLOSED']);
export const SignupStatus = z.enum(['STARTER', 'RESERVE', 'NEXT']);
export const TeamSide = z.enum(['LIGHT', 'DARK']);
export const Algo = z.enum(['GREEDY_LOCAL', 'RANDOM_SEEDED', 'MANUAL']);
export const VariantType = z.enum(['V1', 'V2', 'V3', 'V4']);

export type Role = z.infer<typeof Role>;
export type Sport = z.infer<typeof Sport>;
export type MatchStatus = z.infer<typeof MatchStatus>;
export type SignupStatus = z.infer<typeof SignupStatus>;
export type TeamSide = z.infer<typeof TeamSide>;
export type Algo = z.infer<typeof Algo>;
export type VariantType = z.infer<typeof VariantType>;

// User schema
export const insertUserSchema = z.object({
  phone: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  surname: z.string().optional(),
  role: Role.default('USER'),
  password: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const userSchema = insertUserSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;

// Player schema
export const insertPlayerSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  surname: z.string(),
  phone: z.string(),
  notes: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const playerSchema = insertPlayerSchema.extend({
  id: z.string(),
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = z.infer<typeof playerSchema>;

// Player Ratings schema
export const insertPlayerRatingsSchema = z.object({
  playerId: z.string(),
  defense: z.number().int().min(1).max(5),
  attack: z.number().int().min(1).max(5),
  speed: z.number().int().min(1).max(5),
  power: z.number().int().min(1).max(5),
  technique: z.number().int().min(1).max(5),
  shot: z.number().int().min(1).max(5),
  extra: z.any().optional(),
});

export const playerRatingsSchema = insertPlayerRatingsSchema.extend({
  updatedAt: z.date(),
});

export type InsertPlayerRatings = z.infer<typeof insertPlayerRatingsSchema>;
export type PlayerRatings = z.infer<typeof playerRatingsSchema>;

// Match schema
export const insertMatchSchema = z.object({
  sport: Sport,
  dateTime: z.string(),
  location: z.string(),
  createdBy: z.string(),
  teamNameLight: z.string().optional(),
  teamNameDark: z.string().optional(),
});

export const matchSchema = insertMatchSchema.extend({
  id: z.string(),
  status: MatchStatus.default('OPEN'),
  inviteTokenHash: z.string(),
  createdAt: z.date(),
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = z.infer<typeof matchSchema>;

// Signup schema
export const insertSignupSchema = z.object({
  matchId: z.string(),
  playerId: z.string(),
  phone: z.string(),
  status: SignupStatus,
  reserveTeam: TeamSide.optional(),
});

export const signupSchema = insertSignupSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export type InsertSignup = z.infer<typeof insertSignupSchema>;
export type Signup = z.infer<typeof signupSchema>;

// Team schema
export const insertTeamSchema = z.object({
  matchId: z.string(),
  name: TeamSide,
});

export const teamSchema = insertTeamSchema.extend({
  id: z.string(),
  frozen: z.boolean().default(false),
  createdAt: z.date(),
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = z.infer<typeof teamSchema>;

// Team Assignment schema
export const insertTeamAssignmentSchema = z.object({
  teamId: z.string(),
  playerId: z.string(),
  position: z.string().optional(),
});

export const teamAssignmentSchema = insertTeamAssignmentSchema.extend({
  id: z.string(),
});

export type InsertTeamAssignment = z.infer<typeof insertTeamAssignmentSchema>;
export type TeamAssignment = z.infer<typeof teamAssignmentSchema>;

// LineupVersion schema
export const insertLineupVersionSchema = z.object({
  matchId: z.string(),
  ordinal: z.number().int(),
  variantType: VariantType,
  algo: Algo,
  seed: z.number().int().optional(),
  score: z.number(),
  meanDelta: z.number(),
  recommended: z.boolean().default(false),
});

export const lineupVersionSchema = insertLineupVersionSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export type InsertLineupVersion = z.infer<typeof insertLineupVersionSchema>;
export type LineupVersion = z.infer<typeof lineupVersionSchema>;

// LineupAssignment schema
export const insertLineupAssignmentSchema = z.object({
  lineupVersionId: z.string(),
  teamSide: TeamSide,
  playerId: z.string(),
  position: z.string().optional(),
});

export const lineupAssignmentSchema = insertLineupAssignmentSchema.extend({
  id: z.string(),
});

export type InsertLineupAssignment = z.infer<typeof insertLineupAssignmentSchema>;
export type LineupAssignment = z.infer<typeof lineupAssignmentSchema>;

// AuditLog schema
export const insertAuditLogSchema = z.object({
  actorUserId: z.string().optional(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().optional(),
  payload: z.any().optional(),
});

export const auditLogSchema = insertAuditLogSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;

// Invite Signup Request (for API)
export const inviteSignupRequestSchema = z.object({
  phone: z.string(),
  name: z.string().min(1),
  surname: z.string().min(1),
  choice: z.enum(['STARTER', 'RESERVE', 'NEXT']),
  suggestedRatings: z.object({
    defense: z.number().int().min(1).max(5),
    attack: z.number().int().min(1).max(5),
    speed: z.number().int().min(1).max(5),
    power: z.number().int().min(1).max(5),
    technique: z.number().int().min(1).max(5),
    shot: z.number().int().min(1).max(5),
  }),
});

export type InviteSignupRequest = z.infer<typeof inviteSignupRequestSchema>;

// Match View Response (for API)
export const matchViewSchema = z.object({
  match: z.object({
    id: z.string(),
    sport: Sport,
    dateTime: z.string(),
    location: z.string(),
    status: MatchStatus,
    teamNameLight: z.string(),
    teamNameDark: z.string(),
  }),
  me: z.object({
    status: SignupStatus,
  }).nullable(),
  starters: z.object({
    light: z.array(z.object({ id: z.string(), name: z.string() })),
    dark: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
  reserves: z.object({
    light: z.array(z.object({ id: z.string(), name: z.string() })),
    dark: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
  next: z.object({
    light: z.array(z.object({ id: z.string(), name: z.string() })),
    dark: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
  radar: z.object({
    light: z.record(z.number()),
    dark: z.record(z.number()),
  }),
});

export type MatchView = z.infer<typeof matchViewSchema>;

// Utility constants
export const AXES = ['defense', 'attack', 'speed', 'power', 'technique', 'shot'] as const;
export type AxisKey = typeof AXES[number];

export const AXIS_LABELS_IT: Record<AxisKey, string> = {
  defense: 'Difesa',
  attack: 'Attacco',
  speed: 'Velocità',
  power: 'Stato di forma',
  technique: 'Tecnica',
  shot: 'Tiro',
};

export function startersCap(sport: Sport): number {
  switch (sport) {
    case 'THREE': return 6;
    case 'FIVE': return 10;
    case 'EIGHT': return 16;
    case 'ELEVEN': return 22;
  }
}

export function normalizeE164(phone: string): string {
  const p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+39' + p.slice(1);
  return '+39' + p;
}

// ==================== Drizzle ORM Table Definitions ====================
import { pgTable, varchar, text, timestamp, boolean, integer, real, jsonb, bigint } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar('phone', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  surname: varchar('surname', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('USER'),
  password: varchar('password', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const players = pgTable('players', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  surname: varchar('surname', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull().unique(),
  notes: text('notes'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
});

export const playerRatings = pgTable('player_ratings', {
  playerId: varchar('player_id', { length: 255 }).primaryKey().references(() => players.id),
  defense: integer('defense').notNull(),
  attack: integer('attack').notNull(),
  speed: integer('speed').notNull(),
  power: integer('power').notNull(),
  technique: integer('technique').notNull(),
  shot: integer('shot').notNull(),
  extra: jsonb('extra'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const matches = pgTable('matches', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sport: varchar('sport', { length: 20 }).notNull(),
  dateTime: varchar('date_time', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull().references(() => users.id),
  teamNameLight: varchar('team_name_light', { length: 255 }),
  teamNameDark: varchar('team_name_dark', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  inviteTokenHash: varchar('invite_token_hash', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const signups = pgTable('signups', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar('match_id', { length: 255 }).notNull().references(() => matches.id),
  playerId: varchar('player_id', { length: 255 }).notNull().references(() => players.id),
  phone: varchar('phone', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  reserveTeam: varchar('reserve_team', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar('match_id', { length: 255 }).notNull().references(() => matches.id),
  name: varchar('name', { length: 20 }).notNull(),
  frozen: boolean('frozen').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const teamAssignments = pgTable('team_assignments', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar('team_id', { length: 255 }).notNull().references(() => teams.id),
  playerId: varchar('player_id', { length: 255 }).notNull().references(() => players.id),
});

export const lineupVersions = pgTable('lineup_versions', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar('match_id', { length: 255 }).notNull().references(() => matches.id),
  ordinal: integer('ordinal').notNull(),
  variantType: varchar('variant_type', { length: 20 }).notNull(),
  algo: varchar('algo', { length: 50 }).notNull(),
  seed: bigint('seed', { mode: 'number' }),
  score: real('score').notNull(),
  meanDelta: real('mean_delta').notNull(),
  recommended: boolean('recommended').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const lineupAssignments = pgTable('lineup_assignments', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  lineupVersionId: varchar('lineup_version_id', { length: 255 }).notNull().references(() => lineupVersions.id),
  playerId: varchar('player_id', { length: 255 }).notNull().references(() => players.id),
  teamSide: varchar('team_side', { length: 20 }).notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar('actor_user_id', { length: 255 }),
  action: varchar('action', { length: 255 }).notNull(),
  entity: varchar('entity', { length: 255 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
