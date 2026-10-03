# Line 0.2 — Android: групповой голос и E2EE-чат

Нативный Kotlin, Android 8+, чёрно-белый интерфейс. **LiveKit SFU** для фиксированных групп из 2–8 человек, **Opus**, нативное E2EE (frame cryptor); **libsignal PQXDH + Double Ratchet** для сообщений и передачи ключа комнаты. WebSocket relay, локальная SQLite с AES-GCM/Android Keystore, постраничная история и RecyclerView.

**Это тестовая сборка, не готовая публичная служба связи.** Без доступных API/LiveKit/TURN-серверов один APK не обеспечивает реальные звонки. Серверы в этом задании не развёрнуты. Полная неотслеживаемость и отсутствие любых задержек невозможны: E2EE скрывает содержимое, но инфраструктура и сеть видят IP, номера/участников и время соединения. Независимый аудит не выполнен.

## Архитектура и код

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — архитектура, модель доверия, структура и пример LiveKit E2EE для SDK **2.29.0**. Android использует native frame encryption, не браузерный JavaScript Insertable Streams API.

```
app/src/main/java/app/line/
  MainActivity.kt       # Звонки, Signal safety numbers, RecyclerView-чат
  CallService.kt        # Фон, fixed roster, Signal-ключ комнаты, потеря сети
  EndpointConfig.kt     # WSS + SPKI certificate pins API и LiveKit
  media/                # LiveKit E2EE, Opus HQ/речь, микрофон и динамик
  crypto/               # libsignal, SQLite, Keystore, ciphertext outbox
server/                 # Учёт установки, публичные prekeys, relay, LiveKit JWT
deploy/                 # LiveKit/embedded TURN/Caddy шаблоны и ports
```

Identity/prekeys и случайный 32-байтовый room key генерируются **только на телефоне**. Инициатор передаёт room key через проверенные Signal-сессии. JWT действует 120 секунд, связан с комнатой/участником, разрешает публикацию только микрофона. При выходе/отключении любого участника вся группа завершается; новый состав требует нового звонка/ключа. Live-добавления и live-ротации ключей нет.

## Сборка

Java **21**, Node **24**, Kotlin **2.2.20**, SDK Android **36**, NDK **28.2.13676358**. libsignal 0.104.0 требует JDK 21; desugaring сохраняет поддержку старых Android.

```sh
mise use java@temurin-21
bash scripts/setup.sh
./gradlew assembleDebug assembleDebugAndroidTest testDebugUnitTest lintDebug
npm test
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

В Android Studio откройте корень. Setup принимает лицензии SDK и создаёт `local.properties`. Debug APK — для проверки; для публикации нужны release-подпись, испытания и аудит. APK не содержит testing JNI; NDK убирает debug symbols. Для меньшего скачивания доступны `app-arm64-v8a-debug.apk` (большинство современных телефонов), `app-armeabi-v7a-debug.apk` (32-битные ARM), x86/x86_64 и универсальный APK. Для магазина используйте AAB. Секреты и signing/private keys нельзя включать в Git/APK.

## Настоящие серверы

См. [deploy/README.md](deploy/README.md) и [server/README.md](server/README.md): разверните LiveKit с UDP/TCP ICE и TURN, API с `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` и TLS reverse proxy. Без media config выдача токена отказывает, fake token не используется.

На телефонах введите API `wss://api.ваш-домен/signal`, LiveKit `wss://rtc.ваш-домен` и **SHA-256 SPKI pins** обоих сертификатов из доверенного источника. Например на администрируемом хосте:

```sh
openssl x509 -in fullchain.pem -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary | openssl base64 -A
# В приложение: sha256/РЕЗУЛЬТАТ. Это публичный pin, не приватный ключ.
```

Резервный pin через запятую позволяет ротацию. При неверном pin подключение блокируется. Для другого API-сервера нужен новый профиль/очистка данных: номер и доверие не переносятся.

## Пользоваться

1. После регистрации появится восьмизначный номер; поделитесь им с другом.
2. **Оба** открывают номера друг друга в «Чат», сверяют **весь Signal safety number/SAS** лично или через иной доверенный канал и подтверждают совпадение. Подмена identity блокируется. Нельзя подтверждать код только по сообщению через тот же потенциально атакуемый сервер.
3. Отправляйте сообщения. SQLite-WAL шифрует тексты/ratchet/outbox AES-GCM с Keystore. История — индексированный keyset `LIMIT 40` (максимум 100 в API), отображаемое окно до 200 сообщений.
4. В «Звонки» укажите до семи номеров через запятую. Все участники заранее должны сверить SAS остальных. Приглашённые нажимают «Ответить».

HQ — потолок **510 Кбит/с Opus**, DTX выключен; речевой режим — 64 Кбит/с с DTX. Максимальный битрейт не гарантирует лучшее качество в слабой сети и не устраняет физическую задержку. SDK адаптируется к полосе.

Активный звонок использует microphone foreground service/уведомление/wake lock. Потеря интернета или signaling/media завершает звонок, без бесконечного reconnect медиакомнаты. **Новые входящие — при открытом приложении**; FCM/Telecom не реализованы. Force stop, выключение телефона и ограничения производителя могут остановить сервис.

Сервер не хранит offline-сообщения. Локальный encrypted outbox повторяет тот же ciphertext при переподключении отправителя. «Отправлено» — передача в подключённый WebSocket, **не расшифровка/прочтение**. До SAS входящие отклоняются. Attachments, multi-device sync и push отсутствуют.

## Безопасность и статус

Сервер хранит token hash/публичные bundles, маршрутизирует ciphertext и не содержит приватные ключи/не пишет plaintext или аудио. SFU всё равно знает состав/IP/время. Не реализованы key transparency, sealed sender, скрытие метаданных, защита от compromised/root телефона, записи собеседником или глобального анализа трафика.

libsignal — upstream-библиотека, не официальный Signal-клиент; использование вне Signal не поддерживается. **AGPL-3.0**: при передаче APK предоставляйте соответствующие исходники; см. `LICENSE`.

Локальные тесты проверяют Double Ratchet/подмену/повторы/SAS, TLS pins, регистрацию, prekeys, relay, room JWT и завершение группы. Lint/сборка проверяют API и упаковку. Instrumentation-тест SQLite/Activity включён, но выполнение не подтверждено: эмулятор вызывал перезапуск среды с откатом файлов. **Свежего подтверждения UI, фонового звонка, слышимого группового аудио через публичный LiveKit/TURN и задержки пока нет.** До production нужны несколько физических телефонов и независимый аудит.
