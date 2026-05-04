import { createContext, useContext } from 'react';

export type Lang = 'ru' | 'en';

export type Dict = Record<string, string>;

export const DICTIONARIES: Record<Lang, Dict> = {
  ru: {
    'app.title': 'PUBGM Performance Toolkit',
    'app.subtitle':
      'Sensitivity Builder · HUD Layout · Gyro · Recoil Lab · Headshot Trainer · TTK Calculator',
    'nav.sensitivity': 'Sensitivity Builder',
    'nav.controls': 'Controls Setup',
    'nav.pro': 'Pro Tweaks',
    'nav.hud': 'HUD Layout',
    'nav.gyro': 'Gyro Calibration',
    'nav.recoil': 'Recoil Lab',
    'nav.drill': 'Headshot Drill',
    'nav.ttk': 'TTK Calculator',
    'nav.reaction': 'Reaction Tester',
    'nav.falloff': 'Damage Falloff',
    'nav.loadout': 'Loadout Planner',
    'nav.crosshair': 'Crosshair Trainer',
    'nav.device': 'Device Profile',
    'nav.maps': 'Drop Spots',
    'nav.tips': 'Tips & Coach',
    'nav.short.sensitivity': 'Sens',
    'nav.short.controls': 'Controls',
    'nav.short.pro': 'Pro',
    'nav.short.tips': 'Tips',
    'nav.short.device': 'Device',
    'lang.ru': 'RU',
    'lang.en': 'EN',
    'common.preset': 'Пресет',
    'common.reset': 'Сбросить',
    'common.save': 'Сохранить',
    'common.export': 'Экспорт',
    'common.import': 'Импорт',
    'common.share': 'Поделиться',
    'common.copy': 'Копировать',
    'common.copied': 'Скопировано!',
    'common.start': 'Старт',
    'common.stop': 'Стоп',
    'common.restart': 'Заново',
    'common.next': 'Дальше',
    'common.back': 'Назад',
    'common.weapon': 'Оружие',
    'common.attachments': 'Обвесы',
    'common.distance': 'Дистанция',
    'common.armor': 'Броня',
    'common.helmet': 'Каска',
    'common.vest': 'Жилет',
    'common.zone': 'Зона попадания',
    'common.head': 'Голова',
    'common.body': 'Корпус',
    'common.limb': 'Конечности',
    'common.none': 'Нет',
    'common.dps': 'DPS',
    'common.ttk': 'TTK',
    'common.shots': 'Выстрелов',
    'common.damage': 'Урон',
    'common.rpm': 'RPM',
    'common.velocity': 'Скорость пули',
    'common.magazine': 'Магазин',
    'common.category': 'Класс',
    'common.search': 'Поиск',
    'common.compare': 'Сравнить',
    'common.scope': 'Прицел',
    'common.warning.dataDisclaimer':
      'Числа взяты из публичных источников и приближены к мете патча 3.x. Используй как стартовую точку, а не как абсолютную истину — каждый патч баланс меняется.',
    'sensitivity.title': 'Sensitivity Builder',
    'sensitivity.lead':
      'Подбери чувствительность по каждому прицелу и каналу. Все значения сохраняются локально в браузере и пакуются в shareable-ссылку.',
    'sensitivity.channel.camera': 'Камера (Free Look)',
    'sensitivity.channel.ads': 'ADS',
    'sensitivity.channel.gyro': 'Гироскоп',
    'sensitivity.channel.camera.desc':
      'Скорость поворота камеры свайпом, когда прицел не открыт.',
    'sensitivity.channel.ads.desc':
      'Скорость поворота, когда зажат любой прицел (Aim Down Sights).',
    'sensitivity.channel.gyro.desc':
      'Насколько камера двигается от наклонов телефона (только если включён гироскоп).',
    'sensitivity.preset.no_gyro_balanced.desc':
      'Сбалансированный пресет для игры без гироскопа: уверенный close-range и читаемый long-range.',
    'sensitivity.preset.full_gyro_aggressive.desc':
      'Полный гироскоп, минимум ADS — стрельба контролируется наклонами телефона. Под claw / 4-finger / 6-finger.',
    'sensitivity.preset.full_gyro_long.desc':
      'Гироскоп оптимизирован под 4x/6x/8x — стабильный «потяг» отдачи на дистанции.',
    'sensitivity.preset.thumb_close.desc':
      'Игра двумя большими пальцами, упор на close/mid bot за счёт высокой ADS.',
    'sensitivity.preset.mixed_hybrid.desc':
      'Гиро для long range, ADS для close range — компромисс между двумя школами.',
    'sensitivity.preset.iphone_pro_120.desc':
      'Заточен под iPhone 13/14/15 Pro: 120 Гц ProMotion + стабильное iOS-гиро. ADS заполнен — годится и без гироскопа, в hybrid-стиле.',
    'sensitivity.preset.iphone_60_stable.desc':
      'iPhone 13/14/15 (60 Гц): чуть мягче, упор на ADS. Не перегружает гиро на 60 Гц-экране.',
    'sensitivity.preset.samsung_ultra_claw.desc':
      'Galaxy S Ultra на 120 Гц AMOLED + Snapdragon: claw 4-finger, гиро + ADS-fallback на close range.',
    'sensitivity.preset.oneplus_xiaomi_pro.desc':
      'Топовые OnePlus / Xiaomi с 120 Гц: агрессивный full-gyro для 4/6-finger. ADS отключён на близкой дистанции.',
    'sensitivity.preset.rog_redmagic_tournament.desc':
      'ROG Phone / RedMagic, 144 Гц: киберспорт-уровень 6-finger. Гиро на максимуме на всех прицелах, ADS для backup.',
    'sensitivity.preset.mid_range_stable.desc':
      'Средний сегмент (A54, Note 13, POCO X6, Pixel 8a): стабильные значения, которые не дёргаются от троттлинга.',
    'sensitivity.exportHint':
      'В PUBG Mobile нет official import API — переноси числа в Settings → Sensitivity вручную.',
    'sensitivity.troubleshoot.title':
      'Скопировал числа, но в игре гиро не работает или ADS не реагирует?',
    'sensitivity.troubleshoot.body':
      'Это не баг калькулятора — это режимы PUBG Mobile (Gyroscope: Always On vs Scope On, Fire button: tap vs drag, ADS: Hold vs Toggle). Открой Controls Setup — там пошаговая настройка контролов и диагностика по симптомам.',
    'sensitivity.troubleshoot.cta': 'Открыть Controls Setup →',
    'controls.title': 'Controls Setup',
    'controls.lead':
      'Sensitivity это половина задачи. Вторая — правильно настроить контролы, чтобы гироскоп работал во время ADS, а кнопка огня не «уезжала» под пальцем.',
    'controls.intro':
      'Если у тебя «не работает гиро при стрельбе», в 95% случаев проблема не в значениях из калькулятора, а в режимах: «Gyroscope: Scope On», режим «Drag Fire» у кнопки огня, либо ADS-режим в Toggle. Ниже — пошаговая настройка PUBG Mobile.',
    'controls.tag.gyro': 'Gyroscope',
    'controls.tag.gyro.desc':
      'Должен быть «Always On» — иначе гиро не работает на close-range и в ADS на красном точке.',
    'controls.tag.fire': 'Fire button',
    'controls.tag.fire.desc':
      'Режим Tap Fire (без drag). При Drag/Scroll кнопка двигается под пальцем и забирает ввод у гиро.',
    'controls.tag.ads': 'ADS / Peek',
    'controls.tag.ads.desc':
      'Hold-режим стабильнее Toggle: палец сошёл — ADS отпустился, нет «залипшего» прицела.',
    'controls.recommended.title': 'Рекомендованные настройки PUBG Mobile',
    'controls.recommended.lead':
      'Открой Settings внутри PUBG Mobile и пройдись по списку. Эти настройки чинят основные проблемы со стрельбой через гиро.',
    'controls.recommended.tag': 'Рекомендую',
    'controls.path.gyro_mode':
      'Settings → Basic → Gyroscope',
    'controls.option.always_on': 'Always On',
    'controls.reason.always_on':
      'Гиро работает всегда: и когда смотришь от бедра (TPP/FPP no-scope), и когда стреляешь с red dot, и когда в скоупе. Без этого «ADS-гиро» не существует — игра считает, что гиро надо включать только в скоупе.',
    'controls.bad.scope_on':
      '«Scope On» — самая частая причина «у меня гиро не поворачивает экран при стрельбе». В этом режиме гиро мёртв в close-range и при стрельбе с red dot.',
    'controls.path.fire_button_mode':
      'Settings → Controls → Customize → Fire button',
    'controls.option.tap_fire': 'Tap Fire (без drag)',
    'controls.reason.tap_fire':
      'Кнопка огня неподвижна, нажатие не «съезжает». Гиро при этом не теряет фокус и спокойно крутит экран.',
    'controls.bad.drag_fire':
      'Drag-режим / прокрутка кнопки огня — палец перемещает кнопку, и игра воспринимает это как свайп камеры. Эффект: экран «дёргается» при стрельбе или гиро как будто не работает.',
    'controls.path.peek_and_fire':
      'Settings → Controls → Peek & Fire / Peek & Open Scope',
    'controls.option.peek_and_fire': 'Peek & Fire = OFF (если играешь гиро)',
    'controls.reason.peek_and_fire':
      'Peek-кнопки автоматически выглядывают и стреляют — это конфликтует с гиро-наведением. Гироигрокам выключай. Если играешь чисто-thumb (без гиро) — можешь включить.',
    'controls.path.ads_mode':
      'Settings → Controls → Aim Down Sights mode',
    'controls.option.ads_hold': 'Hold (удержание)',
    'controls.reason.ads_hold':
      'Палец отпустил — ADS снялся. В Toggle-режиме можно случайно остаться в ADS и ловить пули, не понимая что произошло.',
    'controls.path.smart_aim_assist':
      'Settings → Basic → Aim Assist',
    'controls.option.aim_assist_on': 'On (для новичков и средних)',
    'controls.reason.aim_assist_on':
      'Маленький pull прицела к ближайшему телу. Не отключает скилл — просто не даёт промазать на close-range. Top-pro иногда отключают, но для большинства лучше On.',
    'controls.path.scope_3d_touch':
      'Settings → Controls → 3D Touch (iPhone)',
    'controls.option.scope_3d_touch_off': 'Off',
    'controls.reason.scope_3d_touch_off':
      'iPhone давит сильнее — палец срабатывает как long-press и игра воспринимает это как другую команду. На iPhone 13/14/15 Pro выключай 3D Touch для огня и скоупа.',
    'controls.troubleshoot.title': 'Если не работает — диагностика',
    'controls.troubleshoot.lead':
      'Выбери симптом — получишь список проверок. Каждый шаг → одна настройка PUBG Mobile.',
    'controls.issue.gyro_off_in_ads.title':
      'Гиро не поворачивает экран при стрельбе / ADS',
    'controls.issue.gyro_off_in_ads.q1':
      'Какой режим Gyroscope в Settings → Basic?',
    'controls.issue.gyro_off_in_ads.f1':
      'Поставь «Always On». «Scope On» работает только когда есть прицел в руках, и многие на красном точке думают, что играют с гиро, а игра считает иначе.',
    'controls.issue.gyro_off_in_ads.q2':
      'Все ли значения Gyroscope Sensitivity > 0 на каждом прицеле?',
    'controls.issue.gyro_off_in_ads.f2':
      'Открой Settings → Sensitivity → Gyroscope Sensitivity. Если на нужном прицеле стоит 0 — гиро отключён только для него. Подставь числа из колонки Gyro в нашем калькуляторе.',
    'controls.issue.gyro_off_in_ads.q3':
      'Включён ли Gyroscope в матче (иконка справа)?',
    'controls.issue.gyro_off_in_ads.f3':
      'В матче рядом с миникартой есть тоггл-иконка гиро. Если случайно нажал — гиро выключен на этот матч даже если в Settings = Always On. Включи обратно.',
    'controls.issue.fire_button_drag.title':
      'Кнопка огня «уезжает» / прокрутка кнопки',
    'controls.issue.fire_button_drag.q1':
      'В режиме Customize ты включил «Fire Button can be dragged» / прокрутку?',
    'controls.issue.fire_button_drag.f1':
      'Выключи. Открой Settings → Controls → Customize → выбери кнопку Fire → отключи «Move while holding» / drag-режим. Кнопка должна быть неподвижной.',
    'controls.issue.fire_button_drag.q2':
      'Используешь ли ты «Scoped Fire Button» (отдельная кнопка, появляющаяся в скоупе)?',
    'controls.issue.fire_button_drag.f2':
      'Если да — у неё своё положение и свой режим. Проверь её отдельно в Customize и убедись, что она тоже не drag-режим.',
    'controls.issue.ads_doesnt_hold.title':
      'ADS не «держится» / отщёлкивается случайно',
    'controls.issue.ads_doesnt_hold.q1':
      'В Settings → Controls → ADS Mode что стоит?',
    'controls.issue.ads_doesnt_hold.f1':
      'Поставь «Hold» (удерживание). В Toggle-режиме случайный второй тап снимает ADS. Hold предсказуемый: палец на кнопке = ADS, отпустил = снят.',
    'controls.issue.screen_jumps_on_shoot.title':
      'Экран дёргается при стрельбе',
    'controls.issue.screen_jumps_on_shoot.q1':
      'Включён ли Camera Sensitivity на максимуме где-то?',
    'controls.issue.screen_jumps_on_shoot.f1':
      'Открой Sensitivity Builder и проверь Camera (Free Look). Если TPP No Scope = 300 и кнопка огня в drag-режиме — палец двигает камеру при стрельбе. Сбрось до пресета iPhone 13/14/15 Pro · 120Hz.',
    'controls.issue.screen_jumps_on_shoot.q2':
      'Делал ли ты Gyro Calibration в нашем модуле?',
    'controls.issue.screen_jumps_on_shoot.f2':
      'Нет — открой Gyro Calibration. Если гироскоп смещён (физический drift телефона), экран будет уезжать сам. Калибровка фиксит это в течение 10 секунд.',
    'controls.gyroAds.title': 'Гиро + ADS: правила, которые работают',
    'controls.gyroAds.body1':
      'PUBG Mobile использует одну колонку «Gyroscope Sensitivity» для всего: и для свободного обзора (если Always On), и для ADS. Отдельной «ADS Gyro» в игре нет. Поэтому когда говорят «настрой ADS-гиро» — имеется в виду те же значения Gyroscope Sensitivity на прицелах от Red Dot до 8x.',
    'controls.gyroAds.body2':
      'Большинство pro-игроков ставят высокие значения (300) на close-mid и уменьшают на 6x/8x — чтобы крупные прицелы не дёргало мелкими движениями телефона. Наш пресет «iPhone 13/14/15 Pro · 120Hz» уже так и сделан.',
    'controls.gyroAds.do': 'Делай',
    'controls.gyroAds.do.1':
      'Gyroscope = Always On. Без вариантов.',
    'controls.gyroAds.do.2':
      'Камеру руками наводи грубо, гироскопом точно. Палец крутит на 10°, гиро добавляет ±2°.',
    'controls.gyroAds.do.3':
      'Тренируй на стрельбище 10 минут перед матчем — гиро это мышечная память.',
    'controls.gyroAds.dont': 'Не надо',
    'controls.gyroAds.dont.1':
      'Не ставь Gyroscope = Scope On и не жалуйся, что «гиро не работает в ADS на ред дот».',
    'controls.gyroAds.dont.2':
      'Не включай Drag Fire вместе с гиро. Это две разные системы свайпа, они конфликтуют.',
    'controls.gyroAds.dont.3':
      'Не меняй значения на ±50 за день. Подкручивай ±5 и тренируй неделю — иначе мышечная память сбросится.',
    'pro.title': 'Pro Tweaks · продвинутые настройки',
    'pro.lead':
      '23 настройки, которые юзают про-игроки и стримеры — все легальные, все внутри Settings PUBG Mobile. Без читов, аимботов и модов.',
    'pro.intro':
      'Среднестатистический игрок открывает Settings → Sensitivity и закрывает приложение. Про-игрок проходится по всем разделам и выкручивает 20+ опций под visibility, скорость пикапа, скорость прицеливания и подавление лишнего ввода. Ниже — этот список.',
    'pro.disclaimer.title': 'Это легальные настройки, не читы',
    'pro.disclaimer.body':
      'Всё, что ниже — стандартные опции в меню PUBG Mobile. Никаких aimbot/wallhack/ESP/модов APK/macros под отдачу/memory edit здесь нет и не будет — за такое аккаунт банится на 10 лет вместе с устройством. Эти настройки даёт сама игра, ими пользуются Soul Mortal, Levinho, ScoutOP и тд.',
    'pro.filter.all': 'Все',
    'pro.tag.recommended': 'Pro',
    'pro.cat.visibility': 'Видимость',
    'pro.cat.visibility.desc':
      'Настройки графики и цвета, которые делают врага заметнее на любой дистанции.',
    'pro.cat.audio': 'Звук',
    'pro.cat.audio.desc':
      'Звук в PUBGM это половина информации. 3D-звук + визуализация шагов = знаешь где враг ещё до того, как его увидел.',
    'pro.cat.hud': 'HUD и скорость',
    'pro.cat.hud.desc':
      'Опции, ускоряющие пикап лута, прицел и пометку врага. Каждая — секунда выигранного времени.',
    'pro.cat.aim': 'Прицел и стрельба',
    'pro.cat.aim.desc':
      'Тонкие настройки прицеливания, которые дают консистентную картинку и нет лагов между ADS и стрельбой.',
    'pro.cat.qol': 'Quality of Life',
    'pro.cat.qol.desc':
      'Настройки, которые подавляют лишний ввод и шум — чтобы ты концентрировался на бою, а не на тапах по экрану.',

    // Visibility
    'pro.tweak.graphics_smooth_ultra.path': 'Settings → Graphics → Quality / Frame Rate',
    'pro.tweak.graphics_smooth_ultra.option': 'Quality = Smooth, Frame Rate = Ultra (или Extreme)',
    'pro.tweak.graphics_smooth_ultra.reason':
      'Smooth + Ultra даёт минимум визуальных эффектов и максимум FPS. Без лишних теней и pp-фильтров враг становится контрастной фигурой на чистом фоне. На iPhone 13 Pro / Snapdragon 8 Gen 1+ выбирай Extreme (90 FPS) или Ultra Extreme (120 FPS).',
    'pro.tweak.graphics_smooth_ultra.warn':
      'Если девайс греется и троттлит на Smooth+Ultra — спускайся на Balanced+Ultra. Стабильные 60 FPS лучше скачущих 90.',
    'pro.tweak.style_colorful.path': 'Settings → Graphics → Style',
    'pro.tweak.style_colorful.option': 'Colorful',
    'pro.tweak.style_colorful.reason':
      'Стили Realistic / Classic снижают насыщенность — враг сливается с травой и серыми зданиями. Colorful задирает saturation: красная одежда, оранжевые вспышки, кровь — всё видно на километр.',
    'pro.tweak.brightness_max.path': 'Settings → Graphics → Brightness',
    'pro.tweak.brightness_max.option': 'Brightness = 100%',
    'pro.tweak.brightness_max.reason':
      'Тёмные комнаты Ливика / Сахоока на дефолтной яркости — чёрная стена. На 100% видно силуэт врага в тени и под лестницей. Системную яркость экрана при этом ставь ~70% — чтобы не выгорал AMOLED.',
    'pro.tweak.colorblind_mode.path': 'Settings → Basic → Colorblind Mode',
    'pro.tweak.colorblind_mode.option': 'Deuteranopia (или Protanopia)',
    'pro.tweak.colorblind_mode.reason':
      'Не баг — фича. Кровь и hit-маркер становятся ярко-жёлтыми / оранжевыми вместо красно-серых. Прямо видно, где попал и какой урон. Юзают даже игроки без дальтонизма.',
    'pro.tweak.shadows_off.path': 'Settings → Graphics → Shadows',
    'pro.tweak.shadows_off.option': 'OFF',
    'pro.tweak.shadows_off.reason':
      'Тени врагов на земле могут палить позицию, НО твои собственные тени в кустах прячут тебя в плохую сторону. Большинство pro отключает — стабильнее FPS и меньше визуального мусора в перестрелке.',

    // Audio
    'pro.tweak.spatial_sound.path': 'Settings → Audio → Spatial / 3D Sound',
    'pro.tweak.spatial_sound.option': 'ON',
    'pro.tweak.spatial_sound.reason':
      'Включает HRTF-обработку: ты различаешь шаги слева/справа, сверху/снизу, на расстоянии. Без 3D-звука всё в моно — узнать «второй этаж или подвал» невозможно. Обязательно с наушниками.',
    'pro.tweak.sound_visualizer.path': 'Settings → Audio → Sound Effect Visualization',
    'pro.tweak.sound_visualizer.option': 'ON (если играешь без наушников)',
    'pro.tweak.sound_visualizer.reason':
      'Включает мини-индикатор вокруг компаса: показывает направление шагов, выстрелов и машин. Не замена звуку, но спасает на динамике или в шумной комнате. Pro с хорошими наушниками часто отключают, чтобы не отвлекаться.',
    'pro.tweak.music_off.path': 'Settings → Audio → Background Music',
    'pro.tweak.music_off.option': 'OFF (Volume = 0)',
    'pro.tweak.music_off.reason':
      'Лобби-музыка занимает audio-слот и микширует со звуками шагов. Полностью выключай — ты сюда не за саундтреком. Включить можно только в training ground.',
    'pro.tweak.voice_room_solo.path': 'Settings → Audio → Voice Chat',
    'pro.tweak.voice_room_solo.option': 'Team Only (в команде) / OFF (соло)',
    'pro.tweak.voice_room_solo.reason':
      'All-room voice = русский, индийский и арабский маты в одном микшере → ты не услышишь шаги в 5 метрах. В соло отключай полностью, в команде оставляй только Team.',

    // HUD
    'pro.tweak.auto_open_scope.path': 'Settings → Basic → Auto-open Scope',
    'pro.tweak.auto_open_scope.option': 'ON',
    'pro.tweak.auto_open_scope.reason':
      'Когда подбираешь оружие — оно автоматически встаёт с открытым прицелом без лишнего тапа. На close-range это разница между «убил первым» и «умер первым».',
    'pro.tweak.wear_when_picked_up.path': 'Settings → Basic → Wear when picked up',
    'pro.tweak.wear_when_picked_up.option': 'ON (для шлема, броника, рюкзака)',
    'pro.tweak.wear_when_picked_up.reason':
      'Поднял шлем второго уровня → он сразу надевается, даже если у тебя был первый. Без этой опции надо открывать рюкзак и тапать «надеть» — 2 секунды, в которые тебя могут уронить.',
    'pro.tweak.mark_items_deathbox.path': 'Settings → Basic → Mark items in death box',
    'pro.tweak.mark_items_deathbox.option': 'ON',
    'pro.tweak.mark_items_deathbox.reason':
      'Подбегая к деасбоксу видишь иконки лута заранее, ещё до открытия. Знаешь, стоит ли вообще тратить время или бежать дальше.',
    'pro.tweak.quick_marker.path': 'Settings → Basic → Quick Marker',
    'pro.tweak.quick_marker.option': 'Двойной тап на компас = маркер',
    'pro.tweak.quick_marker.reason':
      'Палец не отрывается от ввода — пометил направление врага в команде за 0.2 секунды. Без этого надо открывать карту и кликать, теряешь обзор.',
    'pro.tweak.eject_empty_mags.path': 'Settings → Basic → Eject Empty Magazines',
    'pro.tweak.eject_empty_mags.option': 'ON',
    'pro.tweak.eject_empty_mags.reason':
      'Пустой магазин выбрасывается из инвентаря автоматически. Ты не путаешься где расходник а где обвес, и пикап нового мага идёт быстрее.',

    // Aim
    'pro.tweak.fixed_crosshair_ads.path': 'Settings → Basic → Fixed Crosshair when ADS',
    'pro.tweak.fixed_crosshair_ads.option': 'ON',
    'pro.tweak.fixed_crosshair_ads.reason':
      'Прицел в ADS не «болтается» от движения телефона. Это фактически снижает шум при гиро-наведении и позволяет точно стрелять очередью.',
    'pro.tweak.scope_blur_off.path': 'Settings → Graphics → Scope Blur',
    'pro.tweak.scope_blur_off.option': 'OFF',
    'pro.tweak.scope_blur_off.reason':
      'Размытие на краях скоупа красиво, но скрывает движение по периметру. Pro отключает — видишь, когда враг забегает за край и можешь увернуться.',
    'pro.tweak.ads_during_reload.path': 'Settings → Basic → ADS during Reload',
    'pro.tweak.ads_during_reload.option': 'OFF',
    'pro.tweak.ads_during_reload.reason':
      'Иначе если ты случайно тапнешь ADS во время перезарядки — она отменится, и ты останешься с пустым магазином в кадре. Лучше дать игре спокойно дозарядить.',
    'pro.tweak.aim_assist_on.path': 'Settings → Basic → Aim Assist',
    'pro.tweak.aim_assist_on.option': 'ON',
    'pro.tweak.aim_assist_on.reason':
      'Маленький pull прицела к ближайшему телу при ADS на дистанции <50 м. Не заменяет наведение, но даёт +5–10% хитрейта на close-range. Для новичков и средних — обязательно ON.',
    'pro.tweak.aim_assist_on.warn':
      'Топ-про иногда отключают, потому что Aim Assist «дёргает» прицел при стрельбе очередью с гиро-коррекцией. Если играешь от 4000 ELO — попробуй неделю с OFF.',
    'pro.tweak.fire_button_top_corner.path': 'Settings → Customize → Fire button position',
    'pro.tweak.fire_button_top_corner.option': 'Кнопка справа сверху + дублирующая слева',
    'pro.tweak.fire_button_top_corner.reason':
      'Стандартная кнопка огня по центру справа — медленно для 4-finger claw. Ставь основную справа сверху (под указательный) и дублирующую слева сверху (для левого пика). Так не отрывая больших пальцев со стиков можешь стрелять.',

    // QoL
    'pro.tweak.auto_pickup_priority.path': 'Settings → Basic → Auto Pick Up',
    'pro.tweak.auto_pickup_priority.option': 'Только аптечки/энергетики',
    'pro.tweak.auto_pickup_priority.reason':
      'Автопикап «всё подряд» забивает рюкзак барахлом и крадёт пинг при луте. Оставь только healing items — они нужны всегда и быстро.',
    'pro.tweak.quick_chat_off.path': 'Settings → Basic → Quick Chat in Match',
    'pro.tweak.quick_chat_off.option': 'OFF (для соло) / только базовые (для команды)',
    'pro.tweak.quick_chat_off.reason':
      'Случайный тап на quick-chat выскакивает в перестрелке и блокирует половину экрана на 3 секунды. Если играешь соло — отключай. В команде оставляй базовый набор без 30 эмоций.',
    'pro.tweak.vehicle_camera_lock.path': 'Settings → Basic → Vehicle Camera Lock',
    'pro.tweak.vehicle_camera_lock.option': 'OFF',
    'pro.tweak.vehicle_camera_lock.reason':
      'Блокирует камеру в направлении движения тачки. Мешает быстро глянуть назад / по сторонам. Pro отключает: камера свободно крутится, видишь preсs за тобой.',
    'pro.tweak.haptic_off.path': 'Settings → Basic → Haptic Feedback',
    'pro.tweak.haptic_off.option': 'OFF',
    'pro.tweak.haptic_off.reason':
      'Вибрация при стрельбе мешает гиро-наведению (физический шум на гироскоп) и сажает батарею. Pro выключают — фокус остаётся на отдаче, а не на дрожащем телефоне.',
    'pro.tweak.background_apps_off.path': 'iOS / Android → закрыть фоновые приложения',
    'pro.tweak.background_apps_off.option': 'Перед матчем = только PUBG Mobile',
    'pro.tweak.background_apps_off.reason':
      'YouTube/Discord/WhatsApp в фоне крадут RAM и CPU → троттлинг и FPS-просадки. На iPhone 13 Pro особенно: iOS агрессивно паркует процессы, но активные таймеры всё равно «дёргают» CPU. Свайп вверх → закрыл всё → запускай PUBGM.',

    'pro.checklist.title': '5-минутный чеклист перед игрой',
    'pro.checklist.lead':
      'Если дочитал до сюда — пройдись быстро по этому списку, и ты в топ-15% по подготовке среди всех игроков на твоём ранге.',
    'pro.checklist.step1':
      'Закрыл фоновые приложения (свайп вверх → закрыть все). PUBG Mobile = единственное активное.',
    'pro.checklist.step2':
      'Включил Gyroscope = Always On (см. Controls Setup), яркость в игре = 100%, цветовая схема = Colorful.',
    'pro.checklist.step3':
      'Прогнал Gyro Calibration в нашем модуле (10 секунд, фиксит дрифт телефона).',
    'pro.checklist.step4':
      '5–10 минут на тренировочном острове: проверил отдачу M416/AKM, попадание в голову на 50 м, скорость переключения оружия.',
    'pro.checklist.step5':
      'Зашёл в матч с наушниками, music = OFF, voice = только команда.',
    'hud.title': 'HUD Layout Generator',
    'hud.lead':
      'Тащи кнопки куда удобно. Координаты нормализованы — раскладка одинаково ляжет на любое разрешение экрана.',
    'hud.layout.thumb_default.desc':
      'Стандартная двух-пальцевая раскладка для большинства игроков.',
    'hud.layout.claw_three.desc':
      'Когтевой хват тремя пальцами: спусковой палец на FIRE сверху.',
    'hud.layout.four_finger.desc':
      'Четыре пальца: левая/правая ADS снизу, FIRE и SCOPE сверху.',
    'hud.layout.six_finger_pro.desc':
      'Расширенная 6-пальцевая раскладка: отдельные кнопки для лева/права, прыжка и крауча сверху.',
    'hud.style.thumb': 'Большие пальцы',
    'hud.style.claw': 'Claw 3-finger',
    'hud.style.fourFinger': '4-finger Claw',
    'hud.style.sixFinger': '6-finger Pro',
    'hud.button.size': 'Размер кнопки',
    'hud.previewHint':
      'Превью игрового экрана 16:9. Двигай кнопки касанием/мышью, выбранный элемент масштабируется слайдером.',
    'gyro.title': 'Gyro Calibration',
    'gyro.lead':
      'Мастер калибровки гироскопа: подбираем чувствительность по дистанциям. Если на устройстве доступен датчик ориентации — мастер использует реальные показания, иначе работает как калькулятор.',
    'gyro.startSensor': 'Запустить с датчиком',
    'gyro.calculator': 'Калькулятор',
    'gyro.permission.needed':
      'Браузер запросил разрешение на доступ к датчику ориентации. Подтверди, чтобы запустить тест.',
    'gyro.notSupported':
      'Датчик ориентации недоступен в этом браузере/устройстве. Используй калькулятор ниже.',
    'gyro.step.180':
      'Шаг 1. Поверни телефон на 180° по горизонтали (глядя сверху). Удерживай ровно.',
    'gyro.step.90':
      'Шаг 2. Поверни на 90° вертикально (нос вверх).',
    'gyro.targetRotation': 'Цель',
    'gyro.measured': 'Измерено',
    'gyro.suggestedSensitivity': 'Рекомендованная чувствительность',
    'recoil.title': 'Recoil Pattern Lab',
    'recoil.lead':
      'Визуализация паттерна отдачи + интерактивный тренажёр компенсации. Двигай прицел вниз/вбок чтобы выровнять разлёт пуль.',
    'recoil.simulate': 'Симулировать стрельбу',
    'recoil.train': 'Тренажёр',
    'recoil.dispersion': 'Разлёт',
    'recoil.score': 'Счёт',
    'drill.title': 'Headshot Drill Trainer',
    'drill.lead':
      'Кликай по целям. Чем чаще попадаешь в красную хедшот-зону — тем выше скоринг. Время реакции и точность сохраняются в истории.',
    'drill.difficulty': 'Сложность',
    'drill.difficulty.easy': 'Лёгкая',
    'drill.difficulty.medium': 'Средняя',
    'drill.difficulty.hard': 'Сложная',
    'drill.duration': 'Длительность (сек)',
    'drill.start': 'Начать дрилл',
    'drill.score': 'Счёт',
    'drill.accuracy': 'Точность',
    'drill.headshots': 'Хедшоты',
    'drill.avgReaction': 'Средняя реакция',
    'drill.history': 'История',
    'ttk.title': 'Weapon TTK Calculator',
    'ttk.lead':
      'Сравни два ствола по времени до убийства, по урону и по числу выстрелов с учётом каски/жилета и дистанции.',
    'ttk.headers.shots': 'Выстрелов',
    'ttk.headers.dmg': 'Урон/выстрел',
    'ttk.headers.ttk': 'TTK (мс)',
    'ttk.headers.dps': 'DPS',
    'ttk.weapon1': 'Оружие 1',
    'ttk.weapon2': 'Оружие 2',
    'reaction.title': 'Reaction Time Tester',
    'reaction.lead':
      'Дождись зелёного экрана и тапни. Тренажёр считает среднее время реакции по серии замеров.',
    'reaction.wait': 'Жди зелёного…',
    'reaction.now': 'ТАПАЙ!',
    'reaction.tooEarly': 'Рано! Подожди зелёный.',
    'reaction.result': 'Время реакции',
    'reaction.average': 'Среднее',
    'reaction.best': 'Лучшее',
    'falloff.title': 'Damage Falloff Calculator',
    'falloff.lead':
      'Как падает урон с дистанцией для каждого ствола (приблизительная модель).',
    'loadout.title': 'Loadout Planner',
    'loadout.lead':
      'Собери сетап: основное оружие, вспомогательное, гранаты, медикаменты. Считаем общий вес и слоты рюкзака.',
    'loadout.primary': 'Основное',
    'loadout.secondary': 'Вспомогательное',
    'loadout.throwables': 'Гранаты',
    'loadout.heals': 'Хилки',
    'loadout.backpack': 'Рюкзак',
    'loadout.totalSlots': 'Всего слотов',
    'loadout.usedSlots': 'Занято',
    'crosshair.title': 'Crosshair Placement Trainer',
    'crosshair.lead':
      'Сценарии правильного размещения прицела перед выходом из угла. Кликай на точку, в которой должен быть кросхэр.',
    'crosshair.scenario': 'Сценарий',
    'crosshair.targetHeight': 'Высота цели',
    'crosshair.distance': 'Дистанция',
    'crosshair.score': 'Очки',
    'device.title': 'Device Profile',
    'device.lead':
      'Выбери модель — получишь стартовые рекомендации по графике, FPS и пресету чувствительности.',
    'device.model': 'Модель',
    'device.refreshRate': 'Refresh Rate',
    'device.tier': 'Уровень',
    'device.graphics': 'Графика',
    'device.fps': 'FPS',
    'device.styleAdvice': 'Совет по стилю',
    'device.applyToBuilder': 'Применить пресет в Sensitivity Builder',
    'device.applied': 'Готово — открой вкладку Sensitivity',
    'device.applyNote':
      'Эти числа уже подставлены в Sensitivity Builder. Перейди туда, чтобы скопировать их в PUBG Mobile, или допиши свои.',
    'maps.title': 'Drop Spots',
    'maps.lead':
      'Карта дроп-спотов с тиром лута и риском. Используй как чек-лист для смены ротации.',
    'maps.loot.low': 'Низкий лут',
    'maps.loot.mid': 'Средний лут',
    'maps.loot.high': 'Высокий лут',
    'maps.loot.top': 'Топ лут',
    'maps.risk.low': 'Низкий риск',
    'maps.risk.mid': 'Средний риск',
    'maps.risk.high': 'Высокий риск',
    'tips.title': 'Tips & Coach',
    'tips.lead':
      'Подборка практических советов с фильтром по уровню (новичок / средний / про) и теме. Без воды — то, что реально работает в катке.',
    'tips.level': 'Уровень',
    'tips.topic': 'Тема',
    'tips.level.all': 'Все',
    'tips.level.newbie': 'Новичок',
    'tips.level.intermediate': 'Средний',
    'tips.level.pro': 'Про',
    'tips.topic.all': 'Все темы',
    'tips.topic.gunplay': 'Стрельба',
    'tips.topic.movement': 'Движение',
    'tips.topic.sound': 'Звук',
    'tips.topic.rotation': 'Ротации',
    'tips.topic.gyro': 'Гироскоп',
    'tips.topic.claw': 'Claw / пальцы',
    'tips.topic.mental': 'Психология',
    'tips.topic.sensitivity': 'Чувствительность',
    'tips.topic.hud': 'Раскладка',
    'tips.topic.loot': 'Лут',
    'tips.summary': 'Покрытие по уровням',
    'tips.count': 'советов',
    'tips.empty': 'Под этот фильтр пока нет советов.',
    'app.banner.title': 'Как пользоваться этим инструментом',
    'app.banner.body':
      'Это КАЛЬКУЛЯТОР настроек. Цифры, которые ты тут получаешь, нужно перенести в саму PUBG Mobile вручную (Settings → Sensitivity / Controls). У PUBG Mobile нет публичного API чтобы что-то применять извне — поэтому все тулзы в интернете работают только так. В игре всё применяется одним заходом в меню за 30 секунд.',
    'app.banner.dismiss': 'Понятно, скрыть',
    'app.banner.show': 'Как пользоваться',
    'sensitivity.applyTitle': 'Как применить эти числа в PUBG Mobile',
    'sensitivity.apply.step1': '1. Открой PUBG Mobile, зайди в матч-холл (главный экран).',
    'sensitivity.apply.step2': '2. Нажми шестерёнку (Settings) в правом верхнем углу.',
    'sensitivity.apply.step3': '3. Выбери вкладку «Sensitivity» (или «Чувствительность»).',
    'sensitivity.apply.step4':
      '4. Перенеси значения из колонки «Camera» в раздел «Camera Sensitivity (Free Look)», из «ADS» — в «Camera Sensitivity» (с прицеливанием), из «Gyro» — в «Gyroscope Sensitivity» (если используешь гироскоп).',
    'sensitivity.apply.step5':
      '5. Сохрани настройки и зайди в тренировочный режим (Training Ground) — настройки лучше «обкатать» 5–10 минут перед матчем.',
    'sensitivity.apply.note':
      'Совет: не меняй значения сразу на ±20. Тренируй текущий пресет 7 дней, затем подкручивай по ±5 за раз — мышечная память важнее «идеальных» цифр.',
    'hud.applyTitle': 'Как применить эту раскладку в PUBG Mobile',
    'hud.apply.step1': '1. Settings → Controls → Customize.',
    'hud.apply.step2':
      '2. На превью игры расставь кнопки в те же позиции что и тут (это нормализованные координаты — на твоём экране пропорции совпадут).',
    'hud.apply.step3':
      '3. В правом нижнем углу нажми Save (значок дискетки) и присвой имя раскладке.',
    'hud.apply.step4':
      '4. В матче эта раскладка автоматически загрузится. Если в игре кнопок меньше/больше — лишние можно скрыть слайдером прозрачности.',
  },
  en: {
    'app.title': 'PUBGM Performance Toolkit',
    'app.subtitle':
      'Sensitivity Builder · HUD Layout · Gyro · Recoil Lab · Headshot Trainer · TTK Calculator',
    'nav.sensitivity': 'Sensitivity Builder',
    'nav.controls': 'Controls Setup',
    'nav.pro': 'Pro Tweaks',
    'nav.hud': 'HUD Layout',
    'nav.gyro': 'Gyro Calibration',
    'nav.recoil': 'Recoil Lab',
    'nav.drill': 'Headshot Drill',
    'nav.ttk': 'TTK Calculator',
    'nav.reaction': 'Reaction Tester',
    'nav.falloff': 'Damage Falloff',
    'nav.loadout': 'Loadout Planner',
    'nav.crosshair': 'Crosshair Trainer',
    'nav.device': 'Device Profile',
    'nav.maps': 'Drop Spots',
    'nav.tips': 'Tips & Coach',
    'nav.short.sensitivity': 'Sens',
    'nav.short.controls': 'Controls',
    'nav.short.pro': 'Pro',
    'nav.short.tips': 'Tips',
    'nav.short.device': 'Device',
    'lang.ru': 'RU',
    'lang.en': 'EN',
    'common.preset': 'Preset',
    'common.reset': 'Reset',
    'common.save': 'Save',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.share': 'Share',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.start': 'Start',
    'common.stop': 'Stop',
    'common.restart': 'Restart',
    'common.next': 'Next',
    'common.back': 'Back',
    'common.weapon': 'Weapon',
    'common.attachments': 'Attachments',
    'common.distance': 'Distance',
    'common.armor': 'Armor',
    'common.helmet': 'Helmet',
    'common.vest': 'Vest',
    'common.zone': 'Hit zone',
    'common.head': 'Head',
    'common.body': 'Body',
    'common.limb': 'Limb',
    'common.none': 'None',
    'common.dps': 'DPS',
    'common.ttk': 'TTK',
    'common.shots': 'Shots',
    'common.damage': 'Damage',
    'common.rpm': 'RPM',
    'common.velocity': 'Bullet Velocity',
    'common.magazine': 'Magazine',
    'common.category': 'Class',
    'common.search': 'Search',
    'common.compare': 'Compare',
    'common.scope': 'Scope',
    'common.warning.dataDisclaimer':
      'Numbers are aggregated from public sources and approximate the patch 3.x meta. Use them as a starting point — every patch shifts the balance.',
    'sensitivity.title': 'Sensitivity Builder',
    'sensitivity.lead':
      'Tune sensitivity per scope and channel. Everything is stored locally in your browser and packs into a shareable URL.',
    'sensitivity.channel.camera': 'Camera (Free Look)',
    'sensitivity.channel.ads': 'ADS',
    'sensitivity.channel.gyro': 'Gyroscope',
    'sensitivity.channel.camera.desc':
      'How fast the camera turns when you swipe with no scope open.',
    'sensitivity.channel.ads.desc':
      'How fast you turn while holding any scope (Aim Down Sights).',
    'sensitivity.channel.gyro.desc':
      'How much the camera moves when you tilt your phone (only if gyro is on).',
    'sensitivity.preset.no_gyro_balanced.desc':
      'Balanced preset for non-gyro players: reliable close-range and readable long-range tracking.',
    'sensitivity.preset.full_gyro_aggressive.desc':
      'Full gyro, minimal ADS — shots are controlled by tilting the phone. Built for claw / 4-finger / 6-finger.',
    'sensitivity.preset.full_gyro_long.desc':
      'Gyro tuned around 4x/6x/8x scopes — steady recoil pull at distance.',
    'sensitivity.preset.thumb_close.desc':
      'Two-thumb playstyle, leaning on ADS for close/mid range fights.',
    'sensitivity.preset.mixed_hybrid.desc':
      'Gyro for long range, ADS for close range — a compromise between both schools.',
    'sensitivity.preset.iphone_pro_120.desc':
      'Tuned for iPhone 13/14/15 Pro: 120Hz ProMotion + steady iOS gyro. ADS is filled in — works in hybrid style without gyro too.',
    'sensitivity.preset.iphone_60_stable.desc':
      'iPhone 13/14/15 (60Hz): softer pacing, ADS-leaning. Avoids overdriving gyro on a 60Hz panel.',
    'sensitivity.preset.samsung_ultra_claw.desc':
      'Galaxy S Ultra on 120Hz AMOLED + Snapdragon: claw 4-finger with gyro and an ADS fallback for close range.',
    'sensitivity.preset.oneplus_xiaomi_pro.desc':
      'Top-tier OnePlus / Xiaomi at 120Hz: aggressive full-gyro for 4/6-finger. ADS muted on close range.',
    'sensitivity.preset.rog_redmagic_tournament.desc':
      'ROG Phone / RedMagic, 144Hz: tournament-grade 6-finger. Gyro maxed across every scope, ADS as backup.',
    'sensitivity.preset.mid_range_stable.desc':
      'Mid-range (A54, Note 13, POCO X6, Pixel 8a): stable values that don\u2019t whip around when the SoC throttles.',
    'sensitivity.exportHint':
      'PUBG Mobile has no official import API — copy the numbers manually under Settings → Sensitivity.',
    'sensitivity.troubleshoot.title':
      'Copied the numbers but gyro still off / ADS unresponsive in-game?',
    'sensitivity.troubleshoot.body':
      'This isn\u2019t a calculator bug — it\u2019s a PUBG Mobile control-mode issue (Gyroscope: Always On vs Scope On, Fire button: tap vs drag, ADS: Hold vs Toggle). Open Controls Setup for a step-by-step setup and symptom-based diagnosis.',
    'sensitivity.troubleshoot.cta': 'Open Controls Setup →',
    'controls.title': 'Controls Setup',
    'controls.lead':
      'Sensitivity is only half the job. The other half is configuring the controls so the gyro actually fires during ADS and the fire button doesn\u2019t drift under your finger.',
    'controls.intro':
      'When players say "gyro doesn\u2019t work while shooting", 95% of the time it isn\u2019t the values from the calculator — it\u2019s the modes: Gyroscope set to "Scope On", a drag-fire button, or ADS mode on Toggle. Below is the step-by-step PUBG Mobile setup.',
    'controls.tag.gyro': 'Gyroscope',
    'controls.tag.gyro.desc':
      'Must be "Always On" — otherwise gyro stays off in close range and on red dot ADS.',
    'controls.tag.fire': 'Fire button',
    'controls.tag.fire.desc':
      'Tap Fire (no drag). With drag/scroll, the button moves under your finger and steals input from the gyro.',
    'controls.tag.ads': 'ADS / Peek',
    'controls.tag.ads.desc':
      'Hold beats Toggle: finger off → ADS off, no stuck-scope situations.',
    'controls.recommended.title': 'Recommended PUBG Mobile settings',
    'controls.recommended.lead':
      'Open Settings inside PUBG Mobile and walk through this list. These fix the main shoot-through-gyro issues.',
    'controls.recommended.tag': 'Recommended',
    'controls.path.gyro_mode':
      'Settings → Basic → Gyroscope',
    'controls.option.always_on': 'Always On',
    'controls.reason.always_on':
      'Gyro stays active everywhere: hip-fire (TPP/FPP no scope), red dot ADS, and full scopes. Without this there is no "ADS gyro" — the game only enables gyro inside scopes.',
    'controls.bad.scope_on':
      '"Scope On" is the #1 reason behind "my gyro doesn\u2019t turn the screen while shooting". With this setting gyro is dead in close range and during red-dot fire fights.',
    'controls.path.fire_button_mode':
      'Settings → Controls → Customize → Fire button',
    'controls.option.tap_fire': 'Tap Fire (no drag)',
    'controls.reason.tap_fire':
      'The fire button is fixed in place, so taps don\u2019t drift. Gyro keeps focus and steers the camera cleanly.',
    'controls.bad.drag_fire':
      'Drag mode / scroll-to-fire — your finger moves the button and the game reads it as a camera swipe. Result: the view jerks while shooting, or gyro feels disabled.',
    'controls.path.peek_and_fire':
      'Settings → Controls → Peek & Fire / Peek & Open Scope',
    'controls.option.peek_and_fire': 'Peek & Fire = OFF (if you use gyro)',
    'controls.reason.peek_and_fire':
      'Peek buttons auto-lean and auto-fire, which fights gyro aiming. Turn off if you play gyro. Pure-thumb players can leave it on.',
    'controls.path.ads_mode':
      'Settings → Controls → Aim Down Sights mode',
    'controls.option.ads_hold': 'Hold',
    'controls.reason.ads_hold':
      'Finger off → ADS released. Toggle mode can leave you stuck in ADS while you eat bullets.',
    'controls.path.smart_aim_assist':
      'Settings → Basic → Aim Assist',
    'controls.option.aim_assist_on': 'On (newbie / intermediate)',
    'controls.reason.aim_assist_on':
      'Tiny pull toward the closest body. Doesn\u2019t replace skill — it just stops you whiffing in close range. Some top pros switch it off, but for most players, On is better.',
    'controls.path.scope_3d_touch':
      'Settings → Controls → 3D Touch (iPhone)',
    'controls.option.scope_3d_touch_off': 'Off',
    'controls.reason.scope_3d_touch_off':
      'iPhones register hard presses as long-holds, which the game treats as a different command. On iPhone 13/14/15 Pro, disable 3D Touch on fire and scope buttons.',
    'controls.troubleshoot.title': 'Not working — diagnostics',
    'controls.troubleshoot.lead':
      'Pick the symptom you\u2019re hitting. Each step maps to one PUBG Mobile setting.',
    'controls.issue.gyro_off_in_ads.title':
      'Gyro doesn\u2019t turn the screen while firing / ADS',
    'controls.issue.gyro_off_in_ads.q1':
      'What\u2019s the Gyroscope mode in Settings → Basic?',
    'controls.issue.gyro_off_in_ads.f1':
      'Set it to "Always On". "Scope On" only works while a scope is up, and many red-dot players think gyro is on while the game disagrees.',
    'controls.issue.gyro_off_in_ads.q2':
      'Are all Gyroscope Sensitivity values > 0 across every scope?',
    'controls.issue.gyro_off_in_ads.f2':
      'Open Settings → Sensitivity → Gyroscope Sensitivity. If a scope shows 0, gyro is disabled just for that scope. Copy the values from the Gyro column in this calculator.',
    'controls.issue.gyro_off_in_ads.q3':
      'Is the gyro toggle on inside the match (icon near the minimap)?',
    'controls.issue.gyro_off_in_ads.f3':
      'There\u2019s an in-match gyro toggle next to the minimap. If you tapped it accidentally, gyro is off for that match even if Settings = Always On. Toggle it back on.',
    'controls.issue.fire_button_drag.title':
      'Fire button drifts / scrolls',
    'controls.issue.fire_button_drag.q1':
      'Did you enable "Fire Button can be dragged" / scroll mode in Customize?',
    'controls.issue.fire_button_drag.f1':
      'Disable it. Settings → Controls → Customize → select Fire → turn off "Move while holding" / drag mode. The button must stay still.',
    'controls.issue.fire_button_drag.q2':
      'Are you using the "Scoped Fire Button" (separate button that appears in scopes)?',
    'controls.issue.fire_button_drag.f2':
      'It has its own position and mode. Check it separately in Customize and make sure it\u2019s not in drag mode either.',
    'controls.issue.ads_doesnt_hold.title':
      'ADS doesn\u2019t hold / releases unexpectedly',
    'controls.issue.ads_doesnt_hold.q1':
      'What\u2019s set under Settings → Controls → ADS Mode?',
    'controls.issue.ads_doesnt_hold.f1':
      'Set "Hold". With Toggle, an accidental second tap drops ADS. Hold is predictable: finger on → ADS, finger off → released.',
    'controls.issue.screen_jumps_on_shoot.title':
      'Screen jerks while shooting',
    'controls.issue.screen_jumps_on_shoot.q1':
      'Is some Camera Sensitivity slammed to max?',
    'controls.issue.screen_jumps_on_shoot.f1':
      'Open Sensitivity Builder and check Camera (Free Look). If TPP No Scope = 300 with a drag-fire button, the finger drags the camera while shooting. Reset to the iPhone 13/14/15 Pro · 120Hz preset.',
    'controls.issue.screen_jumps_on_shoot.q2':
      'Have you run Gyro Calibration in our module?',
    'controls.issue.screen_jumps_on_shoot.f2':
      'Open Gyro Calibration. If the gyro has physical drift, the screen will move on its own. Calibration fixes it in 10 seconds.',
    'controls.gyroAds.title': 'Gyro + ADS: rules that actually work',
    'controls.gyroAds.body1':
      'PUBG Mobile uses a single "Gyroscope Sensitivity" column for everything: free look (when Always On) and ADS. There\u2019s no separate "ADS Gyro" panel. So when people say "tune ADS gyro", they mean the same Gyroscope Sensitivity values across Red Dot through 8x.',
    'controls.gyroAds.body2':
      'Most pros use high values (300) on close/mid and lower on 6x/8x — so heavy scopes don\u2019t shake from tiny phone movements. Our "iPhone 13/14/15 Pro · 120Hz" preset already follows that pattern.',
    'controls.gyroAds.do': 'Do',
    'controls.gyroAds.do.1':
      'Gyroscope = Always On. No exceptions.',
    'controls.gyroAds.do.2':
      'Aim coarsely with the thumb, fine with gyro. Thumb swings 10°, gyro adjusts ±2°.',
    'controls.gyroAds.do.3':
      'Warm up on the training ground for 10 minutes pre-match — gyro is muscle memory.',
    'controls.gyroAds.dont': 'Don\u2019t',
    'controls.gyroAds.dont.1':
      'Don\u2019t set Gyroscope = Scope On and then complain "gyro doesn\u2019t work in red-dot ADS".',
    'controls.gyroAds.dont.2':
      'Don\u2019t enable Drag Fire alongside gyro. Two different swipe systems competing for the same input.',
    'controls.gyroAds.dont.3':
      'Don\u2019t move values by ±50 in a day. Tweak ±5 and train for a week — otherwise muscle memory resets.',
    'pro.title': 'Pro Tweaks · advanced settings',
    'pro.lead':
      '23 settings used by pros and streamers — all legal, all inside PUBG Mobile\u2019s own Settings menu. No cheats, aimbots, or mods.',
    'pro.intro':
      'The average player opens Settings → Sensitivity once and closes the app. A pro walks through every section and dials in 20+ options for visibility, pickup speed, ADS speed, and noise suppression. The list is below.',
    'pro.disclaimer.title': 'These are legal settings, not cheats',
    'pro.disclaimer.body':
      'Everything below is a stock option in PUBG Mobile\u2019s own menus. No aimbot / wallhack / ESP / modded APK / recoil macros / memory editors here — those get your account banned for 10 years along with the device. These are the settings the game itself ships, used by Soul Mortal, Levinho, ScoutOP, etc.',
    'pro.filter.all': 'All',
    'pro.tag.recommended': 'Pro',
    'pro.cat.visibility': 'Visibility',
    'pro.cat.visibility.desc':
      'Graphics and color tweaks that make enemies stand out at any distance.',
    'pro.cat.audio': 'Audio',
    'pro.cat.audio.desc':
      'Sound in PUBGM is half the information. 3D audio + footstep visualizer = you know where the enemy is before you see them.',
    'pro.cat.hud': 'HUD & Speed',
    'pro.cat.hud.desc':
      'Options that speed up loot pickup, scope, and enemy marking. Each one buys you a second.',
    'pro.cat.aim': 'Aim & Combat',
    'pro.cat.aim.desc':
      'Fine-grained aim tweaks for a consistent picture and zero lag between ADS and firing.',
    'pro.cat.qol': 'Quality of Life',
    'pro.cat.qol.desc':
      'Settings that suppress noise and stray input so you focus on the fight, not on screen taps.',

    // Visibility
    'pro.tweak.graphics_smooth_ultra.path': 'Settings → Graphics → Quality / Frame Rate',
    'pro.tweak.graphics_smooth_ultra.option': 'Quality = Smooth, Frame Rate = Ultra (or Extreme)',
    'pro.tweak.graphics_smooth_ultra.reason':
      'Smooth + Ultra means minimal visual effects and max FPS. No fancy shadows or post-processing — enemies become high-contrast silhouettes on a clean background. On iPhone 13 Pro / Snapdragon 8 Gen 1+ pick Extreme (90 FPS) or Ultra Extreme (120 FPS).',
    'pro.tweak.graphics_smooth_ultra.warn':
      'If the device throttles on Smooth+Ultra — drop to Balanced+Ultra. Stable 60 FPS beats jittery 90.',
    'pro.tweak.style_colorful.path': 'Settings → Graphics → Style',
    'pro.tweak.style_colorful.option': 'Colorful',
    'pro.tweak.style_colorful.reason':
      'Realistic / Classic lower saturation, blending enemies with grass and grey buildings. Colorful boosts saturation: red clothing, orange muzzle flash, blood — visible from a kilometer.',
    'pro.tweak.brightness_max.path': 'Settings → Graphics → Brightness',
    'pro.tweak.brightness_max.option': 'Brightness = 100%',
    'pro.tweak.brightness_max.reason':
      'Dark Livik / Sanhok rooms at default brightness are a black wall. At 100% you see silhouettes in shadow and under stairs. Set system brightness to ~70% so the AMOLED doesn\u2019t burn in.',
    'pro.tweak.colorblind_mode.path': 'Settings → Basic → Colorblind Mode',
    'pro.tweak.colorblind_mode.option': 'Deuteranopia (or Protanopia)',
    'pro.tweak.colorblind_mode.reason':
      'Not a bug, a feature. Blood and hit markers turn bright yellow / orange instead of red-grey. You see exactly where you hit and how much damage. Even non-colorblind pros use it.',
    'pro.tweak.shadows_off.path': 'Settings → Graphics → Shadows',
    'pro.tweak.shadows_off.option': 'OFF',
    'pro.tweak.shadows_off.reason':
      'Enemy ground shadows can give away their position, BUT your own shadows in bushes hide you the wrong way. Most pros disable — more stable FPS and less visual clutter mid-fight.',

    // Audio
    'pro.tweak.spatial_sound.path': 'Settings → Audio → Spatial / 3D Sound',
    'pro.tweak.spatial_sound.option': 'ON',
    'pro.tweak.spatial_sound.reason':
      'Enables HRTF processing: you hear footsteps left/right, above/below, far/near. Without 3D sound everything is mono — "second floor or basement?" is unanswerable. Mandatory with headphones.',
    'pro.tweak.sound_visualizer.path': 'Settings → Audio → Sound Effect Visualization',
    'pro.tweak.sound_visualizer.option': 'ON (if playing without headphones)',
    'pro.tweak.sound_visualizer.reason':
      'Adds a mini-indicator around the compass: shows direction of footsteps, gunshots, vehicles. Not a substitute for sound, but saves you in a noisy room. Pros with good headphones often turn it off to avoid distraction.',
    'pro.tweak.music_off.path': 'Settings → Audio → Background Music',
    'pro.tweak.music_off.option': 'OFF (Volume = 0)',
    'pro.tweak.music_off.reason':
      'Lobby music takes an audio slot and mixes with footsteps. Disable completely — you\u2019re not here for the soundtrack. Re-enable only on training ground.',
    'pro.tweak.voice_room_solo.path': 'Settings → Audio → Voice Chat',
    'pro.tweak.voice_room_solo.option': 'Team Only (squads) / OFF (solo)',
    'pro.tweak.voice_room_solo.reason':
      'All-room voice mixes Russian, Indian, and Arabic chatter together → you won\u2019t hear footsteps 5 meters away. Solo: turn off. Squad: keep Team only.',

    // HUD
    'pro.tweak.auto_open_scope.path': 'Settings → Basic → Auto-open Scope',
    'pro.tweak.auto_open_scope.option': 'ON',
    'pro.tweak.auto_open_scope.reason':
      'When you pick up a weapon it equips with the scope already open — no extra tap. In close range that\u2019s the difference between killing first and dying first.',
    'pro.tweak.wear_when_picked_up.path': 'Settings → Basic → Wear when picked up',
    'pro.tweak.wear_when_picked_up.option': 'ON (helmet, vest, backpack)',
    'pro.tweak.wear_when_picked_up.reason':
      'Picked up a level-2 helmet → it equips immediately, even if you had a level-1. Without this you have to open the bag and tap "wear" — 2 seconds you can be downed in.',
    'pro.tweak.mark_items_deathbox.path': 'Settings → Basic → Mark items in death box',
    'pro.tweak.mark_items_deathbox.option': 'ON',
    'pro.tweak.mark_items_deathbox.reason':
      'You see the loot icons on the death crate before opening it. You decide instantly whether to loot or move on.',
    'pro.tweak.quick_marker.path': 'Settings → Basic → Quick Marker',
    'pro.tweak.quick_marker.option': 'Double-tap compass = marker',
    'pro.tweak.quick_marker.reason':
      'Your finger doesn\u2019t leave input — drop a direction marker for the squad in 0.2s. Without this you\u2019d open the map and click, losing visual on the fight.',
    'pro.tweak.eject_empty_mags.path': 'Settings → Basic → Eject Empty Magazines',
    'pro.tweak.eject_empty_mags.option': 'ON',
    'pro.tweak.eject_empty_mags.reason':
      'Empty mags drop from the inventory automatically. You don\u2019t mix consumables with attachments, and grabbing a fresh mag is faster.',

    // Aim
    'pro.tweak.fixed_crosshair_ads.path': 'Settings → Basic → Fixed Crosshair when ADS',
    'pro.tweak.fixed_crosshair_ads.option': 'ON',
    'pro.tweak.fixed_crosshair_ads.reason':
      'Your crosshair doesn\u2019t wobble from phone movement. Reduces gyro noise and makes burst fire much more accurate.',
    'pro.tweak.scope_blur_off.path': 'Settings → Graphics → Scope Blur',
    'pro.tweak.scope_blur_off.option': 'OFF',
    'pro.tweak.scope_blur_off.reason':
      'Scope edge blur is pretty but hides peripheral movement. Pros disable — you spot enemies running into the edge and dodge in time.',
    'pro.tweak.ads_during_reload.path': 'Settings → Basic → ADS during Reload',
    'pro.tweak.ads_during_reload.option': 'OFF',
    'pro.tweak.ads_during_reload.reason':
      'Otherwise an accidental ADS tap mid-reload cancels it, leaving you empty in a fight. Better to let the game reload cleanly.',
    'pro.tweak.aim_assist_on.path': 'Settings → Basic → Aim Assist',
    'pro.tweak.aim_assist_on.option': 'ON',
    'pro.tweak.aim_assist_on.reason':
      'Tiny pull toward the closest body during ADS at <50m. Doesn\u2019t replace aim, but adds +5–10% hit rate in close range. Newbie / intermediate: leave ON.',
    'pro.tweak.aim_assist_on.warn':
      'Top pros sometimes disable because Aim Assist nudges the crosshair during gyro-corrected burst fire. If you\u2019re 4000+ ELO, try a week with OFF.',
    'pro.tweak.fire_button_top_corner.path': 'Settings → Customize → Fire button position',
    'pro.tweak.fire_button_top_corner.option': 'Top-right + duplicate top-left',
    'pro.tweak.fire_button_top_corner.reason':
      'The default center-right fire button is slow for 4-finger claw. Place primary top-right (under the index) and a duplicate top-left (for left peeks). You fire without lifting thumbs off the sticks.',

    // QoL
    'pro.tweak.auto_pickup_priority.path': 'Settings → Basic → Auto Pick Up',
    'pro.tweak.auto_pickup_priority.option': 'Healing items only',
    'pro.tweak.auto_pickup_priority.reason':
      '"Pick up everything" auto fills your bag with junk and steals frame time on loot. Keep healing items only — they\u2019re always needed and quick.',
    'pro.tweak.quick_chat_off.path': 'Settings → Basic → Quick Chat in Match',
    'pro.tweak.quick_chat_off.option': 'OFF (solo) / basic only (squad)',
    'pro.tweak.quick_chat_off.reason':
      'A stray quick-chat tap mid-fight blocks half the screen for 3 seconds. Solo: disable. Squad: keep just the essentials, drop the 30 emojis.',
    'pro.tweak.vehicle_camera_lock.path': 'Settings → Basic → Vehicle Camera Lock',
    'pro.tweak.vehicle_camera_lock.option': 'OFF',
    'pro.tweak.vehicle_camera_lock.reason':
      'Locks the camera in the direction of travel. Stops you from glancing back / sideways quickly. Pros disable: free camera lets you see who\u2019s chasing.',
    'pro.tweak.haptic_off.path': 'Settings → Basic → Haptic Feedback',
    'pro.tweak.haptic_off.option': 'OFF',
    'pro.tweak.haptic_off.reason':
      'Vibration during firing physically shakes the phone — gyro reads it as motion noise. Also drains battery. Pros turn it off — focus stays on recoil, not on the rumbling phone.',
    'pro.tweak.background_apps_off.path': 'iOS / Android → close background apps',
    'pro.tweak.background_apps_off.option': 'Pre-match: only PUBG Mobile',
    'pro.tweak.background_apps_off.reason':
      'YouTube/Discord/WhatsApp in the background steal RAM and CPU → throttling, FPS drops. Especially on iPhone 13 Pro: iOS aggressively parks processes, but their timers still wake the CPU. Swipe up → close everything → then launch PUBGM.',

    'pro.checklist.title': '5-minute pre-match checklist',
    'pro.checklist.lead':
      'If you read this far — run through the list and you\u2019re in the top-15% of preparation at your rank.',
    'pro.checklist.step1':
      'Closed background apps (swipe up → close all). PUBG Mobile is the only active app.',
    'pro.checklist.step2':
      'Gyroscope = Always On (see Controls Setup), in-game brightness = 100%, color style = Colorful.',
    'pro.checklist.step3':
      'Ran Gyro Calibration in our module (10 seconds, fixes phone drift).',
    'pro.checklist.step4':
      '5–10 minutes on training ground: checked M416/AKM recoil, headshots at 50m, weapon swap speed.',
    'pro.checklist.step5':
      'In-match with headphones, music = OFF, voice = team only.',
    'hud.title': 'HUD Layout Generator',
    'hud.lead':
      'Drag buttons where they feel right. Coordinates are normalized so the layout scales across screen sizes.',
    'hud.layout.thumb_default.desc':
      'Standard two-thumb layout for most players.',
    'hud.layout.claw_three.desc':
      'Three-finger claw grip: trigger finger on FIRE up top.',
    'hud.layout.four_finger.desc':
      'Four fingers: left/right ADS at the bottom, FIRE and SCOPE on top.',
    'hud.layout.six_finger_pro.desc':
      'Extended 6-finger layout: dedicated buttons for left/right, jump and crouch up top.',
    'hud.style.thumb': 'Thumbs',
    'hud.style.claw': 'Claw 3-finger',
    'hud.style.fourFinger': '4-finger Claw',
    'hud.style.sixFinger': '6-finger Pro',
    'hud.button.size': 'Button size',
    'hud.previewHint':
      '16:9 in-game preview. Drag buttons with touch/mouse; selected button scales with the slider.',
    'gyro.title': 'Gyro Calibration',
    'gyro.lead':
      'Gyro calibration wizard: pick sensitivity per scope distance. If your device exposes orientation sensors the wizard uses real readings; otherwise it falls back to a calculator.',
    'gyro.startSensor': 'Start with sensor',
    'gyro.calculator': 'Calculator',
    'gyro.permission.needed':
      'The browser asked for permission to read orientation sensors. Allow it to run the test.',
    'gyro.notSupported':
      'Orientation sensors are not available in this browser/device. Use the calculator below.',
    'gyro.step.180':
      'Step 1. Rotate the phone 180° horizontally (yaw). Hold steady at the end.',
    'gyro.step.90':
      'Step 2. Rotate 90° vertically (pitch up).',
    'gyro.targetRotation': 'Target',
    'gyro.measured': 'Measured',
    'gyro.suggestedSensitivity': 'Suggested sensitivity',
    'recoil.title': 'Recoil Pattern Lab',
    'recoil.lead':
      'Recoil pattern visualizer plus a compensation trainer. Drag your aim down/sideways to keep the burst on target.',
    'recoil.simulate': 'Simulate burst',
    'recoil.train': 'Trainer',
    'recoil.dispersion': 'Dispersion',
    'recoil.score': 'Score',
    'drill.title': 'Headshot Drill Trainer',
    'drill.lead':
      'Click the targets. Hits in the red headshot zone score higher. Reaction time and accuracy are tracked in history.',
    'drill.difficulty': 'Difficulty',
    'drill.difficulty.easy': 'Easy',
    'drill.difficulty.medium': 'Medium',
    'drill.difficulty.hard': 'Hard',
    'drill.duration': 'Duration (s)',
    'drill.start': 'Start drill',
    'drill.score': 'Score',
    'drill.accuracy': 'Accuracy',
    'drill.headshots': 'Headshots',
    'drill.avgReaction': 'Avg reaction',
    'drill.history': 'History',
    'ttk.title': 'Weapon TTK Calculator',
    'ttk.lead':
      'Compare two weapons by time to kill, damage and shot count against any armor combo at any distance.',
    'ttk.headers.shots': 'Shots',
    'ttk.headers.dmg': 'Damage / shot',
    'ttk.headers.ttk': 'TTK (ms)',
    'ttk.headers.dps': 'DPS',
    'ttk.weapon1': 'Weapon 1',
    'ttk.weapon2': 'Weapon 2',
    'reaction.title': 'Reaction Time Tester',
    'reaction.lead':
      'Wait for the green screen and tap. The trainer averages your reaction time across rounds.',
    'reaction.wait': 'Wait for green…',
    'reaction.now': 'TAP!',
    'reaction.tooEarly': 'Too early! Wait for green.',
    'reaction.result': 'Reaction time',
    'reaction.average': 'Average',
    'reaction.best': 'Best',
    'falloff.title': 'Damage Falloff Calculator',
    'falloff.lead':
      'How damage drops off with distance per weapon (approximate model).',
    'loadout.title': 'Loadout Planner',
    'loadout.lead':
      'Plan your kit: primary, secondary, throwables, heals. Backpack slot use is calculated automatically.',
    'loadout.primary': 'Primary',
    'loadout.secondary': 'Secondary',
    'loadout.throwables': 'Throwables',
    'loadout.heals': 'Heals',
    'loadout.backpack': 'Backpack',
    'loadout.totalSlots': 'Total slots',
    'loadout.usedSlots': 'Used',
    'crosshair.title': 'Crosshair Placement Trainer',
    'crosshair.lead':
      'Static scenarios for crosshair placement before peeking. Click the point where the crosshair should sit.',
    'crosshair.scenario': 'Scenario',
    'crosshair.targetHeight': 'Target height',
    'crosshair.distance': 'Distance',
    'crosshair.score': 'Score',
    'device.title': 'Device Profile',
    'device.lead':
      'Pick your model — the toolkit suggests starting graphics, FPS and a sensitivity preset.',
    'device.model': 'Model',
    'device.refreshRate': 'Refresh Rate',
    'device.tier': 'Tier',
    'device.graphics': 'Graphics',
    'device.fps': 'FPS',
    'device.styleAdvice': 'Style advice',
    'device.applyToBuilder': 'Apply preset to Sensitivity Builder',
    'device.applied': 'Done — open the Sensitivity tab',
    'device.applyNote':
      'These numbers are now loaded into Sensitivity Builder. Open that tab to copy them into PUBG Mobile, or fine-tune from there.',
    'maps.title': 'Drop Spots',
    'maps.lead':
      'Curated drop spots with loot tier and risk metadata. Use it as a checklist when changing your rotation.',
    'maps.loot.low': 'Low loot',
    'maps.loot.mid': 'Mid loot',
    'maps.loot.high': 'High loot',
    'maps.loot.top': 'Top loot',
    'maps.risk.low': 'Low risk',
    'maps.risk.mid': 'Mid risk',
    'maps.risk.high': 'High risk',
    'tips.title': 'Tips & Coach',
    'tips.lead':
      'Curated practical advice filtered by skill level (newbie / intermediate / pro) and topic. No fluff — only what actually works in matches.',
    'tips.level': 'Level',
    'tips.topic': 'Topic',
    'tips.level.all': 'All',
    'tips.level.newbie': 'Newbie',
    'tips.level.intermediate': 'Intermediate',
    'tips.level.pro': 'Pro',
    'tips.topic.all': 'All topics',
    'tips.topic.gunplay': 'Gunplay',
    'tips.topic.movement': 'Movement',
    'tips.topic.sound': 'Sound',
    'tips.topic.rotation': 'Rotation',
    'tips.topic.gyro': 'Gyro',
    'tips.topic.claw': 'Claw / fingers',
    'tips.topic.mental': 'Mental',
    'tips.topic.sensitivity': 'Sensitivity',
    'tips.topic.hud': 'HUD layout',
    'tips.topic.loot': 'Loot',
    'tips.summary': 'Coverage per level',
    'tips.count': 'tips',
    'tips.empty': 'No tips match this filter yet.',
    'app.banner.title': 'How this tool works',
    'app.banner.body':
      'This is a CALCULATOR. The numbers you build here have to be copied into PUBG Mobile yourself (Settings → Sensitivity / Controls). PUBG Mobile has no public API for outside tools to push settings — that is why every tool out there works the same way. In-game it takes about 30 seconds.',
    'app.banner.dismiss': 'Got it, hide',
    'app.banner.show': 'How to use',
    'sensitivity.applyTitle': 'How to apply these numbers in PUBG Mobile',
    'sensitivity.apply.step1': '1. Open PUBG Mobile and stay on the lobby screen.',
    'sensitivity.apply.step2': '2. Tap the gear icon (Settings) in the top right.',
    'sensitivity.apply.step3': '3. Open the “Sensitivity” tab.',
    'sensitivity.apply.step4':
      '4. Copy the “Camera” column into “Camera Sensitivity (Free Look)”, the “ADS” column into the in-scope camera section, and “Gyro” into “Gyroscope Sensitivity” (if you play with gyro).',
    'sensitivity.apply.step5':
      '5. Save and warm up in Training Ground for 5–10 min before queueing — muscle memory matters more than the exact numbers.',
    'sensitivity.apply.note':
      'Tip: don’t move values by ±20 at once. Train the current preset for 7 days, then nudge by ±5 — consistency beats perfection.',
    'hud.applyTitle': 'How to apply this HUD layout in PUBG Mobile',
    'hud.apply.step1': '1. Settings → Controls → Customize.',
    'hud.apply.step2':
      '2. On the in-game preview, place buttons into the same positions you set here (coordinates are normalized — proportions will match your screen).',
    'hud.apply.step3':
      '3. Tap Save (floppy icon, bottom-right) and name the layout.',
    'hud.apply.step4':
      '4. The layout will auto-load in matches. Use the in-game opacity slider to hide buttons you don’t need.',
  },
};

export interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nValue>({
  lang: 'ru',
  setLang: () => {},
  t: (k) => k,
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
