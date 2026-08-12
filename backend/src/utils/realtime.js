let WebSocket = null;
try {
  WebSocket = require('ws');
} catch (err) {
  console.warn('Realtime: ws package unavailable, realtime WebSocket support disabled');
}
const pool = require('../config/db');
const { getAssignmentForRouteAndPeriod } = require('../services/vehicleRouteAssignment.service');

let wss = null;
let pubClient = null;
let subClient = null;

// In-memory fallback for Redis-like interface
const createInMemoryPubSub = () => {
  const channels = new Map();
  const store = new Map();

  return {
    async connect() { return; },
    duplicate() { return this; },
    async subscribe(channel, listener) {
      if (!channels.has(channel)) channels.set(channel, new Set());
      channels.get(channel).add(listener);
      return;
    },
    async publish(channel, message) {
      const listeners = channels.get(channel);
      if (!listeners) return 0;
      for (const l of listeners) {
        try { await l(message); } catch (e) { console.warn('In-memory pubsub listener error', e); }
      }
      return listeners.size;
    },
    async set(key, value, opts) {
      store.set(key, value);
      if (opts && opts.EX) {
        setTimeout(() => store.delete(key), opts.EX * 1000).unref?.();
      }
      return 'OK';
    },
    async get(key) { return store.has(key) ? store.get(key) : null; },
  };
};

const broadcastToClients = async (payload) => {
  if (!wss) return;
  for (const client of wss.clients) {
    try {
      if (client.readyState !== WebSocket.OPEN) continue;
      const user = client.user;
      if (!user) continue;

      if (user.role === 'Admin' || user.role === 'Transport Manager') {
        client.send(JSON.stringify({ type: 'attendance_marked', data: payload }));
        continue;
      }

      if (user.role === 'Driver' || user.role === 'Assistant') {
        const tripId = payload.tripId;
        if (!tripId) continue;
        try {
          const [rows] = await pool.query('SELECT route_id, departure_time FROM trip_monitoring WHERE id = ? LIMIT 1', [tripId]);
          if ((rows || []).length !== 1) continue;
          const trip = rows[0];
          const tripDate = new Date(trip.departure_time).toISOString().slice(0,10);
          const hours = new Date(trip.departure_time).getHours();
          const timePeriod = hours < 12 ? 'Morning' : 'Evening';
          const assignment = await getAssignmentForRouteAndPeriod({ routeId: trip.route_id, timePeriod, date: tripDate });
          if (!assignment) continue;
          const actorId = Number(user.id);
          if (actorId === Number(assignment.driverUserId) || actorId === Number(assignment.assistantUserId)) {
            client.send(JSON.stringify({ type: 'attendance_marked', data: payload }));
          }
        } catch (err) {
          console.warn('Realtime: failed to authorize driver/assistant for event', err);
        }
      }
    } catch (err) {
      // Ignore per-client errors
    }
  }
};

const initRealtime = async (server) => {
  if (!WebSocket) {
    console.warn('Realtime: WebSocket package is unavailable, realtime support disabled');
    return;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  // Try to use redis if available; otherwise fall back to in-memory pubsub
  try {
    const redis = require('redis');
    pubClient = redis.createClient({ url: redisUrl });
    await pubClient.connect();
    subClient = pubClient.duplicate();
    await subClient.connect();
    console.log('✅ Realtime: connected to Redis at', redisUrl);
  } catch (err) {
    console.warn('Realtime: redis client unavailable, using in-memory fallback:', err?.message || err);
    const mem = createInMemoryPubSub();
    pubClient = mem;
    subClient = mem;
  }

  wss = new WebSocket.Server({ server, path: '/ws' });

  // Broadcast messages received on Redis (or in-memory) channel to connected WS clients
  await subClient.subscribe('attendance_marked', async (message) => {
    let payload = null;
    try {
      payload = typeof message === 'string' ? JSON.parse(message) : message;
    } catch (err) {
      payload = message;
    }

    await broadcastToClients(payload);
  });

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Authentication token required');
        return;
      }
      const { verifyAccessToken } = require('./token');
      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch (err) {
        ws.close(4002, 'Invalid token');
        return;
      }

      const allowedRoles = ['Admin', 'Transport Manager', 'Driver', 'Assistant', 'Bus Assistant'];
      if (!payload || !payload.role || !allowedRoles.includes(payload.role)) {
        try { console.warn(`WS connection rejected for userId=${payload?.sub || 'unknown'} role=${payload?.role}`); } catch (e) {}
        ws.close(4003, 'Insufficient permissions for realtime connection');
        return;
      }

      ws.user = payload;
      ws.send(JSON.stringify({ type: 'connected', serverTime: new Date().toISOString() }));
    } catch (err) {
      ws.close(1011, 'Server error');
      return;
    }

    ws.on('message', (msg) => {
      try {
        const m = JSON.parse(msg);
        if (m && m.type === 'subscribe' && m.channel) {
          // currently no-op
        }
      } catch (err) {
        // ignore malformed messages
      }
    });
  });

  console.log('✅ Realtime: WebSocket server initialized at /ws (pubsub: ' + (pubClient ? 'ready' : 'none') + ')');
};

const publish = async (channel, payload) => {
  if (!pubClient) {
    console.warn('Realtime publish attempted before pubsub ready');
    return;
  }
  try {
    await pubClient.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.warn('Realtime publish failed', err);
  }
};

const setTripProgress = async (tripId, progress) => {
  if (!pubClient) {
    console.warn('Realtime.setTripProgress attempted before pubsub ready');
    return;
  }
  try {
    const key = `trip_progress:${tripId}`;
    await pubClient.set(key, JSON.stringify(progress), { EX: 60 * 60 * 24 });
  } catch (err) {
    console.warn('Realtime.setTripProgress failed', err);
  }
};

const getTripProgress = async (tripId) => {
  if (!pubClient) return null;
  try {
    const key = `trip_progress:${tripId}`;
    const raw = await pubClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Realtime.getTripProgress failed', err);
    return null;
  }
};

module.exports = { initRealtime, publish, setTripProgress, getTripProgress };
