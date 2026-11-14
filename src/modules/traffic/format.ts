const TIME_ZONE = "Asia/Tashkent";

const timeFormatter = new Intl.DateTimeFormat("uz-UZ", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("uz-UZ", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 1000) return "—";
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes} daq ${seconds} s` : `${minutes} daq`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} soat ${rest} daq` : `${hours} soat`;
}

export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "hozir";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} daq oldin`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} soat oldin`;
  return formatDateTime(date);
}

const PATH_LABELS: Record<string, string> = {
  "/": "Bosh sahifa",
  "/login": "Kirish",
  "/register": "Ro'yxatdan o'tish",
  "/dashboard": "Boshqaruv paneli",
  "/schedule": "Dars jadvali",
  "/calendar": "Kalendar",
  "/academic-calendar": "O'quv kalendari",
  "/courses": "Kurslar",
  "/grades": "Baholar",
  "/gpa": "GPA",
  "/transcript": "Transkript",
  "/attendance": "Davomat",
  "/journal": "Jurnal",
  "/journals": "Jurnallar",
  "/exams": "Imtihonlar",
  "/quizzes": "Testlar",
  "/secure-exams": "Xavfsiz imtihonlar",
  "/board": "Onlayn daftar",
  "/labs": "Laboratoriya",
  "/messages": "Xabarlar",
  "/orders": "Buyurtmalar",
  "/bookings": "Band qilishlar",
  "/rooms": "Xonalar",
  "/library": "Kutubxona",
  "/finance": "Moliya",
  "/payroll": "Oylik",
  "/documents": "Hujjatlar",
  "/diplomas": "Diplomlar",
  "/certificates": "Sertifikatlar",
  "/assistant": "Yordamchi",
  "/monitoring": "Monitoring",
  "/reports": "Hisobotlar",
  "/workload": "Yuklama",
  "/admissions": "Qabul",
  "/approvals": "Tasdiqlashlar",
  "/curator": "Tyutor",
  "/nazorat": "Nazorat",
  "/access": "Kirish nazorati",
  "/my-qr": "Mening QR",
  "/settings": "Sozlamalar",
  "/help": "Yordam",
  "/search": "Qidiruv",
  "/bounty": "Bounty",
  "/admin": "Admin panel",
  "/admin/traffic": "Trafik",
  "/admin/users": "Foydalanuvchilar",
  "/admin/groups": "Guruhlar",
  "/admin/courses": "Kurslar (admin)",
  "/admin/audit": "Audit jurnali",
  "/admin/security": "Xavfsizlik",
  "/owner/security": "Xavfsizlik jurnali",
  "/student-preview": "Talaba ko'rinishi",
  "/apply": "Ariza",
};

export function pathLabel(path: string): string {
  return PATH_LABELS[path] ?? path;
}

const SOURCE_RULES: Array<[RegExp, string]> = [
  [/google\./i, "Google"],
  [/yandex\./i, "Yandex"],
  [/bing\./i, "Bing"],
  [/duckduckgo\./i, "DuckDuckGo"],
  [/t\.me|telegram\./i, "Telegram"],
  [/instagram\./i, "Instagram"],
  [/facebook\.|fb\./i, "Facebook"],
  [/youtube\.|youtu\.be/i, "YouTube"],
  [/tiktok\./i, "TikTok"],
  [/linkedin\./i, "LinkedIn"],
  [/chatgpt\.|openai\./i, "ChatGPT"],
  [/perplexity\./i, "Perplexity"],
  [/twitter\.|x\.com/i, "X (Twitter)"],
];

export function referrerSource(referrer: string | null): string {
  if (!referrer) return "To'g'ridan-to'g'ri";
  let host: string;
  try {
    host = new URL(referrer).hostname.replace(/^www\./i, "");
  } catch {
    return referrer.slice(0, 48);
  }
  if (/localhost|127\.0\.0\.1|fbsu|ttpu\.uz/i.test(host)) return "Ichki";
  for (const [pattern, label] of SOURCE_RULES) {
    if (pattern.test(host)) return label;
  }
  return host.slice(0, 48);
}
