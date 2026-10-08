"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "zip", "docx", "pptx", "txt"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isImageName(name: string) {
  return IMAGE_EXTENSIONS.includes(extensionOf(name));
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g)(\?.*)?$/i.test(url);
}

function fileNameOf(url: string) {
  return url.split("?")[0]?.split("/").pop() ?? url;
}

function ImageIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function AssignmentsSubmit({
  assignmentId,
  overdue,
  existing,
}: {
  assignmentId: string;
  overdue: boolean;
  existing: { text: string | null; fileUrl: string | null } | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [text, setText] = useState(existing?.text ?? "");
  const [fileUrl, setFileUrl] = useState(existing?.fileUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function uploadErrorMessage(status: number, message?: string) {
    if (status === 401) return t("crsAuthRequired");
    if (status === 403) return t("crsNoUploadPermission");
    if (status === 404) return t("crsAssignmentNotFound");
    if (status === 413) return t("crsFileTooLarge");
    if (status === 400) {
      return message ?? t("crsAllowedTypes", { types: ALLOWED_EXTENSIONS.join(", ") });
    }
    return message ?? t("crsUploadError");
  }

  function validateFile(candidate: File) {
    const extension = extensionOf(candidate.name);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return t("crsAllowedTypes", { types: ALLOWED_EXTENSIONS.join(", ") });
    }
    if (candidate.size > MAX_FILE_SIZE) {
      return t("crsFileTooLarge");
    }
    return null;
  }

  function setPreviewFor(candidate: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (candidate && isImageName(candidate.name)) {
      previewUrlRef.current = URL.createObjectURL(candidate);
    }
    setPreviewUrl(previewUrlRef.current);
  }

  function acceptFile(candidate: File | null) {
    setDone(false);
    if (!candidate) {
      setFile(null);
      setPreviewFor(null);
      setError(null);
      return;
    }
    const message = validateFile(candidate);
    setFile(candidate);
    setPreviewFor(candidate);
    setError(message);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    acceptFile(event.dataTransfer.files?.[0] ?? null);
  }

  function clearFile() {
    acceptFile(null);
    for (const ref of [fileInputRef, imageInputRef, docInputRef, cameraInputRef]) {
      if (ref.current) ref.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setDone(false);

    let resolvedFileUrl = fileUrl;

    if (file) {
      const message = validateFile(file);
      if (message) {
        setSaving(false);
        setError(message);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const upload = await fetch(`/api/assignments/${assignmentId}/submissions/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadJson = (await upload.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: { url?: string };
      } | null;
      setUploading(false);

      if (!upload.ok || !uploadJson?.ok || !uploadJson.data?.url) {
        setSaving(false);
        setError(uploadErrorMessage(upload.status, uploadJson?.error));
        return;
      }

      resolvedFileUrl = uploadJson.data.url;
      setFileUrl(resolvedFileUrl);
    }

    const response = await fetch(`/api/assignments/${assignmentId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || null, fileUrl: resolvedFileUrl || null }),
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    setSaving(false);
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("crsSubmitError"));
      return;
    }

    setFile(null);
    setPreviewFor(null);
    for (const ref of [fileInputRef, imageInputRef, docInputRef, cameraInputRef]) {
      if (ref.current) ref.current.value = "";
    }
    setDone(true);
    router.refresh();
  }

  const chipClass =
    "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {overdue ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3.5 text-sm text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8v5" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </span>
          <span>
            <span className="block font-semibold">{t("crsOverdueLate")}</span>
            <span className="mt-0.5 block text-rose-600/90">
              {t("crsLateNoticeSubmit")}
            </span>
          </span>
        </div>
      ) : null}

      <div>
        <Label>{t("crsAnswerText")}</Label>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          placeholder={t("crsAnswerPlaceholder")}
          className="resize-y leading-relaxed"
        />
      </div>

      <div>
        <Label>{t("crsAttachFile")}</Label>
        {file ? (
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t("crsImagePreview")}
                className="mb-3 max-h-72 w-full rounded-xl bg-white object-contain ring-1 ring-brand-100"
              />
            ) : null}
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100">
                {isImageName(file.name) ? <ImageIcon /> : <DocIcon />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {t("crsReadyToUpload", { size: formatSize(file.size) })}
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="shrink-0 rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label={t("crsRemoveFile")}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={t("crsChooseFile")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all duration-200",
              dragActive
                ? "border-brand-400 bg-brand-50 shadow-[0_0_0_4px_rgba(83,115,184,0.12)]"
                : "border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            <span
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full transition-colors",
                dragActive
                  ? "bg-brand-100 text-brand-700"
                  : "bg-white text-brand-600 ring-1 ring-slate-200",
              )}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
            </span>
            <span className="text-sm font-medium text-slate-700">
              {t("crsDropFilePrefix")}
              <span className="text-brand-700 underline decoration-brand-300 underline-offset-2">
                {t("crsChooseFile")}
              </span>
            </span>
            <span className="text-xs text-slate-600">
              {t("crsMaxFileInfo", { types: ALLOWED_EXTENSIONS.join(", ") })}
            </span>
            <div
              className="mt-2 flex flex-wrap items-center justify-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className={chipClass}
              >
                <ImageIcon />
                {t("crsUploadImage")}
              </button>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className={chipClass}
              >
                <DocIcon />
                {t("crsUploadDoc")}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className={chipClass}
              >
                <CameraIcon />
                {t("crsTakePhoto")}
              </button>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">{t("crsSubmitHint")}</p>
        {!file && existing?.fileUrl ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
              {t("crsCurrentFile")}
            </p>
            {isImageUrl(existing.fileUrl) ? (
              <a
                href={existing.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block overflow-hidden rounded-xl ring-1 ring-slate-200 transition-opacity hover:opacity-90"
              >
                <img
                  src={existing.fileUrl}
                  alt={t("crsImagePreview")}
                  className="max-h-64 w-full bg-white object-contain"
                />
              </a>
            ) : null}
            <a
              href={existing.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
            >
              <DocIcon />
              <span className="min-w-0 truncate">{fileNameOf(existing.fileUrl)}</span>
            </a>
          </div>
        ) : null}
      </div>

      <details>
        <summary className="cursor-pointer text-xs font-medium text-slate-500 transition-colors hover:text-brand-700">
          {t("crsFileUrlOptional")}
        </summary>
        <Input
          value={fileUrl}
          onChange={(event) => setFileUrl(event.target.value)}
          maxLength={500}
          placeholder={t("crsFileUrlPlaceholder")}
          className="mt-2"
        />
      </details>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,.zip,.docx,.pptx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.zip,.docx,.pptx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/png,image/jpeg"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {error ? (
        <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {t("crsAssignmentSent")}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="lg">
          {uploading
            ? t("crsUploadingFile")
            : saving
              ? t("crsSending")
              : existing
                ? t("crsResubmit")
                : t("crsSubmit")}
        </Button>
      </div>
    </form>
  );
}
