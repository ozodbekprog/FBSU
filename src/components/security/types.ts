export type SecurityChangeItem = {
  id: string;
  action: string;
  entity: string | null;
  createdAt: string;
};

export type SecurityDeviceItem = {
  id: string;
  name: string;
  platform: string | null;
  browser: string | null;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  location: string;
  isCurrent: boolean;
};

export type SecurityLoginItem = {
  id: string;
  deviceName: string;
  ip: string;
  location: string;
  method: string;
  status: string;
  createdAt: string;
  note: string | null;
  editedByOwner: boolean;
  changes: SecurityChangeItem[];
};

export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: "Tizimga kirdi",
    LOGIN_FAILED: "Kirish urinishi",
    DEVICE_APPROVAL_REQUEST: "Yangi qurilma uchun Telegram kodi yuborildi",
    DEVICE_APPROVAL_VERIFIED: "Qurilma tasdiqlash kodi qabul qilindi",
    DEVICE_APPROVAL_FAILED: "Qurilma tasdiqlash kodi xato",
    DEVICE_APPROVAL_SUCCESS: "Yangi qurilma tasdiqlandi",
    LOGOUT: "Tizimdan chiqdi",
    REGISTER: "Ro'yxatdan o'tdi",
    PASSWORD_CHANGE: "Parol o'zgartirildi",
    PASSWORD_RESET_REQUEST: "Parol tiklash so'rovi",
    PASSWORD_RESET_SUCCESS: "Parol tiklandi",
    USER_UPDATE: "Profil ma'lumoti o'zgartirildi",
    USER_CREATE: "Foydalanuvchi yaratildi",
    USER_DELETE: "Foydalanuvchi o'chirildi",
    ROLE_CHANGE: "Rol o'zgartirildi",
    SESSION_REVOKED: "Sessiya/qurilma uzildi",
    SETTINGS_CHANGE: "Sozlamalar o'zgartirildi",
    FILE_UPLOAD: "Fayl yuklandi",
    FILE_DOWNLOAD: "Fayl yuklab olindi",
    BUG_REPORTED: "Xatolik xabar qilindi",
    SALARY_CREATE: "Oylik yozuvi yaratildi",
    SALARY_UPDATE: "Oylik yozuvi o'zgartirildi",
    SALARY_STATUS_CHANGE: "Oylik holati o'zgartirildi",
    SALARY_DELETE: "Oylik yozuvi o'chirildi",
    COURSE_CREATE: "Kurs yaratildi",
    ANNOUNCEMENT_CREATE: "E'lon yaratildi",
    ANNOUNCEMENT_DELETE: "E'lon o'chirildi",
  };
  return labels[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export type AdminUserRef = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AdminLoginItem = {
  id: string;
  user: AdminUserRef;
  deviceName: string;
  ip: string;
  location: string;
  method: string;
  status: string;
  createdAt: string;
  note: string | null;
  deletedAt: string | null;
  deviceRevoked: boolean;
  changes: number;
  changeList: SecurityChangeItem[];
};

export type AdminDeviceItem = {
  id: string;
  user: AdminUserRef;
  name: string;
  platform: string | null;
  browser: string | null;
  lastSeenAt: string;
  ip: string | null;
  location: string;
};
