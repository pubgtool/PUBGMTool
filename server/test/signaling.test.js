import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import { WebSocket } from 'ws';
import { createSignalingServer } from '../src/index.js';

const resources = [];
const token = (digit) => digit.repeat(64);

async function setup(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'signal-test-'));
  const server = await createSignalingServer({ dataFile: join(directory, 'identities.json'), env: {}, heartbeatIntervalMs: 60_000, ...options });
  const address = await server.listen(0, '127.0.0.1');
  const resource = { server, directory, url: `ws://127.0.0.1:${address.port}/signal` };
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

async function register(socket, installationToken) {
  socket.send(JSON.stringify({ type: 'register', token: installationToken }));
  return waitFor(socket, (message) => ['registered', 'error'].includes(message.type));
}

async function startCall(caller, callee, number) {
  const ringing = waitFor(caller, (message) => message.type === 'ringing');
  const incoming = waitFor(callee, (message) => message.type === 'incoming');
  caller.send(JSON.stringify({ type: 'call', to: number }));
  return Promise.all([ringing, incoming]);
}

afterEach(async () => {
  await Promise.all(resources.splice(0).map(async ({ server, directory }) => {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }));
});

test('registration persists only token hashes and stable numbers across restarts', async () => {
  const resource = await setup();
  const firstSocket = await connect(resource.url);
  const first = await register(firstSocket, token('a'));
  assert.equal(first.type, 'registered');
  assert.match(first.number, /^\d{8}$/);
  const persisted = await readFile(join(resource.directory, 'identities.json'), 'utf8');
  assert.equal(persisted.includes(token('a')), false);
  assert.equal(persisted.includes(first.number), true);
  firstSocket.close();
  await waitForClose(firstSocket);

  await resource.server.close();
  const restarted = await createSignalingServer({ dataFile: join(resource.directory, 'identities.json'), env: {}, heartbeatIntervalMs: 60_000 });
  resource.server = restarted;
  const address = await restarted.listen(0, '127.0.0.1');
  resource.url = `ws://127.0.0.1:${address.port}/signal`;
  const secondSocket = await connect(resource.url);
  const second = await register(secondSocket, token('a'));
  assert.equal(second.number, first.number);
});

test('call flow routes messages only to call members after acceptance', async () => {
  const { url } = await setup();
  const caller = await connect(url);
  const callee = await connect(url);
  const stranger = await connect(url);
  const callerInfo = await register(caller, token('1'));
  const calleeInfo = await register(callee, token('2'));
  await register(stranger, token('3'));

  const [ringing, incoming] = await startCall(caller, callee, calleeInfo.number);
  assert.equal(incoming.callId, ringing.callId);
  assert.equal(incoming.peer, callerInfo.number);

  const notAccepted = waitFor(caller, (message) => message.type === 'error' && message.code === 'not_accepted');
  const neverForwarded = waitFor(stranger, (message) => message.type === 'signal', 150).then(() => 'forwarded', () => 'silent');
  caller.send(JSON.stringify({ type: 'signal', callId: ringing.callId, description: { type: 'offer', sdp: 'offer-sdp' } }));
  assert.equal((await notAccepted).code, 'not_accepted');
  assert.equal(await neverForwarded, 'silent');

  const callerAccepted = waitFor(caller, (message) => message.type === 'accepted');
  const calleeAccepted = waitFor(callee, (message) => message.type === 'accepted');
  callee.send(JSON.stringify({ type: 'accept', callId: ringing.callId }));
  assert.deepEqual(await Promise.all([callerAccepted, calleeAccepted]), [
    { type: 'accepted', callId: ringing.callId },
    { type: 'accepted', callId: ringing.callId },
  ]);

  const invalidCandidate = waitFor(caller, (message) => message.type === 'error' && message.code === 'invalid_message');
  caller.send(JSON.stringify({ type: 'signal', callId: ringing.callId, candidate: {} }));
  assert.equal((await invalidCandidate).code, 'invalid_message');

  const offer = waitFor(callee, (message) => message.type === 'signal');
  caller.send(JSON.stringify({ type: 'signal', callId: ringing.callId, description: { type: 'offer', sdp: 'offer-sdp' } }));
  assert.deepEqual(await offer, { type: 'signal', callId: ringing.callId, description: { type: 'offer', sdp: 'offer-sdp' } });

  const unauthorized = waitFor(stranger, (message) => message.type === 'error' && message.code === 'unauthorized');
  stranger.send(JSON.stringify({ type: 'signal', callId: ringing.callId, candidate: { sdpMid: '0', sdpMLineIndex: 0, candidate: 'candidate:1' } }));
  assert.equal((await unauthorized).code, 'unauthorized');
});

