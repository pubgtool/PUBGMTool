import assert from 'node:assert/strict';
import { createHash, scryptSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, test } from 'node:test';
import { TokenVerifier } from 'livekit-server-sdk';
import { WebSocket } from 'ws';
import { createSignalingServer } from '../src/index.js';

const resources = [];
const LIVEKIT_ENV = {
  LIVEKIT_URL: 'wss://rtc.example.test',
  LIVEKIT_API_KEY: 'test-api-key',
  LIVEKIT_API_SECRET: 'test-api-secret-that-is-never-sent-to-clients',
};
const token = (digit) => digit.repeat(64);
const uuid = (id) => `550e8400-e29b-41d4-a716-${String(id).padStart(12, '0')}`;
const base64 = (value) => Buffer.from(value).toString('base64');
const ADMIN_CODE = 'correct-horse-battery-staple';
let adminRequestNumber = 20_000;
const nextAdminRequestId = () => uuid(adminRequestNumber++);

function adminEnv(code = ADMIN_CODE) {
  const salt = Buffer.from('admin-test-salt-1');
  return { ADMIN_PASSWORD_HASH: `scrypt$${salt.toString('base64')}$${scryptSync(code, salt, 64).toString('base64')}` };
}

function bundle(seed, preKeyCount = 2) {
  return {
    identityKey: base64(`identity-${seed}`),
    registrationId: seed,
    signedPreKey: { id: seed, publicKey: base64(`signed-public-${seed}`), signature: base64(`signed-signature-${seed}`) },
    kyberPreKey: { id: seed + 10_000, publicKey: base64(`kyber-public-${seed}`), signature: base64(`kyber-signature-${seed}`) },
    preKeys: Array.from({ length: preKeyCount }, (_, index) => ({ id: seed * 100 + index, publicKey: base64(`one-time-${seed}-${index}`) })),
  };
}

async function setup(options = {}) {
  const { directory: requestedDirectory, ...serverOptions } = options;
  const directory = requestedDirectory ?? await mkdtemp(join(tmpdir(), 'signal-test-'));
  const server = await createSignalingServer({
    dataFile: join(directory, 'identities.json'),
    env: {},
    heartbeatIntervalMs: 60_000,
    ...serverOptions,
  });
  const address = await server.listen(0, '127.0.0.1');
  const resource = { server, directory, url: `ws://127.0.0.1:${address.port}/signal`, sockets: [] };
  resources.push(resource);
  return resource;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function waitFor(socket, predicate = () => true, timeoutMs = 1_500) {
  return new Promise((resolve, reject) => {
    const received = [];
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error(`Timed out waiting for WebSocket message; saw ${JSON.stringify(received)}`));
    }, timeoutMs);
    const onMessage = (data) => {
      const message = JSON.parse(data.toString());
      received.push(message);
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    };
    socket.on('message', onMessage);
  });
}

async function openSocket(resource) {
  const socket = await connect(resource.url);
  resource.sockets.push(socket);
  return socket;
}

async function register(socket, installationToken, publicBundle = bundle(1)) {
  const result = waitFor(socket, (message) => ['registered', 'error'].includes(message.type));
  socket.send(JSON.stringify({ type: 'register', token: installationToken, bundle: publicBundle }));
  return result;
}

async function lookup(socket, to, requestId = uuid(9_000)) {
  const result = waitFor(socket, (message) => message.requestId === requestId);
  socket.send(JSON.stringify({ type: 'lookup', to, requestId }));
  return result;
}

async function sendRequest(socket, message, predicate) {
  const result = waitFor(socket, predicate);
  socket.send(JSON.stringify(message));
  return result;
}

async function adminLogin(socket, code = ADMIN_CODE) {
  const requestId = nextAdminRequestId();
  return sendRequest(socket, { type: 'admin_login', requestId, code },
    (message) => message.type === 'admin_result' && message.requestId === requestId);
}

