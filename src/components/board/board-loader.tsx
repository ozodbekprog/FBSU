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

export function BoardLoader({ assignmentId }: { assignmentId: string | null }) {
  return <BoardCanvas assignmentId={assignmentId} />;
}
