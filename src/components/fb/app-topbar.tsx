"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useI18n } from "@/components/i18n/LocaleProvider";

type TopbarItem = { href: string; label: string };

export function AppTopbar({
  name,
  avatarUrl,
  roleLabel,
  scopeLabel,
  items,
}: {
  name: string;
  avatarUrl?: string | null;
  roleLabel: string;
  scopeLabel: string;
  items: TopbarItem[];
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current =
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? t("navDashboard");

  return (
    <header className="fb-topbar">
      <div className="fb-crumbs">
        <span>{scopeLabel}</span>
        <i>/</i>
        <b>{current}</b>
      </div>

      <form className="fb-tsearch" action="/search" method="get" role="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={searchRef}
          type="search"
          name="q"
          placeholder={t("fbdSearch")}
          aria-label={t("fbdSearch")}
          autoComplete="off"
        />
        <kbd>⌘K</kbd>
      </form>

      <div className="fb-tools">
        <Link className="fb-tool" href="/help" aria-label={t("navHelp")} title={t("navHelp")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
            <path d="M12 17h.01" />
          </svg>
        </Link>
        <NotificationBell align="right" />
        <ThemeToggle />
      </div>

      <Link href="/profile" className="fb-tuser">
        <Avatar name={name} src={avatarUrl} size={30} />
        <span>
          <b>{name}</b>
          <small>{roleLabel}</small>
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Link>
    </header>
  );
}
