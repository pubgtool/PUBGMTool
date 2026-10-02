"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { BottomSheet, SheetDescription, SheetTitle } from "@/components/ui/BottomSheet";
import { toast } from "@/components/ui/Toast";
import { SUPPORT, TICKETS } from "@/config/protocol";
import { wait } from "@/lib/async";
import { formatFileSize, detectUploadKind } from "@/lib/kyc";
import { useAppStore } from "@/lib/store";

const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const TAP = { scale: 0.97 } as const;
const UPLOAD_MS = 700;

interface Attachment {
  key: string;
  name: string;
  size: number;
  /** 0..100; simulated, since nothing is sent anywhere. */
  progress: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TicketSheet({ open, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} keyboardAware tone="dark">
      {open && <Body onClose={onClose} />}
    </BottomSheet>
  );
}

const field = (invalid: boolean) =>
  `w-full rounded-2xl border bg-canvas px-4 py-3 text-base outline-none transition-colors placeholder:text-slate-500 focus:border-amber-400 ${invalid ? "border-rose-500/50" : "border-gray-200"}`;

function Body({ onClose }: { onClose: () => void }) {
  const createTicket = useAppStore((s) => s.createTicket);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const counter = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Advance the simulated upload of any file that is still in flight.
  useEffect(() => {
    if (!files.some((f) => f.progress < 100)) return;
    const id = setInterval(() => {
      setFiles((list) => list.map((f) => (f.progress < 100 ? { ...f, progress: Math.min(100, f.progress + (100 * 100) / UPLOAD_MS) } : f)));
    }, 100);
    return () => clearInterval(id);
  }, [files]);

  const uploading = files.some((f) => f.progress < 100);
  const trimmed = message.trim();
  const subjectError = submitted && !subject ? "Choose what your request is about." : null;
  const messageError =
    submitted && trimmed.length < TICKETS.minMessage ? `Describe your request in at least ${TICKETS.minMessage} characters.` : null;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFileError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= TICKETS.maxAttachments) {
        setFileError(`You can attach up to ${TICKETS.maxAttachments} files.`);
        break;
      }
      if (!detectUploadKind(file.name, file.type)) {
        setFileError(`${file.name}: use a JPG, PNG, WebP or PDF.`);
        continue;
      }
      if (file.size <= 0 || file.size > TICKETS.maxAttachmentBytes) {
        setFileError(`${file.name}: files must be under ${TICKETS.maxAttachmentBytes / 1024 / 1024} MB.`);
        continue;
      }
      next.push({ key: `f${counter.current++}`, name: file.name, size: file.size, progress: 0 });
    }
    setFiles(next);
  };

  const submit = async () => {
    if (busy || uploading) return;
    setSubmitted(true);
    setError(null);
    if (!subject || trimmed.length < TICKETS.minMessage) return;
    setBusy(true);
    await wait(600);
    if (!mounted.current) return;
    const result = createTicket({ subject, message, attachments: files.map(({ name, size }) => ({ name, size })) });
    setBusy(false);
    if (result.ok) {
      setRef(result.id ?? "");
      toast.success("Support ticket created");
    } else {
      setError(result.error);
    }
  };

  if (ref) {
    return (
      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" data-testid="ticket-done">
        <div className="flex flex-col items-center py-4 text-center">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-btn-green"
          >
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </motion.span>
          <SheetTitle className="mt-4 text-lg font-bold">Ticket created</SheetTitle>
          <p data-testid="ticket-ref" className="mt-1 font-mono text-sm font-semibold tabular-nums text-amber-700">
            {ref}
          </p>
          <SheetDescription className="mt-2 max-w-xs text-xs text-fg-secondary">
            Saved under Your tickets on the Support tab. For a faster answer, keep chatting with the concierge or message us on Telegram.
          </SheetDescription>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={SUPPORT.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 py-3 text-sm font-semibold text-sky-800 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Send className="h-4 w-4" aria-hidden /> Telegram
          </a>
          <motion.button type="button" whileTap={TAP} transition={SPRING} onClick={onClose} className="btn-primary rounded-2xl py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2">
            Done
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <SheetTitle className="text-lg font-bold tracking-tight">Open a Support Ticket</SheetTitle>
          <SheetDescription className="mt-1 text-xs text-fg-secondary">Tell us what happened and attach a screenshot if it helps.</SheetDescription>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full bg-gray-100 p-2 text-fg-secondary outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <fieldset>
        <legend className="text-xs font-medium uppercase tracking-wider text-fg-secondary">Topic</legend>
        <div role="radiogroup" aria-label="Topic" className="mt-2 flex flex-wrap gap-2">
          {TICKETS.subjects.map((s) => {
            const selected = subject === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSubject(s)}
                className={`rounded-full border px-3.5 py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  selected ? "btn-primary border-transparent" : "border-gray-200 bg-surface text-fg-secondary hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {subjectError && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
            {subjectError}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="ticket-message" className="text-xs font-medium uppercase tracking-wider text-fg-secondary">
          Message
        </label>
        <textarea
          id="ticket-message"
          rows={4}
          maxLength={TICKETS.maxMessage}
          placeholder="What do you need help with?"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={Boolean(messageError)}
          className={`${field(Boolean(messageError))} mt-2 resize-none`}
        />
        <p className="mt-1.5 flex justify-between text-[11px] text-fg-muted">
          <span role={messageError ? "alert" : undefined} className={messageError ? "font-medium text-rose-600" : ""}>
            {messageError ?? `At least ${TICKETS.minMessage} characters`}
          </span>
          <span className="tabular-nums">
            {message.length}/{TICKETS.maxMessage}
          </span>
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-fg-secondary">Attachments</p>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,application/pdf"
          tabIndex={-1}
          aria-label="Attach files"
          data-testid="ticket-file"
          className="sr-only"
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <ul className="mt-2 flex flex-col gap-2" aria-label="Attached files">
          {files.map((f) => (
            <li key={f.key} data-testid="ticket-attachment" className="rounded-2xl border border-gray-200 bg-surface px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-fg-muted">{f.progress < 100 ? `${Math.floor(f.progress)}%` : formatFileSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((list) => list.filter((x) => x.key !== f.key))}
                  aria-label={`Remove ${f.name}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-muted outline-none hover:bg-gray-100 hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              {f.progress < 100 && (
                <div role="progressbar" aria-label={`Uploading ${f.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(f.progress)} className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-[width] duration-100 ease-linear" style={{ width: `${f.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
        {files.length < TICKETS.maxAttachments && (
          <motion.button
            type="button"
            whileTap={TAP}
            transition={SPRING}
            onClick={() => input.current?.click()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-3 text-xs font-semibold text-fg-secondary outline-none transition-colors hover:border-amber-500/50 hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Paperclip className="h-4 w-4" aria-hidden />
            Attach screenshot or PDF
          </motion.button>
        )}
        {fileError && (
          <p role="alert" data-testid="ticket-file-error" className="mt-1.5 text-xs font-medium text-rose-600">
            {fileError}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={busy || uploading ? undefined : TAP}
        transition={SPRING}
        disabled={busy || uploading}
        aria-busy={busy}
        className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting…
          </>
        ) : uploading ? (
          "Uploading…"
        ) : (
          "Submit Ticket"
        )}
      </motion.button>
    </form>
  );
}
