"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

const X_MIN = -10;
const X_MAX = 10;

export function FunctionGraph() {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [expression, setExpression] = useState("sin(x)*x/3");
  const [error, setError] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const points = pointsRef.current;
    const ys = points.map((point) => point.y).filter((value) => Number.isFinite(value));
    let yMin = ys.length ? Math.min(...ys) : -1;
    let yMax = ys.length ? Math.max(...ys) : 1;
    if (yMax - yMin < 2) {
      const middle = (yMax + yMin) / 2;
      yMin = middle - 1;
      yMax = middle + 1;
    }
    const pad = (yMax - yMin) * 0.1;
    yMin -= pad;
    yMax += pad;

    const toX = (value: number) => ((value - X_MIN) / (X_MAX - X_MIN)) * width;
    const toY = (value: number) => height - ((value - yMin) / (yMax - yMin)) * height;

    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 1;
    for (let value = X_MIN; value <= X_MAX; value += 1) {
      context.beginPath();
      context.moveTo(toX(value), 0);
      context.lineTo(toX(value), height);
      context.stroke();
    }
    const stepY = (yMax - yMin) / 8;
    for (let value = yMin; value <= yMax; value += stepY) {
      context.beginPath();
      context.moveTo(0, toY(value));
      context.lineTo(width, toY(value));
      context.stroke();
    }

    context.strokeStyle = "#94a3b8";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(toX(0), 0);
    context.lineTo(toX(0), height);
    context.moveTo(0, toY(0));
    context.lineTo(width, toY(0));
    context.stroke();

    context.strokeStyle = "#2563eb";
    context.lineWidth = 2.5;
    context.beginPath();
    let started = false;
    for (const point of points) {
      if (!Number.isFinite(point.y) || Math.abs(point.y) > 1e4) {
        started = false;
        continue;
      }
      const x = toX(point.x);
      const y = toY(point.y);
      if (!started) {
        context.moveTo(x, y);
        started = true;
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }, []);

  const plot = useCallback(async () => {
    try {
      const { evaluate } = await import("mathjs");
      const points: { x: number; y: number }[] = [];
      for (let x = X_MIN; x <= X_MAX; x += 0.04) {
        const raw = evaluate(expression, { x }) as unknown;
        const value = Number(raw);
        points.push({ x, y: Number.isFinite(value) ? value : Number.NaN });
      }
      pointsRef.current = points;
      setError(null);
      draw();
    } catch {
      setError(t("labErrorFunction"));
    }
  }, [draw, expression, t]);

  useEffect(() => {
    queueMicrotask(() => void plot());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    const canvas = canvasRef.current;
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <Card>
      <CardHeader title={t("labFunction")} subtitle={t("labFunctionHint")} />
      <CardBody className="space-y-3">
        <canvas ref={canvasRef} className="h-72 w-full rounded-2xl border border-slate-200 bg-white" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("labFunctionInput")}</span>
          <Input
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void plot();
            }}
            className="min-w-40 flex-1"
          />
          <Button size="sm" onClick={() => void plot()}>
            {t("labPlot")}
          </Button>
        </div>
        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}
