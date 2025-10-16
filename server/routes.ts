import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { normalizeE164, startersCap, type Sport, type User } from "@shared/schema";
import { balanceGreedyLocal, type RatedPlayer } from "./services/balance";
import { buildPublicMatchView } from "./services/matchView";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' 
  ? (() => { throw new Error('JWT_SECRET is required in production'); })() 
  : "dev-secret-key");

interface AuthRequest extends Request {
  adminUser?: User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin authentication middleware
  const adminAuth = async (req: AuthRequest, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.admin_token;
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      req.adminUser = await storage.getUser(payload.userId);
      if (!req.adminUser || req.adminUser.role !== 'ADMIN') {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }
      next();
    } catch {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  };

  // Admin login (phone-based)
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { phone } = req.body;
      const normalized = normalizeE164(phone);
      
      let user = await storage.getUserByPhone(normalized);
      if (!user) {
        user = await storage.createUser({ phone: normalized, role: 'ADMIN' });
      }

      if (user.role !== 'ADMIN') {
        return res.status(403).json({ ok: false, error: 'Not an admin user' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('admin_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ ok: true, token });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get all matches (admin)
  app.get('/api/admin/matches', adminAuth, async (req, res) => {
    try {
      const matches = await storage.getAllMatches();
      const matchesWithInvite = matches.map(match => {
        const inviteToken = jwt.sign({ matchId: match.id }, JWT_SECRET, { expiresIn: '30d' });
        const inviteUrl = `${req.protocol}://${req.get('host')}/invite/${inviteToken}`;
        return { ...match, inviteUrl };
      });
      res.json({ ok: true, items: matchesWithInvite });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Create match (admin)
  app.post('/api/admin/matches', adminAuth, async (req: AuthRequest, res) => {
    try {
      const { sport, dateTime, location } = req.body;
      
      const match = await storage.createMatch({
        sport: sport as Sport,
        dateTime,
        location,
        createdBy: req.adminUser!.id,
        teamNameLight: 'Chiari',
        teamNameDark: 'Scuri',
      });

      // Create teams
      await storage.createTeam({ matchId: match.id, name: 'LIGHT' });
      await storage.createTeam({ matchId: match.id, name: 'DARK' });

      // Generate invite token
      const inviteToken = jwt.sign({ matchId: match.id }, JWT_SECRET, { expiresIn: '30d' });
      const inviteUrl = `${req.protocol}://${req.get('host')}/invite/${inviteToken}`;

      res.json({ ok: true, match, inviteUrl, matchId: match.id });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get invite info
  app.get('/api/invite/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const payload: any = jwt.verify(token, JWT_SECRET);
      const match = await storage.getMatch(payload.matchId);
      
      if (!match || match.status !== 'OPEN') {
        return res.status(410).json({ ok: false, error: 'Match not open' });
      }

      const cap = startersCap(match.sport);
      const signups = await storage.getMatchSignups(match.id);
      const starters = signups.filter(s => s.status === 'STARTER').length;

      res.json({
        ok: true,
        match: {
          id: match.id,
          sport: match.sport,
          dateTime: match.dateTime,
          location: match.location,
          status: match.status,
          startersLeft: Math.max(cap - starters, 0),
        },
      });
    } catch (error: any) {
      res.status(401).json({ ok: false, error: 'Invalid invite' });
    }
  });

  // Signup via invite
  app.post('/api/invite/:token/signup', async (req, res) => {
    try {
      const { token } = req.params;
      const { phone, choice } = req.body;
      const normalized = normalizeE164(phone);

      const payload: any = jwt.verify(token, JWT_SECRET);
      const match = await storage.getMatch(payload.matchId);
      
      if (!match || match.status !== 'OPEN') {
        return res.status(410).json({ ok: false, error: 'Match not open' });
      }

      // Get or create player
      let player = await storage.getPlayerByPhone(normalized);
      if (!player) {
        let user = await storage.getUserByPhone(normalized);
        if (!user) {
          user = await storage.createUser({ phone: normalized, role: 'USER' });
        }
        player = await storage.createPlayer({
          userId: user.id,
          name: '',
          surname: '',
          phone: normalized,
        });

        // Create basic ratings for new player
        await storage.createPlayerRatings({
          playerId: player.id,
          defense: 3,
          attack: 3,
          speed: 3,
          power: 3,
          technique: 3,
          shot: 3,
        });
      }

      // Determine status
      const cap = startersCap(match.sport);
      const signups = await storage.getMatchSignups(match.id);
      const startersCount = signups.filter(s => s.status === 'STARTER').length;

      let status: 'STARTER' | 'RESERVE' | 'NEXT' = 'RESERVE';
      if (choice === 'NEXT') {
        status = 'NEXT';
      } else if (choice === 'STARTER' && startersCount < cap) {
        status = 'STARTER';
      } else {
        status = 'RESERVE';
      }

      // Assign reserve team if reserve
      let reserveTeam: 'LIGHT' | 'DARK' | undefined = undefined;
      if (status === 'RESERVE') {
        const lightCount = signups.filter(s => s.status === 'RESERVE' && s.reserveTeam === 'LIGHT').length;
        const darkCount = signups.filter(s => s.status === 'RESERVE' && s.reserveTeam === 'DARK').length;
        reserveTeam = lightCount <= darkCount ? 'LIGHT' : 'DARK';
      }

      // Create or update signup
      const existing = await storage.getSignup(match.id, player.id);
      if (existing) {
        await storage.updateSignup(existing.id, status, reserveTeam);
      } else {
        await storage.createSignup({
          matchId: match.id,
          playerId: player.id,
          phone: normalized,
          status,
          reserveTeam,
        });
      }

      // Balance teams if new starter
      if (status === 'STARTER') {
        await balanceTeams(match.id);
      }

      res.json({ ok: true, matchId: match.id });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Public match view
  app.get('/api/matches/:id/public', async (req, res) => {
    try {
      const { id } = req.params;
      const { phone } = req.query;
      
      const view = await buildPublicMatchView(id, phone as string || '');
      res.json({ ok: true, view });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Helper function to balance teams
  async function balanceTeams(matchId: string) {
    const match = await storage.getMatch(matchId);
    if (!match) return;

    const perTeam = startersCap(match.sport) / 2;
    const signups = await storage.getMatchSignups(matchId);
    const starters = signups.filter(s => s.status === 'STARTER');

    const rated: RatedPlayer[] = await Promise.all(
      starters.map(async s => {
        const ratings = await storage.getPlayerRatings(s.playerId);
        if (!ratings) {
          // Create default ratings if missing
          await storage.createPlayerRatings({
            playerId: s.playerId,
            defense: 3,
            attack: 3,
            speed: 3,
            power: 3,
            technique: 3,
            shot: 3,
          });
          return {
            playerId: s.playerId,
            ratings: {
              playerId: s.playerId,
              defense: 3,
              attack: 3,
              speed: 3,
              power: 3,
              technique: 3,
              shot: 3,
              updatedAt: new Date(),
            },
            mean: 3,
          };
        }
        const mean = (ratings.defense + ratings.attack + ratings.speed + ratings.power + ratings.technique + ratings.shot) / 6;
        return { playerId: s.playerId, ratings, mean };
      })
    );

    const { light, dark } = balanceGreedyLocal(rated, perTeam);

    const teams = await storage.getMatchTeams(matchId);
    const lightTeam = teams.find(t => t.name === 'LIGHT')!;
    const darkTeam = teams.find(t => t.name === 'DARK')!;

    // Delete old assignments
    await storage.deleteTeamAssignments(lightTeam.id);
    await storage.deleteTeamAssignments(darkTeam.id);

    // Create new assignments
    for (const playerId of light) {
      await storage.createTeamAssignment({ teamId: lightTeam.id, playerId });
    }
    for (const playerId of dark) {
      await storage.createTeamAssignment({ teamId: darkTeam.id, playerId });
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
