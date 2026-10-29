import { toCyrillic, toNewAlphabet } from "@/i18n/translit";
import type { Locale } from "@/i18n";

export type SecurityMessages = {
  title: string;
  subtitle: string;
  devicesTitle: string;
  devicesHint: string;
  slots: string;
  slotsFull: string;
  current: string;
  lastSeen: string;
  ip: string;
  location: string;
  renaming: string;
  rename: string;
  save: string;
  cancel: string;
  revoke: string;
  revokeConfirm: string;
  revokeCurrent: string;
  noDevices: string;
  historyTitle: string;
  historyHint: string;
  noHistory: string;
  device: string;
  method: string;
  status: string;
  changes: string;
  noChanges: string;
  success: string;
  blocked: string;
  methodPASSWORD: string;
  methodPASSKEY: string;
  methodOWNER: string;
  methodREGISTER: string;
  methodTELEGRAM: string;
  note: string;
  editedByOwner: string;
  ownerTitle: string;
  ownerSubtitle: string;
  ownerStatsUsers: string;
  ownerStatsDevices: string;
  ownerStatsLogins: string;
  ownerStatsBlocked: string;
  filterPlaceholder: string;
  filter: string;
  showDeleted: string;
  hideDeleted: string;
  clear: string;
  user: string;
  actions: string;
  edit: string;
  delete: string;
  restore: string;
  deleted: string;
  revokedDevice: string;
  deviceName: string;
  noteLabel: string;
  ownerDevicesTitle: string;
  ownerDevicesHint: string;
  revokeDevice: string;
  restored: string;
  deletedToast: string;
  saved: string;
  failed: string;
  limitNotice: string;
  loginWarning: string;
  historyCount: string;
  page: string;
  prev: string;
  next: string;
};

const uz: SecurityMessages = {
  title: "Akkaunt xavfsizligi",
  subtitle: "Qurilmalar, kirish tarixi va sessiyadagi o'zgarishlar",
  devicesTitle: "Ulangan qurilmalar",
  devicesHint:
    "Hisobingizga bir vaqtda faqat 2 ta qurilma ulanishi mumkin. Uchinchi qurilma Telegramga kelgan kod bilan tasdiqlanadi va eski qurilmalardan biri uziladi.",
  slots: "{used}/2 qurilma ulangan",
  slotsFull: "Limiti to'lgan — yangi qurilma kirishi uchun joy yo'q",
  current: "Shu qurilma",
  lastSeen: "Oxirgi faol",
  ip: "IP manzil",
  location: "Joylashuv",
  renaming: "Nomi",
  rename: "Nomini o'zgartirish",
  save: "Saqlash",
  cancel: "Bekor qilish",
  revoke: "Uzish",
  revokeConfirm: "Bu qurilmani uzasizmi? Undan ochilgan sessiya darhol yopiladi.",
  revokeCurrent: "Bu siz ishlatayotgan qurilma. Uzsangiz tizimdan chiqasiz.",
  noDevices: "Hozircha qurilma ulanmagan",
  historyTitle: "Kirish tarixi",
  historyHint: "Oxirgi 100 ta kirish: qurilma, IP, joylashuv va sessiyada qilingan o'zgarishlar",
  noHistory: "Kirish tarixi bo'sh",
  device: "Qurilma",
  method: "Usul",
  status: "Holat",
  changes: "O'zgarishlar",
  noChanges: "Bu sessiyada o'zgarish qayd etilmagan",
  success: "Muvaffaqiyatli",
  blocked: "Bloklangan",
  methodPASSWORD: "Parol",
  methodPASSKEY: "Passkey",
  methodOWNER: "OWNER 2FA",
  methodREGISTER: "Ro'yxatdan o'tish",
  methodTELEGRAM: "Telegram",
  note: "Izoh",
  editedByOwner: "OWNER tahrirlagan",
  ownerTitle: "Xavfsizlik jurnali",
  ownerSubtitle: "Barcha akkauntlar bo'yicha kirishlar va qurilmalar",
  ownerStatsUsers: "Foydalanuvchilar",
  ownerStatsDevices: "Faol qurilmalar",
  ownerStatsLogins: "Kirishlar (24 soat)",
  ownerStatsBlocked: "Bloklangan (24 soat)",
  filterPlaceholder: "Email yoki ism bo'yicha qidirish",
  filter: "Filtrlash",
  showDeleted: "O'chirilganlarni ko'rsatish",
  hideDeleted: "O'chirilganlarni yashirish",
  clear: "Tozalash",
  user: "Foydalanuvchi",
  actions: "Amallar",
  edit: "Tahrirlash",
  delete: "O'chirish",
  restore: "Tiklash",
  deleted: "O'chirilgan",
  revokedDevice: "Qurilma uzilgan",
  deviceName: "Qurilma nomi",
  noteLabel: "Izoh (ixtiyoriy)",
  ownerDevicesTitle: "Faol qurilmalar",
  ownerDevicesHint: "Kerak bo'lsa qurilmani uzib, foydalanuvchiga yangi qurilma uchun joy bo'shating.",
  revokeDevice: "Uzish",
  restored: "Tiklandi",
  deletedToast: "O'chirildi",
  saved: "Saqlandi",
  failed: "Amal bajarilmadi",
  limitNotice: "Qurilma limiti: 2 ta",
  loginWarning: "Har bir kirish IP, qurilma va joylashuv bilan yozib boriladi.",
  historyCount: "{total} ta yozuv",
  page: "Sahifa",
  prev: "Oldingi",
  next: "Keyingi",
};