async function adminAction(socket, action, fields = {}) {
  const requestId = nextAdminRequestId();
  return sendRequest(socket, { type: 'admin', requestId, action, ...fields },
    (message) => message.type === 'admin_result' && message.requestId === requestId);
}

async function closeSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  const closed = new Promise((resolve) => socket.once('close', resolve));
  socket.close();
  await closed;
}

afterEach(async () => {
  await Promise.all(resources.splice(0).map(async ({ server, directory, sockets }) => {
    await server.close();
    await Promise.all(sockets.map(async (socket) => {
      if (socket.readyState !== WebSocket.CLOSED) await closeSocket(socket);
    }));
    await rm(directory, { recursive: true, force: true });
  }));
});

test('registration stores only token hashes and public bundles in an atomic 0600 v2 store', async () => {
  const resource = await setup();
  const socket = await openSocket(resource);
  const registered = await register(socket, token('a'), bundle(11));
  assert.equal(registered.type, 'registered');
  assert.match(registered.number, /^\d{8}$/);

  const dataFile = join(resource.directory, 'identities.json');
  const content = await readFile(dataFile, 'utf8');
  const document = JSON.parse(content);
  assert.equal(document.version, 2);
  assert.ok(document.identities[createHash('sha256').update(token('a')).digest('hex')]);
  assert.equal(content.includes(token('a')), false);
  assert.equal(content.includes('signed-signature-11'), false);
  assert.deepEqual(document.identities[createHash('sha256').update(token('a')).digest('hex')].bundle, bundle(11));
  assert.equal((await stat(dataFile)).mode & 0o777, 0o600);

  await closeSocket(socket);
  await resource.server.close();
  resource.server = await createSignalingServer({ dataFile, env: {}, heartbeatIntervalMs: 60_000 });
  const address = await resource.server.listen(0, '127.0.0.1');
  resource.url = `ws://127.0.0.1:${address.port}/signal`;
  const reconnect = await openSocket(resource);
  assert.deepEqual(await register(reconnect, token('a'), bundle(11)), {
    type: 'registered', number: registered.number, mediaReady: false,
    callsEnabled: true, chatEnabled: true, registrationEnabled: true, maxParticipants: 8,
  });
});

test('version-1 registrations migrate on bundle registration without changing numbers', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'signal-v1-'));
  const dataFile = join(directory, 'identities.json');
  const oldToken = token('b');
  const hash = createHash('sha256').update(oldToken).digest('hex');
  await writeFile(dataFile, JSON.stringify({ version: 1, identities: { [hash]: '01234567' } }), { mode: 0o600 });
  const server = await createSignalingServer({ dataFile, env: {}, heartbeatIntervalMs: 60_000 });
  const address = await server.listen(0, '127.0.0.1');
  const resource = { server, directory, url: `ws://127.0.0.1:${address.port}/signal`, sockets: [] };
  resources.push(resource);
  const socket = await openSocket(resource);
  assert.deepEqual(await register(socket, oldToken, bundle(12)), {
    type: 'registered', number: '01234567', mediaReady: false,
    callsEnabled: true, chatEnabled: true, registrationEnabled: true, maxParticipants: 8,
  });
  const migrated = JSON.parse(await readFile(dataFile, 'utf8'));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.identities[hash].number, '01234567');
  assert.deepEqual(migrated.identities[hash].bundle, bundle(12));
});

test('identity keys cannot change, while a matching identity may rotate its public prekeys', async () => {
  const resource = await setup();
  const socket = await openSocket(resource);
  await register(socket, token('c'), bundle(13));

  const changedIdentity = await sendRequest(socket, { type: 'keys', bundle: bundle(14) }, (message) => message.type === 'error');
  assert.equal(changedIdentity.code, 'identity_mismatch');

  const rotated = bundle(13, 1);
  rotated.preKeys[0].id += 1;
  assert.deepEqual(await sendRequest(socket, { type: 'keys', bundle: rotated }, (message) => message.type === 'keys_updated'), { type: 'keys_updated' });
  const stored = JSON.parse(await readFile(join(resource.directory, 'identities.json'), 'utf8'));
  const entry = Object.values(stored.identities)[0];
  assert.deepEqual(entry.bundle, rotated);
});

