// Map drop suggestions. The toolkit doesn't render full battle-royale maps;
// instead it surfaces curated drop spots with risk vs loot tier metadata.

export type LootTier = 'low' | 'mid' | 'high' | 'top';
export type RiskTier = 'low' | 'mid' | 'high';

export interface DropSpot {
  id: string;
  map: 'Erangel' | 'Miramar' | 'Sanhok' | 'Livik' | 'Vikendi' | 'Karakin';
  name: string;
  loot: LootTier;
  risk: RiskTier;
  notes: string;
}

export const DROP_SPOTS: DropSpot[] = [
  // Erangel
  { id: 'erangel-pochinki', map: 'Erangel', name: 'Pochinki', loot: 'high', risk: 'high', notes: 'Центральный город, всегда людно. Хороший лут, но почти всегда драка.' },
  { id: 'erangel-school', map: 'Erangel', name: 'School', loot: 'high', risk: 'high', notes: 'Hot drop. 2–3 этажа лута, ротация на госпиталь и Pochinki.' },
  { id: 'erangel-georgopol', map: 'Erangel', name: 'Georgopol', loot: 'top', risk: 'high', notes: 'Контейнеры + Crate cars. Лучший лут на карте, но шумно.' },
  { id: 'erangel-mil', map: 'Erangel', name: 'Military Base', loot: 'top', risk: 'high', notes: 'Лучший лут острова, но мост — узкое место для ротации.' },
  { id: 'erangel-novorepnoye', map: 'Erangel', name: 'Novorepnoye', loot: 'high', risk: 'mid', notes: 'Мини-казармы + порт. Стабильный мид-тир лут.' },
  { id: 'erangel-mylta', map: 'Erangel', name: 'Mylta', loot: 'mid', risk: 'low', notes: 'Тихий спот. Хорош для медленной игры и собирания комплекта.' },
  { id: 'erangel-zharki', map: 'Erangel', name: 'Zharki', loot: 'mid', risk: 'low', notes: 'Север, мало людей. Безопасно, но дальние ротации.' },

  // Miramar
  { id: 'miramar-hacienda', map: 'Miramar', name: 'Hacienda del Patron', loot: 'top', risk: 'high', notes: 'Элитный лут. Высота — преимущество, но сложно выбраться без машины.' },
  { id: 'miramar-pecado', map: 'Miramar', name: 'Pecado', loot: 'high', risk: 'high', notes: 'Боксёрский ринг + казино. Hot drop с горизонтальной разметкой.' },
  { id: 'miramar-losleones', map: 'Miramar', name: 'Los Leones', loot: 'high', risk: 'mid', notes: 'Большой город, можно растянуться по углам.' },
  { id: 'miramar-elpozo', map: 'Miramar', name: 'El Pozo', loot: 'high', risk: 'mid', notes: 'Стадион + тако. Удобный для clutches.' },
  { id: 'miramar-watertreatment', map: 'Miramar', name: 'Water Treatment', loot: 'mid', risk: 'low', notes: 'Тихий, средний лут.' },

  // Sanhok
  { id: 'sanhok-paradise', map: 'Sanhok', name: 'Paradise Resort', loot: 'top', risk: 'high', notes: 'Лучший лут Sanhok. Hot drop, иди только если уверен.' },
  { id: 'sanhok-bootcamp', map: 'Sanhok', name: 'Bootcamp', loot: 'top', risk: 'high', notes: 'Военный комплекс в центре карты. Всегда драка.' },
  { id: 'sanhok-ruins', map: 'Sanhok', name: 'Ruins', loot: 'high', risk: 'mid', notes: 'Открытая площадка с лутом — позиционная игра.' },
  { id: 'sanhok-pailan', map: 'Sanhok', name: 'Pai Nan', loot: 'high', risk: 'mid', notes: 'Город с водными ротациями.' },
  { id: 'sanhok-camphugo', map: 'Sanhok', name: 'Camp Charlie', loot: 'mid', risk: 'low', notes: 'Лагерь сбоку. Безопасный заход.' },

  // Livik
  { id: 'livik-aqueduct', map: 'Livik', name: 'Aqueduct', loot: 'high', risk: 'high', notes: 'Мост + дома. Hot drop из-за центральной позиции.' },
  { id: 'livik-power', map: 'Livik', name: 'Power Plant', loot: 'high', risk: 'mid', notes: 'Хорошие кабели/контейнеры.' },
  { id: 'livik-blomster', map: 'Livik', name: 'Blomster', loot: 'mid', risk: 'low', notes: 'Тихий городок, безопасно.' },
];

export function spotsByMap(
  map: DropSpot['map'],
): DropSpot[] {
  return DROP_SPOTS.filter((s) => s.map === map);
}
