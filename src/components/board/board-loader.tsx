"use client";

import dynamic from "next/dynamic";

const BoardCanvas = dynamic(
  () => import("./board-canvas").then((mod) => mod.BoardCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[72vh] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
    ),
  },
);

const OpenboardApp = dynamic(
  () => import("@/components/openboard/openboard-app").then((mod) => mod.OpenboardApp),
  {
    ssr: false,
    loading: () => (
      <div className="h-[72vh] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
    ),
  },
);

export function BoardLoader({ assignmentId }: { assignmentId: string | null }) {
  if (assignmentId) return <BoardCanvas assignmentId={assignmentId} />;
  return <OpenboardApp />;
}
