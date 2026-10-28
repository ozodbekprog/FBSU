import { currentLocale } from "@/lib/utils";

const NO_DATA: Record<string, string> = {
  uz: "Ma'lumot yo'q",
  "uz-new": "Ma'lumot yo'q",
  "uz-cyrl": "Маълумот йўқ",
  ru: "Нет данных",
  en: "No data",
};

const TOTAL_LABEL: Record<string, string> = {
  uz: "jami",
  "uz-new": "jami",
  "uz-cyrl": "жами",
  ru: "всего",
  en: "total",
};

export type DonutChartDatum = { label: string; value: number; color: string };

const SIZE = 168;
const CENTER = SIZE / 2;
const RADIUS = 60;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ data }: { data: DonutChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        {NO_DATA[currentLocale()] ?? NO_DATA.uz}
      </p>
    );
  }

  const segments = data.reduce<
    { label: string; value: number; color: string; length: number; offset: number }[]
  >((accumulator, item) => {
    const length = (item.value / total) * CIRCUMFERENCE;
    const previous = accumulator[accumulator.length - 1];
    const start = previous ? previous.offset + previous.length : 0;
    accumulator.push({ ...item, length, offset: start });
    return accumulator;
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-36 shrink-0 sm:w-40" role="img">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="animate-fade-in stroke-slate-100"
        />
        {segments.map((segment, segmentIndex) => {
          if (segment.value <= 0) return null;
          return (
            <circle
              key={segment.label}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
              strokeDashoffset={-segment.offset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              className="animate-fade-in transition-opacity duration-150 hover:opacity-80"
              style={{ animationDelay: `${segmentIndex * 90}ms` }}
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
        })}
        <circle cx={CENTER} cy={CENTER} r={46} className="fill-white/80" />
        <text
          x={CENTER}
          y={CENTER - 1}
          textAnchor="middle"
          className="animate-fade-in fill-brand-950"
          fontSize={24}
          fontWeight={700}
          style={{ animationDelay: "220ms" }}
        >
          {total}
        </text>
        <text
          x={CENTER}
          y={CENTER + 14}
          textAnchor="middle"
          className="animate-fade-in fill-slate-400"
          fontSize={9.5}
          style={{ animationDelay: "220ms" }}
        >
          {TOTAL_LABEL[currentLocale()] ?? TOTAL_LABEL.uz}
        </text>
      </svg>

      <ul className="grid w-full max-w-72 gap-x-5 gap-y-2 sm:max-w-64">
        {data.map((item, index) => {
          const percent = Math.round((item.value / total) * 100);
          return (
            <li
              key={item.label}
              className="flex animate-fade-in items-center gap-2.5"
              style={{ animationDelay: `${280 + index * 60}ms` }}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{item.label}</span>
              <span className="text-xs font-semibold text-slate-900">{item.value}</span>
              <span className="w-9 text-right text-[11px] tabular-nums text-slate-500">{percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
