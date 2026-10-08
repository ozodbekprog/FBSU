"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { fmtDate } from "@/lib/utils";

export type GradeTrendDetail = {
  title: string;
  course: string;
  kind: "assignment" | "quiz";
  score: number;
  max: number;
  at: string;
  feedback: string | null;
};

export type GradeTrendItem = {
  label: string;
  value: number;
  detail: GradeTrendDetail;
};

const WIDTH = 560;
const PAD = { top: 18, right: 20, bottom: 24, left: 30 };

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function niceScale(values: number[]) {
  const max = Math.min(100, Math.max(...values, 1));
  const min = Math.max(0, Math.min(...values));
  const top = max >= 95 ? 100 : Math.min(100, Math.ceil((max + 4) / 10) * 10);
  let floor = min >= 50 ? Math.max(0, Math.floor((min - 6) / 10) * 10) : 0;
  if (top - floor < 20) floor = Math.max(0, top - 20);
  return { floor, top };
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];
    const c1x = current.x + (next.x - previous.x) / 6;
    const c1y = current.y + (next.y - previous.y) / 6;
    const c2x = next.x - (after.x - current.x) / 6;
    const c2y = next.y - (after.y - current.y) / 6;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function GradeTrendChart({
  data,
  height = 170,
}: {
  data: GradeTrendItem[];
  height?: number;
}) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  if (data.length === 0) {
    return null;
  }

  const values = data.map((item) => clamp(item.value));
  const { floor, top } = niceScale(values);
  const span = Math.max(1, top - floor);

  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = height - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerHeight;
  const denominator = Math.max(1, data.length - 1);

  const yFor = (value: number) => PAD.top + innerHeight - ((clamp(value) - floor) / span) * innerHeight;

  const points = data.map((item, index) => ({
    x: data.length === 1 ? PAD.left + innerWidth / 2 : PAD.left + (innerWidth * index) / denominator,
    y: yFor(item.value),
    label: item.label,
    value: Math.round(item.value),
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
  const labelInterval = Math.max(1, Math.ceil(data.length / 6));
  const lastPoint = points[points.length - 1];
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const averageY = yFor(average);

  const ticks: number[] = [];
  for (let index = 0; index <= 3; index += 1) {
    ticks.push(Math.round(floor + (span * index) / 3));
  }

  const active = hovered ?? selected;
  const activePoint = active != null ? points[active] : null;

  const selectedItem = selected != null ? data[selected] : null;
  const previousValue = selected != null && selected > 0 ? data[selected - 1].value : null;
  const delta = selectedItem && previousValue != null ? selectedItem.value - previousValue : null;

  const tooltipWidth = 132;
  const tooltipX = activePoint
    ? Math.min(Math.max(activePoint.x - tooltipWidth / 2, 4), WIDTH - tooltipWidth - 4)
    : 0;
  const tooltipY = activePoint ? Math.max(activePoint.y - 34, 2) : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img">
        <defs>
          <linearGradient id="gt-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5373b8" stopOpacity="0.32" />
            <stop offset="65%" stopColor="#5373b8" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#5373b8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gt-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1d3460" />
            <stop offset="55%" stopColor="#5373b8" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          <radialGradient id="gt-glow">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </radialGradient>
        </defs>

        {ticks.map((tick, tickIndex) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className="animate-fade-in stroke-slate-200"
              strokeWidth={1}
              strokeDasharray="3 5"
              style={{ animationDelay: `${tickIndex * 50}ms` }}
            />
            <text
              x={PAD.left - 6}
              y={yFor(tick) + 2.5}
              textAnchor="end"
              className="animate-fade-in fill-slate-400"
              fontSize={8.5}
              style={{ animationDelay: `${tickIndex * 50}ms` }}
            >
              {tick}%
            </text>
          </g>
        ))}

        <path
          d={area}
          fill="url(#gt-area)"
          className="animate-fade-in"
          style={{ animationDelay: "300ms", animationDuration: "0.9s" }}
        />
        <path
          d={line}
          stroke="url(#gt-line)"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw"
          pathLength={1}
          strokeDasharray={1}
          style={{ animationDelay: "100ms", animationDuration: "1.3s" }}
        />

        <g className="animate-fade-in" style={{ animationDelay: "1.15s" }}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={averageY}
            y2={averageY}
            className="stroke-gold-500"
            strokeWidth={1.1}
            strokeDasharray="5 5"
            strokeOpacity={0.6}
          />
        </g>

        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          const isSelected = selected === index;
          const isActive = active === index;
          return (
            <g key={`${point.label}-${index}`}>
              {isLast ? (
                <>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={15}
                    fill="url(#gt-glow)"
                    className="animate-fade-in"
                    style={{ animationDelay: "1s" }}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={7}
                    fill="none"
                    stroke="#d4af37"
                    strokeWidth={1.8}
                    className="animate-pulse-ring"
                    style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: "1.1s" }}
                  />
                </>
              ) : null}
              {isSelected ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={9}
                  fill="none"
                  stroke="#5373b8"
                  strokeWidth={2}
                  className="animate-fade-in"
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? (isLast ? 6.5 : 5.5) : isLast ? 5.5 : 3.6}
                className={
                  isLast
                    ? "animate-pop-in fill-gold-500 stroke-white"
                    : "animate-pop-in fill-white stroke-brand-700"
                }
                strokeWidth={2.3}
                style={{
                  animationDelay: `${260 + index * 50}ms`,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transition: "r 150ms ease-out",
                }}
              >
                <title>{`${point.label}: ${point.value}%`}</title>
              </circle>
              <circle
                cx={point.x}
                cy={point.y}
                r={13}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(isSelected ? null : index)}
              />
              {(index === 0 || index === points.length - 1 || index % labelInterval === 0) &&
              point.label !== points[index - 1]?.label ? (
                <text
                  x={point.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="animate-fade-in fill-slate-400"
                  fontSize={8.5}
                  style={{ animationDelay: `${300 + index * 40}ms` }}
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {activePoint && active !== null ? (
          <g className="animate-fade-in" style={{ animationDuration: "0.18s" }}>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={24}
              rx={7}
              className="fill-brand-950"
              fillOpacity={0.94}
            />
            <text
              x={tooltipX + tooltipWidth / 2}
              y={tooltipY + 16}
              textAnchor="middle"
              className="fill-white"
              fontSize={10}
              fontWeight={600}
            >
              {`${data[active].detail.title.slice(0, 18)} · ${points[active].value}%`}
            </text>
          </g>
        ) : null}
      </svg>

      {selectedItem ? (
        <div className="animate-fade-up mt-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{selectedItem.detail.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedItem.detail.kind === "assignment" ? t("grdAssignment") : t("grdQuiz")} ·{" "}
                {selectedItem.detail.course} · {fmtDate(selectedItem.detail.at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-white px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 ring-1 ring-slate-200">
                {selectedItem.detail.score}/{selectedItem.detail.max} · {Math.round(selectedItem.value)}%
              </span>
              {delta != null && delta !== 0 ? (
                <span
                  className={
                    delta < 0
                      ? "inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold tabular-nums text-rose-600"
                      : "inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold tabular-nums text-emerald-700"
                  }
                >
                  {delta < 0 ? "▼" : "▲"} {Math.abs(Math.round(delta))}%
                </span>
              ) : null}
            </div>
          </div>
          {delta != null && delta < 0 ? (
            <p className="mt-2 text-xs font-medium text-rose-600">
              {delta < 0
                ? t("dashGradeDrop").replace("{delta}", String(Math.abs(Math.round(delta))))
                : t("dashGradeRise").replace("{delta}", String(Math.abs(Math.round(delta))))}
            </p>
          ) : delta != null && delta > 0 ? (
            <p className="mt-2 text-xs font-medium text-emerald-700">
              {t("dashGradeRise").replace("{delta}", String(Math.abs(Math.round(delta))))}
            </p>
          ) : null}
          {selectedItem.detail.feedback ? (
            <div className="mt-2 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200/70">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {t("dashGradeFeedback")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">«{selectedItem.detail.feedback}»</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-400">{t("dashGradeDetailHint")}</p>
      )}
    </div>
  );
}
