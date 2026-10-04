# Self-hosted push without Firebase

The signaling server sends generic wake-up hints directly to an operator-approved HTTPS endpoint. It does not use Firebase Admin, FCM credentials, Google service accounts, or a Google push API. Message delivery and call signaling still rely on the authenticated signaling connection and the durable mailbox; push is only a request for the client to reconnect and sync.

## Server setup

Run ntfy (or a compatible HTTP push gateway) on a public HTTPS origin and configure that exact origin on the signaling server:

```sh
PUSH_ALLOWED_ORIGINS=https://push.example.org
```

Multiple origins may be comma-separated. The default is empty, which disables push without disabling offline message storage. See [`../deploy/ntfy.yml.example`](../deploy/ntfy.yml.example) for a minimal ntfy configuration. The gateway origin must resolve to public addresses. The server checks DNS during registration and before every send, rejects any private/reserved DNS result, pins its HTTPS connection to the checked address, and does not follow redirects.

## API v8 endpoint registration

After authenticating the account over `/signal`, a version-8 client registers its own high-entropy topic URL:

```json
{ "type": "push_register", "endpoint": "https://push.example.org/7Yz5jKQmF0sBvN3xA2wPqLrT" }
```

The endpoint must use HTTPS, match one configured origin exactly, contain no credentials/query/fragment, and have a single ASCII topic path component (16–64 letters, digits, `_` or `-`). Use at least 20 random bytes for the topic. The server stores the URL against the authenticated account in the existing mode-`0600` `${DATA_FILE}.push.json` file and responds with `push_registered`. Version-7 `{ "type": "push_register", "token": "..." }` messages are rejected; existing FCM token strings in that old file are ignored and cleared on startup, while identity numbers, bundles, mailbox contents, and admin settings remain separate and unchanged.

The signaling server sends a direct HTTP POST to the registered URL, with a JSON body containing exactly `kind` and `id`:

```json
{ "kind": "message", "id": "<uuid>" }
```

`kind` is `message`, `call`, or `call_ended`. The server does not send message text, ciphertext, peer names/numbers, or media credentials. Delivery uses a five-second timeout; redirects are treated as errors, and 404/410 removes the stale endpoint. No endpoint is created or accepted when push is disabled. ntfy accepts messages using HTTP POST to a topic URL; see the [official publishing documentation](https://docs.ntfy.sh/publish/).

## Client and privacy limits

The app must integrate with a compatible push distributor, register the endpoint it receives, handle the generic wake-up, then reconnect and run inbox sync. This backend API alone does not install/configure a distributor or make Android restart a force-stopped app; those are client, OS, and device-policy responsibilities. Network loss, notification permission, battery restrictions, and gateway availability can delay or prevent a wake-up.

The wake-up body is deliberately small and does not contain chat content, but the push gateway can observe that an account has activity and correlate message/call IDs. Topic URLs are bearer capabilities: anyone who obtains one may publish or subscribe to that topic. Use random topics, HTTPS, restrict access to the push host, and protect the endpoint store and backups. The gateway receives the opaque JSON body in plaintext; this is not end-to-end encryption for push metadata.
