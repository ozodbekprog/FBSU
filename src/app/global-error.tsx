"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f7fa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            padding: "40px 24px",
            background: "#ffffff",
            borderRadius: 20,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 28px -14px rgba(29,52,96,0.14)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 12px",
              borderRadius: "50%",
              background: "#fff1f2",
              color: "#e11d48",
              fontSize: 24,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            !
          </div>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
            Nimadir xato ketdi
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>
            Sahifani yuklashda kutilmagan xatolik yuz berdi. Qayta urinib
            ko&apos;ring.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              background: "#1d3460",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
