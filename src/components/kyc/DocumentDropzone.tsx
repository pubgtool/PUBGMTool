"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, CheckCircle2, FileText, Loader2, RefreshCw, ScanLine, Trash2, TriangleAlert, UploadCloud } from "lucide-react";
import type { UploadItem } from "@/components/kyc/useKycDraft";
import { KYC, type UploadSide } from "@/config/kyc";
import { detectUploadKind, formatFileSize, validateImageSize, validateUploadMeta } from "@/lib/kyc";

interface Props {
  side: UploadSide;
  label: string;
  hint: string;
  value?: UploadItem;
  onChange: (item: UploadItem | null) => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "scanning"; previewUrl: string | null; name: string }
  | { kind: "error"; message: string };

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function readImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve({ width: 0, height: 0 }), 8_000);
    img.onload = () => {
      clearTimeout(timer);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

function Corners({ tone }: { tone: "idle" | "ready" | "error" }) {
  const color = tone === "ready" ? "border-emerald-400" : tone === "error" ? "border-rose-400" : "border-white/70";
  const base = `absolute h-5 w-5 ${color} transition-colors`;
  return (
    <span aria-hidden>
      <span className={`${base} left-3 top-3 rounded-tl-lg border-l-2 border-t-2`} />
      <span className={`${base} right-3 top-3 rounded-tr-lg border-r-2 border-t-2`} />
      <span className={`${base} bottom-3 left-3 rounded-bl-lg border-b-2 border-l-2`} />
      <span className={`${base} bottom-3 right-3 rounded-br-lg border-b-2 border-r-2`} />
    </span>
  );
}

/** Stand-in artwork for sandbox samples; not a real document. */
function SampleArt() {
  return (
    <span aria-hidden className="absolute inset-6 flex gap-3 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-3">
      <span className="h-full w-1/3 rounded-lg bg-slate-600" />
      <span className="flex flex-1 flex-col justify-center gap-2">
        {[80, 60, 70, 45].map((w) => (
          <span key={w} className="h-1.5 rounded-full bg-slate-500" style={{ width: `${w}%` }} />
        ))}
      </span>
    </span>
  );
}

export function DocumentDropzone({ side, label, hint, value, onChange }: Props) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  /** Increments per attempt so a slow earlier scan can't overwrite a newer one. */
  const attempt = useRef(0);
  /** Object URL not yet handed to the draft; revoked if the scan is abandoned. */
  const unowned = useRef<string | null>(null);

  useEffect(
    () => () => {
      attempt.current += 1;
      if (unowned.current) URL.revokeObjectURL(unowned.current);
    },
    [],
  );

  const scanFor = async (item: Omit<UploadItem, "previewUrl">, previewUrl: string | null, id: number) => {
    setPhase({ kind: "scanning", previewUrl, name: item.name });
    await wait(KYC.upload.scanMs);
    if (id !== attempt.current) return;
    unowned.current = null;
    setPhase({ kind: "idle" });
    onChange({ ...item, previewUrl });
  };

  const handleFile = async (file: File) => {
    const id = ++attempt.current;
    if (unowned.current) URL.revokeObjectURL(unowned.current);
    unowned.current = null;

    const metaError = validateUploadMeta(file);
    if (metaError) return setPhase({ kind: "error", message: metaError });

    const kind = detectUploadKind(file.name, file.type);
    if (kind === "pdf") return scanFor({ name: file.name, size: file.size, kind: "pdf" }, null, id);

    const url = URL.createObjectURL(file);
    unowned.current = url;
    setPhase({ kind: "scanning", previewUrl: url, name: file.name });
    const { width, height } = await readImageSize(url);
    if (id !== attempt.current) return;
    const sizeError = validateImageSize(width, height);
    if (sizeError) {
      URL.revokeObjectURL(url);
      unowned.current = null;
      return setPhase({ kind: "error", message: sizeError });
    }
    return scanFor({ name: file.name, size: file.size, kind: "image" }, url, id);
  };

  const useSample = () => {
    const id = ++attempt.current;
    void scanFor({ name: `sample-${side}.png`, size: 0, kind: "sample" }, null, id);
  };

  const pick = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (file) void handleFile(file);
  };

  const scanning = phase.kind === "scanning";
  const ready = phase.kind === "idle" && value !== undefined;
  const failed = phase.kind === "error";
  const tone = ready ? "ready" : failed ? "error" : "idle";
  const previewUrl = scanning ? phase.previewUrl : ready ? (value?.previewUrl ?? null) : null;
  const showSample = (scanning && phase.name.startsWith("sample-")) || (ready && value?.kind === "sample");

  return (
    <div data-testid={`dropzone-${side}`} data-state={scanning ? "scanning" : ready ? "ready" : failed ? "error" : "empty"}>
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`relative mt-2 aspect-[1.586] w-full overflow-hidden rounded-2xl bg-slate-900 outline-dashed outline-2 -outline-offset-2 transition-colors ${
          dragging ? "outline-amber-400" : ready ? "outline-transparent" : "outline-slate-600"
        }`}
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={ready ? `${label} preview` : ""}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ${scanning ? "opacity-60" : ""}`}
          />
        )}
        {showSample && <SampleArt />}
        {((scanning && !previewUrl && !showSample) || (ready && value?.kind === "pdf")) && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
            <FileText className="h-9 w-9" aria-hidden />
            <span className="max-w-[80%] truncate text-xs">{scanning ? phase.name : value?.name}</span>
          </span>
        )}
        <Corners tone={tone} />

        {!scanning && !ready && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 text-center">
            {failed ? <TriangleAlert className="h-7 w-7 text-rose-400" aria-hidden /> : <UploadCloud className="h-7 w-7 text-slate-300" aria-hidden />}
            <span className="text-xs font-medium text-white">{dragging ? "Drop to upload" : "Drag & drop or choose a file"}</span>
            <span className="text-[11px] text-slate-400">{hint}</span>
          </span>
        )}

        {scanning && !reduceMotion && (
          <motion.span
            aria-hidden
            className="absolute inset-x-3 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]"
            initial={{ top: "8%" }}
            animate={{ top: ["8%", "88%", "8%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {scanning && (
          <span className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1.5 text-[11px] font-semibold text-white">
              <ScanLine className="h-3.5 w-3.5 text-emerald-400" aria-hidden /> Scanning document…
            </span>
          </span>
        )}
        {ready && (
          <span className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Document aligned ✓
            </span>
          </span>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {scanning ? "Scanning document" : ready ? "Document aligned" : ""}
      </div>
      {failed && (
        <p role="alert" data-testid={`dropzone-error-${side}`} className="mt-2 flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {phase.message}
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={KYC.upload.accept}
        tabIndex={-1}
        aria-label={`Upload ${label}`}
        data-testid={`upload-${side}`}
        className="sr-only"
        onChange={(event) => pick(event.currentTarget)}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-label={`Take a photo of ${label}`}
        data-testid={`upload-${side}-camera`}
        className="sr-only"
        onChange={(event) => pick(event.currentTarget)}
      />

      {ready ? (
        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-slate-500" data-testid={`file-meta-${side}`}>
            {value?.kind === "sample" ? "Sandbox sample" : `${value?.name} · ${formatFileSize(value?.size ?? 0)}`}
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <RefreshCw className="h-3 w-3" aria-hidden /> Replace
          </button>
          <button
            type="button"
            onClick={() => {
              attempt.current += 1;
              setPhase({ kind: "idle" });
              onChange(null);
            }}
            aria-label={`Remove ${label}`}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Trash2 className="h-3 w-3" aria-hidden /> Remove
          </button>
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              disabled={scanning}
              onClick={() => fileInput.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 py-2.5 text-xs font-semibold text-white outline-none hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-300"
            >
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <UploadCloud className="h-3.5 w-3.5" aria-hidden />}
              Choose file
            </motion.button>
            <motion.button
              type="button"
              whileTap={TAP}
              transition={SPRING}
              disabled={scanning}
              onClick={() => cameraInput.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden /> Take photo
            </motion.button>
          </div>
          <button
            type="button"
            disabled={scanning}
            onClick={useSample}
            data-testid={`sample-${side}`}
            className="mt-2 w-full rounded-lg py-1 text-center text-[11px] font-semibold text-slate-500 underline underline-offset-2 outline-none hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
          >
            No file handy? Use a sandbox sample
          </button>
        </>
      )}
    </div>
  );
}
