package app.line

import android.Manifest
import android.annotation.SuppressLint
import android.app.*
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.*
import okhttp3.*
import org.json.JSONObject
import org.webrtc.*
import org.webrtc.audio.JavaAudioDeviceModule
import java.security.SecureRandom
import java.util.concurrent.TimeUnit

class CallService : Service() {
    inner class LocalBinder : Binder() { val service get() = this@CallService }
    private val binder = LocalBinder()
    private val main = Handler(Looper.getMainLooper())
    private val listeners = mutableSetOf<(CallState) -> Unit>()
    private val prefs by lazy { getSharedPreferences("line", MODE_PRIVATE) }
    private val http = OkHttpClient.Builder().pingInterval(20, TimeUnit.SECONDS).build()
    private var socket: WebSocket? = null
    private var generation = 0
    private var retry = 0
    private var callId = ""
    private var caller = false
    private var foreground = false
    private var factory: PeerConnectionFactory? = null
    private var device: JavaAudioDeviceModule? = null
    private var peerConnection: PeerConnection? = null
    private var source: AudioSource? = null
    private var track: AudioTrack? = null
    private val pendingIce = mutableListOf<IceCandidate>()
    private var iceServers = emptyList<PeerConnection.IceServer>()
    private var relayOnly = false
    private var wakeLock: PowerManager.WakeLock? = null
    private val audio by lazy { getSystemService(AudioManager::class.java) }
    private var focus: AudioFocusRequest? = null
    private var oldMode = AudioManager.MODE_NORMAL
    private var oldSpeaker = false
    private val callTimeout = Runnable { finish("Не удалось установить соединение") }
    private val reconnect = Runnable { connect() }
    var state = CallState()
        private set

