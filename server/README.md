# LINE signaling and encrypted relay

Node 24 service for registration, public Signal key-bundle discovery, transient encrypted-message delivery, and fixed-roster LiveKit audio rooms. The server never receives private identity/session keys, plaintext chat, SDP, or media. It does retain public bundles and account-to-number mappings, and transiently processes routing metadata; it is not anonymous or zero-metadata.

## Run and test

```sh
cd server
npm ci
npm test
npm start
```

The service listens on `0.0.0.0:3000`. `GET /` and `/health` return only `{"status":"ok"}`. WebSocket signaling is served at `/signal`; terminate TLS at a trusted reverse proxy and use `wss://` from clients.

## Configuration

| Variable | Meaning |
| --- | --- |
| `DATA_FILE` | Persistent versioned JSON store. Defaults to `server/data/identities.json`; contains SHA-256 installation-token hashes, 8-digit numbers, and public key bundles only. |
| `PORT`, `HOST` | HTTP listen port and interface; defaults to `3000` and `0.0.0.0`. |
| `LIVEKIT_URL` | Public LiveKit WebSocket URL, for example `wss://rtc.example.org`. |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Server-only LiveKit credentials. Keep the secret off clients. If any media setting is missing or invalid, registration and messaging still work but joining returns `media_not_configured`. |
| `ADMIN_PASSWORD_HASH` | Optional scrypt verifier (`scrypt$<salt-base64>$<digest-base64>`). Admin access is disabled when missing or malformed; never configure a plaintext admin code. |
| `ADMIN_DATA_FILE` | Persistent admin settings and blocklist. Defaults to `${DATA_FILE}.admin.json`; atomic writes use mode `0600`, and an invalid existing file stops startup rather than silently resetting controls. |

Room access tokens are signed by `livekit-server-sdk` 2.19.1 with a 120-second TTL. Each grant is restricted to one roster room, allows microphone publishing and subscription, and disallows data publishing. LiveKit API secrets are never returned to clients. Chat and signaling work without LiveKit being configured; the backend will not issue placeholder media tokens.

The JSON store is written by an atomic rename with mode `0600`. Version-1 stores containing `{ "version": 1, "identities": { "<token hash>": "<number>" } }` are accepted. The next successful registration with a public bundle writes version 2 and preserves that installation's existing number. The store is a single-process file; do not run multiple API replicas against it. Back up the file securely.

### Admin bootstrap and access

Create a code with at least 12 characters and set only its scrypt hash in the service environment. The helper reads the code from standard input (hidden for terminal input) and prints only the hash:

```sh
cd server
read -r -s -p 'Admin passphrase: ' ADMIN_CODE; printf '\n'
export ADMIN_PASSWORD_HASH="$(printf '%s' "$ADMIN_CODE" | node scripts/hash-admin-password.mjs)"
unset ADMIN_CODE
npm start
```

Store the resulting hash in the server's protected environment configuration, not in source control or a client. Put the service behind HTTPS/WSS at a trusted reverse proxy; mobile clients must use the pinned `wss://` endpoint. Admin login is sent over the existing `/signal` WebSocket as `{ "type": "admin_login", "requestId": "550e8400-e29b-41d4-a716-446655440000", "code": "<passphrase>" }`. A valid login replies with `admin_result`, `ok: true`, and `expiresAt` (milliseconds since epoch). Sessions expire after five minutes and are tied to that socket; reconnecting requires a new login. Five failed attempts per peer address in one minute trigger a one-minute lock. Do not trust `X-Forwarded-For` for this limit.

After login, send `{ "type": "admin", "requestId": "550e8400-e29b-41d4-a716-446655440000", "action": "status" }`. The response contains settings, aggregate online/registered/call metrics, blocked numbers, active call IDs and participant counts, and a maximum of 100 recent event records. Logs contain only fixed event/outcome labels and timestamps—no message bodies, credentials, numbers, addresses, or media data. Other actions are `update_settings` with a partial object of `callsEnabled`, `chatEnabled`, `registrationEnabled`, and/or `maxParticipants` (2–8); `block`/`unblock` with an existing 8-digit `number`; `end_call` with a `callId`; `clear_events`; and `logout`. Successful setting changes are persisted and broadcast as `capabilities`; turning calls off immediately ends active calls, chat-off blocks key publication/lookups and ciphertext relay, registration-off prevents new installations only, and blocking persists and disconnects that account. A blocked account cannot be blocked by its own session.


Admin login is available only on a normally registered WebSocket connection; admin authorization then applies only to that same live socket.

The defaults preserve existing service behavior. Admin controls and state are single-process, as is the identity store. Protect backups and server files; changing or deleting the admin JSON directly is an operator recovery action.

## WebSocket protocol

All messages are JSON text. Registration is required within 10 seconds. Maximum WebSocket message size is 64 KiB; requests are limited to 40 per socket per second. Store operations are serialized through a bounded queue. No client content or credentials are logged.

