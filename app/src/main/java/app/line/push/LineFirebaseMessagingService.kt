package app.line.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class LineFirebaseMessagingService : FirebaseMessagingService() {
    @Deprecated("Use the FCM installation registration callback")
    override fun onNewToken(token: String) {
        PushConfiguration.rememberToken(this, token)
        PushInboxWorker.enqueue(this)
    }

    override fun onRegistered(installationId: String) {
        PushConfiguration.rememberToken(this, installationId)
        PushInboxWorker.enqueue(this)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data.keys != setOf("kind", "id")) return
        val id = data["id"]?.takeIf(::isUuid) ?: return
        when (data["kind"]) {
            "message" -> PushAlerts.showMessage(this, id)
            "call" -> PushAlerts.showCall(this, id)
            "call_ended" -> PushAlerts.dismissCall(this, id)
            else -> return
        }
        PushInboxWorker.enqueue(this)
    }

    private fun isUuid(value: String): Boolean =
        value.matches(Regex("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))
}
