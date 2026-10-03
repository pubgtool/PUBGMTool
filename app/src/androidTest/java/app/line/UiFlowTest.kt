package app.line

import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test

class UiFlowTest {
    @Test fun firstLaunchExplainsNumberAndNavigationWorksWithoutSlogans() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val activity = instrumentation.startActivitySync(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        try {
            instrumentation.runOnMainSync {
                val root = activity.window.decorView
                assertTrue(labels(root).any { it == "Номер появится после подключения к Line" })
                assertFalse(labels(root).any { it.contains("WebRTC", true) || it.contains("ТОЛЬКО ГОЛОС") || it.contains("E2EE") })
                assertTrue(descendants(root).any { it.contentDescription?.toString() == "Подключить Line" })
                assertFalse(descendants(root).any { it is EditText })
                find(root, "Сообщения").performClick()
                assertTrue(labels(root).any { it == "Начните разговор" })
                find(root, "Профиль").performClick()
                assertTrue(labels(root).any { it == "Не подключён" })
                assertFalse(descendants(root).filterIsInstance<EditText>().any { it.hint?.contains("your-server") == true })
            }
        } finally { instrumentation.runOnMainSync { activity.finish() } }
    }

    private fun descendants(view: View): List<View> = listOf(view) + if (view is ViewGroup) (0 until view.childCount).flatMap { descendants(view.getChildAt(it)) } else emptyList()
    private fun labels(root: View) = descendants(root).filterIsInstance<TextView>().map { it.text.toString() }
    private fun find(root: View, description: String) = descendants(root).first { it.contentDescription?.toString() == description }
}
