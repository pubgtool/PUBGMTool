package app.line

import android.Manifest
import android.annotation.SuppressLint
import android.app.*
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.*
import android.os.*
import app.line.crypto.ChatMessage
import app.line.crypto.SecureStore
import app.line.media.LiveCallEngine
import app.line.media.MediaEvent
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import okhttp3.*
import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom
import java.util.UUID

class CallService : Service() {
    inner class LocalBinder : Binder() { val service get() = this@CallService }
    private val binder = LocalBinder()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val listeners = mutableSetOf<(CallState) -> Unit>()
    private val prefs by lazy { getSharedPreferences("line", MODE_PRIVATE) }
    private val secure by lazy { scope.async(Dispatchers.IO) { SecureStore(this@CallService) } }
    private var http: OkHttpClient? = null
    private var socket: WebSocket? = null
    private var generation = 0
    private var retryJob: Job? = null
    private val lookups = mutableMapOf<String, CompletableDeferred<JSONObject>>()
    private val adminRequests = mutableMapOf<String, CompletableDeferred<JSONObject>>()
    private var adminExpiresAt = 0L
    private var adminEpoch = 0
    private val incoming = Channel<Pair<Int, JSONObject>>(64)
    private val chatEnvelopeIds = mutableSetOf<String>()
    private var callId = ""
    private var callRoom = ""
    private var owner = ""
    private var roomKey: ByteArray? = null
    private val pendingKeys = mutableMapOf<String, JSONObject>()
    private var engine: LiveCallEngine? = null
    private var foreground = false
    private var wakeLock: PowerManager.WakeLock? = null
    private var callTimeout: Job? = null
    private var registrationTimeout: Job? = null
    private val network by lazy { getSystemService(ConnectivityManager::class.java) }
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onLost(lost: Network) {
            scope.launch {
                delay(500)
                val active = network.activeNetwork
                if (active == null || network.getNetworkCapabilities(active)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) != true) {
                    if (state.phase != Phase.IDLE) finish("Интернет отключён. Звонок завершён")
                }
            }
        }
    }
    var state = CallState()
        private set

    override fun onCreate() {
        super.onCreate()
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel("calls", "Активный звонок", NotificationManager.IMPORTANCE_LOW))
        state = state.copy(number = prefs.getString("number", "") ?: "", configReady = config() != null,
            highQuality = prefs.getBoolean("high_quality", true))
        network.registerDefaultNetworkCallback(networkCallback)
        scope.launch {
            for ((epoch, message) in incoming) {
                if (epoch != generation) continue
                try { receive(message) }
                catch (cancelled: CancellationException) { throw cancelled }
                catch (_: Exception) {
                    if (message.optString("type") == "envelope") {
                        update(state.copy(message = "Неверное или повторное зашифрованное сообщение отклонено"))
                    } else if (state.phase != Phase.IDLE || foreground) finish("Ошибка протокола звонка")
                    else update(state.copy(message = "Неверное сообщение сервера отклонено"))
                }
            }
        }
        work { secure.await(); connect() }
    }

    override fun onBind(intent: Intent): IBinder = binder
    fun observe(listener: (CallState) -> Unit) { listeners.add(listener); listener(state) }
    fun removeObserver(listener: (CallState) -> Unit) { listeners.remove(listener) }

    private fun update(value: CallState) {
        state = value
        listeners.toList().forEach { it(value) }
        if (foreground) getSystemService(NotificationManager::class.java).notify(1, notification())
    }

    private fun work(block: suspend () -> Unit): Job = scope.launch {
        try { block() } catch (cancelled: CancellationException) { throw cancelled }
        catch (_: Exception) {
            if (state.phase != Phase.IDLE || foreground) finish("Ошибка защищённого соединения. Проверьте SAS участников")
            else update(state.copy(message = "Операция не выполнена: проверьте сеть, ключи и SAS"))
        }
    }

    private suspend fun <T> db(block: (SecureStore) -> T): T {
        val store = secure.await()
        return withContext(Dispatchers.IO) { block(store) }
    }

    fun config(): EndpointConfig? = runCatching {
        EndpointConfig(prefs.getString("endpoint", "") ?: "", prefs.getString("api_pins", "") ?: "",
            prefs.getString("media_endpoint", "") ?: "", prefs.getString("media_pins", "") ?: "").also { it.validate() }
    }.getOrNull()

    fun configure(value: EndpointConfig, highQuality: Boolean) {
        if (state.phase != Phase.IDLE) return
        value.validate()
        val old = config()
        require(old == null || old.apiUrl == value.apiUrl) { "Для другого сервера нужен отдельный профиль/очистка данных: номера и доверие не переносятся" }
        prefs.edit().putString("endpoint", value.apiUrl).putString("api_pins", value.apiPins)
            .putString("media_endpoint", value.mediaUrl).putString("media_pins", value.mediaPins)
            .putBoolean("high_quality", highQuality).apply()
        update(state.copy(configReady = true, highQuality = highQuality))
        work { connect() }
    }

    fun reconnectNow() { if (state.phase == Phase.IDLE) work { connect() } }

    fun setQuality(highQuality: Boolean) {
        if (state.phase != Phase.IDLE) return
        prefs.edit().putBoolean("high_quality", highQuality).apply()
        update(state.copy(highQuality = highQuality))
    }

    fun isAdmin(): Boolean = state.online && System.currentTimeMillis() < adminExpiresAt

    suspend fun adminLogin(code: String): JSONObject {
        require(code.length in 12..128 && state.online) { "Подключитесь и введите секретный код" }
        val epoch = adminEpoch
        val result = adminRequest("admin_login", JSONObject().put("code", code))
        if (epoch != adminEpoch) {
            send("admin", JSONObject().put("requestId", UUID.randomUUID().toString()).put("action", "logout"))
            error("Вход отменён")
        }
        val expires = result.optLong("expiresAt")
        check(expires > System.currentTimeMillis()) { "Срок сессии истёк" }
        adminExpiresAt = minOf(expires, System.currentTimeMillis() + 300_000)
        return result
    }

    suspend fun adminCommand(action: String, extra: JSONObject = JSONObject()): JSONObject {
        check(isAdmin()) { "Войдите в админ-панель заново" }
        val response = adminRequest("admin", extra.put("action", action))
        return response.optJSONObject("result") ?: JSONObject()
    }

    fun lockAdmin() {
        adminEpoch++
        if (adminExpiresAt > 0) send("admin", JSONObject().put("requestId", UUID.randomUUID().toString()).put("action", "logout"))
        adminExpiresAt = 0
        adminRequests.values.forEach { it.completeExceptionally(IllegalStateException("Админ-сессия закрыта")) }
        adminRequests.clear()
    }

    private suspend fun adminRequest(type: String, payload: JSONObject): JSONObject {
        require(state.online)
        val id = UUID.randomUUID().toString()
        val request = CompletableDeferred<JSONObject>()
        adminRequests[id] = request
        try {
            check(send(type, payload.put("requestId", id)))
            val response = withTimeout(15_000) { request.await() }
            if (!response.optBoolean("ok")) {
                if (response.optString("error") in setOf("unauthorized", "expired", "invalid_credentials", "admin_disabled")) adminExpiresAt = 0
                error(when (response.optString("error")) {
                    "admin_disabled" -> "Админ-доступ не настроен на сервере"
                    "rate_limited" -> "Слишком много попыток. Подождите минуту"
                    "invalid_credentials" -> "Неверный секретный код"
                    "unauthorized", "expired" -> "Войдите в админ-панель заново"
                    else -> "Сервер отклонил действие"
                })
            }
            return response
        } finally { adminRequests.remove(id) }
    }

    private fun token(): String = prefs.getString("token", null) ?: ByteArray(32).also { SecureRandom().nextBytes(it) }
        .joinToString("") { "%02x".format(it.toInt() and 255) }.also { prefs.edit().putString("token", it).commit() }

    private suspend fun connect() {
        retryJob?.cancel()
        registrationTimeout?.cancel()
        generation++
        lockAdmin()
        val epoch = generation
        socket?.cancel()
        socket = null
        http?.dispatcher?.executorService?.shutdown()
        http?.connectionPool?.evictAll()
        val endpoints = config() ?: run {
            update(state.copy(online = false, mediaReady = false, configReady = false, message = "Подключите Line, чтобы получить номер"))
            return
        }
        val bundle = db { it.publicBundle() }
        http = endpoints.http()
        update(state.copy(online = false, mediaReady = false, message = "Подключение…"))
        socket = http!!.newWebSocket(Request.Builder().url(endpoints.apiUrl).build(), object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                scope.launch { if (epoch == generation) {
                    ws.send(JSONObject().put("type", "register").put("token", token()).put("bundle", bundle).toString())
                    registrationTimeout = scope.launch { delay(15_000); if (!state.online) disconnected(epoch) }
                } }
            }
            override fun onMessage(ws: WebSocket, text: String) {
                scope.launch {
                    if (epoch != generation) return@launch
                    val message = runCatching { JSONObject(text) }.getOrNull() ?: return@launch
                    val requestId = message.optString("requestId")
                    if (requestId.isNotEmpty() && message.optString("type") == "admin_result") {
                        adminRequests.remove(requestId)?.complete(message)
                    } else if (requestId.isNotEmpty() && message.optString("type") == "bundle") {
                        val pending = lookups.remove(requestId)
                        val bundle = message.optJSONObject("bundle")
                        if (bundle != null) pending?.complete(bundle)
                        else pending?.completeExceptionally(IllegalStateException("Invalid bundle"))
                    } else if (requestId.isNotEmpty() && message.optString("type") == "error") {
                        lookups.remove(requestId)?.completeExceptionally(IllegalStateException(message.optString("code")))
                    } else if (!incoming.trySend(epoch to message).isSuccess) disconnected(epoch)
                }
            }
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) { scope.launch { disconnected(epoch) } }
            override fun onClosed(ws: WebSocket, code: Int, reason: String) { scope.launch { disconnected(epoch) } }
        })
    }

    private suspend fun disconnected(epoch: Int) {
        if (epoch != generation) return
        generation++
        lockAdmin()
        registrationTimeout?.cancel()
        socket?.cancel(); socket = null
        lookups.values.forEach { it.completeExceptionally(IllegalStateException("Offline")) }; lookups.clear()
        if (state.phase != Phase.IDLE) finish("Соединение потеряно. Звонок завершён", notifyServer = false)
        update(state.copy(online = false, mediaReady = false, message = "Не удалось подключиться. Проверьте настройки сервиса"))
        retryJob?.cancel()
        retryJob = scope.launch { delay(5_000); connect() }
    }

    private fun send(type: String, extra: JSONObject = JSONObject()): Boolean =
        socket?.send(extra.put("type", type).toString()) == true

    private suspend fun lookup(number: String, consumePreKey: Boolean = true): JSONObject {
        require(number.matches(Regex("[0-9]{8}")) && number != state.number && state.online)
        val id = UUID.randomUUID().toString()
        val pending = CompletableDeferred<JSONObject>()
        lookups[id] = pending
        try {
            check(send("lookup", JSONObject().put("to", number).put("requestId", id).put("consumePreKey", consumePreKey)))
            return withTimeout(15_000) { pending.await() }
        } finally { lookups.remove(id) }
    }

    suspend fun inspectPeer(number: String): String {
        val bundle = lookup(number, consumePreKey = false)
        return db { it.rememberPeer(number, bundle); it.safetyCode(number) }
    }

    suspend fun verified(number: String): Boolean = db { it.isVerified(number) }
    suspend fun verifyPeer(number: String) = db { it.verifyPeer(number) }
    suspend fun messages(number: String, before: Long? = null): List<ChatMessage> = db { it.messages(number, before, 40) }
    suspend fun conversations(before: Long? = null): List<ChatMessage> = db { it.conversations(before, 40) }
    suspend fun deleteMessage(id: String) { db { it.deleteMessage(id) }; chatEnvelopeIds.remove(id); update(state.copy(chatVersion = state.chatVersion + 1)) }
    suspend fun clearConversation(peer: String) { db { it.clearConversation(peer) }; update(state.copy(chatVersion = state.chatVersion + 1)) }

    private suspend fun preparePeer(number: String) {
        val exists = db { it.hasSession(number) }
        val bundle = lookup(number, consumePreKey = !exists)
        db {
            it.rememberPeer(number, bundle)
            check(it.isVerified(number)) { "SAS must be verified" }
            if (!it.hasSession(number)) it.establishSession(number, bundle)
        }
    }

    suspend fun sendChat(number: String, text: String) {
        check(state.chatEnabled) { "Администратор отключил сообщения" }
        require(text.isNotBlank() && text.toByteArray().size <= 4_096)
        preparePeer(number)
        val id = UUID.randomUUID().toString()
        val payload = JSONObject().put("kind", "chat").put("id", id).put("text", text).toString().toByteArray()
        val envelope = db { it.encryptAndQueue(number, id, payload, text) }
        chatEnvelopeIds.add(id)
        check(send("envelope", JSONObject().put("to", number).put("id", id).put("cipherType", envelope.cipherType).put("body", envelope.body)))
        update(state.copy(chatVersion = state.chatVersion + 1))
    }

    private suspend fun receive(message: JSONObject) {
        when (message.getString("type")) {
            "registered" -> {
                registrationTimeout?.cancel()
                val number = message.getString("number")
                require(number.matches(Regex("[0-9]{8}")))
                db { it.setLocalNumber(number) }
                prefs.edit().putString("number", number).apply()
                update(state.copy(number = number, online = true, mediaReady = message.optBoolean("mediaReady"),
                    callsEnabled = message.optBoolean("callsEnabled", true), chatEnabled = message.optBoolean("chatEnabled", true),
                    maxParticipants = message.optInt("maxParticipants", 8).coerceIn(2, 8), message = "В сети"))
                val outbox = db { it.outbox() }
                chatEnvelopeIds.addAll(outbox.map { it.id })
                if (state.chatEnabled) outbox.forEach { send("envelope", JSONObject().put("to", it.peer).put("id", it.id).put("cipherType", it.cipherType).put("body", it.body)) }
            }
            "capabilities" -> {
                update(state.copy(callsEnabled = message.optBoolean("callsEnabled", true), chatEnabled = message.optBoolean("chatEnabled", true),
                    mediaReady = message.optBoolean("mediaReady"), maxParticipants = message.optInt("maxParticipants", 8).coerceIn(2, 8)))
                if (!state.callsEnabled && state.phase != Phase.IDLE) finish("Администратор отключил звонки", false)
            }
            "bundle" -> lookups.remove(message.getString("requestId"))?.complete(message.getJSONObject("bundle"))
            "envelope" -> {
                val from = message.getString("from")
                val id = message.getString("id")
                if (!db { it.isVerified(from) }) {
                    update(state.copy(message = "Сообщение от $from отклонено: сначала сверьте SAS")); return
                }
                val payload = db { it.decryptAndStore(from, message.getInt("cipherType"), message.getString("body"), id) } ?: return
                when (payload.getString("kind")) {
                    "chat" -> {
                        require(payload.getString("id") == id)
                        val text = payload.getString("text")
                        require(text.toByteArray().size <= 4_096)
                        update(state.copy(chatVersion = state.chatVersion + 1, message = "Новое зашифрованное сообщение от $from"))
                    }
                    "call-key" -> {
                        require(payload.getString("owner") == from)
                        val key = android.util.Base64.decode(payload.getString("key"), android.util.Base64.NO_WRAP)
                        require(key.size == 32)
                        val roster = strings(payload.getJSONArray("members"))
                        require(roster.size in 2..8 && roster.distinct().size == roster.size && state.number in roster && from in roster)
                        val idCall = payload.getString("callId")
                        if (pendingKeys.size >= 8) pendingKeys.clear()
                        pendingKeys[idCall] = payload
                        if (callId == idCall) adoptKey()
                    }
                }
                send("keys", JSONObject().put("bundle", db { it.publicBundle() }))
            }
            "sent" -> {
                val id = message.getString("id")
                if (!chatEnvelopeIds.remove(id)) return
                db { it.removeOutbox(id); it.updateMessageStatus(id, "sent") }
                update(state.copy(chatVersion = state.chatVersion + 1))
            }
            "call_created" -> {
                if (state.phase != Phase.OUTGOING) return
                require(message.getString("owner") == state.number)
                require(strings(message.getJSONArray("members")).toSet() == state.members.toSet())
                setupCall(message)
                roomKey = ByteArray(32).also { SecureRandom().nextBytes(it) }
                val payload = JSONObject().put("kind", "call-key").put("callId", callId).put("room", callRoom)
                    .put("owner", owner).put("members", JSONArray(state.members))
                    .put("key", android.util.Base64.encodeToString(roomKey, android.util.Base64.NO_WRAP))
                for (number in state.members.filter { it != state.number }) {
                    preparePeer(number)
                    val id = UUID.randomUUID().toString()
                    val encrypted = db { it.encrypt(number, payload.toString().toByteArray()) }
                    check(send("envelope", JSONObject().put("to", number).put("id", id).put("cipherType", encrypted.cipherType).put("body", encrypted.body)))
                }
                check(send("join_call", JSONObject().put("callId", callId)))
                update(state.copy(phase = Phase.CONNECTING, message = "Соединяем зашифрованную группу…"))
            }
            "incoming" -> {
                if (state.phase != Phase.IDLE) return
                setupCall(message)
                update(state.copy(phase = Phase.INCOMING, peer = owner, message = "Входящий групповой звонок"))
                adoptKey()
            }
            "room_grant" -> {
                require(message.getString("callId") == callId && message.getString("room") == callRoom)
                require(strings(message.getJSONArray("members")).toSet() == state.members.toSet())
                require(message.getString("owner") == owner)
                val endpoints = config() ?: error("No endpoints")
                require(message.getString("url").trimEnd('/') == endpoints.mediaUrl.trimEnd('/'))
                val key = roomKey ?: error("Missing E2EE key")
                val epochCall = callId
                engine = LiveCallEngine(this, scope) { event -> work { if (callId == epochCall && epochCall.isNotEmpty()) mediaEvent(event) } }
                update(state.copy(phase = Phase.CONNECTING, message = "LiveKit · устанавливаем E2EE…"))
                engine!!.connect(endpoints.mediaUrl, message.getString("token"), key, http!!, state.highQuality)
            }
            "ended" -> if (message.optString("callId") == callId) finish("Групповой звонок завершён", false)
            "error" -> {
                val request = message.optString("requestId")
                lookups.remove(request)?.completeExceptionally(IllegalStateException(message.optString("code")))
                val id = message.optString("id")
                if (id in chatEnvelopeIds) {
                    db { it.updateMessageStatus(id, "failed") }
                    update(state.copy(chatVersion = state.chatVersion + 1, message = "Сообщение не отправлено: адресат недоступен"))
                }
                if (message.optString("code") == "replaced") {
                    generation++; socket?.cancel(); socket = null
                    finish("Учётная запись открыта на другом устройстве", false)
                    update(state.copy(online = false))
                } else if (request.isEmpty() && id.isEmpty() && state.phase != Phase.IDLE) finish("Звонок невозможен: участник недоступен или LiveKit не настроен")
            }
        }
    }

    private fun strings(array: JSONArray): List<String> = (0 until array.length()).map { array.getString(it) }

    private fun setupCall(message: JSONObject) {
        callId = message.getString("callId")
        callRoom = message.getString("room")
        owner = message.getString("owner")
        val members = strings(message.getJSONArray("members"))
        require(members.size in 2..8 && members.distinct().size == members.size && state.number in members && owner in members)
        update(state.copy(members = members))
        callTimeout?.cancel()
        callTimeout = scope.launch { delay(45_000); if (state.phase != Phase.CONNECTED) finish("Нет ответа или соединения. Звонок завершён") }
    }

    private fun adoptKey() {
        val payload = pendingKeys[callId] ?: return
        require(payload.getString("room") == callRoom && payload.getString("owner") == owner)
        require(strings(payload.getJSONArray("members")).toSet() == state.members.toSet())
        roomKey = android.util.Base64.decode(payload.getString("key"), android.util.Base64.NO_WRAP)
        pendingKeys.remove(callId)
    }

    private suspend fun mediaEvent(event: MediaEvent) {
        when (event) {
            is MediaEvent.Connected -> {
                callTimeout?.cancel()
                update(state.copy(phase = Phase.CONNECTED, connectedAt = SystemClock.elapsedRealtime(), message = "Голос E2EE · ${if (state.highQuality) "Opus HQ" else "Opus речь"}"))
            }
            is MediaEvent.Participants -> {
                require(event.numbers.all { it in state.members }) { "Unexpected room participant" }
                update(state.copy(participants = event.numbers))
            }
            is MediaEvent.Disconnected -> if (state.phase != Phase.IDLE) finish("Медиасоединение потеряно. Звонок завершён")
            is MediaEvent.Failed -> finish("Ошибка E2EE или медиасервера. Звонок завершён")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "dial", "accept" -> {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { stopSelf(); return START_NOT_STICKY }
                if (!foreground) {
                    if (Build.VERSION.SDK_INT >= 30) startForeground(1, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
                    else startForeground(1, notification())
                    foreground = true
                }
                work {
                    if (intent.action == "dial" && state.phase == Phase.IDLE) {
                        val members = intent.getStringArrayListExtra("members")?.distinct() ?: emptyList()
                        require(members.size in 1 until state.maxParticipants && state.number !in members && state.online && state.mediaReady && state.callsEnabled)
                        update(state.copy(phase = Phase.OUTGOING, peer = members.joinToString(", "), members = listOf(state.number) + members, message = "Создаём группу…"))
                        withTimeout(20_000) { for (number in members) preparePeer(number) }
                        acquireWakeLock()
                        check(send("create_call", JSONObject().put("members", JSONArray(members))))
                        callTimeout = scope.launch { delay(45_000); if (state.phase != Phase.CONNECTED) finish("Не удалось установить звонок") }
                    } else if (intent.action == "accept" && state.phase == Phase.INCOMING) {
                        require(state.members.filter { it != state.number }.all { verified(it) }) { "Verify SAS for all participants" }
                        withTimeout(10_000) { while (roomKey == null) { adoptKey(); delay(100) } }
                        acquireWakeLock()
                        update(state.copy(phase = Phase.CONNECTING, message = "Соединяем…"))
                        check(send("join_call", JSONObject().put("callId", callId)))
                    } else if (state.phase == Phase.IDLE) finish("Готов к звонку")
                }
            }
            "mute" -> toggleMute()
            "hangup" -> hangup()
        }
        return START_NOT_STICKY
    }

    @SuppressLint("WakelockTimeout")
    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        wakeLock = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Line:group-call")
            .apply { acquire() }
    }

    fun toggleMute() { work {
        if (state.phase != Phase.CONNECTED) return@work
        val muted = !state.muted
        engine?.setMuted(muted)
        update(state.copy(muted = muted))
    } }

    fun toggleSpeaker() {
        if (state.phase != Phase.CONNECTED) return
        val enabled = !state.speaker
        engine?.setSpeaker(enabled)
        update(state.copy(speaker = enabled))
    }

    fun hangup() { work {
        val pending = state.phase == Phase.OUTGOING && callId.isEmpty()
        finish("Звонок завершён")
        if (pending) connect()
    } }

    private suspend fun finish(message: String, notifyServer: Boolean = true) {
        callTimeout?.cancel(); callTimeout = null
        if (notifyServer && callId.isNotEmpty()) send(if (state.phase == Phase.INCOMING) "decline_call" else "leave_call", JSONObject().put("callId", callId))
        callId = ""; callRoom = ""; owner = ""
        roomKey?.fill(0); roomKey = null; pendingKeys.clear()
        val oldEngine = engine; engine = null
        update(state.copy(phase = Phase.IDLE, peer = "", members = emptyList(), participants = emptyList(),
            muted = false, speaker = false, connectedAt = 0, safetyCode = "", message = message))
        oldEngine?.disconnect()
        if (wakeLock?.isHeld == true) wakeLock?.release()
        wakeLock = null
        foreground = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun notification(): Notification {
        fun action(name: String, code: Int) = PendingIntent.getService(this, code,
            Intent(this, CallService::class.java).setAction(name), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, "calls").setSmallIcon(R.drawable.ic_line)
            .setContentTitle("Line · групповой звонок")
            .setContentText(if (state.muted) "Микрофон выключен" else if (state.phase == Phase.CONNECTED) "В звонке" else "Соединяем…")
            .setContentIntent(PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE))
            .setOngoing(true).setCategory(Notification.CATEGORY_CALL).setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(Notification.Action.Builder(null, "Микрофон", action("mute", 1)).build())
            .addAction(Notification.Action.Builder(null, "Завершить", action("hangup", 2)).build()).build()
    }

    override fun onDestroy() {
        lockAdmin()
        generation++
        incoming.close()
        socket?.cancel(); socket = null
        if (wakeLock?.isHeld == true) wakeLock?.release()
        wakeLock = null
        runCatching { network.unregisterNetworkCallback(networkCallback) }
        roomKey?.fill(0); roomKey = null
        val oldEngine = engine
        engine = null
        scope.launch {
            try { oldEngine?.disconnect(); if (secure.isCompleted && !secure.isCancelled) withContext(Dispatchers.IO) { secure.await().close() } }
            finally { scope.cancel() }
        }
        http?.dispatcher?.executorService?.shutdown(); http?.connectionPool?.evictAll()
        listeners.clear()
        super.onDestroy()
    }
}
