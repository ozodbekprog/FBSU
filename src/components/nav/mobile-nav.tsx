"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/use-is-client";
import type { NavGroup } from "@/app/(app)/nav-links";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { LogoutForm } from "@/components/auth/logout-form";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { drawerIcon } from "@/components/nav/nav-drawer-icons";
import { cn } from "@/lib/utils";

function MenuIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      className={cn(
        "fb-drawer-scope fixed inset-0 z-50 md:hidden",
        open ? "" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t("shellMenuClose")}
        onClick={() => setOpen(false)}
        className={cn("fb-drawer-backdrop", open && "is-open")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("shellMobileNav")}
        className={cn("fb-drawer", open && "is-open")}
      >
        <div className="fb-drawer-head">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="fb-side-brand">
            <img src="/logo.svg" alt="FBSU" width={28} height={28} />
            <span className="fb-side-name">
              <b>FBSU</b>
              <small>TURIN POLYTECHNIC</small>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("shellMenuClose")}
            className="fb-iconbtn"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="fb-drawer-nav">
          {groups.map((group) => (
            <div key={group.label} className="fb-drawer-group">
              <p className="fb-drawer-label">{group.label}</p>
              {group.links.map((l) => {
                const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
                const icon = drawerIcon(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn("fb-drawer-link", active && "active")}
                  >
                    {icon ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {icon}
                      </svg>
                    ) : (
                      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-40" />
                    )}
                    <span className="whitespace-nowrap">{l.label}</span>
                    {l.badge ? <span className="fb-drawer-badge">{l.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="fb-drawer-foot">
          <LanguageSwitcher locale={locale} className="self-center" />
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
        className="fb-iconbtn shrink-0"
      >
        <MenuIcon />
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