test('bundle lookups atomically consume one target prekey and report exhaustion with request ids', async () => {
  const resource = await setup();
  const requester = await openSocket(resource);
  const target = await openSocket(resource);
  await register(requester, token('d'), bundle(15, 0));
  const targetRegistration = await register(target, token('e'), bundle(16, 2));

  const first = await lookup(requester, targetRegistration.number, uuid(1));
  assert.equal(first.type, 'bundle');
  assert.equal(first.peer, targetRegistration.number);
  assert.deepEqual(first.bundle.preKeys, [bundle(16, 2).preKeys[0]]);
  const second = await lookup(requester, targetRegistration.number, uuid(2));
  assert.deepEqual(second.bundle.preKeys, [bundle(16, 2).preKeys[1]]);
  const exhausted = await lookup(requester, targetRegistration.number, uuid(3));
  assert.deepEqual(exhausted, { type: 'error', code: 'prekeys_exhausted', requestId: uuid(3) });
  const absent = await lookup(requester, '99999999', uuid(4));
  assert.deepEqual(absent, { type: 'error', code: 'not_found', requestId: uuid(4) });

  const stored = JSON.parse(await readFile(join(resource.directory, 'identities.json'), 'utf8'));
  assert.equal(Object.values(stored.identities).find((entry) => entry.number === targetRegistration.number).bundle.preKeys.length, 0);
});

test('encrypted envelopes relay only to online targets, deduplicate replays, and never queue offline bodies', async () => {
  const resource = await setup();
  const sender = await openSocket(resource);
  const recipient = await openSocket(resource);
  const senderInfo = await register(sender, token('f'), bundle(17, 0));
  const recipientInfo = await register(recipient, token('1'), bundle(18, 0));
  const body = base64('opaque encrypted payload');
  const message = { type: 'envelope', to: recipientInfo.number, id: uuid(10), cipherType: 2, body };

  const delivered = waitFor(recipient, (item) => item.type === 'envelope');
  const sent = waitFor(sender, (item) => item.type === 'sent');
  sender.send(JSON.stringify(message));
  assert.deepEqual(await delivered, {
    type: 'envelope', from: senderInfo.number, id: message.id, cipherType: 2, body,
  });
  assert.deepEqual(await sent, { type: 'sent', id: message.id });

  const duplicateAck = waitFor(sender, (item) => item.type === 'sent' && item.id === message.id);
  const unexpectedDuplicate = waitFor(recipient, (item) => item.type === 'envelope', 150).then(() => 'duplicate', () => 'none');
  sender.send(JSON.stringify(message));
  assert.deepEqual(await duplicateAck, { type: 'sent', id: message.id });
  assert.equal(await unexpectedDuplicate, 'none');

  const offline = await sendRequest(sender, { ...message, to: '99999999', id: uuid(11) }, (item) => item.type === 'error');
  assert.deepEqual(offline, { type: 'error', code: 'offline', id: uuid(11) });
  const invalidCipher = await sendRequest(sender, { ...message, id: uuid(12), body: 'not base64!' }, (item) => item.type === 'error');
  assert.equal(invalidCipher.code, 'invalid_message');
  assert.equal((await readFile(join(resource.directory, 'identities.json'), 'utf8')).includes(body), false);
});

