import { useId } from "react";
import { currentLocale } from "@/lib/utils";

const NO_DATA: Record<string, string> = {
  uz: "Ma'lumot yo'q",
  "uz-new": "Ma'lumot yo'q",
  "uz-cyrl": "Маълумот йўқ",
  ru: "Нет данных",
  en: "No data",
};

export type BarChartDatum = { label: string; value: number };

const WIDTH = 560;

function niceScale(maxValue: number) {
  const max = Math.max(1, Math.ceil(maxValue));
  if (max <= 5) return { top: max, step: 1 };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
  return { top: Math.ceil(max / step) * step, step };
}

function shortLabel(label: string) {
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
}

export function BarChart({ data, height = 190 }: { data: BarChartDatum[]; height?: number }) {
  const gradientId = useId();
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        {NO_DATA[currentLocale()] ?? NO_DATA.uz}
      </p>
    );
  }

  const pad = { top: 14, right: 8, bottom: 26, left: 30 };
  const innerWidth = WIDTH - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const { top, step } = niceScale(Math.max(...data.map((item) => item.value)));
  const showValues = data.length <= 12;

  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);

  const slot = innerWidth / data.length;
  const barWidth = Math.min(44, slot * 0.62);
  const labelFont = data.length > 10 ? 8.5 : 9.5;

  const yFor = (value: number) => pad.top + innerHeight - (value / top) * innerHeight;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={data.map((item) => `${item.label}: ${item.value}`).join("; ")}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5373b8" />
          <stop offset="100%" stopColor="#1d3460" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={WIDTH - pad.right}
            y1={yFor(tick)}
            y2={yFor(tick)}
            className="stroke-slate-200"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
          <text
            x={pad.left - 6}
            y={yFor(tick) + 2.5}
            textAnchor="end"
            className="fill-slate-400"
            fontSize={8.5}
          >
            {tick}
          </text>
        </g>
      ))}

      <line
        x1={pad.left}
        x2={WIDTH - pad.right}
        y1={pad.top + innerHeight}
        y2={pad.top + innerHeight}
        className="stroke-slate-300"
        strokeWidth={1}
      />

      {data.map((item, index) => {
        const x = pad.left + slot * index + (slot - barWidth) / 2;
        const valueY = yFor(item.value);
        const barHeight = Math.max(item.value > 0 ? 2 : 0, pad.top + innerHeight - valueY);
        const centerX = x + barWidth / 2;
        return (
          <g key={`${item.label}-${index}`}>
            <rect
              x={x}
              y={pad.top + innerHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx={6}
              fill={`url(#${gradientId})`}
              className="origin-bottom animate-grow-y transition-opacity duration-150 hover:opacity-80"
              style={{
                animationDelay: `${index * 60}ms`,
                transformBox: "fill-box",
                transformOrigin: "bottom",
              }}
            >
              <title>{`${item.label}: ${item.value}`}</title>
            </rect>
            {showValues && item.value > 0 ? (
              <text
                x={centerX}
                y={valueY - 5}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize={9}
              >
                {item.value}
              </text>
            ) : null}
            <text
              x={centerX}
              y={height - 9}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={labelFont}
            >
              {shortLabel(item.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
