package app.line.notifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import app.line.MainActivity
import app.line.R
import app.line.i18n.LocalePreferences
import app.line.i18n.UiStrings

class LineNotifications(
    context: Context,
    private val translate: ((Context, String) -> String)? = null
) {
    private val appContext = context.applicationContext
    private val manager = appContext.getSystemService(NotificationManager::class.java)

    init {
        createChannels()
    }

    fun showIncoming(callId: String, peer: String) {
        if (!canNotify()) return
        val safePeer = formatPeer(peer)
        val notification = baseNotification(CHANNEL_INCOMING, "Входящий звонок", safePeer)
            .setCategory(Notification.CATEGORY_CALL)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(activityIntent(ACTION_OPEN_CALL, callId, peer, INCOMING_ID))
            .addAction(
                Notification.Action.Builder(
                    null,
                    text("Ответить"),
                    activityIntent(ACTION_ANSWER_CALL, callId, peer, INCOMING_ID + 1)
                ).build()
            )
            .setPublicVersion(publicNotification("Входящий звонок"))
            .build()
        manager.notify(INCOMING_ID, notification)
    }

    fun dismissIncoming() {
        manager.cancel(INCOMING_ID)
    }

    fun showMessage(peer: String, eventId: String) {
        if (!canNotify()) return
        require(eventId.isNotBlank()) { "eventId must not be blank" }
        val id = stableId("message", eventId)
        manager.notify(
            id,
            baseNotification(CHANNEL_MESSAGES, "Новое сообщение", formatPeer(peer))
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(activityIntent(ACTION_OPEN_MESSAGES, eventId, peer, id))
                .setPublicVersion(publicNotification("Новое сообщение"))
                .build()
        )
    }

    fun showMissed(peer: String, eventId: String) {
        if (!canNotify()) return
        require(eventId.isNotBlank()) { "eventId must not be blank" }
        val id = stableId("missed", eventId)
        manager.notify(
            id,
            baseNotification(CHANNEL_MISSED, "Пропущенный звонок", formatPeer(peer))
                .setCategory(Notification.CATEGORY_MISSED_CALL)
                .setAutoCancel(true)
                .setContentIntent(activityIntent(ACTION_OPEN_CALLS, eventId, peer, id))
                .setPublicVersion(publicNotification("Пропущенный звонок"))
                .build()
        )
    }

    /** Cancels only notifications owned by this helper, not the call foreground service. */
    fun cancelAll() {
        manager.activeNotifications
            .filter { it.notification.channelId in OWNED_CHANNELS }
            .forEach { manager.cancel(it.id) }
    }

    fun playClick() = FeedbackSounds.click(appContext)

    fun playMessageSent() = FeedbackSounds.sent(appContext)

    fun release() = FeedbackSounds.release()

    private fun createChannels() {
        val notificationAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val ringtoneAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        val incoming = NotificationChannel(
            CHANNEL_INCOMING,
            text("Входящие звонки"),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = text("Новые звонки")
            enableVibration(true)
            setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), ringtoneAttributes)
        }
        val messages = NotificationChannel(
            CHANNEL_MESSAGES,
            text("Сообщения"),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = text("Новые сообщения")
            enableVibration(true)
            setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), notificationAttributes)
        }
        val missed = NotificationChannel(
            CHANNEL_MISSED,
            text("Пропущенный звонок"),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = text("Пропущенный звонок")
            enableVibration(true)
            setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), notificationAttributes)
        }
        manager.createNotificationChannels(listOf(incoming, messages, missed))
    }

    private fun baseNotification(channelId: String, title: String, content: String) =
        Notification.Builder(appContext, channelId)
            .setSmallIcon(R.drawable.ic_line)
            .setContentTitle(text(title))
            .setContentText(content)
            .setVisibility(Notification.VISIBILITY_PRIVATE)

    private fun publicNotification(title: String) = Notification.Builder(appContext, CHANNEL_MESSAGES)
        .setSmallIcon(R.drawable.ic_line)
        .setContentTitle(text(title))
        .setContentText(text("Уведомления"))
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .build()

    private fun activityIntent(action: String, eventId: String, peer: String, requestCode: Int): PendingIntent {
        val intent = Intent(appContext, MainActivity::class.java)
            .setAction(action)
            .putExtra(EXTRA_NOTIFICATION_ACTION, action)
            .putExtra(EXTRA_EVENT_ID, eventId)
            .putExtra(EXTRA_PEER, peer)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (action == ACTION_ANSWER_CALL || action == ACTION_OPEN_CALL) {
            intent.putExtra(EXTRA_CALL_ID, eventId)
        }
        return PendingIntent.getActivity(
            appContext,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun canNotify(): Boolean = Build.VERSION.SDK_INT < 33 ||
        appContext.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    private fun formatPeer(peer: String): String {
        val safe = peer.filter { it.isLetterOrDigit() || it in " +-()," }.take(MAX_PEER_LENGTH).trim()
        return safe.ifEmpty { text("Звонок") }
    }

    private fun stableId(kind: String, eventId: String): Int {
        val hash = "$kind:$eventId".hashCode() and 0x7fffffff
        return (hash % (Int.MAX_VALUE - ID_RANGE_START)) + ID_RANGE_START
    }

    private fun text(value: String): String = translate?.invoke(appContext, value)
        ?: UiStrings.translate(LocalePreferences.wrap(appContext), value)

    companion object {
        const val ACTION_ANSWER_CALL = "app.line.notifications.ANSWER_CALL"
        const val ACTION_OPEN_CALL = "app.line.notifications.OPEN_CALL"
        const val ACTION_OPEN_CALLS = "app.line.notifications.OPEN_CALLS"
        const val ACTION_OPEN_MESSAGES = "app.line.notifications.OPEN_MESSAGES"
        const val EXTRA_NOTIFICATION_ACTION = "notification_action"
        const val EXTRA_EVENT_ID = "event_id"
        const val EXTRA_CALL_ID = "call_id"
        const val EXTRA_PEER = "peer"

        private const val CHANNEL_INCOMING = "line_incoming_calls"
        private const val CHANNEL_MESSAGES = "line_messages"
        private const val CHANNEL_MISSED = "line_missed_calls"
        private const val INCOMING_ID = 4101
        private const val ID_RANGE_START = 5000
        private const val MAX_PEER_LENGTH = 64
        private val OWNED_CHANNELS = setOf(CHANNEL_INCOMING, CHANNEL_MESSAGES, CHANNEL_MISSED)
    }
}
