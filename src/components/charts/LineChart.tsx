import { useId } from "react";
import { currentLocale } from "@/lib/utils";

const NO_DATA: Record<string, string> = {
  uz: "Ma'lumot yo'q",
  ru: "Нет данных",
  en: "No data",
};

const AVERAGE_LABEL: Record<string, string> = {
  uz: "O'rtacha",
  ru: "Среднее",
  en: "Average",
};

export type LineChartDatum = { label: string; value: number };

const WIDTH = 560;
const PAD = { top: 22, right: 24, bottom: 28, left: 34 };

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

export function LineChart({ data, height = 210 }: { data: LineChartDatum[]; height?: number }) {
  const areaId = useId();
  const lineId = useId();
  const glowId = useId();
  const locale = currentLocale();
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        {NO_DATA[locale] ?? NO_DATA.uz}
      </p>
    );
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
  const labelInterval = Math.max(1, Math.ceil(data.length / 8));
  const lastPoint = points[points.length - 1];
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const averageY = yFor(average);

  const ticks: number[] = [];
  for (let index = 0; index <= 4; index += 1) {
    ticks.push(Math.round(floor + (span * index) / 4));
  }

  let previousLabel = "";
  const labelIndices = new Set<number>();
  points.forEach((point, index) => {
    const forceShow = index === 0 || index === points.length - 1;
    if (forceShow || index % labelInterval === 0) {
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
          <stop offset="0%" stopColor="#0071e3" stopOpacity="0.3" />
          <stop offset="62%" stopColor="#0071e3" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0062c4" />
          <stop offset="55%" stopColor="#0071e3" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
        <radialGradient id={glowId}>
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
            className="animate-fade-in"
            stroke="var(--fb-line, #e2e8f0)"
            strokeWidth={1}
            strokeDasharray="3 5"
            style={{ animationDelay: `${tickIndex * 50}ms` }}
          />
          <text
            x={PAD.left - 6}
            y={yFor(tick) + 2.5}
            textAnchor="end"
            className="animate-fade-in"
            fill="var(--fb-muted-2, #94a3b8)"
            fontSize={8.5}
            style={{ animationDelay: `${tickIndex * 50}ms` }}
          >
            {tick}%
          </text>
        </g>
      ))}

      <path
        d={area}
        fill={`url(#${areaId})`}
        className="animate-fade-in"
        style={{ animationDelay: "320ms", animationDuration: "1s" }}
      />
      <path
        d={line}
        stroke={`url(#${lineId})`}
        strokeWidth={3.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
        pathLength={1}
        strokeDasharray={1}
        style={{ animationDelay: "120ms", animationDuration: "1.5s" }}
      />

      <g className="animate-fade-in" style={{ animationDelay: "1.35s" }}>
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={averageY}
          y2={averageY}
          stroke="var(--fb-gold, #d4af37)"
          strokeWidth={1.2}
          strokeDasharray="5 5"
          strokeOpacity={0.65}
        />
        <text
          x={WIDTH - PAD.right}
          y={averageY - 5}
          textAnchor="end"
          fill="var(--fb-gold-ink, #a16207)"
          fontSize={9}
          fontWeight={600}
        >
          {`${AVERAGE_LABEL[locale] ?? AVERAGE_LABEL.uz}: ${average}%`}
        </text>
      </g>

      {points.map((point, index) => {
        const isLast = index === points.length - 1;
        return (
          <g key={`${point.label}-${index}`}>
            {isLast ? (
              <>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={17}
                  fill={`url(#${glowId})`}
                  className="animate-fade-in"
                  style={{ animationDelay: "1.1s" }}
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={8}
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth={2}
                  className="animate-pulse-ring"
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animationDelay: "1.2s",
                  }}
                />
              </>
            ) : null}
            <circle
              cx={point.x}
              cy={point.y}
              r={isLast ? 5.5 : 4}
              fill={isLast ? "var(--fb-gold, #d4af37)" : "var(--fb-card, #ffffff)"}
              stroke={isLast ? "var(--fb-card, #ffffff)" : "var(--fb-blue, #0071e3)"}
              className="animate-pop-in transition-transform duration-150 hover:scale-125"
              strokeWidth={2.4}
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
                className="animate-fade-in"
                fill="var(--fb-muted-2, #94a3b8)"
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
          y={Math.max(lastPoint.y - 15, PAD.top + 8)}
          textAnchor="middle"
          className="animate-pop-in"
          fill="var(--fb-ink, #1d1d1f)"
          fontSize={12}
          fontWeight={700}
          style={{ animationDelay: `${420 + data.length * 55}ms` }}
        >
          {`${lastPoint.value}%`}
        </text>
      ) : null}
    </svg>
  );
}
