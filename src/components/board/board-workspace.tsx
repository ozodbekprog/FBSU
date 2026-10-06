"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

type Stroke = {
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: Point[];
};

type BoardData = { v: 1; strokes: Stroke[] };

const COLORS = ["#0f172a", "#dc2626", "#2563eb", "#059669", "#d97706", "#7c3aed"];
const SIZES = [2, 4, 8, 14];

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const points = stroke.points;
  if (points.length === 0) return;
  context.save();
  context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = stroke.tool === "eraser" ? stroke.size * 3 : stroke.size;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (points.length === 1) {
    const radius = context.lineWidth / 2;
    context.beginPath();
    context.arc(points[0].x, points[0].y, Math.max(0.5, radius), 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index].x, points[index].y);
    }
    context.stroke();
  }
  context.restore();
}

export function BoardWorkspace({
  assignmentId,
  assignmentTitle,
  assignmentDescription,
}: {
  assignmentId: string | null;
  assignmentTitle: string | null;
  assignmentDescription: string | null;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    for (const stroke of strokesRef.current) {
      drawStroke(context, stroke);
    }
    if (currentRef.current) {
      drawStroke(context, currentRef.current);
    }
  }, []);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ratio = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    redraw();
  }, [redraw]);

  const save = useCallback(async () => {
    if (!dirtyRef.current) return;
    setStatus("saving");
    const payload: BoardData = { v: 1, strokes: strokesRef.current };
    const response = await apiFetch("/api/board", {
      method: "PUT",
      body: JSON.stringify({ assignmentId, data: payload }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (response.ok && json?.ok) {
      dirtyRef.current = false;
      setStatus("saved");
    } else {
      setStatus("error");
    }
  }, [assignmentId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const query = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : "";
      const response = await apiFetch(`/api/board${query}`);
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { data: BoardData | null } }
        | null;
      if (!active) return;
      if (response.ok && json?.ok) {
        const data = json.data?.data;
        if (data && Array.isArray(data.strokes)) strokesRef.current = data.strokes;
        setStatus("idle");
      } else {
        setStatus("error");
      }
      fitCanvas();
    })();
    return () => {
      active = false;
    };
  }, [assignmentId, fitCanvas]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(() => fitCanvas());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [fitCanvas]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void save();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [save]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (status === "loading") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    currentRef.current = {
      tool,
      color,
      size,
      points: [pointFromEvent(event)],
    };
    redraw();
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentRef.current) return;
    const point = pointFromEvent(event);
    const points = currentRef.current.points;
    const last = points[points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5) return;
    points.push(point);
    redraw();
  }

  function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentRef.current) {
      strokesRef.current.push(currentRef.current);
      currentRef.current = null;
      dirtyRef.current = true;
      if (status === "saved" || status === "error") setStatus("idle");
      redraw();
    }
  }

  function undo() {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    dirtyRef.current = true;
    redraw();
  }

  function clearAll() {
    if (!window.confirm(t("brdClearConfirm"))) return;
    strokesRef.current = [];
    dirtyRef.current = true;
    redraw();
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
    link.download = `daftar-${Date.now()}.png`;
    link.href = offscreen.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-4">
      {assignmentTitle ? (
        <Card>
          <CardBody className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("brdAssignment")}
            </p>
            <p className="text-sm font-semibold text-slate-800">{assignmentTitle}</p>
            {assignmentDescription ? (
              <p className="text-sm whitespace-pre-wrap text-slate-600">{assignmentDescription}</p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={tool === "pen" ? "primary" : "secondary"}
              onClick={() => setTool("pen")}
            >
              {t("brdPen")}
            </Button>
            <Button
              size="sm"
              variant={tool === "eraser" ? "primary" : "secondary"}
              onClick={() => setTool("eraser")}
            >
              {t("brdEraser")}
            </Button>

            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={value}
                onClick={() => {
                  setColor(value);
                  setTool("pen");
                }}
                className={cn(
                  "size-7 rounded-full border border-black/10 transition-transform",
                  color === value && tool === "pen" ? "scale-110 ring-2 ring-brand-500 ring-offset-1" : "",
                )}
                style={{ backgroundColor: value }}
              />
            ))}

            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            {SIZES.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value}px`}
                onClick={() => setSize(value)}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-lg border transition-colors",
                  size === value ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{ width: value, height: value }}
                />
              </button>
            ))}

            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            <Button size="sm" variant="secondary" onClick={undo}>
              {t("brdUndo")}
            </Button>
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={clearAll}>
              {t("brdClear")}
            </Button>
            <Button size="sm" variant="secondary" onClick={exportPng}>
              {t("brdExport")}
            </Button>

            <span className="ml-auto">
              {status === "saving" ? (
                <Badge tone="amber">{t("brdSaving")}</Badge>
              ) : status === "saved" ? (
                <Badge tone="green">{t("brdSaved")}</Badge>
              ) : status === "error" ? (
                <Badge tone="rose">{t("brdSaveError")}</Badge>
              ) : null}
            </span>
          </div>

          <div
            ref={wrapRef}
            className="relative h-[58vh] w-full touch-none overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 touch-none cursor-crosshair"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={finishStroke}
              onPointerLeave={finishStroke}
              onPointerCancel={finishStroke}
            />
            {status === "loading" ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-500">
                {t("commonLoading")}
              </div>
            ) : null}
          </div>

          <p className="text-xs text-slate-500">
            {t("brdHint")} · {t("brdAutosaveHint")}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
