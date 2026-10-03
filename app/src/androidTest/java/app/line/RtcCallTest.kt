package app.line

import android.Manifest
import android.app.Activity
import android.content.*
import android.os.IBinder
import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.*
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.webrtc.*
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class RtcCallTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private lateinit var service: CallService
    private lateinit var activity: Activity
    private val endpoint = "wss://localhost:8443/signal"
    private val main = android.os.Handler(android.os.Looper.getMainLooper())

    @Test fun encryptedAudioMuteAndCallSurviveHomeAndScreenOff() {
        instrumentation.uiAutomation.grantRuntimePermission(context.packageName, Manifest.permission.RECORD_AUDIO)
        if (android.os.Build.VERSION.SDK_INT >= 33) instrumentation.uiAutomation.grantRuntimePermission(context.packageName, Manifest.permission.POST_NOTIFICATIONS)
        context.getSharedPreferences("line", Context.MODE_PRIVATE).edit().putString("endpoint", endpoint).commit()
        activity = instrumentation.startActivitySync(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        val bound = CountDownLatch(1)
        val binding = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName, binder: IBinder) {
                service = (binder as CallService.LocalBinder).service
                bound.countDown()
            }
            override fun onServiceDisconnected(name: ComponentName) = Unit
        }
        context.bindService(Intent(context, CallService::class.java), binding, Context.BIND_AUTO_CREATE)
        var testBound = true
        assertTrue("Service binding", bound.await(20, TimeUnit.SECONDS))
        val remote = RemotePeer()
        try {
            remote.connect()
            await("Registration") { readState().online && remote.number.isNotEmpty() }
            instrumentation.runOnMainSync {
                context.startForegroundService(Intent(context, CallService::class.java).setAction("dial").putExtra("number", remote.number))
            }
            await("Encrypted peer connection", 45_000) { readState().phase == Phase.CONNECTED && remote.connected }
            await("Audio RTP reaches remote", 20_000) { remote.receivedPackets() > 0 }
            val localCode = readState().safetyCode
            assertTrue("Safety code exists", localCode.isNotEmpty())
            assertEquals(localCode, remote.safetyCode())
            instrumentation.runOnMainSync { service.toggleMute() }
            assertTrue(readState().muted)
            instrumentation.runOnMainSync { service.toggleMute() }
            assertFalse(readState().muted)
            val beforeSleep = remote.receivedPackets()
            context.unbindService(binding)
            testBound = false
            shell("input keyevent 3")
            shell("input keyevent 223")
            Thread.sleep(12_000)
            assertEquals(Phase.CONNECTED, readState().phase)
            assertTrue(remote.connected)
            assertTrue("Audio packets continue with the screen off", remote.receivedPackets() > beforeSleep)
            assertEquals(1, context.getSystemService(android.app.NotificationManager::class.java).activeNotifications.size)
            shell("input keyevent 224")
            shell("wm dismiss-keyguard")
            instrumentation.runOnMainSync {
                activity.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT))
            }
            Thread.sleep(1500)
            val screenshot = instrumentation.uiAutomation.takeScreenshot()
            val file = java.io.File(context.getExternalFilesDir(null), "connected.png")
            file.outputStream().use { screenshot.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
            screenshot.recycle()
            instrumentation.runOnMainSync { service.hangup() }
            await("Hangup") { readState().phase == Phase.IDLE }
            assertFalse(readState().muted)
        } finally {
            shell("input keyevent 224")
            instrumentation.runOnMainSync { service.hangup(); activity.finish() }
            remote.close()
            if (testBound) context.unbindService(binding)
        }
    }

    private fun readState(): CallState {
        var value = CallState()
        instrumentation.runOnMainSync { value = service.state }
        return value
    }

    private fun await(label: String, timeout: Long = 20_000, predicate: () -> Boolean) {
        val deadline = System.currentTimeMillis() + timeout
        while (System.currentTimeMillis() < deadline) {
            if (predicate()) return
            Thread.sleep(150)
        }
        fail("$label timed out; state=${readState()}")
    }

    private fun shell(command: String) {
        instrumentation.uiAutomation.executeShellCommand(command).use {
            java.io.FileInputStream(it.fileDescriptor).use { stream -> stream.readBytes() }
        }
    }

    private inner class RemotePeer {
        private val client = OkHttpClient()
        private lateinit var socket: WebSocket
        private var factory: PeerConnectionFactory? = null
        private var peer: PeerConnection? = null
        private val candidates = mutableListOf<IceCandidate>()
        private var callId = ""
        @Volatile var number = ""
        @Volatile var connected = false

        fun connect() {
            socket = client.newWebSocket(Request.Builder().url(endpoint).build(), object : WebSocketListener() {
                override fun onOpen(ws: WebSocket, response: Response) {
                    ws.send(JSONObject().put("type", "register").put("token", "b".repeat(64)).toString())
                }
                override fun onMessage(ws: WebSocket, text: String) {
                    main.post { receive(JSONObject(text)) }
                }
            })
        }

        private fun send(type: String, payload: JSONObject = JSONObject()) {
            socket.send(payload.put("type", type).put("callId", callId).toString())
        }

        private fun receive(message: JSONObject) {
            when (message.getString("type")) {
                "registered" -> number = message.getString("number")
                "incoming" -> {
                    callId = message.getString("callId")
                    send("accept")
                }
                "accepted" -> {
                    PeerConnectionFactory.initialize(PeerConnectionFactory.InitializationOptions.builder(context).createInitializationOptions())
                    factory = PeerConnectionFactory.builder().createPeerConnectionFactory()
                    peer = factory?.createPeerConnection(PeerConnection.RTCConfiguration(emptyList()).apply {
                        sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
                    }, object : PeerConnection.Observer {
                        override fun onIceCandidate(c: IceCandidate) {
                            send("signal", JSONObject().put("candidate", JSONObject().put("sdpMid", c.sdpMid).put("sdpMLineIndex", c.sdpMLineIndex).put("candidate", c.sdp)))
                        }
                        override fun onConnectionChange(value: PeerConnection.PeerConnectionState) { connected = value == PeerConnection.PeerConnectionState.CONNECTED }
                        override fun onSignalingChange(value: PeerConnection.SignalingState) = Unit
                        override fun onIceConnectionChange(value: PeerConnection.IceConnectionState) = Unit
                        override fun onIceConnectionReceivingChange(value: Boolean) = Unit
                        override fun onIceGatheringChange(value: PeerConnection.IceGatheringState) = Unit
                        override fun onIceCandidatesRemoved(value: Array<out IceCandidate>) = Unit
                        override fun onAddStream(value: MediaStream) = Unit
                        override fun onRemoveStream(value: MediaStream) = Unit
                        override fun onDataChannel(value: DataChannel) = Unit
                        override fun onRenegotiationNeeded() = Unit
                    })
                }
                "signal" -> {
                    if (message.has("description")) {
                        val d = message.getJSONObject("description")
                        peer?.setRemoteDescription(object : Adapter() {
                            override fun onSetSuccess() {
                                main.post {
                                    candidates.forEach { peer?.addIceCandidate(it) }
                                    candidates.clear()
                                    peer?.createAnswer(object : Adapter() {
                                        override fun onCreateSuccess(sdp: SessionDescription) {
                                            main.post { peer?.setLocalDescription(object : Adapter() {
                                                override fun onSetSuccess() {
                                                    send("signal", JSONObject().put("description", JSONObject().put("type", "answer").put("sdp", sdp.description)))
                                                }
                                            }, sdp) }
                                        }
                                    }, MediaConstraints())
                                }
                            }
                        }, SessionDescription(SessionDescription.Type.OFFER, d.getString("sdp")))
                    } else {
                        val c = message.getJSONObject("candidate")
                        val ice = IceCandidate(c.getString("sdpMid"), c.getInt("sdpMLineIndex"), c.getString("candidate"))
                        if (peer?.remoteDescription == null) candidates.add(ice) else peer?.addIceCandidate(ice)
                    }
                }
            }
        }

        fun safetyCode(): String = Security.safetyCode(peer?.localDescription?.description ?: "", peer?.remoteDescription?.description ?: "")

        fun receivedPackets(): Long {
            val ready = CountDownLatch(1)
            var packets = 0L
            peer?.getStats { report ->
                packets = report.statsMap.values.filter { it.type == "inbound-rtp" }
                    .sumOf { (it.members["packetsReceived"] as? Number)?.toLong() ?: 0L }
                ready.countDown()
            }
            ready.await(3, TimeUnit.SECONDS)
            return packets
        }

        fun close() {
            socket.cancel()
            instrumentation.runOnMainSync { peer?.dispose(); factory?.dispose() }
            client.dispatcher.executorService.shutdown()
        }
    }

    private open class Adapter : SdpObserver {
        override fun onCreateSuccess(sdp: SessionDescription) = Unit
        override fun onSetSuccess() = Unit
        override fun onCreateFailure(error: String) = Unit
        override fun onSetFailure(error: String) = Unit
    }
}