test('self, offline, busy, reject, and hangup use bounded call states', async () => {
  const { url } = await setup();
  const first = await connect(url);
  const second = await connect(url);
  const third = await connect(url);
  const firstInfo = await register(first, token('4'));
  const secondInfo = await register(second, token('5'));
  await register(third, token('6'));

  for (const [to, code] of [[firstInfo.number, 'self'], ['99999999', 'offline']]) {
    const response = waitFor(first, (message) => message.type === 'error');
    first.send(JSON.stringify({ type: 'call', to }));
    assert.equal((await response).code, code);
  }

  first.send(JSON.stringify({ type: 'call', to: secondInfo.number }));
  const ringing = await waitFor(first, (message) => message.type === 'ringing');
  const busyError = waitFor(third, (message) => message.type === 'error');
  third.send(JSON.stringify({ type: 'call', to: secondInfo.number }));
  assert.equal((await busyError).code, 'busy');

  const ended = waitFor(first, (message) => message.type === 'ended');
  second.send(JSON.stringify({ type: 'reject', callId: ringing.callId }));
  assert.deepEqual(await ended, { type: 'ended', callId: ringing.callId, reason: 'rejected' });

  first.send(JSON.stringify({ type: 'call', to: secondInfo.number }));
  const secondCall = await waitFor(first, (message) => message.type === 'ringing');
  const hangupEnd = waitFor(second, (message) => message.type === 'ended');
  first.send(JSON.stringify({ type: 'hangup', callId: secondCall.callId }));
  assert.equal((await hangupEnd).reason, 'hangup');
});

