# RTC signaling server

Node 24 ESM service. It provides the WebSocket signaling/control plane only; audio/video is peer-to-peer WebRTC, with TURN relay available when configured. It does not record or log installation tokens, SDP, or ICE candidates.

## Run locally

```sh
cd server
npm install
npm test
npm start
```

The service listens on `0.0.0.0:3000`. `GET /health` returns `{"status":"ok"}`; the only WebSocket endpoint is `/signal`. Put it behind a TLS reverse proxy in deployment; this server itself serves plain HTTP and WebSocket only.

Configuration is via environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATA_FILE` | `server/data/identities.json` | Persistent JSON mapping of SHA-256 installation-token hashes to 8-digit numbers. Protect this file and back it up; raw tokens are not stored. |
| `STUN_URLS` | `stun:stun.l.google.com:19302` | Comma-separated STUN URLs. |
| `TURN_URLS` | unset | Comma-separated TURN URLs. |
| `TURN_SECRET` | unset | Coturn REST shared secret; generates HMAC-SHA1 credentials with an expiry username. Requires `TURN_URLS`. |
| `TURN_CREDENTIAL_TTL_SECONDS` | `86400` | REST credential lifetime, from 60 to 604800 seconds. |
| `TURN_USERNAME`, `TURN_PASSWORD` | unset | Static TURN credential fallback; configure both with `TURN_URLS`. Prefer `TURN_SECRET` for production. |
| `RELAY_ONLY` | `false` | Set to literal `true` to return TURN servers only and fail startup unless TURN is configured. The client must also enforce `iceTransportPolicy: "relay"`. |

Registration allocates a random 8-digit number, persisted with the token hash; duplicate numbers are checked before assignment. The single-process JSON store is suitable for a small deployment, not concurrent replicas. Limits are 1,000 connected sockets, 100,000 identities, 30 registration attempts per source IP per minute, 40 messages per connection per second, 64 KiB per WebSocket message, and a 10-second registration deadline. Calls are one-at-a-time per connected identity and unanswered calls expire after 45 seconds. These in-memory limits and call state reset on restart; deploy one signaling instance or add coordinated storage/rate limits before scaling horizontally. Source IP comes from the TCP peer, not forwarded headers; configure proxy-level rate limits as appropriate.

The server only routes validated signaling between members of an accepted call and retains no SDP/candidate data. This signaling design does not itself provide end-to-end encryption for signaling or guarantee private media: WebRTC uses DTLS-SRTP, while IP metadata is visible to peers and the signaling/TURN infrastructure. Use TLS for the signaling connection and trusted TURN infrastructure; do not describe the service as untrackable or anonymous.
