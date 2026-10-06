"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function PendulumSim() {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const thetaRef = useRef(0);
  const omegaRef = useRef(0);
  const [length, setLength] = useState(1.2);
  const [angle, setAngle] = useState(30);
  const [gravity, setGravity] = useState(9.8);
  const [running, setRunning] = useState(false);

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

    const pivotX = width / 2;
    const pivotY = 36;
    const scale = Math.min(150, (height - 80) / Math.max(length, 0.3));
    const bobX = pivotX + Math.sin(thetaRef.current) * length * scale;
    const bobY = pivotY + Math.cos(thetaRef.current) * length * scale;

    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.fillStyle = "#64748b";
    context.beginPath();
    context.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#1d3460";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(pivotX, pivotY);
    context.lineTo(bobX, bobY);
    context.stroke();

    context.fillStyle = "#d4af37";
    context.beginPath();
    context.arc(bobX, bobY, 16, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#b08d1f";
    context.lineWidth = 2;
    context.stroke();
  }, [length]);

  const tick = useCallback(() => {
    if (!runningRef.current) return;
    const dt = 1 / 240;
    for (let step = 0; step < 8; step += 1) {
      const acceleration = -(gravity / length) * Math.sin(thetaRef.current);
      omegaRef.current += acceleration * dt;
      thetaRef.current += omegaRef.current * dt;
    }
    draw();
    rafRef.current = window.requestAnimationFrame(tick);
  }, [draw, gravity, length]);

  const reset = useCallback(() => {
    thetaRef.current = (angle * Math.PI) / 180;
    omegaRef.current = 0;
    setRunning(false);
    runningRef.current = false;
    window.cancelAnimationFrame(rafRef.current);
    draw();
  }, [angle, draw]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    const canvas = canvasRef.current;
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    return () => window.cancelAnimationFrame(rafRef.current);
  }, []);

  function toggle() {
    if (running) {
      runningRef.current = false;
      window.cancelAnimationFrame(rafRef.current);
      setRunning(false);
      return;
    }
    runningRef.current = true;
    setRunning(true);
    rafRef.current = window.requestAnimationFrame(tick);
  }

  const period = 2 * Math.PI * Math.sqrt(length / gravity);

  return (
    <Card>
      <CardHeader
        title={t("labPendulum")}
        subtitle={t("labPendulumHint")}
        action={<span className="text-sm font-semibold text-brand-800">T = {period.toFixed(2)} s</span>}
      />
      <CardBody className="space-y-3">
        <canvas ref={canvasRef} className="h-72 w-full rounded-2xl border border-slate-200 bg-white" />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labLength")}: {length.toFixed(1)}
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labAngle")}: {angle}
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={angle}
              onChange={(event) => setAngle(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labGravity")}: {gravity.toFixed(1)}
            <input
              type="range"
              min={1.6}
              max={20}
              step={0.1}
              value={gravity}
              onChange={(event) => setGravity(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={toggle}>
            {running ? t("labPause") : t("labStart")}
          </Button>
          <Button size="sm" variant="secondary" onClick={reset}>
            {t("labReset")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
