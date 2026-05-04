import { createContext, useContext } from 'react';

export type Lang = 'ru' | 'en';

export type Dict = Record<string, string>;

export const DICTIONARIES: Record<Lang, Dict> = {
  ru: {
    'app.title': 'PUBGM Performance Toolkit',
    'app.subtitle':
      'Sensitivity Builder · HUD Layout · Gyro · Recoil Lab · Headshot Trainer · TTK Calculator',
    'nav.sensitivity': 'Sensitivity Builder',
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
    'sensitivity.exportHint':
      'В PUBG Mobile нет official import API — переноси числа в Settings → Sensitivity вручную.',
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
    'sensitivity.exportHint':
      'PUBG Mobile has no official import API — copy the numbers manually under Settings → Sensitivity.',
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
