"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

const G = 9.8;

export function ProjectileSim() {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(25);
  const [flying, setFlying] = useState(false);

  const radians = (angle * Math.PI) / 180;
  const flightTime = (2 * speed * Math.sin(radians)) / G;
  const range = (speed * speed * Math.sin(2 * radians)) / G;
  const maxHeight = (speed * speed * Math.sin(radians) ** 2) / (2 * G);

  const draw = useCallback(
    (progress: number) => {
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

      const marginX = 40;
      const marginY = 36;
      const scale = Math.min(
        (width - marginX * 2) / Math.max(range, 1),
        (height - marginY * 2) / Math.max(maxHeight, 1),
      );
      const originX = marginX;
      const originY = height - marginY;

      context.strokeStyle = "#e2e8f0";
      context.lineWidth = 1;
      for (let x = 0; x <= width; x += 40) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y <= height; y += 40) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.strokeStyle = "#94a3b8";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, originY);
      context.lineTo(width, originY);
      context.stroke();

      context.strokeStyle = "#2563eb";
      context.lineWidth = 2.5;
      context.beginPath();
      const steps = 60;
      for (let index = 0; index <= steps; index += 1) {
        const time = (flightTime * index) / steps;
        const x = originX + speed * Math.cos(radians) * time * scale;
        const y = originY - (speed * Math.sin(radians) * time - 0.5 * G * time * time) * scale;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();

      const time = flightTime * progress;
      const ballX = originX + speed * Math.cos(radians) * time * scale;
      const ballY = originY - (speed * Math.sin(radians) * time - 0.5 * G * time * time) * scale;
      context.fillStyle = "#d4af37";
      context.beginPath();
      context.arc(ballX, ballY, 8, 0, Math.PI * 2);
      context.fill();
    },
    [flightTime, maxHeight, radians, range, speed],
  );

  useEffect(() => {
    draw(1);
  }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw(1));
    const canvas = canvasRef.current;
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    return () => window.cancelAnimationFrame(rafRef.current);
  }, []);

  function launch() {
    window.cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();
    setFlying(true);
    const step = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const progress = Math.min(1, elapsed / Math.max(flightTime, 0.001));
      draw(progress);
      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        setFlying(false);
      }
    };
    rafRef.current = window.requestAnimationFrame(step);
  }

  return (
    <Card>
      <CardHeader title={t("labProjectile")} subtitle={t("labProjectileHint")} />
      <CardBody className="space-y-3">
        <canvas ref={canvasRef} className="h-72 w-full rounded-2xl border border-slate-200 bg-white" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labAngle")}: {angle}°
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={angle}
              onChange={(event) => setAngle(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labVelocity")}: {speed}
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span>
            {t("labRange")}: <span className="font-semibold text-brand-800">{range.toFixed(1)} m</span>
          </span>
          <span>
            {t("labMaxHeight")}:{" "}
            <span className="font-semibold text-brand-800">{maxHeight.toFixed(1)} m</span>
          </span>
          <span>
            {t("labFlightTime")}:{" "}
            <span className="font-semibold text-brand-800">{flightTime.toFixed(2)} s</span>
          </span>
          <Button size="sm" className="ml-auto" onClick={launch} disabled={flying}>
            {t("labStart")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