    override fun onCreate() {
        super.onCreate()
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel("calls", "Активный звонок", NotificationManager.IMPORTANCE_LOW)
        )
        state = state.copy(number = prefs.getString("number", "") ?: "")
        connect()
    }

    override fun onBind(intent: Intent): IBinder = binder

    fun observe(listener: (CallState) -> Unit) { listeners.add(listener); listener(state) }
    fun removeObserver(listener: (CallState) -> Unit) { listeners.remove(listener) }

    private fun update(value: CallState) {
        state = value
        listeners.toList().forEach { it(value) }
        if (foreground) getSystemService(NotificationManager::class.java).notify(1, notification())
    }

    fun setEndpoint(endpoint: String) {
        if (state.phase != Phase.IDLE || !Security.validEndpoint(endpoint)) return
        prefs.edit().putString("endpoint", endpoint).remove("number").apply()
        update(state.copy(number = ""))
        retry = 0
        connect()
    }

    private fun token(): String {
        prefs.getString("token", null)?.let { return it }
        val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
        return bytes.joinToString("") { "%02x".format(it.toInt() and 255) }.also {
            prefs.edit().putString("token", it).commit()
        }
    }

    private fun connect() {
        main.removeCallbacks(reconnect)
        generation++
        val epoch = generation
        socket?.cancel()
        socket = null
        val endpoint = prefs.getString("endpoint", "") ?: ""
        if (!Security.validEndpoint(endpoint)) return
        update(state.copy(online = false, message = "Подключение к серверу…"))
        socket = http.newWebSocket(Request.Builder().url(endpoint).build(), object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                main.post { if (epoch == generation) webSocket.send(JSONObject().put("type", "register").put("token", token()).toString()) }
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                main.post {
                    if (epoch == generation) runCatching { receive(JSONObject(text)) }
                        .onFailure { finish("Ошибка протокола соединения") }
                }
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                main.post { if (epoch == generation) disconnected() }
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                main.post { if (epoch == generation) disconnected() }
            }
        })
    }

    private fun disconnected() {
        if (state.phase != Phase.IDLE) finish("Соединение с сервером потеряно")
        update(state.copy(online = false, message = "Сервер недоступен. Повторное подключение…"))
        main.removeCallbacks(reconnect)
        main.postDelayed(reconnect, (1L shl retry.coerceAtMost(5)) * 1000)
        retry++
    }

    private fun send(type: String, extra: JSONObject = JSONObject()): Boolean {
        extra.put("type", type)
        if (callId.isNotEmpty()) extra.put("callId", callId)
        return socket?.send(extra.toString()) == true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "dial", "accept" -> {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    stopSelf(); return START_NOT_STICKY
                }
                if (!foreground) {
                    if (Build.VERSION.SDK_INT >= 30) {
                        startForeground(1, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
                    } else startForeground(1, notification())
                    foreground = true
                }
                if (intent.action == "dial" && state.phase == Phase.IDLE) {
                    val number = intent.getStringExtra("number") ?: ""
                    if (!state.online || !number.matches(Regex("[0-9]{8}"))) {
                        finish("Проверьте номер и подключение")
                    } else {
                        caller = true
                        update(state.copy(phase = Phase.OUTGOING, peer = number, message = "Вызываем…"))
                        if (!send("call", JSONObject().put("to", number))) finish("Нет соединения с сервером")
                    }
                } else if (intent.action == "accept" && state.phase == Phase.INCOMING) {
                    caller = false
                    update(state.copy(phase = Phase.CONNECTING, message = "Соединяем…"))
                    if (!send("accept")) finish("Нет соединения с сервером")
                } else if (state.phase == Phase.IDLE) finish("Готов к звонку")
            }
            "mute" -> toggleMute()
            "hangup" -> hangup()
        }
        return START_NOT_STICKY
    }

    private fun receive(message: JSONObject) {
        when (message.getString("type")) {
            "registered" -> {
                val servers = message.getJSONArray("iceServers")
                iceServers = (0 until servers.length()).map { i ->
                    val server = servers.getJSONObject(i)
                    val urls = server.getJSONArray("urls")
                    PeerConnection.IceServer.builder((0 until urls.length()).map { urls.getString(it) })
                        .setUsername(server.optString("username"))
                        .setPassword(server.optString("credential")).createIceServer()
                }
                relayOnly = message.optBoolean("relayOnly")
                val number = message.getString("number")
                prefs.edit().putString("number", number).apply()
                retry = 0
                update(state.copy(number = number, online = true, message = "Готов к звонку"))
            }
            "ringing" -> {
                if (state.phase != Phase.OUTGOING) return
                callId = message.getString("callId")
                update(state.copy(message = "Ждём ответа…"))
            }
            "incoming" -> {
                callId = message.getString("callId")
                caller = false
                update(state.copy(phase = Phase.INCOMING, peer = message.getString("peer"), message = "Входящий звонок"))
            }
            "accepted" -> {
                if (message.optString("callId") != callId) return
                update(state.copy(phase = Phase.CONNECTING, message = "Соединяем…"))
                main.postDelayed(callTimeout, 30_000)
                createPeer()
                if (caller) peerConnection?.createOffer(descriptionObserver(), MediaConstraints())
            }
            "signal" -> {
                if (message.optString("callId") != callId || peerConnection == null) return
                if (message.has("description")) {
                    val description = message.getJSONObject("description")
                    val sdp = SessionDescription(SessionDescription.Type.fromCanonicalForm(description.getString("type")), description.getString("sdp"))
                    val id = callId
                    peerConnection?.setRemoteDescription(object : SdpAdapter() {
                        override fun onSetSuccess() { main.post {
                            if (id != callId) return@post
                            pendingIce.forEach { peerConnection?.addIceCandidate(it) }
                            pendingIce.clear()
                            updateSafetyCode()
                            if (sdp.type == SessionDescription.Type.OFFER) peerConnection?.createAnswer(descriptionObserver(), MediaConstraints())
                        } }
                        override fun onSetFailure(error: String) { failFor(id) }
                    }, sdp)
                } else if (message.has("candidate")) {
                    val c = message.getJSONObject("candidate")
                    val candidate = IceCandidate(c.optString("sdpMid", "0"), c.getInt("sdpMLineIndex"), c.getString("candidate"))
                    if (peerConnection?.remoteDescription == null) pendingIce.add(candidate)
                    else peerConnection?.addIceCandidate(candidate)
                }
            }
            "ended" -> if (message.optString("callId") == callId) finish(when (message.optString("reason")) {
                "rejected" -> "Звонок отклонён"
                "timeout" -> "Нет ответа"
                "disconnected" -> "Собеседник отключился"
                else -> "Звонок завершён"
            })
            "error" -> {
                val code = message.optString("code")
                if (code == "replaced") {
                    generation++
                    socket?.cancel()
                    socket = null
                    finish("Эта учётная запись открыта на другом устройстве")
                    update(state.copy(online = false))
                } else if (state.phase == Phase.OUTGOING || state.phase == Phase.CONNECTING) {
                    finish(when (code) {
                        "offline" -> "Друг сейчас не в сети"
                        "busy" -> "Номер занят"
                        "self" -> "Нельзя позвонить себе"
                        else -> "Не удалось начать звонок"
                    })
                }
            }
        }
    }

    @SuppressLint("WakelockTimeout")
    private fun createPeer() {
        oldMode = audio.mode
        @Suppress("DEPRECATION")
        oldSpeaker = audio.isSpeakerphoneOn
        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            .setOnAudioFocusChangeListener { change ->
                if (change == AudioManager.AUDIOFOCUS_LOSS) main.post { hangup() }
            }.build().also { audio.requestAudioFocus(it) }
        wakeLock = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Line:call")
            .apply { acquire() } // Released by finish/onDestroy; no arbitrary call duration limit.
        PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(this).createInitializationOptions())
        device = JavaAudioDeviceModule.builder(this).createAudioDeviceModule()
        factory = PeerConnectionFactory.builder().setAudioDeviceModule(device).createPeerConnectionFactory()
        val config = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            if (relayOnly) iceTransportsType = PeerConnection.IceTransportsType.RELAY
        }
        val id = callId
        peerConnection = factory?.createPeerConnection(config, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate) { main.post {
                if (id == callId) send("signal", JSONObject().put("candidate", JSONObject()
                    .put("sdpMid", candidate.sdpMid).put("sdpMLineIndex", candidate.sdpMLineIndex).put("candidate", candidate.sdp)))
            } }
            override fun onConnectionChange(connection: PeerConnection.PeerConnectionState) { main.post {
                if (id != callId) return@post
                when (connection) {
                    PeerConnection.PeerConnectionState.CONNECTED -> {
                        main.removeCallbacks(callTimeout)
                        update(state.copy(phase = Phase.CONNECTED,
                            connectedAt = state.connectedAt.takeIf { it > 0 } ?: SystemClock.elapsedRealtime(), message = "Звонок зашифрован"))
                        updateSafetyCode()
                    }
                    PeerConnection.PeerConnectionState.DISCONNECTED -> {
                        update(state.copy(message = "Восстанавливаем связь…"))
                        main.removeCallbacks(callTimeout)
                        main.postDelayed(callTimeout, 20_000)
                    }
                    PeerConnection.PeerConnectionState.FAILED -> finish("Не удалось соединиться. Проверьте TURN и сеть")
                    else -> Unit
                }
            } }
            override fun onSignalingChange(value: PeerConnection.SignalingState) = Unit
            override fun onIceConnectionChange(value: PeerConnection.IceConnectionState) = Unit
            override fun onIceConnectionReceivingChange(value: Boolean) = Unit
            override fun onIceGatheringChange(value: PeerConnection.IceGatheringState) = Unit
            override fun onIceCandidatesRemoved(value: Array<out IceCandidate>) = Unit
            override fun onAddStream(value: MediaStream) = Unit
            override fun onRemoveStream(value: MediaStream) = Unit
            override fun onDataChannel(value: DataChannel) = Unit
            override fun onRenegotiationNeeded() = Unit
        }) ?: error("Cannot create peer connection")
        source = factory?.createAudioSource(MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("googEchoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("googNoiseSuppression", "true"))
        })
        track = factory?.createAudioTrack("voice", source)
        peerConnection?.addTrack(track, listOf("line"))?.let { sender ->
            val parameters = sender.parameters
            parameters.encodings.forEach { it.maxBitrateBps = 32_000 }
            sender.setParameters(parameters)
        }
    }

    private fun descriptionObserver(): SdpObserver {
        val id = callId
        return object : SdpAdapter() {
            override fun onCreateSuccess(sdp: SessionDescription) { main.post {
                if (id != callId) return@post
                peerConnection?.setLocalDescription(object : SdpAdapter() {
                    override fun onSetSuccess() { main.post {
                        if (id != callId) return@post
                        send("signal", JSONObject().put("description", JSONObject()
                            .put("type", sdp.type.canonicalForm()).put("sdp", sdp.description)))
                        updateSafetyCode()
                    } }
                    override fun onSetFailure(error: String) { failFor(id) }
                }, sdp)
            } }
            override fun onCreateFailure(error: String) { failFor(id) }
        }
    }

    private fun failFor(id: String) { main.post { if (id == callId) finish("Ошибка защищённого соединения") } }

    private fun updateSafetyCode() {
        val local = peerConnection?.localDescription?.description ?: return
        val remote = peerConnection?.remoteDescription?.description ?: return
        update(state.copy(safetyCode = Security.safetyCode(local, remote)))
    }

    fun toggleMute() {
        if (state.phase != Phase.CONNECTED && state.phase != Phase.CONNECTING) return
        val mute = !state.muted
        device?.setMicrophoneMute(mute)
        track?.setEnabled(!mute)
        update(state.copy(muted = mute))
    }

    @Suppress("DEPRECATION")
    fun toggleSpeaker() {
        if (peerConnection == null) return
        val enabled = !state.speaker
        audio.isSpeakerphoneOn = enabled
        update(state.copy(speaker = enabled))
    }

    fun hangup() {
        val pending = state.phase == Phase.OUTGOING && callId.isEmpty()
        if (state.phase == Phase.INCOMING && callId.isNotEmpty()) send("reject")
        finish("Звонок завершён")
        // Disconnect cancels a request even if its server-assigned call ID has not arrived.
        if (pending) connect()
    }

    @Suppress("DEPRECATION")
    private fun finish(message: String) {
        main.removeCallbacks(callTimeout)
        if (callId.isNotEmpty()) send("hangup")
        callId = ""
        peerConnection?.close()
        peerConnection?.dispose(); peerConnection = null
        track?.dispose(); track = null
        source?.dispose(); source = null
        factory?.dispose(); factory = null
        device?.release(); device = null
        pendingIce.clear()
        if (wakeLock?.isHeld == true) wakeLock?.release()
        wakeLock = null
        focus?.let {
            audio.abandonAudioFocusRequest(it)
            audio.isSpeakerphoneOn = oldSpeaker
            audio.mode = oldMode
        }
        focus = null
        foreground = false
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        update(state.copy(phase = Phase.IDLE, peer = "", muted = false, speaker = false,
            safetyCode = "", connectedAt = 0, message = message))
    }

    private fun notification(): Notification {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        fun action(name: String, code: Int) = PendingIntent.getService(this, code,
            Intent(this, CallService::class.java).setAction(name), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, "calls").setSmallIcon(app.line.R.drawable.ic_line)
            .setContentTitle("Line · ${state.peer.ifEmpty { "Голосовой звонок" }}")
            .setContentText(if (state.muted) "Микрофон выключен" else state.message)
            .setContentIntent(open).setOngoing(true).setCategory(Notification.CATEGORY_CALL)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(Notification.Action.Builder(null, if (state.muted) "Включить микрофон" else "Без звука", action("mute", 1)).build())
            .addAction(Notification.Action.Builder(null, "Завершить", action("hangup", 2)).build())
            .build()
    }

    override fun onDestroy() {
        generation++
        main.removeCallbacksAndMessages(null)
        socket?.cancel()
        socket = null
        finish("Звонок завершён")
        http.dispatcher.executorService.shutdown()
        http.connectionPool.evictAll()
        listeners.clear()
        super.onDestroy()
    }

    private open class SdpAdapter : SdpObserver {
        override fun onCreateSuccess(sdp: SessionDescription) = Unit
        override fun onSetSuccess() = Unit
        override fun onCreateFailure(error: String) = Unit
        override fun onSetFailure(error: String) = Unit
    }
}
