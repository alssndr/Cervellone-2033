import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { normalizeE164, startersCap, type Sport, type User } from "@shared/schema";
import { balanceGreedyLocal, type RatedPlayer } from "./services/balance";
import { buildPublicMatchView } from "./services/matchView";
import { generateLineupVariants, applyLineupVersion, getLineupVariants, saveManualVariant } from "./services/lineup";
import { setupWebSocket, broadcastPlayerRegistered, broadcastVariantsRegenerated } from "./services/websocket";
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
      res.cookie('admin_token', token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });
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

  // Generate lineup variants (admin)
  app.post('/api/admin/matches/:id/generate-lineups', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const versionIds = await generateLineupVariants(id);
      
      // Auto-apply v1 (first variant, most balanced)
      if (versionIds.length > 0) {
        await applyLineupVersion(versionIds[0]);
      }
      
      res.json({ ok: true, versionIds, count: versionIds.length });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get lineup variants (admin)
  app.get('/api/admin/matches/:id/lineups', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const variants = await getLineupVariants(id);
      res.json({ ok: true, variants });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Apply lineup variant (admin)
  app.post('/api/admin/matches/:id/apply-lineup', adminAuth, async (req, res) => {
    try {
      const { lineupVersionId } = req.body;
      await applyLineupVersion(lineupVersionId);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Save manual v4 variant (admin)
  app.post('/api/admin/matches/:id/save-manual-variant', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { lightIds, darkIds } = req.body;
      
      const result = await saveManualVariant(id, lightIds, darkIds);
      
      // Auto-apply the created v4 variant
      await applyLineupVersion(result.id);
      
      res.json({ ok: true, variantId: result.id, meanDelta: result.meanDelta });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get all players with suggested ratings (admin)
  app.get('/api/admin/players', adminAuth, async (req, res) => {
    try {
      const players = await storage.getAllPlayers();
      const playersWithDetails = await Promise.all(
        players.map(async (player) => {
          const ratings = await storage.getPlayerRatings(player.id);
          const suggestedRatingsLogs = await storage.getAuditLogs('Player', player.id);
          const latestSuggestion = suggestedRatingsLogs.find(log => log.action === 'RATING_SUGGEST');
          
          return {
            ...player,
            currentRatings: ratings,
            suggestedRatings: latestSuggestion?.payload || null,
            hasSuggestion: !!latestSuggestion,
          };
        })
      );
      res.json({ ok: true, players: playersWithDetails });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Approve/update player ratings (admin)
  app.post('/api/admin/players/:id/approve-ratings', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { ratings } = req.body;
      await storage.updatePlayerRatings(id, ratings);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Add player to match manually (admin)
  app.post('/api/admin/players/:id/add-to-match', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { matchId, status } = req.body;
      
      const player = await storage.getPlayer(id);
      if (!player) {
        return res.status(404).json({ ok: false, error: 'Giocatore non trovato' });
      }

      // Validate match exists and is OPEN
      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ ok: false, error: 'Partita non trovata' });
      }
      if (match.status !== 'OPEN') {
        return res.status(400).json({ ok: false, error: 'La partita non è aperta alle iscrizioni' });
      }

      // Check for duplicate signup
      const existingSignup = await storage.getSignup(matchId, id);
      if (existingSignup) {
        return res.status(400).json({ ok: false, error: 'Il giocatore è già iscritto a questa partita' });
      }

      await storage.createSignup({
        matchId,
        playerId: id,
        phone: player.phone || '',
        status: status || 'STARTER',
      });

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Get match signups with player details (admin)
  app.get('/api/admin/matches/:id/signups', adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const signups = await storage.getMatchSignups(id);
      
      const signupsWithPlayers = await Promise.all(
        signups.map(async (signup) => {
          const player = await storage.getPlayer(signup.playerId);
          const ratings = await storage.getPlayerRatings(signup.playerId);
          return {
            signupId: signup.id,
            playerId: signup.playerId,
            status: signup.status,
            reserveTeam: signup.reserveTeam,
            player: player ? {
              id: player.id,
              name: player.name,
              surname: player.surname,
              phone: player.phone,
            } : null,
            ratings,
          };
        })
      );

      res.json({ ok: true, signups: signupsWithPlayers });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Update player signup status (admin)
  app.patch('/api/admin/signups/:signupId/status', adminAuth, async (req, res) => {
    try {
      const { signupId } = req.params;
      const { status } = req.body;
      
      if (!['STARTER', 'RESERVE', 'NEXT'].includes(status)) {
        return res.status(400).json({ ok: false, error: 'Stato non valido' });
      }

      // Get signup to check current status and matchId
      const currentSignup = await storage.getSignupById(signupId);
      
      if (!currentSignup) {
        return res.status(404).json({ ok: false, error: 'Signup non trovato' });
      }

      const oldStatus = currentSignup.status;
      const newStatus = status;
      
      // Update status
      await storage.updateSignup(signupId, status as any);

      // Regenerate variants if starter status changed
      if (oldStatus !== newStatus && (oldStatus === 'STARTER' || newStatus === 'STARTER')) {
        await regenerateVariantsAndApplyV1(currentSignup.matchId);
        console.log(`[updateSignupStatus] Regenerated variants for match ${currentSignup.matchId} (status changed: ${oldStatus} → ${newStatus})`);
      }
      
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Create player manually (admin)
  app.post('/api/admin/players', adminAuth, async (req, res) => {
    try {
      const { name, surname, phone, ratings } = req.body;
      
      // Create user if phone provided
      let userId: string | undefined = undefined;
      if (phone) {
        const normalized = normalizeE164(phone);
        let user = await storage.getUserByPhone(normalized);
        if (!user) {
          user = await storage.createUser({
            phone: normalized,
            name,
            surname,
            role: 'USER',
          });
        }
        userId = user.id;
      }

      // Create player
      const player = await storage.createPlayer({
        userId,
        name,
        surname,
        phone: phone ? normalizeE164(phone) : '',
      });

      // Create ratings
      await storage.createPlayerRatings({
        playerId: player.id,
        defense: ratings?.defense || 3,
        attack: ratings?.attack || 3,
        speed: ratings?.speed || 3,
        power: ratings?.power || 3,
        technique: ratings?.technique || 3,
        shot: ratings?.shot || 3,
      });

      res.json({ ok: true, player });
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
      const { phone, name, surname, choice, suggestedRatings } = req.body;
      const normalized = normalizeE164(phone);

      const payload: any = jwt.verify(token, JWT_SECRET);
      const match = await storage.getMatch(payload.matchId);
      
      if (!match || match.status !== 'OPEN') {
        return res.status(410).json({ ok: false, error: 'Match not open' });
      }

      // Get or create player
      let player = await storage.getPlayerByPhone(normalized);
      let isNewPlayer = false;
      
      if (!player) {
        isNewPlayer = true;
        let user = await storage.getUserByPhone(normalized);
        if (!user) {
          user = await storage.createUser({ 
            phone: normalized, 
            role: 'USER',
            name,
            surname,
          });
        }
        player = await storage.createPlayer({
          userId: user.id,
          name,
          surname,
          phone: normalized,
        });
      } else {
        // Update player name/surname if provided
        await storage.updatePlayer(player.id, { name, surname });
      }

      // Handle suggested ratings
      if (suggestedRatings) {
        // Log suggested ratings to audit
        await storage.createAuditLog({
          actorUserId: player.userId,
          action: 'RATING_SUGGEST',
          entity: 'Player',
          entityId: player.id,
          payload: suggestedRatings,
        });

        // If new player or no ratings exist, use suggested ratings
        const existingRatings = await storage.getPlayerRatings(player.id);
        if (!existingRatings) {
          await storage.createPlayerRatings({
            playerId: player.id,
            ...suggestedRatings,
          });
        }
      } else {
        // Create default ratings if none exist
        const existingRatings = await storage.getPlayerRatings(player.id);
        if (!existingRatings) {
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

      // Regenerate variants if new starter
      if (status === 'STARTER') {
        await regenerateVariantsAndApplyV1(match.id);
      }

      // Broadcast player registration
      broadcastPlayerRegistered(match.id, `${player.name} ${player.surname}`);

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
      
      // DEBUG: Log data before building view
      const teams = await storage.getMatchTeams(id);
      const assignments = await storage.getMatchAssignments(id);
      const signups = await storage.getMatchSignups(id);
      console.log(`[PUBLIC VIEW] Match ${id}: ${teams.length} teams, ${assignments.length} team assignments, ${signups.length} signups`);
      
      const view = await buildPublicMatchView(id, phone as string || '');
      console.log(`[PUBLIC VIEW] Result: ${view.starters.light.length} light + ${view.starters.dark.length} dark starters`);
      
      res.json({ ok: true, view });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Helper function to regenerate variants and apply v1
  async function regenerateVariantsAndApplyV1(matchId: string) {
    try {
      const versionIds = await generateLineupVariants(matchId);
      
      // Auto-apply v1 (first variant, most balanced)
      if (versionIds.length > 0) {
        await applyLineupVersion(versionIds[0]);
        console.log(`[regenerateVariantsAndApplyV1] Generated ${versionIds.length} variants and applied v1 for match ${matchId}`);
        
        // Broadcast variants regenerated
        broadcastVariantsRegenerated(matchId);
      }
    } catch (error) {
      console.error(`[regenerateVariantsAndApplyV1] Error:`, error);
    }
  }

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}