### Register and publish keys

```json
{
  "type": "register",
  "token": "<64 lowercase hex characters>",
  "bundle": {
    "identityKey": "<base64>",
    "registrationId": 123,
    "signedPreKey": { "id": 1, "publicKey": "<base64>", "signature": "<base64>" },
    "kyberPreKey": { "id": 2, "publicKey": "<base64>", "signature": "<base64>" },
    "preKeys": [{ "id": 3, "publicKey": "<base64>" }]
  }
}
```

Success includes `{ "type": "registered", "number": "12345678", "mediaReady": true, "callsEnabled": true, "chatEnabled": true, "registrationEnabled": true, "maxParticipants": 8 }`. `mediaReady` reflects valid LiveKit configuration, not network availability. `keys` with the same bundle shape updates the registered user's public bundle; changing `identityKey` is rejected. Prekey IDs must increase monotonically: a persisted high-water mark prevents registration/key updates from republishing issued keys. The server validates structure/encoding, not signatures; clients verify signatures and compare SAS out of band. A `lookup` normally consumes exactly one prekey and returns it as `bundle.preKey` (also in a one-element legacy `preKeys` array). For SAS and existing sessions, send `consumePreKey: false`: only public identity/signed/Kyber keys are returned without consuming a key or requiring a nonempty pool. Consuming an empty pool returns `prekeys_exhausted`; unknown numbers return `not_found`.

### Encrypted messages

```json
{ "type": "envelope", "to": "12345678", "id": "550e8400-e29b-41d4-a716-446655440000", "cipherType": 2, "body": "<base64 ciphertext>" }
```

Only ciphertext bodies of up to 24 KiB decoded are accepted. An online recipient receives `{ "type": "envelope", "from": "87654321", "id": "550e8400-e29b-41d4-a716-446655440000", "cipherType": 2, "body": "<base64 ciphertext>" }`; the sender receives `{ "type": "sent", "id": "550e8400-e29b-41d4-a716-446655440000" }`. An offline target returns `{ "type": "error", "code": "offline", "id": "550e8400-e29b-41d4-a716-446655440000" }` with no persistence or offline queue. Sender/id duplicates are transiently deduplicated in bounded memory; they are never stored across restart. Delivery acknowledgements confirm relay only, not recipient persistence or display.

### Fixed-roster group audio calls

```json
{ "type": "create_call", "members": ["12345678", "87654321"] }
```

One to seven distinct online numbers other than the caller are allowed, for a maximum room size of eight. All invitees must be online and not in another call. `call_created` goes to the owner and `incoming` to each invitee, each carrying the same `{ "callId": "550e8400-e29b-41d4-a716-446655440001", "room": "line-550e8400-e29b-41d4-a716-446655440001", "members": ["<owner>", "..."], "owner": "<owner>" }`. Rosters cannot change. Each member sends `{ "type": "join_call", "callId": "550e8400-e29b-41d4-a716-446655440001" }` and receives `room_grant` with that fixed roster, public LiveKit URL, and a short-lived room-scoped token. Outsiders cannot get a token. `leave_call`, `decline_call`, any participant disconnect, or a 45-second invite deadline ends the entire call and triggers best-effort LiveKit room deletion; a new call always gets a new UUID and room. The timeout is cleared only after every roster member requests a grant.

An unset/invalid LiveKit configuration makes `join_call` return `media_not_configured`; token-service errors return `media_unavailable`. Network changes on clients should close their WebSocket promptly; dead transports are also detected by heartbeat.

## Security boundaries

- Chat E2EE is a client responsibility: clients must implement the Signal Protocol Double Ratchet, generate and keep private keys on-device, verify published key signatures, and use SAS verification. This service stores public bundles and forwards opaque ciphertext only; it cannot attest that client messages are actually encrypted.
- Media encryption is also a client responsibility. LiveKit's room token does **not** enable E2EE by itself. Every client must configure LiveKit E2EE/Insertable Streams with a fresh call key held only by participants and verified key/SAS exchange. Do not enable recording, egress, or untrusted room agents if the privacy model forbids them.
- WebRTC transport encryption alone is not end-to-end encryption through an SFU. LiveKit and TURN still observe connection/participant metadata and IP addresses; the signaling service sees installation numbers, call rosters, online status, and message-routing timing. The service is not untrackable and must not be described as hiding all metadata.
- Use TLS for both API and LiveKit WebSocket endpoints. Mobile clients should pin SPKI public keys for each host with a staged backup pin and a tested rotation/release plan; do not pin short-lived leaf certificates without an overlap strategy. See [`deploy/README.md`](../deploy/README.md).

The process defaults to a single Node instance with limits of 1,000 sockets, 100,000 identities, 30 registration attempts per source IP per minute, and a 1,000-operation persistence queue. In-memory calls, deduplication, and rate limits reset on restart. Scale-out requires coordinated identity storage, one-time-prekey consumption, call state, deduplication, and rate limits.
