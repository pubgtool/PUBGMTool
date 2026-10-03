import { createHmac, createHash, randomInt, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const NUMBER_PATTERN = /^\d{8}$/;
const CALL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAYLOAD = 64 * 1024;

function splitUrls(value) {
  return value.split(',').map((url) => url.trim()).filter(Boolean);
}

function buildIceConfig(env) {
  const stunUrls = splitUrls(env.STUN_URLS ?? 'stun:stun.l.google.com:19302');
  const turnUrls = splitUrls(env.TURN_URLS ?? '');
  const turnSecret = env.TURN_SECRET || '';
  const turnUsername = env.TURN_USERNAME || '';
  const turnPassword = env.TURN_PASSWORD || '';
  const relayOnly = env.RELAY_ONLY === 'true';

  if ([...stunUrls, ...turnUrls].some((url) => !/^(stun|stuns|turn|turns):\S+$/i.test(url))) {
    throw new Error('ICE URLs must use stun:, stuns:, turn:, or turns: schemes');
  }
  if (Boolean(turnUsername) !== Boolean(turnPassword)) {
    throw new Error('TURN_USERNAME and TURN_PASSWORD must be configured together');
  }
  if (turnSecret && !turnUrls.length) {
    throw new Error('TURN_URLS is required when TURN_SECRET is configured');
  }
  if (turnUrls.length && !turnSecret && !turnUsername) {
    throw new Error('TURN_SECRET or static TURN credentials are required when TURN_URLS is configured');
  }
  if (relayOnly && (!turnUrls.length || (!turnSecret && !turnUsername))) {
    throw new Error('RELAY_ONLY requires TURN_URLS and TURN_SECRET or static TURN credentials');
  }

  const turnCredentialTtlSeconds = Number(env.TURN_CREDENTIAL_TTL_SECONDS ?? 86400);
  if (!Number.isSafeInteger(turnCredentialTtlSeconds) || turnCredentialTtlSeconds < 60 || turnCredentialTtlSeconds > 604800) {
    throw new Error('TURN_CREDENTIAL_TTL_SECONDS must be an integer from 60 through 604800');
  }

  function iceServers(number) {
    const servers = [];
    if (!relayOnly && stunUrls.length) servers.push({ urls: stunUrls });
    if (turnUrls.length) {
      if (turnSecret) {
        const username = `${Math.floor(Date.now() / 1000) + turnCredentialTtlSeconds}:${number}`;
        const credential = createHmac('sha1', turnSecret).update(username).digest('base64');
        servers.push({ urls: turnUrls, username, credential });
      } else if (turnUsername) {
        servers.push({ urls: turnUrls, username: turnUsername, credential: turnPassword });
      }
    }
    return servers;
  }

  return { iceServers, relayOnly };
}

async function loadIdentities(dataFile, maxIdentities) {
  let text;
  try {
    text = await readFile(dataFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }

  let document;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error(`Identity store is not valid JSON: ${dataFile}`);
  }
  if (document?.version !== 1 || !document.identities || typeof document.identities !== 'object' || Array.isArray(document.identities)) {
    throw new Error(`Identity store has an unsupported format: ${dataFile}`);
  }

  const identities = new Map();
  const numbers = new Set();
  for (const [hash, number] of Object.entries(document.identities)) {
    if (!/^[a-f0-9]{64}$/.test(hash) || !NUMBER_PATTERN.test(number) || numbers.has(number)) {
      throw new Error(`Identity store contains invalid or duplicate identities: ${dataFile}`);
    }
    identities.set(hash, number);
    numbers.add(number);
  }
  if (identities.size > maxIdentities) throw new Error('Identity store exceeds MAX_IDENTITIES');
  return identities;
}

async function saveIdentities(dataFile, identities) {
  await mkdir(dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  const data = `${JSON.stringify({ version: 1, identities: Object.fromEntries(identities) }, null, 2)}\n`;
  try {
    await writeFile(temporaryFile, data, { mode: 0o600, flag: 'wx' });
    await rename(temporaryFile, dataFile);
  } catch (error) {
    const { unlink } = await import('node:fs/promises');
    await unlink(temporaryFile).catch(() => {});
    throw error;
  }
}

function consumeRateLimit(map, key, { limit, windowMs, now = Date.now() }) {
  let bucket = map.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 };
    map.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export async function createSignalingServer(options = {}) {
  const env = options.env ?? process.env;
  const defaultDataFile = fileURLToPath(new URL('../data/identities.json', import.meta.url));
  const dataFile = resolve(options.dataFile ?? env.DATA_FILE ?? defaultDataFile);
  const maxIdentities = options.maxIdentities ?? 100_000;
  const maxConnections = options.maxConnections ?? 1_000;
  const maxRegistrationsPerIp = options.maxRegistrationsPerIp ?? 30;
  const registrationWindowMs = options.registrationWindowMs ?? 60_000;
  const maxMessagesPerSecond = options.maxMessagesPerSecond ?? 40;
  const maxRateLimitEntries = options.maxRateLimitEntries ?? 10_000;
  const registrationTimeoutMs = options.registrationTimeoutMs ?? 10_000;
  const ringingTimeoutMs = options.ringingTimeoutMs ?? 45_000;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
  const { iceServers, relayOnly } = buildIceConfig(env);
  const identities = await loadIdentities(dataFile, maxIdentities);
  const sessions = new Map();
  const calls = new Map();
  const registrationRates = new Map();
  let registrationQueue = Promise.resolve();

  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && (request.url === '/health' || request.url === '/')) {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD, perMessageDeflate: false });
  const timers = new WeakMap();

  function error(socket, code) {
    send(socket, { type: 'error', code });
  }

  function endCall(call, reason) {
    if (!calls.has(call.id)) return;
    calls.delete(call.id);
    clearTimeout(call.timer);
    const message = { type: 'ended', callId: call.id, reason };
    send(call.caller.socket, message);
    send(call.callee.socket, message);
  }

  function findCallBySession(session) {
    for (const call of calls.values()) {
      if (call.caller === session || call.callee === session) return call;
    }
    return undefined;
  }

  function cleanupSession(session) {
    if (!session || session.closed) return;
    session.closed = true;
    if (sessions.get(session.number) === session) sessions.delete(session.number);
    for (const call of calls.values()) {
      if (call.caller === session || call.callee === session) endCall(call, 'disconnected');
    }
  }

  async function register(session, token) {
    if (session.socket.readyState !== WebSocket.OPEN) return;
    if (session.number) return error(session.socket, 'already_registered');
    const ip = session.ip;
    if (!registrationRates.has(ip) && registrationRates.size >= maxRateLimitEntries) {
      const now = Date.now();
      for (const [key, bucket] of registrationRates) {
        if (now - bucket.start >= registrationWindowMs) registrationRates.delete(key);
        if (registrationRates.size < maxRateLimitEntries) break;
      }
      if (registrationRates.size >= maxRateLimitEntries) return error(session.socket, 'rate_limited');
    }
    if (!consumeRateLimit(registrationRates, ip, { limit: maxRegistrationsPerIp, windowMs: registrationWindowMs })) {
      return error(session.socket, 'rate_limited');
    }
    if (!TOKEN_PATTERN.test(token)) return error(session.socket, 'invalid_token');

    const hash = createHash('sha256').update(token, 'utf8').digest('hex');
    let number = identities.get(hash);
    if (!number) {
      if (identities.size >= maxIdentities) return error(session.socket, 'capacity');
      const usedNumbers = new Set(identities.values());
      for (let attempt = 0; attempt < 1_000; attempt += 1) {
        const candidate = String(randomInt(100_000_000)).padStart(8, '0');
        if (!usedNumbers.has(candidate)) {
          number = candidate;
          break;
        }
      }
      if (!number) return error(session.socket, 'capacity');
      identities.set(hash, number);
      try {
        await saveIdentities(dataFile, identities);
      } catch {
        identities.delete(hash);
        return error(session.socket, 'storage_unavailable');
      }
    }

    if (session.socket.readyState !== WebSocket.OPEN) return;
    const previous = sessions.get(number);
    if (previous) {
      error(previous.socket, 'replaced');
      previous.socket.close(4001, 'replaced');
      cleanupSession(previous);
    }

    session.number = number;
    sessions.set(number, session);
    clearTimeout(timers.get(session));
    send(session.socket, { type: 'registered', number, iceServers: iceServers(number), relayOnly });
  }

  function validDescription(description) {
    return description && typeof description === 'object' && !Array.isArray(description)
      && hasOnlyKeys(description, ['type', 'sdp'])
      && ['offer', 'answer'].includes(description.type)
      && typeof description.sdp === 'string'
      && description.sdp.length > 0
      && Buffer.byteLength(description.sdp, 'utf8') <= 60 * 1024;
  }

  function validCandidate(candidate) {
    return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      && hasOnlyKeys(candidate, ['sdpMid', 'sdpMLineIndex', 'candidate'])
      && typeof candidate.candidate === 'string'
      && candidate.candidate.length > 0
      && candidate.candidate.length <= 8_192
      && (candidate.sdpMid === null || typeof candidate.sdpMid === 'string' && candidate.sdpMid.length <= 256)
      && (candidate.sdpMLineIndex === null || Number.isInteger(candidate.sdpMLineIndex) && candidate.sdpMLineIndex >= 0 && candidate.sdpMLineIndex <= 65_535);
  }

  function handleMessage(session, message) {
    if (!session.number) {
      if (message.type !== 'register' || !hasOnlyKeys(message, ['type', 'token']) || typeof message.token !== 'string') return error(session.socket, 'registration_required');
      registrationQueue = registrationQueue.then(() => register(session, message.token)).catch(() => error(session.socket, 'internal_error'));
      return;
    }

    if (message.type === 'register') return error(session.socket, 'already_registered');

    if (message.type === 'call') {
      if (!hasOnlyKeys(message, ['type', 'to']) || typeof message.to !== 'string' || !NUMBER_PATTERN.test(message.to)) return error(session.socket, 'invalid_message');
      if (message.to === session.number) return error(session.socket, 'self');
      const peer = sessions.get(message.to);
      if (!peer || peer.socket.readyState !== WebSocket.OPEN) return error(session.socket, 'offline');
      if (findCallBySession(session) || findCallBySession(peer)) return error(session.socket, 'busy');

      const call = { id: randomUUID(), caller: session, callee: peer, state: 'ringing', timer: undefined };
      call.timer = setTimeout(() => endCall(call, 'timeout'), ringingTimeoutMs);
      call.timer.unref?.();
      calls.set(call.id, call);
      send(session.socket, { type: 'ringing', callId: call.id, peer: peer.number });
      send(peer.socket, { type: 'incoming', callId: call.id, peer: session.number });
      return;
    }

    if (message.type === 'accept' || message.type === 'reject' || message.type === 'hangup' || message.type === 'signal') {
      const keys = message.type === 'signal' ? ['type', 'callId', 'description', 'candidate'] : ['type', 'callId'];
      if (!hasOnlyKeys(message, keys)) return error(session.socket, 'invalid_message');
      if (typeof message.callId !== 'string' || !CALL_ID_PATTERN.test(message.callId)) return error(session.socket, 'invalid_message');
      const call = calls.get(message.callId);
      if (!call) return error(session.socket, 'not_found');
      if (call.caller !== session && call.callee !== session) return error(session.socket, 'unauthorized');

      if (message.type === 'accept') {
        if (call.callee !== session) return error(session.socket, 'unauthorized');
        if (call.state !== 'ringing') return error(session.socket, 'invalid_state');
        call.state = 'accepted';
        clearTimeout(call.timer);
        const accepted = { type: 'accepted', callId: call.id };
        send(call.caller.socket, accepted);
        send(call.callee.socket, accepted);
        return;
      }

      if (message.type === 'reject') {
        if (call.callee !== session) return error(session.socket, 'unauthorized');
        endCall(call, 'rejected');
        return;
      }

      if (message.type === 'hangup') {
        endCall(call, 'hangup');
        return;
      }

      if (call.state !== 'accepted') return error(session.socket, 'not_accepted');
      const hasDescription = Object.hasOwn(message, 'description');
      const hasCandidate = Object.hasOwn(message, 'candidate');
      if (hasDescription === hasCandidate || hasDescription && !validDescription(message.description) || hasCandidate && !validCandidate(message.candidate)) {
        return error(session.socket, 'invalid_message');
      }
      const forwarded = { type: 'signal', callId: call.id };
      if (hasDescription) forwarded.description = message.description;
      else forwarded.candidate = message.candidate;
      send(call.caller === session ? call.callee.socket : call.caller.socket, forwarded);
      return;
    }

    error(session.socket, 'invalid_message');
  }

  httpServer.on('upgrade', (request, socket, head) => {
    let path;
    try {
      path = new URL(request.url, 'http://localhost').pathname;
    } catch {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    if (path !== '/signal') {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    if (wss.clients.size >= maxConnections) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (webSocket) => wss.emit('connection', webSocket, request));
  });

  wss.on('connection', (socket, request) => {
    const session = { socket, ip: request.socket.remoteAddress ?? 'unknown', number: undefined, closed: false, rateLimited: false, messageWindow: 0, messageCount: 0 };
    const registrationTimer = setTimeout(() => {
      if (!session.number) {
        error(socket, 'registration_timeout');
        socket.close(4002, 'registration timeout');
      }
    }, registrationTimeoutMs);
    registrationTimer.unref?.();
    timers.set(session, registrationTimer);

    socket.on('pong', () => { session.alive = true; });
    socket.on('message', (data, isBinary) => {
      if (session.rateLimited) return;
      if (isBinary) return error(socket, 'invalid_message');
      const now = Date.now();
      if (now - session.messageWindow >= 1_000) {
        session.messageWindow = now;
        session.messageCount = 0;
      }
      session.messageCount += 1;
      if (session.messageCount > maxMessagesPerSecond) {
        session.rateLimited = true;
        error(socket, 'rate_limited');
        socket.close(4003, 'rate limited');
        return;
      }

      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return error(socket, 'malformed_json');
      }
      if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string') {
        return error(socket, 'invalid_message');
      }
      handleMessage(session, message);
    });
    socket.on('close', () => {
      clearTimeout(timers.get(session));
      cleanupSession(session);
    });
    socket.on('error', () => {});
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      const session = [...sessions.values()].find((candidate) => candidate.socket === socket);
      if (session && session.alive === false) {
        socket.terminate();
        continue;
      }
      if (session) session.alive = false;
      socket.ping();
    }
  }, heartbeatIntervalMs);
  heartbeat.unref?.();

  return {
    httpServer,
    wss,
    async listen(port = options.port ?? 3000, host = options.host ?? '0.0.0.0') {
      await new Promise((resolveListen, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, host, () => {
          httpServer.off('error', reject);
          resolveListen();
        });
      });
      return httpServer.address();
    },
    async close() {
      clearInterval(heartbeat);
      for (const call of calls.values()) endCall(call, 'disconnected');
      for (const socket of wss.clients) socket.terminate();
      await new Promise((resolveClose) => {
        if (!httpServer.listening) return resolveClose();
        httpServer.close(() => resolveClose());
      });
      await new Promise((resolveWss) => wss.close(() => resolveWss()));
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const server = await createSignalingServer();
  const address = await server.listen();
  process.stdout.write(`Signaling server listening on ${typeof address === 'string' ? address : `${address.address}:${address.port}`}\n`);
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
