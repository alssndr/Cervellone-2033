import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;

export function setupWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/matches' // Use specific path to avoid conflict with Vite HMR WebSocket
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] New client connected');

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  });

  console.log('[WebSocket] Server initialized on path /ws/matches');
  return wss;
}

export function broadcastPlayerRegistered(matchId: string, playerName: string) {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast - server not initialized');
    return;
  }

  const message = JSON.stringify({
    type: 'PLAYER_REGISTERED',
    matchId,
    playerName,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`[WebSocket] Broadcasted PLAYER_REGISTERED: ${playerName} for match ${matchId}`);
}

export function broadcastVariantsRegenerated(matchId: string) {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast - server not initialized');
    return;
  }

  const message = JSON.stringify({
    type: 'VARIANTS_REGENERATED',
    matchId,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  console.log(`[WebSocket] Broadcasted VARIANTS_REGENERATED for match ${matchId}`);
}
