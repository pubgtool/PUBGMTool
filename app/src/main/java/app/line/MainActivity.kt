package app.line

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.*
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
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
import app.line.ui.LineIcon
import app.line.ui.Motion
import app.line.ui.RefreshPolicy
import app.line.ui.UiPresentation
import kotlinx.coroutines.*
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private val ui = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var service: CallService? = null
    private var bound = false
    private var state = CallState()
    private var tab = "calls"
    private var screen = ""
    private lateinit var root: LinearLayout
    private lateinit var content: FrameLayout
    private lateinit var heading: TextView
    private lateinit var presence: TextView
    private lateinit var navigation: LinearLayout
    private var numberTitle: TextView? = null
    private var numberHint: TextView? = null
    private var dial = ""
    private var pendingAction: String? = null
    private var selectedPeer = ""
    private var peerVerified = false
    private var safetyCode = ""
    private var history = emptyList<ChatMessage>()
    private var historyJob: Job? = null
    private val adapter = MessageAdapter()
    private var chatList: RecyclerView? = null
    private var chatHeading: TextView? = null
    private var trustAction: LinearLayout? = null
    private var timer: TextView? = null
    private var participantRows: LinearLayout? = null
    private var muteControl: LinearLayout? = null
    private var speakerControl: LinearLayout? = null
    private var primaryCall: LinearLayout? = null
    private var primaryLabel: TextView? = null
    private val main = Handler(Looper.getMainLooper())
    private val observer: (CallState) -> Unit = { render(it) }
    private val tick = object : Runnable {
        override fun run() {
            if (state.connectedAt > 0) {
                val seconds = (SystemClock.elapsedRealtime() - state.connectedAt) / 1000
                timer?.text = "%02d:%02d".format(seconds / 60, seconds % 60)
                main.postDelayed(this, 1000)
            }
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
        tab = savedInstanceState?.getString("tab") ?: "calls"
        selectedPeer = savedInstanceState?.getString("peer") ?: ""
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN)
        root = column().apply { setBackgroundColor(WHITE); isFocusableInTouchMode = true }
        root.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime())
                view.setPadding(0, bars.top, 0, bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(0, insets.systemWindowInsetTop, 0, insets.systemWindowInsetBottom)
            }
            insets
        }
        val header = row().apply { setPadding(dp(24), dp(14), dp(24), dp(14)) }
        val titles = column()
        heading = text("Звонки", 30, Typeface.BOLD)
        presence = text("Не подключён", 12, color = GRAY).apply { setPadding(0, dp(4), 0, 0) }
        titles.addView(heading); titles.addView(presence)
        header.addView(titles, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(iconButton("settings", "Настройки", PALE) { showSettings() }, LinearLayout.LayoutParams(dp(46), dp(46)))
        root.addView(header)
        content = FrameLayout(this)
        root.addView(content, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(divider())
        navigation = row().apply { setPadding(dp(12), dp(8), dp(12), dp(8)) }
        root.addView(navigation)
        setContentView(root)
        root.requestFocus()
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
        }
        render(state)
    }

    override fun onStart() {
        super.onStart()
        bound = bindService(Intent(this, CallService::class.java), binding, BIND_AUTO_CREATE)
    }

    override fun onResume() {
        super.onResume()
        RefreshPolicy.apply(this, root)
        if (state.connectedAt > 0) main.post(tick)
    }

    override fun onPause() {
        main.removeCallbacks(tick)
        RefreshPolicy.clear(this)
        super.onPause()
    }

    override fun onStop() {
        service?.removeObserver(observer)
        if (bound) unbindService(binding)
        bound = false; service = null
        historyJob?.cancel()
        super.onStop()
    }

    override fun onDestroy() { ui.cancel(); super.onDestroy() }
    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("dial", dial); outState.putString("tab", tab); outState.putString("peer", selectedPeer)
        super.onSaveInstanceState(outState)
    }

    private fun render(value: CallState) {
        val previous = state
        val historyChanged = previous.chatVersion != value.chatVersion
        state = value
        presence.text = UiPresentation.connection(value)
        if (value.phase == Phase.INCOMING && previous.phase != Phase.INCOMING) tab = "calls"
        val desired = if (tab == "calls" && value.phase != Phase.IDLE) "active" else tab
        val numberAssigned = previous.number.isEmpty() != value.number.isEmpty()
        val incomingChanged = (previous.phase == Phase.INCOMING) != (value.phase == Phase.INCOMING)
        if (screen != desired || (desired == "active" && incomingChanged) || previous.configReady != value.configReady ||
            (desired in setOf("calls", "profile") && numberAssigned) || (desired == "profile" && previous.highQuality != value.highQuality)) {
            rebuild(desired, animate = screen.isNotEmpty())
        }
        numberTitle?.text = UiPresentation.numberTitle(value)
        numberHint?.text = UiPresentation.numberHint(value)
        primaryLabel?.text = callActionTitle()
        primaryCall?.contentDescription = callActionTitle()
        primaryCall?.alpha = if (UiPresentation.canCall(value) && members(dial).isEmpty()) 0.45f else 1f
        if (screen == "active") {
            if (previous.members != value.members || previous.participants != value.participants || previous.phase != value.phase) renderParticipants()
            if (previous.muted != value.muted || muteControl?.childCount == 0) updateToggle(muteControl, if (value.muted) "muted" else "mic", "Микрофон", value.muted)
            if (previous.speaker != value.speaker || speakerControl?.childCount == 0) updateToggle(speakerControl, "speaker", "Динамик", value.speaker)
            if (value.connectedAt > 0 && previous.connectedAt == 0L) main.post(tick)
            if (value.connectedAt == 0L) timer?.text = when (value.phase) {
                Phase.INCOMING -> "Входящий звонок"
                Phase.OUTGOING -> "Вызов…"
                else -> "Соединяем…"
            }
        }
        if (historyChanged && screen == "chat" && selectedPeer.isNotEmpty()) loadHistory()
    }

    private fun navigate(target: String) {
        if (tab == target) return
        tab = target; historyJob?.cancel()
        rebuild(if (target == "calls" && state.phase != Phase.IDLE) "active" else target, true)
    }

    private fun rebuild(target: String, animate: Boolean) {
        historyJob?.cancel(); content.animate().cancel()
        content.removeAllViews()
        numberTitle = null; numberHint = null; chatList = null; chatHeading = null; trustAction = null
        primaryCall = null; primaryLabel = null; timer = null; participantRows = null; muteControl = null; speakerControl = null
        screen = target
        heading.text = when (tab) { "chat" -> "Сообщения"; "profile" -> "Профиль"; else -> "Звонки" }
        when (target) { "calls" -> dialScreen(); "chat" -> chatScreen(); "profile" -> profileScreen(); else -> callScreen() }
        renderNavigation()
        primaryLabel?.text = callActionTitle()
        primaryCall?.contentDescription = callActionTitle()
        if (animate) Motion.enter(content)
    }

    private fun renderNavigation() {
        navigation.removeAllViews()
        listOf(Triple("calls", "phone", "Звонки"), Triple("chat", "chat", "Сообщения"), Triple("profile", "person", "Профиль")).forEach { (id, icon, title) ->
            val item = column().apply {
                gravity = Gravity.CENTER
                background = ripple(if (tab == id) PALE else WHITE, 18)
                addView(LineIcon(this@MainActivity, icon, if (tab == id) INK else GRAY), LinearLayout.LayoutParams(dp(22), dp(22)))
                addView(text(title, 11, if (tab == id) Typeface.BOLD else Typeface.NORMAL, if (tab == id) INK else GRAY).apply { setPadding(0, dp(5), 0, 0) })
                contentDescription = title; setOnClickListener { navigate(id) }; Motion.press(this)
            }
            navigation.addView(item, LinearLayout.LayoutParams(0, dp(58), 1f).apply { setMargins(dp(4), 0, dp(4), 0) })
        }
    }

    private fun scrollBody(): LinearLayout {
        val body = column().apply { setPadding(dp(24), dp(4), dp(24), dp(20)) }
        content.addView(ScrollView(this).apply {
            isFillViewport = true; isVerticalScrollBarEnabled = false; overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            addView(body)
        }, FrameLayout.LayoutParams(-1, -1))
        return body
    }

    private fun numberCard(compact: Boolean = false): LinearLayout {
        val assigned = state.number.isNotEmpty()
        val card = row().apply {
            background = ripple(if (assigned) INK else PALE, 24)
            setPadding(dp(20), dp(if (compact) 12 else 20), dp(18), dp(if (compact) 12 else 20))
            setOnClickListener { if (state.number.isNotEmpty()) copyNumber() else showConnect() }
            contentDescription = "Ваш номер"; Motion.press(this)
        }
        val labels = column()
        labels.addView(text("Ваш номер", 12, color = if (assigned) 0xFFB2B2B2.toInt() else GRAY))
        numberTitle = text(UiPresentation.numberTitle(state), if (assigned) if (compact) 24 else 32 else 21, Typeface.BOLD, if (assigned) WHITE else INK).apply {
            setPadding(0, dp(if (compact) 4 else 10), 0, dp(if (compact) 0 else 8)); setFontFeatureSettings("tnum")
        }
        labels.addView(numberTitle)
        numberHint = text(UiPresentation.numberHint(state), 12, color = if (assigned) 0xFFB2B2B2.toInt() else GRAY)
        if (!compact) labels.addView(numberHint)
        card.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
        card.addView(LineIcon(this, if (assigned) "copy" else "arrow", if (assigned) WHITE else INK), LinearLayout.LayoutParams(dp(22), dp(22)))
        return card
    }

    private fun dialScreen() {
        val body = scrollBody()
        val scroller = content.getChildAt(0)
        content.removeView(scroller)
        val layout = column()
        layout.addView(scroller, LinearLayout.LayoutParams(-1, 0, 1f))
        content.addView(layout, FrameLayout.LayoutParams(-1, -1))
        body.addView(numberCard(compact = state.configReady))
        if (state.configReady) {
        val subtitle = row().apply { setPadding(0, dp(14), 0, dp(8)) }
        subtitle.addView(text("Новый звонок", 17, Typeface.BOLD), LinearLayout.LayoutParams(0, -2, 1f))
        subtitle.addView(text("До 8 участников", 12, color = GRAY))
        body.addView(subtitle)
        val input = EditText(this).apply {
            textSize = 29f; typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER; hint = "Номер друга"; setHintTextColor(0xFFAAAAAA.toInt())
            inputType = InputType.TYPE_CLASS_PHONE; filters = arrayOf(InputFilter.LengthFilter(70))
            background = shape(WHITE, 16, BORDER); setPadding(dp(10), 0, dp(10), 0)
            showSoftInputOnFocus = false; setSingleLine(true); setText(dial)
            contentDescription = "Номера участников"
            addTextChangedListener(watcher { dial = it; primaryCall?.alpha = if (UiPresentation.canCall(state) && members(it).isEmpty()) 0.45f else 1f })
        }
        body.addView(input, LinearLayout.LayoutParams(-1, dp(54)))
        listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf(",", "0", "delete")).forEach { keys ->
            val row = row()
            keys.forEach { key ->
                val cell = FrameLayout(this).apply {
                    background = ripple(WHITE, 20)
                    val child: View = if (key == "delete") LineIcon(this@MainActivity, key, INK) else text(if (key == ",") "+" else key, 29)
                    addView(child, FrameLayout.LayoutParams(if (key == "delete") dp(24) else -2, if (key == "delete") dp(24) else -2, Gravity.CENTER))
                    contentDescription = when (key) { "," -> "Добавить участника"; "delete" -> "Удалить цифру"; else -> key }
                    setOnClickListener {
                        input.setText(when (key) { "delete" -> dial.dropLast(1); else -> (dial + key).take(70) })
                        input.setSelection(input.text.length)
                    }
                    if (key == "delete") setOnLongClickListener { input.setText(""); true }
                    Motion.press(this)
                }
                row.addView(cell, LinearLayout.LayoutParams(0, dp(48), 1f).apply { setMargins(dp(3), 0, dp(3), 0) })
            }
            body.addView(row)
        }
        }
        primaryCall = actionButton("Позвонить", "phone", true) {
            when {
                !state.configReady -> showConnect()
                !state.online -> service?.reconnectNow()
                !state.mediaReady -> info("Звонки пока недоступны", "Сервис сообщений подключён, но сервис звонков ещё не настроен. Обратитесь к администратору Line.")
                else -> requestCall("dial")
            }
        }
        primaryLabel = primaryCall?.findViewWithTag("label")
        val footer = FrameLayout(this).apply { setPadding(dp(24), dp(8), dp(24), dp(12)) }
        footer.addView(primaryCall, FrameLayout.LayoutParams(-1, dp(58)))
        layout.addView(footer)
    }

    private fun callScreen() {
        val body = scrollBody()
        body.addView(text("Групповой звонок", 23, Typeface.BOLD).apply { gravity = Gravity.CENTER; setPadding(0, dp(22), 0, dp(14)) })
        timer = text("Соединяем…", 15, color = GRAY).apply { gravity = Gravity.CENTER; setFontFeatureSettings("tnum") }
        body.addView(timer)
        participantRows = column().apply { setPadding(0, dp(24), 0, dp(20)) }
        body.addView(participantRows)
        renderParticipants()
        if (state.phase == Phase.INCOMING) {
            body.addView(actionButton("Ответить", "phone", true) { requestCall("accept") }, LinearLayout.LayoutParams(-1, dp(58)))
        } else {
            val controls = row()
            muteControl = column().apply { setOnClickListener { service?.toggleMute() }; Motion.press(this) }
            speakerControl = column().apply { setOnClickListener { service?.toggleSpeaker() }; Motion.press(this) }
            controls.addView(muteControl, LinearLayout.LayoutParams(0, dp(94), 1f).apply { marginEnd = dp(8) })
            controls.addView(speakerControl, LinearLayout.LayoutParams(0, dp(94), 1f).apply { marginStart = dp(8) })
            body.addView(controls)
            updateToggle(muteControl, if (state.muted) "muted" else "mic", "Микрофон", state.muted)
            updateToggle(speakerControl, "speaker", "Динамик", state.speaker)
        }
        body.addView(actionButton(if (state.phase == Phase.INCOMING) "Отклонить" else "Завершить звонок", "phone", state.phase == Phase.INCOMING) { service?.hangup() },
            LinearLayout.LayoutParams(-1, dp(58)).apply { topMargin = dp(16) })
        body.addView(text("Выход завершит звонок для всей группы", 12, color = GRAY).apply {
            gravity = Gravity.CENTER; setPadding(0, dp(18), 0, 0)
        })
    }

    private fun renderParticipants() {
        val rows = participantRows ?: return
        rows.removeAllViews()
        state.members.forEach { member ->
            val item = row().apply { setPadding(dp(14), dp(14), dp(14), dp(14)); background = shape(PALE, 18) }
            item.addView(avatar(member), LinearLayout.LayoutParams(dp(42), dp(42)).apply { marginEnd = dp(14) })
            val labels = column()
            labels.addView(text(if (member == state.number) "Вы" else formatNumber(member), 16, Typeface.BOLD))
            labels.addView(text(if (member in state.participants) "В звонке" else "Ожидаем ответа", 12, color = GRAY).apply { setPadding(0, dp(3), 0, 0) })
            item.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
            if (member in state.participants) item.addView(LineIcon(this, "check", INK), LinearLayout.LayoutParams(dp(18), dp(18)))
            rows.addView(item, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
        }
    }

    private fun updateToggle(control: LinearLayout?, icon: String, title: String, active: Boolean) {
        control ?: return
        control.removeAllViews(); control.gravity = Gravity.CENTER
        control.background = ripple(if (active) INK else PALE, 20)
        control.addView(LineIcon(this, icon, if (active) WHITE else INK), LinearLayout.LayoutParams(dp(26), dp(26)))
        control.addView(text(if (active && icon == "muted") "Выключен" else title, 12, color = if (active) WHITE else INK).apply { setPadding(0, dp(10), 0, 0) })
        control.contentDescription = if (icon == "mic" || icon == "muted") "Микрофон: ${if (active) "выключен" else "включён"}"
            else "$title: ${if (active) "включён" else "выключен"}"
    }

    private fun chatScreen() {
        val body = column().apply { setPadding(dp(24), dp(4), dp(24), dp(12)) }
        content.addView(body, FrameLayout.LayoutParams(-1, -1))
        if (selectedPeer.isEmpty()) {
            val empty = column().apply { gravity = Gravity.CENTER }
            empty.addView(LineIcon(this, "chat", INK), LinearLayout.LayoutParams(dp(48), dp(48)))
            empty.addView(text("Начните разговор", 23, Typeface.BOLD).apply { setPadding(0, dp(24), 0, dp(12)); gravity = Gravity.CENTER })
            empty.addView(text("Откройте контакт по его номеру", 14, color = GRAY).apply { gravity = Gravity.CENTER })
            body.addView(empty, LinearLayout.LayoutParams(-1, 0, 1f))
            body.addView(actionButton("Новое сообщение", "add", true) { openContactDialog() }, LinearLayout.LayoutParams(-1, dp(58)))
            return
        }
        val contact = row().apply {
            background = ripple(PALE, 20); setPadding(dp(14), dp(14), dp(14), dp(14))
            setOnClickListener { openContactDialog() }; Motion.press(this)
        }
        contact.addView(avatar(selectedPeer), LinearLayout.LayoutParams(dp(42), dp(42)).apply { marginEnd = dp(12) })
        val labels = column()
        labels.addView(text(formatNumber(selectedPeer), 17, Typeface.BOLD))
        chatHeading = text(if (peerVerified) "Контакт подтверждён" else "Проверьте контакт", 12, color = GRAY).apply { setPadding(0, dp(3), 0, 0) }
        labels.addView(chatHeading)
        contact.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
        contact.addView(LineIcon(this, "chevron", INK), LinearLayout.LayoutParams(dp(18), dp(18)))
        body.addView(contact)
        trustAction = actionButton(if (peerVerified) "Посмотреть код безопасности" else "Подтвердить контакт", "key", false) { showSafety() }
        body.addView(trustAction, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(8); bottomMargin = dp(4) })
        chatList = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@MainActivity).apply { stackFromEnd = true }
            adapter = this@MainActivity.adapter; itemAnimator = null; setHasFixedSize(true)
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(view: RecyclerView, dx: Int, dy: Int) {
                    if (dy < 0 && (view.layoutManager as LinearLayoutManager).findFirstVisibleItemPosition() <= 3) loadHistory(true)
                }
            })
        }
        body.addView(chatList, LinearLayout.LayoutParams(-1, 0, 1f))
        val composer = row().apply { background = shape(PALE, 24); setPadding(dp(14), dp(6), dp(6), dp(6)) }
        val input = EditText(this).apply {
            hint = "Сообщение"; textSize = 16f; setHintTextColor(GRAY)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            filters = arrayOf(InputFilter.LengthFilter(2000)); maxLines = 4; background = null
            setPadding(0, dp(6), dp(8), dp(6)); importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
        }
        composer.addView(input, LinearLayout.LayoutParams(0, -2, 1f))
        val sendButton = iconButton("send", "Отправить сообщение", INK, WHITE) {
            if (!peerVerified) { showSafety(); return@iconButton }
            val draft = input.text.toString()
            if (draft.isBlank()) return@iconButton
            input.isEnabled = false
            action {
                try { service?.sendChat(selectedPeer, draft) ?: error("Нет подключения"); input.setText(""); loadHistory() }
                finally { input.isEnabled = true }
            }
        }
        composer.addView(sendButton, LinearLayout.LayoutParams(dp(42), dp(42)))
        body.addView(composer)
        loadHistory()
        if (safetyCode.isEmpty()) action {
            val target = selectedPeer
            safetyCode = service?.inspectPeer(target) ?: error("Нет подключения")
            if (selectedPeer == target) {
                peerVerified = service?.verified(target) == true
                chatHeading?.text = if (peerVerified) "Контакт подтверждён" else "Проверьте контакт"
            }
        }
    }

    private fun openContactDialog() {
        val box = column().apply { setPadding(dp(24), dp(12), dp(24), 0) }
        val input = EditText(this).apply {
            hint = "8 цифр"; textSize = 22f; inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(InputFilter.LengthFilter(8)); setText(selectedPeer)
            contentDescription = "Номер контакта"
        }
        box.addView(input)
        val dialog = AlertDialog.Builder(this).setTitle("Новое сообщение").setView(box).setNegativeButton("Отмена", null)
            .setPositiveButton("Открыть", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val target = input.text.toString().trim()
            if (!target.matches(Regex("[0-9]{8}")) || target == state.number) { input.error = "Введите номер другого человека"; return@setOnClickListener }
            action {
                val s = service ?: error("Нет подключения")
                val code = s.inspectPeer(target)
                selectedPeer = target; safetyCode = code; peerVerified = s.verified(target); history = emptyList()
                dialog.dismiss(); tab = "chat"; rebuild("chat", true)
            }
        } }
        dialog.show()
    }

    private fun showSafety() {
        if (selectedPeer.isEmpty()) return
        if (safetyCode.isEmpty()) { toast("Сначала подключитесь и откройте контакт"); return }
        val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(4)) }
        box.addView(text("Сравните этот код с другом лично или через другой доверенный канал.", 14, color = GRAY))
        box.addView(text(safetyCode.chunked(5).joinToString(" "), 19, Typeface.BOLD).apply {
            setPadding(0, dp(20), 0, dp(20)); setTextIsSelectable(true); setLineSpacing(dp(7).toFloat(), 1f)
        })
        AlertDialog.Builder(this).setTitle("Подтверждение контакта").setView(box).setNegativeButton("Позже", null)
            .setPositiveButton(if (peerVerified) "Готово" else "Коды совпали", { _, _ -> if (!peerVerified) action {
                service?.verifyPeer(selectedPeer) ?: error("Нет подключения"); peerVerified = true
                chatHeading?.text = "Контакт подтверждён"
                trustAction?.findViewWithTag<TextView>("label")?.text = "Посмотреть код безопасности"
            } }).show()
    }

    private fun loadHistory(older: Boolean = false) {
        val s = service ?: return
        if (selectedPeer.isEmpty() || screen != "chat") return
        if (older && historyJob?.isActive == true) return
        val target = selectedPeer
        val before = if (older) history.firstOrNull()?.sequence else null
        if (older && before == null) return
        historyJob?.cancel()
        historyJob = ui.launch {
            try {
                val page = s.messages(target, before)
                if (selectedPeer != target || screen != "chat") return@launch
                history = if (older) (page + history).distinctBy { it.id }.take(200) else page
                adapter.submitList(history) { if (!older && history.isNotEmpty()) chatList?.scrollToPosition(history.lastIndex) }
            } catch (_: CancellationException) { }
            catch (_: Exception) { toast("Не удалось открыть историю сообщений") }
        }
    }

    private fun profileScreen() {
        val body = scrollBody()
        body.addView(numberCard())
        body.addView(text("Подключение", 17, Typeface.BOLD).apply { setPadding(0, dp(28), 0, dp(14)) })
        val configuration = service?.config()
        body.addView(settingsRow("Line", if (configuration == null) "Не подключён" else runCatching { URI(configuration.apiUrl).host }.getOrDefault("Настроен"), "arrow") { showConnect() })
        body.addView(settingsRow("Качество звонка", if (state.highQuality) "Высокое" else "Для слабой сети", "speaker") { showQuality() })
        body.addView(settingsRow("Подключение вручную", "Для администратора сервиса", "settings") { showManualSettings() })
        body.addView(settingsRow("О приложении", "Line 0.3", "person") {
            info("Line", "Групповые звонки и личные сообщения.\n\nСодержимое защищено на устройствах. Сервис и сеть могут видеть участников, адреса и время соединений. Входящие доступны, пока приложение открыто.")
        })
        if (configuration == null) body.addView(text("Чтобы получить номер и связаться с друзьями, нужен код подключения к действующему сервису Line.", 13, color = GRAY).apply { setPadding(0, dp(22), 0, 0) })
    }

    private fun showSettings() { navigate("profile") }

    private fun showQuality() {
        AlertDialog.Builder(this).setTitle("Качество звонка")
            .setSingleChoiceItems(arrayOf("Высокое", "Для слабой сети"), if (state.highQuality) 0 else 1) { dialog, which ->
                service?.setQuality(which == 0); dialog.dismiss()
            }.setNegativeButton("Отмена", null).show()
    }

    private fun showConnect() {
        if (state.phase != Phase.IDLE) { toast("Завершите звонок перед изменением подключения"); return }
        val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(4)) }
        box.addView(text("Вставьте код от администратора вашего сервиса. В нём уже заданы настройки сообщений и звонков.", 14, color = GRAY))
        val code = EditText(this).apply {
            hint = "Код подключения"; textSize = 15f; maxLines = 4; filters = arrayOf(InputFilter.LengthFilter(4096))
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
        }
        box.addView(code)
        val dialog = AlertDialog.Builder(this).setTitle("Подключить Line").setView(box)
            .setNegativeButton("Отмена", null).setPositiveButton("Продолжить", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val config = runCatching { ConnectionProfile.decode(code.text.toString()) }.getOrElse { code.error = it.message; return@setOnClickListener }
            AlertDialog.Builder(this).setTitle("Подключиться к сервису?")
                .setMessage("${URI(config.apiUrl).host}\n\nИспользуйте код только из доверенного источника. Этот сервис будет выдавать ваш номер и соединять звонки.")
                .setNegativeButton("Отмена", null).setPositiveButton("Подключиться", { _, _ ->
                    try { service?.configure(config, state.highQuality) ?: error("Сервис запускается. Повторите через секунду"); dialog.dismiss() }
                    catch (error: Exception) { code.error = error.message }
                }).show()
        } }
        dialog.show()
    }

    private fun showManualSettings() {
        if (state.phase != Phase.IDLE) { toast("Завершите звонок перед изменением подключения"); return }
        val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(12)) }
        val old = service?.config()
        fun field(title: String, value: String): EditText {
            box.addView(text(title, 12, color = GRAY).apply { setPadding(0, dp(14), 0, dp(3)) })
            return EditText(this).apply {
                textSize = 14f; setText(value); inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO; box.addView(this)
            }
        }
        val api = field("Адрес сервиса сообщений", old?.apiUrl ?: "")
        val apiPins = field("Ключи сертификата сервиса сообщений", old?.apiPins ?: "")
        val media = field("Адрес сервиса звонков", old?.mediaUrl ?: "")
        val mediaPins = field("Ключи сертификата сервиса звонков", old?.mediaPins ?: "")
        box.addView(text("Нужны действующие WSS-адреса и SHA-256 pins сертификатов. Эти настройки предоставляет администратор.", 12, color = GRAY).apply { setPadding(0, dp(12), 0, 0) })
        val dialog = AlertDialog.Builder(this).setTitle("Настройки сервиса").setView(ScrollView(this).apply { addView(box) })
            .setNegativeButton("Отмена", null).setPositiveButton("Сохранить", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            try {
                val config = EndpointConfig(api.text.toString().trim(), apiPins.text.toString().trim(), media.text.toString().trim(), mediaPins.text.toString().trim())
                config.validate(); service?.configure(config, state.highQuality) ?: error("Сервис пока не готов"); dialog.dismiss()
            } catch (error: Exception) { api.error = error.message ?: "Проверьте настройки" }
        } }
        dialog.show()
    }

    private fun members(value: String): List<String> = value.split(',').map { it.trim().replace(" ", "") }
        .takeIf { it.size in 1..7 && it.all { n -> n.matches(Regex("[0-9]{8}")) } && it.distinct().size == it.size } ?: emptyList()

    private fun requestCall(action: String) {
        if (service == null || !UiPresentation.canCall(state)) { toast("Подключите сервис звонков"); return }
        if (action == "dial" && members(dial).isEmpty()) { toast("Введите 8 цифр. Для группы добавьте ещё номер кнопкой +"); return }
        val permissions = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        if (permissions.isEmpty()) launchCall(action)
        else { pendingAction = action; requestPermissions(permissions.toTypedArray(), 1) }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val action = pendingAction ?: return
        pendingAction = null
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) launchCall(action)
        else toast("Без доступа к микрофону звонок невозможен")
    }

    private fun launchCall(action: String) = startForegroundService(Intent(this, CallService::class.java).setAction(action)
        .putStringArrayListExtra("members", ArrayList(members(dial))))

    private fun action(block: suspend () -> Unit) { ui.launch {
        try { block() } catch (_: CancellationException) { }
        catch (_: Exception) { toast("Не удалось выполнить действие. Проверьте подключение и подтвердите контакт") }
    } }

    private inner class MessageAdapter : ListAdapter<ChatMessage, MessageHolder>(object : DiffUtil.ItemCallback<ChatMessage>() {
        override fun areItemsTheSame(a: ChatMessage, b: ChatMessage) = a.id == b.id
        override fun areContentsTheSame(a: ChatMessage, b: ChatMessage) = a == b
    }) {
        private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageHolder {
            val row = row().apply { layoutParams = RecyclerView.LayoutParams(-1, -2).apply { setMargins(0, dp(4), 0, dp(4)) } }
            val bubble = column().apply { setPadding(dp(16), dp(12), dp(16), dp(10)) }
            val message = text("", 16).apply { setLineSpacing(dp(3).toFloat(), 1f); maxWidth = dp(265) }
            val meta = text("", 10).apply { gravity = Gravity.END; setPadding(0, dp(5), 0, 0) }
            bubble.addView(message); bubble.addView(meta); row.addView(bubble)
            return MessageHolder(row, bubble, message, meta)
        }
        override fun onBindViewHolder(holder: MessageHolder, position: Int) {
            val item = getItem(position)
            holder.row.gravity = if (item.outgoing) Gravity.END else Gravity.START
            holder.bubble.background = shape(if (item.outgoing) INK else PALE, 20)
            holder.message.setTextColor(if (item.outgoing) WHITE else INK); holder.message.text = item.text
            holder.meta.setTextColor(if (item.outgoing) 0xFFBBBBBB.toInt() else GRAY)
            holder.meta.text = timeFormat.format(Date(item.createdAt)) + if (item.outgoing) when (item.status) {
                "sent" -> " · Отправлено"; "failed" -> " · Не отправлено"; else -> " · Отправляется"
            } else ""
        }
    }
    private class MessageHolder(val row: LinearLayout, val bubble: LinearLayout, val message: TextView, val meta: TextView) : RecyclerView.ViewHolder(row)
    private fun copyNumber() {
        getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Номер Line", state.number)); toast("Номер скопирован")
    }
    private fun settingsRow(title: String, detail: String, icon: String, action: () -> Unit): LinearLayout = row().apply {
        background = ripple(WHITE, 16); setPadding(0, dp(18), 0, dp(18)); minimumHeight = dp(76)
        addView(LineIcon(this@MainActivity, icon, INK), LinearLayout.LayoutParams(dp(22), dp(22)).apply { marginEnd = dp(16) })
        val labels = column(); labels.addView(text(title, 15, Typeface.BOLD)); labels.addView(text(detail, 12, color = GRAY).apply { setPadding(0, dp(5), 0, 0) })
        addView(labels, LinearLayout.LayoutParams(0, -2, 1f)); addView(LineIcon(this@MainActivity, "chevron", GRAY), LinearLayout.LayoutParams(dp(18), dp(18)))
        setOnClickListener { action() }; Motion.press(this)
    }
    private fun actionButton(title: String, icon: String, dark: Boolean, action: () -> Unit): LinearLayout = row().apply {
        gravity = Gravity.CENTER; background = ripple(if (dark) INK else PALE, 18)
        addView(LineIcon(this@MainActivity, icon, if (dark) WHITE else INK), LinearLayout.LayoutParams(dp(20), dp(20)).apply { marginEnd = dp(10) })
        addView(text(title, 15, Typeface.BOLD, if (dark) WHITE else INK).apply { tag = "label" })
        contentDescription = title; setOnClickListener { action() }; Motion.press(this)
    }
    private fun iconButton(icon: String, title: String, backgroundColor: Int, tint: Int = INK, action: () -> Unit): FrameLayout = FrameLayout(this).apply {
        background = ripple(backgroundColor, 16); contentDescription = title
        addView(LineIcon(this@MainActivity, icon, tint), FrameLayout.LayoutParams(dp(20), dp(20), Gravity.CENTER))
        setOnClickListener { action() }; Motion.press(this)
    }
    private fun avatar(number: String): FrameLayout = FrameLayout(this).apply {
        background = shape(WHITE, 15); addView(text(number.takeLast(2), 14, Typeface.BOLD), FrameLayout.LayoutParams(-2, -2, Gravity.CENTER))
    }
    private fun text(value: String, size: Int, weight: Int = Typeface.NORMAL, color: Int = INK) = TextView(this).apply {
        text = value; textSize = size.toFloat(); setTextColor(color); typeface = Typeface.create("sans-serif", weight); includeFontPadding = false
    }
    private fun column() = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    private fun row() = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
    private fun shape(color: Int, radius: Int, border: Int? = null) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat(); if (border != null) setStroke(dp(1), border)
    }
    private fun ripple(color: Int, radius: Int) = RippleDrawable(ColorStateList.valueOf(if (color == INK) 0x22FFFFFF else 0x11000000), shape(color, radius), shape(WHITE, radius))
    private fun divider() = View(this).apply { setBackgroundColor(BORDER); layoutParams = LinearLayout.LayoutParams(-1, dp(1)) }
    private fun watcher(onChange: (String) -> Unit) = object : android.text.TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { onChange(s.toString()) }
        override fun afterTextChanged(s: android.text.Editable?) = Unit
    }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun formatNumber(value: String) = value.chunked(4).joinToString(" ")
    private fun callActionTitle() = when {
        !state.configReady -> "Подключить Line"
        !state.online -> "Повторить подключение"
        !state.mediaReady -> "Звонки недоступны"
        else -> "Позвонить"
    }
    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    private fun info(title: String, message: String) = AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("Понятно", null).show()
    companion object {
        private const val WHITE = Color.WHITE
        private const val INK = 0xFF151515.toInt()
        private const val GRAY = 0xFF777777.toInt()
        private const val PALE = 0xFFF5F5F5.toInt()
        private const val BORDER = 0xFFECECEC.toInt()
    }
}
