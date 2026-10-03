package app.line

import android.content.Intent
import android.graphics.Bitmap
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiSelector
import app.line.crypto.SecureStore
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class UiFlowTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext

    @Test fun firstLaunchExplainsNumberAndNavigationWorksWithoutSlogans() {
        val activity = start()
        try {
            instrumentation.runOnMainSync {
                val root = activity.window.decorView
                assertTrue(labels(root).contains("Ваш номер"))
                assertTrue(labels(root).contains("Не назначен"))
                assertFalse(labels(root).any { it.contains("WebRTC", true) || it.contains("ТОЛЬКО ГОЛОС") || it.contains("E2EE") })
                find(root, "1").performClick(); find(root, "2").performClick()
                assertEquals("12", descendants(root).filterIsInstance<EditText>().first().text.toString())
                find(root, "Удалить цифру").performClick()
                assertEquals("1", descendants(root).filterIsInstance<EditText>().first().text.toString())
                descendants(root).filterIsInstance<EditText>().first().setText("")
                find(root, "Сообщения").performClick()
                assertTrue(descendants(root).any { it.contentDescription?.toString() == "Новое сообщение" })
                find(root, "Профиль").performClick()
                assertTrue(labels(root).contains("Мой аккаунт"))
                assertFalse(labels(root).any { it.contains("wss://") || it.contains("TLS") || it.contains("сертификат") })
                assertFalse(descendants(root).any { it.contentDescription?.toString() == "Для администратора" })
                find(root, "Звонки").performClick()
            }
            screenshot("calls")
        } finally { instrumentation.runOnMainSync { activity.finish() } }
    }

    @Test fun inboxOpensStoredConversationWithoutGlobalNavigation() {
        // Fixtures are test-only and are never included in the distributed APK.
        val maria = "11001122"
        val alex = "22002233"
        val denis = "33003344"
        SecureStore(context).use { store ->
            store.saveMessage(maria, "ui-maria-1", "Сможешь созвониться сегодня?", true, "sent")
            store.saveMessage(maria, "ui-maria-2", "Да, после семи.", false, "received")
            store.saveMessage(maria, "ui-maria-3", "Отлично. Наберу в 19:00.", true, "sent")
            store.saveMessage(alex, "ui-alex-1", "Я уже дома. Позвони, когда будет удобно.", false, "received")
            store.saveMessage(denis, "ui-denis-1", "Договорились, до завтра", true, "sent")
            assertTrue(store.conversations().count { it.peer == maria } == 1)
        }
        context.getSharedPreferences("line-ui", 0).edit().putString("contact-$maria", "Мария")
            .putString("contact-$alex", "Алексей").putString("contact-$denis", "Денис").commit()
        val activity = start()
        try {
            instrumentation.runOnMainSync { find(activity.window.decorView, "Сообщения").performClick() }
            await { descendants(activity.window.decorView).any { it.contentDescription?.toString() == "Диалог Мария" } }
            screenshot("inbox-test-data")
            instrumentation.runOnMainSync { find(activity.window.decorView, "Диалог Мария").performClick() }
            await { labels(activity.window.decorView).contains("Отлично. Наберу в 19:00.") }
            instrumentation.runOnMainSync {
                val root = activity.window.decorView
                assertFalse(descendants(root).any { it.contentDescription?.toString() == "Профиль" && it.isShown })
                assertTrue(find(root, "Отправить сообщение").isShown)
                assertTrue(find(root, "Назад").isShown)
                assertFalse(labels(root).any { it == "Посмотреть код безопасности" })
                assertFalse(labels(root).any { it == "Подтвердить контакт" })
            }
            screenshot("conversation-test-data")
            val device = UiDevice.getInstance(instrumentation)
            device.findObject(UiSelector().text("Отлично. Наберу в 19:00.")).longClick()
            assertTrue(device.findObject(UiSelector().text("Удалить на этом устройстве")).waitForExists(5000))
            device.findObject(UiSelector().text("Удалить на этом устройстве")).click()
            assertTrue(device.findObject(UiSelector().text("Удалить сообщение?")).waitForExists(5000))
            screenshot("delete-message-confirmation-test-data")
            device.findObject(UiSelector().resourceId("android:id/button1")).click()
            await { !labels(activity.window.decorView).contains("Отлично. Наберу в 19:00.") }
            SecureStore(context).use { assertFalse(it.messages(maria).any { item -> item.id == "ui-maria-3" }) }
            instrumentation.runOnMainSync { find(activity.window.decorView, "Назад").performClick() }
            await { descendants(activity.window.decorView).any { it.contentDescription?.toString() == "Профиль" && it.isShown } }
            instrumentation.runOnMainSync { find(activity.window.decorView, "Профиль").performClick() }
            screenshot("profile")
        } finally { instrumentation.runOnMainSync { activity.finish() } }
    }

    private fun start() = instrumentation.startActivitySync(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    private fun await(check: () -> Boolean) {
        val deadline = System.currentTimeMillis() + 15000
        while (System.currentTimeMillis() < deadline) {
            var passed = false
            instrumentation.runOnMainSync { passed = check() }
            if (passed) return
            Thread.sleep(100)
        }
        fail("UI did not reach expected state")
    }
    private fun screenshot(name: String) {
        instrumentation.waitForIdleSync()
        Thread.sleep(250)
        val bitmap = instrumentation.uiAutomation.takeScreenshot() ?: error("Screenshot unavailable")
        File(context.getExternalFilesDir(null), "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }
    private fun descendants(view: View): List<View> = listOf(view) + if (view is ViewGroup) (0 until view.childCount).flatMap { descendants(view.getChildAt(it)) } else emptyList()
    private fun labels(root: View) = descendants(root).filterIsInstance<TextView>().map { it.text.toString() }
    private fun find(root: View, description: String) = descendants(root).first { it.contentDescription?.toString() == description }
}
