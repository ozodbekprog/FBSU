import { useId } from "react";
import { currentLocale } from "@/lib/utils";

const NO_DATA: Record<string, string> = {
  uz: "Ma'lumot yo'q",
  ru: "Нет данных",
  en: "No data",
};

export type LineChartDatum = { label: string; value: number };

const WIDTH = 560;
const PAD = { top: 18, right: 22, bottom: 28, left: 32 };

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
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

export function LineChart({ data, height = 200 }: { data: LineChartDatum[]; height?: number }) {
  const areaId = useId();
  const lineId = useId();
  const glowId = useId();
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        {NO_DATA[currentLocale()] ?? NO_DATA.uz}
      </p>
    );
  }

  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = height - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerHeight;
  const denominator = Math.max(1, data.length - 1);

  const yFor = (value: number) => PAD.top + innerHeight - (clamp(value) / 100) * innerHeight;

  const points = data.map((item, index) => ({
    x: data.length === 1 ? PAD.left + innerWidth / 2 : PAD.left + (innerWidth * index) / denominator,
    y: yFor(item.value),
    label: item.label,
    value: Math.round(item.value),
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
  const labelInterval = Math.max(1, Math.ceil(data.length / 8));
  const lastPoint = points[points.length - 1];

  let previousLabel = "";
  const labelIndices = new Set<number>();
  points.forEach((point, index) => {
    const forceShow = index === 0 || index === points.length - 1;
    const intervalOk = index % labelInterval === 0;
    if (forceShow || intervalOk) {
      if (point.label !== previousLabel || forceShow) {
        labelIndices.add(index);
        previousLabel = point.label;
      }
    }
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img">
      <defs>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5373b8" stopOpacity="0.28" />
          <stop offset="70%" stopColor="#5373b8" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#5373b8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1d3460" />
          <stop offset="55%" stopColor="#5373b8" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((tick, tickIndex) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={yFor(tick)}
            y2={yFor(tick)}
            className="animate-fade-in stroke-slate-200"
            strokeWidth={1}
            strokeDasharray="3 5"
            style={{ animationDelay: `${tickIndex * 60}ms` }}
          />
          <text
            x={PAD.left - 6}
            y={yFor(tick) + 2.5}
            textAnchor="end"
            className="animate-fade-in fill-slate-400"
            fontSize={8.5}
            style={{ animationDelay: `${tickIndex * 60}ms` }}
          >
            {tick}%
          </text>
        </g>
      ))}

      <path
        d={area}
        fill={`url(#${areaId})`}
        className="animate-fade-in"
        style={{ animationDelay: "260ms", animationDuration: "0.9s" }}
      />
      <path
        d={line}
        stroke={`url(#${lineId})`}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
        pathLength={1}
        strokeDasharray={1}
        style={{ animationDelay: "120ms", animationDuration: "1.5s" }}
      />

      {points.map((point, index) => {
        const isLast = index === points.length - 1;
        return (
          <g key={`${point.label}-${index}`}>
            {isLast ? (
              <>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={16}
                  fill={`url(#${glowId})`}
                  className="animate-fade-in"
                  style={{ animationDelay: `${300 + index * 40}ms` }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={9}
                  className="animate-fade-in fill-gold-300"
                  fillOpacity={0.25}
                  style={{ animationDelay: `${300 + index * 40}ms` }}
                />
              </>
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              r={isLast ? 5 : 3.5}
              className={
                isLast
                  ? "animate-pop-in fill-gold-500 stroke-white transition-transform duration-150 hover:scale-125"
                  : "animate-pop-in fill-white stroke-brand-700 transition-transform duration-150 hover:scale-150"
              }
              strokeWidth={2.2}
              style={{
                animationDelay: `${280 + index * 55}ms`,
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            >
              <title>{`${point.label}: ${point.value}%`}</title>
            </circle>
            {labelIndices.has(index) ? (
              <text
                x={point.x}
                y={height - 9}
                textAnchor="middle"
                className="animate-fade-in fill-slate-400"
                fontSize={8.5}
                style={{ animationDelay: `${320 + index * 40}ms` }}
              >
                {point.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {lastPoint ? (
        <text
          x={Math.min(Math.max(lastPoint.x, PAD.left + 16), WIDTH - PAD.right - 16)}
          y={Math.max(lastPoint.y - 14, PAD.top + 8)}
          textAnchor="middle"
          className="animate-pop-in fill-brand-950"
          fontSize={11}
          fontWeight={700}
          style={{ animationDelay: `${340 + data.length * 55}ms` }}
        >
          {`${lastPoint.value}%`}
        </text>
      ) : null}
    </svg>
  );
}
