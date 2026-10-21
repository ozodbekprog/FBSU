"use client";

import { useMemo, useState } from "react";

export type PerformanceSeriesInput = {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  dashed?: boolean;
};

const WIDTH = 720;
const HEIGHT = 232;
const PAD = { top: 16, right: 18, bottom: 30, left: 34 };

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

export function StudentPerformanceChart({
  labels,
  series,
}: {
  labels: string[];
  series: PerformanceSeriesInput[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const step = labels.length > 1 ? innerWidth / (labels.length - 1) : 0;
  const xFor = (index: number) =>
    labels.length === 1 ? PAD.left + innerWidth / 2 : PAD.left + step * index;
  const yFor = (value: number) => PAD.top + innerHeight - (Math.max(0, Math.min(100, value)) / 100) * innerHeight;
  const baseY = PAD.top + innerHeight;

  const rendered = useMemo(
    () =>
      series.map((item) => {
        const points = item.values
          .map((value, index) => (value == null ? null : { index, x: xFor(index), y: yFor(value), value }))
          .filter((point): point is { index: number; x: number; y: number; value: number } => point !== null);
        const latest = points.length > 0 ? points[points.length - 1].value : null;
        return { ...item, points, path: smoothPath(points), latest };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, labels.length],
  );

  const ticks = [0, 25, 50, 75, 100];
  const labelEvery = Math.max(1, Math.ceil(labels.length / 6));
  const hoverX = hover != null ? xFor(hover) : null;
  const tooltipLeft = hover != null ? Math.min(88, Math.max(12, (hoverX! / WIDTH) * 100)) : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {rendered.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
              <span className="tabular-nums text-slate-800">{item.latest != null ? `${Math.round(item.latest)}%` : "—"}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
          const index = Math.round((x - PAD.left) / Math.max(1, step));
          setHover(Math.min(labels.length - 1, Math.max(0, index)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Haftalik natijalar dinamikasi">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                className="stroke-slate-200/70"
                strokeDasharray={tick === 0 ? undefined : "3 5"}
              />
              <text x={PAD.left - 9} y={yFor(tick) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                {tick}%
              </text>
            </g>
          ))}

          {labels.map((label, index) =>
            index % labelEvery === 0 || index === labels.length - 1 ? (
              <text
                key={`${label}-${index}`}
                x={xFor(index)}
                y={HEIGHT - 8}
                textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"}
                className="fill-slate-400 text-[9px]"
              >
                {label}
              </text>
            ) : null,
          )}

          {hoverX != null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.top}
              y2={baseY}
              className="stroke-brand-400/50"
              strokeDasharray="3 4"
            />
          ) : null}

          {rendered.map((item, seriesIndex) =>
            item.points.length >= 2 ? (
              <path
                key={item.key}
                d={item.path}
                fill="none"
                stroke={item.color}
                strokeWidth={item.dashed ? 1.8 : 2.4}
                strokeDasharray={item.dashed ? "5 5" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="perf-line"
                style={{ animationDelay: `${seriesIndex * 130}ms` }}
              />
            ) : null,
          )}

          {rendered.map((item, seriesIndex) =>
            item.points.map((point, pointIndex) => (
              <circle
                key={`${item.key}-${point.index}`}
                cx={point.x}
                cy={point.y}
                r={3.4}
                fill={item.color}
                stroke="#0f1722"
                strokeWidth="1.6"
                className="perf-dot"
                style={{ animationDelay: `${seriesIndex * 130 + pointIndex * 55 + 220}ms` }}
              />
            )),
          )}

          {hoverX != null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.top}
              y2={baseY}
              stroke="transparent"
              strokeWidth="12"
            />
          ) : null}
        </svg>

        {hover != null ? (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{ left: `${tooltipLeft}%` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{labels[hover]}</p>
            <ul className="mt-1.5 space-y-1">
              {rendered.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-[11px]">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="flex-1 text-slate-500">{item.label}</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {item.values[hover] != null ? `${Math.round(item.values[hover]!)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
