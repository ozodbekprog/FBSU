"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Matter from "matter-js";
import { Button, Card, CardBody, CardHeader } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type MatterModule = typeof Matter;

const COLORS = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#db2777"];
const MAX_BODIES = 120;

export function GravitySandbox() {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matterRef = useRef<MatterModule | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const wallsRef = useRef<Matter.Body[]>([]);
  const ballsRef = useRef<Matter.Body[]>([]);
  const rafRef = useRef(0);
  const loopRef = useRef<(() => void) | null>(null);
  const bounceRef = useRef(0.6);
  const [gravity, setGravity] = useState(1);
  const [bounce, setBounce] = useState(0.6);
  const [ready, setReady] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const MatterLib = matterRef.current;
    if (!canvas || !engine || !MatterLib) return;
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

    context.fillStyle = "#f1f5f9";
    for (const wall of wallsRef.current) {
      const vertices = wall.vertices;
      context.beginPath();
      context.moveTo(vertices[0].x, vertices[0].y);
      for (let index = 1; index < vertices.length; index += 1) {
        context.lineTo(vertices[index].x, vertices[index].y);
      }
      context.closePath();
      context.fill();
    }

    for (const ball of ballsRef.current) {
      if (!ball.circleRadius) continue;
      context.fillStyle = (ball.render && ball.render.fillStyle) || COLORS[0];
      context.beginPath();
      context.arc(ball.position.x, ball.position.y, ball.circleRadius, 0, Math.PI * 2);
      context.fill();
    }
  }, []);

  const loop = useCallback(() => {
    const engine = engineRef.current;
    const MatterLib = matterRef.current;
    if (!engine || !MatterLib) return;
    MatterLib.Engine.update(engine, 1000 / 60);
    render();
    rafRef.current = window.requestAnimationFrame(loopRef.current!);
  }, [render]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const buildWalls = useCallback(() => {
    const MatterLib = matterRef.current;
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!MatterLib || !engine || !canvas) return;
    if (wallsRef.current.length > 0) {
      MatterLib.Composite.remove(engine.world, wallsRef.current);
      wallsRef.current = [];
    }
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const thickness = 30;
    const inset = 8;
    const walls = [
      MatterLib.Bodies.rectangle(width / 2, height + thickness / 2 - inset, width + thickness * 2, thickness, { isStatic: true }),
      MatterLib.Bodies.rectangle(-thickness / 2 + inset, height / 2, thickness, height * 2, { isStatic: true }),
      MatterLib.Bodies.rectangle(width + thickness / 2 - inset, height / 2, thickness, height * 2, { isStatic: true }),
    ];
    wallsRef.current = walls;
    MatterLib.Composite.add(engine.world, walls);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const imported = await import("matter-js");
      if (!active) return;
      const MatterLib = ((imported as unknown as { default?: MatterModule }).default ?? imported) as MatterModule;
      matterRef.current = MatterLib;
      const engine = MatterLib.Engine.create({ enableSleeping: true });
      engine.gravity.y = 1;
      engineRef.current = engine;
      buildWalls();
      setReady(true);
      rafRef.current = window.requestAnimationFrame(loop);
    })();
    return () => {
      active = false;
      window.cancelAnimationFrame(rafRef.current);
      const engine = engineRef.current;
      const MatterLib = matterRef.current;
      if (engine && MatterLib) MatterLib.Engine.clear(engine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => buildWalls());
    const canvas = canvasRef.current;
    if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  }, [buildWalls]);

  useEffect(() => {
    const engine = engineRef.current;
    if (engine) engine.gravity.y = gravity;
  }, [gravity, ready]);

  useEffect(() => {
    bounceRef.current = bounce;
    const MatterLib = matterRef.current;
    if (MatterLib) {
      for (const ball of ballsRef.current) {
        MatterLib.Body.set(ball, { restitution: bounce });
      }
    }
  }, [bounce]);

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const MatterLib = matterRef.current;
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!MatterLib || !engine || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = 12 + Math.random() * 10;
    const ball = MatterLib.Bodies.circle(x, y, radius, {
      restitution: bounceRef.current,
      friction: 0.02,
      render: { fillStyle: COLORS[Math.floor(Math.random() * COLORS.length)] },
    });
    ballsRef.current.push(ball);
    MatterLib.Composite.add(engine.world, ball);
    if (ballsRef.current.length > MAX_BODIES) {
      const oldest = ballsRef.current.shift();
      if (oldest) MatterLib.Composite.remove(engine.world, oldest);
    }
  }

  function clearAll() {
    const MatterLib = matterRef.current;
    const engine = engineRef.current;
    if (!MatterLib || !engine) return;
    for (const ball of ballsRef.current) {
      MatterLib.Composite.remove(engine.world, ball);
    }
    ballsRef.current = [];
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const context = offscreen.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, offscreen.width, offscreen.height);
    context.drawImage(canvas, 0, 0);
    const link = document.createElement("a");
    link.download = `gravitatsiya-${Date.now()}.png`;
    link.href = offscreen.toDataURL("image/png");
    link.click();
  }

  return (
    <Card>
      <CardHeader title={t("labGravitySandbox")} subtitle={t("labGravityHint")} />
      <CardBody className="space-y-3">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          className="h-72 w-full touch-none rounded-2xl border border-slate-200 bg-white"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labGravityStrength")}: {gravity.toFixed(1)}
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={gravity}
              onChange={(event) => setGravity(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            {t("labBounce")}: {bounce.toFixed(1)}
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={bounce}
              onChange={(event) => setBounce(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={clearAll}>
            {t("labClear")}
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPng}>
            {t("labExportPng")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
