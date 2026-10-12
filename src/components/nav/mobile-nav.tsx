"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import type { NavGroup } from "@/app/(app)/nav-links";
import { Logo } from "@/components/brand/logo";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { LogoutForm } from "@/components/auth/logout-form";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { drawerIcon } from "@/components/nav/nav-drawer-icons";
import { cn } from "@/lib/utils";

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const mounted = useIsClient();
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const drawer = (
    <div
      className={cn("fixed inset-0 z-50 md:hidden", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t("shellMenuClose")}
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("shellMobileNav")}
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-[86vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-3">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="px-1 transition-opacity hover:opacity-80"
          >
            <Logo size={28} />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("shellMenuClose")}
            className="relative inline-flex size-9 items-center justify-center rounded-xl text-slate-500 transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-brand-50 hover:text-brand-900"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.links.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                  const icon = drawerIcon(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-900 text-white shadow-[0_6px_16px_-8px_rgba(29,52,96,0.7)]"
                          : "text-slate-600 hover:bg-brand-50 hover:text-brand-900",
                      )}
                    >
                      {/* Avval `size-1.5` nuqta chizilardi — telefon ekranida
                          ko'rinmasdi. Endi haqiqiy ikonka (2D chiziqli). */}
                      {icon ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className={cn(
                            "size-5 shrink-0",
                            active ? "text-gold-300" : "text-slate-400",
                          )}
                        >
                          {icon}
                        </svg>
                      ) : (
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            active ? "bg-gold-400" : "bg-slate-300",
                          )}
                        />
                      )}
                      <span className="whitespace-nowrap">{l.label}</span>
                      {l.badge ? <span className="ml-auto flex items-center">{l.badge}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-slate-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* Telefonda til almashtirish imkoniyati yo'q edi: desktop'da til
              tugmasi sidebar poyida, mobil'da esa drawer'da umuman
              ko'rsatilmagan. Endi chiqish tugmasi ustida joylashadi. */}
          <div className="mb-3 flex justify-center">
            <LanguageSwitcher locale={locale} />
          </div>
          <LogoutForm />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("shellMenuOpen")}
        aria-expanded={open}
        // `size-9` (36px) barmoq uchun kichik. `after:-inset-1` ko'rinadigan
        // o'lchamni o'zgartirmasdan bosish maydonini 44px gacha kengaytiradi —
        // boshqa sarlavha tugmalari ham shu usulda qilingan.
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-brand-50 hover:text-brand-900"
      >
        <MenuIcon />
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
