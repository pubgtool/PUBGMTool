"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardPaste, Gift, Loader2 } from "lucide-react";
import { EnvelopeSuccessDialog, type EnvelopeResult } from "@/components/screens/tasks/EnvelopeSuccessDialog";
import { toast } from "@/components/ui/Toast";
import { PROMO_RULES } from "@/config/rewards";
import { normalizeCode } from "@/lib/rewards";
import { useAppStore } from "@/lib/store";

const TAP = { scale: 0.97 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const PROCESSING_MS = 450;
const SANDBOX_CODES = ["LUCKY888", "SHENZHOU2026"] as const;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function EnvelopeVault({ guest }: { guest: boolean }) {
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
    if (busy || guest) return;
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
      className="overflow-hidden rounded-3xl border border-amber-200/60 bg-white shadow-sm"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-red-500 to-amber-500 px-5 py-5 text-white">
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-amber-300/20" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Gift className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight tracking-tight">Red Envelope Vault</h2>
            <p className="text-xs text-white/80">Institutional Gift Code</p>
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
        <label htmlFor="gift-code" className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Gift code
        </label>
        <div
          className={`mt-2 flex items-center gap-2 rounded-2xl border bg-white pl-4 pr-1.5 transition-colors focus-within:border-slate-950 ${
            error ? "border-rose-300" : "border-slate-200"
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
            className="min-w-0 flex-1 bg-transparent py-3.5 font-mono text-base font-semibold uppercase tracking-widest outline-none placeholder:font-medium placeholder:tracking-widest placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={paste}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <ClipboardPaste className="h-3.5 w-3.5" aria-hidden />
            Paste
          </button>
        </div>

        {error && (
          <p id="gift-code-error" role="alert" data-testid="gift-code-error" className="mt-2 text-xs font-medium text-rose-600">
            {error}
          </p>
        )}
        {guest && <p className="mt-2 text-xs text-slate-500">Sign in to redeem gift codes.</p>}

        <motion.button
          type="submit"
          whileTap={busy || guest ? undefined : TAP}
          transition={SPRING}
          disabled={busy || guest}
          aria-busy={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-semibold text-slate-950 outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400"
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
          <span className="text-[11px] text-slate-400">Sandbox codes:</span>
          {SANDBOX_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => update(code, null)}
              className="rounded-full border border-slate-200 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {code}
            </button>
          ))}
        </div>
      </form>

      <EnvelopeSuccessDialog result={result} onClose={() => setResult(null)} />
    </section>
  );
}
