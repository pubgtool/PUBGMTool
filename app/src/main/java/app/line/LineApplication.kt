package app.line

import android.app.Application
import app.line.push.PushAlerts
import app.line.push.PushConfiguration

class LineApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        PushAlerts.createChannels(this)
        PushConfiguration.reRegisterIfSelected(this)
    }
}
