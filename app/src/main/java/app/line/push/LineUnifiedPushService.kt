package app.line.push

import app.line.AppNotifications
import org.json.JSONObject
import org.unifiedpush.android.connector.FailedReason
import org.unifiedpush.android.connector.PushService
import org.unifiedpush.android.connector.data.PushEndpoint
import org.unifiedpush.android.connector.data.PushMessage

class LineUnifiedPushService : PushService() {
    override fun onNewEndpoint(endpoint: PushEndpoint, instance: String) {
        if (instance != PushConfiguration.INSTANCE) return
        if (PushConfiguration.rememberEndpoint(this, endpoint.url)) {
            runCatching { PushInboxWorker.enqueue(this) }
        }
    }

    override fun onMessage(message: PushMessage, instance: String) {
        if (instance != PushConfiguration.INSTANCE) return
        val payload = parsePayload(message.content) ?: return
        val id = (payload.opt("id") as? String)?.takeIf { UUID_PATTERN.matches(it) } ?: return
        when (payload.opt("kind") as? String ?: return) {
            "message" -> PushAlerts.showMessage(this, id)
            "call" -> PushAlerts.showCall(this, id)
            "call_ended" -> {
                PushAlerts.dismissCall(this, id)
                val prefs = getSharedPreferences("line", MODE_PRIVATE)
                if (prefs.getString("notification_call_id", null) == id) {
                    AppNotifications.cancelIncomingCall(this)
                    prefs.edit().remove("notification_call_id").apply()
                }
            }
            else -> return
        }
        runCatching { PushInboxWorker.enqueue(this) }
    }

    override fun onRegistrationFailed(reason: FailedReason, instance: String) = Unit

    override fun onUnregistered(instance: String) {
        if (instance == PushConfiguration.INSTANCE) PushConfiguration.forgetEndpoint(this)
    }

    private fun parsePayload(content: ByteArray): JSONObject? = runCatching {
        JSONObject(content.toString(Charsets.UTF_8)).takeIf { it.keys().asSequence().toSet() == PAYLOAD_KEYS }
    }.getOrNull()

    private companion object {
        val PAYLOAD_KEYS = setOf("kind", "id")
        val UUID_PATTERN = Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
    }
}
