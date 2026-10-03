import { createHash, randomInt, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { WebSocket, WebSocketServer } from 'ws';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const NUMBER_PATTERN = /^\d{8}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAYLOAD = 64 * 1024;
const MAX_ENVELOPE_BYTES = 24 * 1024;
const MAX_BUFFERED_BYTES = 512 * 1024;
const MAX_PRE_KEYS = 1_000;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validBase64(value, maxBytes) {
  if (typeof value !== 'string' || value.length === 0 || value.length > Math.ceil(maxBytes / 3) * 4) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length > 0 && bytes.length <= maxBytes && bytes.toString('base64') === value;
}

function validKeyId(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 0x7fffffff;
}

function validateBundle(bundle) {
  if (!isObject(bundle) || !hasOnlyKeys(bundle, ['identityKey', 'registrationId', 'signedPreKey', 'kyberPreKey', 'preKeys'])) return undefined;
  if (!validBase64(bundle.identityKey, 256)) return undefined;
  if (!Number.isSafeInteger(bundle.registrationId) || bundle.registrationId < 0 || bundle.registrationId > 0x7fffffff) return undefined;

  for (const keyName of ['signedPreKey', 'kyberPreKey']) {
    const key = bundle[keyName];
    if (!isObject(key) || !hasOnlyKeys(key, ['id', 'publicKey', 'signature'])
      || !validKeyId(key.id) || !validBase64(key.publicKey, 4_096) || !validBase64(key.signature, 256)) return undefined;
  }

  if (!Array.isArray(bundle.preKeys) || bundle.preKeys.length > MAX_PRE_KEYS) return undefined;
  const ids = new Set();
  const preKeys = [];
  for (const key of bundle.preKeys) {
    if (!isObject(key) || !hasOnlyKeys(key, ['id', 'publicKey']) || !validKeyId(key.id)
      || !validBase64(key.publicKey, 4_096) || ids.has(key.id)) return undefined;
    ids.add(key.id);
    preKeys.push({ id: key.id, publicKey: key.publicKey });
  }

  return {
    identityKey: bundle.identityKey,
    registrationId: bundle.registrationId,
    signedPreKey: { ...bundle.signedPreKey },
    kyberPreKey: { ...bundle.kyberPreKey },
    preKeys: preKeys.sort((a, b) => a.id - b.id),
  };
}

function cloneEntry(entry) {
  return { number: entry.number, bundle: entry.bundle ? structuredClone(entry.bundle) : null, preKeyFloor: entry.preKeyFloor ?? -1 };
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
  if (![1, 2].includes(document?.version) || !isObject(document.identities)) {
    throw new Error(`Identity store has an unsupported format: ${dataFile}`);
  }

  const identities = new Map();
  const numbers = new Set();
  for (const [hash, stored] of Object.entries(document.identities)) {
    const legacy = document.version === 1;
    const number = legacy ? stored : stored?.number;
    const bundle = legacy ? null : stored?.bundle;
    if (!/^[a-f0-9]{64}$/.test(hash) || !NUMBER_PATTERN.test(number) || numbers.has(number)) {
      throw new Error(`Identity store contains invalid or duplicate identities: ${dataFile}`);
    }
    const publicBundle = bundle === null ? null : validateBundle(bundle);
    if (!legacy && bundle !== null && !publicBundle) {
      throw new Error(`Identity store contains an invalid public key bundle: ${dataFile}`);
    }
    const preKeyFloor = legacy ? -1 : (stored.preKeyFloor ?? -1);
    if (!Number.isSafeInteger(preKeyFloor) || preKeyFloor < -1) throw new Error('Invalid prekey counter');
    identities.set(hash, { number, bundle: publicBundle, preKeyFloor });
    numbers.add(number);
  }
  if (identities.size > maxIdentities) throw new Error('Identity store exceeds MAX_IDENTITIES');
  return identities;
}

async function saveIdentities(dataFile, identities) {
  await mkdir(dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  const data = `${JSON.stringify({
    version: 2,
    identities: Object.fromEntries([...identities].map(([hash, entry]) => [hash, cloneEntry(entry)])),
  }, null, 2)}\n`;

  try {
    const file = await open(temporaryFile, 'wx', 0o600);
    try {
      await file.writeFile(data, 'utf8');
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporaryFile, dataFile);
    try {
      const directory = await open(dirname(dataFile), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    } catch {
      // Some filesystems do not allow syncing directory handles.
    }
  } catch (error) {
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

function buildMediaConfig(env) {
  const value = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!value || !apiKey || !apiSecret) return undefined;

  try {
    const url = new URL(value);
    if (!['wss:', 'ws:'].includes(url.protocol) || !url.hostname || url.username || url.password
      || url.search || url.hash || url.pathname !== '/') return undefined;
    const mediaUrl = url.origin;
    const apiUrl = mediaUrl.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
    return { mediaUrl, apiUrl, apiKey, apiSecret };
  } catch {
    return undefined;
  }
}

function send(socket, message) {
  if (socket.readyState !== WebSocket.OPEN) return false;
  const data = JSON.stringify(message);
  if (socket.bufferedAmount + Buffer.byteLength(data) > MAX_BUFFERED_BYTES) {
    socket.close(4004, 'outgoing queue full');
    return false;
  }
  try {
    socket.send(data);
    return true;
  } catch {
    return false;
  }
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
  const maxPendingStoreOperations = options.maxPendingStoreOperations ?? 1_000;
  const maxDedupEntries = options.maxDedupEntries ?? 50_000;
  const dedupTtlMs = options.dedupTtlMs ?? 24 * 60 * 60 * 1_000;
  const registrationTimeoutMs = options.registrationTimeoutMs ?? 10_000;
  const ringingTimeoutMs = options.ringingTimeoutMs ?? 45_000;
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10_000;
  const identities = await loadIdentities(dataFile, maxIdentities);
  const numberOwners = new Map([...identities].map(([hash, entry]) => [entry.number, hash]));
  const sessions = new Map();
  const memberships = new Map();
  const calls = new Map();
  const registrationRates = new Map();
  const deliveredEnvelopes = new Map();
  const mediaConfig = buildMediaConfig(env);
  const tokenIssuer = options.tokenIssuer ?? (async ({ identity, room, apiKey, apiSecret }) => {
    const token = new AccessToken(apiKey, apiSecret, { identity, ttl: 120 });
    token.addGrant({
      roomJoin: true,
      room,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: false,
    });
    return token.toJwt();
  });
  let roomService;
  if (mediaConfig && !options.deleteRoom) {
    roomService = new RoomServiceClient(mediaConfig.apiUrl, mediaConfig.apiKey, mediaConfig.apiSecret);
  }
  const deleteRoom = options.deleteRoom ?? (roomService ? (room) => roomService.deleteRoom(room) : undefined);

  let storeQueue = Promise.resolve();
  let pendingStoreOperations = 0;
  const timers = new WeakMap();

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

  function error(socket, code, extra = {}) {
    send(socket, { type: 'error', code, ...extra });
  }

  function queueStoreOperation(session, operation, onFailure) {
    if (pendingStoreOperations >= maxPendingStoreOperations) {
      onFailure('rate_limited');
      return;
    }
    pendingStoreOperations += 1;
    const task = storeQueue.then(async () => {
      if (session.closed || session.socket.readyState !== WebSocket.OPEN) return;
      try {
        await operation();
      } catch {
        onFailure('storage_unavailable');
      }
    });
    storeQueue = task.finally(() => { pendingStoreOperations -= 1; });
  }

  function endCall(call, reason) {
    if (calls.get(call.id) !== call) return;
    calls.delete(call.id);
    clearTimeout(call.timer);
    for (const number of call.members) {
      if (memberships.get(number) === call.id) memberships.delete(number);
      const member = sessions.get(number);
      if (member) send(member.socket, { type: 'ended', callId: call.id, reason });
    }
    if (deleteRoom) Promise.resolve(deleteRoom(call.room)).catch(() => {});
  }

  function endCallForNumber(number, reason) {
    const callId = memberships.get(number);
    const call = callId && calls.get(callId);
    if (call) endCall(call, reason);
  }

  function cleanupSession(session) {
    if (!session || session.closed) return;
    session.closed = true;
    if (sessions.get(session.number) === session) sessions.delete(session.number);
    endCallForNumber(session.number, 'disconnected');
  }

  function takeRegistrationSlot(ip) {
    if (!registrationRates.has(ip) && registrationRates.size >= maxRateLimitEntries) {
      const now = Date.now();
      for (const [key, bucket] of registrationRates) {
        if (now - bucket.start >= registrationWindowMs) registrationRates.delete(key);
        if (registrationRates.size < maxRateLimitEntries) break;
      }
      if (registrationRates.size >= maxRateLimitEntries) return false;
    }
    return consumeRateLimit(registrationRates, ip, { limit: maxRegistrationsPerIp, windowMs: registrationWindowMs });
  }

  function replaceIdentities(next) {
    identities.clear();
    numberOwners.clear();
    for (const [hash, entry] of next) {
      identities.set(hash, entry);
      numberOwners.set(entry.number, hash);
    }
  }

  async function register(session, tokenValue, bundle) {
    if (session.number) return error(session.socket, 'already_registered');
    if (!takeRegistrationSlot(session.ip)) return error(session.socket, 'rate_limited');
    if (typeof tokenValue !== 'string' || !TOKEN_PATTERN.test(tokenValue)) return error(session.socket, 'invalid_token');
    const publicBundle = validateBundle(bundle);
    if (!publicBundle) return error(session.socket, 'invalid_bundle');

    const hash = createHash('sha256').update(tokenValue, 'utf8').digest('hex');
    const existing = identities.get(hash);
    if (existing?.bundle && existing.bundle.identityKey !== publicBundle.identityKey) {
      return error(session.socket, 'identity_mismatch');
    }
    if (!existing && identities.size >= maxIdentities) return error(session.socket, 'capacity');

    let number = existing?.number;
    if (!number) {
      const usedNumbers = new Set(numberOwners.keys());
      for (let attempt = 0; attempt < 1_000; attempt += 1) {
        const candidate = String(randomInt(100_000_000)).padStart(8, '0');
        if (!usedNumbers.has(candidate)) {
          number = candidate;
          break;
        }
      }
      if (!number) return error(session.socket, 'capacity');
    }

    const next = new Map(identities);
    const preKeyFloor = existing?.preKeyFloor ?? -1;
    publicBundle.preKeys = publicBundle.preKeys.filter((key) => key.id > preKeyFloor);
    next.set(hash, { number, bundle: publicBundle, preKeyFloor });
    await saveIdentities(dataFile, next);
    replaceIdentities(next);
    if (session.closed || session.socket.readyState !== WebSocket.OPEN) return;

    const previous = sessions.get(number);
    if (previous) {
      error(previous.socket, 'replaced');
      previous.socket.close(4001, 'replaced');
      cleanupSession(previous);
    }
    session.number = number;
    sessions.set(number, session);
    clearTimeout(timers.get(session));
    send(session.socket, { type: 'registered', number, mediaReady: Boolean(mediaConfig) });
  }

  async function updateKeys(session, bundle) {
    const publicBundle = validateBundle(bundle);
    if (!publicBundle) return error(session.socket, 'invalid_bundle');
    const hash = numberOwners.get(session.number);
    const current = hash && identities.get(hash);
    if (!current || current.bundle?.identityKey !== publicBundle.identityKey) return error(session.socket, 'identity_mismatch');

    const next = new Map(identities);
    const preKeyFloor = current.preKeyFloor ?? -1;
    publicBundle.preKeys = publicBundle.preKeys.filter((key) => key.id > preKeyFloor);
    next.set(hash, { number: current.number, bundle: publicBundle, preKeyFloor });
    await saveIdentities(dataFile, next);
    replaceIdentities(next);
    send(session.socket, { type: 'keys_updated' });
  }

  async function lookupBundle(session, message) {
    const hash = numberOwners.get(message.to);
    const target = hash && identities.get(hash);
    if (!target?.bundle) return error(session.socket, 'not_found', { requestId: message.requestId });
    if (message.consumePreKey === false) {
      return send(session.socket, { type: 'bundle', peer: message.to, requestId: message.requestId,
        bundle: { ...structuredClone(target.bundle), preKeys: [] } });
    }
    if (target.bundle.preKeys.length === 0) return error(session.socket, 'prekeys_exhausted', { requestId: message.requestId });

    const [preKey, ...remaining] = target.bundle.preKeys;
    const bundle = { ...structuredClone(target.bundle), preKeys: [preKey], preKey };
    const next = new Map(identities);
    next.set(hash, { number: target.number, bundle: { ...structuredClone(target.bundle), preKeys: remaining }, preKeyFloor: preKey.id });
    await saveIdentities(dataFile, next);
    replaceIdentities(next);
    send(session.socket, { type: 'bundle', peer: message.to, requestId: message.requestId, bundle });
  }

  function pruneDeliveredEnvelopes(now) {
    for (const [key, expiresAt] of deliveredEnvelopes) {
      if (expiresAt > now) break;
      deliveredEnvelopes.delete(key);
    }
    while (deliveredEnvelopes.size > maxDedupEntries) {
      deliveredEnvelopes.delete(deliveredEnvelopes.keys().next().value);
    }
  }

  function relayEnvelope(session, message) {
    const recipient = sessions.get(message.to);
    if (!recipient || recipient.socket.readyState !== WebSocket.OPEN) {
      return error(session.socket, 'offline', { id: message.id });
    }

    const now = Date.now();
    pruneDeliveredEnvelopes(now);
    const key = `${session.number}:${message.id}`;
    if (deliveredEnvelopes.has(key)) return send(session.socket, { type: 'sent', id: message.id });

    deliveredEnvelopes.set(key, now + dedupTtlMs);
    pruneDeliveredEnvelopes(now);
    const forwarded = send(recipient.socket, {
      type: 'envelope', from: session.number, id: message.id, cipherType: message.cipherType, body: message.body,
    });
    if (!forwarded) {
      deliveredEnvelopes.delete(key);
      return error(session.socket, 'offline', { id: message.id });
    }
    send(session.socket, { type: 'sent', id: message.id });
  }

  function createCall(session, members) {
    if (!Array.isArray(members) || members.length < 1 || members.length > 7
      || members.some((member) => typeof member !== 'string' || !NUMBER_PATTERN.test(member) || member === session.number)
      || new Set(members).size !== members.length) return error(session.socket, 'invalid_message');
    if (memberships.has(session.number)) return error(session.socket, 'busy');

    for (const number of members) {
      const target = sessions.get(number);
      if (!target || target.closed || target.socket.readyState !== WebSocket.OPEN) return error(session.socket, 'offline', { to: number });
      if (memberships.has(number)) return error(session.socket, 'busy', { to: number });
    }

    const callId = randomUUID();
    const room = `line-${callId}`;
    const roster = [session.number, ...members];
    const call = { id: callId, room, owner: session.number, members: roster, joined: new Set(), timer: undefined };
    calls.set(callId, call);
    for (const number of roster) memberships.set(number, callId);
    call.timer = setTimeout(() => endCall(call, 'timeout'), ringingTimeoutMs);
    call.timer.unref?.();

    const invitation = { callId, room, members: roster, owner: call.owner };
    send(session.socket, { type: 'call_created', ...invitation });
    for (const number of members) send(sessions.get(number).socket, { type: 'incoming', ...invitation });
  }

  async function joinCall(session, callId) {
    const call = calls.get(callId);
    if (!call || !call.members.includes(session.number) || memberships.get(session.number) !== callId) {
      return error(session.socket, 'unauthorized', { callId });
    }
    if (!mediaConfig) return error(session.socket, 'media_not_configured', { callId });

    try {
      const token = await tokenIssuer({
        identity: session.number,
        room: call.room,
        apiKey: mediaConfig.apiKey,
        apiSecret: mediaConfig.apiSecret,
        ttlSeconds: 120,
      });
      if (calls.get(callId) !== call || session.closed || session.socket.readyState !== WebSocket.OPEN) return;
      if (typeof token !== 'string' || token.length === 0) throw new Error('Invalid token issuer response');
      call.joined.add(session.number);
      if (call.joined.size === call.members.length) clearTimeout(call.timer);
      send(session.socket, {
        type: 'room_grant',
        callId,
        room: call.room,
        members: call.members,
        owner: call.owner,
        url: mediaConfig.mediaUrl,
        token,
      });
    } catch {
      error(session.socket, 'media_unavailable', { callId });
    }
  }

  function handleMessage(session, message) {
    if (!session.number) {
      if (message.type !== 'register' || !hasOnlyKeys(message, ['type', 'token', 'bundle'])) return error(session.socket, 'registration_required');
      return queueStoreOperation(
        session,
        () => register(session, message.token, message.bundle),
        (code) => error(session.socket, code),
      );
    }

    switch (message.type) {
      case 'register':
        return error(session.socket, 'already_registered');
      case 'keys':
        if (!hasOnlyKeys(message, ['type', 'bundle'])) return error(session.socket, 'invalid_message');
        return queueStoreOperation(session, () => updateKeys(session, message.bundle), (code) => error(session.socket, code));
      case 'lookup':
        if (!hasOnlyKeys(message, ['type', 'to', 'requestId', 'consumePreKey'])
          || (message.consumePreKey !== undefined && typeof message.consumePreKey !== 'boolean') || typeof message.to !== 'string'
          || !NUMBER_PATTERN.test(message.to) || typeof message.requestId !== 'string' || !UUID_PATTERN.test(message.requestId)) {
          return error(session.socket, 'invalid_message');
        }
        return queueStoreOperation(
          session,
          () => lookupBundle(session, message),
          (code) => error(session.socket, code, { requestId: message.requestId }),
        );
      case 'envelope':
        if (!hasOnlyKeys(message, ['type', 'to', 'id', 'cipherType', 'body']) || typeof message.to !== 'string'
          || !NUMBER_PATTERN.test(message.to) || typeof message.id !== 'string' || !UUID_PATTERN.test(message.id)
          || ![2, 3].includes(message.cipherType) || !validBase64(message.body, MAX_ENVELOPE_BYTES)) {
          return error(session.socket, 'invalid_message', typeof message.id === 'string' ? { id: message.id } : {});
        }
        return relayEnvelope(session, message);
      case 'create_call':
        if (!hasOnlyKeys(message, ['type', 'members'])) return error(session.socket, 'invalid_message');
        return createCall(session, message.members);
      case 'join_call':
        if (!hasOnlyKeys(message, ['type', 'callId']) || typeof message.callId !== 'string' || !UUID_PATTERN.test(message.callId)) {
          return error(session.socket, 'invalid_message');
        }
        return joinCall(session, message.callId);
      case 'leave_call':
      case 'decline_call': {
        if (!hasOnlyKeys(message, ['type', 'callId']) || typeof message.callId !== 'string' || !UUID_PATTERN.test(message.callId)) {
          return error(session.socket, 'invalid_message');
        }
        const call = calls.get(message.callId);
        if (!call || !call.members.includes(session.number)) return error(session.socket, 'unauthorized', { callId: message.callId });
        endCall(call, message.type === 'leave_call' ? 'left' : 'declined');
        return;
      }
      default:
        return error(session.socket, 'invalid_message');
    }
  }

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url !== '/signal') {
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
    const session = {
      socket,
      ip: request.socket.remoteAddress ?? 'unknown',
      number: undefined,
      closed: false,
      rateLimited: false,
      alive: true,
      messageWindow: 0,
      messageCount: 0,
    };
    socket.session = session;
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
      if (!isObject(message) || typeof message.type !== 'string') return error(socket, 'invalid_message');
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
      const session = socket.session;
      if (session?.alive === false) {
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
      for (const call of [...calls.values()]) endCall(call, 'disconnected');
      for (const socket of wss.clients) socket.terminate();
      await new Promise((resolveClose) => {
        if (!httpServer.listening) return resolveClose();
        httpServer.close(() => resolveClose());
      });
      await new Promise((resolveClose) => wss.close(() => resolveClose()));
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createSignalingServer();
  await server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0');
}
