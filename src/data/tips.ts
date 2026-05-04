export type SkillLevel = 'newbie' | 'intermediate' | 'pro';
export type TipTopic =
  | 'gunplay'
  | 'movement'
  | 'sound'
  | 'rotation'
  | 'gyro'
  | 'claw'
  | 'mental'
  | 'sensitivity'
  | 'hud'
  | 'loot';

export interface Tip {
  id: string;
  level: SkillLevel;
  topic: TipTopic;
  /** Russian text. */
  ru: string;
  /** English text. */
  en: string;
}

/**
 * Curated practical tips. Numbers and ranges are intentionally conservative —
 * they're meant to be a useful "default that works", not a magic formula.
 */
export const TIPS: Tip[] = [
  // ───────── NEWBIE ─────────
  {
    id: 'n-aim-1',
    level: 'newbie',
    topic: 'gunplay',
    ru: 'Никогда не стреляй очередью дольше 4-6 пуль на дистанции — отдача уводит выше головы. Стреляй короткими 3-4 пульсами, сбрасывай прицел и снова.',
    en: 'Don\'t fire bursts longer than 4–6 bullets at range — recoil climbs above the head. Use 3–4 round taps, recenter, fire again.',
  },
  {
    id: 'n-aim-2',
    level: 'newbie',
    topic: 'gunplay',
    ru: 'Целься в грудь, а не в голову. Хедшоты придут со временем — главное стабильно попадать, чтобы ствол не «гулял».',
    en: 'Aim for the chest, not the head. Headshots come with time — first build hit consistency.',
  },
  {
    id: 'n-mov-1',
    level: 'newbie',
    topic: 'movement',
    ru: 'Не беги по открытому полю по прямой. Двигайся «зигзагом» по 4-6 секунд, потом залегай или прячься за объект.',
    en: 'Don\'t sprint across open fields in a straight line. Zig-zag for 4–6 seconds, then prone or break sight behind cover.',
  },
  {
    id: 'n-loot-1',
    level: 'newbie',
    topic: 'loot',
    ru: 'Минимальный лут на выход из дома: AR + 90+ патронов, бронь L2, рюкзак L2, 4 бинта, 2 энергетика, 1 фраг. Без этого — не лезь в драки.',
    en: 'Minimum loot before leaving cover: AR + 90 rounds, L2 vest, L2 backpack, 4 bandages, 2 energy drinks, 1 frag. Below that — don\'t fight.',
  },
  {
    id: 'n-snd-1',
    level: 'newbie',
    topic: 'sound',
    ru: 'Играй ТОЛЬКО в наушниках. Шаги слышны примерно за 30 м, выстрелы — за 200+ м. Это твоя главная информация о враге.',
    en: 'Always use headphones. Footsteps are audible at ~30 m, gunshots at 200+ m. Sound is your primary intel.',
  },
  {
    id: 'n-rot-1',
    level: 'newbie',
    topic: 'rotation',
    ru: 'Не оставайся в зоне до последней секунды. Начинай ротацию, когда таймер до сжатия 60-90 сек — иначе попадёшь в кросс к тем, кто уже сидит в новой зоне.',
    en: 'Don\'t wait for the zone to finish closing. Start rotating with 60–90 seconds left or you\'ll get caught in crossfires.',
  },
  {
    id: 'n-sens-1',
    level: 'newbie',
    topic: 'sensitivity',
    ru: 'Начни с пресета «No Gyro Balanced» в Sensitivity Builder. Не трогай настройки 7 дней — пусть мозг привыкнет, потом подкручивай по 5-10 единиц.',
    en: 'Start with the "No Gyro Balanced" preset in Sensitivity Builder. Don\'t touch it for 7 days — let muscle memory form, then tune ±5–10 at a time.',
  },
  {
    id: 'n-hud-1',
    level: 'newbie',
    topic: 'hud',
    ru: 'Раскладка thumb (2 пальца) — нормальный старт. Не пытайся сразу claw — сначала научись стабильно стрелять, потом усложняй.',
    en: 'A 2-finger thumb layout is fine to start. Don\'t jump straight into claw — build aim consistency first, then add fingers.',
  },
  {
    id: 'n-mental-1',
    level: 'newbie',
    topic: 'mental',
    ru: 'Цель ранних каток — ВЫЖИТЬ в топ-10, а не убить много. Прячься, наблюдай, учись по чужим перестрелкам — это даёт +500 RP за вечер.',
    en: 'Early on, your goal is reaching top 10 — not racking kills. Watch fights, hide, learn — it\'s worth +500 RP a night.',
  },

  // ───────── INTERMEDIATE ─────────
  {
    id: 'i-aim-1',
    level: 'intermediate',
    topic: 'gunplay',
    ru: 'На AR ставь компенсатор + угловую рукоять + лёгкий приклад. Это даёт ~25% к вертикали и ~15% к горизонтали — самое заметное усиление контроля.',
    en: 'On ARs run compensator + angled grip + light stock. Roughly −25% vertical recoil, −15% horizontal — the biggest single control gain.',
  },
  {
    id: 'i-aim-2',
    level: 'intermediate',
    topic: 'gunplay',
    ru: 'Тренируй «pre-aim»: подходя к углу/двери, держи прицел на уровне головы стоящего противника, а не на полу. Это сокращает TTK на 100-150 мс.',
    en: 'Practice pre-aim: approach corners with the crosshair at standing-head height, not the floor. Cuts your TTK by 100–150 ms.',
  },
  {
    id: 'i-gyro-1',
    level: 'intermediate',
    topic: 'gyro',
    ru: 'Включай гиро только в ADS (целясь). Always-on гиро ломает ходьбу. Начни с 200-220 на Red Dot, 90-120 на 4x.',
    en: 'Enable gyro only when ADS, not always-on (always-on breaks movement). Start ~200–220 on Red Dot, 90–120 on 4x.',
  },
  {
    id: 'i-mov-1',
    level: 'intermediate',
    topic: 'movement',
    ru: 'Освой jiggle peek: tap left → fire 1-2 → release → tap right → fire 1-2. Не задерживайся вылете дольше 0.4 сек.',
    en: 'Master jiggle peek: tap left → 1–2 shots → release → tap right → 1–2 shots. Don\'t expose yourself longer than 0.4 s.',
  },
  {
    id: 'i-snd-1',
    level: 'intermediate',
    topic: 'sound',
    ru: 'Используй мини-карту как радар: красные пули = направление и дистанция. Кружки шагов — пол этажа точно: на втором/первом/над тобой.',
    en: 'Use the minimap as radar: red bullets show direction + distance, footstep rings show floor (above / same / below).',
  },
  {
    id: 'i-rot-1',
    level: 'intermediate',
    topic: 'rotation',
    ru: 'В solo заходи в зону по краю, а не через центр. В squad — наоборот: контролируй компаунд в центре будущей зоны.',
    en: 'Solo: rotate along the zone edge, not through the middle. Squad: hold a central compound inside the next zone.',
  },
  {
    id: 'i-sens-1',
    level: 'intermediate',
    topic: 'sensitivity',
    ru: 'Камера и ADS — РАЗНЫЕ настройки. Камера — для поворота тела/быстрого осмотра, ADS — для мелких корректировок при стрельбе. Не уравнивай их.',
    en: 'Camera and ADS sensitivity are different beasts. Camera = full-body turns and scans, ADS = micro-corrections while firing. Don\'t equalize them.',
  },
  {
    id: 'i-hud-1',
    level: 'intermediate',
    topic: 'hud',
    ru: 'Перейди на claw 3-finger: указательный левой = peek-left/peek-right, указательный правой = огонь. Большие пальцы — движение и прицел.',
    en: 'Move to 3-finger claw: left index = peek L/R, right index = fire. Thumbs handle move + aim.',
  },
  {
    id: 'i-mental-1',
    level: 'intermediate',
    topic: 'mental',
    ru: 'Смотри замедленные повторы своих смертей в реплеях 3-5 раз. Большинство ошибок — позиция, а не прицел.',
    en: 'Re-watch each of your deaths 3–5× in replay. Most mistakes are positional, not aim.',
  },

  // ───────── PRO ─────────
  {
    id: 'p-aim-1',
    level: 'pro',
    topic: 'gunplay',
    ru: 'Spray-control до 30 пуль на M416/AKM требует двухэтапной коррекции: первые 6 — резкое drag вниз, дальше — лёгкое S-образное движение под горизонтальный шейк.',
    en: 'Full-mag spray on M416/AKM needs two phases: first 6 bullets — sharp drag down, then a light S-curve to absorb horizontal shake.',
  },
  {
    id: 'p-gyro-1',
    level: 'pro',
    topic: 'gyro',
    ru: 'Gyro для 6x/8x должен быть в 2-3 раза НИЖЕ, чем для Red Dot. Высокая гиро на дальних прицелах превращает каждый микро-двиг руки в промах.',
    en: 'Gyro for 6x/8x should be 2–3× lower than Red Dot. High gyro on long scopes amplifies every hand micro-twitch into a miss.',
  },
  {
    id: 'p-claw-1',
    level: 'pro',
    topic: 'claw',
    ru: '6-finger: средние пальцы держат peek-left/peek-right, указательные — fire/ADS, большие — movement/aim. Прыжок-присед-стрельба становятся атомарной операцией.',
    en: '6-finger: middle = peek L/R, index = fire/ADS, thumbs = move/aim. Jump-crouch-shoot becomes one atomic action.',
  },
  {
    id: 'p-rot-1',
    level: 'pro',
    topic: 'rotation',
    ru: 'Финальные 2-3 круга — всегда edge-rotation с дымами. Заходи в новую зону через дым (40-50 м между броском и шагом), не открытым полем.',
    en: 'Last 2–3 zones — always edge-rotate with smokes. Enter new zone through smoke (40–50 m between throw and step), never open field.',
  },
  {
    id: 'p-snd-1',
    level: 'pro',
    topic: 'sound',
    ru: 'Тренируй distance audio: M416 на 100 м звучит «короче и резче», на 300 м — «эхо с задержкой». Это даёт точную оценку расстояния по выстрелу.',
    en: 'Train distance audio: M416 at 100 m sounds "short, sharp", at 300 m has a delayed echo. Use it to estimate range from a single shot.',
  },
  {
    id: 'p-mental-1',
    level: 'pro',
    topic: 'mental',
    ru: 'Tilt-management: после двух подряд смертей в одинаковой позиции — выйди из очереди на 5 минут. Эмоциональная игра в PUBGM падает в скилле минимум на 30%.',
    en: 'Tilt management: after two deaths in the same spot, leave the queue for 5 minutes. Tilted play loses ~30% of your real skill.',
  },
  {
    id: 'p-aim-2',
    level: 'pro',
    topic: 'gunplay',
    ru: 'Для shotgun-rush держи S686 как primary, M1014 = backup. Первый выстрел S686 + быстрый switch на secondary даёт стабильно 2 пика урона за 0.6 сек.',
    en: 'For shotgun rushes: S686 primary, M1014 backup. First S686 shell + instant swap to secondary gives two burst peaks in ~0.6 s.',
  },
  {
    id: 'p-sens-1',
    level: 'pro',
    topic: 'sensitivity',
    ru: 'Для close-range fights увеличивай ADS Red Dot до 70-80, но снижай 4x ADS до 30. Это ломает «универсальный пресет», зато выигрывает в bind specifik боях.',
    en: 'For close-range duels push Red Dot ADS to 70–80, but drop 4x ADS to ~30. Breaks "universal" tuning but wins specific fights.',
  },
];

export function tipsFiltered(level: SkillLevel | 'all', topic: TipTopic | 'all') {
  return TIPS.filter(
    (t) => (level === 'all' || t.level === level) && (topic === 'all' || t.topic === topic),
  );
}
