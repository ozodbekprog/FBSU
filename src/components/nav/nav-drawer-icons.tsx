import type { ReactNode } from "react";

/**
 * Mobil drawer (yorug'likdagi menyu) uchun 2D ikonkalar.
 *
 * Desktop'da 3D WebGL ikonkalar ishlaydi, lekin mobil'da WebGL yuklanmaydi —
 * shuning uchun bu yerdan oddiy chiziqli SVG ishlatiladi (TAB_ICONS uslubida).
 * Avvalgi versiya `size-1.5` nuqta chizardi, shuning uchun ikonkalar
 * telefon ekranida ko'rinmasdi.
 *
 * Barchasi 24×24 viewBox, `currentColor` stroke.
 */
const S: Record<string, ReactNode> = {
"/dashboard": (
    <>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
"/courses": (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
"/board": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8h8M8 12h5M8 16h3" />
      <path d="m16.5 15.5 3 3" />
    </>
  ),
"/labs": (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6L5.5 17A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 9V3" />
      <path d="M7.5 14h9" />
    </>
  ),
"/catalog": (
    <>
      <path d="M4 7V5a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v3" />
      <path d="M4 7h16l-1.5 12a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8z" />
      <path d="M9 12v4M15 12v4" />
    </>
  ),
"/electives": (
    <>
      <path d="M12 3 3 8l9 5 9-5z" />
      <path d="M3 14l9 5 9-5" />
    </>
  ),
"/schedule": (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 15h3M8 18h6" />
    </>
  ),
"/calendar": (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="12" cy="15" r="2.5" />
      <path d="M12 13.5V15l1.2 1" />
    </>
  ),
"/academic-calendar": (
    <>
      <path d="M3 8 12 4l9 4-9 4z" />
      <path d="M7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5" />
      <path d="M21 8v6" />
    </>
  ),
"/exams": (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
"/grades": (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </>
  ),
"/gpa": (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      <circle cx="16" cy="8" r="2" />
    </>
  ),
"/transcript": (
    <>
      <path d="M6 2h9l4 4v16H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
      <path d="M14 2v5h5" />
      <path d="M9 12h6M9 16h6" />
      <circle cx="17.5" cy="17.5" r="3" />
    </>
  ),
"/attendance": (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
"/journal": (
    <>
      <path d="M4 4a2 2 0 0 1 2-2h12v20H6a2 2 0 0 1-2-2z" />
      <path d="M8 2v20" />
      <path d="M12 8h4M12 12h4" />
    </>
  ),
"/journals": (
    <>
      <rect x="3" y="4" width="14" height="16" rx="2" />
      <path d="M7 2v18" />
      <path d="M19 8v12M21 10v8" />
    </>
  ),
"/question-bank": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
      <path d="M12 17h.01" />
    </>
  ),
"/messages": (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3.5A8 8 0 1 1 21 12z" />
      <path d="M9 11h6M9 14h4" />
    </>
  ),
"/orders": (
    <>
      <path d="M6 2h12l2 5H4z" />
      <path d="M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7" />
      <path d="M9 11h6" />
    </>
  ),
"/bookings": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
"/rooms": (
    <>
      <path d="M4 21V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15" />
      <path d="M13 10h5a2 2 0 0 1 2 2v9" />
      <path d="M3 21h18" />
      <path d="M7 9h2M7 13h2M7 17h2" />
    </>
  ),
"/search": (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.3-4.3" />
    </>
  ),
"/help": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
      <path d="M12 17h.01" />
    </>
  ),
"/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M22 12h-3M5 12H2M18.4 5.6 16.2 7.8M7.8 16.2l-2.2 2.2M18.4 18.4l-2.2-2.2M7.8 7.8 5.6 5.6" />
    </>
  ),
"/curator": (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <path d="M17 11h4M19 9v4" />
    </>
  ),
"/reports": (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
"/workload": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
"/admin": (
    <>
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
"/approvals": (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
"/monitoring": (
    <>
      <path d="M2 12h4l2-6 4 12 3-9 2 3h5" />
    </>
  ),
"/staff": (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <path d="M17 9a2.5 2.5 0 1 0 0-5" />
      <path d="M18 14a4 4 0 0 1 3 4v2" />
    </>
  ),
"/tasks": (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 9 1.5 1.5L12 8" />
      <path d="M14 10h4M8 15h10" />
    </>
  ),
"/my-qr": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2" />
    </>
  ),
"/access": (
    <>
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7 5 12M12 7l7 5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
"/documents": (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h5l2 3h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
"/diplomas": (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5" />
    </>
  ),
"/finance": (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <circle cx="12" cy="12.5" r="2.5" />
      <path d="M6 10v.01M18 15v.01" />
    </>
  ),
"/payroll": (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M12 15h.01M15.5 15h.01" />
      <path d="M8.5 19h3" />
    </>
  ),
"/parent": (
    <>
      <circle cx="8" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 4 3" />
      <path d="M15 15.5a4 4 0 0 1 7 2.9V20" />
    </>
  ),
"/certificates": (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5" />
    </>
  ),
};

/** Berilgan href uchun drawer ikonkasi (yo'q bo'lsa `null`). */
export function drawerIcon(href: string): ReactNode | null {
  const exact = S[href];
  if (exact) return exact;

  // Ichki sahifalar uchun asosiy bo'lim ikonkasini olamiz:
  // /courses/abc -> courses
  let best: ReactNode | null = null;
  let bestLength = -1;
  for (const key of Object.keys(S)) {
    if (href.startsWith(`${key}/`) && key.length > bestLength) {
      best = S[key];
      bestLength = key.length;
    }
  }
  return best;
}
