/**
 * `beforeinstallprompt` hodisasi faqat bir marta otiladi — uni ushlab qolish
 * uchun umumiy saqlagich. PwaRegister (banner) va AppInstallButton (tugma)
 * shu store orqali bitta event'ni bo'lishadi: qaysi komponent ulgursa ham,
 * natija hammaga yetib boradi.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(event: BeforeInstallPromptEvent | null) => void>();

export function setDeferredInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  deferred = event;
  listeners.forEach((listener) => listener(event));
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeDeferredInstallPrompt(
  listener: (event: BeforeInstallPromptEvent | null) => void,
): () => void {
  listeners.add(listener);
  listener(deferred);
  return () => {
    listeners.delete(listener);
  };
}
