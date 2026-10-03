package app.line

enum class Phase { IDLE, OUTGOING, INCOMING, CONNECTING, CONNECTED }

data class CallState(
    val number: String = "",
    val online: Boolean = false,
    val phase: Phase = Phase.IDLE,
    val peer: String = "",
    val muted: Boolean = false,
    val speaker: Boolean = false,
    val connectedAt: Long = 0,
    val safetyCode: String = "",
    val message: String = "Укажите сервер, чтобы получить номер"
)