const ru: SecurityMessages = {
  ...uz,
  title: "Безопасность аккаунта",
  subtitle: "Устройства, история входов и изменения в сессии",
  devicesTitle: "Подключённые устройства",
  devicesHint:
    "К аккаунту одновременно можно подключить только 2 устройства. Третье устройство подтверждается кодом в Telegram, после чего одно из старых отключается.",
  slots: "{used}/2 устройства подключено",
  slotsFull: "Лимит исчерпан — для нового устройства нет места",
  current: "Это устройство",
  lastSeen: "Последняя активность",
  ip: "IP-адрес",
  location: "Местоположение",
  renaming: "Название",
  rename: "Переименовать",
  save: "Сохранить",
  cancel: "Отмена",
  revoke: "Отключить",
  revokeConfirm: "Отключить это устройство? Его сессия будет сразу завершена.",
  revokeCurrent: "Это устройство, с которого вы сейчас работаете. После отключения вы выйдете из системы.",
  noDevices: "Пока нет подключённых устройств",
  historyTitle: "История входов",
  historyHint: "Последние 100 входов: устройство, IP, местоположение и изменения в сессии",
  noHistory: "История входов пуста",
  device: "Устройство",
  method: "Способ",
  status: "Статус",
  changes: "Изменения",
  noChanges: "В этой сессии изменений не зафиксировано",
  success: "Успешно",
  blocked: "Заблокировано",
  methodPASSWORD: "Пароль",
  methodPASSKEY: "Passkey",
  methodOWNER: "OWNER 2FA",
  methodREGISTER: "Регистрация",
  methodTELEGRAM: "Telegram",
  note: "Примечание",
  editedByOwner: "Изменено OWNER",
  ownerTitle: "Журнал безопасности",
  ownerSubtitle: "Входы и устройства по всем аккаунтам",
  ownerStatsUsers: "Пользователи",
  ownerStatsDevices: "Активные устройства",
  ownerStatsLogins: "Входы (24 часа)",
  ownerStatsBlocked: "Заблокировано (24 часа)",
  filterPlaceholder: "Поиск по email или имени",
  filter: "Фильтровать",
  showDeleted: "Показать удалённые",
  hideDeleted: "Скрыть удалённые",
  clear: "Сбросить",
  user: "Пользователь",
  actions: "Действия",
  edit: "Изменить",
  delete: "Удалить",
  restore: "Восстановить",
  deleted: "Удалено",
  revokedDevice: "Устройство отключено",
  deviceName: "Название устройства",
  noteLabel: "Примечание (необязательно)",
  ownerDevicesTitle: "Активные устройства",
  ownerDevicesHint: "При необходимости отключите устройство, чтобы освободить место.",
  revokeDevice: "Отключить",
  restored: "Восстановлено",
  deletedToast: "Удалено",
  saved: "Сохранено",
  failed: "Не удалось выполнить",
  limitNotice: "Лимит устройств: 2",
  loginWarning: "Каждый вход фиксируется с IP, устройством и местоположением.",
  historyCount: "Записей: {total}",
  page: "Страница",
  prev: "Назад",
  next: "Вперёд",
};