test('invalid input receives errors without routing SDP or candidate fields', async () => {
  const { url } = await setup();
  const socket = await connect(url);
  socket.send('{no-json');
  assert.equal((await waitFor(socket, (message) => message.type === 'error')).code, 'malformed_json');
  socket.send(JSON.stringify({ type: 'register', token: 'invalid' }));
  assert.equal((await waitFor(socket, (message) => message.type === 'error')).code, 'invalid_token');
  const registered = await register(socket, token('7'));
  assert.equal(registered.type, 'registered');
  const invalidCandidate = waitFor(socket, (message) => message.type === 'error');
  socket.send(JSON.stringify({ type: 'signal', callId: 'bad', candidate: {} }));
  assert.equal((await invalidCandidate).code, 'invalid_message');

  const response = await fetch(`http://127.0.0.1:${new URL(url).port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal((await fetch(`http://127.0.0.1:${new URL(url).port}/other`)).status, 404);
});

test('disconnect ends calls, and ringing timeout ends without affecting other calls', async () => {
  const { url } = await setup({ ringingTimeoutMs: 500 });
  const caller = await connect(url);
  const callee = await connect(url);
  const unrelated = await connect(url);
  const unrelatedPeer = await connect(url);
  const callerInfo = await register(caller, token('8'));
  const calleeInfo = await register(callee, token('9'));
  await register(unrelated, token('b'));
  const unrelatedPeerInfo = await register(unrelatedPeer, token('a'));

  const [unrelatedCall] = await startCall(unrelated, unrelatedPeer, unrelatedPeerInfo.number);
  const unrelatedAccepted = waitFor(unrelated, (message) => message.type === 'accepted');
  const unrelatedPeerAccepted = waitFor(unrelatedPeer, (message) => message.type === 'accepted');
  unrelatedPeer.send(JSON.stringify({ type: 'accept', callId: unrelatedCall.callId }));
  await Promise.all([unrelatedAccepted, unrelatedPeerAccepted]);

  const timedEnded = waitFor(caller, (message) => message.type === 'ended');
  const [timedCall] = await startCall(caller, callee, calleeInfo.number);
  const timedEnd = await timedEnded;
  assert.deepEqual(timedEnd, { type: 'ended', callId: timedCall.callId, reason: 'timeout' });
  const unrelatedEnd = waitFor(unrelatedPeer, (message) => message.type === 'ended');
  unrelated.send(JSON.stringify({ type: 'hangup', callId: unrelatedCall.callId }));
  assert.equal((await unrelatedEnd).reason, 'hangup');

  const [liveCall] = await startCall(caller, callee, calleeInfo.number);
  const callerAccepted = waitFor(caller, (message) => message.type === 'accepted');
  const calleeAccepted = waitFor(callee, (message) => message.type === 'accepted');
  callee.send(JSON.stringify({ type: 'accept', callId: liveCall.callId }));
  await Promise.all([callerAccepted, calleeAccepted]);
  const disconnectEnd = waitFor(callee, (message) => message.type === 'ended');
  caller.close();
  assert.deepEqual(await disconnectEnd, { type: 'ended', callId: liveCall.callId, reason: 'disconnected' });

  const callerAgain = await connect(url);
  const callerAgainInfo = await register(callerAgain, token('8'));
  assert.equal(callerAgainInfo.number, callerInfo.number);
  callerAgain.send(JSON.stringify({ type: 'call', to: calleeInfo.number }));
  assert.equal((await waitFor(callerAgain, (message) => message.type === 'ringing')).peer, calleeInfo.number);
});

test('relay-only requires TURN config and TURN REST credentials are time-limited', async () => {
  await assert.rejects(createSignalingServer({ dataFile: join(tmpdir(), 'unused-identities.json'), env: { RELAY_ONLY: 'true' } }), /RELAY_ONLY requires TURN_URLS/);
  const { url } = await setup({ env: { RELAY_ONLY: 'true', TURN_URLS: 'turn:relay.example:3478', TURN_SECRET: 'test-secret', STUN_URLS: 'stun:ignored.example' } });
  const socket = await connect(url);
  const registered = await register(socket, token('c'));
  assert.equal(registered.relayOnly, true);
  assert.deepEqual(registered.iceServers.map(({ urls }) => urls), [['turn:relay.example:3478']]);
  const [username, number] = registered.iceServers[0].username.split(':');
  assert.equal(number, registered.number);
  assert.ok(Number(username) > Math.floor(Date.now() / 1000));
  assert.equal(typeof registered.iceServers[0].credential, 'string');
});

test('registration deadline closes unauthenticated sockets and duplicate login replaces old session', async () => {
  const { url } = await setup({ registrationTimeoutMs: 500 });
  const idle = await connect(url);
  assert.equal((await waitFor(idle, (message) => message.type === 'error')).code, 'registration_timeout');
  await waitForClose(idle);

  const oldSocket = await connect(url);
  const oldIdentity = await register(oldSocket, token('d'));
  const peer = await connect(url);
  const peerIdentity = await register(peer, token('e'));
  const [ringing] = await startCall(oldSocket, peer, peerIdentity.number);
  const ended = waitFor(peer, (message) => message.type === 'ended');

  const replacement = await connect(url);
  const replacedError = waitFor(oldSocket, (message) => message.type === 'error' && message.code === 'replaced');
  const replacementIdentity = await register(replacement, token('d'));
  assert.equal(replacementIdentity.number, oldIdentity.number);
  assert.equal((await replacedError).code, 'replaced');
  assert.deepEqual(await ended, { type: 'ended', callId: ringing.callId, reason: 'disconnected' });
  await waitForClose(oldSocket);
});

function waitForClose(socket) {
  if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => socket.once('close', resolve));
}
