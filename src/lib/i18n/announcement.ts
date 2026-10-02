/** Announcement modal. Keys: announcement.* */
export const en = {
  "announcement.title": "Announcements",
  "announcement.headline": "New-user offer: {amount} USDT trial voucher",
  "announcement.body": "Register to receive a {amount} USDT trial voucher. It can be used to start your first compute node and can't be withdrawn.",
  "announcement.demo": "Demo build: balances are simulated.",
  "announcement.expand": "Expand",
  "announcement.collapse": "Collapse",
  "announcement.details": "Details",
  "announcement.close": "Close announcement",
  "announcement.reason": "Create an account to claim your {amount} USDT trial voucher",
} as const;

export const ru: Record<keyof typeof en, string> = {
  "announcement.title": "Объявления",
  "announcement.headline": "Предложение для новых пользователей: пробный ваучер {amount} USDT",
  "announcement.body": "Зарегистрируйтесь, чтобы получить пробный ваучер {amount} USDT. Его можно потратить на запуск первого вычислительного узла, но нельзя вывести.",
  "announcement.demo": "Демо-сборка: балансы симулируются.",
  "announcement.expand": "Развернуть",
  "announcement.collapse": "Свернуть",
  "announcement.details": "Подробнее",
  "announcement.close": "Закрыть объявление",
  "announcement.reason": "Создайте аккаунт, чтобы получить пробный ваучер {amount} USDT",
};
