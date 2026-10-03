package app.line.notifications

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.provider.Settings

object FeedbackSounds {
    private val lock = Any()
    private var generator: ToneGenerator? = null

    fun click(context: Context) = play(context, ToneGenerator.TONE_PROP_BEEP, 35)

    fun sent(context: Context) = play(context, ToneGenerator.TONE_PROP_ACK, 75)

    fun release() {
        synchronized(lock) {
            generator?.release()
            generator = null
        }
    }

    private fun play(context: Context, tone: Int, durationMs: Int) {
        val appContext = context.applicationContext
        val audio = appContext.getSystemService(AudioManager::class.java)
        val soundEffectsEnabled = Settings.System.getInt(
            appContext.contentResolver,
            Settings.System.SOUND_EFFECTS_ENABLED,
            1
        ) == 1
        if (!soundEffectsEnabled || audio.ringerMode != AudioManager.RINGER_MODE_NORMAL ||
            audio.getStreamVolume(AudioManager.STREAM_SYSTEM) == 0
        ) return

        synchronized(lock) {
            val tones = generator ?: ToneGenerator(AudioManager.STREAM_SYSTEM, 40).also { generator = it }
            tones.startTone(tone, durationMs)
        }
    }
}