test('group calls issue verifiable, short-lived, room-scoped microphone-only LiveKit grants', async () => {
  const deletedRooms = [];
  const resource = await setup({ env: LIVEKIT_ENV, ringingTimeoutMs: 300, deleteRoom: (room) => deletedRooms.push(room) });
  const owner = await openSocket(resource);
  const memberA = await openSocket(resource);
  const memberB = await openSocket(resource);
  const outsider = await openSocket(resource);
  const ownerInfo = await register(owner, token('2'), bundle(21, 0));
  assert.equal(ownerInfo.mediaReady, true);
  const memberAInfo = await register(memberA, token('3'), bundle(22, 0));
  const memberBInfo = await register(memberB, token('4'), bundle(23, 0));
  await register(outsider, token('5'), bundle(24, 0));

  const inviteA = waitFor(memberA, (item) => item.type === 'incoming');
  const inviteB = waitFor(memberB, (item) => item.type === 'incoming');
  const created = waitFor(owner, (item) => item.type === 'call_created');
  owner.send(JSON.stringify({ type: 'create_call', members: [memberAInfo.number, memberBInfo.number] }));
  const [call, incomingA, incomingB] = await Promise.all([created, inviteA, inviteB]);
  assert.match(call.callId, /^[0-9a-f-]{36}$/i);
  assert.equal(call.room, `line-${call.callId}`);
  assert.deepEqual(call.members, [ownerInfo.number, memberAInfo.number, memberBInfo.number]);
  assert.equal(call.owner, ownerInfo.number);
  assert.deepEqual(incomingA, { type: 'incoming', callId: call.callId, room: call.room, members: call.members, owner: call.owner });
  assert.deepEqual(incomingB, incomingA);

  const unauthorized = await sendRequest(outsider, { type: 'join_call', callId: call.callId }, (item) => item.type === 'error');
  assert.equal(unauthorized.code, 'unauthorized');
  const ownerBusy = await sendRequest(owner, { type: 'create_call', members: [outsider.number ?? '99999999'] }, (item) => item.type === 'error');
  assert.equal(ownerBusy.code, 'busy');

  const grants = await Promise.all([owner, memberA, memberB].map((socket) => sendRequest(
    socket,
    { type: 'join_call', callId: call.callId },
    (item) => item.type === 'room_grant' || item.type === 'error',
  )));
  const verifier = new TokenVerifier(LIVEKIT_ENV.LIVEKIT_API_KEY, LIVEKIT_ENV.LIVEKIT_API_SECRET);
  for (const [index, grant] of grants.entries()) {
    assert.deepEqual(Object.keys(grant).sort(), ['callId', 'members', 'owner', 'room', 'token', 'type', 'url'].sort());
    assert.equal(grant.url, LIVEKIT_ENV.LIVEKIT_URL);
    assert.equal(grant.room, call.room);
    assert.deepEqual(grant.members, call.members);
    const claims = await verifier.verify(grant.token);
    assert.equal(claims.sub, call.members[index]);
    const lifetime = claims.exp - claims.nbf;
    assert.ok(lifetime >= 119 && lifetime <= 120, `Unexpected JWT lifetime: ${lifetime}`);
    assert.deepEqual(claims.video, {
      roomJoin: true,
      room: call.room,
      canPublishSources: ['microphone'],
      canSubscribe: true,
      canPublishData: false,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 450));
  const stillBusy = await sendRequest(owner, { type: 'create_call', members: [outsider.number ?? '99999999'] }, (item) => item.type === 'error');
  assert.equal(stillBusy.code, 'busy');
  const endedA = waitFor(memberA, (item) => item.type === 'ended');
  const endedB = waitFor(memberB, (item) => item.type === 'ended');
  owner.send(JSON.stringify({ type: 'leave_call', callId: call.callId }));
  assert.deepEqual(await Promise.all([endedA, endedB]), [
    { type: 'ended', callId: call.callId, reason: 'left' },
    { type: 'ended', callId: call.callId, reason: 'left' },
  ]);
  assert.deepEqual(deletedRooms, [call.room]);
});

test('missing LiveKit configuration never creates a placeholder token', async () => {
  const resource = await setup();
  const owner = await openSocket(resource);
  const member = await openSocket(resource);
  const ownerInfo = await register(owner, token('6'), bundle(25, 0));
  const memberInfo = await register(member, token('7'), bundle(26, 0));
  const created = waitFor(owner, (item) => item.type === 'call_created');
  const incoming = waitFor(member, (item) => item.type === 'incoming');
  owner.send(JSON.stringify({ type: 'create_call', members: [memberInfo.number] }));
  const call = await created;
  await incoming;
  const result = await sendRequest(owner, { type: 'join_call', callId: call.callId }, (item) => item.type === 'error');
  assert.deepEqual(result, { type: 'error', code: 'media_not_configured', callId: call.callId });
  const ended = waitFor(member, (item) => item.type === 'ended');
  member.send(JSON.stringify({ type: 'decline_call', callId: call.callId }));
  assert.deepEqual(await ended, { type: 'ended', callId: call.callId, reason: 'declined' });
  assert.match(ownerInfo.number, /^\d{8}$/);
});

test('decline, disconnect, and unanswered timeout end the entire fixed roster', async () => {
  const deletedRooms = [];
  const resource = await setup({ deleteRoom: (room) => deletedRooms.push(room), ringingTimeoutMs: 500 });
  const owner = await openSocket(resource);
  const member = await openSocket(resource);
  const memberInfo = await register(member, token('8'), bundle(27, 0));
  await register(owner, token('9'), bundle(28, 0));
  const incoming = waitFor(member, (item) => item.type === 'incoming');
  const created = waitFor(owner, (item) => item.type === 'call_created');
  owner.send(JSON.stringify({ type: 'create_call', members: [memberInfo.number] }));
  const call = await created;
  await incoming;
  const ended = waitFor(member, (item) => item.type === 'ended');
  assert.deepEqual(await ended, { type: 'ended', callId: call.callId, reason: 'timeout' });
  assert.deepEqual(deletedRooms, [call.room]);

  const memberAgain = await openSocket(resource);
  await register(memberAgain, token('8'), bundle(27, 0));
  const incomingAgain = waitFor(memberAgain, (item) => item.type === 'incoming');
  const createdAgain = waitFor(owner, (item) => item.type === 'call_created');
  owner.send(JSON.stringify({ type: 'create_call', members: [memberInfo.number] }));
  const disconnectedCall = await createdAgain;
  await incomingAgain;
  const disconnected = waitFor(owner, (item) => item.type === 'ended' && item.callId === disconnectedCall.callId);
  await closeSocket(memberAgain);
  assert.deepEqual(await disconnected, { type: 'ended', callId: disconnectedCall.callId, reason: 'disconnected' });
  assert.deepEqual(deletedRooms, [call.room, disconnectedCall.room]);
});

test('registration deadline and per-IP registration limits are enforced', async () => {
  const resource = await setup({ registrationTimeoutMs: 80, maxRegistrationsPerIp: 1 });
  const idle = await openSocket(resource);
  assert.equal((await waitFor(idle, (item) => item.type === 'error')).code, 'registration_timeout');

  const first = await openSocket(resource);
  assert.equal((await register(first, token('a'), bundle(29, 0))).type, 'registered');
  const second = await openSocket(resource);
  assert.equal((await register(second, token('b'), bundle(30, 0))).code, 'rate_limited');
});

test('admin hash helper emits only a usable scrypt verifier and enforces password length', () => {
  const helper = fileURLToPath(new URL('../scripts/hash-admin-password.mjs', import.meta.url));
  const output = execFileSync(process.execPath, [helper], {
    input: `${ADMIN_CODE}\n`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  const match = /^scrypt\$([A-Za-z0-9+/]+={0,2})\$([A-Za-z0-9+/]+={0,2})$/.exec(output);
  assert.ok(match);
  assert.deepEqual(scryptSync(ADMIN_CODE, Buffer.from(match[1], 'base64'), 64), Buffer.from(match[2], 'base64'));
  assert.equal(output.includes(ADMIN_CODE), false);
  assert.throws(() => execFileSync(process.execPath, [helper], {
    input: 'short\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  }));
});

test('admin login is hash-verified, scoped to one socket, expires, and exposes privacy-safe status', async () => {
  const resource = await setup({ env: adminEnv(), adminSessionMs: 500 });
  const socket = await openSocket(resource);
  assert.equal((await adminLogin(socket)).error, 'registration_required');
  await register(socket, token('0'), bundle(30, 0));
  const rejected = await adminAction(socket, 'status');
  assert.deepEqual(rejected, {
    type: 'admin_result', requestId: rejected.requestId, ok: false, error: 'unauthorized',
  });

  assert.equal((await adminLogin(socket, 'not-the-secret')).error, 'invalid_credentials');
  const login = await adminLogin(socket);
  assert.equal(login.ok, true);
  assert.ok(login.expiresAt > Date.now());
  const status = await adminAction(socket, 'status');
  assert.equal(status.ok, true);
  assert.deepEqual(status.result.settings, {
    callsEnabled: true, chatEnabled: true, registrationEnabled: true, maxParticipants: 8,
  });
  assert.deepEqual(status.result.metrics, {
    online: 1, registered: 1, activeCalls: 0, mediaConfigured: false,
    uptimeSeconds: status.result.metrics.uptimeSeconds,
  });
  assert.ok(status.result.events.every((event) => Object.keys(event).sort().join(',') === 'at,event,outcome'));
  assert.equal(JSON.stringify(status.result.events).includes(ADMIN_CODE), false);

  const otherSocket = await openSocket(resource);
  assert.equal((await adminAction(otherSocket, 'status')).error, 'unauthorized');
  assert.equal((await adminAction(socket, 'logout')).result.loggedOut, true);
  assert.equal((await adminAction(socket, 'status')).error, 'unauthorized');
  assert.equal((await adminLogin(socket)).ok, true);
  await closeSocket(socket);
  assert.equal((await adminAction(otherSocket, 'status')).error, 'unauthorized');
  const expiringSocket = await openSocket(resource);
  await register(expiringSocket, token('1'), bundle(31, 0));
  assert.equal((await adminLogin(expiringSocket)).ok, true);
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal((await adminAction(expiringSocket, 'status')).error, 'expired');
});

test('admin login failures are rate limited and lock out the peer until the lock expires', async () => {
  const resource = await setup({ env: adminEnv(), adminLockMs: 80, adminRateWindowMs: 250 });
  const socket = await openSocket(resource);
  await register(socket, token('a'), bundle(38, 0));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await adminLogin(socket, 'bad')).error, 'invalid_credentials');
  }
  assert.equal((await adminLogin(socket, ADMIN_CODE)).error, 'rate_limited');
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.equal((await adminLogin(socket)).ok, true);
});

test('a failed login still counts against the peer limit when its socket disconnects during scrypt', async () => {
  let releaseDerivation;
  let reportStarted;
  let reportFinished;
  const derivationGate = new Promise((resolve) => { releaseDerivation = resolve; });
  const derivationStarted = new Promise((resolve) => { reportStarted = resolve; });
  const derivationFinished = new Promise((resolve) => { reportFinished = resolve; });
  const resource = await setup({
    env: adminEnv(),
    deriveAdminPassword: async (code, salt) => {
      if (code === 'wrong-code-on-disconnect') {
        reportStarted();
        await derivationGate;
        setImmediate(reportFinished);
      }
      return scryptSync(code, salt, 64);
    },
  });
  const abandoned = await openSocket(resource);
  await register(abandoned, token('b'), bundle(39, 0));
  abandoned.send(JSON.stringify({ type: 'admin_login', requestId: uuid(30_001), code: 'wrong-code-on-disconnect' }));
  await derivationStarted;
  await closeSocket(abandoned);
  releaseDerivation();
  await derivationFinished;

  const retry = await openSocket(resource);
  await register(retry, token('c'), bundle(40, 0));
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal((await adminLogin(retry, 'wrong-code-still-open')).error, 'invalid_credentials');
  }
  assert.equal((await adminLogin(retry)).error, 'rate_limited');
});

test('missing admin hash disables admin access without affecting ordinary registration', async () => {
  const resource = await setup();
  const socket = await openSocket(resource);
  assert.equal((await adminLogin(socket)).error, 'registration_required');
  assert.equal((await register(socket, token('a'), bundle(31, 0))).type, 'registered');
  assert.equal((await adminLogin(socket)).error, 'admin_disabled');
});

test('invalid or stale admin stores fail startup closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'signal-admin-store-'));
  const dataFile = join(directory, 'identities.json');
  const adminDataFile = join(directory, 'admin.json');
  try {
    await writeFile(adminDataFile, '{invalid json', { mode: 0o600 });
    await assert.rejects(createSignalingServer({ dataFile, adminDataFile, env: {} }), /Admin store is not valid JSON/);
    await writeFile(adminDataFile, JSON.stringify({
      version: 1,
      settings: { callsEnabled: true, chatEnabled: true, registrationEnabled: true, maxParticipants: 8 },
      blockedNumbers: ['12345678'],
    }), { mode: 0o600 });
    await assert.rejects(createSignalingServer({ dataFile, adminDataFile, env: {} }), /unknown accounts/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('admin settings persist and enforce chat, call size, calls, and new-registration controls', async () => {
  const resource = await setup({ env: adminEnv() });
  const admin = await openSocket(resource);
  const peerA = await openSocket(resource);
  const peerB = await openSocket(resource);
  const adminInfo = await register(admin, token('2'), bundle(32, 0));
  const peerAInfo = await register(peerA, token('3'), bundle(33, 0));
  const peerBInfo = await register(peerB, token('4'), bundle(34, 0));
  assert.equal((await adminAction(peerA, 'status')).error, 'unauthorized');
  assert.equal((await adminLogin(admin)).ok, true);

  const capabilitiesChanged = waitFor(peerA, (message) => message.type === 'capabilities');
  const update = await adminAction(admin, 'update_settings', {
    settings: { chatEnabled: false, maxParticipants: 2 },
  });
  assert.deepEqual(update.result.settings, {
    callsEnabled: true, chatEnabled: false, registrationEnabled: true, maxParticipants: 2,
  });
  const caps = await capabilitiesChanged;
  assert.deepEqual(caps, {
    type: 'capabilities', callsEnabled: true, chatEnabled: false,
    registrationEnabled: true, maxParticipants: 2, mediaReady: false,
  });
  const body = base64('encrypted');
  const disabledChat = await sendRequest(admin, {
    type: 'envelope', to: peerAInfo.number, id: uuid(40), cipherType: 2, body,
  }, (message) => message.type === 'error');
  assert.equal(disabledChat.code, 'chat_disabled');
  assert.equal((await sendRequest(admin, {
    type: 'create_call', members: [peerAInfo.number, peerBInfo.number],
  }, (message) => message.type === 'error')).code, 'invalid_message');

  const disabled = await adminAction(admin, 'update_settings', {
    settings: { callsEnabled: false, registrationEnabled: false },
  });
  assert.equal(disabled.ok, true);
  assert.equal((await sendRequest(admin, { type: 'create_call', members: [peerAInfo.number] },
    (message) => message.type === 'error')).code, 'calls_disabled');
  const newcomer = await openSocket(resource);
  assert.equal((await register(newcomer, token('5'), bundle(35, 0))).code, 'registration_disabled');
  const existingLogin = await openSocket(resource);
  assert.equal((await register(existingLogin, token('3'), bundle(33, 0))).type, 'registered');

  const store = join(resource.directory, 'identities.json.admin.json');
  assert.equal((await stat(store)).mode & 0o777, 0o600);
  const adminData = JSON.parse(await readFile(store, 'utf8'));
  assert.deepEqual(adminData.settings, disabled.result.settings);
  assert.equal((await adminAction(admin, 'clear_events')).result.cleared, true);
  const cleared = await adminAction(admin, 'status');
  assert.deepEqual(cleared.result.events.map((event) => event.event), ['events_cleared']);
  assert.equal((await adminAction(admin, 'update_settings', { settings: { arbitrary: true } })).error, 'invalid_message');
  assert.equal((await adminAction(admin, 'update_settings', { settings: { maxParticipants: 9 } })).error, 'invalid_settings');

  await resource.server.close();
  resource.server = await createSignalingServer({ dataFile: join(resource.directory, 'identities.json'), env: adminEnv(), heartbeatIntervalMs: 60_000 });
  const address = await resource.server.listen(0, '127.0.0.1');
  resource.url = `ws://127.0.0.1:${address.port}/signal`;
  const afterRestart = await openSocket(resource);
  assert.equal((await register(afterRestart, token('3'), bundle(33, 0))).callsEnabled, false);
});

test('admin blocking ends calls, disconnects accounts, persists the list, and prevents reconnection', async () => {
  const resource = await setup({ env: adminEnv() });
  const admin = await openSocket(resource);
  const target = await openSocket(resource);
  const adminInfo = await register(admin, token('6'), bundle(36, 0));
  const targetInfo = await register(target, token('7'), bundle(37, 0));
  assert.equal((await adminLogin(admin)).ok, true);
  assert.equal((await adminAction(admin, 'block', { number: adminInfo.number })).error, 'self_block_denied');

  const callCreated = waitFor(admin, (message) => message.type === 'call_created');
  const incoming = waitFor(target, (message) => message.type === 'incoming');
  admin.send(JSON.stringify({ type: 'create_call', members: [targetInfo.number] }));
  const call = await callCreated;
  await incoming;
  assert.deepEqual((await adminAction(admin, 'status')).result.calls, [{ id: call.callId, participantCount: 2 }]);
  const endedAdmin = waitFor(admin, (message) => message.type === 'ended');
  const endedTarget = waitFor(target, (message) => message.type === 'ended');
  const endedCall = await adminAction(admin, 'end_call', { callId: call.callId });
  assert.deepEqual(endedCall.result, { callId: call.callId, ended: true });
  assert.deepEqual(await Promise.all([endedAdmin, endedTarget]), [
    { type: 'ended', callId: call.callId, reason: 'admin_ended' },
    { type: 'ended', callId: call.callId, reason: 'admin_ended' },
  ]);

  const nextCallCreated = waitFor(admin, (message) => message.type === 'call_created');
  const nextIncoming = waitFor(target, (message) => message.type === 'incoming');
  admin.send(JSON.stringify({ type: 'create_call', members: [targetInfo.number] }));
  const nextCall = await nextCallCreated;
  await nextIncoming;
  const ended = waitFor(admin, (message) => message.type === 'ended');
  const blocked = waitFor(target, (message) => message.type === 'error' && message.code === 'blocked');
  const disconnected = new Promise((resolve) => target.once('close', resolve));
  const result = await adminAction(admin, 'block', { number: targetInfo.number });
  assert.deepEqual(result.result, { number: targetInfo.number, blocked: true });
  assert.deepEqual(await ended, { type: 'ended', callId: nextCall.callId, reason: 'blocked' });
  await blocked;
  await disconnected;

  const status = await adminAction(admin, 'status');
  assert.deepEqual(status.result.blockedNumbers, [targetInfo.number]);
  assert.deepEqual(status.result.calls, []);
  assert.equal(JSON.stringify(status.result.events).includes(targetInfo.number), false);
  const unblocked = await adminAction(admin, 'unblock', { number: targetInfo.number });
  assert.deepEqual(unblocked.result, { number: targetInfo.number, blocked: false });
  await adminAction(admin, 'block', { number: targetInfo.number });

  await resource.server.close();
  resource.server = await createSignalingServer({ dataFile: join(resource.directory, 'identities.json'), env: adminEnv(), heartbeatIntervalMs: 60_000 });
  const address = await resource.server.listen(0, '127.0.0.1');
  resource.url = `ws://127.0.0.1:${address.port}/signal`;
  const reconnect = await openSocket(resource);
  assert.equal((await register(reconnect, token('7'), bundle(37, 0))).code, 'blocked');
});
