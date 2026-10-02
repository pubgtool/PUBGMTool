"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ClipboardPaste, Gift, Loader2 } from "lucide-react";
import { EnvelopeSuccessDialog, type EnvelopeResult } from "@/components/screens/tasks/EnvelopeSuccessDialog";
import { toast } from "@/components/ui/Toast";
import { PROMO_RULES } from "@/config/rewards";
import { normalizeCode } from "@/lib/rewards";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.95 } as const;
const TAP_CHIP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const PROCESSING_MS = 450;
const DEMO_CODES = ["LUCKY888", "SHENZHOU2026"] as const;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function EnvelopeVault({ guest, onRequireAuth }: { guest: boolean; onRequireAuth: () => void }) {
  const claimPromoCode = useAppStore((s) => s.claimPromoCode);

  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EnvelopeResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const mounted = useRef(true);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const caret = caretRef.current;
    caretRef.current = null;
    if (el && caret !== null && document.activeElement === el) el.setSelectionRange(caret, caret);
  }, [text]);

  const update = (raw: string, caret: number | null) => {
    const next = normalizeCode(raw);
    caretRef.current = caret === null ? null : Math.max(0, caret - (raw.length - next.length));
    setError(null);
    setText(next);
  };

  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        toast.info("Your clipboard is empty");
        return;
      }
      update(clip, null);
      inputRef.current?.focus({ preventScroll: true });
    } catch {
      toast.error("Clipboard access was blocked. Paste with your keyboard instead.");
    }
  };

  const claim = async () => {
    if (busy) return;
    if (guest) {
      onRequireAuth();
      return;
    }
    if (!text) {
      setError("Enter a gift code.");
      return;
    }
    setBusy(true);
    setError(null);
    await wait(PROCESSING_MS);
    if (!mounted.current) return;
    const outcome = claimPromoCode(text);
    setBusy(false);
    if (outcome.ok) {
      setResult({ code: text, amount: outcome.amount });
      setText("");
    } else {
      setError(outcome.error);
    }
  };

  return (
    <section
      aria-label="Red envelope vault"
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-amber-700 px-5 py-5">
        <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-amber-300/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/40">
            <Gift className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-extrabold leading-tight tracking-tight text-white">Red Envelope Vault</h2>
            <p className="text-xs text-amber-100/85">Institutional Gift Code</p>
          </div>
        </div>
      </div>

      <form
        className="p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void claim();
        }}
      >
        <label htmlFor="gift-code" className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">
          Gift code
        </label>
        <div
          className={`mt-2 flex items-center gap-2 rounded-2xl border bg-canvas pl-4 pr-1.5 transition-colors focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/15 ${
            error ? "border-rose-500/60" : "border-gray-200"
          }`}
        >
          <input
            ref={inputRef}
            id="gift-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={PROMO_RULES.maxLength + 8}
            placeholder="ENTER CODE"
            value={text}
            onChange={(event) => update(event.target.value, event.target.selectionStart)}
            aria-invalid={error !== null}
            aria-describedby={error ? "gift-code-error" : undefined}
            className="min-w-0 flex-1 bg-transparent py-3.5 font-mono text-base font-semibold uppercase tracking-widest text-fg outline-none placeholder:font-medium placeholder:tracking-widest placeholder:text-fg-muted"
          />
          <motion.button
            type="button"
            whileTap={TAP_CHIP}
            transition={SPRING}
            onClick={paste}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 text-xs font-semibold text-fg outline-none transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
            Paste
          </motion.button>
        </div>

        {error && (
          <p
            id="gift-code-error"
            role="alert"
            data-testid="gift-code-error"
            className="mt-2 flex items-start gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-600"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}
        {guest && <p className="mt-2 text-xs text-fg-secondary">Sign in to redeem gift codes. You can enter a code first.</p>}

        <motion.button
          type="submit"
          whileTap={busy ? undefined : TAP}
          transition={SPRING}
          disabled={busy}
          aria-busy={busy}
          className="btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:text-fg-secondary"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening…
            </>
          ) : (
            "Claim Envelope"
          )}
        </motion.button>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-fg-muted">Demo codes:</span>
          {DEMO_CODES.map((code) => (
            <motion.button
              key={code}
              type="button"
              whileTap={TAP_CHIP}
              transition={SPRING}
              onClick={() => update(code, null)}
              className="min-h-11 rounded-full border border-gray-200 bg-gray-50 px-3.5 font-mono text-xs font-semibold text-fg-secondary outline-none transition-colors hover:bg-gray-100 hover:text-fg focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {code}
            </motion.button>
          ))}
        </div>
      </form>

      <EnvelopeSuccessDialog result={result} onClose={() => setResult(null)} />
    </section>
  );
}
