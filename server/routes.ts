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
  user?: User; // For regular user authentication
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

  // User authentication middleware (for regular users)
  const userAuth = async (req: AuthRequest, res: any, next: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.user_token;
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    try {
      const payload: any = jwt.verify(token, JWT_SECRET);
      req.user = await storage.getUser(payload.userId);
      if (!req.user) {
        return res.status(401).json({ ok: false, error: 'User not found' });
      }
      // Enforce: only USER role can access user endpoints (prevent admin token reuse)
      if (req.user.role !== 'USER') {
        return res.status(403).json({ ok: false, error: 'User endpoints require USER role' });
      }
      next();
    } catch {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  };

  // Admin login (phone-based)
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { phone, password } = req.body;
      const normalized = normalizeE164(phone);
      
      let user = await storage.getUserByPhone(normalized);
      if (!user) {
        return res.status(401).json({ ok: false, error: 'Credenziali non valide' });
      }

      if (user.role !== 'ADMIN') {
        return res.status(403).json({ ok: false, error: 'Not an admin user' });
      }

      // Verify password if user has one
      if (user.password && user.password !== password) {
        return res.status(401).json({ ok: false, error: 'Credenziali non valide' });
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

  // User login (phone-based) - for regular users
  app.post('/api/user/login', async (req, res) => {
    try {
      const { phone, password } = req.body;
      const normalized = normalizeE164(phone);
      
      let user = await storage.getUserByPhone(normalized);
      if (!user) {
        return res.status(401).json({ ok: false, error: 'Credenziali non valide' });
      }

      // Enforce USER role only
      if (user.role !== 'USER') {
        return res.status(403).json({ ok: false, error: 'Not a regular user account' });
      }

      // Verify password if user has one
      if (user.password && user.password !== password) {
        return res.status(401).json({ ok: false, error: 'Credenziali non valide' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie('user_token', token, { 
        httpOnly: true, 
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });
      res.json({ ok: true, token, role: user.role });
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

      // Assign reserve team if status is RESERVE or NEXT (balance between LIGHT and DARK)
      let reserveTeam: 'LIGHT' | 'DARK' | undefined = undefined;
      const targetStatus = status || 'STARTER';
      
      if (targetStatus === 'RESERVE' || targetStatus === 'NEXT') {
        const signups = await storage.getMatchSignups(matchId);
        const lightCount = signups.filter(s => 
          (s.status === 'RESERVE' || s.status === 'NEXT') && s.reserveTeam === 'LIGHT'
        ).length;
        const darkCount = signups.filter(s => 
          (s.status === 'RESERVE' || s.status === 'NEXT') && s.reserveTeam === 'DARK'
        ).length;
        reserveTeam = lightCount <= darkCount ? 'LIGHT' : 'DARK';
      }

      await storage.createSignup({
        matchId,
        playerId: id,
        phone: player.phone || '',
        status: targetStatus,
        reserveTeam,
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

  // In-memory mutex for match-level signup operations (prevents race conditions)
  const matchLocks = new Map<string, Promise<void>>();
  
  async function withMatchLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
    // Wait for any existing operation on this match to complete
    while (matchLocks.has(matchId)) {
      await matchLocks.get(matchId);
    }
    
    // Create a new lock for this operation
    let resolve: () => void;
    const lock = new Promise<void>((r) => { resolve = r; });
    matchLocks.set(matchId, lock);
    
    try {
      // Execute the critical section
      return await fn();
    } finally {
      // Release the lock
      matchLocks.delete(matchId);
      resolve!();
    }
  }

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

      // Use mutex to prevent concurrent modifications
      const result = await withMatchLock(currentSignup.matchId, async () => {
        const oldStatus = currentSignup.status;
        const newStatus = status;
        
        // Get match and signups for validation
        const match = await storage.getMatch(currentSignup.matchId);
        if (!match) {
          throw new Error('Partita non trovata');
        }
        
        const cap = startersCap(match.sport);
        const signups = await storage.getMatchSignups(match.id);
        const currentStarters = signups.filter(s => s.status === 'STARTER').length;
        
        // Prevent adding starters beyond cap
        if (newStatus === 'STARTER' && oldStatus !== 'STARTER') {
          if (currentStarters >= cap) {
            throw new Error('Posti titolari esauriti. Non è possibile aggiungere altri titolari.');
          }
        }
        
        // Prevent removing the last starter (would cause generation failure)
        if (oldStatus === 'STARTER' && newStatus !== 'STARTER') {
          if (currentStarters <= 1) {
            throw new Error('Non è possibile rimuovere l\'ultimo titolare. La partita deve avere almeno 1 titolare.');
          }
        }
        
        // Update status (now protected by mutex)
        await storage.updateSignup(signupId, status as any);

        // Regenerate variants if starter status changed
        if (oldStatus !== newStatus && (oldStatus === 'STARTER' || newStatus === 'STARTER')) {
          await regenerateVariantsAndApplyV1(currentSignup.matchId);
          console.log(`[updateSignupStatus] Regenerated variants for match ${currentSignup.matchId} (status changed: ${oldStatus} → ${newStatus})`);
        }
        
        return { ok: true };
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ ok: false, error: error.message });
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

  // Check phone number status for invite
  app.post('/api/invite/:token/check-phone', async (req, res) => {
    try {
      const { token } = req.params;
      const { phone } = req.body;
      const normalized = normalizeE164(phone);

      const payload: any = jwt.verify(token, JWT_SECRET);
      const match = await storage.getMatch(payload.matchId);
      
      if (!match || match.status !== 'OPEN') {
        return res.status(410).json({ ok: false, error: 'Match not open' });
      }

      // Check if player exists
      const player = await storage.getPlayerByPhone(normalized);
      
      if (!player) {
        return res.json({ 
          ok: true, 
          playerExists: false,
          alreadyEnrolled: false,
        });
      }

      // Check if already enrolled in this match
      const signup = await storage.getSignup(match.id, player.id);
      
      if (signup) {
        return res.json({
          ok: true,
          playerExists: true,
          alreadyEnrolled: true,
          matchId: match.id,
          currentStatus: signup.status,
        });
      }

      return res.json({
        ok: true,
        playerExists: true,
        alreadyEnrolled: false,
        playerName: `${player.name} ${player.surname}`.trim(),
      });
    } catch (error: any) {
      res.status(401).json({ ok: false, error: 'Invalid invite' });
    }
  });

  // Public endpoint to change status (used from match view)
  app.patch('/api/matches/:id/change-status', async (req, res) => {
    try {
      const { id: matchId } = req.params;
      const { phone, status } = req.body;
      const normalized = normalizeE164(phone);

      // Get player
      const player = await storage.getPlayerByPhone(normalized);
      if (!player) {
        return res.status(404).json({ ok: false, error: 'Player not found' });
      }

      // Get signup
      const signup = await storage.getSignup(matchId, player.id);
      if (!signup) {
        return res.status(404).json({ ok: false, error: 'Not enrolled in this match' });
      }

      // Verify signup phone matches request phone (security check)
      if (signup.phone !== normalized) {
        return res.status(403).json({ ok: false, error: 'Cannot modify other users signup' });
      }

      const oldStatus = signup.status;

      // Update status
      await storage.updateSignup(signup.id, status);

      // LOGIC: If was STARTER and now RESERVE/NEXT → promote first RESERVE to STARTER
      if (oldStatus === 'STARTER' && (status === 'RESERVE' || status === 'NEXT')) {
        const allSignups = await storage.getMatchSignups(matchId);
        // Exclude the current user from promotion candidates
        const reserves = allSignups.filter(s => s.status === 'RESERVE' && s.id !== signup.id);
        
        if (reserves.length > 0) {
          // Promote first reserve to STARTER
          const firstReserve = reserves[0];
          await storage.updateSignup(firstReserve.id, 'STARTER');
        }

        // Regenerate variants after status change
        await regenerateVariantsAndApplyV1(matchId);
      }

      // If changing TO STARTER, regenerate variants
      if (status === 'STARTER') {
        await regenerateVariantsAndApplyV1(matchId);
      }

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
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
        // New player - name and surname are required
        if (!name || !surname) {
          return res.status(400).json({ ok: false, error: 'Nome e cognome richiesti per nuovi giocatori' });
        }
        
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
        // Existing player - update name/surname only if provided
        if (name && surname) {
          await storage.updatePlayer(player.id, { name, surname });
        }
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

  // Get user's matches (only matches where user is enrolled)
  app.get('/api/user/matches', userAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const userWithPlayer = await storage.getUserByPhone(req.user!.phone);
      
      if (!userWithPlayer) {
        return res.json({ ok: true, matches: [] });
      }

      // Get player associated with this user
      const players = await storage.getAllPlayers();
      const player = players.find(p => p.phone === userWithPlayer.phone);
      
      if (!player) {
        return res.json({ ok: true, matches: [] });
      }

      // Get all matches and find ones where this player is enrolled
      const allMatches = await storage.getAllMatches();
      const matchesWithStatus = await Promise.all(
        allMatches.map(async (match) => {
          const signup = await storage.getSignup(match.id, player.id);
          if (!signup) return null;
          return {
            ...match,
            myStatus: signup.status,
            signupId: signup.id,
          };
        })
      );

      const matches = matchesWithStatus.filter(m => m !== null);

      res.json({ ok: true, matches });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Change user's own status in a match
  app.patch('/api/user/matches/:id/status', userAuth, async (req: AuthRequest, res) => {
    try {
      const { id: matchId } = req.params;
      const { status } = req.body; // New status: STARTER, RESERVE, or NEXT
      
      // SECURITY: Verify the authenticated user owns this data
      const userWithPlayer = await storage.getUserByPhone(req.user!.phone);
      if (!userWithPlayer) {
        return res.status(404).json({ ok: false, error: 'User not found' });
      }

      // Verify user ID matches authenticated user
      if (userWithPlayer.id !== req.user!.id) {
        return res.status(403).json({ ok: false, error: 'Cannot modify other users data' });
      }

      // Get player
      const players = await storage.getAllPlayers();
      const player = players.find(p => p.phone === userWithPlayer.phone);
      if (!player) {
        return res.status(404).json({ ok: false, error: 'Player not found' });
      }

      // Get signup - MUST belong to this user's player
      const signup = await storage.getSignup(matchId, player.id);
      if (!signup) {
        return res.status(404).json({ ok: false, error: 'Not enrolled in this match' });
      }

      // Additional security check: verify signup phone matches authenticated user
      if (signup.phone !== req.user!.phone) {
        return res.status(403).json({ ok: false, error: 'Cannot modify other users signup' });
      }

      const oldStatus = signup.status;

      // Update status
      await storage.updateSignup(signup.id, status);

      // LOGIC: If was STARTER and now RESERVE/NEXT → promote first RESERVE to STARTER
      if (oldStatus === 'STARTER' && (status === 'RESERVE' || status === 'NEXT')) {
        console.log(`[USER STATUS CHANGE] ${player.name} changed from STARTER to ${status} - checking for reserves to promote`);
        
        const allSignups = await storage.getMatchSignups(matchId);
        // Exclude the current user from promotion candidates (they just changed to RESERVE/NEXT)
        const reserves = allSignups.filter(s => s.status === 'RESERVE' && s.id !== signup.id);
        
        if (reserves.length > 0) {
          // Promote first reserve to STARTER
          const firstReserve = reserves[0];
          await storage.updateSignup(firstReserve.id, 'STARTER');
          console.log(`[USER STATUS CHANGE] Promoted ${firstReserve.playerId} from RESERVE to STARTER`);
        }

        // Regenerate variants after status change
        await regenerateVariantsAndApplyV1(matchId);
      }

      // If changing TO STARTER, regenerate variants
      if (status === 'STARTER') {
        await regenerateVariantsAndApplyV1(matchId);
      }

      res.json({ ok: true, message: 'Status updated successfully' });
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
      // Check if there are any starters before generating variants
      const signups = await storage.getMatchSignups(matchId);
      const starters = signups.filter(s => s.status === 'STARTER');
      
      if (starters.length === 0) {
        console.log(`[regenerateVariantsAndApplyV1] No starters yet for match ${matchId}, skipping variant generation`);
        return;
      }
      
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
