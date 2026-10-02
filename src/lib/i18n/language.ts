/** Language screen. Keys: language.* */
export const en = {
  "language.change": "Change language",
  "language.title": "Language",
  "language.heading": "Choose Language",
  "language.hint": "The language changes across the whole app. You can come back here and change it at any time.",
  "language.searchLabel": "Search languages",
  "language.searchPlaceholder": "Search",
  "language.noResults": "No languages found",
  "language.confirm": "Confirm",
  "language.soon": "Soon",
  "language.unavailable": "{name} isn't available yet. The app is fully translated into English and Russian.",
  "language.applied": "Language updated",
} as const;

export const ru: Record<keyof typeof en, string> = {
  "language.change": "Сменить язык",
  "language.title": "Язык",
  "language.heading": "Выберите язык",
  "language.hint": "Язык изменится во всём приложении. Вы можете вернуться сюда и изменить его в любое время.",
  "language.searchLabel": "Поиск языка",
  "language.searchPlaceholder": "Поиск",
  "language.noResults": "Языки не найдены",
  "language.confirm": "Подтвердить",
  "language.soon": "Скоро",
  "language.unavailable": "{name} пока недоступен. Приложение полностью переведено на английский и русский.",
  "language.applied": "Язык обновлён",
};
