import { pgTable, varchar, text, timestamp, boolean, integer, real, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar('phone', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  surname: varchar('surname', { length: 255 }),
  role: varchar('role', { length: 20 }).notNull().default('USER'),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Players table
export const players = pgTable('players', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  surname: varchar('surname', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull().unique(),
  notes: text('notes'),
});

// Player Ratings table
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

// Matches table
export const matches = pgTable('matches', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  sport: varchar('sport', { length: 20 }).notNull(),
  dateTime: varchar('date_time', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull().references(() => users.id),
  teamNameLight: varchar('team_name_light', { length: 255 }),
  teamNameDark: varchar('team_name_dark', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('OPEN'),
  inviteTokenHash: varchar('invite_token_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Signups table
export const signups = pgTable('signups', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar('match_id', { length: 255 }).notNull().references(() => matches.id),
  playerId: varchar('player_id', { length: 255 }).notNull().references(() => players.id),
  phone: varchar('phone', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  reserveTeam: varchar('reserve_team', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Teams table
export const teams = pgTable('teams', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar('match_id', { length: 255 }).notNull().references(() => matches.id),
  name: varchar('name', { length: 20 }).notNull(),
  frozen: boolean('frozen').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Team Assignments table
export const teamAssignments = pgTable('team_assignments', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar('team_id', { length: 255 }).notNull().references(() => teams.id),
  playerId: varchar('player_id', { length: 255 }).notNull().references(() => players.id),
});

// Lineup Versions table
export const lineupVersions = pgTable('lineup_versions', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar('match_id', { length: 255 }).notNull().references(() => matches.id),
  ordinal: integer('ordinal').notNull(),
  variantType: varchar('variant_type', { length: 20 }).notNull(),
  algo: varchar('algo', { length: 50 }).notNull(),
  seed: integer('seed'),
  score: real('score').notNull(),
  meanDelta: real('mean_delta').notNull(),
  recommended: boolean('recommended').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Lineup Assignments table
export const lineupAssignments = pgTable('lineup_assignments', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  lineupVersionId: varchar('lineup_version_id', { length: 255 }).notNull().references(() => lineupVersions.id),
  playerId: varchar('player_id', { length: 255 }).notNull().references(() => players.id),
  teamSide: varchar('team_side', { length: 20 }).notNull(),
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar('actor_user_id', { length: 255 }),
  action: varchar('action', { length: 255 }).notNull(),
  entity: varchar('entity', { length: 255 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
