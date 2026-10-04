# Android background push with UnifiedPush

Line uses the official UnifiedPush Android connector (`org.unifiedpush.android:connector:3.3.5`), not Firebase Messaging. Push delivery requires a separate UnifiedPush distributor app on the device and a signaling server that can send to the registered endpoint. The connector SDK is pinned to the latest release in Maven Central metadata; see the [connector documentation](https://unifiedpush.org/kdoc/connector/) and [Maven metadata](https://repo.maven.apache.org/maven2/org/unifiedpush/android/connector/maven-metadata.xml).

## Device setup

1. Install the official [ntfy Android app from F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) or its [official direct download](https://ntfy.sh/). ntfy acts as the UnifiedPush distributor; it is a separate app, not embedded in Line.
2. Open ntfy, choose its default service or configure your own HTTPS ntfy server, and allow its background operation and notifications. For self-hosting, follow the [ntfy server guide](https://docs.ntfy.sh/install/).
3. In Line's UnifiedPush settings, select the installed distributor; Line saves it and requests registration. The app does not silently choose a provider or try to open a provider-selection screen during startup. A previously selected provider is re-registered at app startup when still installed.

The connector discovers distributors through Android's package manager. The app's configuration API exposes each provider as `(packageName, humanLabel)`. Its status never includes the endpoint. `forget(context)` unregisters and clears the local selection and endpoint.

## App/server contract

When the distributor issues an endpoint, Line stores only a validated HTTPS URL in private app preferences. URLs containing user information, query parameters, or fragments are rejected. Treat endpoints as bearer secrets: do not show or log them. On the next authenticated signaling connection, protocol 8 registers `{ "endpoint": "https://…" }` with the existing `push_register` message. The backend must support UnifiedPush endpoint registration and delivery; this Android change does not modify the server or its stored data.

Send only a small JSON payload with exactly the `kind` and `id` keys. `id` must be a UUID. Supported kinds are `message`, `call`, and `call_ended`. The connector delivers message content to the app; Line ignores unknown kinds, malformed data, extra fields, and non-UUID IDs. Do not include message text, phone numbers, call media, credentials, or URLs.

For backend safety, validate endpoint URLs again server-side and allowlist approved HTTPS push-service hosts rather than accepting arbitrary client-supplied destinations. Never log endpoint values. Configure the allowlist to match the distributor's selected push server, including a self-hosted ntfy host when used.

Push is a wake-up hint, not a message transport or a delivery guarantee. Line posts generic private notifications and queues the existing bounded inbox worker, which waits up to 20 seconds for the existing service connection and up to 10 seconds for inbox synchronization. The authenticated service and its encrypted inbox remain authoritative. Android may defer background work because of force-stop, network loss, battery policies, or manufacturer restrictions; no zero-latency guarantee is possible.

## API and implementation

`PushConfiguration` exposes `isConfigured(ctx)`, `status(ctx)`, `distributors(ctx)`, `selectDistributor(ctx, packageName)`, `requestRegistration(ctx)`, suspendable `endpoint(ctx)`, and `forget(ctx)`. Distributor entries are `(packageName, humanLabel)` pairs. The non-exported `LineUnifiedPushService` receives SDK events using `org.unifiedpush.android.connector.PUSH_EVENT`; it is not an app-owned foreground service. Incoming events are restricted to Line's registration instance. The connector's own receiver validates and forwards distributor events to this service.

No Firebase client configuration or Google Play services is required by this client integration. Actual background delivery still depends on an installed distributor and server-side UnifiedPush support.
