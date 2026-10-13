"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { OpenboardData, OpenboardNote } from "@/lib/openboard/types";
import { createId, nowIso } from "@/lib/openboard/types";
import {
  createEmptyNote,
  createLabNote,
  createSketchNote,
  migrateLegacy,
} from "@/lib/openboard/store";
import { NoteEditor } from "./note-editor";
import { NotesSidebar, type NewNoteKind } from "./notes-sidebar";

type SaveStatus = "loading" | "idle" | "saving" | "saved" | "error";

export function OpenboardApp() {
  const { t } = useI18n();
  const [data, setData] = useState<OpenboardData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const dataRef = useRef<OpenboardData | null>(null);
  const dirtyRef = useRef(false);
  const savedTimerRef = useRef<number | null>(null);

  const saveNow = useCallback(async () => {
    if (!dirtyRef.current || !dataRef.current) return;
    setStatus("saving");
    const response = await apiFetch("/api/openboard", {
      method: "PUT",
      body: JSON.stringify({ data: dataRef.current }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (response.ok && json?.ok) {
      dirtyRef.current = false;
      setStatus("saved");
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(
        () => setStatus((current) => (current === "saved" ? "idle" : current)),
        2000,
      );
    } else {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (dataRef.current) return;
    let active = true;
    void (async () => {
      const response = await apiFetch("/api/openboard");
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { data?: unknown } }
        | null;
      if (!active) return;
      const raw = json?.data?.data ?? null;
      const migrated = migrateLegacy(raw, t("brdNewSketch"));
      let next = migrated.data;
      let dirty = migrated.needsSave;
      if (next.notes.length === 0) {
        next = { ...next, notes: [createEmptyNote(t("brdNewNote"))] };
        dirty = true;
      }
      dataRef.current = next;
      dirtyRef.current = dirty;
      setData(next);
      setSelectedId(next.notes[0]?.id ?? null);
      setStatus("idle");
      if (dirty) void saveNow();
    })();
    return () => {
      active = false;
    };
  }, [saveNow, t]);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(() => {
      void saveNow();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, saveNow]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void saveNow();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [saveNow]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  const applyData = useCallback((updater: (current: OpenboardData) => OpenboardData) => {
    const current = dataRef.current;
    if (!current) return;
    const next = updater(current);
    dataRef.current = next;
    dirtyRef.current = true;
    setData(next);
  }, []);

  const updateNote = useCallback(
    (next: OpenboardNote) => {
      applyData((current) => ({
        ...current,
        notes: current.notes.map((note) => (note.id === next.id ? next : note)),
      }));
    },
    [applyData],
  );

  const createNote = useCallback(
    (kind: NewNoteKind) => {
      const label = {
        goal: t("brdLabGoal"),
        equipment: t("brdLabEquipment"),
        steps: t("brdLabSteps"),
        measurements: t("brdLabMeasurements"),
        calculation: t("brdLabCalculation"),
        conclusion: t("brdLabConclusion"),
        simLink: t("brdLabSimLink"),
      };
      const note =
        kind === "sketch"
          ? createSketchNote(t("brdNewSketch"))
          : kind === "lab"
            ? createLabNote(t("brdNewLab"), label)
            : createEmptyNote(t("brdNewNote"));
      applyData((current) => ({ ...current, notes: [note, ...current.notes] }));
      setSelectedId(note.id);
    },
    [applyData, t],
  );

  const deleteNote = useCallback(
    (id: string) => {
      applyData((current) => {
        const remaining = current.notes.filter((note) => note.id !== id);
        return {
          ...current,
          notes: remaining.length > 0 ? remaining : [createEmptyNote(t("brdNewNote"))],
        };
      });
      setSelectedId((current) => {
        if (current !== id) return current;
        return dataRef.current?.notes[0]?.id ?? null;
      });
    },
    [applyData, t],
  );

  const duplicateNote = useCallback(
    (id: string) => {
      const current = dataRef.current;
      const source = current?.notes.find((note) => note.id === id);
      if (!current || !source) return;
      const clone = structuredClone(source);
      clone.id = createId();
      clone.createdAt = nowIso();
      clone.updatedAt = clone.createdAt;
      clone.blocks = clone.blocks.map((block) => ({ ...block, id: createId() }));
      applyData((state) => ({ ...state, notes: [clone, ...state.notes] }));
      setSelectedId(clone.id);
    },
    [applyData],
  );

  const selected = useMemo(() => {
    if (!data) return null;
    return data.notes.find((note) => note.id === selectedId) ?? data.notes[0] ?? null;
  }, [data, selectedId]);

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-[70vh] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {t("brdHint")} · {t("brdAutosaveHint")}
        </p>
        {status === "saving" ? (
          <Badge tone="amber">{t("brdSaving")}</Badge>
        ) : status === "saved" ? (
          <Badge tone="green">{t("brdSaved")}</Badge>
        ) : status === "error" ? (
          <Badge tone="rose">{t("brdSaveError")}</Badge>
        ) : status === "loading" ? (
          <Badge tone="slate">{t("commonLoading")}</Badge>
        ) : null}
      </div>
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white md:h-[calc(100vh-11rem)] md:min-h-[32rem] md:grid-cols-[19rem_1fr]">
        <div className="h-64 border-b border-slate-200 md:h-auto md:border-b-0">
          <NotesSidebar
            notes={data.notes}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onCreate={createNote}
            onDelete={deleteNote}
            onDuplicate={duplicateNote}
          />
        </div>
        <div className="min-h-0 md:overflow-y-auto">
          {selected ? (
            <NoteEditor
              note={selected}
              onChange={updateNote}
              onDelete={deleteNote}
              onDuplicate={duplicateNote}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
