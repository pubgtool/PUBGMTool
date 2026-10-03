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
import android.view.*
import android.widget.*
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import app.line.crypto.ChatMessage
import kotlinx.coroutines.*

class MainActivity : Activity() {
    private var service: CallService? = null
    private var bound = false
    private val ui = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var content: LinearLayout
    private lateinit var status: TextView
    private lateinit var number: TextView
    private var state = CallState()
    private var tab = "calls"
    private var renderedPhase: Phase? = null
    private var dial = ""
    private var pendingAction: String? = null
    private var selectedPeer = ""
    private var peerVerified = false
    private var code = ""
    private var history = emptyList<ChatMessage>()
    private var historyJob: Job? = null
    private val messageAdapter = MessageAdapter()
    private var chatList: RecyclerView? = null
    private var contactLabel: TextView? = null
    private var verifyButton: Button? = null
    private var timer: TextView? = null
    private var participants: TextView? = null
    private var mute: Button? = null
    private var speaker: Button? = null
    private var callButton: Button? = null
    private val main = Handler(Looper.getMainLooper())
    private val observer: (CallState) -> Unit = { render(it) }
    private val tick = object : Runnable {
        override fun run() {
            if (state.connectedAt > 0) {
                val seconds = (SystemClock.elapsedRealtime() - state.connectedAt) / 1000
                timer?.text = "%02d:%02d".format(seconds / 60, seconds % 60)
            }
            main.postDelayed(this, 1_000)
        }
    }
    private val binding = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, binder: IBinder) {
            service = (binder as CallService.LocalBinder).service
            service?.observe(observer)
        }
        override fun onServiceDisconnected(name: ComponentName) { service = null }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        dial = savedInstanceState?.getString("dial") ?: ""
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setBackgroundColor(Color.WHITE)
        }
        root.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                view.setPadding(dp(24), dp(12) + bars.top, dp(24), dp(12) + bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(dp(24), dp(12) + insets.systemWindowInsetTop, dp(24), dp(12) + insets.systemWindowInsetBottom)
            }
            insets
        }
        val header = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(label("line", 34, true), LinearLayout.LayoutParams(0, dp(64), 1f))
        header.addView(button("Настройки") { settings() }, LinearLayout.LayoutParams(dp(112), dp(44)))
        root.addView(header)
        status = label("Настройте серверы и сертификаты", 12, color = GRAY).apply { setPadding(0, dp(4), 0, dp(16)) }
        root.addView(status)
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; background = shape(PALE, 18)
            setPadding(dp(18), dp(14), dp(18), dp(14))
        }
        card.addView(label("ВАШ НОМЕР · E2EE", 10, color = GRAY).apply { letterSpacing = 0.14f })
        number = label("— — — —  — — — —", 25, true).apply {
            setPadding(0, dp(6), 0, 0)
            setOnClickListener {
                if (state.number.isNotEmpty()) {
                    getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Line", state.number))
                    toast("Номер скопирован")
                }
            }
        }
        card.addView(number); root.addView(card)
        val tabs = LinearLayout(this)
        tabs.addView(button("Звонки") { tab = "calls"; rebuild() }, LinearLayout.LayoutParams(0, dp(44), 1f).apply { marginEnd = dp(5) })
        tabs.addView(button("Чат") { tab = "chat"; rebuild() }, LinearLayout.LayoutParams(0, dp(44), 1f).apply { marginStart = dp(5) })
        root.addView(tabs, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16); bottomMargin = dp(12) })
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(content, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(label("ГОЛОС И СООБЩЕНИЯ. БЕЗ ЛИШНЕГО.", 9, color = GRAY).apply {
            gravity = Gravity.CENTER; letterSpacing = 0.1f; setPadding(0, dp(12), 0, 0)
        })
        setContentView(root)
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
        }
        render(state)
    }

    override fun onStart() {
        super.onStart()
        bound = bindService(Intent(this, CallService::class.java), binding, BIND_AUTO_CREATE)
        main.post(tick)
    }

    override fun onStop() {
        service?.removeObserver(observer)
        if (bound) unbindService(binding)
        bound = false; service = null
        main.removeCallbacks(tick)
        super.onStop()
    }

    override fun onDestroy() { ui.cancel(); super.onDestroy() }
    override fun onSaveInstanceState(out: Bundle) { out.putString("dial", dial); super.onSaveInstanceState(out) }

    private fun render(value: CallState) {
        val chatChanged = state.chatVersion != value.chatVersion
        state = value
        status.text = (if (value.online) "●  " else "○  ") + value.message
        number.text = if (value.number.isEmpty()) "— — — —  — — — —" else value.number.chunked(4).joinToString(" ")
        if (renderedPhase != value.phase) {
            if (value.phase == Phase.INCOMING) tab = "calls"
            rebuild()
        }
        callButton?.isEnabled = value.online && parseMembers(dial).isNotEmpty()
        mute?.text = if (value.muted) "Микрофон выкл." else "Микрофон"
        mute?.background = shape(if (value.muted) Color.BLACK else PALE, 18)
        mute?.setTextColor(if (value.muted) Color.WHITE else Color.BLACK)
        speaker?.text = if (value.speaker) "Динамик вкл." else "Динамик"
        participants?.text = "Участники (${value.participants.size}/${value.members.size})\n" +
            value.members.joinToString("\n") { it.chunked(4).joinToString(" ") + if (it in value.participants) " · в звонке" else " · ожидание" }
        if (chatChanged && tab == "chat" && selectedPeer.isNotEmpty()) loadHistory()
    }

    private fun rebuild() {
        historyJob?.cancel()
        content.removeAllViews()
        chatList = null; contactLabel = null; verifyButton = null
        timer = null; participants = null; mute = null; speaker = null; callButton = null
        if (tab == "chat") chatScreen() else if (state.phase == Phase.IDLE) dialScreen() else callScreen()
        renderedPhase = state.phase
    }

    private fun scrollBody(): LinearLayout {
        val body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL }
        content.addView(ScrollView(this).apply { isFillViewport = true; addView(body); isVerticalScrollBarEnabled = false },
            LinearLayout.LayoutParams(-1, -1))
        return body
    }

    private fun dialScreen() {
        val body = scrollBody()
        body.addView(label("Один звонок. Вся компания.", 23, true).apply { setPadding(0, dp(16), 0, dp(8)) })
        body.addView(label("До 8 человек · сначала сверьте SAS в чате", 12, color = GRAY))
        val input = EditText(this).apply {
            textSize = 23f; gravity = Gravity.CENTER; hint = "Номер, номер, …"
            inputType = InputType.TYPE_CLASS_PHONE; setText(dial)
            filters = arrayOf(InputFilter.LengthFilter(70)); contentDescription = "Номера участников"
            addTextChangedListener(watcher { dial = it; callButton?.isEnabled = state.online && parseMembers(dial).isNotEmpty() })
        }
        body.addView(input, LinearLayout.LayoutParams(-1, dp(64)))
        listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf(",", "0", "⌫")).forEach { keys ->
            val row = LinearLayout(this)
            keys.forEach { key -> row.addView(button(key) {
                input.setText(if (key == "⌫") dial.dropLast(1) else dial + key)
                input.setSelection(input.text.length)
            }.apply { textSize = 24f; background = shape(Color.WHITE, 12); if (key == "⌫") contentDescription = "Удалить цифру" },
                LinearLayout.LayoutParams(0, dp(50), 1f)) }
            body.addView(row, LinearLayout.LayoutParams(-1, -2))
        }
        callButton = button("Позвонить  ↗", true) { requestCall("dial") }
        body.addView(callButton, LinearLayout.LayoutParams(-1, dp(56)).apply { topMargin = dp(14) })
        callButton?.isEnabled = state.online && parseMembers(dial).isNotEmpty()
        body.addView(label("LiveKit SFU · Opus · E2EE\nКлюч комнаты создаётся на устройстве", 11, color = GRAY).apply {
            gravity = Gravity.CENTER; setPadding(0, dp(14), 0, 0)
        })
    }

    private fun callScreen() {
        val body = scrollBody()
        body.addView(label(if (state.phase == Phase.INCOMING) "Входящий групповой звонок" else "Зашифрованная группа", 21, true).apply {
            setPadding(0, dp(24), 0, dp(12))
        })
        participants = label("", 16).apply { gravity = Gravity.CENTER; setLineSpacing(dp(5).toFloat(), 1f) }
        body.addView(participants)
        timer = label(if (state.phase == Phase.CONNECTED) "00:00" else "•••", 25).apply { setPadding(0, dp(24), 0, dp(24)) }
        body.addView(timer)
        if (state.phase == Phase.INCOMING) {
            body.addView(button("Ответить", true) { requestCall("accept") }, LinearLayout.LayoutParams(-1, dp(56)))
        } else {
            val row = LinearLayout(this)
            mute = button("Микрофон") { service?.toggleMute() }
            speaker = button("Динамик") { service?.toggleSpeaker() }
            row.addView(mute, LinearLayout.LayoutParams(0, dp(60), 1f).apply { marginEnd = dp(6) })
            row.addView(speaker, LinearLayout.LayoutParams(0, dp(60), 1f).apply { marginStart = dp(6) })
            body.addView(row)
        }
        body.addView(button(if (state.phase == Phase.INCOMING) "Отклонить" else "Завершить для всей группы", true) { service?.hangup() },
            LinearLayout.LayoutParams(-1, dp(56)).apply { topMargin = dp(16) })
        body.addView(label("При выходе любого участника группа завершается.\nДля нового состава — новый звонок и новый ключ.\nАктивный звонок можно свернуть.", 12, color = GRAY).apply {
            gravity = Gravity.CENTER; setPadding(0, dp(22), 0, 0)
        })
    }

    private fun chatScreen() {
        val row = LinearLayout(this)
        val peer = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER; filters = arrayOf(InputFilter.LengthFilter(8))
            hint = "Номер друга"; textSize = 16f; setText(selectedPeer); contentDescription = "Номер контакта"
        }
        row.addView(peer, LinearLayout.LayoutParams(0, dp(48), 1f))
        row.addView(button("Открыть") {
            val target = peer.text.toString()
            if (!target.matches(Regex("[0-9]{8}"))) { toast("Введите 8 цифр"); return@button }
            action {
                val s = service ?: error("Not connected")
                code = s.inspectPeer(target)
                selectedPeer = target; peerVerified = s.verified(target)
                contactLabel?.text = contactText()
                verifyButton?.visibility = if (peerVerified) View.GONE else View.VISIBLE
                loadHistory()
            }
        }, LinearLayout.LayoutParams(dp(92), dp(44)))
        content.addView(row)
        contactLabel = label(contactText(), 10, color = GRAY).apply { setPadding(0, dp(8), 0, dp(6)); setTextIsSelectable(true) }
        content.addView(contactLabel)
        verifyButton = button("Коды SAS совпали — доверять") {
            if (selectedPeer.isEmpty() || code.isEmpty()) return@button
            AlertDialog.Builder(this).setTitle("Подтвердить личность?")
                .setMessage("Сравните весь код с другом через другой доверенный канал или лично. Не подтверждайте код только по сообщению через этот сервер.")
                .setNegativeButton("Отмена", null).setPositiveButton("Сверено лично", { _, _ -> action {
                    service?.verifyPeer(selectedPeer); peerVerified = true
                    contactLabel?.text = contactText(); verifyButton?.visibility = View.GONE
                } }).show()
        }.apply { visibility = if (selectedPeer.isNotEmpty() && !peerVerified) View.VISIBLE else View.GONE }
        content.addView(verifyButton, LinearLayout.LayoutParams(-1, dp(40)))
        val paging = LinearLayout(this)
        paging.addView(button("Ранее") { loadHistory(older = true) }, LinearLayout.LayoutParams(0, dp(36), 1f))
        paging.addView(button("Новые") { loadHistory() }, LinearLayout.LayoutParams(0, dp(36), 1f))
        content.addView(paging)
        chatList = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@MainActivity).apply { stackFromEnd = true }
            adapter = messageAdapter; itemAnimator = null
        }
        content.addView(chatList, LinearLayout.LayoutParams(-1, 0, 1f))
        val composer = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        val input = EditText(this).apply {
            hint = "Сообщение"; textSize = 16f
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            filters = arrayOf(InputFilter.LengthFilter(2_000)); maxLines = 4
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
        }
        composer.addView(input, LinearLayout.LayoutParams(0, -2, 1f))
        composer.addView(button("↑", true) {
            if (!peerVerified) { toast("Сначала сверьте SAS с обеих сторон"); return@button }
            val text = input.text.toString()
            if (text.isBlank()) return@button
            action { service?.sendChat(selectedPeer, text) ?: error("Not connected"); input.setText(""); loadHistory() }
        }.apply { textSize = 24f; contentDescription = "Отправить сообщение" }, LinearLayout.LayoutParams(dp(48), dp(48)))
        content.addView(composer)
        if (selectedPeer.isNotEmpty()) loadHistory()
    }

    private fun contactText(): String = when {
        selectedPeer.isEmpty() -> "Откройте контакт и сверьте SAS с обеих сторон. История хранится зашифрованной на телефоне."
        code.isEmpty() -> "Откройте контакт заново для проверки ключа"
        else -> "${if (peerVerified) "✓ Личность подтверждена" else "Личность не подтверждена"} · $selectedPeer\n${code.chunked(5).joinToString(" ")}"
    }

    private fun loadHistory(older: Boolean = false) {
        val s = service ?: return
        if (selectedPeer.isEmpty()) return
        val target = selectedPeer
        val before = if (older) history.firstOrNull()?.sequence else null
        historyJob?.cancel()
        historyJob = ui.launch {
            try {
                val page = s.messages(target, before)
                if (selectedPeer != target || tab != "chat") return@launch
                history = if (older) (page + history).distinctBy { it.id }.take(200) else page
                messageAdapter.submitList(history) {
                    if (!older && history.isNotEmpty()) chatList?.scrollToPosition(history.lastIndex)
                }
            } catch (_: CancellationException) { }
            catch (_: Exception) { toast("Не удалось прочитать зашифрованную историю") }
        }
    }

    private fun parseMembers(value: String): List<String> {
        val numbers = value.split(',').map { it.trim().replace(" ", "") }
        return numbers.takeIf { it.size in 1..7 && it.all { n -> n.matches(Regex("[0-9]{8}")) } && it.distinct().size == it.size } ?: emptyList()
    }

    private fun requestCall(action: String) {
        if (service == null || !state.online) { toast("Нет подключения к серверу"); return }
        if (action == "dial" && parseMembers(dial).isEmpty()) { toast("Укажите от 1 до 7 номеров через запятую"); return }
        val permissions = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        if (permissions.isNotEmpty()) { pendingAction = action; requestPermissions(permissions.toTypedArray(), 1) }
        else launchCall(action)
    }

    override fun onRequestPermissionsResult(code: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(code, permissions, results)
        val action = pendingAction ?: return
        pendingAction = null
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) launchCall(action)
        else toast("Для звонка нужен доступ к микрофону")
    }

    private fun launchCall(action: String) {
        startForegroundService(Intent(this, CallService::class.java).setAction(action).putStringArrayListExtra("members", ArrayList(parseMembers(dial))))
    }

    private fun settings() {
        if (state.phase != Phase.IDLE) { toast("Настройки доступны после звонка"); return }
        val body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(6), dp(20), dp(12)) }
        val old = service?.config()
        fun field(title: String, hint: String, value: String): EditText {
            body.addView(label(title, 11, color = GRAY).apply { setPadding(0, dp(10), 0, 0) })
            return EditText(this).apply {
                this.hint = hint; textSize = 13f; setText(value)
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO; body.addView(this)
            }
        }
        val api = field("API WebSocket", "wss://api.example.org/signal", old?.apiUrl ?: "")
        val apiPin = field("API SPKI SHA-256 pin (+ резервный через запятую)", "sha256/…", old?.apiPins ?: "")
        val media = field("LiveKit", "wss://rtc.example.org", old?.mediaUrl ?: "")
        val mediaPin = field("LiveKit SPKI SHA-256 pin", "sha256/…", old?.mediaPins ?: "")
        val quality = Switch(this).apply { text = "Opus HQ · до 510 Кбит/с"; isChecked = state.highQuality; textSize = 13f }
        body.addView(quality)
        body.addView(label("Выключено: речевой режим 64 Кбит/с. Нужны свои серверы и настоящие pins из доверенного источника. E2EE скрывает содержимое, но не IP, состав группы и время соединения. Входящие — при открытом приложении.", 12, color = GRAY))
        val dialog = AlertDialog.Builder(this).setTitle("Защищённое соединение")
            .setView(ScrollView(this).apply { addView(body) }).setNegativeButton("Отмена", null).setPositiveButton("Сохранить", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            try {
                val config = EndpointConfig(api.text.toString().trim(), apiPin.text.toString().trim(), media.text.toString().trim(), mediaPin.text.toString().trim())
                config.validate()
                service?.configure(config, quality.isChecked) ?: error("Сервис не готов")
                dialog.dismiss()
            } catch (e: Exception) { api.error = e.message ?: "Проверьте настройки" }
        } }
        dialog.show()
    }

    private fun action(block: suspend () -> Unit) { ui.launch {
        try { block() } catch (_: CancellationException) { }
        catch (_: Exception) { toast("Операция не выполнена. Проверьте сеть, ключи и SAS с обеих сторон") }
    } }

    private inner class MessageAdapter : ListAdapter<ChatMessage, MessageView>(object : DiffUtil.ItemCallback<ChatMessage>() {
        override fun areItemsTheSame(a: ChatMessage, b: ChatMessage) = a.id == b.id
        override fun areContentsTheSame(a: ChatMessage, b: ChatMessage) = a == b
    }) {
        override fun onCreateViewHolder(parent: ViewGroup, type: Int): MessageView = MessageView(label("", 15).apply {
            layoutParams = RecyclerView.LayoutParams(-1, -2).apply { topMargin = dp(5); bottomMargin = dp(5) }
            setPadding(dp(14), dp(10), dp(14), dp(10))
        })
        override fun onBindViewHolder(holder: MessageView, position: Int) {
            val item = getItem(position)
            holder.text.text = item.text + if (item.outgoing) "\n" + when (item.status) {
                "sent" -> "отправлено · не означает прочитано"
                "failed" -> "не отправлено · повтор при подключении"
                else -> "отправляется…"
            } else ""
            holder.text.gravity = if (item.outgoing) Gravity.END else Gravity.START
            holder.text.background = shape(if (item.outgoing) Color.BLACK else PALE, 14)
            holder.text.setTextColor(if (item.outgoing) Color.WHITE else Color.BLACK)
        }
    }

    private class MessageView(val text: TextView) : RecyclerView.ViewHolder(text)
    private fun watcher(onChange: (String) -> Unit) = object : android.text.TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { onChange(s.toString()) }
        override fun afterTextChanged(s: android.text.Editable?) = Unit
    }
    private fun label(value: String, size: Int, bold: Boolean = false, color: Int = Color.BLACK) = TextView(this).apply {
        text = value; textSize = size.toFloat(); setTextColor(color)
        if (bold) typeface = Typeface.create("sans-serif", Typeface.BOLD)
    }
    private fun button(value: String, dark: Boolean = false, action: () -> Unit) = Button(this).apply {
        text = value; textSize = 13f; isAllCaps = false
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        setTextColor(if (dark) Color.WHITE else Color.BLACK)
        background = shape(if (dark) Color.BLACK else PALE, 16)
        setPadding(dp(8), 0, dp(8), 0); setOnClickListener { action() }
    }
    private fun shape(color: Int, radius: Int) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun toast(value: String) = Toast.makeText(this, value, Toast.LENGTH_LONG).show()
    companion object { private const val GRAY = 0xFF777777.toInt(); private const val PALE = 0xFFF3F3F3.toInt() }
}