const en: SecurityMessages = {
  ...uz,
  title: "Account security",
  subtitle: "Devices, sign-in history and session changes",
  devicesTitle: "Connected devices",
  devicesHint:
    "Only 2 devices can be connected to your account at a time. A third device is verified with a Telegram code, then one of the old devices is disconnected.",
  slots: "{used}/2 devices connected",
  slotsFull: "Limit reached — no slot for a new device",
  current: "This device",
  lastSeen: "Last active",
  ip: "IP address",
  location: "Location",
  renaming: "Name",
  rename: "Rename",
  save: "Save",
  cancel: "Cancel",
  revoke: "Disconnect",
  revokeConfirm: "Disconnect this device? Its session will end immediately.",
  revokeCurrent: "This is the device you are using now. Disconnecting it will sign you out.",
  noDevices: "No devices connected yet",
  historyTitle: "Sign-in history",
  historyHint: "Last 100 sign-ins: device, IP, location and changes made in the session",
  noHistory: "No sign-in history yet",
  device: "Device",
  method: "Method",
  status: "Status",
  changes: "Changes",
  noChanges: "No changes recorded in this session",
  success: "Success",
  blocked: "Blocked",
  methodPASSWORD: "Password",
  methodPASSKEY: "Passkey",
  methodOWNER: "OWNER 2FA",
  methodREGISTER: "Registration",
  methodTELEGRAM: "Telegram",
  note: "Note",
  editedByOwner: "Edited by OWNER",
  ownerTitle: "Security log",
  ownerSubtitle: "Sign-ins and devices across all accounts",
  ownerStatsUsers: "Users",
  ownerStatsDevices: "Active devices",
  ownerStatsLogins: "Sign-ins (24h)",
  ownerStatsBlocked: "Blocked (24h)",
  filterPlaceholder: "Search by email or name",
  filter: "Filter",
  showDeleted: "Show deleted",
  hideDeleted: "Hide deleted",
  clear: "Clear",
  user: "User",
  actions: "Actions",
  edit: "Edit",
  delete: "Delete",
  restore: "Restore",
  deleted: "Deleted",
  revokedDevice: "Device disconnected",
  deviceName: "Device name",
  noteLabel: "Note (optional)",
  ownerDevicesTitle: "Active devices",
  ownerDevicesHint: "Disconnect a device to free a slot for the user.",
  revokeDevice: "Disconnect",
  restored: "Restored",
  deletedToast: "Deleted",
  saved: "Saved",
  failed: "Action failed",
  limitNotice: "Device limit: 2",
  loginWarning: "Every sign-in is recorded with IP, device and location.",
  historyCount: "{total} records",
  page: "Page",
  prev: "Previous",
  next: "Next",
};

export function securityMessages(locale: Locale): SecurityMessages {
  if (locale === "ru") return ru;
  if (locale === "en") return en;
  if (locale === "uz-cyrl") return transform(uz, toCyrillic);
  if (locale === "uz-new") return transform(uz, toNewAlphabet);
  return uz;
}

function transform(source: SecurityMessages, fn: (text: string) => string): SecurityMessages {
  const result = {} as SecurityMessages;
  for (const key of Object.keys(source) as (keyof SecurityMessages)[]) {
    result[key] = fn(source[key]);
  }
  return result;
}

export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}
