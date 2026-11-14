"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { CheckInForm } from "@/components/attendance/check-in-form";

export function FocusActions({
  href,
  scanLabel,
  lessonLabel,
  closeLabel,
  faceEnrolled,
}: {
  href: string;
  scanLabel: string;
  lessonLabel: string;
  closeLabel: string;
  faceEnrolled: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="fb-join-row">
        <button
          type="button"
          className="fb-join-btn"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01M17.5 21v.01M21 17.5v.01" />
          </svg>
          {scanLabel}
        </button>
        <Link className="fb-join-btn ghost" href={href}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23" />
            <path d="M8 7h8M8 11h6" />
          </svg>
          {lessonLabel}
        </Link>
      </div>
      {open
        ? createPortal(
            <div className="fb-qr-dialog" role="dialog" aria-modal="true" aria-label={scanLabel}>
              <button
                type="button"
                className="fb-qr-dialog-backdrop"
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
              />
              <div className="fb-qr-panel">
                <div className="fb-qr-panel-head">
                  <b>{scanLabel}</b>
                  <button
                    type="button"
                    className="fb-qr-panel-close"
                    aria-label={closeLabel}
                    onClick={() => setOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                <CheckInForm autoScan faceEnrolled={faceEnrolled} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
