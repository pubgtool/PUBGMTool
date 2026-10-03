package app.line

import android.Manifest
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
import android.text.TextUtils
import android.view.*
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import app.line.crypto.ChatMessage
import app.line.ui.LineIcon
import app.line.ui.Motion
import app.line.ui.RefreshPolicy
import kotlinx.coroutines.*
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    private val ui = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val prefs by lazy { getSharedPreferences("line-ui", MODE_PRIVATE) }
    private var service: CallService? = null
    private var bound = false
    private var state = CallState()
    private var tab = "calls"
    private var screen = ""
    private var dial = ""
    private var pendingAction: String? = null
    private var selectedPeer = ""
    private var peerVerified = false
    private var safetyCode = ""
    private var history = emptyList<ChatMessage>()
    private var inbox = emptyList<ChatMessage>()
    private var loadJob: Job? = null
    private var olderAvailable = true
    private var inboxOlderAvailable = true
    private lateinit var root: LinearLayout
    private lateinit var header: LinearLayout
    private lateinit var content: FrameLayout
    private lateinit var navigation: LinearLayout
    private lateinit var connection: TextView
    private var ownNumber: TextView? = null
    private var ownAction: TextView? = null
    private var chatList: RecyclerView? = null
    private var inboxEmpty: View? = null
    private var timer: TextView? = null
    private var participantRows: LinearLayout? = null
    private var mute: FrameLayout? = null
    private var speaker: FrameLayout? = null
    private val messageAdapter = MessageAdapter()
    private val inboxAdapter = InboxAdapter()
    private val main = Handler(Looper.getMainLooper())
    private val observer: (CallState) -> Unit = { render(it) }
    private val back = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() {
            selectedPeer = ""; safetyCode = ""; hideKeyboard(); rebuild("inbox", true)
        }
    }
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
            if (screen == "inbox") loadInbox() else if (screen == "conversation") loadHistory()
        }
        override fun onServiceDisconnected(name: ComponentName) { service = null }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        dial = savedInstanceState?.getString("dial") ?: ""
        tab = savedInstanceState?.getString("tab") ?: "calls"
        selectedPeer = savedInstanceState?.getString("peer") ?: ""
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN)
        window.statusBarColor = BACKGROUND
        window.navigationBarColor = BACKGROUND
        root = column().apply { setBackgroundColor(BACKGROUND); isFocusableInTouchMode = true }
        root.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                val keyboard = insets.getInsets(WindowInsets.Type.ime())
                view.setPadding(0, bars.top, 0, maxOf(bars.bottom, keyboard.bottom))
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(0, insets.systemWindowInsetTop, 0, insets.systemWindowInsetBottom)
            }
            insets
        }
        header = row().apply { setPadding(dp(24), dp(18), dp(20), dp(16)) }
        content = FrameLayout(this)
        navigation = row().apply { setPadding(dp(18), dp(8), dp(18), dp(8)) }
        root.addView(header)
        root.addView(content, LinearLayout.LayoutParams(-1, 0, 1f))
        root.addView(navigation)
        setContentView(root); root.requestFocus()
        onBackPressedDispatcher.addCallback(this, back)
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.setSystemBarsAppearance(WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
                if (Build.VERSION.SDK_INT >= 27) View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else 0
        }
        render(state)
    }

    override fun onStart() {
        super.onStart()
        bound = bindService(Intent(this, CallService::class.java), binding, BIND_AUTO_CREATE)
    }
    override fun onResume() { super.onResume(); RefreshPolicy.apply(this, root); if (state.connectedAt > 0) main.post(tick) }
    override fun onPause() { main.removeCallbacks(tick); RefreshPolicy.clear(this); super.onPause() }
    override fun onStop() {
        service?.removeObserver(observer); if (bound) unbindService(binding)
        bound = false; service = null; loadJob?.cancel(); super.onStop()
    }
    override fun onDestroy() { ui.cancel(); super.onDestroy() }
    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("dial", dial); outState.putString("tab", tab); outState.putString("peer", selectedPeer)
        super.onSaveInstanceState(outState)
    }

    private fun render(value: CallState) {
        val previous = state
        state = value
        if (value.phase == Phase.INCOMING && previous.phase != Phase.INCOMING) { tab = "calls"; selectedPeer = ""; hideKeyboard() }
        val target = when {
            tab == "calls" && value.phase != Phase.IDLE -> "active"
            tab == "chat" && selectedPeer.isNotEmpty() -> "conversation"
            tab == "chat" -> "inbox"
            else -> tab
        }
        if (screen != target || (target == "active" && previous.phase != value.phase)) rebuild(target, screen.isNotEmpty())
        if (screen != "conversation") connection.text = if (value.online) "В сети" else "Не подключён"
        ownNumber?.text = if (value.number.isEmpty()) if (screen == "profile") "Номер не назначен" else "Не назначен" else formatNumber(value.number)
        ownAction?.text = if (value.number.isEmpty()) "Подключить" else "Копировать"
        if (target == "active") {
            if (previous.members != value.members || previous.participants != value.participants) renderParticipants()
            if (previous.muted != value.muted) renderControl(mute, if (value.muted) "muted" else "mic", value.muted)
            if (previous.speaker != value.speaker) renderControl(speaker, "speaker", value.speaker)
            if (value.connectedAt > 0 && previous.connectedAt == 0L) main.post(tick)
        }
        if (previous.chatVersion != value.chatVersion) {
            if (target == "inbox") loadInbox() else if (target == "conversation") loadHistory()
        }
    }

    private fun navigate(target: String) {
        hideKeyboard()
        if (tab == target && screen != "conversation") return
        tab = target; selectedPeer = ""; safetyCode = ""; history = emptyList()
        rebuild(if (target == "chat") "inbox" else if (target == "calls" && state.phase != Phase.IDLE) "active" else target, true)
    }

    private fun rebuild(target: String, animate: Boolean) {
        loadJob?.cancel(); content.animate().cancel(); content.removeAllViews()
        ownNumber = null; ownAction = null; chatList = null; inboxEmpty = null
        timer = null; participantRows = null; mute = null; speaker = null
        screen = target
        back.isEnabled = target == "conversation"
        renderHeader(); renderNavigation()
        when (target) { "calls" -> dialScreen(); "inbox" -> inboxScreen(); "conversation" -> conversationScreen(); "profile" -> profileScreen(); else -> callScreen() }
        if (animate) Motion.enter(content, 180)
    }

    private fun renderHeader() {
        header.removeAllViews()
        if (screen == "conversation") {
            header.setPadding(dp(12), dp(10), dp(12), dp(10))
            header.addView(iconButton("back", "Назад") { selectedPeer = ""; safetyCode = ""; hideKeyboard(); rebuild("inbox", true) }, size(48))
            val labels = column().apply { setPadding(dp(8), 0, 0, 0) }
            labels.addView(text(contactName(selectedPeer), 18, Typeface.BOLD))
            connection = text(formatNumber(selectedPeer), 11, color = GRAY).apply { setPadding(0, dp(4), 0, 0) }
            labels.addView(connection)
            header.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
            header.addView(iconButton("phone", "Позвонить контакту") { dial = selectedPeer; requestCall("dial") }, size(48))
            header.addView(iconButton("more", "О контакте") { contactDetails() }, size(48))
        } else {
            header.setPadding(dp(24), dp(16), dp(20), dp(14))
            val labels = column()
            connection = text(if (state.online) "В сети" else "Не подключён", 11, color = GRAY).apply { letterSpacing = 0.02f }
            labels.addView(connection)
            labels.addView(text(when (tab) { "chat" -> "Сообщения"; "profile" -> "Профиль"; else -> "Звонки" }, 34, Typeface.BOLD).apply {
                letterSpacing = -0.04f; setPadding(0, dp(6), 0, 0)
            })
            header.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
            if (tab == "chat") header.addView(iconButton("compose", "Новое сообщение", WHITE) { openContactDialog() }, size(48))
            else header.addView(text("line.", 22, Typeface.BOLD).apply { letterSpacing = -0.06f })
        }
    }

    private fun renderNavigation() {
        navigation.removeAllViews()
        navigation.visibility = if (screen == "conversation" || screen == "active") View.GONE else View.VISIBLE
        listOf(Triple("calls", "phone", "Звонки"), Triple("chat", "chat", "Сообщения"), Triple("profile", "person", "Профиль")).forEach { (id, icon, title) ->
            val item = column().apply {
                gravity = Gravity.CENTER; background = ripple(BACKGROUND, 18)
                val iconBox = FrameLayout(this@MainActivity).apply {
                    background = if (tab == id) shape(INK, 15) else null
                    addView(LineIcon(this@MainActivity, icon, if (tab == id) WHITE else GRAY), FrameLayout.LayoutParams(dp(21), dp(21), Gravity.CENTER))
                }
                addView(iconBox, LinearLayout.LayoutParams(dp(46), dp(34)))
                addView(text(title, 10, if (tab == id) Typeface.BOLD else Typeface.NORMAL, if (tab == id) INK else GRAY).apply { setPadding(0, dp(6), 0, 0) })
                contentDescription = title; setOnClickListener { navigate(id) }; Motion.press(this)
            }
            navigation.addView(item, LinearLayout.LayoutParams(0, dp(60), 1f))
        }
    }

    private fun dialScreen() {
        val layout = column().apply { setPadding(dp(24), 0, dp(24), dp(8)) }
        content.addView(layout, FrameLayout.LayoutParams(-1, -1))
        val numberBar = row().apply {
            background = ripple(WHITE, 18); setPadding(dp(16), dp(12), dp(16), dp(12))
            contentDescription = "Ваш номер"; setOnClickListener { if (state.number.isEmpty()) showConnect() else copyNumber() }; Motion.press(this)
        }
        val labels = column()
        labels.addView(text("Ваш номер", 10, color = GRAY))
        ownNumber = text(if (state.number.isEmpty()) "Не назначен" else formatNumber(state.number), 17, Typeface.BOLD).apply { setPadding(0, dp(5), 0, 0) }
        labels.addView(ownNumber); numberBar.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
        ownAction = text(if (state.number.isEmpty()) "Подключить" else "Копировать", 12, Typeface.BOLD)
        numberBar.addView(ownAction); layout.addView(numberBar)
        val scroll = ScrollView(this).apply { isFillViewport = true; isVerticalScrollBarEnabled = false }
        val keypad = column().apply { gravity = Gravity.CENTER; setPadding(0, dp(12), 0, dp(8)) }
        scroll.addView(keypad); layout.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        val input = EditText(this).apply {
            hint = "Введите номер"; textSize = 30f; typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
            setHintTextColor(0xFFB0B0AE.toInt()); gravity = Gravity.CENTER; background = null
            inputType = InputType.TYPE_CLASS_PHONE; filters = arrayOf(InputFilter.LengthFilter(70))
            showSoftInputOnFocus = false; setSingleLine(true); setText(dial); contentDescription = "Номера участников"
            setPadding(0, dp(8), 0, dp(8)); addTextChangedListener(watcher { dial = it })
        }
        keypad.addView(input, LinearLayout.LayoutParams(-1, dp(66)))
        listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf("add", "0", "delete")).forEach { keys ->
            val line = row().apply { gravity = Gravity.CENTER }
            keys.forEach { key ->
                val slot = FrameLayout(this).apply { setPadding(dp(6), dp(4), dp(6), dp(4)) }
                val cell = FrameLayout(this).apply {
                    background = ripple(if (key == "add" || key == "delete") BACKGROUND else WHITE, 34)
                    val face: View = if (key == "add" || key == "delete") LineIcon(this@MainActivity, key, INK) else text(key, 29)
                    addView(face, FrameLayout.LayoutParams(if (face is LineIcon) dp(23) else -2, if (face is LineIcon) dp(23) else -2, Gravity.CENTER))
                    contentDescription = when (key) { "add" -> "Добавить участника"; "delete" -> "Удалить цифру"; else -> key }
                    setOnClickListener {
                        input.setText(when (key) { "delete" -> dial.dropLast(1); "add" -> (dial.trimEnd(',') + ",").take(70); else -> (dial + key).take(70) })
                        input.setSelection(input.text.length)
                    }
                    if (key == "delete") setOnLongClickListener { input.setText(""); true }
                    Motion.press(this)
                }
                slot.addView(cell, FrameLayout.LayoutParams(dp(64), dp(58), Gravity.CENTER))
                line.addView(slot, LinearLayout.LayoutParams(0, dp(66), 1f))
            }
            keypad.addView(line, LinearLayout.LayoutParams(-1, -2))
        }
        val callSlot = FrameLayout(this)
        callSlot.addView(iconButton("phone", "Позвонить", INK, WHITE) {
            if (!state.configReady) showConnect() else requestCall("dial")
        }, FrameLayout.LayoutParams(dp(78), dp(66), Gravity.CENTER))
        layout.addView(callSlot, LinearLayout.LayoutParams(-1, dp(82)))
    }

    private fun inboxScreen() {
        val frame = FrameLayout(this)
        content.addView(frame, FrameLayout.LayoutParams(-1, -1))
        val list = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@MainActivity); adapter = inboxAdapter; itemAnimator = null; setHasFixedSize(true)
            setPadding(dp(12), 0, dp(12), dp(8)); clipToPadding = false
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    val manager = recyclerView.layoutManager as LinearLayoutManager
                    if (dy > 0 && manager.findLastVisibleItemPosition() >= inbox.size - 4) loadInbox(true)
                }
            })
        }
        chatList = list; frame.addView(list, FrameLayout.LayoutParams(-1, -1))
        inboxEmpty = column().apply {
            gravity = Gravity.CENTER; setPadding(dp(44), 0, dp(44), dp(28))
            val mark = FrameLayout(this@MainActivity).apply {
                background = shape(WHITE, 28)
                addView(LineIcon(this@MainActivity, "chat", INK), FrameLayout.LayoutParams(dp(28), dp(28), Gravity.CENTER))
            }
            addView(mark, LinearLayout.LayoutParams(dp(76), dp(76)))
            addView(text("Нет сообщений", 20, Typeface.BOLD).apply { gravity = Gravity.CENTER; setPadding(0, dp(22), 0, dp(8)) })
            addView(text("Ваши разговоры появятся здесь", 13, color = GRAY).apply { gravity = Gravity.CENTER })
            addView(text("Написать", 14, Typeface.BOLD).apply {
                background = ripple(WHITE, 22); gravity = Gravity.CENTER; contentDescription = "Написать"
                setOnClickListener { openContactDialog() }; Motion.press(this)
            }, LinearLayout.LayoutParams(dp(128), dp(48)).apply { topMargin = dp(22) })
        }
        frame.addView(inboxEmpty, FrameLayout.LayoutParams(-1, -1)); loadInbox()
    }

    private fun openConversation(peer: String) {
        selectedPeer = peer; safetyCode = ""; peerVerified = false; history = emptyList(); olderAvailable = true
        tab = "chat"; rebuild("conversation", true)
        action { val verified = service?.verified(peer) == true; if (peer == selectedPeer) { peerVerified = verified; refreshTrust() } }
    }

    private fun conversationScreen() {
        val layout = column().apply { setBackgroundColor(WHITE) }
        content.addView(layout, FrameLayout.LayoutParams(-1, -1))
        layout.addView(divider())
        chatList = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@MainActivity).apply { stackFromEnd = true }
            adapter = messageAdapter; itemAnimator = null; setHasFixedSize(true)
            setPadding(dp(18), dp(18), dp(18), dp(12)); clipToPadding = false
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(view: RecyclerView, dx: Int, dy: Int) {
                    if (dy < 0 && (view.layoutManager as LinearLayoutManager).findFirstVisibleItemPosition() <= 3) loadHistory(true)
                }
            })
        }
        layout.addView(chatList, LinearLayout.LayoutParams(-1, 0, 1f))
        val composerArea = row().apply { setPadding(dp(16), dp(10), dp(16), dp(12)); gravity = Gravity.BOTTOM }
        val input = EditText(this).apply {
            hint = "Сообщение"; textSize = 16f; setHintTextColor(GRAY); background = shape(BACKGROUND, 22)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            filters = arrayOf(InputFilter.LengthFilter(2000)); maxLines = 4; minimumHeight = dp(48)
            setPadding(dp(18), dp(12), dp(14), dp(12)); importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
        }
        composerArea.addView(input, LinearLayout.LayoutParams(0, -2, 1f).apply { marginEnd = dp(10) })
        val send = iconButton("send", "Отправить сообщение", INK, WHITE) {
            val draft = input.text.toString()
            if (draft.isBlank()) return@iconButton
            if (!peerVerified) { showSafety(); return@iconButton }
            input.isEnabled = false
            action {
                try { service?.sendChat(selectedPeer, draft) ?: error("Нет подключения"); input.setText(""); loadHistory() }
                finally { input.isEnabled = true }
            }
        }
        composerArea.addView(send, size(48)); layout.addView(composerArea)
        refreshTrust(); loadHistory()
    }

    private fun refreshTrust() {
        if (screen != "conversation") return
        connection.text = formatNumber(selectedPeer)
    }

    private fun loadHistory(older: Boolean = false) {
        val s = service ?: return
        if (screen != "conversation" || selectedPeer.isEmpty() || (older && (!olderAvailable || loadJob?.isActive == true))) return
        val peer = selectedPeer
        val cursor = if (older) history.firstOrNull()?.sequence else null
        if (older && cursor == null) return
        val manager = chatList?.layoutManager as? LinearLayoutManager
        val anchor = manager?.findFirstVisibleItemPosition() ?: 0
        val anchorId = history.getOrNull(anchor)?.id
        val offset = manager?.findViewByPosition(anchor)?.top ?: 0
        val wasAtBottom = history.isEmpty() || manager?.findLastVisibleItemPosition() == history.lastIndex
        loadJob?.cancel()
        loadJob = ui.launch {
            try {
                val page = s.messages(peer, cursor)
                if (screen != "conversation" || peer != selectedPeer) return@launch
                val oldSize = history.size
                olderAvailable = page.size == 40
                history = when {
                    older -> (page + history).distinctBy { it.id }.take(200)
                    !wasAtBottom && history.isNotEmpty() -> (history + page).associateBy { it.id }.values.sortedBy { it.sequence }.takeLast(200)
                    else -> page
                }
                messageAdapter.submitList(history) {
                    if (older) manager?.scrollToPositionWithOffset(anchor + (history.size - oldSize).coerceAtLeast(0), offset)
                    else if (!wasAtBottom && anchorId != null) manager?.scrollToPositionWithOffset(history.indexOfFirst { it.id == anchorId }.coerceAtLeast(0), offset)
                    else if (wasAtBottom && history.isNotEmpty()) chatList?.scrollToPosition(history.lastIndex)
                }
            } catch (_: CancellationException) { }
            catch (_: Exception) { toast("Не удалось открыть историю") }
        }
    }

    private fun loadInbox(older: Boolean = false) {
        val s = service ?: return
        if (screen != "inbox" || (older && (!inboxOlderAvailable || loadJob?.isActive == true))) return
        val cursor = if (older) inbox.lastOrNull()?.sequence else null
        if (older && cursor == null) return
        loadJob?.cancel()
        loadJob = ui.launch {
            try {
                val page = s.conversations(cursor)
                if (screen != "inbox") return@launch
                inboxOlderAvailable = page.size == 40
                inbox = if (older) (inbox + page).distinctBy { it.peer }.take(200) else page
                inboxAdapter.submitList(inbox)
                inboxEmpty?.visibility = if (inbox.isEmpty()) View.VISIBLE else View.GONE
            } catch (_: CancellationException) { }
            catch (_: Exception) { toast("Не удалось открыть сообщения") }
        }
    }

    private fun openContactDialog() {
        val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(6)) }
        val number = entry("Номер Line", numeric = true).apply { filters = arrayOf(InputFilter.LengthFilter(8)) }
        val name = entry("Имя · необязательно")
        box.addView(number); box.addView(name, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(12) })
        val dialog = AlertDialog.Builder(this).setTitle("Новый диалог").setView(box).setNegativeButton("Отмена", null).setPositiveButton("Открыть", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val peer = number.text.toString().trim()
            if (!peer.matches(Regex("[0-9]{8}")) || peer == state.number) { number.error = "Введите номер другого человека"; return@setOnClickListener }
            action {
                val s = service ?: error("Нет подключения")
                val code = s.inspectPeer(peer)
                if (name.text.isNotBlank()) prefs.edit().putString("contact-$peer", name.text.toString().trim().take(40)).apply()
                dialog.dismiss(); hideKeyboard(); openConversation(peer); safetyCode = code
            }
        } }; dialog.show()
    }

    private fun contactDetails() {
        AlertDialog.Builder(this).setTitle(contactName(selectedPeer)).setItems(arrayOf("Проверить код безопасности", "Изменить имя")) { _, which ->
            if (which == 0) showSafety() else {
                val input = entry("Имя").apply { setText(prefs.getString("contact-$selectedPeer", "")) }
                val box = column().apply { setPadding(dp(24), dp(12), dp(24), 0); addView(input) }
                AlertDialog.Builder(this).setTitle("Имя контакта").setView(box).setNegativeButton("Отмена", null)
                    .setPositiveButton("Сохранить") { _, _ -> prefs.edit().putString("contact-$selectedPeer", input.text.toString().trim().take(40)).apply(); renderHeader() }.show()
            }
        }.show()
    }

    private fun showSafety() {
        if (selectedPeer.isEmpty()) return
        val peer = selectedPeer
        action {
            val s = service ?: error("Нет подключения")
            if (safetyCode.isEmpty()) safetyCode = s.inspectPeer(peer)
            if (peer != selectedPeer) return@action
            val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(6)) }
            box.addView(text("Сравните код с другом лично или через другой доверенный канал.", 14, color = GRAY))
            box.addView(text(safetyCode.chunked(5).joinToString(" "), 20, Typeface.BOLD).apply {
                setPadding(0, dp(22), 0, dp(18)); setTextIsSelectable(true); setLineSpacing(dp(6).toFloat(), 1f)
            })
            AlertDialog.Builder(this@MainActivity).setTitle("Проверка контакта").setView(box).setNegativeButton("Позже", null)
                .setPositiveButton(if (peerVerified) "Готово" else "Код совпадает") { _, _ -> if (!peerVerified) action {
                    s.verifyPeer(peer); if (peer == selectedPeer) { peerVerified = true; refreshTrust() }
                } }.show()
        }
    }

    private fun profileScreen() {
        val body = scrollBody()
        val identity = column().apply { gravity = Gravity.CENTER; setPadding(0, dp(18), 0, dp(24)) }
        identity.addView(avatar("", true), LinearLayout.LayoutParams(dp(76), dp(76)))
        identity.addView(text("Мой аккаунт", 21, Typeface.BOLD).apply { setPadding(0, dp(16), 0, dp(6)) })
        ownNumber = text(if (state.number.isEmpty()) "Номер не назначен" else formatNumber(state.number), 14, color = GRAY).apply {
            setOnClickListener { if (state.number.isNotEmpty()) copyNumber() }
        }
        identity.addView(ownNumber); body.addView(identity)
        val settings = column().apply { background = shape(WHITE, 22); setPadding(dp(18), 0, dp(16), 0) }
        settings.addView(settingsRow("Подключение", if (state.configReady) "Настроено" else "Подключить", "arrow") { showConnect() })
        settings.addView(divider())
        settings.addView(settingsRow("Качество звука", if (state.highQuality) "Высокое" else "Для слабой сети", "speaker") { showQuality() })
        settings.addView(divider())
        settings.addView(settingsRow("О приложении", "0.4", "shield") {
            info("Line 0.4", "Звонки и сообщения. Содержимое защищено на устройствах; сервис и сеть могут видеть участников и время соединений. Новые входящие доступны при открытом приложении.")
        })
        body.addView(settings)
        body.addView(text("Для администратора", 12, color = GRAY).apply {
            gravity = Gravity.CENTER; minimumHeight = dp(56); background = ripple(BACKGROUND, 16)
            setOnClickListener { showManualSettings() }; contentDescription = "Для администратора"
        }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16) })
    }

    private fun callScreen() {
        val body = scrollBody().apply { gravity = Gravity.CENTER_HORIZONTAL }
        body.addView(text(if (state.members.size > 2) "Групповой звонок" else state.members.firstOrNull { it != state.number }?.let(::contactName) ?: "Звонок", 25, Typeface.BOLD).apply {
            gravity = Gravity.CENTER; setPadding(0, dp(32), 0, dp(12))
        })
        timer = text(when (state.phase) { Phase.INCOMING -> "Входящий звонок"; Phase.OUTGOING -> "Вызов…"; else -> "Соединяем…" }, 13, color = GRAY).apply {
            gravity = Gravity.CENTER; setFontFeatureSettings("tnum")
        }; body.addView(timer)
        participantRows = column().apply { setPadding(0, dp(28), 0, dp(24)); gravity = Gravity.CENTER }
        body.addView(participantRows, LinearLayout.LayoutParams(-1, -2)); renderParticipants()
        val controls = row().apply { gravity = Gravity.CENTER }
        if (state.phase == Phase.INCOMING) controls.addView(iconButton("phone", "Ответить", INK, WHITE) { requestCall("accept") }, size(72))
        else {
            mute = control("mic", "Микрофон", state.muted) { service?.toggleMute() }
            speaker = control("speaker", "Динамик", state.speaker) { service?.toggleSpeaker() }
            controls.addView(mute, size(64).apply { marginEnd = dp(24) }); controls.addView(speaker, size(64))
        }
        body.addView(controls)
        body.addView(iconButton("phone", "Завершить звонок", 0xFFB83535.toInt(), WHITE) { service?.hangup() }, size(64).apply { topMargin = dp(28) })
    }

    private fun renderParticipants() {
        val rows = participantRows ?: return
        rows.removeAllViews()
        state.members.forEach { peer ->
            val item = row().apply { background = shape(WHITE, 20); setPadding(dp(16), dp(14), dp(16), dp(14)) }
            item.addView(avatar(peer), size(42).apply { marginEnd = dp(14) })
            item.addView(text(if (peer == state.number) "Вы" else contactName(peer), 15, Typeface.BOLD), LinearLayout.LayoutParams(0, -2, 1f))
            item.addView(text(if (peer in state.participants) "В звонке" else "Ожидание", 11, color = GRAY))
            rows.addView(item, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
        }
    }

    private fun control(icon: String, label: String, active: Boolean, action: () -> Unit) = iconButton(icon, label, if (active) INK else WHITE, if (active) WHITE else INK, action)
    private fun renderControl(view: FrameLayout?, icon: String, active: Boolean) {
        view ?: return
        view.removeAllViews(); view.background = ripple(if (active) INK else WHITE, 24)
        view.addView(LineIcon(this, icon, if (active) WHITE else INK), FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER))
    }

    private fun showQuality() {
        AlertDialog.Builder(this).setTitle("Качество звука").setSingleChoiceItems(arrayOf("Высокое", "Для слабой сети"), if (state.highQuality) 0 else 1) { dialog, which ->
            service?.setQuality(which == 0); dialog.dismiss(); if (screen == "profile") rebuild("profile", false)
        }.setNegativeButton("Отмена", null).show()
    }

    private fun showConnect() {
        if (state.phase != Phase.IDLE) { toast("Сначала завершите звонок"); return }
        val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(8)) }
        box.addView(text("Код подключения выдаёт администратор вашего сервиса Line.", 14, color = GRAY))
        val code = entry("Код подключения").apply { maxLines = 4; filters = arrayOf(InputFilter.LengthFilter(4096)) }
        box.addView(code, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16) })
        val dialog = AlertDialog.Builder(this).setTitle("Подключить Line").setView(box).setNegativeButton("Отмена", null).setPositiveButton("Продолжить", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val profile = runCatching { ConnectionProfile.decode(code.text.toString()) }.getOrElse { code.error = it.message; return@setOnClickListener }
            AlertDialog.Builder(this).setTitle("Подключиться?").setMessage("${URI(profile.apiUrl).host}\n\nИспользуйте код только из доверенного источника.")
                .setNegativeButton("Отмена", null).setPositiveButton("Подключиться") { _, _ ->
                    try { service?.configure(profile, state.highQuality) ?: error("Сервис запускается"); dialog.dismiss(); hideKeyboard() }
                    catch (error: Exception) { code.error = error.message }
                }.show()
        } }; dialog.show()
    }

    private fun showManualSettings() {
        if (state.phase != Phase.IDLE) { toast("Сначала завершите звонок"); return }
        val box = column().apply { setPadding(dp(24), dp(10), dp(24), dp(12)) }
        val old = service?.config()
        fun field(title: String, value: String): EditText {
            box.addView(text(title, 12, color = GRAY).apply { setPadding(0, dp(14), 0, dp(7)) })
            return entry("").apply { setText(value); box.addView(this) }
        }
        val api = field("Адрес сервиса сообщений", old?.apiUrl ?: "")
        val apiPins = field("Ключи сертификата сообщений", old?.apiPins ?: "")
        val media = field("Адрес сервиса звонков", old?.mediaUrl ?: "")
        val mediaPins = field("Ключи сертификата звонков", old?.mediaPins ?: "")
        val dialog = AlertDialog.Builder(this).setTitle("Настройки сервиса").setView(ScrollView(this).apply { addView(box) })
            .setNegativeButton("Отмена", null).setPositiveButton("Сохранить", null).create()
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            try {
                val profile = EndpointConfig(api.text.toString().trim(), apiPins.text.toString().trim(), media.text.toString().trim(), mediaPins.text.toString().trim())
                profile.validate(); service?.configure(profile, state.highQuality) ?: error("Сервис пока не готов"); dialog.dismiss(); hideKeyboard()
            } catch (error: Exception) { api.error = error.message ?: "Проверьте настройки" }
        } }; dialog.show()
    }

    private fun requestCall(action: String) {
        if (!state.configReady) { showConnect(); return }
        if (service == null || !state.online || !state.mediaReady) { info("Звонок недоступен", "Проверьте подключение. Сервис звонков должен быть настроен администратором."); return }
        val members = parseMembers(dial)
        if (action == "dial" && members.isEmpty()) { toast("Введите номер из 8 цифр"); return }
        val permissions = mutableListOf<String>()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        if (permissions.isEmpty()) launchCall(action) else { pendingAction = action; requestPermissions(permissions.toTypedArray(), 1) }
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val action = pendingAction ?: return; pendingAction = null
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) launchCall(action) else toast("Нужен доступ к микрофону")
    }
    private fun launchCall(action: String) = startForegroundService(Intent(this, CallService::class.java).setAction(action).putStringArrayListExtra("members", ArrayList(parseMembers(dial))))
    private fun parseMembers(value: String) = value.split(',').map { it.trim().replace(" ", "") }
        .takeIf { it.size in 1..7 && it.all { n -> n.matches(Regex("[0-9]{8}")) } && it.distinct().size == it.size } ?: emptyList()
    private fun action(block: suspend () -> Unit) { ui.launch {
        try { block() } catch (_: CancellationException) { }
        catch (_: Exception) { toast("Не удалось выполнить действие. Проверьте подключение") }
    } }

    private inner class InboxAdapter : ListAdapter<ChatMessage, InboxHolder>(object : DiffUtil.ItemCallback<ChatMessage>() {
        override fun areItemsTheSame(a: ChatMessage, b: ChatMessage) = a.peer == b.peer
        override fun areContentsTheSame(a: ChatMessage, b: ChatMessage) = a == b
    }) {
        private val time = SimpleDateFormat("HH:mm", Locale.getDefault())
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): InboxHolder {
            val item = row().apply { setPadding(dp(12), dp(18), dp(12), dp(18)); background = ripple(BACKGROUND, 20) }
            val avatar = FrameLayout(this@MainActivity)
            item.addView(avatar, size(54).apply { marginEnd = dp(14) })
            val labels = column()
            val title = text("", 16, Typeface.BOLD).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END }
            val preview = text("", 13, color = GRAY).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END; setPadding(0, dp(7), 0, 0) }
            labels.addView(title); labels.addView(preview); item.addView(labels, LinearLayout.LayoutParams(0, -2, 1f))
            val stamp = text("", 10, color = GRAY)
            item.addView(stamp, LinearLayout.LayoutParams(-2, -2).apply { gravity = Gravity.TOP; topMargin = dp(4); marginStart = dp(12) })
            item.layoutParams = RecyclerView.LayoutParams(-1, -2)
            return InboxHolder(item, avatar, title, preview, stamp)
        }
        override fun onBindViewHolder(holder: InboxHolder, position: Int) {
            val item = getItem(position)
            holder.avatar.removeAllViews(); holder.avatar.addView(avatar(item.peer), FrameLayout.LayoutParams(-1, -1))
            holder.title.text = contactName(item.peer); holder.preview.text = (if (item.outgoing) "Вы: " else "") + item.text
            holder.time.text = time.format(Date(item.createdAt)); holder.itemView.setOnClickListener { openConversation(item.peer) }
            holder.itemView.contentDescription = "Диалог ${contactName(item.peer)}"; Motion.press(holder.itemView)
        }
    }
    private class InboxHolder(view: View, val avatar: FrameLayout, val title: TextView, val preview: TextView, val time: TextView) : RecyclerView.ViewHolder(view)

    private inner class MessageAdapter : ListAdapter<ChatMessage, MessageHolder>(object : DiffUtil.ItemCallback<ChatMessage>() {
        override fun areItemsTheSame(a: ChatMessage, b: ChatMessage) = a.id == b.id
        override fun areContentsTheSame(a: ChatMessage, b: ChatMessage) = a == b
    }) {
        private val time = SimpleDateFormat("HH:mm", Locale.getDefault())
        private val day = SimpleDateFormat("d MMMM yyyy", Locale("ru"))
        private val dayLabel = SimpleDateFormat("d MMMM", Locale("ru"))
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageHolder {
            val outer = column().apply { layoutParams = RecyclerView.LayoutParams(-1, -2) }
            val date = text("", 10, color = GRAY).apply { gravity = Gravity.CENTER; setPadding(0, dp(12), 0, dp(14)) }
            val line = row()
            val bubble = column().apply { setPadding(dp(15), dp(11), dp(14), dp(8)) }
            val message = text("", 15).apply { setLineSpacing(dp(2).toFloat(), 1f) }
            val meta = text("", 10).apply { gravity = Gravity.END; setPadding(dp(12), dp(5), 0, 0) }
            bubble.addView(message); bubble.addView(meta); line.addView(bubble); outer.addView(date); outer.addView(line)
            return MessageHolder(outer, date, line, bubble, message, meta)
        }
        override fun onBindViewHolder(holder: MessageHolder, position: Int) {
            val item = getItem(position)
            val previous = if (position > 0) getItem(position - 1) else null
            val sameDay = previous != null && day.format(Date(previous.createdAt)) == day.format(Date(item.createdAt))
            val grouped = previous?.outgoing == item.outgoing && sameDay
            holder.date.visibility = if (sameDay) View.GONE else View.VISIBLE
            holder.date.text = dayLabel.format(Date(item.createdAt))
            holder.line.gravity = if (item.outgoing) Gravity.END else Gravity.START
            holder.line.setPadding(0, dp(if (grouped) 2 else 7), 0, dp(2))
            holder.message.maxWidth = (resources.displayMetrics.widthPixels * 0.7f).toInt() - dp(32)
            holder.bubble.background = shape(if (item.outgoing) INK else BUBBLE, 18)
            holder.message.setTextColor(if (item.outgoing) WHITE else INK); holder.message.text = item.text
            holder.meta.setTextColor(if (item.outgoing) 0xFFB8B8B8.toInt() else GRAY)
            holder.meta.text = time.format(Date(item.createdAt)) + if (item.outgoing) when (item.status) { "sent" -> "  ✓"; "failed" -> "  !"; else -> "  ·" } else ""
            holder.meta.contentDescription = if (item.outgoing) when (item.status) { "sent" -> "Отправлено"; "failed" -> "Не отправлено"; else -> "Отправляется" } else "Время сообщения"
        }
    }
    private class MessageHolder(view: View, val date: TextView, val line: LinearLayout, val bubble: LinearLayout, val message: TextView, val meta: TextView) : RecyclerView.ViewHolder(view)

    private fun scrollBody(): LinearLayout {
        val body = column().apply { setPadding(dp(24), 0, dp(24), dp(24)) }
        content.addView(ScrollView(this).apply { isFillViewport = true; isVerticalScrollBarEnabled = false; addView(body) }, FrameLayout.LayoutParams(-1, -1))
        return body
    }
    private fun settingsRow(title: String, detail: String, icon: String, action: () -> Unit) = row().apply {
        minimumHeight = dp(72); background = ripple(WHITE, 12)
        addView(LineIcon(this@MainActivity, icon, INK), size(21).apply { marginEnd = dp(14) })
        addView(text(title, 14, Typeface.BOLD), LinearLayout.LayoutParams(0, -2, 1f))
        addView(text(detail, 11, color = GRAY)); addView(LineIcon(this@MainActivity, "chevron", GRAY), size(14).apply { marginStart = dp(8) })
        setOnClickListener { action() }; contentDescription = title; Motion.press(this)
    }
    private fun avatar(peer: String, own: Boolean = false) = FrameLayout(this).apply {
        background = shape(if (own) INK else WHITE, if (own) 28 else 20)
        if (own) addView(LineIcon(this@MainActivity, "person", WHITE), FrameLayout.LayoutParams(dp(30), dp(30), Gravity.CENTER))
        else addView(text(initials(peer), 18, Typeface.BOLD), FrameLayout.LayoutParams(-2, -2, Gravity.CENTER))
    }
    private fun contactName(peer: String) = prefs.getString("contact-$peer", null)?.takeIf { it.isNotBlank() } ?: formatNumber(peer)
    private fun initials(peer: String): String {
        val name = prefs.getString("contact-$peer", null)
        return if (name.isNullOrBlank()) peer.takeLast(2) else name.split(' ').filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1).uppercase() }
    }
    private fun entry(hint: String, numeric: Boolean = false) = EditText(this).apply {
        this.hint = hint; textSize = 16f; background = shape(BACKGROUND, 14); setPadding(dp(16), dp(14), dp(16), dp(14)); minimumHeight = dp(52)
        inputType = if (numeric) InputType.TYPE_CLASS_NUMBER else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO
    }
    private fun iconButton(icon: String, label: String, backgroundColor: Int = BACKGROUND, tint: Int = INK, action: () -> Unit) = FrameLayout(this).apply {
        background = ripple(backgroundColor, 24); contentDescription = label
        addView(LineIcon(this@MainActivity, icon, tint), FrameLayout.LayoutParams(dp(22), dp(22), Gravity.CENTER))
        setOnClickListener { action() }; Motion.press(this)
    }
    private fun text(value: String, size: Int, weight: Int = Typeface.NORMAL, color: Int = INK) = TextView(this).apply {
        text = value; textSize = size.toFloat(); setTextColor(color); typeface = Typeface.create("sans-serif", weight); includeFontPadding = false
    }
    private fun column() = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    private fun row() = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
    private fun size(value: Int) = LinearLayout.LayoutParams(dp(value), dp(value))
    private fun shape(color: Int, radius: Int) = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }
    private fun ripple(color: Int, radius: Int) = RippleDrawable(ColorStateList.valueOf(if (color == INK) 0x22FFFFFF else 0x11000000), shape(color, radius), shape(WHITE, radius))
    private fun divider() = View(this).apply { setBackgroundColor(BORDER); layoutParams = LinearLayout.LayoutParams(-1, dp(1)) }
    private fun watcher(onChange: (String) -> Unit) = object : android.text.TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { onChange(s.toString()) }
        override fun afterTextChanged(s: android.text.Editable?) = Unit
    }
    private fun hideKeyboard() { currentFocus?.let { getSystemService(InputMethodManager::class.java).hideSoftInputFromWindow(it.windowToken, 0) }; root.requestFocus() }
    private fun copyNumber() { getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Номер Line", state.number)); toast("Номер скопирован") }
    private fun formatNumber(value: String) = value.chunked(4).joinToString(" ")
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    private fun info(title: String, message: String) = AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("Понятно", null).show()
    companion object {
        private const val WHITE = Color.WHITE
        private const val BACKGROUND = 0xFFF6F6F4.toInt()
        private const val INK = 0xFF111212.toInt()
        private const val GRAY = 0xFF858784.toInt()
        private const val BORDER = 0xFFEAEAE6.toInt()
        private const val BUBBLE = 0xFFF0F0ED.toInt()
    }
}
