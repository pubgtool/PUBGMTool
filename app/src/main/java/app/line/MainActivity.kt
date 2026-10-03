package app.line

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.text.InputFilter
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.widget.*

class MainActivity : Activity() {
    private var service: CallService? = null
    private var bound = false
    private var state = CallState()
    private lateinit var root: LinearLayout
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private lateinit var number: TextView
    private var dial = ""
    private var pendingAction: String? = null
    private val handler = Handler(Looper.getMainLooper())
    private var lastPhase: Phase? = null
    private var timer: TextView? = null
    private var muteButton: Button? = null
    private var speakerButton: Button? = null
    private var safety: TextView? = null
    private var dialButton: Button? = null
    private val observer: (CallState) -> Unit = { render(it) }
    private val tick = object : Runnable {
        override fun run() {
            if (state.connectedAt > 0) {
                val seconds = (SystemClock.elapsedRealtime() - state.connectedAt) / 1000
                timer?.text = "%02d:%02d".format(seconds / 60, seconds % 60)
            }
            handler.postDelayed(this, 1000)
        }
    }
    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, binder: IBinder) {
            service = (binder as CallService.LocalBinder).service
            service?.observe(observer)
        }
        override fun onServiceDisconnected(name: ComponentName) { service = null }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        dial = savedInstanceState?.getString("dial") ?: ""
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            setPadding(dp(28), dp(14), dp(28), dp(16))
        }
        root.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                view.setPadding(dp(28), dp(14) + bars.top, dp(28), dp(16) + bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(dp(28), dp(14) + insets.systemWindowInsetTop, dp(28), dp(16) + insets.systemWindowInsetBottom)
            }
            insets
        }
        val header = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(text("line", 34, bold = true), LinearLayout.LayoutParams(0, dp(64), 1f))
        header.addView(button("Настройки", false) { settings() }.apply { contentDescription = "Настройки сервера" }, LinearLayout.LayoutParams(dp(120), dp(48)))
        root.addView(header)
        status = text("Подключение…", 13, color = 0xFF777777.toInt()).apply { setPadding(0, dp(4), 0, dp(20)) }
        root.addView(status)
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = background(0xFFF5F5F5.toInt(), 20)
            setPadding(dp(20), dp(18), dp(20), dp(18))
        }
        card.addView(text("ВАШ НОМЕР", 10, color = 0xFF777777.toInt()).apply { letterSpacing = 0.16f })
        number = text("— — — —  — — — —", 25, bold = true).apply {
            setPadding(0, dp(8), 0, dp(4))
            setOnClickListener {
                if (state.number.isNotEmpty()) {
                    getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Номер Line", state.number))
                    Toast.makeText(this@MainActivity, "Номер скопирован", Toast.LENGTH_SHORT).show()
                }
            }
        }
        card.addView(number)
        card.addView(text("Поделитесь им только с другом", 12, color = 0xFF777777.toInt()))
        root.addView(card)
        val scroll = ScrollView(this).apply { isFillViewport = true; isVerticalScrollBarEnabled = false }
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL }
        scroll.addView(content)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(text("ТОЛЬКО ГОЛОС. НИЧЕГО ЛИШНЕГО.", 9, color = 0xFF888888.toInt()).apply {
            gravity = Gravity.CENTER; letterSpacing = 0.12f; setPadding(0, dp(16), 0, 0)
        })
        setContentView(root)
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.setSystemBarsAppearance(
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                    android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                    android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
                if (Build.VERSION.SDK_INT >= 27) View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else 0
        }
        render(state)
    }

    override fun onStart() {
        super.onStart()
        bound = bindService(Intent(this, CallService::class.java), connection, BIND_AUTO_CREATE)
        handler.post(tick)
    }

    override fun onStop() {
        service?.removeObserver(observer)
        if (bound) unbindService(connection)
        bound = false
        service = null
        handler.removeCallbacks(tick)
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("dial", dial)
        super.onSaveInstanceState(outState)
    }

    private fun render(value: CallState) {
        state = value
        status.text = (if (value.online) "●  В сети · " else "○  ") + value.message
        number.text = if (value.number.isEmpty()) "— — — —  — — — —" else formatNumber(value.number)
        if (lastPhase != value.phase) {
            content.removeAllViews()
            timer = null; muteButton = null; speakerButton = null; safety = null; dialButton = null
            if (value.phase == Phase.IDLE) dialScreen() else callScreen()
            lastPhase = value.phase
        }
        dialButton?.isEnabled = state.online && dial.length == 8
        muteButton?.text = if (value.muted) "Микрофон выкл." else "Микрофон"
        muteButton?.background = background(if (value.muted) Color.BLACK else 0xFFF2F2F2.toInt(), 18)
        muteButton?.setTextColor(if (value.muted) Color.WHITE else Color.BLACK)
        speakerButton?.text = if (value.speaker) "Динамик вкл." else "Динамик"
        safety?.text = if (value.safetyCode.isEmpty()) "Код появится после соединения" else "КОД БЕЗОПАСНОСТИ\n${value.safetyCode}\nСверьте через другой доверенный канал"
    }

    private fun dialScreen() {
        content.addView(text("Ближе, даже издалека.", 22, bold = true).apply { setPadding(0, dp(26), 0, dp(8)) })
        content.addView(text("Введите номер друга", 13, color = 0xFF777777.toInt()))
        val input = EditText(this).apply {
            textSize = 28f; typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
            gravity = Gravity.CENTER; hint = "0000 0000"
            inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(InputFilter.LengthFilter(8))
            showSoftInputOnFocus = false
            background = background(Color.WHITE, 0)
            contentDescription = "Номер друга"
            setText(dial)
            addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    dial = s.toString().filter { it in '0'..'9' }
                    dialButton?.isEnabled = state.online && dial.length == 8
                }
                override fun afterTextChanged(s: android.text.Editable?) = Unit
            })
        }
        content.addView(input, LinearLayout.LayoutParams(-1, dp(70)))
        listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf("", "0", "⌫")).forEach { keys ->
            val row = LinearLayout(this)
            keys.forEach { key ->
                val cell = button(key, false) {
                    if (key == "⌫") input.setText(dial.dropLast(1))
                    else if (dial.length < 8) input.setText(dial + key)
                    input.setSelection(input.text.length)
                }.apply {
                    textSize = 24f
                    background = background(Color.WHITE, 18)
                    isEnabled = key.isNotEmpty()
                    contentDescription = if (key == "⌫") "Удалить цифру" else key
                }
                row.addView(cell, LinearLayout.LayoutParams(0, dp(56), 1f).apply { setMargins(dp(4), dp(2), dp(4), dp(2)) })
            }
            content.addView(row, LinearLayout.LayoutParams(-1, -2))
        }
        dialButton = button("Позвонить  ↗", true) { startCall("dial") }
        content.addView(dialButton, LinearLayout.LayoutParams(-1, dp(58)).apply { topMargin = dp(14) })
        content.addView(text("WebRTC · шифрование голоса", 11, color = 0xFF777777.toInt()).apply { setPadding(0, dp(14), 0, dp(8)) })
    }

    private fun callScreen() {
        content.addView(text(if (state.phase == Phase.INCOMING) "Входящий звонок" else "Голосовой звонок", 13,
            color = 0xFF777777.toInt()).apply { setPadding(0, dp(42), 0, dp(18)) })
        content.addView(text(formatNumber(state.peer), 32, bold = true))
        timer = text(if (state.phase == Phase.CONNECTED) "00:00" else "•••", 24).apply { setPadding(0, dp(20), 0, dp(32)) }
        content.addView(timer)
        if (state.phase == Phase.INCOMING) {
            content.addView(button("Ответить", true) { startCall("accept") }, LinearLayout.LayoutParams(-1, dp(58)))
        } else {
            val row = LinearLayout(this)
            muteButton = button("Микрофон", false) { service?.toggleMute() }
            speakerButton = button("Динамик", false) { service?.toggleSpeaker() }
            row.addView(muteButton, LinearLayout.LayoutParams(0, dp(64), 1f).apply { marginEnd = dp(8) })
            row.addView(speakerButton, LinearLayout.LayoutParams(0, dp(64), 1f).apply { marginStart = dp(8) })
            content.addView(row)
        }
        content.addView(button(if (state.phase == Phase.INCOMING) "Отклонить" else "Завершить звонок", true) { service?.hangup() },
            LinearLayout.LayoutParams(-1, dp(58)).apply { topMargin = dp(16) })
        if (state.phase == Phase.CONNECTED || state.phase == Phase.CONNECTING) {
            safety = text("", 11, color = 0xFF777777.toInt()).apply {
                gravity = Gravity.CENTER; setPadding(dp(8), dp(24), dp(8), dp(12)); setLineSpacing(dp(5).toFloat(), 1f)
            }
            content.addView(safety)
            content.addView(text("Можно свернуть приложение\nили заблокировать экран", 12, color = 0xFF777777.toInt()).apply {
                gravity = Gravity.CENTER; setPadding(0, dp(14), 0, 0)
            })
        }
    }

    private fun startCall(action: String) {
        if (service == null) return
        val permissions = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        if (permissions.isNotEmpty()) {
            pendingAction = action
            requestPermissions(permissions.toTypedArray(), 1)
        } else launchCall(action)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val action = pendingAction ?: return
        pendingAction = null
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) launchCall(action)
        else Toast.makeText(this, "Для звонка нужен доступ к микрофону", Toast.LENGTH_LONG).show()
    }

    private fun launchCall(action: String) {
        startForegroundService(Intent(this, CallService::class.java).setAction(action).putExtra("number", dial))
    }

    private fun settings() {
        if (state.phase != Phase.IDLE) {
            Toast.makeText(this, "Настройки доступны после звонка", Toast.LENGTH_SHORT).show(); return
        }
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(24), dp(8), dp(24), 0) }
        box.addView(text("На обоих телефонах должен быть один сервер. Входящие доступны, пока приложение открыто; активный звонок работает в фоне.", 13, color = 0xFF666666.toInt()))
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            hint = "wss://your-server.com/signal"
            textSize = 14f
            setText(getSharedPreferences("line", MODE_PRIVATE).getString("endpoint", ""))
            contentDescription = "Адрес сервера"
        }
        box.addView(input)
        box.addView(text("Голос зашифрован WebRTC. Сервер видит номера, IP и время. При прямой связи IP также видят собеседник и STUN-провайдер (по умолчанию Google). Собственный TURN с relay-only скрывает IP от собеседника, но не от TURN. Полной анонимности нет.", 12, color = 0xFF777777.toInt()).apply { setPadding(0, dp(12), 0, 0) })
        val dialog = AlertDialog.Builder(this).setTitle("Соединение").setView(box)
            .setNegativeButton("Отмена", null).setPositiveButton("Сохранить", null).create()
        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val endpoint = input.text.toString().trim()
                if (!Security.validEndpoint(endpoint)) input.error = "Нужен адрес wss://домен/signal без пароля и параметров"
                else { service?.setEndpoint(endpoint); dialog.dismiss() }
            }
        }
        dialog.show()
    }

    private fun text(value: String, size: Int, bold: Boolean = false, color: Int = Color.BLACK) = TextView(this).apply {
        text = value; textSize = size.toFloat(); setTextColor(color)
        if (bold) typeface = Typeface.create("sans-serif", Typeface.BOLD)
    }

    private fun button(value: String, dark: Boolean, action: () -> Unit) = Button(this).apply {
        text = value; textSize = 13f; isAllCaps = false
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        setTextColor(if (dark) Color.WHITE else Color.BLACK)
        background = background(if (dark) Color.BLACK else 0xFFF2F2F2.toInt(), 18)
        setPadding(dp(8), 0, dp(8), 0)
        setOnClickListener { action() }
    }

    private fun background(color: Int, radius: Int) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat()
    }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun formatNumber(value: String) = value.chunked(4).joinToString(" ")
}
